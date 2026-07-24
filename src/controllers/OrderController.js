import OrderService from '../services/OrderService.js';
import QRService from '../services/QRService.js';
import { AppError } from '../middleware/errorHandler.js';

const OrderController = {
  /**
   * POST /api/orders
   * Crea una orden de compra para un producto.
   */
  async create(req, res, next) {
    try {
      const { productId, quantity } = req.body;
      if (!productId) {
        throw new AppError('productId es requerido', 400);
      }

      const order = await OrderService.createOrder(
        req.user.id,
        productId,
        quantity || 1
      );

      const qr = await QRService.generateQR(order.wallet_address, order.total_amount);

      res.status(201).json({
        message: 'Orden creada. Realiza el pago a la direccion indicada.',
        data: {
          order: {
            id: order.id,
            productName: order.product_name,
            quantity: order.quantity,
            totalAmount: parseFloat(order.total_amount),
            status: order.status,
            walletAddress: order.wallet_address,
            expiresAt: order.expires_at,
            createdAt: order.created_at,
          },
          payment: {
            qrImage: qr.qrImage,
            paymentUri: qr.paymentUri,
            address: order.wallet_address,
            amount: parseFloat(order.total_amount),
            network: 'TRC-20 (TRON)',
            token: 'USDT',
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/orders
   * Lista las ordenes del usuario.
   */
  async list(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await OrderService.getUserOrders(req.user.id, {
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
      });

      res.json({
        data: {
          orders: result.orders.map(o => ({
            id: o.id,
            productName: o.product_name,
            productImage: o.product_image,
            category: o.product_category,
            quantity: o.quantity,
            totalAmount: parseFloat(o.total_amount),
            status: o.status,
            walletAddress: o.wallet_address,
            txHash: o.payment_tx_hash,
            expiresAt: o.expires_at,
            paidAt: o.paid_at,
            createdAt: o.created_at,
          })),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / result.limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/orders/:id
   * Detalle de una orden.
   */
  async getById(req, res, next) {
    try {
      const order = await OrderService.getOrderForUser(req.params.id, req.user.id);

      const response = {
        id: order.id,
        productName: order.product_name,
        productImage: order.product_image,
        category: order.product_category,
        quantity: order.quantity,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        walletAddress: order.wallet_address,
        txHash: order.payment_tx_hash,
        expiresAt: order.expires_at,
        paidAt: order.paid_at,
        createdAt: order.created_at,
      };

      if (order.status === 'pending_payment' && order.wallet_address) {
        const qr = await QRService.generateQR(order.wallet_address, order.total_amount);
        response.payment = {
          qrImage: qr.qrImage,
          paymentUri: qr.paymentUri,
          address: order.wallet_address,
          amount: parseFloat(order.total_amount),
          network: 'TRC-20 (TRON)',
          token: 'USDT',
        };
      }

      res.json({ data: response });
    } catch (err) {
      next(err);
    }
  },
};

export default OrderController;
