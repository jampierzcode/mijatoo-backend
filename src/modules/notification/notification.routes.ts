import { Router, Request, Response, NextFunction } from 'express';
import { NotificationController } from './notification.controller';
import { auth, roleGuard, subscriptionCheck, tenantIsolation } from '../../middleware';
import { Role } from '../../shared';
import { verifyToken } from '../../utils';

const router = Router();
const controller = new NotificationController();

// SSE stream endpoint with token auth via query param
router.get('/stream', (req: Request, res: Response, next: NextFunction) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token requerido' });
  }
  try {
    req.user = verifyToken(token);
    // Set hotelId from JWT
    if (req.user.role === Role.HOTEL_ADMIN) {
      req.hotelId = req.user.hotelId || undefined;
    }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
}, (req, res) => controller.stream(req, res));

// Standard auth for all other routes
router.use(auth, roleGuard(Role.HOTEL_ADMIN, Role.SUPER_ADMIN), subscriptionCheck, tenantIsolation);

router.get('/', (req, res) => controller.findAll(req, res));
router.get('/unread-count', (req, res) => controller.getUnreadCount(req, res));
router.patch('/read-all', (req, res) => controller.markAllAsRead(req, res));
router.patch('/:id/read', (req, res) => controller.markAsRead(req, res));

export default router;
