import { prisma } from '../../config';
import { VALID_ROOM_TRANSITIONS } from '../../shared';

export class RoomService {
  async findAll(hotelId: string) {
    return prisma.room.findMany({
      where: { hotelId },
      include: { category: true },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async findAllGroupedByCategory(hotelId: string) {
    const categories = await prisma.roomCategory.findMany({
      where: { hotelId, isActive: true },
      include: {
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: {
            reservations: {
              where: {
                status: { in: ['CHECKED_IN', 'CONFIRMED'] },
              },
              take: 1,
              orderBy: { checkIn: 'asc' },
              select: {
                id: true,
                guestFirstName: true,
                guestLastName: true,
                checkIn: true,
                checkOut: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return categories;
  }

  async findById(id: string, hotelId: string) {
    const room = await prisma.room.findFirst({
      where: { id, hotelId },
      include: {
        category: true,
        reservations: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } }, take: 5, orderBy: { checkIn: 'asc' } },
      },
    });
    if (!room) throw new Error('Habitación no encontrada');
    return room;
  }

  async create(hotelId: string, data: {
    roomNumber: string; name: string; categoryId: string; status?: string;
  }) {
    const existing = await prisma.room.findUnique({
      where: { hotelId_roomNumber: { hotelId, roomNumber: data.roomNumber } },
    });
    if (existing) throw new Error('Ya existe una habitación con ese número en este hotel');

    const category = await prisma.roomCategory.findFirst({
      where: { id: data.categoryId, hotelId },
    });
    if (!category) throw new Error('Categoría no encontrada en este hotel');

    return prisma.room.create({
      data: { ...data, hotelId } as any,
      include: { category: true },
    });
  }

  async update(id: string, hotelId: string, data: Record<string, any>) {
    const room = await prisma.room.findFirst({ where: { id, hotelId } });
    if (!room) throw new Error('Habitación no encontrada');

    if (data.roomNumber && data.roomNumber !== room.roomNumber) {
      const existing = await prisma.room.findUnique({
        where: { hotelId_roomNumber: { hotelId, roomNumber: data.roomNumber } },
      });
      if (existing) throw new Error('Ya existe una habitación con ese número en este hotel');
    }

    if (data.categoryId) {
      const category = await prisma.roomCategory.findFirst({
        where: { id: data.categoryId, hotelId },
      });
      if (!category) throw new Error('Categoría no encontrada en este hotel');
    }

    return prisma.room.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async updateStatus(id: string, hotelId: string, status: string) {
    const room = await prisma.room.findFirst({ where: { id, hotelId } });
    if (!room) throw new Error('Habitación no encontrada');

    const validTransitions = VALID_ROOM_TRANSITIONS[room.status];
    if (!validTransitions?.includes(status)) {
      throw new Error(`No se puede cambiar de ${room.status} a ${status}`);
    }

    const activeReservations = await prisma.reservation.count({
      where: { roomId: id, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
    });
    if (activeReservations > 0) {
      throw new Error('No se puede cambiar el estado de una habitación con reservas activas');
    }

    return prisma.room.update({ where: { id }, data: { status: status as any } });
  }

  async delete(id: string, hotelId: string) {
    const room = await prisma.room.findFirst({ where: { id, hotelId } });
    if (!room) throw new Error('Habitación no encontrada');

    const activeReservations = await prisma.reservation.count({
      where: { roomId: id, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
    });
    if (activeReservations > 0) throw new Error('No se puede eliminar una habitación con reservas activas');

    return prisma.room.delete({ where: { id } });
  }
}
