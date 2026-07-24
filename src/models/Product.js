import { query } from '../config/database.js';

const Product = {
  async findAll({ category, active = true } = {}) {
    let sql = `SELECT * FROM products WHERE 1=1`;
    const params = [];
    if (active) {
      sql += ` AND is_active = 1`;
    }
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    sql += ` ORDER BY created_at DESC`;
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query(`SELECT * FROM products WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  async updateStock(productId, quantity) {
    await query(
      `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
      [quantity, productId, quantity]
    );
  },

  async restoreStock(productId, quantity) {
    await query(
      `UPDATE products SET stock = stock + ? WHERE id = ?`,
      [quantity, productId]
    );
  },

  async getCategories() {
    const rows = await query(`SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category`);
    return rows.map(r => r.category);
  },
};

export default Product;
