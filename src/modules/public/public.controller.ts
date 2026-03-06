import { Request, Response } from 'express';
import { PublicService } from './public.service';
import { UploadService } from '../upload/upload.service';
import { PlanService } from '../plan/plan.service';
import { DemoRequestService } from '../demo-request/demo-request.service';
import { success, error } from '../../utils/apiResponse';

const publicService = new PublicService();
const planService = new PlanService();
const demoRequestService = new DemoRequestService();

export class PublicController {
  async listHotels(_req: Request, res: Response) {
    try {
      const hotels = await publicService.listActiveHotels();
      return success(res, hotels);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getPlans(_req: Request, res: Response) {
    try {
      const plans = await planService.findActivePlansWithPrices();
      return success(res, plans);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async createDemoRequest(req: Request, res: Response) {
    try {
      const request = await demoRequestService.create(req.body);
      return success(res, request, 'Solicitud de demo enviada exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getHotel(req: Request, res: Response) {
    try {
      const hotel = await publicService.getHotelBySlug(req.params.slug);
      await UploadService.resolveImageFields(hotel);
      return success(res, hotel);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const categories = await publicService.getCategoriesByHotelSlug(req.params.slug);
      await UploadService.resolveImageFieldsArray(categories);
      return success(res, categories);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async getAvailability(req: Request, res: Response) {
    try {
      const { checkIn, checkOut } = req.query;
      if (!checkIn || !checkOut) {
        return error(res, 'checkIn y checkOut son requeridos', 400);
      }
      const categories = await publicService.getAvailabilityByCategory(
        req.params.slug,
        checkIn as string,
        checkOut as string,
      );
      await UploadService.resolveImageFieldsArray(categories);
      return success(res, categories);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async getCategory(req: Request, res: Response) {
    try {
      const category = await publicService.getCategoryBySlug(
        req.params.slug,
        req.params.categorySlug,
      );
      await UploadService.resolveImageFields(category);
      return success(res, category);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async getAvailableRooms(req: Request, res: Response) {
    try {
      const { checkIn, checkOut, categoryId } = req.query;
      const rooms = await publicService.getAvailableRooms(
        req.params.slug,
        checkIn as string,
        checkOut as string,
        categoryId as string,
      );
      await UploadService.resolveImageFieldsArray(rooms);
      return success(res, rooms);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async getRoom(req: Request, res: Response) {
    try {
      const room = await publicService.getRoomBySlugAndId(req.params.slug, req.params.roomId);
      await UploadService.resolveImageFields(room);
      return success(res, room);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async getReviews(req: Request, res: Response) {
    try {
      const result = await publicService.getReviewsByCategorySlug(
        req.params.slug,
        req.params.categorySlug,
      );
      return success(res, result);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async createReservation(req: Request, res: Response) {
    try {
      const reservation = await publicService.createPublicReservation(req.params.slug, req.body);
      return success(res, reservation, 'Reserva creada exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
