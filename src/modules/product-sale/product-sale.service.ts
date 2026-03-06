import { prisma } from '../../config';

export class ProductSaleService {
  async createSale(hotelId: string, data: {
    productId: string; roomId: string; reservationId?: string; quantity: number;
  }) {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, hotelId },
    });
    if (!product) throw new Error('Producto no encontrado');
    if (!product.isActive) throw new Error('El producto no está activo');
    if (product.stock < data.quantity) throw new Error('Stock insuficiente');

    const room = await prisma.room.findFirst({
      where: { id: data.roomId, hotelId },
    });
    if (!room) throw new Error('Habitación no encontrada');
    if (room.status !== 'OCCUPIED') throw new Error('La habitación no está ocupada');

    const totalPrice = product.price * data.quantity;

    return prisma.$transaction(async (tx) => {
      const sale = await tx.productSale.create({
        data: {
          hotelId,
          productId: data.productId,
          roomId: data.roomId,
          reservationId: data.reservationId || null,
          quantity: data.quantity,
          unitPrice: product.price,
          totalPrice,
        },
        include: {
          product: { select: { name: true } },
          room: { select: { roomNumber: true } },
        },
      });

      await tx.product.update({
        where: { id: data.productId },
        data: { stock: { decrement: data.quantity } },
      });

      return sale;
    });
  }

  async findAll(hotelId: string) {
    return prisma.productSale.findMany({
      where: { hotelId },
      include: {
        product: { select: { name: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByReservation(reservationId: string, hotelId: string) {
    return prisma.productSale.findMany({
      where: { reservationId, hotelId },
      include: {
        product: { select: { name: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSale(id: string, hotelId: string) {
    const sale = await prisma.productSale.findFirst({ where: { id, hotelId } });
    if (!sale) throw new Error('Venta no encontrada');

    return prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: sale.productId },
        data: { stock: { increment: sale.quantity } },
      });

      return tx.productSale.delete({ where: { id } });
    });
  }
}
