import { Router } from 'express';
import { PlanController } from './plan.controller';
import { auth, roleGuard, validate } from '../../middleware';
import { Role, createPlanSchema, updatePlanSchema, createPlanPriceSchema, updatePlanPriceSchema } from '../../shared';

const router = Router();
const controller = new PlanController();

router.use(auth, roleGuard(Role.SUPER_ADMIN));

router.get('/', (req, res) => controller.findAll(req, res));
router.get('/:id', (req, res) => controller.findById(req, res));
router.post('/', validate(createPlanSchema), (req, res) => controller.create(req, res));
router.put('/:id', validate(updatePlanSchema), (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

// Culqi sync
router.post('/sync-culqi', (req, res) => controller.syncCulqi(req, res));

// Price routes
router.post('/:id/prices', validate(createPlanPriceSchema), (req, res) => controller.createPrice(req, res));
router.put('/:id/prices/:priceId', validate(updatePlanPriceSchema), (req, res) => controller.updatePrice(req, res));
router.delete('/:id/prices/:priceId', (req, res) => controller.deletePrice(req, res));

export default router;
