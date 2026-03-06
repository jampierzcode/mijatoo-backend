import { prisma } from '../../config';
import { TRIAL_DAYS } from '../../shared';
import { EmailService } from '../email/email.service';

const emailService = new EmailService();

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

  async cancelSubscription(id: string) {
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new Error('Suscripcion no encontrada');

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
