import { query, transaction } from '../config/database.js';
import bcrypt from 'bcrypt';
import logger from '../config/logger.js';

const SALT_ROUNDS = 12;

const User = {
  async create({ email, password, fullName }) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)`,
      [email.toLowerCase().trim(), passwordHash, fullName.trim()]
    );
    return result.insertId;
  },

  async findById(id) {
    const rows = await query(`SELECT * FROM users WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const rows = await query(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    return rows[0] || null;
  },

  async verifyPassword(plainPassword, hash) {
    return bcrypt.compare(plainPassword, hash);
  },

  async updateBalance(userId, amount) {
    await query(
      `UPDATE users SET balance = balance + ? WHERE id = ? AND balance + ? >= 0`,
      [amount, userId, amount]
    );
  },

  async updateLastLogin(userId, ip) {
    await query(
      `UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?`,
      [ip, userId]
    );
  },

  async updateStatus(userId, status) {
    await query(`UPDATE users SET status = ? WHERE id = ?`, [status, userId]);
  },

  async changePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);
  },

  async listAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const users = await query(
      `SELECT id, email, full_name, balance, status, kyc_verified, created_at
       FROM users ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [countResult] = await query(`SELECT COUNT(*) as total FROM users`);
    return { users, total: countResult.total, page, limit };
  },
};

export default User;
