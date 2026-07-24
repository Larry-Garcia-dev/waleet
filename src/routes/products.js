import { Router } from 'express';
import ProductController from '../controllers/ProductController.js';
import { authenticate, loadFullUser } from '../middleware/auth.js';

const router = Router();

router.get('/', ProductController.list);
router.get('/categories', ProductController.categories);
router.get('/:id', ProductController.getById);

export default router;
