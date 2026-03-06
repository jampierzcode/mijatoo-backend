import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { error } from '../utils/apiResponse';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        if (!errors[key]) errors[key] = [];
        errors[key].push(issue.message);
      }
      return error(res, 'Error de validación', 400, errors);
    }
    req.body = result.data;
    next();
  };
}
