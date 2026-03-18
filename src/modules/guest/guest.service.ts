import { prisma } from '../../config';

export class GuestService {
  async findAll(hotelId: string) {
    return prisma.guest.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, hotelId: string) {
    const guest = await prisma.guest.findFirst({ where: { id, hotelId } });
    if (!guest) throw new Error('Cliente no encontrado');
    return guest;
  }

  async create(hotelId: string, data: {
    documentType: string; documentNumber: string;
    firstName: string; lastName: string;
    email?: string; phone?: string;
  }) {
    const existing = await prisma.guest.findUnique({
      where: {
        hotelId_documentType_documentNumber: {
          hotelId,
          documentType: data.documentType as any,
          documentNumber: data.documentNumber,
        },
      },
    });
    if (existing) throw new Error('Ya existe un cliente con ese documento');

    return prisma.guest.create({
      data: {
        hotelId,
        documentType: data.documentType as any,
        documentNumber: data.documentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
      },
    });
  }

  async update(id: string, hotelId: string, data: Record<string, any>) {
    const guest = await prisma.guest.findFirst({ where: { id, hotelId } });
    if (!guest) throw new Error('Cliente no encontrado');

    if (data.documentType && data.documentNumber) {
      if (data.documentType !== guest.documentType || data.documentNumber !== guest.documentNumber) {
        const existing = await prisma.guest.findUnique({
          where: {
            hotelId_documentType_documentNumber: {
              hotelId,
              documentType: data.documentType,
              documentNumber: data.documentNumber,
            },
          },
        });
        if (existing && existing.id !== id) throw new Error('Ya existe un cliente con ese documento');
      }
    }

    return prisma.guest.update({ where: { id }, data });
  }

  async delete(id: string, hotelId: string) {
    const guest = await prisma.guest.findFirst({ where: { id, hotelId } });
    if (!guest) throw new Error('Cliente no encontrado');
    return prisma.guest.delete({ where: { id } });
  }

  async searchByDocument(hotelId: string, query: string) {
    return prisma.guest.findMany({
      where: {
        hotelId,
        documentNumber: { contains: query, mode: 'insensitive' },
      },
      take: 10,
    });
  }

  async searchByName(hotelId: string, query: string) {
    const terms = query.trim().split(/\s+/);
    return prisma.guest.findMany({
      where: {
        hotelId,
        AND: terms.map(term => ({
          OR: [
            { firstName: { contains: term, mode: 'insensitive' as const } },
            { lastName: { contains: term, mode: 'insensitive' as const } },
            { email: { contains: term, mode: 'insensitive' as const } },
          ],
        })),
      },
      take: 10,
    });
  }
}
