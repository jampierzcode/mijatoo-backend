import { prisma } from '../../config';

export class NotificationService {
  async findAll(hotelId: string, limit = 50, unreadOnly = false) {
    const where: any = { hotelId };
    if (unreadOnly) where.isRead = false;
    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(hotelId: string) {
    return prisma.notification.count({
      where: { hotelId, isRead: false },
    });
  }

  async create(data: {
    hotelId: string;
    type: 'NEW_RESERVATION' | 'RESERVATION_CANCELLED' | 'RESERVATION_CHECKED_IN' | 'RESERVATION_CHECKED_OUT';
    title: string;
    message: string;
    data?: any;
  }) {
    return prisma.notification.create({ data });
  }

  async markAsRead(id: string, hotelId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, hotelId },
    });
    if (!notification) throw new Error('Notificación no encontrada');
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(hotelId: string) {
    return prisma.notification.updateMany({
      where: { hotelId, isRead: false },
      data: { isRead: true },
    });
  }
}
