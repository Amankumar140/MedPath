const express = require('express');
const { prisma } = require('../config/database');
const { redisClient } = require('../config/redis');
const env = require('../config/env');
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const conversationRoutes = require('../modules/conversations/conversation.routes');
const locationRoutes = require('../modules/locations/location.routes');
const reviewRoutes = require('../modules/feedback/feedback.routes');
const systemRoutes = require('./system.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', conversationRoutes);
router.use('/locations', locationRoutes);
router.use('/location', locationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/system', systemRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Root endpoint
 *     description: Returns a welcome message.
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the MedPath Backend Service API!',
    environment: env.NODE_ENV,
    version: '1.0.0',
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: System health check
 *     description: Verifies connection to PostgreSQL database, Redis instance, and reports overall process health status.
 *     responses:
 *       200:
 *         description: System is healthy
 *       500:
 *         description: System has unhealthy dependencies
 */
router.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'UP',
    timestamp: new Date(),
    services: {
      uptime: `${process.uptime().toFixed(2)}s`,
      memoryUsage: process.memoryUsage(),
      database: {
        status: 'DOWN',
      },
      redis: {
        status: 'DOWN',
      },
    },
  };

  let statusCode = 200;

  // Check Database connection status and migration status
  try {
    const startDb = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTimeMs = Date.now() - startDb;
    
    healthCheck.services.database = {
      status: 'UP',
      responseTime: `${responseTimeMs}ms`,
      migrations: 'UNKNOWN',
    };

    try {
      // Query migration table to get history and status
      const migrations = await prisma.$queryRaw`
        SELECT id, migration_name, finished_at, rolled_back_at 
        FROM _prisma_migrations 
        ORDER BY started_at DESC
      `;
      
      if (migrations && migrations.length > 0) {
        const failedMigrations = migrations.filter(m => !m.finished_at || m.rolled_back_at);
        healthCheck.services.database.migrations = {
          totalApplied: migrations.length,
          latest: migrations[0].migration_name,
          status: failedMigrations.length === 0 ? 'HEALTHY' : 'UNHEALTHY',
          failed: failedMigrations.map(m => m.migration_name),
        };
        if (failedMigrations.length > 0) {
          healthCheck.status = 'DEGRADED';
          statusCode = 500;
        }
      } else {
        healthCheck.services.database.migrations = {
          totalApplied: 0,
          status: 'NO_MIGRATIONS',
        };
      }
    } catch (migError) {
      // If table doesn't exist yet, it means no migrations have been applied or DB is clean
      healthCheck.services.database.migrations = {
        status: 'PENDING_INITIALIZATION',
        message: 'Migration table not found. Run migrations first.',
      };
    }
  } catch (error) {
    healthCheck.services.database = {
      status: 'DOWN',
      error: error.message,
    };
    healthCheck.status = 'DEGRADED';
    statusCode = 500;
  }

  // Check Redis connection status
  try {
    if (redisClient.isOpen) {
      const startRedis = Date.now();
      await redisClient.ping();
      const responseTimeMs = Date.now() - startRedis;
      healthCheck.services.redis = {
        status: 'UP',
        responseTime: `${responseTimeMs}ms`,
      };
    } else {
      healthCheck.services.redis = {
        status: 'DOWN',
        message: 'Redis client is not open',
      };
      healthCheck.status = 'DEGRADED';
      statusCode = 500;
    }
  } catch (error) {
    healthCheck.services.redis = {
      status: 'DOWN',
      error: error.message,
    };
    healthCheck.status = 'DEGRADED';
    statusCode = 500;
  }

  res.status(statusCode).json(healthCheck);
});

/**
 * @swagger
 * /api/v1:
 *   get:
 *     summary: V1 Endpoint
 *     description: Returns the v1 API root message.
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'MedPath Backend API v1 Root',
    docs: '/api-docs',
  });
});

module.exports = router;
