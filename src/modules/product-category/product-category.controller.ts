import { Request, Response } from 'express';
import { ProductCategoryService } from './product-category.service';
import { UploadService } from '../upload/upload.service';
import { success, error } from '../../utils/apiResponse';

const service = new ProductCategoryService();

export class ProductCategoryController {
  async findAll(req: Request, res: Response) {
    try {
      const categories = await service.findAll(req.hotelId!);
      for (const cat of categories) {
        if ((cat as any).imageUrl) {
          (cat as any).imageUrl = await UploadService.resolveUrl((cat as any).imageUrl);
        }
      }
      return success(res, categories);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const category = await service.findById(req.params.id, req.hotelId!);
      if ((category as any).imageUrl) {
        (category as any).imageUrl = await UploadService.resolveUrl((category as any).imageUrl);
      }
      return success(res, category);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const category = await service.create(req.hotelId!, req.body);
      return success(res, category, 'Categoría creada exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const category = await service.update(req.params.id, req.hotelId!, req.body);
      return success(res, category, 'Categoría actualizada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await service.delete(req.params.id, req.hotelId!);
      return success(res, null, 'Categoría eliminada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
