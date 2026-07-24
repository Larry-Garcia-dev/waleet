import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import SweepService from '../services/SweepService.js';
import logger from '../config/logger.js';

const CRON_SCHEDULE = process.env.SWEEP_CRON || '*/30 * * * *';

let isRunning = false;

async function runSweepJob() {
  if (isRunning) {
    logger.warn('Sweep job ya en ejecucion, saltando iteracion');
    return;
  }

  if (process.env.SWEEP_ENABLED !== 'true') {
    logger.debug('Sweep job deshabilitado');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('Iniciando sweep job...');
    const results = await SweepService.sweepAll();
    const duration = Date.now() - startTime;

    logger.info('Sweep job finalizado', {
      ...results,
      duration: `${duration}ms`,
    });
  } catch (err) {
    logger.error('Error en sweep job', {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isRunning = false;
  }
}

logger.info(`Sweep job iniciado con cron: ${CRON_SCHEDULE}`);

cron.schedule(CRON_SCHEDULE, runSweepJob, {
  scheduled: true,
  timezone: 'UTC',
});

if (process.env.RUN_IMMEDIATE === 'true') {
  runSweepJob();
}

process.on('SIGTERM', () => {
  logger.info('Sweep job detenido (SIGTERM)');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Sweep job detenido (SIGINT)');
  process.exit(0);
});

export { runSweepJob };
