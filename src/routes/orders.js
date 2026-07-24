import { Router } from 'express';
import OrderController from '../controllers/OrderController.js';
import { authenticate, loadFullUser } from '../middleware/auth.js';
import { validate, paginationSchema } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.use(loadFullUser);

router.post('/', OrderController.create);
router.get('/', validate(paginationSchema, 'query'), OrderController.list);
router.get('/:id', OrderController.getById);

export default router;
