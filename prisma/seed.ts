import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@apphotel.com' },
    update: {},
    create: {
      email: 'admin@apphotel.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Super Admin created:', superAdmin.email);

  // Create a demo hotel
  const hotel = await prisma.hotel.upsert({
    where: { slug: 'hotel-demo' },
    update: {},
    create: {
      name: 'Hotel Demo',
      slug: 'hotel-demo',
      description: 'Un hotel de demostración para probar el sistema',
      address: 'Av. Principal 123',
      city: 'Lima',
      country: 'Perú',
      phone: '+51 999 888 777',
      email: 'info@hoteldemo.com',
    },
  });
  console.log('Demo hotel created:', hotel.name);

  // Create Hotel Admin
  const hotelAdminPassword = await bcrypt.hash('hotel123', 12);
  const hotelAdmin = await prisma.user.upsert({
    where: { email: 'hoteladmin@apphotel.com' },
    update: {},
    create: {
      email: 'hoteladmin@apphotel.com',
      password: hotelAdminPassword,
      firstName: 'Hotel',
      lastName: 'Admin',
      role: 'HOTEL_ADMIN',
      hotelId: hotel.id,
    },
  });
  console.log('Hotel Admin created:', hotelAdmin.email);

  // Create room categories
  const categories = [
    {
      slug: 'single',
      name: 'Habitación Simple',
      description: 'Habitación cómoda para una persona con todas las comodidades básicas.',
      capacity: 1,
      pricePerNight: 50,
      amenities: ['WiFi', 'TV', 'Aire acondicionado'],
    },
    {
      slug: 'double',
      name: 'Habitación Doble',
      description: 'Amplia habitación para dos personas con cama doble y amenidades premium.',
      capacity: 2,
      pricePerNight: 80,
      amenities: ['WiFi', 'TV', 'Aire acondicionado', 'Mini bar'],
    },
    {
      slug: 'suite-junior',
      name: 'Suite Junior',
      description: 'Suite elegante con sala de estar separada y jacuzzi privado.',
      capacity: 3,
      pricePerNight: 150,
      amenities: ['WiFi', 'TV', 'Aire acondicionado', 'Mini bar', 'Jacuzzi'],
    },
    {
      slug: 'presidential',
      name: 'Suite Presidencial',
      description: 'La experiencia más exclusiva con todas las comodidades de lujo.',
      capacity: 4,
      pricePerNight: 300,
      amenities: ['WiFi', 'TV', 'Aire acondicionado', 'Mini bar', 'Jacuzzi', 'Sala de estar'],
    },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categories) {
    const existing = await prisma.roomCategory.findUnique({
      where: { hotelId_slug: { hotelId: hotel.id, slug: cat.slug } },
    });
    if (existing) {
      createdCategories[cat.slug] = existing.id;
    } else {
      const created = await prisma.roomCategory.create({
        data: { ...cat, hotelId: hotel.id },
      });
      createdCategories[cat.slug] = created.id;
    }
  }
  console.log('Demo categories created:', categories.length);

  // Create demo rooms
  const rooms = [
    { roomNumber: '101', name: 'Habitación 101', categorySlug: 'single' },
    { roomNumber: '102', name: 'Habitación 102', categorySlug: 'double' },
    { roomNumber: '201', name: 'Suite 201', categorySlug: 'suite-junior' },
    { roomNumber: '301', name: 'Presidencial 301', categorySlug: 'presidential' },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: room.roomNumber } },
      update: {},
      create: {
        roomNumber: room.roomNumber,
        name: room.name,
        categoryId: createdCategories[room.categorySlug],
        hotelId: hotel.id,
      },
    });
  }
  console.log('Demo rooms created:', rooms.length);

  // Create demo snacks
  const snacks = [
    { name: 'Coca Cola', price: 3, stock: 50, description: 'Lata 330ml' },
    { name: 'Agua Mineral', price: 2, stock: 100, description: 'Botella 500ml' },
    { name: 'Snickers', price: 2.5, stock: 30, description: 'Barra de chocolate' },
    { name: 'Pringles', price: 4, stock: 20, description: 'Papas fritas Original' },
  ];

  for (const snack of snacks) {
    const existing = await prisma.snackItem.findFirst({
      where: { hotelId: hotel.id, name: snack.name },
    });
    if (!existing) {
      await prisma.snackItem.create({ data: { ...snack, hotelId: hotel.id } });
    }
  }
  console.log('Demo snacks created:', snacks.length);

  // Create Reviews (5 per category)
  const reviewsData = [
    { categorySlug: 'single', guestName: 'Carlos Mendoza', rating: 4, comment: 'Muy buena habitación para una noche. Limpia y cómoda, el WiFi funcionó perfecto.' },
    { categorySlug: 'single', guestName: 'Ana García', rating: 5, comment: 'Excelente relación calidad-precio. El aire acondicionado es silencioso y la cama muy cómoda.' },
    { categorySlug: 'single', guestName: 'Roberto Sánchez', rating: 3, comment: 'Correcta para el precio. La habitación es pequeña pero tiene todo lo necesario.' },
    { categorySlug: 'single', guestName: 'María López', rating: 4, comment: 'Buena ubicación y servicio. La habitación estaba impecable al llegar.' },
    { categorySlug: 'single', guestName: 'Jorge Ramírez', rating: 5, comment: 'Perfecta para viajes de negocios. Rápido check-in y muy buena atención.' },
    { categorySlug: 'double', guestName: 'Patricia Flores', rating: 5, comment: 'La habitación doble es amplia y luminosa. El mini bar tenía de todo. Volveremos!' },
    { categorySlug: 'double', guestName: 'Luis Torres', rating: 4, comment: 'Muy cómoda para dos personas. Las amenidades premium hacen la diferencia.' },
    { categorySlug: 'double', guestName: 'Carmen Vargas', rating: 4, comment: 'Pasamos un fin de semana increíble. La cama king es muy confortable.' },
    { categorySlug: 'double', guestName: 'Diego Herrera', rating: 5, comment: 'Superó nuestras expectativas. Excelente servicio y habitación impecable.' },
    { categorySlug: 'double', guestName: 'Sofía Castillo', rating: 3, comment: 'Buena habitación en general. El mini bar podría tener más opciones.' },
    { categorySlug: 'suite-junior', guestName: 'Fernando Quispe', rating: 5, comment: 'El jacuzzi privado es espectacular. La sala de estar es perfecta para relajarse.' },
    { categorySlug: 'suite-junior', guestName: 'Lucía Paredes', rating: 5, comment: 'Una experiencia de lujo a un precio razonable. La suite es hermosa y muy bien equipada.' },
    { categorySlug: 'suite-junior', guestName: 'Miguel Huamán', rating: 4, comment: 'Excelente suite, muy espaciosa. El jacuzzi fue lo mejor de nuestra estadía.' },
    { categorySlug: 'suite-junior', guestName: 'Valentina Rojas', rating: 4, comment: 'Celebramos nuestro aniversario aquí. Todo fue perfecto, muy recomendado.' },
    { categorySlug: 'suite-junior', guestName: 'Andrés Morales', rating: 5, comment: 'La mejor suite en la que me he hospedado. El servicio es de primera.' },
    { categorySlug: 'presidential', guestName: 'Isabella Delgado', rating: 5, comment: 'Una experiencia inolvidable. La suite presidencial tiene todo lo que puedas imaginar.' },
    { categorySlug: 'presidential', guestName: 'Ricardo Navarro', rating: 5, comment: 'Lujo absoluto. La sala de estar, el jacuzzi, las vistas... todo impecable.' },
    { categorySlug: 'presidential', guestName: 'Camila Espinoza', rating: 4, comment: 'Increíble suite para ocasiones especiales. El servicio personalizado marca la diferencia.' },
    { categorySlug: 'presidential', guestName: 'Alejandro Vega', rating: 5, comment: 'Sin palabras. La suite presidencial es una obra de arte. Regresaremos sin duda.' },
    { categorySlug: 'presidential', guestName: 'Daniela Cruz', rating: 5, comment: 'La mejor experiencia hotelera de mi vida. Cada detalle está cuidado al máximo.' },
  ];

  const existingReviews = await prisma.review.count({ where: { hotelId: hotel.id } });
  if (existingReviews === 0) {
    for (const review of reviewsData) {
      const categoryId = createdCategories[review.categorySlug];
      if (categoryId) {
        await prisma.review.create({
          data: {
            hotelId: hotel.id,
            categoryId,
            guestName: review.guestName,
            rating: review.rating,
            comment: review.comment,
          },
        });
      }
    }
    console.log('Demo reviews created:', reviewsData.length);
  }

  // Create Plans
  const plansData = [
    {
      name: 'Basico',
      slug: 'basico',
      description: 'Ideal para hoteles pequenos que inician.',
      features: ['Hasta 10 habitaciones', 'Reservas online', 'Dashboard basico', 'Soporte por email'],
      displayOrder: 1,
      prices: [
        { intervalCount: 1, intervalUnit: 'MONTH' as const, price: 99, currency: 'PEN' },
        { intervalCount: 1, intervalUnit: 'YEAR' as const, price: 990, currency: 'PEN' },
      ],
    },
    {
      name: 'Profesional',
      slug: 'profesional',
      description: 'Para hoteles en crecimiento con necesidades avanzadas.',
      features: ['Hasta 50 habitaciones', 'Reservas online', 'Dashboard avanzado', 'Gestion de snacks', 'Reportes', 'Soporte prioritario'],
      displayOrder: 2,
      prices: [
        { intervalCount: 1, intervalUnit: 'MONTH' as const, price: 199, currency: 'PEN' },
        { intervalCount: 1, intervalUnit: 'YEAR' as const, price: 1990, currency: 'PEN' },
      ],
    },
    {
      name: 'Empresarial',
      slug: 'empresarial',
      description: 'Solucion completa para cadenas hoteleras.',
      features: ['Habitaciones ilimitadas', 'Reservas online', 'Dashboard completo', 'Gestion de snacks', 'Reportes avanzados', 'Multi-usuario', 'Pagos con Stripe', 'Soporte 24/7'],
      displayOrder: 3,
      prices: [
        { intervalCount: 1, intervalUnit: 'MONTH' as const, price: 399, currency: 'PEN' },
        { intervalCount: 1, intervalUnit: 'YEAR' as const, price: 3990, currency: 'PEN' },
      ],
    },
  ];

  for (const planData of plansData) {
    const { prices, ...planFields } = planData;
    const existingPlan = await prisma.plan.findUnique({ where: { slug: planFields.slug } });
    if (!existingPlan) {
      const plan = await prisma.plan.create({ data: planFields });
      for (const price of prices) {
        await prisma.planPrice.create({ data: { ...price, planId: plan.id } });
      }
    }
  }
  console.log('Plans created:', plansData.length);

  // Create trial subscription for demo hotel
  const existingSub = await prisma.subscription.findUnique({ where: { hotelId: hotel.id } });
  if (!existingSub) {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7);
    await prisma.subscription.create({
      data: {
        hotelId: hotel.id,
        status: 'TRIALING',
        trialStartDate: now,
        trialEndDate: trialEnd,
      },
    });
    console.log('Trial subscription created for demo hotel');
  }

  console.log('\nSeed completed! Login credentials:');
  console.log('Super Admin: admin@apphotel.com / admin123');
  console.log('Hotel Admin: hoteladmin@apphotel.com / hotel123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
