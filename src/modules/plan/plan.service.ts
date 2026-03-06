import { prisma } from '../../config';

export class PlanService {
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
    return prisma.planPrice.create({
      data: { ...data, planId, intervalUnit: data.intervalUnit as any },
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
