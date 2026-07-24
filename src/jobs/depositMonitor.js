import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import DepositService from '../services/DepositService.js';
import logger from '../config/logger.js';

const CRON_SCHEDULE = process.env.DEPOSIT_CRON || '*/15 * * * *';

let isRunning = false;

async function runDepositMonitor() {
  if (isRunning) {
    logger.warn('Monitor de depositos ya en ejecucion, saltando iteracion');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('Iniciando monitor de depositos...');
    const results = await DepositService.checkAllDeposits();
    const duration = Date.now() - startTime;

    logger.info('Monitor de depositos finalizado', {
      ...results,
      duration: `${duration}ms`,
    });
  } catch (err) {
    logger.error('Error en monitor de depositos', {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isRunning = false;
  }
}

logger.info(`Monitor de depositos iniciado con cron: ${CRON_SCHEDULE}`);

cron.schedule(CRON_SCHEDULE, runDepositMonitor, {
  scheduled: true,
  timezone: 'UTC',
});

if (process.env.RUN_IMMEDIATE === 'true') {
  runDepositMonitor();
}

process.on('SIGTERM', () => {
  logger.info('Monitor de depositos detenido (SIGTERM)');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Monitor de depositos detenido (SIGINT)');
  process.exit(0);
});

export { runDepositMonitor };
