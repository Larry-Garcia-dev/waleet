export const DEPOSIT_STATUS = {
  PENDING: 'pending',
  CONFIRMING: 'confirming',
  CONFIRMED: 'confirmed',
  CREDITED: 'credited',
  FAILED: 'failed',
};

export const SWEEP_STATUS = {
  PENDING: 'pending',
  BROADCAST: 'broadcast',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING_KYC: 'pending_kyc',
};

export const TOKEN = {
  SYMBOL: 'USDT',
  NETWORK: 'TRC-20',
  DECIMALS: 6,
};

export const AUDIT_ACTIONS = {
  USER_REGISTER: 'user.register',
  USER_LOGIN: 'user.login',
  USER_LOGIN_FAILED: 'user.login_failed',
  USER_LOGOUT: 'user.logout',
  WALLET_GENERATED: 'wallet.generated',
  DEPOSIT_DETECTED: 'deposit.detected',
  DEPOSIT_CONFIRMED: 'deposit.confirmed',
  DEPOSIT_CREDITED: 'deposit.credited',
  SWEEP_INITIATED: 'sweep.initiated',
  SWEEP_CONFIRMED: 'sweep.confirmed',
  SWEEP_FAILED: 'sweep.failed',
  ADMIN_ACTION: 'admin.action',
  PASSWORD_CHANGE: 'user.password_change',
  KYC_VERIFIED: 'user.kyc_verified',
};
