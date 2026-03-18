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
      const docQuery = (req.query.document || req.query.documentNumber) as string;
      const nameQuery = req.query.name as string;
      if (!docQuery && !nameQuery) return success(res, []);
      let guests;
      if (docQuery) {
        guests = await guestService.searchByDocument(req.hotelId!, docQuery);
      } else {
        guests = await guestService.searchByName(req.hotelId!, nameQuery);
      }
      return success(res, guests);
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
