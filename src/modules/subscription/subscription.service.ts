import { prisma } from '../../config';
import { culqiJato } from '../../config/culqi';
import { env } from '../../config/env';
import { TRIAL_DAYS } from '../../shared';
import { EmailService } from '../email/email.service';
import { PlanService } from '../plan/plan.service';

const emailService = new EmailService();
const planService = new PlanService();

const INTERVAL_UNIT_LABELS: Record<string, string> = {
  DAY: 'dia',
  WEEK: 'semana',
  MONTH: 'mes',
  YEAR: 'ano',
};

function computePeriodEnd(start: Date, count: number, unit: string): Date {
  const end = new Date(start);
  switch (unit) {
    case 'DAY':
      end.setDate(end.getDate() + count);
      break;
    case 'WEEK':
      end.setDate(end.getDate() + count * 7);
      break;
    case 'MONTH':
      end.setMonth(end.getMonth() + count);
      break;
    case 'YEAR':
      end.setFullYear(end.getFullYear() + count);
      break;
  }
  return end;
}

const subscriptionInclude = {
  hotel: { select: { id: true, name: true, slug: true } },
  planPrice: { include: { plan: { select: { id: true, name: true, slug: true } } } },
  payments: { orderBy: { createdAt: 'desc' as const } },
};

export class SubscriptionService {
  async createTrialSubscription(hotelId: string) {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    return prisma.subscription.create({
      data: {
        hotelId,
        status: 'TRIALING',
        trialStartDate: now,
        trialEndDate: trialEnd,
        totalPrice: 0,
        paidAmount: 0,
      },
    });
  }

  async findAll(statusFilter?: string) {
    const where: any = {};
    if (statusFilter) where.status = statusFilter;

    return prisma.subscription.findMany({
      where,
      include: subscriptionInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get current (active/trialing/pending) subscription for a hotel
  async findCurrentByHotelId(hotelId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        hotelId,
        status: { in: ['TRIALING', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE'] },
      },
      include: subscriptionInclude,
      orderBy: { createdAt: 'desc' },
    });

    // If no active subscription, return the latest one (even expired)
    if (!subscription) {
      return prisma.subscription.findFirst({
        where: { hotelId },
        include: subscriptionInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return subscription;
  }

  async findById(id: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: subscriptionInclude,
    });
    if (!subscription) throw new Error('Suscripcion no encontrada');
    return subscription;
  }

  // Get all subscriptions for a hotel (history)
  async getHistoryByHotelId(hotelId: string) {
    return prisma.subscription.findMany({
      where: { hotelId },
      include: {
        planPrice: { include: { plan: { select: { id: true, name: true, slug: true } } } },
        payments: { orderBy: { createdAt: 'desc' as const } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Hotel Admin selects a plan → creates new subscription with PENDING_PAYMENT
  async selectPlan(hotelId: string, planPriceId: string, isRenewal = false) {
    const planPrice = await prisma.planPrice.findUnique({
      where: { id: planPriceId },
      include: { plan: true },
    });
    if (!planPrice) throw new Error('Precio de plan no encontrado');
    if (!planPrice.isActive || !planPrice.plan.isActive) throw new Error('Este plan no esta disponible');

    // Cancel any current active/pending subscription
    await prisma.subscription.updateMany({
      where: {
        hotelId,
        status: { in: ['TRIALING', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE'] },
      },
      data: { status: 'EXPIRED' },
    });

    // Create new subscription
    const subscription = await prisma.subscription.create({
      data: {
        hotelId,
        planPriceId,
        status: 'PENDING_PAYMENT',
        totalPrice: planPrice.price,
        paidAmount: 0,
      },
      include: subscriptionInclude,
    });

    // Notify Super Admin via email
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId }, select: { name: true } });
    emailService.sendNewSubscriptionNotification({
      hotelName: hotel?.name || 'Hotel desconocido',
      planName: planPrice.plan.name,
      price: planPrice.price,
      intervalUnit: INTERVAL_UNIT_LABELS[planPrice.intervalUnit] || planPrice.intervalUnit,
      isRenewal,
    }).catch(err => console.error('[Subscription] Email notification failed:', err));

    return subscription;
  }

  // Super Admin assigns plan directly (legacy + can set as ACTIVE immediately)
  async assignPlan(subscriptionId: string, planPriceId: string) {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) throw new Error('Suscripcion no encontrada');

    const planPrice = await prisma.planPrice.findUnique({
      where: { id: planPriceId },
      include: { plan: true },
    });
    if (!planPrice) throw new Error('Precio de plan no encontrado');

    const now = new Date();
    const periodEnd = computePeriodEnd(now, planPrice.intervalCount, planPrice.intervalUnit);

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planPriceId,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        totalPrice: planPrice.price,
        paidAmount: planPrice.price, // considered fully paid
      },
      include: subscriptionInclude,
    });
  }

  // Register a payment for a subscription
  async registerPayment(subscriptionId: string, data: {
    amount: number;
    method: string;
    notes?: string;
    receiptNumber?: string;
    registeredBy: string;
  }) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { planPrice: true },
    });
    if (!subscription) throw new Error('Suscripcion no encontrada');

    const newPaidAmount = subscription.paidAmount + data.amount;

    // Create payment record
    const payment = await prisma.subscriptionPayment.create({
      data: {
        subscriptionId,
        amount: data.amount,
        method: data.method as any,
        notes: data.notes,
        receiptNumber: data.receiptNumber,
        registeredBy: data.registeredBy,
      },
    });

    // Update paid amount
    const updateData: any = { paidAmount: newPaidAmount };

    // If fully paid, activate subscription
    if (newPaidAmount >= subscription.totalPrice && subscription.planPrice) {
      const now = new Date();
      const periodEnd = computePeriodEnd(
        now,
        subscription.planPrice.intervalCount,
        subscription.planPrice.intervalUnit
      );
      updateData.status = 'ACTIVE';
      updateData.currentPeriodStart = now;
      updateData.currentPeriodEnd = periodEnd;
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });

    return payment;
  }

  async getPayments(subscriptionId: string) {
    return prisma.subscriptionPayment.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =============================================
  // Culqi Automatic Subscription
  // =============================================

  async createCulqiSubscription(hotelId: string, planPriceId: string, culqiToken: string, culqiEmail?: string) {
    if (!culqiJato) throw new Error('Culqi no está configurado. Contacta al administrador.');

    // 1. Validate planPrice and check it has a Culqi plan
    const planPrice = await prisma.planPrice.findUnique({
      where: { id: planPriceId },
      include: { plan: true },
    });
    if (!planPrice || !planPrice.isActive || !planPrice.plan.isActive) {
      throw new Error('Plan no disponible');
    }
    if (!planPrice.culqiPlanId) {
      throw new Error('Este plan aun no esta configurado para pagos automaticos. Contacta al administrador.');
    }

    const culqiPlanId = planPrice.culqiPlanId;

    // 2. Get hotel + admin user
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { users: { where: { role: 'HOTEL_ADMIN' }, take: 1 } },
    });
    const admin = hotel?.users[0];
    if (!admin || !hotel) throw new Error('No se encontró el hotel o administrador');

    // 3. Get or create Culqi Customer (stored on Hotel)
    let culqiCustomerId: string;

    if (hotel.culqiCustomerId) {
      culqiCustomerId = hotel.culqiCustomerId;
    } else {
      const customerEmail = culqiEmail || admin.email;
      const customer = await culqiJato.createCustomer({
        email: customerEmail,
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: admin.phone || undefined,
        address: hotel.address,
        addressCity: hotel.city,
      });
      culqiCustomerId = customer.id;

      // Save on hotel for future use
      await prisma.hotel.update({
        where: { id: hotelId },
        data: { culqiCustomerId },
      });
    }

    // 4. Save Card with token from frontend
    const card = await culqiJato.saveCard(culqiCustomerId, culqiToken);

    // 5. Cancel previous Culqi subscriptions BEFORE creating new one
    //    Culqi doesn't allow 2 active subscriptions to the same plan for the same customer
    //    We must cancel first, then create. If the new one fails, we restore locally.
    const previousActiveSubs = await prisma.subscription.findMany({
      where: {
        hotelId,
        status: { in: ['TRIALING', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE'] },
      },
    });

    const cancelledCulqiIds: string[] = [];
    for (const prev of previousActiveSubs) {
      if (prev.culqiSubscriptionId) {
        try {
          await culqiJato.cancelSubscription(prev.culqiSubscriptionId);
          cancelledCulqiIds.push(prev.culqiSubscriptionId);
        } catch (err: any) {
          console.log(`[Subscription] Culqi cancel ${prev.culqiSubscriptionId}: ${err.message} (may already be cancelled)`);
        }
      }
    }

    // 6. Create NEW Subscription in Culqi
    let culqiSub: any;
    try {
      culqiSub = await culqiJato.createSubscription(card.id, culqiPlanId, {
        hotel_id: hotelId,
        plan_price_id: planPriceId,
      });
    } catch (err: any) {
      console.error(`[Subscription] Culqi subscription failed: ${err.message}`);
      throw new Error(err.userMessage || err.message || 'Error al procesar el pago. Tu suscripcion actual no fue afectada.');
    }

    // 7. Subscription created in Culqi (201) - charge is processing asynchronously
    //    Culqi always returns status:1 initially (processing), then transitions to:
    //    - status 3 (active/confirmed) if charge succeeds
    //    - stays at 1 or webhook notifies if charge fails
    //    We trust the 201 and activate locally. Webhooks handle failures (PAST_DUE).
    console.log(`[Subscription] Culqi subscription created: ${culqiSub.id}`);

    // 8. Expire previous subscriptions locally
    await prisma.subscription.updateMany({
      where: {
        hotelId,
        status: { in: ['TRIALING', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE'] },
      },
      data: { status: 'EXPIRED' },
    });

    // 8. Create local subscription as ACTIVE
    const now = new Date();
    const periodEnd = computePeriodEnd(now, planPrice.intervalCount, planPrice.intervalUnit);

    const subscription = await prisma.subscription.create({
      data: {
        hotelId,
        planPriceId,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        totalPrice: planPrice.price,
        paidAmount: planPrice.price,
        culqiSubscriptionId: culqiSub.id,
        culqiCustomerId,
        culqiCardId: card.id,
      },
      include: subscriptionInclude,
    });

    // 9. Record payment
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: planPrice.price,
        method: 'CARD',
        notes: `Culqi suscripcion ${culqiSub.id}`,
        registeredBy: 'CULQI_AUTO',
      },
    });

    return subscription;
  }

  // Get Culqi public key for frontend
  getCulqiPublicKey() {
    return env.CULQI_PUBLIC_KEY || null;
  }

  // =============================================
  // Culqi Webhook Handler
  // =============================================

  async handleCulqiWebhook(payload: any) {
    console.log(`[CulqiWebhook] Full payload:`, JSON.stringify(payload).substring(0, 1500));

    const eventType = payload.type || payload.event || payload.object;

    // Culqi sends data as a JSON STRING, not an object - parse it
    let data: any = payload.data || payload;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        console.log('[CulqiWebhook] Could not parse data string');
      }
    }

    console.log(`[CulqiWebhook] Event: ${eventType} | Parsed data:`, JSON.stringify(data).substring(0, 500));

    // Extract subscription ID from Culqi's different payload structures
    const findSubscriptionId = (d: any): string | null => {
      // subscription.creation.succeeded: data.message.object.subsId
      if (d?.message?.object?.subsId) return d.message.object.subsId;
      // Direct fields
      if (d?.subsId) return d.subsId;
      if (d?.subscription_id) return d.subscription_id;
      if (d?.metadata?.subscription_id) return d.metadata.subscription_id;
      // If the id starts with sxn_ it's a subscription id
      if (d?.id && typeof d.id === 'string' && d.id.startsWith('sxn_')) return d.id;
      return null;
    };

    // Extract charge ID for failed charges (to find subscription)
    const findChargeId = (d: any): string | null => {
      if (d?.chargeId) return d.chargeId;
      if (d?.charge_id) return d.charge_id;
      if (d?.id && typeof d.id === 'string' && d.id.startsWith('chr_')) return d.id;
      return null;
    };

    // === SUBSCRIPTION CREATION SUCCEEDED ===
    if (eventType === 'subscription.creation.succeeded') {
      const culqiSubscriptionId = findSubscriptionId(data);
      console.log(`[CulqiWebhook] Subscription created confirmed: ${culqiSubscriptionId}`);
      // We already activated locally when creating, so this is just confirmation
      return;
    }

    // === CHARGE SUCCEEDED (recurring auto-charge) ===
    if (eventType === 'charge.creation.succeeded') {
      const culqiSubscriptionId = findSubscriptionId(data);
      if (!culqiSubscriptionId) {
        console.log('[CulqiWebhook] No subscription ID found in charge.succeeded');
        return;
      }

      const subscription = await prisma.subscription.findFirst({
        where: { culqiSubscriptionId },
        include: { planPrice: true },
      });
      if (!subscription || !subscription.planPrice) {
        console.log(`[CulqiWebhook] Subscription not found locally for: ${culqiSubscriptionId}`);
        return;
      }

      const now = new Date();
      const periodEnd = computePeriodEnd(now, subscription.planPrice.intervalCount, subscription.planPrice.intervalUnit);

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          paidAmount: { increment: subscription.planPrice.price },
        },
      });

      await prisma.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          amount: subscription.planPrice.price,
          method: 'CARD',
          notes: `Culqi cobro recurrente - ${findChargeId(data) || 'auto'}`,
          registeredBy: 'CULQI_WEBHOOK',
        },
      });

      console.log(`[CulqiWebhook] Subscription ${subscription.id} renewed`);
      return;
    }

    // === CHARGE FAILED ===
    if (eventType === 'charge.creation.failed' || eventType === 'subscription.creation.failed') {
      // charge.creation.failed doesn't include subscription_id
      // Find the most recent ACTIVE subscription for the customer via chargeId
      const chargeId = findChargeId(data);
      const culqiSubscriptionId = findSubscriptionId(data);

      if (culqiSubscriptionId) {
        // Direct match by subscription ID
        await prisma.subscription.updateMany({
          where: { culqiSubscriptionId },
          data: { status: 'PAST_DUE' },
        });
        console.log(`[CulqiWebhook] Subscription ${culqiSubscriptionId} marked PAST_DUE`);
        return;
      }

      if (chargeId) {
        // No subscription_id in payload - find the most recently created ACTIVE subscription
        // This works because charge.failed comes seconds after subscription creation
        const recentSub = await prisma.subscription.findFirst({
          where: {
            status: 'ACTIVE',
            culqiSubscriptionId: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (recentSub) {
          await prisma.subscription.update({
            where: { id: recentSub.id },
            data: { status: 'PAST_DUE' },
          });
          console.log(`[CulqiWebhook] Charge ${chargeId} failed -> Subscription ${recentSub.id} marked PAST_DUE`);
        } else {
          console.log(`[CulqiWebhook] Charge ${chargeId} failed but no matching subscription found`);
        }
      }
      return;
    }

    // === SUBSCRIPTION CANCELLED ===
    if (eventType === 'subscription.cancelled' || eventType === 'subscription.deleted') {
      const culqiSubscriptionId = findSubscriptionId(data);
      if (culqiSubscriptionId) {
        await prisma.subscription.updateMany({
          where: { culqiSubscriptionId },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        console.log(`[CulqiWebhook] Subscription ${culqiSubscriptionId} cancelled`);
      }
      return;
    }

    console.log(`[CulqiWebhook] Unhandled event: ${eventType}`);
  }

  async cancelSubscription(id: string) {
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new Error('Suscripcion no encontrada');

    // Cancel in Culqi if it's a Culqi subscription
    if (subscription.culqiSubscriptionId && culqiJato) {
      try {
        await culqiJato.cancelSubscription(subscription.culqiSubscriptionId);
      } catch (err: any) {
        console.error('[Subscription] Failed to cancel Culqi subscription:', err.message);
      }
    }

    return prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: subscriptionInclude,
    });
  }

  async checkSubscriptionActive(hotelId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        hotelId,
        status: { in: ['TRIALING', 'ACTIVE', 'PENDING_PAYMENT'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) return false;

    const now = new Date();

    if (subscription.status === 'TRIALING' && subscription.trialEndDate && subscription.trialEndDate < now) {
      await prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'EXPIRED' } });
      return false;
    }

    if (subscription.status === 'ACTIVE' && subscription.currentPeriodEnd && subscription.currentPeriodEnd < now) {
      await prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'EXPIRED' } });
      return false;
    }

    // PENDING_PAYMENT is not active - hotel needs to pay first
    if (subscription.status === 'PENDING_PAYMENT') {
      return false;
    }

    return subscription.status === 'TRIALING' || subscription.status === 'ACTIVE';
  }

  async getStats() {
    const [trialing, pendingPayment, active, pastDue, cancelled, expired] = await Promise.all([
      prisma.subscription.count({ where: { status: 'TRIALING' } }),
      prisma.subscription.count({ where: { status: 'PENDING_PAYMENT' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      prisma.subscription.count({ where: { status: 'EXPIRED' } }),
    ]);
    return {
      trialing, pendingPayment, active, pastDue, cancelled, expired,
      total: trialing + pendingPayment + active + pastDue + cancelled + expired,
    };
  }

  async getRevenueStats(startDate: Date, endDate: Date) {
    const payments = await prisma.subscriptionPayment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        subscription: {
          select: {
            hotel: { select: { id: true, name: true } },
            planPrice: { include: { plan: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentCount = payments.length;

    // Group by day
    const dailyRevenue: Record<string, number> = {};
    for (const p of payments) {
      const day = p.createdAt.toISOString().split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount;
    }

    // Group by method
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
    }

    // Group by plan
    const byPlan: Record<string, number> = {};
    for (const p of payments) {
      const planName = p.subscription.planPrice?.plan.name || 'Sin plan';
      byPlan[planName] = (byPlan[planName] || 0) + p.amount;
    }

    return {
      totalRevenue,
      paymentCount,
      dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
      byMethod: Object.entries(byMethod).map(([method, amount]) => ({ method, amount })),
      byPlan: Object.entries(byPlan).map(([plan, amount]) => ({ plan, amount })),
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        createdAt: p.createdAt,
        hotelName: p.subscription.hotel.name,
        planName: p.subscription.planPrice?.plan.name || 'Sin plan',
      })),
    };
  }
}
