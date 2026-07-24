import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

const ProductController = {
  /**
   * GET /api/products
   */
  async list(req, res, next) {
    try {
      const { category } = req.query;
      const products = await Product.findAll({ category });
      res.json({
        data: products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: parseFloat(p.price_usdt),
          image: p.image_url,
          category: p.category,
          stock: p.stock,
          available: p.stock > 0 && p.is_active,
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/products/categories
   */
  async categories(req, res, next) {
    try {
      const categories = await Product.getCategories();
      res.json({ data: categories });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/products/:id
   */
  async getById(req, res, next) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product || !product.is_active) {
        throw new AppError('Producto no encontrado', 404);
      }
      res.json({
        data: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: parseFloat(product.price_usdt),
          image: product.image_url,
          category: product.category,
          stock: product.stock,
          available: product.stock > 0,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

export default ProductController;
