const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MedPath API Documentation',
      version: '1.0.0',
      description: 'REST API documentation for the MedPath AI-powered healthcare platform backend.',
      contact: {
        name: 'MedPath Development Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter Firebase ID Token in the format: Bearer <token>',
        },
      },
    },
  },
  // Paths to API definitions (routes and controllers)
  apis: [
    './src/routes/*.js',
    './src/modules/**/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
