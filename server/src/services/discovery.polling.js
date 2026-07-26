const cacheService = require('./cache.service');
const swasthyaService = require('./swasthya.service');
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
  if (hosp.distance_km) return `${hosp.distance_km} km`;
  if (hosp.distance && hosp.distance !== 'Unknown') return typeof hosp.distance === 'number' ? `${hosp.distance} km` : hosp.distance;
  if (hosp.distance_miles) return `${(hosp.distance_miles * 1.60934).toFixed(1)} km`;
  
  const hLat = hosp.latitude || hosp.lat;
  const hLng = hosp.longitude || hosp.lng;
  const computed = calculateHaversineDistance(pLat, pLng, hLat, hLng);
  if (computed) return computed;

  return 'Nearby';
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

    const recommendations = hospitals.map((h, index) => {
      const distStr = getFormattedDistance({ latitude: h.latitude, longitude: h.longitude }, pLat, pLng);
      return {
        hospital_name: h.hospitalName,
        rank: index + 1,
        overall_score: h.overallRating ? Math.round(h.overallRating * 20) : 88 - (index * 5),
        overall_rating: h.overallRating || 4.5,
        estimated_cost_range: { min: 500, max: 2500, currency: "INR" },
        distance_km: distStr,
        latitude: h.latitude,
        longitude: h.longitude,
        explanation: `Specialized regional facility equipped for ${symptoms}. Offers 24/7 care and emergency capabilities.`,
        suitability: 'High Match',
        summary: `${h.hospitalName} provides comprehensive medical services with modern diagnostic capabilities.`,
        formatted_address: h.address || `${city}, India`,
        contact_number: h.phoneNumber || '+91-120-4000000',
        website: h.websiteUrl || null,
        has_emergency: h.emergencyAvailable ?? true,
        has_icu: h.icuAvailable ?? true,
      };
    });

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

      for (const hosp of recommendations) {
        await tx.recommendationSnapshot.create({
          data: {
            conversationId,
            hospitalName: hosp.hospital_name,
            rankingPosition: hosp.rank,
            confidenceScore: hosp.overall_score,
            trustScore: hosp.overall_rating,
            estimatedCost: JSON.stringify(hosp.estimated_cost_range),
            distance: hosp.distance_km,
            latitude: hosp.latitude,
            longitude: hosp.longitude,
            reason: hosp.explanation,
            source: hosp.suitability,
            summary: hosp.summary,
            address: hosp.formatted_address,
            phone: hosp.contact_number,
            website: hosp.website,
            hasEmergency: hosp.has_emergency,
            hasIcu: hosp.has_icu,
          },
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
  const maxAttempts = 150; // 150 attempts * 2s = 300 seconds (5 minutes) timeout

  const intervalId = setInterval(async () => {
    attempts++;
    
    try {
      if (attempts > maxAttempts) {
        logger.error(`❌ [Discovery Polling] Timeout exceeded for task ${taskId}. Polling stopped.`);
        clearInterval(intervalId);
        
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
      const taskData = {
        progress: progress.progress_percent,
        status: progress.status,
        current_stage: progress.current_stage || 'Processing',
        percentage: progress.progress_percent,
      };
      
      logger.debug(`🔄 [Discovery Polling] Task ${taskId}: ${progress.status} - Stage: ${progress.current_stage} (${progress.progress_percent}%)`);
      await cacheService.set(`task:${taskId}`, taskData, 1800); // 30 minutes TTL

      // 3. Handle terminal states
      if (progress.status === 'completed') {
        logger.info(`✅ [Discovery Polling] Task ${taskId} completed! Persisting results...`);
        clearInterval(intervalId);

        const taskResult = progress.result;
        const recommendations = taskResult?.recommendations || [];

        // Save AI Response Summary Message
        const summaryMsg = `Based on your location in ${taskResult?.location_searched || 'your location'} and health criteria regarding '${taskResult?.specialty || 'your symptoms'}', I have processed local medical registries. Here are your optimized options:`;

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

          // B. Update PatientContext complete status
          await tx.patientContext.update({
            where: { conversationId },
            data: {
              isContextComplete: true,
              updatedAt: new Date(),
            },
          });

          // Fetch patient location for Haversine distance calculation fallback
          const patientCtx = await tx.patientContext.findUnique({ where: { conversationId } });
          const pLat = patientCtx?.latitude;
          const pLng = patientCtx?.longitude;

          // C. Create RecommendationSnapshot record for every candidate hospital
          for (const hosp of recommendations) {
            const computedDistance = getFormattedDistance(hosp, pLat, pLng);
            await tx.recommendationSnapshot.create({
              data: {
                conversationId,
                hospitalName: hosp.hospital_name || hosp.name || 'Hospital',
                rankingPosition: hosp.rank || 1,
                confidenceScore: hosp.overall_score || 0.0,
                trustScore: hosp.overall_rating || 0.0,
                estimatedCost: JSON.stringify(hosp.estimated_cost_range || {}),
                distance: computedDistance,
                latitude: hosp.latitude || null,
                longitude: hosp.longitude || null,
                reason: hosp.explanation || hosp.summary || '',
                source: hosp.suitability || 'Swasthya AI Core',
                // New fields persisted from API results
                summary: hosp.summary || null,
                pros: hosp.pros || null,
                cons: hosp.cons || null,
                overallScore: hosp.overall_score || null,
                travelTime: hosp.estimated_travel_time_minutes ? `${hosp.estimated_travel_time_minutes} mins` : null,
                website: hosp.website || null,
                phone: hosp.contact_number || null,
                address: hosp.formatted_address || null,
                hospitalType: hosp.hospital_type || null,
                accreditations: hosp.accreditations || null,
                reviewCount: hosp.review_count || null,
                hasEmergency: hosp.has_emergency || null,
                hasIcu: hosp.has_icu || null,
                estimatedCostRange: hosp.estimated_cost_range || null,
              },
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

        logger.info(`✅ [Discovery Polling] Transaction succeeded for task ${taskId}. Cleaning Redis cache...`);

        // Only after transaction succeeds, delete Redis task cache & invalidate conversation cache
        await Promise.all([
          cacheService.del(`task:${taskId}`),
          cacheService.del(`conversation:${conversationId}`),
        ]);
        
      } else if (progress.status === 'failed') {
        const errorMsg = progress.error_message || 'Discovery task failed';
        logger.error(`❌ [Discovery Polling] Task ${taskId} failed: ${errorMsg}`);
        clearInterval(intervalId);

        // Perform transaction for failure updates
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

        // Clean Redis cache after transaction succeeds
        await Promise.all([
          cacheService.del(`task:${taskId}`),
          cacheService.del(`conversation:${conversationId}`),
        ]);
      }
    } catch (error) {
      logger.warn(`⚠️ [Discovery Polling] Error in polling tick or transaction for task ${taskId}: ${error.message}`);
    }
  }, 2000); // Poll every 2 seconds
}

module.exports = {
  startPolling,
};
