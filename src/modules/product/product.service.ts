import { prisma } from '../../config';
import { UploadService } from '../upload/upload.service';

export class ProductService {
  async findAll(hotelId: string, categoryId?: string) {
    const where: any = { hotelId };
    if (categoryId) where.categoryId = categoryId;
    return prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, hotelId: string) {
    const product = await prisma.product.findFirst({
      where: { id, hotelId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new Error('Producto no encontrado');
    return product;
  }

  async create(hotelId: string, data: {
    categoryId: string; name: string; description?: string;
    price: number; imageUrl?: string; stock: number; isActive?: boolean;
  }) {
    const category = await prisma.productCategory.findFirst({
      where: { id: data.categoryId, hotelId },
    });
    if (!category) throw new Error('Categoría de producto no encontrada');

    return prisma.product.create({
      data: {
        hotelId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        imageUrl: UploadService.normalizeForStorage(data.imageUrl),
        stock: data.stock,
        isActive: data.isActive ?? true,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, hotelId: string, data: Record<string, any>) {
    const product = await prisma.product.findFirst({ where: { id, hotelId } });
    if (!product) throw new Error('Producto no encontrado');

    if (data.categoryId) {
      const category = await prisma.productCategory.findFirst({
        where: { id: data.categoryId, hotelId },
      });
      if (!category) throw new Error('Categoría de producto no encontrada');
    }

    if (data.imageUrl !== undefined) {
      data.imageUrl = UploadService.normalizeForStorage(data.imageUrl);
    }

    return prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async delete(id: string, hotelId: string) {
    const product = await prisma.product.findFirst({ where: { id, hotelId } });
    if (!product) throw new Error('Producto no encontrado');
    return prisma.product.delete({ where: { id } });
  }
}
