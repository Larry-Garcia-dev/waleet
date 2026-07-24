import { Router } from 'express';
import WalletController from '../controllers/WalletController.js';
import { authenticate, loadFullUser } from '../middleware/auth.js';
import { walletLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(authenticate);
router.use(loadFullUser);

router.post('/generate',
  walletLimiter,
  WalletController.generate
);

router.get('/my-wallets',
  WalletController.getMyWallets
);

router.get('/qr',
  walletLimiter,
  WalletController.getQR
);

router.get('/validate/:address',
  WalletController.validateAddress
);

export default router;
