import TronWeb from 'tronweb';
import Wallet from '../models/Wallet.js';
import AuditLog from '../models/AuditLog.js';
import blockchainConfig from '../config/blockchain.js';
import { SWEEP_STATUS, AUDIT_ACTIONS } from '../utils/constants.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

const SweepService = {
  /**
   * Barrido de fondos desde wallets hijas hacia la wallet fria.
   * Solo transfiere si el balance supera el minimo configurado.
   */
  async sweepAll() {
    if (!process.env.SWEEP_ENABLED || process.env.SWEEP_ENABLED !== 'true') {
      logger.info('Sweep deshabilitado por configuracion');
      return { swept: 0, skipped: 0, errors: 0 };
    }

    const minAmount = parseFloat(process.env.SWEEP_MIN_AMOUNT) || 1.0;
    const wallets = await Wallet.findAllActive();
    const results = { swept: 0, skipped: 0, errors: 0 };

    for (const wallet of wallets) {
      const balance = parseFloat(wallet.current_balance);
      if (balance < minAmount) {
        results.skipped++;
        continue;
      }

      try {
        await this.sweepWallet(wallet, balance);
        results.swept++;
      } catch (err) {
        results.errors++;
        logger.error('Error en sweep', {
          walletId: wallet.id,
          address: wallet.address.substring(0, 8) + '...',
          error: err.message,
        });
      }
    }

    logger.info('Sweep completado', results);
    return results;
  },

  /**
   * Barrido individual de una wallet hacia la cold wallet.
   */
  async sweepWallet(wallet, amount) {
    const coldWallet = blockchainConfig.coldWallet;
    if (!coldWallet) {
      throw new Error('COLD_WALLET_ADDRESS no configurada');
    }

    const sweepResult = await query(
      `INSERT INTO sweeps (wallet_id, destination, amount, status) VALUES (?, ?, ?, ?)`,
      [wallet.id, coldWallet, amount, SWEEP_STATUS.PENDING]
    );

    await AuditLog.create({
      action: AUDIT_ACTIONS.SWEEP_INITIATED,
      resourceType: 'sweep',
      resourceId: sweepResult.insertId,
      details: {
        walletAddress: wallet.address,
        destination: coldWallet.substring(0, 8) + '...',
        amount,
      },
    });

    logger.info('Sweep iniciado', {
      walletId: wallet.id,
      amount,
      destination: coldWallet.substring(0, 8) + '...',
    });

    return sweepResult.insertId;
  },

  /**
   * Consulta el estado de sweeps pendientes.
   */
  async getPendingSweeps() {
    return query(
      `SELECT s.*, w.address as source_address
       FROM sweeps s
       JOIN wallets w ON w.id = s.wallet_id
       WHERE s.status IN (?, ?)
       ORDER BY s.created_at ASC`,
      [SWEEP_STATUS.PENDING, SWEEP_STATUS.BROADCAST]
    );
  },
};

export default SweepService;
