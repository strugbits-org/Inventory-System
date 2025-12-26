import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import logger from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';
import { swaggerSpec } from './config/swagger.js';

export const createApp = (): Application => {
    const app: Application = express();

    // Security middlewares
    app.use(helmet());
    
    // API Documentation
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    
    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
    });
    
    // Apply rate limiter to all routes
    app.use('/api', limiter);

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
