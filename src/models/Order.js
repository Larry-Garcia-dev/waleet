import { query } from '../config/database.js';

const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  PAID: 'paid',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

const Order = {
  async create({ userId, productId, quantity, totalAmount, expiresAt }) {
    const result = await query(
      `INSERT INTO orders (user_id, product_id, quantity, total_amount, status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, productId, quantity, totalAmount, ORDER_STATUS.PENDING_PAYMENT, expiresAt]
    );
    return result.insertId;
  },

  async findById(id) {
    const rows = await query(
      `SELECT o.*, p.name as product_name, p.image_url as product_image, p.category as product_category
       FROM orders o
       JOIN products p ON p.id = o.product_id
       WHERE o.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByUserId(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const orders = await query(
      `SELECT o.*, p.name as product_name, p.image_url as product_image, p.category as product_category
       FROM orders o
       JOIN products p ON p.id = o.product_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM orders WHERE user_id = ?`,
      [userId]
    );
    return { orders, total: countResult.total, page, limit };
  },

  async assignWallet(orderId, walletId, walletAddress) {
    await query(
      `UPDATE orders SET wallet_id = ?, wallet_address = ? WHERE id = ?`,
      [walletId, walletAddress, orderId]
    );
  },

  async updateStatus(orderId, status) {
    await query(`UPDATE orders SET status = ? WHERE id = ?`, [status, orderId]);
  },

  async markPaid(orderId, txHash) {
    await query(
      `UPDATE orders SET status = ?, payment_tx_hash = ?, paid_at = NOW() WHERE id = ?`,
      [ORDER_STATUS.PAID, txHash, orderId]
    );
  },

  async markCompleted(orderId) {
    await query(
      `UPDATE orders SET status = ?, completed_at = NOW() WHERE id = ?`,
      [ORDER_STATUS.COMPLETED, orderId]
    );
  },

  async findExpiredOrders() {
    return query(
      `SELECT * FROM orders WHERE status = ? AND expires_at < NOW()`,
      [ORDER_STATUS.PENDING_PAYMENT]
    );
  },

  async findByWalletAddress(address) {
    const rows = await query(
      `SELECT * FROM orders WHERE wallet_address = ? AND status IN (?, ?)`,
      [address, ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.AWAITING_CONFIRMATION]
    );
    return rows;
  },
};

export { ORDER_STATUS };
export default Order;
