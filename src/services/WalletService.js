import { TronWeb } from 'tronweb';
import bip39 from 'bip39';
import WalletModel from '../models/Wallet.js';
import blockchainConfig from '../config/blockchain.js';
import logger from '../config/logger.js';

let tronWebInstance = null;

function getTronWeb() {
  if (!tronWebInstance) {
    tronWebInstance = new TronWeb({
      fullHost: blockchainConfig.fullNode,
      headers: { 'TRON-PRO-API-KEY': blockchainConfig.apiKey },
    });
  }
  return tronWebInstance;
}

/**
 * Obtiene la seed maestra mnemonica desde la variable de entorno.
 * En produccion, esta deberia estar cifrada y descifrarse via KMS/HSM.
 */
function getMasterMnemonic() {
  const mnemonic = process.env.MASTER_SEED_MNEMONIC;
  if (!mnemonic) {
    throw new Error('MASTER_SEED_MNEMONIC no configurada. Configurar en .env');
  }
  if (!bip39.validateMnemonic(mnemonic)) {
    logger.warn('La semilla mnemonica no es valida (BIP39). Usando seed de desarrollo.');
    return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  }
  return mnemonic;
}

/**
 * Deriva una direccion TRC-20 para un indice dado.
 * Ruta BIP44 para Tron: m/44'/195'/0'/0/{index}
 */
function deriveAddress(index) {
  const mnemonic = getMasterMnemonic();
  const path = `${blockchainConfig.derivationPath}/${index}`;
  const tronWeb = getTronWeb();
  const account = tronWeb.fromMnemonic(mnemonic, path);
  return {
    address: account.address,
    privateKey: account.privateKey,
  };
}

const WalletService = {
  /**
   * Genera una nueva direccion unica para un usuario.
   * Obtiene el siguiente indice de derivacion disponible (atomico).
   */
  async generateWalletForUser(userId) {
    const derivationIndex = await WalletModel.getNextDerivationIndex();
    const { address } = deriveAddress(derivationIndex);

    const walletId = await WalletModel.create({
      userId,
      derivationIndex,
      address,
    });

    logger.info('Wallet generada para usuario', {
      userId,
      derivationIndex,
      address: address.substring(0, 8) + '...',
    });

    return {
      id: walletId,
      address,
      derivationIndex,
    };
  },

  /**
   * Obtiene la clave privada para una direccion (solo para operaciones internas).
   * NUNCA exponer al frontend.
   */
  getPrivateKeyForAddress(address) {
    const wallet = WalletModel.findByAddress(address);
    if (!wallet) {
      throw new Error(`Wallet no encontrada: ${address}`);
    }
    const { privateKey } = deriveAddress(wallet.derivation_index);
    return privateKey;
  },

  /**
   * Obtiene las wallets de un usuario.
   */
  async getUserWallets(userId) {
    const wallets = await WalletModel.findByUserId(userId);
    return wallets.map(w => ({
      id: w.id,
      address: w.address,
      isActive: w.is_active,
      currentBalance: w.current_balance,
      totalReceived: w.total_received,
      createdAt: w.created_at,
    }));
  },

  /**
   * Busca el usuario propietario de una direccion.
   */
  async getOwnerByAddress(address) {
    return WalletModel.findByAddress(address);
  },

  /**
   * Valida que una direccion TRC-20 sea valida.
   */
  isValidTronAddress(address) {
    return TronWeb.isAddress(address);
  },
};

export default WalletService;
