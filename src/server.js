import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase } from './config/initDatabase.js';
import app from './app.js';
import logger from './config/logger.js';
import pool from './config/database.js';

const PORT = parseInt(process.env.PORT, 10) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  // Paso 1: Crear base de datos y tablas automaticamente
  try {
    await initializeDatabase();
  } catch (err) {
    logger.error('Fallo la inicializacion de la base de datos');
    process.exit(1);
  }

  // Paso 2: Verificar conexion al pool
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    logger.info('Conexion a MySQL establecida correctamente');
  } catch (err) {
    logger.error('No se pudo conectar a MySQL', { error: err.message });
    logger.error('Verifique las credenciales en .env y que el servidor MySQL este activo');
    process.exit(1);
  }

  // Validar que la seed maestra este configurada
  const mnemonic = process.env.MASTER_SEED_MNEMONIC;
  if (!mnemonic || mnemonic.includes('CHANGE_ME') || mnemonic.includes('change_immediately') || mnemonic.includes('change immediately')) {
    logger.warn('MASTER_SEED_MNEMONIC usa valor por defecto. Genera una seed real para produccion.');
    logger.warn('Comando: node -e "import(\'bip39\').then(b => console.log(b.generateMnemonic()))"');
  }

  const server = app.listen(PORT, HOST, () => {
    logger.info(`Servidor iniciado en ${HOST}:${PORT}`, {
      env: process.env.NODE_ENV || 'development',
      node: process.version,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`Senal ${signal} recibida. Cerrando servidor...`);

    server.close(async () => {
      logger.info('Servidor HTTP cerrado');

      try {
        await pool.end();
        logger.info('Pool MySQL cerrado');
      } catch (err) {
        logger.error('Error cerrando pool MySQL', { error: err.message });
      }

      process.exit(0);
    });

    // Forzar cierre despues de 10 segundos
    setTimeout(() => {
      logger.error('Forzar cierre: timeout de shutdown excedido');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason: String(reason) });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    shutdown('UNCAUGHT_EXCEPTION');
  });
}

startServer();
