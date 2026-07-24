import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

const SCHEMA_SQL = `
CREATE DATABASE IF NOT EXISTS crypto_payments
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE crypto_payments;

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

CREATE TABLE IF NOT EXISTS derivation_counter (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  current_index INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO derivation_counter (id, current_index) VALUES (1, 0);

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

CREATE TABLE IF NOT EXISTS products (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  price_usdt    DECIMAL(20, 6) NOT NULL,
  image_url     VARCHAR(500) NULL,
  category      VARCHAR(100) NULL,
  stock         INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  product_id      INT UNSIGNED NOT NULL,
  quantity        INT UNSIGNED NOT NULL DEFAULT 1,
  total_amount    DECIMAL(20, 6) NOT NULL,
  wallet_id       INT UNSIGNED NULL,
  wallet_address  VARCHAR(64) NULL,
  payment_tx_hash VARCHAR(128) NULL,
  status          ENUM('pending_payment', 'awaiting_confirmation', 'paid', 'completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending_payment',
  expires_at      DATETIME NOT NULL,
  paid_at         DATETIME NULL,
  completed_at    DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_expires_at (expires_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO products (id, name, description, price_usdt, image_url, category, stock) VALUES
(1, 'Audifonos Bluetooth Pro', 'Audifonos inalambricos con cancelacion de ruido activa, 30h de bateria', 49.990000, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'Electronica', 50),
(2, 'Smartwatch Fitness', 'Reloj inteligente con monitor cardiaco, GPS y resistencia al agua', 89.990000, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'Electronica', 30),
(3, 'Mochila Urban Tech', 'Mochila antirrobo con puerto USB y compartimento para laptop 15"', 39.990000, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', 'Accesorios', 100),
(4, 'Lampara LED Escritorio', 'Lampara con regulacion de brillo y temperatura de color, carga inalambrica', 29.990000, 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400', 'Hogar', 75),
(5, 'Teclado Mecanico RGB', 'Teclado gaming con switches Cherry MX, retroiluminacion RGB por tecla', 74.990000, 'https://images.unsplash.com/photo-1541140532154-b024d1b23faf?w=400', 'Electronica', 40),
(6, 'Botella Termica 750ml', 'Botella de acero inoxidable, mantiene temperatura 24h frio / 12h caliente', 19.990000, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', 'Accesorios', 200);
`;

export async function initializeDatabase() {
  let connection;

  try {
    logger.info('Inicializando base de datos...');

    connection = await mysql.createConnection(DB_CONFIG);

    await connection.query(SCHEMA_SQL);

    logger.info('Base de datos inicializada correctamente');
    logger.info('Tablas creadas: users, wallets, deposits, sweeps, audit_logs, derivation_counter, sessions, products, orders');

  } catch (err) {
    logger.error('Error inicializando base de datos', {
      error: err.message,
      code: err.code,
    });

    if (err.code === 'ECONNREFUSED') {
      logger.error('No se pudo conectar a MySQL. Verifica que el servidor esté activo.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error('Credenciales de MySQL incorrectas. Verifica DB_USER y DB_PASSWORD en .env');
    }

    throw err;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
