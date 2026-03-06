import { Router } from 'express';
import { RoomCategoryController } from './room-category.controller';
import { auth, roleGuard, subscriptionCheck, tenantIsolation, validate } from '../../middleware';
import { Role, createRoomCategorySchema, updateRoomCategorySchema } from '../../shared';

const router = Router();
const controller = new RoomCategoryController();

router.use(auth, roleGuard(Role.HOTEL_ADMIN, Role.SUPER_ADMIN), subscriptionCheck, tenantIsolation);

router.get('/', (req, res) => controller.findAll(req, res));
router.get('/:id', (req, res) => controller.findById(req, res));
router.post('/', validate(createRoomCategorySchema), (req, res) => controller.create(req, res));
router.put('/:id', validate(updateRoomCategorySchema), (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

export default router;
