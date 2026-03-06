import { Request, Response } from 'express';
import { RoomCategoryService } from './room-category.service';
import { UploadService } from '../upload/upload.service';
import { success, error } from '../../utils/apiResponse';

const categoryService = new RoomCategoryService();

export class RoomCategoryController {
  async findAll(req: Request, res: Response) {
    try {
      const categories = await categoryService.findAll(req.hotelId!);
      await UploadService.resolveImageFieldsArray(categories);
      return success(res, categories);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const category = await categoryService.findById(req.params.id, req.hotelId!);
      await UploadService.resolveImageFields(category);
      return success(res, category);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const category = await categoryService.create(req.hotelId!, req.body);
      await UploadService.resolveImageFields(category);
      return success(res, category, 'Categoría creada exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const category = await categoryService.update(req.params.id, req.hotelId!, req.body);
      await UploadService.resolveImageFields(category);
      return success(res, category, 'Categoría actualizada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await categoryService.delete(req.params.id, req.hotelId!);
      return success(res, null, 'Categoría eliminada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
