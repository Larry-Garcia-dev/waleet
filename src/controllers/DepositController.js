import DepositService from '../services/DepositService.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const DepositController = {
  /**
   * GET /api/deposits
   * Lista los depositos del usuario autenticado.
   */
  async getMyDeposits(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await DepositService.getUserDeposits(req.user.id, {
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
      });

      res.json({
        data: {
          deposits: result.deposits.map(d => ({
            id: d.id,
            txHash: d.tx_hash,
            amount: d.amount,
            token: d.token,
            network: d.network,
            status: d.status,
            confirmations: d.confirmations,
            detectedAt: d.detected_at,
            confirmedAt: d.confirmed_at,
            creditedAt: d.credited_at,
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
   * GET /api/deposits/:txHash
   * Consulta el estado de un deposito especifico.
   */
  async getDepositByTxHash(req, res, next) {
    try {
      const { txHash } = req.params;
      const Deposit = (await import('../models/Deposit.js')).default;
      const deposit = await Deposit.findByTxHash(txHash);

      if (!deposit) {
        throw new AppError('Deposito no encontrado', 404);
      }

      if (deposit.user_id !== req.user.id) {
        throw new AppError('Acceso denegado', 403);
      }

      res.json({
        data: {
          id: deposit.id,
          txHash: deposit.tx_hash,
          amount: deposit.amount,
          token: deposit.token,
          network: deposit.network,
          status: deposit.status,
          confirmations: deposit.confirmations,
          blockNumber: deposit.block_number,
          detectedAt: deposit.detected_at,
          confirmedAt: deposit.confirmed_at,
          creditedAt: deposit.credited_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/deposits/check/:address
   * Fuerza una verificacion de depositos para una direccion.
   */
  async checkDepositsForAddress(req, res, next) {
    try {
      const { address } = req.params;
      const WalletService = (await import('../services/WalletService.js')).default;

      const wallet = await WalletService.getOwnerByAddress(address);
      if (!wallet || wallet.user_id !== req.user.id) {
        throw new AppError('Wallet no encontrada o no pertenece al usuario', 404);
      }

      const deposits = await DepositService.checkAddressDeposits(address);
      res.json({
        message: 'Verificacion completada',
        data: { newDeposits: deposits.length, deposits },
      });
    } catch (err) {
      next(err);
    }
  },
};

export default DepositController;
