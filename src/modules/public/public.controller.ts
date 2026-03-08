import { Request, Response } from 'express';
import { PublicService } from './public.service';
import { UploadService } from '../upload/upload.service';
import { PlanService } from '../plan/plan.service';
import { DemoRequestService } from '../demo-request/demo-request.service';
import { EmailService } from '../email/email.service';
import { HotelService } from '../hotel/hotel.service';
import { success, error, hashPassword } from '../../utils';
import { prisma } from '../../config';
import { TRIAL_DAYS } from '../../shared';

const publicService = new PublicService();
const planService = new PlanService();
const demoRequestService = new DemoRequestService();
const emailService = new EmailService();

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

      // Send confirmation email to client + notification to admin
      emailService.sendDemoRequestConfirmation(req.body).catch((err) => {
        console.error('[DemoRequest] Failed to send confirmation email:', err?.message || err);
      });
      emailService.sendDemoRequestNotification(req.body).catch((err) => {
        console.error('[DemoRequest] Failed to send admin notification:', err?.message || err);
      });

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

  async register(req: Request, res: Response) {
    try {
      const { hotelName, slug, address, city, phone, firstName, lastName, email, password } = req.body;

      // Check email uniqueness
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return error(res, 'Ya existe una cuenta con este email', 409);
      }

      // Check slug uniqueness
      const existingHotel = await prisma.hotel.findUnique({ where: { slug } });
      if (existingHotel) {
        return error(res, 'Este slug ya esta en uso. Prueba con otro nombre para tu URL.', 409);
      }

      const hashedPassword = await hashPassword(password);
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

      // Create hotel + subscription + admin user in a single transaction
      const result = await prisma.$transaction(async (tx) => {
        const hotel = await tx.hotel.create({
          data: {
            name: hotelName,
            slug,
            address,
            city,
            country: 'Peru',
            phone: phone || null,
            email,
          },
        });

        await tx.subscription.create({
          data: {
            hotelId: hotel.id,
            status: 'TRIALING',
            trialStartDate: now,
            trialEndDate: trialEnd,
          },
        });

        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone: phone || null,
            role: 'HOTEL_ADMIN',
            hotelId: hotel.id,
          },
        });

        return { hotel, user };
      });

      // Send welcome email async
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      emailService.sendWelcomeEmail({
        firstName,
        email,
        hotelName,
        loginUrl: `${loginUrl}/login`,
      }).catch((err) => {
        console.error('[Register] Failed to send welcome email:', err?.message || err);
      });

      // Also notify admin about new registration
      emailService.sendDemoRequestNotification({
        businessName: hotelName,
        contactName: `${firstName} ${lastName}`,
        email,
        phone: phone || undefined,
        city,
      }).catch((err) => {
        console.error('[Register] Failed to send admin notification:', err?.message || err);
      });

      return success(res, {
        hotel: { id: result.hotel.id, name: result.hotel.name, slug: result.hotel.slug },
        user: { id: result.user.id, email: result.user.email, firstName: result.user.firstName },
      }, 'Registro exitoso. Tu hotel esta listo con 7 dias de prueba gratis.', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
