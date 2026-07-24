import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import logger from '../config/logger.js';

/**
 * Configuracion de Helmet para cabeceras HTTP seguras.
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * Configuracion de CORS.
 */
export const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  maxAge: 86400,
  optionsSuccessStatus: 204,
});

/**
 * Proteccion contra HTTP Parameter Pollution.
 */
export const hppMiddleware = hpp();

/**
 * Middleware para generar un request ID unico.
 */
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

/**
 * Middleware de logging de requests.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      requestId: req.requestId,
    });
  });
  next();
}

/**
 * Bloqueo de rutas comunes de escaneo de vulnerabilidades.
 */
export function blockCommonAttacks(req, res, next) {
  const blocked = [
    /\.env/i,
    /\.git/i,
    /wp-admin/i,
    /wp-login/i,
    /phpmyadmin/i,
    /\.php$/i,
    /etc\/passwd/i,
    /\.\.\//,
  ];

  if (blocked.some(pattern => pattern.test(req.path))) {
    logger.warn('Intento de acceso a ruta bloqueada', {
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}

/**
 * Validacion de Content-Type para requests con body.
 */
export function validateContentType(req, res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({ error: 'Content-Type debe ser application/json' });
    }
  }
  next();
}
