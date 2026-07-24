import { query } from '../config/database.js';
import logger from '../config/logger.js';

const AuditLog = {
  async create({ userId, action, resourceType, resourceId, details, ipAddress, userAgent }) {
    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId || null, action, resourceType || null, resourceId || null,
         details ? JSON.stringify(details) : null, ipAddress || null, userAgent || null]
      );
    } catch (err) {
      logger.error('Fallo al escribir audit_log', { error: err.message, action });
    }
  },

  async findByUserId(userId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const logs = await query(
      `SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ?`,
      [userId]
    );
    return { logs, total: countResult.total, page, limit };
  },

  async findByAction(action, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    return query(
      `SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [action, limit, offset]
    );
  },

  async findRecent({ limit = 100 } = {}) {
    return query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT ?`,
      [limit]
    );
  },
};

export default AuditLog;
