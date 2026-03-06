import { prisma } from '../../config';

export class DemoRequestService {
  async findAll(status?: string) {
    return prisma.demoRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const request = await prisma.demoRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Solicitud no encontrada');
    return request;
  }

  async create(data: {
    businessName: string; contactName: string; email: string;
    phone?: string; city?: string; numberOfRooms?: number; message?: string;
  }) {
    return prisma.demoRequest.create({ data });
  }

  async updateStatus(id: string, status: string) {
    const request = await prisma.demoRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Solicitud no encontrada');
    return prisma.demoRequest.update({
      where: { id },
      data: { status: status as any },
    });
  }
}
