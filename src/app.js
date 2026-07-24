import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

import {
  helmetMiddleware,
  corsMiddleware,
  hppMiddleware,
  requestId,
  requestLogger,
  blockCommonAttacks,
  validateContentType,
} from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import depositRoutes from './routes/deposits.js';
import adminRoutes from './routes/admin.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';

const app = express();

// --- Seguridad ---
app.use(requestId);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(hppMiddleware);
app.use(blockCommonAttacks);

// --- Parsing ---
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// --- Logging ---
app.use(requestLogger);

// --- Rate limiting general ---
app.use('/api/', apiLimiter);

// --- Content-Type validation ---
app.use('/api/', validateContentType);

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// --- 404 ---
app.use(notFoundHandler);

// --- Error handler ---
app.use(errorHandler);

export default app;
