import { Router } from 'express';
import { RoomController } from './room.controller';
import { auth, roleGuard, subscriptionCheck, tenantIsolation, validate } from '../../middleware';
import { Role, createRoomSchema, updateRoomSchema, updateRoomStatusSchema } from '../../shared';

const router = Router();
const controller = new RoomController();

router.use(auth, roleGuard(Role.HOTEL_ADMIN, Role.SUPER_ADMIN), subscriptionCheck, tenantIsolation);

router.get('/', (req, res) => controller.findAll(req, res));
router.get('/overview', (req, res) => controller.findAllGrouped(req, res));
router.get('/:id', (req, res) => controller.findById(req, res));
router.post('/', validate(createRoomSchema), (req, res) => controller.create(req, res));
router.put('/:id', validate(updateRoomSchema), (req, res) => controller.update(req, res));
router.patch('/:id/status', validate(updateRoomStatusSchema), (req, res) => controller.updateStatus(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

export default router;
