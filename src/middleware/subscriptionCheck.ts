import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../modules/subscription/subscription.service';
import { Role } from '../shared';

const subscriptionService = new SubscriptionService();

export const subscriptionCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === Role.SUPER_ADMIN) {
      return next();
    }

    const hotelId = req.user?.hotelId;
    if (!hotelId) {
      return res.status(403).json({ success: false, message: 'No tienes un hotel asignado' });
    }

    const isActive = await subscriptionService.checkSubscriptionActive(hotelId);
    if (!isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tu suscripcion ha expirado. Contacta al administrador para renovar.',
      });
    }

    next();
  } catch {
    next();
  }
};
