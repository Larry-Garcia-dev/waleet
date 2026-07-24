import WalletService from '../services/WalletService.js';
import QRService from '../services/QRService.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../middleware/errorHandler.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';
import logger from '../config/logger.js';

const WalletController = {
  /**
   * POST /api/wallet/generate
   * Genera una nueva direccion TRC-20 para el usuario autenticado.
   */
  async generate(req, res, next) {
    try {
      const wallet = await WalletService.generateWalletForUser(req.user.id);

      await AuditLog.create({
        userId: req.user.id,
        action: AUDIT_ACTIONS.WALLET_GENERATED,
        resourceType: 'wallet',
        resourceId: wallet.id,
        details: { address: wallet.address.substring(0, 8) + '...' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({
        message: 'Wallet generada exitosamente',
        data: {
          id: wallet.id,
          address: wallet.address,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/wallet/my-wallets
   * Lista las wallets del usuario autenticado.
   */
  async getMyWallets(req, res, next) {
    try {
      const wallets = await WalletService.getUserWallets(req.user.id);
      res.json({ data: wallets });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/wallet/qr
   * Genera un codigo QR para la direccion de deposito del usuario.
   */
  async getQR(req, res, next) {
    try {
      const wallets = await WalletService.getUserWallets(req.user.id);
      if (!wallets.length) {
        throw new AppError('No tiene una wallet asignada. Genere una primero.', 404, 'NO_WALLET');
      }

      const wallet = wallets[0];
      const amount = req.query.amount || null;
      const format = req.query.format || 'base64';

      if (format === 'svg') {
        const svg = await QRService.generateQRSVG(wallet.address, amount);
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg);
      }

      if (format === 'raw') {
        const buffer = await QRService.generateQRBuffer(wallet.address, amount);
        res.setHeader('Content-Type', 'image/png');
        return res.send(buffer);
      }

      const qr = await QRService.generateQR(wallet.address, amount);
      res.json({
        data: {
          address: qr.address,
          qrImage: qr.qrImage,
          paymentUri: qr.paymentUri,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/wallet/validate/:address
   * Valida si una direccion TRC-20 es valida.
   */
  async validateAddress(req, res, next) {
    try {
      const { address } = req.params;
      const isValid = WalletService.isValidTronAddress(address);
      res.json({ data: { address, isValid } });
    } catch (err) {
      next(err);
    }
  },
};

export default WalletController;
