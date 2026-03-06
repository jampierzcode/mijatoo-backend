import { Request, Response } from 'express';
import { RoomService } from './room.service';
import { success, error } from '../../utils/apiResponse';

const roomService = new RoomService();

export class RoomController {
  async findAll(req: Request, res: Response) {
    try {
      const rooms = await roomService.findAll(req.hotelId!);
      return success(res, rooms);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findAllGrouped(req: Request, res: Response) {
    try {
      const categories = await roomService.findAllGroupedByCategory(req.hotelId!);
      return success(res, categories);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const room = await roomService.findById(req.params.id, req.hotelId!);
      return success(res, room);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const room = await roomService.create(req.hotelId!, req.body);
      return success(res, room, 'Habitación creada exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const room = await roomService.update(req.params.id, req.hotelId!, req.body);
      return success(res, room, 'Habitación actualizada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const room = await roomService.updateStatus(req.params.id, req.hotelId!, req.body.status);
      return success(res, room, 'Estado actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await roomService.delete(req.params.id, req.hotelId!);
      return success(res, null, 'Habitación eliminada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
