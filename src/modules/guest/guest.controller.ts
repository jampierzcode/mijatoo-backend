import { Request, Response } from 'express';
import { GuestService } from './guest.service';
import { success, error } from '../../utils/apiResponse';

const guestService = new GuestService();

export class GuestController {
  async findAll(req: Request, res: Response) {
    try {
      const guests = await guestService.findAll(req.hotelId!);
      return success(res, guests);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const guest = await guestService.findById(req.params.id, req.hotelId!);
      return success(res, guest);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const guest = await guestService.create(req.hotelId!, req.body);
      return success(res, guest, 'Cliente creado exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const guest = await guestService.update(req.params.id, req.hotelId!, req.body);
      return success(res, guest, 'Cliente actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await guestService.delete(req.params.id, req.hotelId!);
      return success(res, null, 'Cliente eliminado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async search(req: Request, res: Response) {
    try {
      const query = req.query.document as string;
      if (!query) return success(res, []);
      const guests = await guestService.searchByDocument(req.hotelId!, query);
      return success(res, guests);
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
