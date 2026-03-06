import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { success, error } from '../../utils/apiResponse';

const paymentService = new PaymentService();

export class PaymentController {
  async chargeReservation(req: Request, res: Response) {
    try {
      const result = await paymentService.chargeReservation(
        req.body.reservationId,
        req.body.culqiToken,
      );
      return success(res, result, 'Pago procesado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getHotelPublicKey(req: Request, res: Response) {
    try {
      const result = await paymentService.getHotelPublicKey(req.params.hotelId);
      return success(res, result);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async webhook(req: Request, res: Response) {
    try {
      await paymentService.handleWebhook(req.body);
      return res.json({ received: true });
    } catch (err: any) {
      return error(res, err.message, 500);
    }
  }
}
