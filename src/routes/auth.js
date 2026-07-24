import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate, loadFullUser } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema, changePasswordSchema } from '../middleware/validate.js';
import { authLimiter, authSlowDown } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register',
  authLimiter,
  authSlowDown,
  validate(registerSchema),
  AuthController.register
);

router.post('/login',
  authLimiter,
  authSlowDown,
  validate(loginSchema),
  AuthController.login
);

router.post('/refresh',
  validate({ refreshToken: undefined }, 'body'),
  AuthController.refresh
);

router.post('/change-password',
  authenticate,
  validate(changePasswordSchema),
  AuthController.changePassword
);

router.get('/me',
  authenticate,
  loadFullUser,
  AuthController.getProfile
);

export default router;
