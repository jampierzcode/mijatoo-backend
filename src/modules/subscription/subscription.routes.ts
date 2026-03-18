import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { auth, roleGuard, validate } from '../../middleware';
import { Role, selectPlanSchema, registerSubscriptionPaymentSchema, createSubscriptionForHotelSchema, subscribeCulqiSchema } from '../../shared';

const router = Router();
const controller = new SubscriptionController();

// Culqi webhook - public, no auth required
router.post('/webhook/culqi', (req, res) => controller.culqiWebhook(req, res));

// HOTEL_ADMIN routes - must be before SUPER_ADMIN guard
router.get('/my', auth, roleGuard(Role.HOTEL_ADMIN), (req, res) => controller.findMy(req, res));
router.get('/my/history', auth, roleGuard(Role.HOTEL_ADMIN), (req, res) => controller.getMyHistory(req, res));
router.post('/select-plan', auth, roleGuard(Role.HOTEL_ADMIN), validate(selectPlanSchema), (req, res) => controller.selectPlan(req, res));
router.post('/subscribe-culqi', auth, roleGuard(Role.HOTEL_ADMIN), validate(subscribeCulqiSchema), (req, res) => controller.subscribeCulqi(req, res));
router.get('/culqi-public-key', auth, roleGuard(Role.HOTEL_ADMIN), (req, res) => controller.getCulqiPublicKey(req, res));

// SUPER_ADMIN routes
router.use(auth, roleGuard(Role.SUPER_ADMIN));

router.get('/', (req, res) => controller.findAll(req, res));
router.get('/stats', (req, res) => controller.getStats(req, res));
router.get('/revenue', (req, res) => controller.getRevenueStats(req, res));
router.post('/create', validate(createSubscriptionForHotelSchema), (req, res) => controller.createForHotel(req, res));
router.get('/hotel/:hotelId', (req, res) => controller.findByHotelId(req, res));
router.get('/:id', (req, res) => controller.findById(req, res));
router.post('/:id/payments', validate(registerSubscriptionPaymentSchema), (req, res) => controller.registerPayment(req, res));
router.get('/:id/payments', (req, res) => controller.getPayments(req, res));
router.post('/:id/cancel', (req, res) => controller.cancel(req, res));

export default router;
