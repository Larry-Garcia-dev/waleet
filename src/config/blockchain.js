import dotenv from 'dotenv';
dotenv.config();

export default {
  network: process.env.TRON_NETWORK || 'mainnet',
  fullNode: process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io',
  solidityNode: process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io',
  eventServer: process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io',
  apiKey: process.env.TRONGRID_API_KEY,
  usdtContract: process.env.USDT_TRC20_CONTRACT || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS, 10) || 19,
  coldWallet: process.env.COLD_WALLET_ADDRESS,
  derivationPath: "m/44'/195'/0'/0",
};
