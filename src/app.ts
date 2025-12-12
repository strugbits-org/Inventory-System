import express, { Application, Request, Response } from 'express';
import { env } from './config/env';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';

export const createApp = (): Application => {
  const app: Application = express();

  app.set('trust proxy', 1);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req: Request, res: Response, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  });

  // CORS middleware
  app.use((req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', env.FRONTEND_URL);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    });
  });

  // API routes
  app.use('/api', routes);

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Resinwerks Inventory System API',
      version: '1.0.0',
      documentation: '/api/docs',
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};

export default createApp;
