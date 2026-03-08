import { Router } from 'express';
import { HotelController } from './hotel.controller';
import { auth, roleGuard, subscriptionCheck, tenantIsolation, validate } from '../../middleware';
import { Role, createHotelSchema, updateHotelSchema, assignAdminSchema, updateAdminEmailSchema, updateHotelSettingsSchema } from '../../shared';

const router = Router();
const controller = new HotelController();

// HOTEL_ADMIN settings routes (must be before SUPER_ADMIN middleware)
router.get('/settings', auth, roleGuard(Role.HOTEL_ADMIN), subscriptionCheck, tenantIsolation, (req, res) => controller.getSettings(req, res));
router.patch('/settings', auth, roleGuard(Role.HOTEL_ADMIN), subscriptionCheck, tenantIsolation, validate(updateHotelSettingsSchema), (req, res) => controller.updateSettings(req, res));

// SUPER_ADMIN routes
router.use(auth, roleGuard(Role.SUPER_ADMIN));

router.get('/', (req, res) => controller.findAll(req, res));
router.get('/:id', (req, res) => controller.findById(req, res));
router.post('/', validate(createHotelSchema), (req, res) => controller.create(req, res));
router.put('/:id', validate(updateHotelSchema), (req, res) => controller.update(req, res));
router.patch('/:id/toggle-active', (req, res) => controller.toggleActive(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));
router.post('/:id/admins', validate(assignAdminSchema), (req, res) => controller.assignAdmin(req, res));
router.patch('/:id/admins/:userId', validate(updateAdminEmailSchema), (req, res) => controller.updateAdminEmail(req, res));
router.delete('/:id/admins/:userId', (req, res) => controller.removeAdmin(req, res));

export default router;
