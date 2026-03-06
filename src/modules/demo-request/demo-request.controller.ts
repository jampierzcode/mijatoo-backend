import { Request, Response } from 'express';
import { DemoRequestService } from './demo-request.service';
import { HotelService } from '../hotel/hotel.service';
import { EmailService } from '../email/email.service';
import { success, error } from '../../utils/apiResponse';

const demoRequestService = new DemoRequestService();
const hotelService = new HotelService();
const emailService = new EmailService();

export class DemoRequestController {
  async findAll(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;
      const requests = await demoRequestService.findAll(status);
      return success(res, requests);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const request = await demoRequestService.findById(req.params.id);
      return success(res, request);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const request = await demoRequestService.create(req.body);

      // Send email notification to admin
      emailService.sendDemoRequestNotification(req.body).catch(() => {});

      return success(res, request, 'Solicitud de demo enviada exitosamente', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const request = await demoRequestService.updateStatus(req.params.id, req.body.status);
      return success(res, request, 'Estado actualizado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async convertToHotel(req: Request, res: Response) {
    try {
      const demoRequest = await demoRequestService.findById(req.params.id);
      if (!demoRequest) return error(res, 'Solicitud no encontrada', 404);

      const { hotelName, slug, address, city, adminEmail, adminFirstName, adminLastName, adminPassword } = req.body;

      // Create hotel
      const hotel = await hotelService.create({
        name: hotelName,
        slug,
        address,
        city,
        country: 'Peru',
      });

      // Create admin user
      const admin = await hotelService.assignAdmin(hotel.id, {
        email: adminEmail,
        firstName: adminFirstName,
        lastName: adminLastName,
        password: adminPassword,
      });

      // Mark demo request as converted
      await demoRequestService.updateStatus(req.params.id, 'CONVERTED');

      return success(res, { hotel, admin }, 'Hotel creado exitosamente desde solicitud de demo', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
