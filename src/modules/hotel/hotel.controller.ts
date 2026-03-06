import { Request, Response } from 'express';
import { HotelService } from './hotel.service';
import { UploadService } from '../upload/upload.service';
import { success, error } from '../../utils/apiResponse';

const hotelService = new HotelService();

export class HotelController {
  async findAll(_req: Request, res: Response) {
    try {
      const hotels = await hotelService.findAll();
      await UploadService.resolveImageFieldsArray(hotels);
      return success(res, hotels);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const hotel = await hotelService.findById(req.params.id);
      await UploadService.resolveImageFields(hotel);
      return success(res, hotel);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const hotel = await hotelService.create(req.body);
      await UploadService.resolveImageFields(hotel);
      return success(res, hotel, 'Hotel creado exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const hotel = await hotelService.update(req.params.id, req.body);
      await UploadService.resolveImageFields(hotel);
      return success(res, hotel, 'Hotel actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const hotelId = req.hotelId || req.params.id;
      if (!hotelId) return error(res, 'Hotel ID requerido', 400);
      const settings = await hotelService.updateSettings(hotelId, req.body);
      // Resolve image URLs for response
      if (settings.logoUrl) {
        (settings as any).logoUrl = await UploadService.resolveUrl(settings.logoUrl);
      }
      if (settings.coverImageUrl) {
        (settings as any).coverImageUrl = await UploadService.resolveUrl(settings.coverImageUrl);
      }
      return success(res, settings, 'Configuración actualizada');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getSettings(req: Request, res: Response) {
    try {
      const hotelId = req.hotelId;
      if (!hotelId) return error(res, 'Hotel ID requerido', 400);
      const settings = await hotelService.getSettings(hotelId);
      // Resolve image URLs
      if (settings.logoUrl) {
        (settings as any).logoUrl = await UploadService.resolveUrl(settings.logoUrl);
      }
      if (settings.coverImageUrl) {
        (settings as any).coverImageUrl = await UploadService.resolveUrl(settings.coverImageUrl);
      }
      return success(res, settings);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async assignAdmin(req: Request, res: Response) {
    try {
      const admin = await hotelService.assignAdmin(req.params.id, req.body);
      return success(res, admin, 'Admin asignado exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async removeAdmin(req: Request, res: Response) {
    try {
      const result = await hotelService.removeAdmin(req.params.id, req.params.userId);
      return success(res, result, 'Admin removido exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async updateAdminEmail(req: Request, res: Response) {
    try {
      const result = await hotelService.updateAdminEmail(req.params.id, req.params.userId, req.body.email);
      return success(res, result, 'Email actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
