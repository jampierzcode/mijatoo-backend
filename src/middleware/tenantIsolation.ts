import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config';
import { Role } from '../shared';
import { error } from '../utils/apiResponse';

declare global {
  namespace Express {
    interface Request {
      hotelId?: string;
    }
  }
}

export function tenantIsolation(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return error(res, 'No autenticado', 401);
  }

  if (req.user.role === Role.SUPER_ADMIN) {
    // Super admin can optionally filter by hotelId from query
    req.hotelId = req.query.hotelId as string | undefined;
    return next();
  }

  if (!req.user.hotelId) {
    return error(res, 'No estás asignado a ningún hotel', 403);
  }

  // Check if hotel is active for non-super-admin users
  prisma.hotel.findUnique({ where: { id: req.user.hotelId }, select: { isActive: true } })
    .then((hotel) => {
      if (!hotel || !hotel.isActive) {
        return error(res, 'Tu cuenta ha sido suspendida. Contacta al administrador.', 403);
      }
      req.hotelId = req.user!.hotelId!;
      next();
    })
    .catch(() => {
      return error(res, 'Error al verificar el estado del hotel', 500);
    });
}
