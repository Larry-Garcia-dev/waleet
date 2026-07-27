import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import DepositService from '../services/DepositService.js';
import logger from '../config/logger.js';

// Usamos 6 asteriscos (*/15 * * * * *) para indicar SEGUNDOS en node-cron
const CRON_SCHEDULE = process.env.DEPOSIT_CRON || '*/15 * * * * *';

let isRunning = false;

async function runDepositMonitor() {
  if (isRunning) {
    logger.warn('Monitor de depositos ya en ejecucion, saltando iteracion');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('🔍 [MONITOR] Escaneando blockchain (Nile) en busca de depósitos...');
    const results = await DepositService.checkAllDeposits();
    const duration = Date.now() - startTime;

    logger.info('✅ [MONITOR] Verificación completada', {
      ...results,
      duration: `${duration}ms`,
    });
  } catch (err) {
    logger.error('❌ [MONITOR] Error verificando depósitos', {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isRunning = false;
  }
}

logger.info(`🚀 Monitor de depositos iniciado con cron: ${CRON_SCHEDULE}`);

// 1. Ejecución inmediata al encender el servicio para no esperar el primer intervalo
runDepositMonitor();

// 2. Programación del Cron cada 15 segundos
cron.schedule(CRON_SCHEDULE, runDepositMonitor, {
  scheduled: true,
  timezone: 'UTC',
});

process.on('SIGTERM', () => {
  logger.info('Monitor de depositos detenido (SIGTERM)');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Monitor de depositos detenido (SIGINT)');
  process.exit(0);
});

export { runDepositMonitor };