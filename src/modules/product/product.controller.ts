import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { UploadService } from '../upload/upload.service';
import { success, error } from '../../utils/apiResponse';

const service = new ProductService();

export class ProductController {
  async findAll(req: Request, res: Response) {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const products = await service.findAll(req.hotelId!, categoryId);
      for (const p of products) {
        if ((p as any).imageUrl) {
          (p as any).imageUrl = await UploadService.resolveUrl((p as any).imageUrl);
        }
      }
      return success(res, products);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const product = await service.findById(req.params.id, req.hotelId!);
      if ((product as any).imageUrl) {
        (product as any).imageUrl = await UploadService.resolveUrl((product as any).imageUrl);
      }
      return success(res, product);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const product = await service.create(req.hotelId!, req.body);
      return success(res, product, 'Producto creado exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const product = await service.update(req.params.id, req.hotelId!, req.body);
      return success(res, product, 'Producto actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await service.delete(req.params.id, req.hotelId!);
      return success(res, null, 'Producto eliminado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
