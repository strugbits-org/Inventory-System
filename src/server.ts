import { createApp } from './app';
import { env } from './config/env';
import logger from './config/logger';
import db, { prisma } from './db/db.service';

const startServer = async () => {
  try {
    await db.connect();

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`API URL: http://localhost:${env.PORT}/api`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
    });

    // shutdown
    const serverShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await db.disconnect();
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => serverShutdown('SIGTERM'));
    process.on('SIGINT', () => serverShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      
      if (env.NODE_ENV === 'production') {
        serverShutdown('UNHANDLED_REJECTION');
      }
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      
      if (env.NODE_ENV === 'production') {
        serverShutdown('UNCAUGHT_EXCEPTION');
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default prisma;
