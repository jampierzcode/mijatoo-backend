import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Hotel Demo
  const hotel = await prisma.hotel.findFirst({ where: { slug: 'hotel-demo' } });
  if (!hotel) { console.log('Hotel Demo not found'); return; }
  console.log(`Hotel: ${hotel.name} (${hotel.id})`);

  // Delete existing subscriptions and payments for this hotel
  const existingSubs = await prisma.subscription.findMany({ where: { hotelId: hotel.id }, select: { id: true } });
  for (const sub of existingSubs) {
    await prisma.subscriptionPayment.deleteMany({ where: { subscriptionId: sub.id } });
  }
  await prisma.subscription.deleteMany({ where: { hotelId: hotel.id } });
  console.log(`Deleted ${existingSubs.length} existing subscriptions`);

  // Find Basico plan price (monthly)
  const basicoPlan = await prisma.plan.findFirst({ where: { slug: 'basico' } });
  if (!basicoPlan) { console.log('Plan Basico not found'); return; }
  const basicoPrice = await prisma.planPrice.findFirst({
    where: { planId: basicoPlan.id, intervalUnit: 'MONTH', intervalCount: 1 },
  });
  if (!basicoPrice) { console.log('Basico monthly price not found'); return; }
  console.log(`Plan: ${basicoPlan.name} - S/${basicoPrice.price}/mes (${basicoPrice.id})`);

  // Find super admin user for registeredBy
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) { console.log('Super admin not found'); return; }

  // 1. Trial subscription (created when hotel was made, expired long ago)
  const trialStart = new Date('2025-11-20');
  const trialEnd = new Date('2025-11-27');
  await prisma.subscription.create({
    data: {
      hotelId: hotel.id,
      status: 'EXPIRED',
      trialStartDate: trialStart,
      trialEndDate: trialEnd,
      totalPrice: 0,
      paidAmount: 0,
      createdAt: trialStart,
    },
  });
  console.log('Created: Trial Nov 20-27, 2025 (EXPIRED)');

  // 2. December 2025 - Basico (paid in full, expired)
  const dec = await prisma.subscription.create({
    data: {
      hotelId: hotel.id,
      planPriceId: basicoPrice.id,
      status: 'EXPIRED',
      totalPrice: basicoPrice.price,
      paidAmount: basicoPrice.price,
      currentPeriodStart: new Date('2025-12-01'),
      currentPeriodEnd: new Date('2026-01-01'),
      createdAt: new Date('2025-12-01'),
    },
  });
  await prisma.subscriptionPayment.create({
    data: { subscriptionId: dec.id, amount: basicoPrice.price, method: 'TRANSFER', notes: 'Pago total - Diciembre', registeredBy: admin.id, createdAt: new Date('2025-12-01') },
  });
  console.log('Created: Basico Dec 2025 (EXPIRED, paid full)');

  // 3. January 2026 - Basico (paid in 2 partial payments, expired)
  const jan = await prisma.subscription.create({
    data: {
      hotelId: hotel.id,
      planPriceId: basicoPrice.id,
      status: 'EXPIRED',
      totalPrice: basicoPrice.price,
      paidAmount: basicoPrice.price,
      currentPeriodStart: new Date('2026-01-01'),
      currentPeriodEnd: new Date('2026-02-01'),
      createdAt: new Date('2026-01-01'),
    },
  });
  await prisma.subscriptionPayment.create({
    data: { subscriptionId: jan.id, amount: 50, method: 'YAPE', notes: 'Pago parcial 1 de 2', registeredBy: admin.id, createdAt: new Date('2026-01-02') },
  });
  await prisma.subscriptionPayment.create({
    data: { subscriptionId: jan.id, amount: 49, method: 'YAPE', notes: 'Pago parcial 2 de 2', registeredBy: admin.id, createdAt: new Date('2026-01-10') },
  });
  console.log('Created: Basico Jan 2026 (EXPIRED, 2 partial payments)');

  // 4. February 2026 - Basico (paid full, expired)
  const feb = await prisma.subscription.create({
    data: {
      hotelId: hotel.id,
      planPriceId: basicoPrice.id,
      status: 'EXPIRED',
      totalPrice: basicoPrice.price,
      paidAmount: basicoPrice.price,
      currentPeriodStart: new Date('2026-02-01'),
      currentPeriodEnd: new Date('2026-03-01'),
      createdAt: new Date('2026-02-01'),
    },
  });
  await prisma.subscriptionPayment.create({
    data: { subscriptionId: feb.id, amount: basicoPrice.price, method: 'CASH', notes: 'Pago total - Febrero', registeredBy: admin.id, createdAt: new Date('2026-02-03') },
  });
  console.log('Created: Basico Feb 2026 (EXPIRED, paid full)');

  // 5. March 2026 - Basico (expired YESTERDAY = March 4, 2026)
  const mar = await prisma.subscription.create({
    data: {
      hotelId: hotel.id,
      planPriceId: basicoPrice.id,
      status: 'EXPIRED',
      totalPrice: basicoPrice.price,
      paidAmount: basicoPrice.price,
      currentPeriodStart: new Date('2026-03-01'),
      currentPeriodEnd: new Date('2026-03-04'), // expired yesterday (today is March 5)
      createdAt: new Date('2026-03-01'),
    },
  });
  await prisma.subscriptionPayment.create({
    data: { subscriptionId: mar.id, amount: basicoPrice.price, method: 'PLIN', notes: 'Pago total - Marzo', registeredBy: admin.id, createdAt: new Date('2026-03-01') },
  });
  console.log('Created: Basico Mar 1-4, 2026 (EXPIRED yesterday)');

  console.log('\nDone! Hotel Demo now has 5 subscriptions in history.');
  console.log('Current status: EXPIRED - hotel needs to select a new plan.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
