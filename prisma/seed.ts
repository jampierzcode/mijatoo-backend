import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@mijatoo.com' },
    update: {},
    create: {
      email: 'admin@mijatoo.com',
      password: hashedPassword,
      firstName: 'Jampier',
      lastName: 'Vasquez',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Super Admin created:', superAdmin.email);

  // Create MiJatoo Plan - single plan, same price for everyone
  const planData = {
    name: 'MiJatoo',
    slug: 'mijatoo',
    description: 'Acceso completo a todas las funcionalidades. Sin limites, sin restricciones.',
    features: [
      'Reservas online ilimitadas',
      'Pagina publica de tu hotel',
      'Gestion de habitaciones y categorias',
      'Snack Bar integrado',
      'Dashboard y reportes',
      'Soporte en espanol',
      'Actualizaciones gratuitas de por vida',
      'Sin limite de habitaciones',
      'Onboarding personalizado',
      'Backups diarios',
    ],
    displayOrder: 1,
  };

  const existingPlan = await prisma.plan.findUnique({ where: { slug: planData.slug } });
  if (!existingPlan) {
    const plan = await prisma.plan.create({ data: planData });
    await prisma.planPrice.create({
      data: {
        planId: plan.id,
        intervalCount: 1,
        intervalUnit: 'MONTH',
        price: 15,
        currency: 'PEN',
      },
    });
    console.log('Plan MiJatoo created: S/15.00/mes');
  } else {
    console.log('Plan MiJatoo already exists, skipping.');
  }

  console.log('\nSeed completed!');
  console.log('Super Admin: admin@mijatoo.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
