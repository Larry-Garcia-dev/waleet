import axios from 'axios';
import Deposit from '../models/Deposit.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import blockchainConfig from '../config/blockchain.js';
import { DEPOSIT_STATUS, AUDIT_ACTIONS, TOKEN } from '../utils/constants.js';
import { toChainAmount } from '../utils/crypto.js';
import logger from '../config/logger.js';
import { transaction } from '../config/database.js';

const tronGridApi = axios.create({
  baseURL: blockchainConfig.fullNode,
  headers: {
    'TRON-PRO-API-KEY': blockchainConfig.apiKey,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

const DepositService = {
  /**
   * Consulta TronGrid para detectar nuevos depositos USDT TRC-20
   * en una direccion especifica.
   */
  async checkAddressDeposits(walletAddress) {
    try {
      const response = await tronGridApi.get(
        `/v1/accounts/${walletAddress}/transactions/trc20`,
        {
          params: {
            contract_address: blockchainConfig.usdtContract,
            limit: 50,
            order_by: 'block_timestamp',
            order: 'desc',
          },
        }
      );

      const transactions = response.data?.data || [];
      const currentBlock = await getCurrentBlock();
      const newDeposits = [];

      for (const tx of transactions) {
        if (tx.type !== 'Transfer' && tx.type !== 'TransferAsset') continue;

        const toAddress = tx.to;
        if (toAddress !== walletAddress) continue;

        const value = extractTransferValue(tx);
        if (!value || value === '0') continue;

        const existing = await Deposit.findByTxHash(tx.transaction_id);
        if (existing) {
          if (existing.status === DEPOSIT_STATUS.PENDING || existing.status === DEPOSIT_STATUS.CONFIRMING) {
            const confirmations = currentBlock - (tx.block_number || 0);
            await Deposit.updateConfirmations(existing.id, confirmations);

            if (confirmations >= blockchainConfig.minConfirmations && existing.status !== DEPOSIT_STATUS.CONFIRMED) {
              await Deposit.markConfirmed(existing.id);
              await creditBalance(existing);
              newDeposits.push({ ...existing, status: DEPOSIT_STATUS.CREDITED });
            }
          }
          continue;
        }

        const wallet = await Wallet.findByAddress(walletAddress);
        if (!wallet) continue;

        const confirmations = currentBlock - (tx.block_number || 0);
        const depositId = await Deposit.create({
          userId: wallet.user_id,
          walletId: wallet.id,
          txHash: tx.transaction_id,
          amount: value,
          blockNumber: tx.block_number,
        });

        await Wallet.updateLastCheck(wallet.id);

        await AuditLog.create({
          userId: wallet.user_id,
          action: AUDIT_ACTIONS.DEPOSIT_DETECTED,
          resourceType: 'deposit',
          resourceId: depositId,
          details: { txHash: tx.transaction_id, amount: value, address: walletAddress },
        });

        logger.info('Deposito detectado', {
          walletAddress: walletAddress.substring(0, 8) + '...',
          txHash: tx.transaction_id,
          amount: value,
          confirmations,
        });

        if (confirmations >= blockchainConfig.minConfirmations) {
          await Deposit.markConfirmed(depositId);
          await creditBalance({ id: depositId, user_id: wallet.user_id, amount: value, wallet_id: wallet.id });
          newDeposits.push({ id: depositId, status: DEPOSIT_STATUS.CREDITED });
        } else {
          await Deposit.updateStatus(depositId, DEPOSIT_STATUS.CONFIRMING);
          newDeposits.push({ id: depositId, status: DEPOSIT_STATUS.CONFIRMING });
        }
      }

      return newDeposits;
    } catch (err) {
      if (err.response?.status === 404) return [];
      logger.error('Error consultando depositos', {
        address: walletAddress.substring(0, 8) + '...',
        error: err.message,
      });
      throw err;
    }
  },

  /**
   * Verifica todas las wallets activas en busca de nuevos depositos.
   */
  async checkAllDeposits() {
    const wallets = await Wallet.findAllActive();
    const results = { checked: 0, newDeposits: 0, errors: 0 };

    for (const wallet of wallets) {
      try {
        const deposits = await this.checkAddressDeposits(wallet.address);
        results.checked++;
        results.newDeposits += deposits.length;
      } catch (err) {
        results.errors++;
      }
    }

    logger.info('Monitor de depositos completado', results);
    return results;
  },

  /**
   * Obtiene el historial de depositos de un usuario.
   */
  async getUserDeposits(userId, pagination) {
    return Deposit.findByUserId(userId, pagination);
  },
};

/**
 * Acredita el balance al usuario dentro de una transaccion atomica.
 * Idempotente: el UNIQUE KEY en tx_hash previene doble acreditacion.
 */
async function creditBalance(deposit) {
  try {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE users SET balance = balance + ? WHERE id = ?`,
        [deposit.amount, deposit.user_id]
      );
      await conn.execute(
        `UPDATE deposits SET status = ?, credited_at = NOW() WHERE id = ?`,
        [DEPOSIT_STATUS.CREDITED, deposit.id]
      );
      await conn.execute(
        `UPDATE wallets SET current_balance = current_balance + ?, total_received = total_received + ? WHERE id = ?`,
        [deposit.amount, deposit.amount, deposit.wallet_id]
      );
    });

    await AuditLog.create({
      userId: deposit.user_id,
      action: AUDIT_ACTIONS.DEPOSIT_CREDITED,
      resourceType: 'deposit',
      resourceId: deposit.id,
      details: { amount: deposit.amount },
    });

    logger.info('Balance acreditado', { userId: deposit.user_id, amount: deposit.amount });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      logger.warn('Deposito ya acreditado (idempotencia)', { depositId: deposit.id });
      return;
    }
    throw err;
  }
}

async function getCurrentBlock() {
  try {
    const res = await tronGridApi.get('/wallet/getnowblock');
    return res.data?.block_header?.raw_data?.number || 0;
  } catch {
    return 0;
  }
}

function extractTransferValue(tx) {
  if (tx.value) return (BigInt(tx.value) / BigInt(1_000_000)).toString();
  if (tx.value_info?.amount) return (BigInt(tx.value_info.amount) / BigInt(1_000_000)).toString();
  return '0';
}

export default DepositService;
