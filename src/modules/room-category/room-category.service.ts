import { prisma } from '../../config';
import { UploadService } from '../upload/upload.service';

export class RoomCategoryService {
  async findAll(hotelId: string) {
    return prisma.roomCategory.findMany({
      where: { hotelId },
      include: { _count: { select: { rooms: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, hotelId: string) {
    const category = await prisma.roomCategory.findFirst({
      where: { id, hotelId },
      include: { rooms: { orderBy: { roomNumber: 'asc' } } },
    });
    if (!category) throw new Error('Categoría no encontrada');
    return category;
  }

  async create(hotelId: string, data: {
    name: string; slug: string; description?: string;
    capacity: number; pricePerNight: number; amenities?: string[];
    coverImageUrl?: string; galleryImages?: string[]; isActive?: boolean;
  }) {
    const existing = await prisma.roomCategory.findUnique({
      where: { hotelId_slug: { hotelId, slug: data.slug } },
    });
    if (existing) throw new Error('Ya existe una categoría con ese slug en este hotel');

    return prisma.roomCategory.create({
      data: {
        ...data,
        hotelId,
        coverImageUrl: UploadService.normalizeForStorage(data.coverImageUrl),
        galleryImages: UploadService.normalizeArrayForStorage(data.galleryImages) || [],
      },
    });
  }

  async update(id: string, hotelId: string, data: Record<string, any>) {
    const category = await prisma.roomCategory.findFirst({ where: { id, hotelId } });
    if (!category) throw new Error('Categoría no encontrada');

    if (data.slug && data.slug !== category.slug) {
      const existing = await prisma.roomCategory.findUnique({
        where: { hotelId_slug: { hotelId, slug: data.slug } },
      });
      if (existing) throw new Error('Ya existe una categoría con ese slug en este hotel');
    }

    // Clean up old cover image from S3 if it changed
    if (data.coverImageUrl !== undefined) {
      const oldKey = category.coverImageUrl;
      const newKey = UploadService.normalizeForStorage(data.coverImageUrl);
      if (oldKey && oldKey !== newKey) {
        UploadService.deleteFile(oldKey).catch(() => {});
      }
      data.coverImageUrl = newKey;
    }

    // Clean up removed gallery images from S3
    if (data.galleryImages) {
      const newKeys = UploadService.normalizeArrayForStorage(data.galleryImages) || [];
      const oldKeys = category.galleryImages || [];
      const newKeysSet = new Set(newKeys);
      const removedKeys = oldKeys.filter(k => !newKeysSet.has(k));
      if (removedKeys.length > 0) {
        UploadService.deleteFiles(removedKeys).catch(() => {});
      }
      data.galleryImages = newKeys;
    }

    return prisma.roomCategory.update({ where: { id }, data });
  }

  async delete(id: string, hotelId: string) {
    const category = await prisma.roomCategory.findFirst({ where: { id, hotelId } });
    if (!category) throw new Error('Categoría no encontrada');

    const roomCount = await prisma.room.count({ where: { categoryId: id } });
    if (roomCount > 0) throw new Error('No se puede eliminar una categoría que tiene habitaciones asignadas');

    return prisma.roomCategory.delete({ where: { id } });
  }
}
