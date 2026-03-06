import { Router } from 'express';
import { AuthController } from './auth.controller';
import { auth } from '../../middleware';
import { validate } from '../../middleware';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../../shared';

const router = Router();
const controller = new AuthController();

router.post('/register', validate(registerSchema), (req, res) => controller.register(req, res));
router.post('/login', validate(loginSchema), (req, res) => controller.login(req, res));
router.get('/me', auth, (req, res) => controller.me(req, res));
router.post('/forgot-password', validate(forgotPasswordSchema), (req, res) => controller.forgotPassword(req, res));
router.post('/reset-password', validate(resetPasswordSchema), (req, res) => controller.resetPassword(req, res));
router.post('/change-password', auth, validate(changePasswordSchema), (req, res) => controller.changePassword(req, res));

export default router;
