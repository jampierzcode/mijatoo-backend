import { Request, Response } from 'express';
import { ReservationService } from './reservation.service';
import { success, error } from '../../utils/apiResponse';

const reservationService = new ReservationService();

export class ReservationController {
  async findAll(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;
      const reservations = await reservationService.findAll(req.hotelId!, status);
      return success(res, reservations);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const reservation = await reservationService.findById(req.params.id, req.hotelId!);
      return success(res, reservation);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const reservation = await reservationService.create(req.hotelId!, req.body);
      return success(res, reservation, 'Reserva creada exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async assignRoom(req: Request, res: Response) {
    try {
      const reservation = await reservationService.assignRoom(req.params.id, req.hotelId!, req.body.roomId);
      return success(res, reservation, 'Habitación asignada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async suggestRoom(req: Request, res: Response) {
    try {
      const room = await reservationService.suggestRoom(req.params.id, req.hotelId!);
      return success(res, room);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getAvailableRooms(req: Request, res: Response) {
    try {
      const rooms = await reservationService.getAvailableRoomsForReservation(req.params.id, req.hotelId!);
      return success(res, rooms);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async reassignRoom(req: Request, res: Response) {
    try {
      const reservation = await reservationService.reassignRoom(req.params.id, req.hotelId!, req.body.roomId);
      return success(res, reservation, 'Habitación reasignada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const reservation = await reservationService.updateStatus(req.params.id, req.hotelId!, req.body.status);
      return success(res, reservation, 'Estado actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async checkIn(req: Request, res: Response) {
    try {
      const reservation = await reservationService.checkIn(req.params.id, req.hotelId!, req.body.guestData);
      return success(res, reservation, 'Check-in realizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getSale(req: Request, res: Response) {
    try {
      const sale = await reservationService.getSale(req.params.id, req.hotelId!);
      return success(res, sale);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async getCheckoutPreview(req: Request, res: Response) {
    try {
      const preview = await reservationService.getCheckoutPreview(req.params.id, req.hotelId!);
      return success(res, preview);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getExtensionAvailability(req: Request, res: Response) {
    try {
      const data = await reservationService.getExtensionAvailability(req.params.id, req.hotelId!);
      return success(res, data);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async extendStay(req: Request, res: Response) {
    try {
      const reservation = await reservationService.extendStay(req.params.id, req.hotelId!, req.body.newCheckOut);
      return success(res, reservation, 'Estadia extendida exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async createWalkIn(req: Request, res: Response) {
    try {
      const reservation = await reservationService.createWalkIn(req.hotelId!, req.body);
      return success(res, reservation, 'Walk-in registrado exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await reservationService.delete(req.params.id, req.hotelId!);
      return success(res, null, 'Reserva eliminada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
