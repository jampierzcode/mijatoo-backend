import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils';
import { error } from '../utils/apiResponse';
import type { JwtPayload } from '../shared';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return error(res, 'Token de acceso requerido', 401);
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    return error(res, 'Token inválido o expirado', 401);
  }
}
