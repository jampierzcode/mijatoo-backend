import { Router } from 'express';
import { PublicController } from './public.controller';
import { validate } from '../../middleware';
import { publicReservationSchema, createDemoRequestSchema } from '../../shared';

const router = Router();
const controller = new PublicController();

router.get('/hotels', (req, res) => controller.listHotels(req, res));
router.get('/plans', (req, res) => controller.getPlans(req, res));
router.post('/demo-requests', validate(createDemoRequestSchema), (req, res) => controller.createDemoRequest(req, res));

router.get('/hotels/:slug', (req, res) => controller.getHotel(req, res));
router.get('/hotels/:slug/categories', (req, res) => controller.getCategories(req, res));
router.get('/hotels/:slug/categories/:categorySlug', (req, res) => controller.getCategory(req, res));
router.get('/hotels/:slug/categories/:categorySlug/reviews', (req, res) => controller.getReviews(req, res));
router.get('/hotels/:slug/availability', (req, res) => controller.getAvailability(req, res));
router.get('/hotels/:slug/rooms', (req, res) => controller.getAvailableRooms(req, res));
router.get('/hotels/:slug/rooms/:roomId', (req, res) => controller.getRoom(req, res));
router.post('/hotels/:slug/reservations', validate(publicReservationSchema), (req, res) => controller.createReservation(req, res));

export default router;
