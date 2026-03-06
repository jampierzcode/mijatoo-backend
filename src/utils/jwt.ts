import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config';
import type { JwtPayload } from '../shared';

export function generateToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as any };
  return jwt.sign(payload as object, env.JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
