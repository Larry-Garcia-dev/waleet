import { Router } from 'express';
import DepositController from '../controllers/DepositController.js';
import { authenticate, loadFullUser } from '../middleware/auth.js';
import { validate, paginationSchema } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.use(loadFullUser);

router.get('/',
  validate(paginationSchema, 'query'),
  DepositController.getMyDeposits
);

router.get('/check/:address',
  DepositController.checkDepositsForAddress
);

router.get('/:txHash',
  DepositController.getDepositByTxHash
);

export default router;
