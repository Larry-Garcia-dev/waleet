-- ============================================================
-- Pasarela de Pagos Cripto - USDT TRC-20
-- Esquema de Base de Datos MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS crypto_payments
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE crypto_payments;

-- ------------------------------------------------------------
-- Tabla: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  balance         DECIMAL(20, 6) NOT NULL DEFAULT 0.000000,
  status          ENUM('active', 'suspended', 'pending_kyc') NOT NULL DEFAULT 'pending_kyc',
  kyc_verified    TINYINT(1) NOT NULL DEFAULT 0,
  kyc_verified_at DATETIME NULL,
  two_factor_secret VARCHAR(255) NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at   DATETIME NULL,
  last_login_ip   VARCHAR(45) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email),
  INDEX idx_status (status),
  INDEX idx_kyc (kyc_verified)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: wallets
-- Direcciones TRC-20 derivadas HD Wallet por usuario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           INT UNSIGNED NOT NULL,
  derivation_index  INT UNSIGNED NOT NULL,
  address           VARCHAR(64) NOT NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  total_received    DECIMAL(20, 6) NOT NULL DEFAULT 0.000000,
  total_swept       DECIMAL(20, 6) NOT NULL DEFAULT 0.000000,
  current_balance   DECIMAL(20, 6) NOT NULL DEFAULT 0.000000,
  last_check_at     DATETIME NULL,
  last_sweep_at     DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_address (address),
  UNIQUE KEY uk_derivation_index (derivation_index),
  INDEX idx_user_id (user_id),
  INDEX idx_active (is_active),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: deposits
-- Registro inmutable de cada deposito detectado
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deposits (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  wallet_id       INT UNSIGNED NOT NULL,
  tx_hash         VARCHAR(128) NOT NULL,
  amount          DECIMAL(20, 6) NOT NULL,
  token           VARCHAR(20) NOT NULL DEFAULT 'USDT',
  network         VARCHAR(20) NOT NULL DEFAULT 'TRC-20',
  block_number    BIGINT UNSIGNED NULL,
  confirmations   INT UNSIGNED NOT NULL DEFAULT 0,
  status          ENUM('pending', 'confirming', 'confirmed', 'credited', 'failed') NOT NULL DEFAULT 'pending',
  credited_at     DATETIME NULL,
  detected_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at    DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tx_hash (tx_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_status (status),
  INDEX idx_detected_at (detected_at),
  CONSTRAINT fk_deposits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_deposits_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: sweeps
-- Registro de barridos hacia wallet fria
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sweeps (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wallet_id         INT UNSIGNED NOT NULL,
  destination       VARCHAR(64) NOT NULL,
  amount            DECIMAL(20, 6) NOT NULL,
  tx_hash           VARCHAR(128) NULL,
  fee               DECIMAL(20, 6) NULL,
  status            ENUM('pending', 'broadcast', 'confirmed', 'failed') NOT NULL DEFAULT 'pending',
  broadcast_at      DATETIME NULL,
  confirmed_at      DATETIME NULL,
  error_message     TEXT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sweep_tx_hash (tx_hash),
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_status (status),
  CONSTRAINT fk_sweeps_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: audit_logs
-- Log inmutable de auditoria
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NULL,
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NULL,
  resource_id   INT UNSIGNED NULL,
  details       JSON NULL,
  ip_address    VARCHAR(45) NULL,
  user_agent    TEXT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: derivation_counter
-- Lleva el conteo global de indices derivados (evita colisiones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS derivation_counter (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  current_index INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO derivation_counter (id, current_index) VALUES (1, 0);

-- ------------------------------------------------------------
-- Tabla: sessions
-- Control de sesiones activas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id            VARCHAR(128) PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  ip_address    VARCHAR(45) NOT NULL,
  user_agent    TEXT NULL,
  expires_at    DATETIME NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Vista: resumen de usuarios con saldo
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_balances AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.balance,
  u.status,
  u.kyc_verified,
  COUNT(DISTINCT w.id) AS wallet_count,
  COALESCE(SUM(d.amount), 0) AS total_deposited,
  u.created_at
FROM users u
LEFT JOIN wallets w ON w.user_id = u.id
LEFT JOIN deposits d ON d.user_id = u.id AND d.status = 'credited'
GROUP BY u.id;
