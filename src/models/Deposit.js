import { query, transaction } from '../config/database.js';
import { DEPOSIT_STATUS } from '../utils/constants.js';

const Deposit = {
  async create({ userId, walletId, txHash, amount, blockNumber }) {
    const result = await query(
      `INSERT INTO deposits (user_id, wallet_id, tx_hash, amount, block_number, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, walletId, txHash, amount, blockNumber || null, DEPOSIT_STATUS.PENDING]
    );
    return result.insertId;
  },

  async findByTxHash(txHash) {
    const rows = await query(`SELECT * FROM deposits WHERE tx_hash = ?`, [txHash]);
    return rows[0] || null;
  },

  async findByUserId(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const deposits = await query(
      `SELECT * FROM deposits WHERE user_id = ? ORDER BY detected_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM deposits WHERE user_id = ?`,
      [userId]
    );
    return { deposits, total: countResult.total, page, limit };
  },

  async updateConfirmations(depositId, confirmations) {
    await query(
      `UPDATE deposits SET confirmations = ? WHERE id = ?`,
      [confirmations, depositId]
    );
  },

  async updateStatus(depositId, status) {
    await query(
      `UPDATE deposits SET status = ? WHERE id = ?`,
      [status, depositId]
    );
  },

  async markConfirmed(depositId) {
    await query(
      `UPDATE deposits SET status = ?, confirmed_at = NOW() WHERE id = ?`,
      [DEPOSIT_STATUS.CONFIRMED, depositId]
    );
  },

  async markCredited(depositId) {
    await query(
      `UPDATE deposits SET status = ?, credited_at = NOW() WHERE id = ?`,
      [DEPOSIT_STATUS.CREDITED, depositId]
    );
  },

  async findPendingDeposits() {
    return query(
      `SELECT d.*, w.address as wallet_address
       FROM deposits d
       JOIN wallets w ON w.id = d.wallet_id
       WHERE d.status IN (?, ?)`,
      [DEPOSIT_STATUS.PENDING, DEPOSIT_STATUS.CONFIRMING]
    );
  },

  async findUnprocessedByWallet(walletAddress, sinceBlock = 0) {
    return query(
      `SELECT * FROM deposits
       WHERE wallet_id = (SELECT id FROM wallets WHERE address = ?)
       AND block_number > ?
       ORDER BY block_number ASC`,
      [walletAddress, sinceBlock]
    );
  },
};

export default Deposit;
