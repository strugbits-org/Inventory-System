import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Resinwerks Inventory System API',
            version: '1.0.0',
            description: 'API documentation for the Resinwerks Inventory System after refactoring.',
            contact: {
                name: 'API Support',
                url: 'https://resinwerks.com',
            },
        },
        servers: [
            {
                url: `http://localhost:${env.PORT}/api/v1`,
                description: 'Local development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/v1/*.ts', './src/controllers/**/*.ts'], // paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);
