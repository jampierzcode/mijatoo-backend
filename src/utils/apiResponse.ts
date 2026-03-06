import { Response } from 'express';

export function success<T>(res: Response, data: T, message?: string, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function error(res: Response, message: string, statusCode = 400, errors?: Record<string, string[]>) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}
