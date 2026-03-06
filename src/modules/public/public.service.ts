import { prisma } from '../../config';
import { NotificationService } from '../notification/notification.service';
import { emitNotification } from '../notification';
import { EmailService } from '../email/email.service';

export class PublicService {
  async listActiveHotels() {
    return prisma.hotel.findMany({
      where: { isActive: true },
      select: { name: true, slug: true, city: true },
      orderBy: { name: 'asc' },
    });
  }

  async getHotelBySlug(slug: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { slug },
      select: {
        id: true, name: true, slug: true, description: true, address: true,
        city: true, country: true, phone: true, email: true, logoUrl: true,
        coverImageUrl: true, isActive: true,
        checkInFrom: true, checkInUntil: true, checkOutUntil: true,
        _count: { select: { rooms: true } },
      },
    });
    if (!hotel || !hotel.isActive) throw new Error('Hotel no encontrado');
    return hotel;
  }

  async getCategoriesByHotelSlug(slug: string) {
    const hotel = await prisma.hotel.findUnique({ where: { slug } });
    if (!hotel || !hotel.isActive) throw new Error('Hotel no encontrado');

    return prisma.roomCategory.findMany({
      where: { hotelId: hotel.id, isActive: true },
      include: {
        _count: { select: { rooms: { where: { status: 'AVAILABLE' } } } },
      },
      orderBy: { pricePerNight: 'asc' },
    });
  }

  async getAvailabilityByCategory(slug: string, checkIn: string, checkOut: string) {
    const hotel = await prisma.hotel.findUnique({ where: { slug } });
    if (!hotel || !hotel.isActive) throw new Error('Hotel no encontrado');

    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);

    const categories = await prisma.roomCategory.findMany({
      where: { hotelId: hotel.id, isActive: true },
      include: {
        rooms: {
          where: { status: { not: 'MAINTENANCE' } },
          select: { id: true },
        },
      },
      orderBy: { pricePerNight: 'asc' },
    });

    // Find rooms with overlapping reservations
    const occupiedRoomIds = await prisma.reservation.findMany({
      where: {
        hotelId: hotel.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: coDate },
        checkOut: { gt: ciDate },
        roomId: { not: null },
      },
      select: { roomId: true },
    });
    const occupiedIds = new Set(occupiedRoomIds.map(r => r.roomId));

    // Also count reservations without roomId (category-level reservations)
    const categoryReservations = await prisma.reservation.groupBy({
      by: ['categoryId'],
      where: {
        hotelId: hotel.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: coDate },
        checkOut: { gt: ciDate },
        roomId: null,
      },
      _count: { id: true },
    });
    const unassignedByCategory = new Map(
      categoryReservations.map(cr => [cr.categoryId, cr._count.id])
    );

    return categories.map(cat => {
      const availableRooms = cat.rooms.filter(r => !occupiedIds.has(r.id));
      const unassignedCount = unassignedByCategory.get(cat.id) || 0;
      const availableCount = Math.max(0, availableRooms.length - unassignedCount);
      const { rooms, ...categoryData } = cat;
      return { ...categoryData, availableCount };
    });
  }

  async getCategoryBySlug(hotelSlug: string, categorySlug: string) {
    const hotel = await prisma.hotel.findUnique({ where: { slug: hotelSlug } });
    if (!hotel || !hotel.isActive) throw new Error('Hotel no encontrado');

    const category = await prisma.roomCategory.findFirst({
      where: { hotelId: hotel.id, slug: categorySlug, isActive: true },
      include: {
        _count: { select: { rooms: { where: { status: 'AVAILABLE' } } } },
      },
    });
    if (!category) throw new Error('Categoría no encontrada');

    return category;
  }

  async getAvailableRooms(slug: string, checkIn?: string, checkOut?: string, categoryId?: string) {
    const hotel = await prisma.hotel.findUnique({ where: { slug } });
    if (!hotel || !hotel.isActive) throw new Error('Hotel no encontrado');

    const where: any = { hotelId: hotel.id, status: { not: 'MAINTENANCE' } };
    if (categoryId) where.categoryId = categoryId;

    let rooms = await prisma.room.findMany({
      where,
      include: {
        category: {
          select: {
            id: true, name: true, slug: true, description: true,
            capacity: true, pricePerNight: true, amenities: true,
            coverImageUrl: true, galleryImages: true,
          },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    // Filter out rooms with overlapping reservations if dates are provided
    if (checkIn && checkOut) {
      const ciDate = new Date(checkIn);
      const coDate = new Date(checkOut);

      const occupiedRoomIds = await prisma.reservation.findMany({
        where: {
          hotelId: hotel.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
          checkIn: { lt: coDate },
          checkOut: { gt: ciDate },
          roomId: { not: null },
        },
        select: { roomId: true },
      });

      const occupiedIds = new Set(occupiedRoomIds.map(r => r.roomId));
      rooms = rooms.filter(r => !occupiedIds.has(r.id));
    }

    return rooms;
  }

  async getRoomBySlugAndId(slug: string, roomId: string) {
    const hotel = await prisma.hotel.findUnique({ where: { slug } });
    if (!hotel || !hotel.isActive) throw new Error('Hotel no encontrado');

    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId: hotel.id },
      include: {
        category: {
          select: {
            id: true, name: true, slug: true, description: true,
            capacity: true, pricePerNight: true, amenities: true,
            coverImageUrl: true, galleryImages: true,
          },
        },
      },
    });
    if (!room) throw new Error('Habitación no encontrada');

    return room;
  }

  async getReviewsByCategorySlug(hotelSlug: string, categorySlug: string) {
    const hotel = await prisma.hotel.findUnique({ where: { slug: hotelSlug } });
    if (!hotel || !hotel.isActive) throw new Error('Hotel no encontrado');

    const category = await prisma.roomCategory.findFirst({
      where: { hotelId: hotel.id, slug: categorySlug, isActive: true },
    });
    if (!category) throw new Error('Categoría no encontrada');

    const reviews = await prisma.review.findMany({
      where: { hotelId: hotel.id, categoryId: category.id },
      orderBy: { createdAt: 'desc' },
    });

    const count = reviews.length;
    const averageRating = count > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    return { reviews, averageRating, count };
  }

  async createPublicReservation(slug: string, data: {
    categoryId: string; guestFirstName: string; guestLastName: string;
    guestEmail: string; guestPhone?: string; checkIn: string; checkOut: string;
    numberOfGuests: number; notes?: string;
  }) {
    const hotel = await prisma.hotel.findUnique({ where: { slug } });
    if (!hotel || !hotel.isActive) throw new Error('Hotel no encontrado');

    const category = await prisma.roomCategory.findFirst({
      where: { id: data.categoryId, hotelId: hotel.id, isActive: true },
      include: { rooms: { where: { status: { not: 'MAINTENANCE' } }, select: { id: true } } },
    });
    if (!category) throw new Error('Categoría no encontrada');

    const checkIn = new Date(data.checkIn + 'T00:00:00');
    const checkOut = new Date(data.checkOut + 'T00:00:00');

    if (checkIn >= checkOut) throw new Error('Check-out debe ser posterior a check-in');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) throw new Error('Check-in no puede ser en el pasado');

    // Validate check-in time if booking for today and hotel has checkInUntil
    if (checkIn.getTime() === today.getTime() && hotel.checkInUntil) {
      const now = new Date();
      const [limitH, limitM] = hotel.checkInUntil.split(':').map(Number);
      const limitMinutes = limitH * 60 + limitM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (currentMinutes > limitMinutes) {
        throw new Error(`El horario de check-in para hoy ha finalizado (hasta las ${hotel.checkInUntil})`);
      }
    }

    if (data.numberOfGuests > category.capacity) throw new Error('Número de huéspedes excede la capacidad');

    // Check availability: rooms in category minus overlapping reservations
    const occupiedRoomIds = await prisma.reservation.findMany({
      where: {
        hotelId: hotel.id,
        categoryId: data.categoryId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        roomId: { not: null },
      },
      select: { roomId: true },
    });
    const occupiedIds = new Set(occupiedRoomIds.map(r => r.roomId));
    const freeRooms = category.rooms.filter(r => !occupiedIds.has(r.id));

    // Count unassigned reservations for same category and overlapping dates
    const unassignedCount = await prisma.reservation.count({
      where: {
        hotelId: hotel.id,
        categoryId: data.categoryId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        roomId: null,
      },
    });

    if (freeRooms.length - unassignedCount <= 0) {
      throw new Error('No hay disponibilidad para esta categoría en las fechas seleccionadas');
    }

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * category.pricePerNight;

    const reservation = await prisma.reservation.create({
      data: {
        hotelId: hotel.id,
        categoryId: data.categoryId,
        guestFirstName: data.guestFirstName,
        guestLastName: data.guestLastName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        checkIn,
        checkOut,
        numberOfGuests: data.numberOfGuests,
        totalPrice,
        notes: data.notes,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
      include: {
        category: { select: { name: true, slug: true } },
        hotel: { select: { name: true } },
      },
    });

    // Emit notification
    try {
      const notificationService = new NotificationService();
      const notification = await notificationService.create({
        hotelId: hotel.id,
        type: 'NEW_RESERVATION',
        title: 'Nueva reserva',
        message: `${data.guestFirstName} ${data.guestLastName} reservó ${category.name} del ${data.checkIn} al ${data.checkOut}`,
        data: { reservationId: reservation.id },
      });
      emitNotification(hotel.id, notification);
    } catch {
      // Notification failure should not block reservation creation
    }

    // Send confirmation email
    try {
      const emailService = new EmailService();
      await emailService.sendReservationConfirmation({
        guestName: `${data.guestFirstName} ${data.guestLastName}`,
        guestEmail: data.guestEmail,
        hotelName: hotel.name,
        categoryName: category.name,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        nights,
        totalPrice,
        numberOfGuests: data.numberOfGuests,
        reservationId: reservation.id,
      });
    } catch {
      // Email failure should not block reservation creation
    }

    return reservation;
  }
}
