import { prisma } from '../../config';
import { VALID_RESERVATION_TRANSITIONS } from '../../shared';

export class ReservationService {
  async findAll(hotelId: string, status?: string) {
    const where: any = { hotelId };
    if (status) where.status = status;
    return prisma.reservation.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        room: { select: { roomNumber: true, name: true } },
        guest: { select: { id: true, documentType: true, documentNumber: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, hotelId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId },
      include: {
        category: { select: { id: true, name: true, slug: true, pricePerNight: true, capacity: true } },
        room: { select: { id: true, roomNumber: true, name: true } },
        guest: { select: { id: true, documentType: true, documentNumber: true, firstName: true, lastName: true, email: true, phone: true } },
        productSales: { include: { product: { select: { name: true } } } },
        sale: true,
      },
    });
    if (!reservation) throw new Error('Reserva no encontrada');
    return reservation;
  }

  async create(hotelId: string, data: {
    categoryId: string; roomId?: string; guestId?: string;
    guestFirstName: string; guestLastName: string;
    guestEmail: string; guestPhone?: string; checkIn: string; checkOut: string;
    numberOfGuests: number; notes?: string;
  }) {
    const category = await prisma.roomCategory.findFirst({
      where: { id: data.categoryId, hotelId },
    });
    if (!category) throw new Error('Categoría no encontrada');

    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (checkIn >= checkOut) throw new Error('Check-out debe ser posterior a check-in');
    if (data.numberOfGuests > category.capacity) throw new Error('Número de huéspedes excede la capacidad');

    if (data.roomId) {
      const room = await prisma.room.findFirst({
        where: { id: data.roomId, hotelId, categoryId: data.categoryId },
      });
      if (!room) throw new Error('Habitación no encontrada o no pertenece a la categoría');

      const overlapping = await prisma.reservation.findFirst({
        where: {
          roomId: data.roomId,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
          OR: [{ checkIn: { lt: checkOut }, checkOut: { gt: checkIn } }],
        },
      });
      if (overlapping) throw new Error('La habitación ya tiene una reserva en esas fechas');
    }

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * category.pricePerNight;

    return prisma.reservation.create({
      data: {
        hotelId,
        categoryId: data.categoryId,
        roomId: data.roomId || null,
        guestId: data.guestId || null,
        guestFirstName: data.guestFirstName,
        guestLastName: data.guestLastName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        checkIn,
        checkOut,
        numberOfGuests: data.numberOfGuests,
        totalPrice,
        notes: data.notes,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
      },
      include: {
        category: { select: { name: true, slug: true } },
        room: { select: { roomNumber: true, name: true } },
      },
    });
  }

  async assignRoom(id: string, hotelId: string, roomId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId },
    });
    if (!reservation) throw new Error('Reserva no encontrada');
    if (!['CONFIRMED', 'PENDING'].includes(reservation.status)) {
      throw new Error('Solo se puede asignar habitación a reservas confirmadas o pendientes');
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId, categoryId: reservation.categoryId },
    });
    if (!room) throw new Error('Habitación no encontrada o no pertenece a la categoría de la reserva');
    if (room.status !== 'AVAILABLE') throw new Error('La habitación no está disponible');

    const overlapping = await prisma.reservation.findFirst({
      where: {
        roomId,
        id: { not: id },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: reservation.checkOut },
        checkOut: { gt: reservation.checkIn },
      },
    });
    if (overlapping) throw new Error('La habitación ya tiene una reserva en esas fechas');

    return prisma.reservation.update({
      where: { id },
      data: { roomId },
      include: {
        category: { select: { name: true, slug: true } },
        room: { select: { id: true, roomNumber: true, name: true } },
      },
    });
  }

  async suggestRoom(id: string, hotelId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId },
    });
    if (!reservation) throw new Error('Reserva no encontrada');

    const availableRooms = await prisma.room.findMany({
      where: {
        hotelId,
        categoryId: reservation.categoryId,
        status: 'AVAILABLE',
      },
      orderBy: { roomNumber: 'asc' },
    });

    const occupiedRoomIds = await prisma.reservation.findMany({
      where: {
        hotelId,
        roomId: { not: null },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: reservation.checkOut },
        checkOut: { gt: reservation.checkIn },
      },
      select: { roomId: true },
    });
    const occupiedIds = new Set(occupiedRoomIds.map(r => r.roomId));

    const suggested = availableRooms.find(r => !occupiedIds.has(r.id));
    return suggested || null;
  }

  async getAvailableRoomsForReservation(id: string, hotelId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId },
    });
    if (!reservation) throw new Error('Reserva no encontrada');

    const rooms = await prisma.room.findMany({
      where: {
        hotelId,
        categoryId: reservation.categoryId,
        status: 'AVAILABLE',
      },
      orderBy: { roomNumber: 'asc' },
    });

    const occupiedRoomIds = await prisma.reservation.findMany({
      where: {
        hotelId,
        roomId: { not: null },
        id: { not: id },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: reservation.checkOut },
        checkOut: { gt: reservation.checkIn },
      },
      select: { roomId: true },
    });
    const occupiedIds = new Set(occupiedRoomIds.map(r => r.roomId));

    return rooms.filter(r => !occupiedIds.has(r.id));
  }

  async reassignRoom(id: string, hotelId: string, newRoomId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId },
    });
    if (!reservation) throw new Error('Reserva no encontrada');
    if (!['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(reservation.status)) {
      throw new Error('Solo se puede reasignar habitación a reservas pendientes, confirmadas o con check-in');
    }

    const newRoom = await prisma.room.findFirst({
      where: { id: newRoomId, hotelId, categoryId: reservation.categoryId },
    });
    if (!newRoom) throw new Error('Habitación no encontrada o no pertenece a la categoría');
    if (newRoom.status !== 'AVAILABLE') throw new Error('La habitación no está disponible');

    const overlapping = await prisma.reservation.findFirst({
      where: {
        roomId: newRoomId,
        id: { not: id },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: reservation.checkOut },
        checkOut: { gt: reservation.checkIn },
      },
    });
    if (overlapping) throw new Error('La habitación ya tiene una reserva en esas fechas');

    return prisma.$transaction(async (tx) => {
      if (reservation.roomId) {
        if (reservation.status === 'CHECKED_IN') {
          await tx.room.update({
            where: { id: reservation.roomId },
            data: { status: 'CLEANING' },
          });
        }
      }

      if (reservation.status === 'CHECKED_IN') {
        await tx.room.update({
          where: { id: newRoomId },
          data: { status: 'OCCUPIED' },
        });
      }

      return tx.reservation.update({
        where: { id },
        data: { roomId: newRoomId },
        include: {
          category: { select: { name: true, slug: true } },
          room: { select: { id: true, roomNumber: true, name: true } },
        },
      });
    });
  }

  async updateStatus(id: string, hotelId: string, status: string) {
    const reservation = await prisma.reservation.findFirst({ where: { id, hotelId } });
    if (!reservation) throw new Error('Reserva no encontrada');

    const validTransitions = VALID_RESERVATION_TRANSITIONS[reservation.status];
    if (!validTransitions?.includes(status)) {
      throw new Error(`No se puede cambiar de ${reservation.status} a ${status}`);
    }

    const updateData: any = { status };

    if (status === 'CHECKED_IN') {
      if (!reservation.roomId) {
        throw new Error('Debe asignar una habitación antes de hacer check-in');
      }
      await prisma.room.update({
        where: { id: reservation.roomId },
        data: { status: 'OCCUPIED' },
      });
    }

    if (status === 'CHECKED_OUT') {
      if (reservation.roomId) {
        await prisma.room.update({
          where: { id: reservation.roomId },
          data: { status: 'CLEANING' },
        });
      }

      // Recalculate totals based on actual nights + early checkout policy
      const category = await prisma.roomCategory.findUnique({ where: { id: reservation.categoryId } });
      const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
      const pricePerNight = category?.pricePerNight || 0;

      const checkIn = new Date(reservation.checkIn);
      const plannedCheckOut = new Date(reservation.checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const plannedNights = Math.ceil((plannedCheckOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const actualNights = Math.max(1, Math.ceil((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      const isEarly = actualNights < plannedNights;
      const extraNights = Math.max(0, actualNights - plannedNights);
      const unusedNights = Math.max(0, plannedNights - actualNights);

      let penaltyAmount = 0;
      if (isEarly && hotel) {
        const policy = hotel.earlyCheckoutPolicy || 'CHARGE_ACTUAL';
        const penaltyValue = hotel.earlyCheckoutPenalty || 0;
        switch (policy) {
          case 'CHARGE_FULL': penaltyAmount = unusedNights * pricePerNight; break;
          case 'PENALTY_PERCENT': penaltyAmount = unusedNights * pricePerNight * (penaltyValue / 100); break;
          case 'PENALTY_FIXED': penaltyAmount = unusedNights * penaltyValue; break;
        }
      }

      const roomCharge = actualNights * pricePerNight + penaltyAmount + extraNights * pricePerNight;

      // Update reservation with actual checkout date and recalculated price
      if (actualNights !== plannedNights) {
        updateData.checkOut = today;
        updateData.totalPrice = roomCharge;
      }

      // Create Sale record
      const productSales = await prisma.productSale.findMany({
        where: { reservationId: id },
      });
      const subtotalProducts = productSales.reduce((sum, ps) => sum + ps.totalPrice, 0);
      const subtotalRoom = updateData.totalPrice || reservation.totalPrice;
      const total = subtotalRoom + subtotalProducts;

      if (hotel) {
        const serie = hotel.serieBoleta;
        const folio = hotel.nextFolio;

        await prisma.$transaction(async (tx) => {
          await tx.sale.create({
            data: {
              hotelId,
              reservationId: id,
              guestId: reservation.guestId || null,
              serie,
              folio,
              subtotalRoom,
              subtotalProducts,
              total,
            },
          });
          await tx.hotel.update({
            where: { id: hotelId },
            data: { nextFolio: { increment: 1 } },
          });
        });
      }
    }

    if (status === 'CANCELLED') {
      if (reservation.roomId) {
        const room = await prisma.room.findUnique({ where: { id: reservation.roomId } });
        if (room?.status === 'RESERVED') {
          await prisma.room.update({
            where: { id: reservation.roomId },
            data: { status: 'AVAILABLE' },
          });
        }
      }
    }

    return prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { name: true, slug: true } },
        room: { select: { roomNumber: true, name: true } },
        sale: true,
      },
    });
  }

  async getSale(reservationId: string, hotelId: string) {
    const sale = await prisma.sale.findFirst({
      where: { reservationId, hotelId },
      include: {
        reservation: {
          include: {
            category: { select: { name: true, pricePerNight: true } },
            room: { select: { roomNumber: true, name: true } },
            guest: { select: { documentType: true, documentNumber: true, firstName: true, lastName: true } },
            productSales: { include: { product: { select: { name: true } } } },
          },
        },
        guest: { select: { documentType: true, documentNumber: true, firstName: true, lastName: true } },
      },
    });
    if (!sale) throw new Error('Venta no encontrada');

    // Include hotel fiscal data
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        name: true, logoUrl: true, ruc: true, businessName: true, fiscalAddress: true,
        phone: true, email: true,
      },
    });

    const res = sale.reservation;
    const nights = res
      ? Math.max(1, Math.ceil((new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      hotel: {
        name: hotel?.name,
        ruc: hotel?.ruc,
        razonSocial: hotel?.businessName,
        fiscalAddress: hotel?.fiscalAddress,
      },
      folio: {
        serie: sale.serie,
        folio: sale.folio,
      },
      guest: sale.guest || (res?.guest ? {
        firstName: res.guest.firstName,
        lastName: res.guest.lastName,
        documentType: res.guest.documentType,
        documentNumber: res.guest.documentNumber,
      } : undefined),
      room: res ? {
        roomNumber: res.room?.roomNumber,
        categoryName: res.category?.name,
        checkIn: res.checkIn.toISOString(),
        checkOut: res.checkOut.toISOString(),
        nights,
        pricePerNight: res.category?.pricePerNight || 0,
        subtotal: sale.subtotalRoom,
      } : undefined,
      products: res?.productSales?.map((ps: any) => ({
        name: ps.product?.name || 'Producto',
        quantity: ps.quantity,
        unitPrice: ps.unitPrice,
        total: ps.totalPrice,
      })) || [],
      totals: {
        subtotalRoom: sale.subtotalRoom,
        subtotalProducts: sale.subtotalProducts,
        total: sale.total,
      },
      emittedAt: sale.createdAt.toISOString(),
    };
  }

  async createWalkIn(hotelId: string, data: {
    categoryId: string; guestId?: string;
    guestFirstName: string; guestLastName: string;
    guestEmail: string; guestPhone?: string; checkOut: string;
    numberOfGuests: number; notes?: string;
    documentType?: string; documentNumber?: string; saveAsGuest?: boolean;
  }) {
    const category = await prisma.roomCategory.findFirst({
      where: { id: data.categoryId, hotelId },
    });
    if (!category) throw new Error('Categoría no encontrada');
    if (data.numberOfGuests > category.capacity) throw new Error('Número de huéspedes excede la capacidad');

    const checkIn = new Date();
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(data.checkOut);
    if (checkOut <= checkIn) throw new Error('Check-out debe ser posterior a hoy');

    const rooms = await prisma.room.findMany({
      where: { hotelId, categoryId: data.categoryId, status: 'AVAILABLE' },
      orderBy: { roomNumber: 'asc' },
    });

    const occupiedRoomIds = await prisma.reservation.findMany({
      where: {
        hotelId,
        roomId: { not: null },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { roomId: true },
    });
    const occupiedIds = new Set(occupiedRoomIds.map(r => r.roomId));
    const availableRoom = rooms.find(r => !occupiedIds.has(r.id));
    if (!availableRoom) throw new Error('No hay habitaciones disponibles para esta categoría');

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * category.pricePerNight;

    // Resolve guestId: save as guest if requested
    let resolvedGuestId = data.guestId || null;
    if (data.saveAsGuest && data.documentType && data.documentNumber) {
      const existing = await prisma.guest.findUnique({
        where: {
          hotelId_documentType_documentNumber: {
            hotelId,
            documentType: data.documentType as any,
            documentNumber: data.documentNumber,
          },
        },
      });
      if (existing) {
        await prisma.guest.update({
          where: { id: existing.id },
          data: {
            firstName: data.guestFirstName,
            lastName: data.guestLastName,
            email: data.guestEmail || existing.email,
            phone: data.guestPhone || existing.phone,
          },
        });
        resolvedGuestId = existing.id;
      } else {
        const guest = await prisma.guest.create({
          data: {
            hotelId,
            documentType: data.documentType as any,
            documentNumber: data.documentNumber,
            firstName: data.guestFirstName,
            lastName: data.guestLastName,
            email: data.guestEmail || null,
            phone: data.guestPhone || null,
          },
        });
        resolvedGuestId = guest.id;
      }
    }

    return prisma.$transaction(async (tx) => {
      await tx.room.update({
        where: { id: availableRoom.id },
        data: { status: 'OCCUPIED' },
      });

      return tx.reservation.create({
        data: {
          hotelId,
          categoryId: data.categoryId,
          roomId: availableRoom.id,
          guestId: resolvedGuestId,
          guestFirstName: data.guestFirstName,
          guestLastName: data.guestLastName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          checkIn,
          checkOut,
          numberOfGuests: data.numberOfGuests,
          totalPrice,
          notes: data.notes,
          status: 'CHECKED_IN',
          paymentStatus: 'PENDING',
        },
        include: {
          category: { select: { name: true, slug: true } },
          room: { select: { id: true, roomNumber: true, name: true } },
        },
      });
    });
  }

  async getCheckoutPreview(id: string, hotelId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId },
      include: {
        category: { select: { name: true, pricePerNight: true } },
        room: { select: { roomNumber: true, name: true } },
        productSales: { include: { product: { select: { name: true } } } },
      },
    });
    if (!reservation) throw new Error('Reserva no encontrada');
    if (reservation.status !== 'CHECKED_IN') throw new Error('Solo se puede hacer checkout de reservas con check-in');

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { earlyCheckoutPolicy: true, earlyCheckoutPenalty: true },
    });

    const checkIn = new Date(reservation.checkIn);
    const plannedCheckOut = new Date(reservation.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const plannedNights = Math.ceil((plannedCheckOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const actualNights = Math.max(1, Math.ceil((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    const isEarly = actualNights < plannedNights;
    const isLate = actualNights > plannedNights;
    const extraNights = Math.max(0, actualNights - plannedNights);
    const unusedNights = Math.max(0, plannedNights - actualNights);

    const pricePerNight = reservation.category?.pricePerNight || 0;
    const roomCharge = actualNights * pricePerNight;

    let penaltyAmount = 0;
    const policy = hotel?.earlyCheckoutPolicy || 'CHARGE_ACTUAL';
    const penaltyValue = hotel?.earlyCheckoutPenalty || 0;

    if (isEarly) {
      switch (policy) {
        case 'CHARGE_FULL':
          penaltyAmount = unusedNights * pricePerNight;
          break;
        case 'PENALTY_PERCENT':
          penaltyAmount = unusedNights * pricePerNight * (penaltyValue / 100);
          break;
        case 'PENALTY_FIXED':
          penaltyAmount = unusedNights * penaltyValue;
          break;
        case 'CHARGE_ACTUAL':
        default:
          penaltyAmount = 0;
          break;
      }
    }

    const extraNightsCharge = extraNights * pricePerNight;
    const subtotalRoom = roomCharge + penaltyAmount + extraNightsCharge;
    const subtotalProducts = reservation.productSales.reduce((sum, ps) => sum + ps.totalPrice, 0);
    const total = subtotalRoom + subtotalProducts;

    const products = reservation.productSales.map(ps => ({
      name: ps.product?.name || 'Desconocido',
      quantity: ps.quantity,
      unitPrice: ps.unitPrice,
      total: ps.totalPrice,
    }));

    return {
      reservationId: reservation.id,
      guest: {
        firstName: reservation.guestFirstName,
        lastName: reservation.guestLastName,
      },
      room: {
        roomNumber: reservation.room?.roomNumber,
        name: reservation.room?.name,
        categoryName: reservation.category?.name,
      },
      dates: {
        checkIn: reservation.checkIn,
        plannedCheckOut: reservation.checkOut,
        actualCheckOut: today,
      },
      nights: {
        planned: plannedNights,
        actual: actualNights,
        extra: extraNights,
        unused: unusedNights,
      },
      pricing: {
        pricePerNight,
        roomCharge,
        penaltyAmount,
        extraNightsCharge,
        subtotalRoom,
        subtotalProducts,
        total,
      },
      policy: {
        type: policy,
        value: penaltyValue,
      },
      isEarly,
      isLate,
      isOnTime: !isEarly && !isLate,
      products,
    };
  }

  async getExtensionAvailability(id: string, hotelId: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId },
      include: { category: { select: { pricePerNight: true } } },
    });
    if (!reservation) throw new Error('Reserva no encontrada');
    if (reservation.status !== 'CHECKED_IN') throw new Error('Solo se puede extender reservas con check-in activo');
    if (!reservation.roomId) throw new Error('La reserva no tiene habitación asignada');

    // Find next reservation on the same room
    const nextReservation = await prisma.reservation.findFirst({
      where: {
        roomId: reservation.roomId,
        id: { not: id },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { gte: reservation.checkOut },
      },
      orderBy: { checkIn: 'asc' },
      select: { checkIn: true },
    });

    return {
      currentCheckOut: reservation.checkOut,
      maxExtensionDate: nextReservation?.checkIn || null,
      pricePerNight: reservation.category?.pricePerNight || 0,
    };
  }

  async extendStay(id: string, hotelId: string, newCheckOut: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId },
      include: { category: { select: { pricePerNight: true } } },
    });
    if (!reservation) throw new Error('Reserva no encontrada');
    if (reservation.status !== 'CHECKED_IN') throw new Error('Solo se puede extender reservas con check-in activo');
    if (!reservation.roomId) throw new Error('La reserva no tiene habitación asignada');

    const newCheckOutDate = new Date(newCheckOut);
    const currentCheckOut = new Date(reservation.checkOut);
    if (newCheckOutDate <= currentCheckOut) throw new Error('La nueva fecha debe ser posterior al checkout actual');

    // Check for overlapping reservations on the same room in the extended period
    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId: reservation.roomId,
        id: { not: id },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        checkIn: { lt: newCheckOutDate },
        checkOut: { gt: currentCheckOut },
      },
      select: { checkIn: true },
    });

    if (conflict) {
      const maxDate = conflict.checkIn;
      throw new Error(`No hay disponibilidad. La habitación está reservada desde el ${maxDate.toISOString().split('T')[0]}. Máximo hasta esa fecha.`);
    }

    const checkIn = new Date(reservation.checkIn);
    const nights = Math.ceil((newCheckOutDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const pricePerNight = reservation.category?.pricePerNight || 0;
    const totalPrice = nights * pricePerNight;

    return prisma.reservation.update({
      where: { id },
      data: { checkOut: newCheckOutDate, totalPrice },
      include: {
        category: { select: { name: true, slug: true } },
        room: { select: { id: true, roomNumber: true, name: true } },
      },
    });
  }

  async delete(id: string, hotelId: string) {
    const reservation = await prisma.reservation.findFirst({ where: { id, hotelId } });
    if (!reservation) throw new Error('Reserva no encontrada');

    if (['CHECKED_IN'].includes(reservation.status)) {
      throw new Error('No se puede eliminar una reserva con check-in activo');
    }

    return prisma.reservation.delete({ where: { id } });
  }

  async checkIn(id: string, hotelId: string, guestData?: {
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    saveAsGuest?: boolean;
  }) {
    const reservation = await prisma.reservation.findFirst({ where: { id, hotelId } });
    if (!reservation) throw new Error('Reserva no encontrada');

    const validTransitions = VALID_RESERVATION_TRANSITIONS[reservation.status];
    if (!validTransitions?.includes('CHECKED_IN')) {
      throw new Error(`No se puede hacer check-in desde el estado ${reservation.status}`);
    }

    if (!reservation.roomId) {
      throw new Error('Debe asignar una habitación antes de hacer check-in');
    }

    const updateData: any = { status: 'CHECKED_IN' };

    // Update reservation guest info if document data provided
    if (guestData) {
      updateData.guestFirstName = guestData.firstName;
      updateData.guestLastName = guestData.lastName;
      if (guestData.email) updateData.guestEmail = guestData.email;
      if (guestData.phone) updateData.guestPhone = guestData.phone;

      // Optionally create/link guest record
      if (guestData.saveAsGuest) {
        const existing = await prisma.guest.findUnique({
          where: {
            hotelId_documentType_documentNumber: {
              hotelId,
              documentType: guestData.documentType as any,
              documentNumber: guestData.documentNumber,
            },
          },
        });

        if (existing) {
          // Update existing guest info
          await prisma.guest.update({
            where: { id: existing.id },
            data: {
              firstName: guestData.firstName,
              lastName: guestData.lastName,
              email: guestData.email || existing.email,
              phone: guestData.phone || existing.phone,
            },
          });
          updateData.guestId = existing.id;
        } else {
          const guest = await prisma.guest.create({
            data: {
              hotelId,
              documentType: guestData.documentType as any,
              documentNumber: guestData.documentNumber,
              firstName: guestData.firstName,
              lastName: guestData.lastName,
              email: guestData.email,
              phone: guestData.phone,
            },
          });
          updateData.guestId = guest.id;
        }
      }
    }

    await prisma.room.update({
      where: { id: reservation.roomId },
      data: { status: 'OCCUPIED' },
    });

    return prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { name: true, slug: true } },
        room: { select: { roomNumber: true, name: true } },
      },
    });
  }
}
