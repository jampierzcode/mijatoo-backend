import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';
import { success, error } from '../../utils/apiResponse';
import { env } from '../../config/env';

const subscriptionService = new SubscriptionService();

export class SubscriptionController {
  async findAll(req: Request, res: Response) {
    try {
      const statusFilter = req.query.status as string | undefined;
      const subscriptions = await subscriptionService.findAll(statusFilter);
      return success(res, subscriptions);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getStats(_req: Request, res: Response) {
    try {
      const stats = await subscriptionService.getStats();
      return success(res, stats);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findByHotelId(req: Request, res: Response) {
    try {
      const subscription = await subscriptionService.findCurrentByHotelId(req.params.hotelId);
      if (!subscription) return error(res, 'Suscripcion no encontrada', 404);
      return success(res, subscription);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async findMy(req: Request, res: Response) {
    try {
      const hotelId = req.user!.hotelId;
      if (!hotelId) return error(res, 'No tienes un hotel asignado', 400);
      const subscription = await subscriptionService.findCurrentByHotelId(hotelId);
      return success(res, subscription);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async cancelMy(req: Request, res: Response) {
    try {
      const hotelId = req.user!.hotelId;
      if (!hotelId) return error(res, 'No tienes un hotel asignado', 400);
      const subscription = await subscriptionService.findCurrentByHotelId(hotelId);
      if (!subscription) return error(res, 'No tienes una suscripcion activa', 404);
      const cancelled = await subscriptionService.cancelSubscription(subscription.id);
      return success(res, cancelled, 'Suscripcion cancelada');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getMyHistory(req: Request, res: Response) {
    try {
      const hotelId = req.user!.hotelId;
      if (!hotelId) return error(res, 'No tienes un hotel asignado', 400);
      const history = await subscriptionService.getHistoryByHotelId(hotelId);
      return success(res, history);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async selectPlan(req: Request, res: Response) {
    try {
      const hotelId = req.user!.hotelId;
      if (!hotelId) return error(res, 'No tienes un hotel asignado', 400);
      const isRenewal = req.body.isRenewal === true;
      const subscription = await subscriptionService.selectPlan(hotelId, req.body.planPriceId, isRenewal);
      return success(res, subscription, 'Plan seleccionado. Pendiente de pago.');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async assignPlan(req: Request, res: Response) {
    try {
      const subscription = await subscriptionService.assignPlan(req.params.id, req.body.planPriceId);
      return success(res, subscription, 'Plan asignado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async registerPayment(req: Request, res: Response) {
    try {
      const payment = await subscriptionService.registerPayment(req.params.id, {
        ...req.body,
        registeredBy: req.user!.userId,
      });
      return success(res, payment, 'Pago registrado exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getPayments(req: Request, res: Response) {
    try {
      const payments = await subscriptionService.getPayments(req.params.id);
      return success(res, payments);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const subscription = await subscriptionService.findById(req.params.id);
      return success(res, subscription);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async createForHotel(req: Request, res: Response) {
    try {
      const { hotelId, planPriceId } = req.body;
      const subscription = await subscriptionService.selectPlan(hotelId, planPriceId);
      return success(res, subscription, 'Suscripcion creada. Pendiente de pago.');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async cancel(req: Request, res: Response) {
    try {
      const subscription = await subscriptionService.cancelSubscription(req.params.id);
      return success(res, subscription, 'Suscripcion cancelada');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async subscribeCulqi(req: Request, res: Response) {
    try {
      const hotelId = req.user!.hotelId;
      if (!hotelId) return error(res, 'No tienes un hotel asignado', 400);
      const subscription = await subscriptionService.createCulqiSubscription(
        hotelId,
        req.body.planPriceId,
        req.body.culqiToken,
        req.body.culqiEmail,
      );
      return success(res, subscription, 'Suscripcion activada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async getCulqiPublicKey(_req: Request, res: Response) {
    try {
      const publicKey = subscriptionService.getCulqiPublicKey();
      if (!publicKey) return error(res, 'Culqi no esta configurado', 500);
      return success(res, { publicKey });
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async culqiWebhook(req: Request, res: Response) {
    try {
      await subscriptionService.handleCulqiWebhook(req.body);
      return res.json({ received: true });
    } catch (err: any) {
      console.error('[CulqiWebhook] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  async getRevenueStats(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      const stats = await subscriptionService.getRevenueStats(start, end);
      return success(res, stats);
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
