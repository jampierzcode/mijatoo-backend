import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { auth, validate } from '../../middleware';
import { chargeReservationSchema } from '../../shared';

const router = Router();
const controller = new PaymentController();

// Charge a reservation (guest pays online)
router.post('/charge', auth, validate(chargeReservationSchema), (req, res) => controller.chargeReservation(req, res));

// Get hotel's Culqi public key (for frontend to init Culqi.js)
router.get('/hotel/:hotelId/public-key', (req, res) => controller.getHotelPublicKey(req, res));

// Culqi webhook
router.post('/webhook', (req, res) => controller.webhook(req, res));

export default router;
