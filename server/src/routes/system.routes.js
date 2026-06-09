const express = require('express');
const { verifyFirebaseToken } = require('../modules/auth/auth.middleware');
const pythonService = require('../services/python.service');
const cacheService = require('../services/cache.service');

const router = express.Router();

/**
 * @swagger
 * /system/python-health:
 *   get:
 *     summary: Retrieve Python AI service health and orchestration metrics
 *     description: Proxy endpoint verifying the status of the Python microservice. Returns availability status, round-trip latency, software version, and aggregated workflow performance counters. Cached in Redis for 30s.
 *     tags:
 *       - System
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched health and metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     availability:
 *                       type: string
 *                       enum: [UP, DOWN]
 *                       example: "UP"
 *                     latencyMs:
 *                       type: integer
 *                       example: 45
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         averageAiLatencyMs:
 *                           type: integer
 *                           example: 4200
 *                         averageWorkflowDurationMs:
 *                           type: integer
 *                           example: 4500
 *                         failureCount:
 *                           type: integer
 *                           example: 1
 *                         retryCount:
 *                           type: integer
 *                           example: 3
 *                         pythonUptimeSeconds:
 *                           type: integer
 *                           example: 1800
 *       401:
 *         description: Unauthorized
 */
router.get('/python-health', verifyFirebaseToken, async (req, res, next) => {
  try {
    const cacheKey = 'system:python-health';
    
    // Check Redis cache first
    const cachedHealth = await cacheService.get(cacheKey);
    if (cachedHealth) {
      return res.status(200).json({
        success: true,
        data: cachedHealth,
      });
    }

    // Cache miss - execute health check ping & read metrics
    const health = await pythonService.getHealth();
    const metrics = await pythonService.getSystemMetrics();

    const healthData = {
      availability: health.status,
      latencyMs: health.latencyMs,
      version: health.version,
      metrics,
    };

    // Cache the health details for 30 seconds
    await cacheService.set(cacheKey, healthData, 30);

    return res.status(200).json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
