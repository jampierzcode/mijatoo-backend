import { prisma } from '../../config';
import { culqiJato } from '../../config/culqi';

// Culqi interval_unit_time: 1=dias, 2=semanas, 3=meses, 4=anios
const INTERVAL_UNIT_TO_CULQI_TIME: Record<string, number> = {
  DAY: 1,
  WEEK: 2,
  MONTH: 3,
  YEAR: 4,
};

export class PlanService {
  // Ensure a PlanPrice has a corresponding Culqi plan, create if missing
  async ensureCulqiPlan(planPriceId: string): Promise<string> {
    const planPrice = await prisma.planPrice.findUnique({
      where: { id: planPriceId },
      include: { plan: true },
    });
    if (!planPrice) throw new Error('Precio de plan no encontrado');
    if (planPrice.culqiPlanId) return planPrice.culqiPlanId;

    if (!culqiJato) throw new Error('Culqi no está configurado');

    const intervalUnitTime = INTERVAL_UNIT_TO_CULQI_TIME[planPrice.intervalUnit];
    if (!intervalUnitTime) throw new Error(`Intervalo no soportado: ${planPrice.intervalUnit}`);

    const unitLabel = ['', 'd', 'w', 'm', 'y'][intervalUnitTime] || 'x';
    const planName = `${planPrice.plan.name} ${planPrice.intervalCount}${unitLabel}`;
    const shortName = `pln-${planPrice.plan.slug}-${planPrice.intervalCount}${unitLabel}`.substring(0, 50);

    const culqiPlan = await culqiJato.createPlan({
      name: planName,
      shortName,
      amount: Math.round(planPrice.price * 100), // centimos
      currency: planPrice.currency || 'PEN',
      intervalUnitTime,
      intervalCount: planPrice.intervalCount,
      description: `Suscripcion ${planPrice.plan.name}`,
      metadata: { plan_price_id: planPriceId },
    });

    await prisma.planPrice.update({
      where: { id: planPriceId },
      data: { culqiPlanId: culqiPlan.id },
    });

    return culqiPlan.id;
  }

  // Sync all active prices to Culqi
  async syncAllPricesToCulqi() {
    const prices = await prisma.planPrice.findMany({
      where: { isActive: true, culqiPlanId: null },
      include: { plan: true },
    });

    const results: { priceId: string; culqiPlanId: string }[] = [];
    for (const price of prices) {
      try {
        const culqiPlanId = await this.ensureCulqiPlan(price.id);
        results.push({ priceId: price.id, culqiPlanId });
      } catch (err: any) {
        console.error(`[PlanSync] Failed to sync price ${price.id}:`, err.message);
      }
    }
    return results;
  }

  async findAll() {
    return prisma.plan.findMany({
      include: { prices: { orderBy: { price: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: { prices: { orderBy: { price: 'asc' } } },
    });
    if (!plan) throw new Error('Plan no encontrado');
    return plan;
  }

  async create(data: {
    name: string; slug: string; description?: string;
    features?: string[]; isActive?: boolean; displayOrder?: number;
  }) {
    const existing = await prisma.plan.findUnique({ where: { slug: data.slug } });
    if (existing) throw new Error('El slug ya está en uso');
    return prisma.plan.create({ data });
  }

  async update(id: string, data: Record<string, any>) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new Error('Plan no encontrado');

    if (data.slug && data.slug !== plan.slug) {
      const existing = await prisma.plan.findUnique({ where: { slug: data.slug } });
      if (existing) throw new Error('El slug ya está en uso');
    }

    return prisma.plan.update({ where: { id }, data });
  }

  async delete(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: { prices: { include: { _count: { select: { subscriptions: true } } } } },
    });
    if (!plan) throw new Error('Plan no encontrado');

    const hasSubscriptions = plan.prices.some(p => p._count.subscriptions > 0);
    if (hasSubscriptions) throw new Error('No se puede eliminar un plan con suscripciones activas');

    await prisma.planPrice.deleteMany({ where: { planId: id } });
    return prisma.plan.delete({ where: { id } });
  }

  async createPrice(planId: string, data: {
    intervalCount: number; intervalUnit: string; price: number;
    currency?: string; isActive?: boolean;
  }) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan no encontrado');

    const planPrice = await prisma.planPrice.create({
      data: { ...data, planId, intervalUnit: data.intervalUnit as any },
    });

    // Auto-sync with Culqi
    try {
      await this.ensureCulqiPlan(planPrice.id);
    } catch (err: any) {
      console.error(`[PlanService] Failed to sync price ${planPrice.id} with Culqi:`, err.message);
    }

    return prisma.planPrice.findUnique({
      where: { id: planPrice.id },
    });
  }

  async updatePrice(planId: string, priceId: string, data: Record<string, any>) {
    const price = await prisma.planPrice.findFirst({ where: { id: priceId, planId } });
    if (!price) throw new Error('Precio no encontrado');
    return prisma.planPrice.update({ where: { id: priceId }, data });
  }

  async deletePrice(planId: string, priceId: string) {
    const price = await prisma.planPrice.findFirst({
      where: { id: priceId, planId },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!price) throw new Error('Precio no encontrado');
    if (price._count.subscriptions > 0) throw new Error('No se puede eliminar un precio con suscripciones activas');
    return prisma.planPrice.delete({ where: { id: priceId } });
  }

  async findActivePlansWithPrices() {
    return prisma.plan.findMany({
      where: { isActive: true },
      include: { prices: { where: { isActive: true }, orderBy: { price: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
