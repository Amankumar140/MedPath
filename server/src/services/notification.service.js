const logger = require('../config/logger');

/**
 * Placeholder service for sending notifications (e.g., Email, SMS, Push notifications)
 */
async function sendNotification(userId, title, body, channel = 'push') {
  logger.info(`🔔 [Notification Placeholder] Scheduled to user ${userId} via ${channel}: "${title}" - ${body}`);
  // In future phases, integrate real email templates or Firebase Cloud Messaging (FCM)
  return {
    success: true,
    message: 'Notification placeholder executed successfully.',
  };
}

module.exports = {
  sendNotification,
};
