import { Request, Response } from 'express';
import { ProductSaleService } from './product-sale.service';
import { success, error } from '../../utils/apiResponse';

const service = new ProductSaleService();

export class ProductSaleController {
  async createSale(req: Request, res: Response) {
    try {
      const sale = await service.createSale(req.hotelId!, req.body);
      return success(res, sale, 'Venta registrada exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const sales = await service.findAll(req.hotelId!);
      return success(res, sales);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findByReservation(req: Request, res: Response) {
    try {
      const sales = await service.findByReservation(req.params.reservationId, req.hotelId!);
      return success(res, sales);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async deleteSale(req: Request, res: Response) {
    try {
      await service.deleteSale(req.params.id, req.hotelId!);
      return success(res, null, 'Venta eliminada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
