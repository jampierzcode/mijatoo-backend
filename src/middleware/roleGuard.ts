import { Request, Response, NextFunction } from 'express';
import { Role } from '../shared';
import { error } from '../utils/apiResponse';

export function roleGuard(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return error(res, 'No autenticado', 401);
    }
    if (!roles.includes(req.user.role as Role)) {
      return error(res, 'No tienes permisos para esta acción', 403);
    }
    next();
  };
}
