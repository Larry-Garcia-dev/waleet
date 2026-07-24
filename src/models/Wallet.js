import { query } from '../config/database.js';

const Wallet = {
  async create({ userId, derivationIndex, address }) {
    const result = await query(
      `INSERT INTO wallets (user_id, derivation_index, address) VALUES (?, ?, ?)`,
      [userId, derivationIndex, address]
    );
    return result.insertId;
  },

  async findByAddress(address) {
    const rows = await query(`SELECT * FROM wallets WHERE address = ?`, [address]);
    return rows[0] || null;
  },

  async findByUserId(userId) {
    return query(
      `SELECT * FROM wallets WHERE user_id = ? AND is_active = 1 ORDER BY id DESC`,
      [userId]
    );
  },

  async findByDerivationIndex(index) {
    const rows = await query(`SELECT * FROM wallets WHERE derivation_index = ?`, [index]);
    return rows[0] || null;
  },

  async findAllActive() {
    return query(`SELECT * FROM wallets WHERE is_active = 1`);
  },

  async updateBalance(walletId, amount) {
    await query(
      `UPDATE wallets SET current_balance = current_balance + ?, total_received = total_received + ? WHERE id = ?`,
      [amount, amount, walletId]
    );
  },

  async updateSwept(walletId, amount) {
    await query(
      `UPDATE wallets SET current_balance = current_balance - ?, total_swept = total_swept + ?, last_sweep_at = NOW() WHERE id = ?`,
      [amount, amount, walletId]
    );
  },

  async updateLastCheck(walletId) {
    await query(`UPDATE wallets SET last_check_at = NOW() WHERE id = ?`, [walletId]);
  },

  async deactivate(walletId) {
    await query(`UPDATE wallets SET is_active = 0 WHERE id = ?`, [walletId]);
  },

  async getNextDerivationIndex() {
    const conn = await (await import('../config/database.js')).getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        `SELECT current_index FROM derivation_counter WHERE id = 1 FOR UPDATE`
      );
      const nextIndex = rows[0].current_index;
      await conn.execute(
        `UPDATE derivation_counter SET current_index = current_index + 1 WHERE id = 1`
      );
      await conn.commit();
      return nextIndex;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};

export default Wallet;
