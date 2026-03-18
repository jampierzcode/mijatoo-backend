import { prisma } from '../../config';
import { hashPassword } from '../../utils';
import { UploadService } from '../upload/upload.service';

export class HotelService {
  async findAll() {
    return prisma.hotel.findMany({
      include: { _count: { select: { rooms: true, users: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        _count: { select: { rooms: true, reservations: true } },
      },
    });
    if (!hotel) throw new Error('Hotel no encontrado');
    return hotel;
  }

  async create(data: {
    name: string; slug: string; description?: string; address: string;
    city: string; country: string; phone?: string; email?: string;
    logoUrl?: string; coverImageUrl?: string;
  }) {
    const existing = await prisma.hotel.findUnique({ where: { slug: data.slug } });
    if (existing) throw new Error('El slug ya está en uso');

    if (data.coverImageUrl) data.coverImageUrl = UploadService.normalizeForStorage(data.coverImageUrl);
    if (data.logoUrl) data.logoUrl = UploadService.normalizeForStorage(data.logoUrl);

    const result = await prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({ data });
      await tx.subscription.create({
        data: {
          hotelId: hotel.id,
          status: 'PENDING_PAYMENT',
          totalPrice: 0,
          paidAmount: 0,
        },
      });
      return hotel;
    });

    return result;
  }

  async update(id: string, data: Record<string, any>) {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) throw new Error('Hotel no encontrado');

    if (data.slug && data.slug !== hotel.slug) {
      const existing = await prisma.hotel.findUnique({ where: { slug: data.slug } });
      if (existing) throw new Error('El slug ya está en uso');
    }

    if (data.coverImageUrl) data.coverImageUrl = UploadService.normalizeForStorage(data.coverImageUrl);
    if (data.logoUrl) data.logoUrl = UploadService.normalizeForStorage(data.logoUrl);

    return prisma.hotel.update({ where: { id }, data });
  }

  async updateSettings(hotelId: string, data: Record<string, any>) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new Error('Hotel no encontrado');

    const updateData: Record<string, any> = {};

    // Basic info
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;

    // Images
    if (data.logoUrl !== undefined) {
      updateData.logoUrl = data.logoUrl ? UploadService.normalizeForStorage(data.logoUrl) : null;
    }
    if (data.coverImageUrl !== undefined) {
      updateData.coverImageUrl = data.coverImageUrl ? UploadService.normalizeForStorage(data.coverImageUrl) : null;
    }

    // Fiscal data
    if (data.ruc !== undefined) updateData.ruc = data.ruc;
    if (data.businessName !== undefined) updateData.businessName = data.businessName;
    if (data.fiscalAddress !== undefined) updateData.fiscalAddress = data.fiscalAddress;

    // Billing
    if (data.serieBoleta !== undefined) updateData.serieBoleta = data.serieBoleta;

    // Schedules
    if (data.checkInFrom !== undefined) updateData.checkInFrom = data.checkInFrom ?? hotel.checkInFrom;
    if (data.checkInUntil !== undefined) updateData.checkInUntil = data.checkInUntil ?? hotel.checkInUntil;
    if (data.checkOutUntil !== undefined) updateData.checkOutUntil = data.checkOutUntil ?? hotel.checkOutUntil;

    // Policies
    if (data.earlyCheckoutPolicy !== undefined) updateData.earlyCheckoutPolicy = data.earlyCheckoutPolicy;
    if (data.earlyCheckoutPenalty !== undefined) updateData.earlyCheckoutPenalty = Number(data.earlyCheckoutPenalty);

    // Culqi keys
    if (data.culqiPublicKey !== undefined) updateData.culqiPublicKey = data.culqiPublicKey || null;
    if (data.culqiSecretKey !== undefined) updateData.culqiSecretKey = data.culqiSecretKey || null;

    return prisma.hotel.update({
      where: { id: hotelId },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        city: true,
        country: true,
        phone: true,
        email: true,
        logoUrl: true,
        coverImageUrl: true,
        ruc: true,
        businessName: true,
        fiscalAddress: true,
        serieBoleta: true,
        nextFolio: true,
        checkInFrom: true,
        checkInUntil: true,
        checkOutUntil: true,
        earlyCheckoutPolicy: true,
        earlyCheckoutPenalty: true,
        culqiPublicKey: true,
        culqiSecretKey: true,
      },
    });
  }

  async getSettings(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        city: true,
        country: true,
        phone: true,
        email: true,
        logoUrl: true,
        coverImageUrl: true,
        ruc: true,
        businessName: true,
        fiscalAddress: true,
        serieBoleta: true,
        nextFolio: true,
        checkInFrom: true,
        checkInUntil: true,
        checkOutUntil: true,
        earlyCheckoutPolicy: true,
        earlyCheckoutPenalty: true,
        culqiPublicKey: true,
        culqiSecretKey: true,
      },
    });
    if (!hotel) throw new Error('Hotel no encontrado');
    return hotel;
  }

  async assignAdmin(hotelId: string, data: { email: string; firstName: string; lastName: string; password: string }) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new Error('Hotel no encontrado');

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('El email ya está registrado');

    const hashedPassword = await hashPassword(data.password);
    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'HOTEL_ADMIN',
        hotelId,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, hotelId: true },
    });
  }

  async toggleActive(id: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) throw new Error('Hotel no encontrado');

    return prisma.hotel.update({
      where: { id },
      data: { isActive: !hotel.isActive },
    });
  }

  async delete(id: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) throw new Error('Hotel no encontrado');

    // Delete all related data in correct order (FK constraints)
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { hotelId: id } });
      await tx.review.deleteMany({ where: { hotelId: id } });
      await tx.productSale.deleteMany({ where: { hotelId: id } });
      await tx.sale.deleteMany({ where: { hotelId: id } });
      await tx.reservation.deleteMany({ where: { hotelId: id } });
      await tx.product.deleteMany({ where: { hotelId: id } });
      await tx.productCategory.deleteMany({ where: { hotelId: id } });
      await tx.room.deleteMany({ where: { hotelId: id } });
      await tx.roomCategory.deleteMany({ where: { hotelId: id } });
      await tx.guest.deleteMany({ where: { hotelId: id } });
      await tx.subscriptionPayment.deleteMany({ where: { subscription: { hotelId: id } } });
      await tx.subscription.deleteMany({ where: { hotelId: id } });
      await tx.user.deleteMany({ where: { hotelId: id } });
      await tx.hotel.delete({ where: { id } });
    });

    return { message: 'Hotel eliminado exitosamente' };
  }

  async removeAdmin(hotelId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, hotelId, role: 'HOTEL_ADMIN' },
    });
    if (!user) throw new Error('Admin no encontrado en este hotel');

    return prisma.user.update({
      where: { id: userId },
      data: { role: 'GUEST', hotelId: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }

  async updateAdminEmail(hotelId: string, userId: string, email: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, hotelId, role: 'HOTEL_ADMIN' },
    });
    if (!user) throw new Error('Admin no encontrado en este hotel');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) throw new Error('El email ya está registrado');

    return prisma.user.update({
      where: { id: userId },
      data: { email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }
}
