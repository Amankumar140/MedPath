const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const swaggerSpec = require('./config/swagger');
const loggerMiddleware = require('./middleware/logger.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const routes = require('./routes');

const app = express();

// 1. Trust proxy if behind load balancers (needed for correct rate limiting)
app.set('trust proxy', 1);

// 2. Global Security Middlewares
app.use(helmet());

const allowedOrigins = env.CLIENT_URL ? env.CLIENT_URL.split(',').map(o => o.trim()) : [];
app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? (allowedOrigins.length > 0 ? (allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins) : false)
    : true, // Allow all origins in development
  credentials: true,
}));

// 3. Performance & Optimization Middlewares
app.use(compression());

// 4. Request Logging Middleware (integrated with Winston)
app.use(loggerMiddleware);

// 5. Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.SESSION_SECRET));

// 6. Global Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP in production vs development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes',
      statusCode: 429,
    },
  },
});
app.use(limiter);

// 7. Swagger Documentation API Dashboard
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 8. Register Base Routes
// Base routes include GET / and GET /health
app.use('/', routes);

// 9. API Versioning Prefix
// Also register base router under prefix so GET /api/v1 maps correctly
app.use(env.API_PREFIX, routes);

// 10. Fallback Catch-all 404 Route
app.use(notFoundMiddleware);

// 11. Centralized Global Error Handler Middleware
app.use(errorMiddleware);

module.exports = app;
