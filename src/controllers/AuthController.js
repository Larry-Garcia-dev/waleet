import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { AUDIT_ACTIONS } from '../utils/constants.js';
import { sanitizeForLog } from '../utils/crypto.js';
import logger from '../config/logger.js';

const AuthController = {
  /**
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, fullName } = req.body;

      const existing = await User.findByEmail(email);
      if (existing) {
        throw new AppError('El email ya esta registrado', 409, 'EMAIL_EXISTS');
      }

      const userId = await User.create({ email, password, fullName });

      await AuditLog.create({
        userId,
        action: AUDIT_ACTIONS.USER_REGISTER,
        resourceType: 'user',
        resourceId: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      logger.info('Usuario registrado', { userId, email: email.substring(0, 3) + '***' });

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        data: {
          id: userId,
          email,
          fullName,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        await AuditLog.create({
          action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
          details: { email: email.substring(0, 3) + '***', reason: 'user_not_found' },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS');
      }

      const isValid = await User.verifyPassword(password, user.password_hash);
      if (!isValid) {
        await AuditLog.create({
          userId: user.id,
          action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
          details: { reason: 'wrong_password' },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError('Credenciales invalidas', 401, 'INVALID_CREDENTIALS');
      }

      if (user.status === 'suspended') {
        throw new AppError('Cuenta suspendida. Contacte soporte.', 403, 'ACCOUNT_SUSPENDED');
      }

      await User.updateLastLogin(user.id, req.ip);

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      await AuditLog.create({
        userId: user.id,
        action: AUDIT_ACTIONS.USER_LOGIN,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        message: 'Login exitoso',
        data: {
          token,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '1h',
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            balance: user.balance,
            status: user.status,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError('Refresh token requerido', 400);
      }

      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const user = await User.findById(decoded.sub);
      if (!user || user.status === 'suspended') {
        throw new AppError('Token invalido', 401);
      }

      const newToken = generateToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        },
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        return next(new AppError('Refresh token invalido o expirado', 401));
      }
      next(err);
    }
  },

  /**
   * POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);

      const isValid = await User.verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        throw new AppError('Contrasena actual incorrecta', 400, 'WRONG_PASSWORD');
      }

      await User.changePassword(user.id, newPassword);

      await AuditLog.create({
        userId: user.id,
        action: AUDIT_ACTIONS.PASSWORD_CHANGE,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Contrasena actualizada exitosamente' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/auth/me
   */
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      res.json({
        data: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          balance: user.balance,
          status: user.status,
          kycVerified: user.kyc_verified,
          createdAt: user.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

export default AuthController;
