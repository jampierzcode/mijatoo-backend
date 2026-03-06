import { Router } from 'express';
import { ProductSaleController } from './product-sale.controller';
import { auth, roleGuard, subscriptionCheck, tenantIsolation, validate } from '../../middleware';
import { Role, createProductSaleSchema } from '../../shared';

const router = Router();
const controller = new ProductSaleController();

router.use(auth, roleGuard(Role.HOTEL_ADMIN, Role.SUPER_ADMIN), subscriptionCheck, tenantIsolation);

router.post('/sales', validate(createProductSaleSchema), (req, res) => controller.createSale(req, res));
router.get('/sales', (req, res) => controller.findAll(req, res));
router.get('/by-reservation/:reservationId', (req, res) => controller.findByReservation(req, res));
router.delete('/:id', (req, res) => controller.deleteSale(req, res));

export default router;
