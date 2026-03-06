import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { success, error } from '../../utils/apiResponse';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      return success(res, result, 'Registro exitoso', 201);
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return success(res, result, 'Login exitoso');
    } catch (err: any) {
      return error(res, err.message, 401);
    }
  }

  async me(req: Request, res: Response) {
    try {
      const user = await authService.getProfile(req.user!.userId);
      return success(res, user);
    } catch (err: any) {
      return error(res, err.message, 404);
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      await authService.forgotPassword(req.body.email);
      return success(res, null, 'Si el email existe, recibirás instrucciones para restablecer tu contraseña');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      return success(res, null, 'Contraseña restablecida exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      await authService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
      return success(res, null, 'Contraseña cambiada exitosamente');
    } catch (err: any) {
      return error(res, err.message);
    }
  }
}
