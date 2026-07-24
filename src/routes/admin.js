import { Router } from 'express';
import AdminController from '../controllers/AdminController.js';
import { authenticate, loadFullUser } from '../middleware/auth.js';
import { validate, paginationSchema } from '../middleware/validate.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(authenticate);
router.use(loadFullUser);

/**
 * Middleware para verificar que el usuario sea admin.
 * En produccion, esto deberia venir de un campo role en la tabla users.
 * Por ahora, usamos una variable de entorno con IDs de admin.
 */
function requireAdmin(req, res, next) {
  const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(Number);
  if (!adminIds.includes(req.user.id)) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
}

router.use(requireAdmin);

router.get('/users',
  validate(paginationSchema, 'query'),
  AdminController.listUsers
);

router.put('/users/:id/status',
  AdminController.updateUserStatus
);

router.put('/users/:id/kyc',
  AdminController.verifyKYC
);

router.get('/deposits',
  validate(paginationSchema, 'query'),
  AdminController.listDeposits
);

router.get('/stats',
  AdminController.getStats
);

router.get('/audit-logs',
  validate(paginationSchema, 'query'),
  AdminController.getAuditLogs
);

router.post('/sweep/trigger',
  apiLimiter,
  AdminController.triggerSweep
);

router.post('/deposits/check-all',
  apiLimiter,
  AdminController.triggerDepositCheck
);

export default router;
