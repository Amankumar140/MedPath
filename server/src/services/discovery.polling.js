const cacheService = require('./cache.service');
const swasthyaService = require('./swasthya.service');
const { normalizeHospital, normalizeLocalHospital, toSnapshotCreateData } = require('./hospital.normalizer');
const db = require('../config/database');
const logger = require('../config/logger');

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
    return null;
  }
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 1 ? `${(d * 1000).toFixed(0)} m` : `${d.toFixed(1)} km`;
}

function getFormattedDistance(hosp, pLat, pLng) {
  if (hosp.distance_km) {
    return typeof hosp.distance_km === 'string' && (hosp.distance_km.includes('km') || hosp.distance_km.includes('m'))
      ? hosp.distance_km
      : `${hosp.distance_km} km`;
  }
  if (hosp.distance && hosp.distance !== 'Unknown' && hosp.distance !== 'Nearby') {
    return typeof hosp.distance === 'number' ? `${hosp.distance} km` : hosp.distance;
  }
  if (hosp.distance_miles) return `${(hosp.distance_miles * 1.60934).toFixed(1)} km`;
  
  const hLat = hosp.latitude || hosp.lat;
  const hLng = hosp.longitude || hosp.lng;
  const computed = calculateHaversineDistance(pLat, pLng, hLat, hLng);
  if (computed) return computed;

  return null;
}

async function executeLocalHospitalDiscovery(conversationId, taskId) {
  logger.info(`🏥 [Local Discovery Fallback] Executing local database hospital search for conversation ${conversationId}`);
  
  await cacheService.set(`task:${taskId}`, {
    progress: 50,
    status: 'running',
    current_stage: 'Searching Regional Registries',
    percentage: 50,
  }, 1800);

  try {
    const patientCtx = await db.prisma.patientContext.findUnique({ where: { conversationId } });
    const city = patientCtx?.city || patientCtx?.location || 'Greater Noida';
    const pLat = patientCtx?.latitude;
    const pLng = patientCtx?.longitude;
    const symptoms = patientCtx?.symptoms || 'general health evaluation';

    let hospitals = await db.prisma.hospital.findMany({
      where: {
        OR: [
          { city: { contains: city, mode: 'insensitive' } },
          { address: { contains: city, mode: 'insensitive' } },
        ]
      },
      take: 4,
    });

    if (!hospitals || hospitals.length === 0) {
      hospitals = await db.prisma.hospital.findMany({ take: 4 });
    }

    // Use centralised normalizer for canonical structure
    const recommendations = hospitals.map((h, index) =>
      normalizeLocalHospital(h, index, {
        symptoms,
        city,
        patientLat: pLat,
        patientLng: pLng,
        distanceFn: getFormattedDistance,
      })
    );

    const summaryMsg = `Based on your location in ${city} and health criteria regarding '${symptoms}', I have processed local medical registries. Here are your optimized options:`;

    await db.prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id: conversationId },
        data: { status: 'COMPLETED', updatedAt: new Date() },
      });

      await tx.patientContext.update({
        where: { conversationId },
        data: { isContextComplete: true, updatedAt: new Date() },
      });

      for (const canonical of recommendations) {
        await tx.recommendationSnapshot.create({
          data: toSnapshotCreateData(conversationId, canonical),
        });
      }

      await tx.conversationMessage.create({
        data: {
          conversationId,
          sender: 'AI',
          message: summaryMsg,
          messageType: 'FINAL',
        },
      });
    });

    await cacheService.set(`task:${taskId}`, {
      progress: 100,
      status: 'completed',
      current_stage: 'Completed',
      percentage: 100,
    }, 1800);

    await cacheService.del(`conversation:${conversationId}`);

    logger.info(`✅ [Local Discovery Fallback] Local hospital discovery completed for conversation ${conversationId}`);
  } catch (err) {
    logger.error(`❌ [Local Discovery Fallback Error]: ${err.message}`);
  }
}

/**
 * Polls the Swasthya discovery task progress every 2 seconds,
 * caching status in Redis and writing final recommendations to PostgreSQL on completion.
 * Executes background loop out-of-band of the request-response cycle.
 * 
 * @param {string} conversationId - The UUID of the conversation.
 * @param {string} taskId - The Swasthya discovery task UUID.
 */
function startPolling(conversationId, taskId) {
  logger.info(`🔄 [Discovery Polling] Started polling background task ${taskId} for conversation ${conversationId}`);

  if (taskId && taskId.startsWith('task-local-')) {
    executeLocalHospitalDiscovery(conversationId, taskId);
    return;
  }
  
  let attempts = 0;
  let isTickRunning = false;
  let hasHandledCompletion = false;
  const maxAttempts = 150; // 150 attempts * 2s = 300 seconds (5 minutes) timeout

  const intervalId = setInterval(async () => {
    if (isTickRunning || hasHandledCompletion) return;
    isTickRunning = true;
    attempts++;
    
    try {
      if (attempts > maxAttempts) {
        logger.error(`❌ [Discovery Polling] Timeout exceeded for task ${taskId}. Polling stopped.`);
        clearInterval(intervalId);
        hasHandledCompletion = true;
        
        // Update Redis task status
        await cacheService.set(`task:${taskId}`, {
          status: 'failed',
          progress: 100,
          current_stage: 'Timeout',
          error_message: 'Polling timeout exceeded',
        }, 1800);
        return;
      }

      // 1. Fetch current task progress from Swasthya AI Core
      const progressRes = await swasthyaService.getTaskProgress(taskId);
      const progress = progressRes.data;

      // 2. Cache status in Redis immediately (Never hit PostgreSQL during polling)
      // FIX: Support both progress.percentage and progress.progress_percent
      const progressPct = progress.percentage ?? progress.progress_percent ?? 0;
      
      // IMPORTANT: Do NOT cache 'completed' before DB transaction — this causes a race
      // condition where the frontend sees "completed" but the DB hasn't persisted yet.
      const isTerminal = progress.status === 'completed' || progress.status === 'failed';
      const taskData = {
        progress: isTerminal ? 95 : progressPct,
        status: isTerminal ? 'running' : progress.status,
        current_stage: isTerminal ? 'Preparing Recommendations' : (progress.current_stage || 'Processing'),
        percentage: isTerminal ? 95 : progressPct,
      };
      
      logger.debug(`🔄 [Discovery Polling] Task ${taskId}: ${progress.status} - Stage: ${progress.current_stage} (${progressPct}%)`);
      await cacheService.set(`task:${taskId}`, taskData, 1800); // 30 minutes TTL

      // 3. Handle terminal states
      if (progress.status === 'completed') {
        if (hasHandledCompletion) return;
        hasHandledCompletion = true;
        clearInterval(intervalId);
        logger.info(`✅ [Discovery Polling] Task ${taskId} completed! Persisting results...`);

        const taskResult = progress.result;
        let rawRecommendations = taskResult?.recommendations || progress.recommendations || [];

        // Fallback to local database facilities if external web search returned 0 matches
        if (!rawRecommendations || rawRecommendations.length === 0) {
          logger.info(`⚠️ [Discovery Polling] Task ${taskId} returned 0 web recommendations. Populating from local hospital directory...`);
          const patientCtx = await db.prisma.patientContext.findUnique({ where: { conversationId } });
          const city = patientCtx?.city || patientCtx?.location || 'India';
          let localHospitals = await db.prisma.hospital.findMany({
            where: {
              OR: [
                { city: { contains: city, mode: 'insensitive' } },
                { address: { contains: city, mode: 'insensitive' } },
              ]
            },
            take: 4,
          });
          if (!localHospitals || localHospitals.length === 0) {
            localHospitals = await db.prisma.hospital.findMany({ take: 4 });
          }
          // Use centralized normalizer for local fallback
          rawRecommendations = localHospitals.map((h, index) => {
            const canonical = normalizeLocalHospital(h, index, {
              symptoms: patientCtx?.symptoms || 'your reported symptoms',
              city,
              patientLat: patientCtx?.latitude,
              patientLng: patientCtx?.longitude,
              distanceFn: getFormattedDistance,
            });
            // Return as raw-like for consistency with the normalizeHospital path below
            return canonical.rawMetadata;
          });
        }

        // Extract discovery-level context
        const discoverySpecialty = taskResult?.specialty || progress.specialty || null;
        const discoveryLocation = taskResult?.location_searched || progress.location_searched || null;

        // Save AI Response Summary Message
        const summaryMsg = `Based on your location in ${discoveryLocation || 'your location'} and health criteria regarding '${discoverySpecialty || 'your symptoms'}', I have processed local medical registries. Here are your optimized options:`;

        try {
          // Execute all database updates in a single PostgreSQL transaction
          await db.prisma.$transaction(async (tx) => {
            // A. Update conversation status to COMPLETED
            await tx.conversation.update({
              where: { id: conversationId },
              data: {
                status: 'COMPLETED',
                updatedAt: new Date(),
              },
            });

            // B. Update PatientContext complete status and persist discovery context
            const existingCtx = await tx.patientContext.findUnique({ where: { conversationId } });
            const existingContextData = existingCtx?.contextData || {};
            await tx.patientContext.update({
              where: { conversationId },
              data: {
                isContextComplete: true,
                updatedAt: new Date(),
                // Persist specialty and location_searched into contextData
                contextData: {
                  ...existingContextData,
                  discoverySpecialty: discoverySpecialty,
                  discoveryLocation: discoveryLocation,
                },
              },
            });

            // Also persist to conversation.contextData
            const conversation = await tx.conversation.findUnique({ where: { id: conversationId } });
            const existingConvoCtx = conversation?.contextData || {};
            await tx.conversation.update({
              where: { id: conversationId },
              data: {
                contextData: {
                  ...existingConvoCtx,
                  discoverySpecialty: discoverySpecialty,
                  discoveryLocation: discoveryLocation,
                },
              },
            });

            // Fetch patient location for Haversine distance calculation fallback
            const patientCtx = await tx.patientContext.findUnique({ where: { conversationId } });
            const pLat = patientCtx?.latitude;
            const pLng = patientCtx?.longitude;

            // C. Create RecommendationSnapshot record for every candidate hospital
            // Use centralized normalizer for ALL fields
            for (const rawHosp of rawRecommendations) {
              const canonical = normalizeHospital(rawHosp, {
                patientLat: pLat,
                patientLng: pLng,
                defaultSource: 'Swasthya AI Core',
                distanceFn: getFormattedDistance,
              });

              await tx.recommendationSnapshot.create({
                data: toSnapshotCreateData(conversationId, canonical),
              });
            }

            // D. Create AI Final message
            await tx.conversationMessage.create({
              data: {
                conversationId,
                sender: 'AI',
                message: summaryMsg,
                messageType: 'FINAL',
              },
            });
          });

          logger.info(`✅ [Discovery Polling] Transaction succeeded for task ${taskId}. Updating Redis...`);

          // NOW it's safe to mark the task as completed in Redis — DB has committed
          await cacheService.set(`task:${taskId}`, {
            progress: 100,
            status: 'completed',
            current_stage: 'Completed',
            percentage: 100,
          }, 60); // Short TTL — frontend will pick it up on next poll

          // Give frontend one poll cycle (2s) to see "completed" before deleting
          setTimeout(async () => {
            try {
              await Promise.all([
                cacheService.del(`task:${taskId}`),
                cacheService.del(`conversation:${conversationId}`),
              ]);
            } catch (cleanupErr) {
              logger.warn(`⚠️ [Discovery Polling] Cache cleanup error: ${cleanupErr.message}`);
            }
          }, 4000);
        } catch (txErr) {
          logger.error(`❌ [Discovery Polling] Database persistence error for task ${taskId}: ${txErr.message}`, txErr);
          await cacheService.set(`task:${taskId}`, {
            status: 'failed',
            progress: 100,
            current_stage: 'Error',
            error_message: 'Database persistence failed',
          }, 1800);
        }
        
      } else if (progress.status === 'failed') {
        const errorMsg = progress.error_message || 'Discovery task failed';
        logger.warn(`⚠️ [Discovery Polling] Task ${taskId} failed from upstream provider (${errorMsg}). Gracefully falling back to local medical registry...`);
        clearInterval(intervalId);
        hasHandledCompletion = true;

        try {
          await executeLocalHospitalDiscovery(conversationId, taskId);
        } catch (fallbackErr) {
          logger.error(`❌ [Discovery Polling] Local discovery fallback error: ${fallbackErr.message}`);
          await db.prisma.$transaction(async (tx) => {
            await tx.conversation.update({
              where: { id: conversationId },
              data: {
                status: 'COMPLETED',
                updatedAt: new Date(),
              },
            });

            await tx.conversationMessage.create({
              data: {
                conversationId,
                sender: 'AI',
                message: `Unable to complete regional healthcare discovery: ${errorMsg}. Please try re-submitting your query shortly.`,
                messageType: 'FINAL',
              },
            });
          });

          await Promise.all([
            cacheService.del(`task:${taskId}`),
            cacheService.del(`conversation:${conversationId}`),
          ]);
        }
      }
    } catch (error) {
      logger.warn(`⚠️ [Discovery Polling] Error in polling tick or transaction for task ${taskId}: ${error.message}`);
    } finally {
      isTickRunning = false;
    }
  }, 2000); // Poll every 2 seconds
}

module.exports = {
  startPolling,
};
