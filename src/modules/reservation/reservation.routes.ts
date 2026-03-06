import { Router } from 'express';
import { ReservationController } from './reservation.controller';
import { auth, roleGuard, subscriptionCheck, tenantIsolation, validate } from '../../middleware';
import { Role, createReservationSchema, updateReservationStatusSchema, assignRoomSchema, walkInReservationSchema } from '../../shared';

const router = Router();
const controller = new ReservationController();

router.use(auth, roleGuard(Role.HOTEL_ADMIN, Role.SUPER_ADMIN), subscriptionCheck, tenantIsolation);

router.get('/', (req, res) => controller.findAll(req, res));
router.post('/walk-in', validate(walkInReservationSchema), (req, res) => controller.createWalkIn(req, res));
router.post('/', validate(createReservationSchema), (req, res) => controller.create(req, res));
router.get('/:id/available-rooms', (req, res) => controller.getAvailableRooms(req, res));
router.get('/:id/suggest-room', (req, res) => controller.suggestRoom(req, res));
router.get('/:id/sale', (req, res) => controller.getSale(req, res));
router.get('/:id/checkout-preview', (req, res) => controller.getCheckoutPreview(req, res));
router.get('/:id/extension-availability', (req, res) => controller.getExtensionAvailability(req, res));
router.get('/:id', (req, res) => controller.findById(req, res));
router.patch('/:id/extend', (req, res) => controller.extendStay(req, res));
router.patch('/:id/check-in', (req, res) => controller.checkIn(req, res));
router.patch('/:id/status', validate(updateReservationStatusSchema), (req, res) => controller.updateStatus(req, res));
router.patch('/:id/assign-room', validate(assignRoomSchema), (req, res) => controller.assignRoom(req, res));
router.patch('/:id/reassign-room', validate(assignRoomSchema), (req, res) => controller.reassignRoom(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

export default router;
