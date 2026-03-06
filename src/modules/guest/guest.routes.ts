import { Router } from 'express';
import { GuestController } from './guest.controller';
import { auth, roleGuard, subscriptionCheck, tenantIsolation, validate } from '../../middleware';
import { Role, createGuestSchema, updateGuestSchema } from '../../shared';

const router = Router();
const controller = new GuestController();

router.use(auth, roleGuard(Role.HOTEL_ADMIN, Role.SUPER_ADMIN), subscriptionCheck, tenantIsolation);

router.get('/search', (req, res) => controller.search(req, res));
router.get('/', (req, res) => controller.findAll(req, res));
router.get('/:id', (req, res) => controller.findById(req, res));
router.post('/', validate(createGuestSchema), (req, res) => controller.create(req, res));
router.put('/:id', validate(updateGuestSchema), (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

export default router;
