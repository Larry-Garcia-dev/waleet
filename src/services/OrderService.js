import Order, { ORDER_STATUS } from '../models/Order.js';
import Product from '../models/Product.js';
import WalletService from './WalletService.js';
import WalletModel from '../models/Wallet.js';
import AuditLog from '../models/AuditLog.js';
import { transaction } from '../config/database.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const ORDER_EXPIRY_MINUTES = 30;

const OrderService = {
  /**
   * Crea una orden de compra.
   * 1. Valida producto y stock
   * 2. Genera wallet unica para el pago
   * 3. Crea la orden con expiration
   */
  async createOrder(userId, productId, quantity = 1) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', 404);
    }
    if (!product.is_active) {
      throw new AppError('Producto no disponible', 400, 'PRODUCT_UNAVAILABLE');
    }
    if (product.stock < quantity) {
      throw new AppError('Stock insuficiente', 400, 'INSUFFICIENT_STOCK');
    }

    const totalAmount = (parseFloat(product.price_usdt) * quantity).toFixed(6);
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);

    const orderId = await Order.create({
      userId,
      productId,
      quantity,
      totalAmount,
      expiresAt,
    });

    const wallet = await WalletService.generateWalletForUser(userId);

    await Order.assignWallet(orderId, wallet.id, wallet.address);

    await AuditLog.create({
      userId,
      action: 'order.created',
      resourceType: 'order',
      resourceId: orderId,
      details: { productId, quantity, totalAmount, walletAddress: wallet.address },
    });

    logger.info('Orden creada', { orderId, userId, productId, totalAmount });

    const order = await Order.findById(orderId);
    return order;
  },

  /**
   * Obtiene las ordenes de un usuario.
   */
  async getUserOrders(userId, pagination) {
    return Order.findByUserId(userId, pagination);
  },

  /**
   * Obtiene una orden especifica verificando que pertenezca al usuario.
   */
  async getOrderForUser(orderId, userId) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Orden no encontrada', 404);
    }
    if (order.user_id !== userId) {
      throw new AppError('Acceso denegado', 403);
    }
    return order;
  },

  /**
   * Confirma el pago de una orden cuando se detecta el deposito.
   */
  async confirmPayment(orderId, txHash, amount) {
    const order = await Order.findById(orderId);
    if (!order) return;

    if (order.status !== ORDER_STATUS.PENDING_PAYMENT && order.status !== ORDER_STATUS.AWAITING_CONFIRMATION) {
      logger.warn('Orden ya procesada', { orderId, status: order.status });
      return;
    }

    const expectedAmount = parseFloat(order.total_amount);
    const receivedAmount = parseFloat(amount);

    if (receivedAmount < expectedAmount) {
      logger.warn('Monto insuficiente para la orden', { orderId, expected: expectedAmount, received: receivedAmount });
      return;
    }

    await Order.markPaid(orderId, txHash);

    await AuditLog.create({
      userId: order.user_id,
      action: 'order.paid',
      resourceType: 'order',
      resourceId: orderId,
      details: { txHash, amount, productId: order.product_id },
    });

    logger.info('Orden pagada', { orderId, txHash, amount });
  },

  /**
   * Cancela ordenes expiradas y restaura stock.
   */
  async cancelExpiredOrders() {
    const expired = await Order.findExpiredOrders();
    let cancelled = 0;

    for (const order of expired) {
      try {
        await Order.updateStatus(order.id, ORDER_STATUS.CANCELLED);
        await Product.restoreStock(order.product_id, order.quantity);
        cancelled++;
      } catch (err) {
        logger.error('Error cancelando orden expirada', { orderId: order.id, error: err.message });
      }
    }

    if (cancelled > 0) {
      logger.info('Ordenes expiradas canceladas', { count: cancelled });
    }
    return cancelled;
  },
};

export default OrderService;
