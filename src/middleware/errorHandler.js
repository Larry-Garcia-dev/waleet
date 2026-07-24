import logger from '../config/logger.js';

/**
 * Middleware de manejo global de errores.
 * Captura cualquier error no manejado y retorna respuesta estructurada.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Error no manejado', {
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
    ip: req.ip,
  });

  const response = {
    error: err.message || 'Error interno del servidor',
  };

  if (err.code) {
    response.code = err.code;
  }

  if (!isProduction && err.details) {
    response.details = err.details;
  }

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Manejo de rutas no encontradas (404).
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
  });
}

/**
 * Error personalizado con statusCode.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
