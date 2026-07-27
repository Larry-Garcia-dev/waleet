import axios from 'axios';
import Deposit from '../models/Deposit.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import blockchainConfig from '../config/blockchain.js';
import { DEPOSIT_STATUS, AUDIT_ACTIONS, TOKEN } from '../utils/constants.js';
import logger from '../config/logger.js';
import { transaction } from '../config/database.js';

// Instancia base de Axios
const tronGridApi = axios.create({
  baseURL: blockchainConfig.fullNode,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor para inyectar TRON-PRO-API-KEY solo si está presente en la config
tronGridApi.interceptors.request.use((config) => {
  const apiKey = blockchainConfig.apiKey || process.env.TRONGRID_API_KEY;
  if (apiKey && apiKey.trim() !== '') {
    config.headers['TRON-PRO-API-KEY'] = apiKey.trim();
  }
  return config;
});

const DepositService = {
  /**
   * Consulta TronGrid para detectar nuevos depósitos USDT TRC-20
   * en una dirección específica.
   */
  async checkAddressDeposits(walletAddress) {
    try {
      const response = await tronGridApi.get(
        `/v1/accounts/${walletAddress}/transactions/trc20`,
        {
          params: {
            contract_address: blockchainConfig.usdtContract,
            limit: 50,
          },
        }
      );

      const transactions = response.data?.data || [];
      const currentBlock = await getCurrentBlock();
      const newDeposits = [];

      logger.info(`📊 [DEPOSIT SERVICE] Transacciones encontradas para ${walletAddress}:`, {
        total: transactions.length,
        currentBlock,
      });

      for (const tx of transactions) {
        logger.info(`🔍 [DEPOSIT SERVICE] Procesando transacción:`, {
          tx_id: tx.transaction_id,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          block: tx.block_timestamp,
        });
        // En algunas respuestas de TronGrid no viene tx.type, se valida por 'to' y 'value'
        const toAddress = tx.to;
        
        // Normalización para comparar direcciones
        if (!toAddress || toAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          continue;
        }

        const value = extractTransferValue(tx);
        if (!value || parseFloat(value) <= 0) continue;

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
        if (!wallet) {
          logger.warn(`⚠️ Wallet no encontrada en DB para la dirección: ${walletAddress}`);
          continue;
        }

        const confirmations = currentBlock - (tx.block_number || 0);
        
        // TronGrid no siempre devuelve block_number, usar 0 como fallback
        const blockNumber = tx.block_number || null;
        
        logger.info(`💾 [DEPOSIT SERVICE] Creando depósito en DB:`, {
          userId: wallet.user_id,
          walletId: wallet.id,
          txHash: tx.transaction_id,
          amount: value,
          blockNumber: blockNumber,
        });
        
        const depositId = await Deposit.create({
          userId: wallet.user_id,
          walletId: wallet.id,
          txHash: tx.transaction_id,
          amount: value,
          blockNumber: blockNumber,
        });

        await Wallet.updateLastCheck(wallet.id);

        await AuditLog.create({
          userId: wallet.user_id,
          action: AUDIT_ACTIONS.DEPOSIT_DETECTED,
          resourceType: 'deposit',
          resourceId: depositId,
          details: { txHash: tx.transaction_id, amount: value, address: walletAddress },
        });

        logger.info('💰 [DEPOSIT SERVICE] ¡Depósito detectado en Nile!', {
          walletAddress,
          txHash: tx.transaction_id,
          amount: value,
          confirmations,
        });

        if (confirmations >= blockchainConfig.minConfirmations) {
          await Deposit.markConfirmed(depositId);
          await creditBalance({ 
            id: depositId, 
            user_id: wallet.user_id, 
            amount: value, 
            wallet_id: wallet.id,
            tx_hash: tx.transaction_id 
          });
          newDeposits.push({ id: depositId, status: DEPOSIT_STATUS.CREDITED });
        } else {
          await Deposit.updateStatus(depositId, DEPOSIT_STATUS.CONFIRMING);
          newDeposits.push({ id: depositId, status: DEPOSIT_STATUS.CONFIRMING });
        }
      }

      return newDeposits;
    } catch (err) {
      if (err.response?.status === 404) return [];
      logger.error('Error consultando depósitos', {
        address: walletAddress,
        error: err.message,
      });
      throw err;
    }
  },

  /**
   * Verifica todas las wallets activas en busca de nuevos depósitos.
   */
  async checkAllDeposits() {
    const wallets = await Wallet.findAllActive();
    
    logger.info(`📋 [DEPOSIT SERVICE] Wallets activas encontradas en DB (${wallets.length}):`, 
      wallets.map(w => ({ id: w.id, address: w.address }))
    );

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

    return results;
  },

  /**
   * Obtiene el historial de depósitos de un usuario.
   */
  async getUserDeposits(userId, pagination) {
    return Deposit.findByUserId(userId, pagination);
  },
};

/**
 * Acredita el balance al usuario dentro de una transacción atómica.
 */
async function creditBalance(deposit) {
  try {
    await transaction(async (conn) => {
      // Acreditar balance al usuario
      await conn.execute(
        `UPDATE users SET balance = balance + ? WHERE id = ?`,
        [deposit.amount, deposit.user_id]
      );
      
      // Marcar depósito como acreditado
      await conn.execute(
        `UPDATE deposits SET status = ?, credited_at = NOW() WHERE id = ?`,
        [DEPOSIT_STATUS.CREDITED, deposit.id]
      );
      
      // Actualizar balance de la wallet
      await conn.execute(
        `UPDATE wallets SET current_balance = current_balance + ?, total_received = total_received + ? WHERE id = ?`,
        [deposit.amount, deposit.amount, deposit.wallet_id]
      );
      
      // Actualizar orden a PAID si existe y está pendiente de pago
      const [orderUpdate] = await conn.execute(
        `UPDATE orders SET status = 'paid', payment_tx_hash = ?, paid_at = NOW() 
         WHERE wallet_id = ? AND status = 'pending_payment'`,
        [deposit.tx_hash, deposit.wallet_id]
      );
      
      if (orderUpdate.affectedRows > 0) {
        logger.info('✅ Orden actualizada a PAID', { 
          walletId: deposit.wallet_id, 
          txHash: deposit.tx_hash 
        });
      }
    });

    await AuditLog.create({
      userId: deposit.user_id,
      action: AUDIT_ACTIONS.DEPOSIT_CREDITED,
      resourceType: 'deposit',
      resourceId: deposit.id,
      details: { amount: deposit.amount, txHash: deposit.tx_hash },
    });

    logger.info('✅ Balance acreditado', { userId: deposit.user_id, amount: deposit.amount });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      logger.warn('Depósito ya acreditado (idempotencia)', { depositId: deposit.id });
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

/**
 * Convierte el valor en unidades base (sun/6 decimales) a string decimal (USDT)
 */
function extractTransferValue(tx) {
  const rawValue = tx.value || tx.value_info?.amount || tx.amount;
  
  logger.info(`🔢 [DEPOSIT SERVICE] extractTransferValue:`, {
    tx_value: tx.value,
    tx_value_info: tx.value_info,
    tx_amount: tx.amount,
    rawValue,
  });
  
  if (!rawValue) return '0';

  // TRX / USDT TRC-20 usan 6 decimales (1,000,000 = 1 USDT)
  const decimals = tx.token_info?.decimals || 6;
  const parsedValue = Number(rawValue) / Math.pow(10, decimals);

  const result = parsedValue.toFixed(2);
  logger.info(`🔢 [DEPOSIT SERVICE] Valor calculado:`, { decimals, parsedValue, result });
  
  return result;
}

export default DepositService;