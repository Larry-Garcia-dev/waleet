import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Rate limiter general para toda la API.
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente mas tarde.' },
  keyGenerator: (req) => req.ip,
});

/**
 * Rate limiter estricto para endpoints de autenticacion.
 */
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticacion. Espere antes de reintentar.' },
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: true,
});

/**
 * Slow down para endpoints sensibles (login, registro).
 */
export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: () => 500,
  maxDelayMs: 5000,
  keyGenerator: (req) => req.ip,
});

/**
 * Rate limiter para endpoints de wallet/QR.
 */
export const walletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de solicitudes de wallet excedido.' },
});
