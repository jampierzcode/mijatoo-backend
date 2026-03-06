import { prisma } from '../../config';
import { UploadService } from '../upload/upload.service';

export class ProductCategoryService {
  async findAll(hotelId: string) {
    return prisma.productCategory.findMany({
      where: { hotelId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, hotelId: string) {
    const category = await prisma.productCategory.findFirst({
      where: { id, hotelId },
      include: { products: { orderBy: { name: 'asc' } } },
    });
    if (!category) throw new Error('Categoría de producto no encontrada');
    return category;
  }

  async create(hotelId: string, data: {
    name: string; description?: string; imageUrl?: string; isActive?: boolean;
  }) {
    return prisma.productCategory.create({
      data: {
        hotelId,
        name: data.name,
        description: data.description,
        imageUrl: UploadService.normalizeForStorage(data.imageUrl),
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, hotelId: string, data: Record<string, any>) {
    const category = await prisma.productCategory.findFirst({ where: { id, hotelId } });
    if (!category) throw new Error('Categoría de producto no encontrada');

    if (data.imageUrl !== undefined) {
      data.imageUrl = UploadService.normalizeForStorage(data.imageUrl);
    }

    return prisma.productCategory.update({ where: { id }, data });
  }

  async delete(id: string, hotelId: string) {
    const category = await prisma.productCategory.findFirst({ where: { id, hotelId } });
    if (!category) throw new Error('Categoría de producto no encontrada');

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) throw new Error('No se puede eliminar una categoría que tiene productos');

    return prisma.productCategory.delete({ where: { id } });
  }
}
