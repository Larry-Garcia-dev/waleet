import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../config/logger.js';

/**
 * Middleware de autenticacion JWT.
 * Extrae el token del header Authorization: Bearer <token>
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticacion requerido' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalido' });
    }
    logger.error('Error verificando JWT', { error: err.message });
    return res.status(500).json({ error: 'Error de autenticacion' });
  }
}

/**
 * Middleware de autorizacion por rol (admin).
 */
export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

/**
 * Middleware que carga el usuario completo desde la BD.
 */
export async function loadFullUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Cuenta suspendida' });
    }
    req.fullUser = user;
    next();
  } catch (err) {
    logger.error('Error cargando usuario', { userId: req.user.id, error: err.message });
    return res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Genera un JWT para un usuario.
 */
export function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: 'crypto-payments',
      audience: 'crypto-payments-api',
    }
  );
}

/**
 * Genera un refresh token.
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'crypto-payments',
    }
  );
}
