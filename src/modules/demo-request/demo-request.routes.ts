import { Router } from 'express';
import { DemoRequestController } from './demo-request.controller';
import { auth, roleGuard, validate } from '../../middleware';
import { Role, updateDemoRequestStatusSchema, convertDemoToHotelSchema } from '../../shared';

const router = Router();
const controller = new DemoRequestController();

router.use(auth, roleGuard(Role.SUPER_ADMIN));

router.get('/', (req, res) => controller.findAll(req, res));
router.get('/:id', (req, res) => controller.findById(req, res));
router.patch('/:id/status', validate(updateDemoRequestStatusSchema), (req, res) => controller.updateStatus(req, res));
router.post('/:id/convert', validate(convertDemoToHotelSchema), (req, res) => controller.convertToHotel(req, res));

export default router;
