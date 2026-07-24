import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import logger from '../config/logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Cifra un valor sensible (seed, private keys) con AES-256-GCM.
 * Retorna: salt + iv + tag + ciphertext (todo en hex).
 */
export function encrypt(plaintext, masterKey) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString('hex');
}

/**
 * Descifra un valor cifrado con encrypt().
 */
export function decrypt(encryptedHex, masterKey) {
  const buf = Buffer.from(encryptedHex, 'hex');
  const salt = buf.subarray(0, SALT_LENGTH);
  const iv = buf.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buf.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Hash SHA-256 de un string (para fingerprints, no para passwords).
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Genera un nonce seguro para uso general.
 */
export function generateNonce(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Comparacion segura de strings (timing-safe).
 */
export function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Sanitiza datos sensibles antes de loggear.
 */
export function sanitizeForLog(obj, sensitiveKeys = ['password', 'privateKey', 'seed', 'mnemonic', 'secret', 'token', 'apiKey']) {
  const sanitized = { ...obj };
  for (const key of sensitiveKeys) {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

/**
 * Convierte cantidad de satoshis a formato USDT (6 decimales).
 */
export function fromSun(sunAmount) {
  return (BigInt(sunAmount) / BigInt(1_000_000)).toString();
}

/**
 * Convierte USDT a la representacion en cadena (6 decimales).
 */
export function toChainAmount(usdtAmount) {
  const num = parseFloat(usdtAmount);
  if (isNaN(num) || num <= 0) return '0';
  return Math.floor(num * 1_000_000).toString();
}
