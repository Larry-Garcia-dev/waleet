import Joi from 'joi';
import logger from '../config/logger.js';

/**
 * Middleware de validacion de input con Joi.
 * Valida body, query o params segun el esquema proporcionado.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        error: 'Datos de entrada invalidos',
        details,
      });
    }

    req[source] = value;
    next();
  };
}

// ---- Esquemas de validacion reutilizables ----

export const registerSchema = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).max(255).required()
    .messages({ 'string.email': 'Email invalido' }),
  password: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])/)
    .messages({
      'string.min': 'La contrasena debe tener minimo 8 caracteres',
      'string.pattern.base': 'La contrasena debe incluir mayusculas, minusculas, numeros y caracteres especiales',
    }),
  fullName: Joi.string().min(2).max(255).required()
    .messages({ 'string.min': 'El nombre es muy corto' }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])/),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const sweepConfigSchema = Joi.object({
  minAmount: Joi.number().positive().precision(6).required(),
});
