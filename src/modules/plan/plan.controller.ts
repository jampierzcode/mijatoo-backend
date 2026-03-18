import { Request, Response } from 'express';
import { PlanService } from './plan.service';
import { success, error } from '../../utils/apiResponse';

const planService = new PlanService();

export class PlanController {
  async findAll(_req: Request, res: Response) {
    try {
      const plans = await planService.findAll();
      return success(res, plans);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const plan = await planService.findById(req.params.id);
      return success(res, plan);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const plan = await planService.create(req.body);
      return success(res, plan, 'Plan creado exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const plan = await planService.update(req.params.id, req.body);
      return success(res, plan, 'Plan actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await planService.delete(req.params.id);
      return success(res, null, 'Plan eliminado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async createPrice(req: Request, res: Response) {
    try {
      const price = await planService.createPrice(req.params.id, req.body);
      return success(res, price, 'Precio creado exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async updatePrice(req: Request, res: Response) {
    try {
      const price = await planService.updatePrice(req.params.id, req.params.priceId, req.body);
      return success(res, price, 'Precio actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async deletePrice(req: Request, res: Response) {
    try {
      await planService.deletePrice(req.params.id, req.params.priceId);
      return success(res, null, 'Precio eliminado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async syncCulqi(_req: Request, res: Response) {
    try {
      const results = await planService.syncAllPricesToCulqi();
      return success(res, results, `${results.length} precios sincronizados con Culqi`);
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
