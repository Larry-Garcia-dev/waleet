import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Deposit from '../models/Deposit.js';
import AuditLog from '../models/AuditLog.js';
import SweepService from '../services/SweepService.js';
import DepositService from '../services/DepositService.js';
import { AppError } from '../middleware/errorHandler.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

const AdminController = {
  /**
   * GET /api/admin/users
   */
  async listUsers(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await User.listAll({
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
      });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/admin/users/:id/status
   */
  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['active', 'suspended', 'pending_kyc'];
      if (!validStatuses.includes(status)) {
        throw new AppError('Estado invalido', 400);
      }

      await User.updateStatus(id, status);

      await AuditLog.create({
        userId: req.user.id,
        action: AUDIT_ACTIONS.ADMIN_ACTION,
        resourceType: 'user',
        resourceId: parseInt(id),
        details: { action: 'update_status', newStatus: status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Estado actualizado' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/admin/users/:id/kyc
   */
  async verifyKYC(req, res, next) {
    try {
      const { id } = req.params;
      await query(
        `UPDATE users SET kyc_verified = 1, kyc_verified_at = NOW(), status = 'active' WHERE id = ?`,
        [id]
      );

      await AuditLog.create({
        userId: req.user.id,
        action: AUDIT_ACTIONS.KYC_VERIFIED,
        resourceType: 'user',
        resourceId: parseInt(id),
        ipAddress: req.ip,
      });

      res.json({ message: 'KYC verificado' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/deposits
   */
  async listDeposits(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const offset = ((parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 20);
      const lim = Math.min(parseInt(limit, 10) || 20, 100);

      let sql = `SELECT d.*, u.email as user_email, w.address as wallet_address
                 FROM deposits d
                 JOIN users u ON u.id = d.user_id
                 JOIN wallets w ON w.id = d.wallet_id`;
      const params = [];

      if (status) {
        sql += ` WHERE d.status = ?`;
        params.push(status);
      }
      sql += ` ORDER BY d.detected_at DESC LIMIT ? OFFSET ?`;
      params.push(lim, offset);

      const deposits = await query(sql, params);
      res.json({ data: { deposits } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/stats
   */
  async getStats(req, res, next) {
    try {
      const [userCount] = await query(`SELECT COUNT(*) as total FROM users`);
      const [walletCount] = await query(`SELECT COUNT(*) as total FROM wallets WHERE is_active = 1`);
      const [depositStats] = await query(
        `SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount,
                SUM(CASE WHEN status = 'credited' THEN 1 ELSE 0 END) as credited_count
         FROM deposits`
      );
      const [balanceStats] = await query(
        `SELECT COALESCE(SUM(balance), 0) as total_balances FROM users`
      );

      res.json({
        data: {
          users: { total: userCount.total },
          wallets: { active: walletCount.total },
          deposits: {
            total: depositStats.total,
            totalAmount: depositStats.total_amount,
            creditedCount: depositStats.credited_count,
          },
          balances: { totalHeld: balanceStats.total_balances },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/audit-logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const { page, limit, action } = req.query;
      const logs = await AuditLog.findRecent({
        limit: Math.min(parseInt(limit, 10) || 100, 500),
      });
      res.json({ data: { logs } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/admin/sweep/trigger
   */
  async triggerSweep(req, res, next) {
    try {
      const result = await SweepService.sweepAll();

      await AuditLog.create({
        userId: req.user.id,
        action: AUDIT_ACTIONS.ADMIN_ACTION,
        details: { action: 'trigger_sweep', result },
        ipAddress: req.ip,
      });

      res.json({ message: 'Sweep ejecutado', data: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/admin/deposits/check-all
   */
  async triggerDepositCheck(req, res, next) {
    try {
      const result = await DepositService.checkAllDeposits();
      res.json({ message: 'Verificacion completada', data: result });
    } catch (err) {
      next(err);
    }
  },
};

export default AdminController;
