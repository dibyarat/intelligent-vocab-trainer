/**
 * Daily Notification Scheduler
 * Uses node-cron to send FCM push notifications to all users daily
 */
const cron = require('node-cron');
const { getDb, getMessaging } = require('./firebase');

const SCHEDULE = process.env.NOTIFICATION_CRON_SCHEDULE || '0 9 * * *'; // 9 AM daily

/**
 * Start the cron-based notification scheduler
 */
function startNotificationScheduler() {
  if (!cron.validate(SCHEDULE)) {
    console.error(`[Scheduler] Invalid cron schedule: ${SCHEDULE}`);
    return;
  }

  cron.schedule(SCHEDULE, async () => {
    console.log('[Scheduler] Triggering daily revision notifications...');
    try {
      await sendDailyRevisionNotifications();
    } catch (err) {
      console.error('[Scheduler] Notification job failed:', err.message);
    }
  }, { timezone: 'UTC' });

  console.log(`[Scheduler] Notification cron scheduled: ${SCHEDULE}`);
}

/**
 * Fetch all users with FCM tokens and send daily revision reminders
 */
async function sendDailyRevisionNotifications() {
  const db = getDb();
  const messaging = getMessaging();

  // Get users who have FCM tokens and want notifications
  const snapshot = await db.collection('users')
    .where('notificationsEnabled', '==', true)
    .where('fcmToken', '!=', null)
    .limit(500) // Batch limit
    .get();

  if (snapshot.empty) {
    console.log('[Scheduler] No users with notifications enabled.');
    return;
  }

  let sent = 0;
  let failed = 0;
  const staleTokens = [];

  for (const doc of snapshot.docs) {
    const user = doc.data();
    if (!user.fcmToken) continue;

    // Get the user's due cards count
    const dueCount = await getDueCardCount(doc.id);

    const message = buildNotificationMessage(user.fcmToken, dueCount, user.displayName);

    try {
      await messaging.send(message);
      sent++;
    } catch (err) {
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        // Mark token for cleanup
        staleTokens.push(doc.id);
      }
      console.warn(`[Scheduler] Failed to notify user ${doc.id}:`, err.code);
      failed++;
    }
  }

  // Clean up stale FCM tokens
  if (staleTokens.length > 0) {
    const batch = db.batch();
    staleTokens.forEach(uid => {
      batch.update(db.collection('users').doc(uid), { fcmToken: null });
    });
    await batch.commit();
    console.log(`[Scheduler] Cleaned ${staleTokens.length} stale FCM tokens`);
  }

  console.log(`[Scheduler] Notifications: ${sent} sent, ${failed} failed out of ${snapshot.size} users`);
}

/**
 * Count how many cards a user has due today
 */
async function getDueCardCount(userId) {
  const db = getDb();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const snapshot = await db
    .collection('users').doc(userId)
    .collection('srs_cards')
    .where('nextReviewDate', '<=', tomorrow.toISOString())
    .get();

  return snapshot.size;
}

/**
 * Build a FCM notification message
 */
function buildNotificationMessage(token, dueCount, displayName) {
  const firstName = (displayName || 'there').split(' ')[0];
  const body = dueCount > 0
    ? `You have ${dueCount} word${dueCount > 1 ? 's' : ''} to review today. Keep your streak alive! 🔥`
    : `No words due today — great job! Add new words to keep learning. 📚`;

  return {
    token,
    notification: {
      title: `Hey ${firstName}! Daily vocab check-in 🧠`,
      body,
    },
    data: {
      type: 'DAILY_REVISION',
      dueCount: String(dueCount),
      openScreen: 'SRS_REVIEW',
    },
    webpush: {
      notification: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        actions: [
          { action: 'start_review', title: '▶ Start Review' },
          { action: 'dismiss', title: 'Later' },
        ],
      },
      fcmOptions: {
        link: '/review',
      },
    },
  };
}

/**
 * Manually trigger notification for a single user (for testing)
 */
async function sendTestNotification(userId, fcmToken) {
  const messaging = getMessaging();
  const dueCount = await getDueCardCount(userId);
  const message = buildNotificationMessage(fcmToken, dueCount, 'Tester');
  const response = await messaging.send(message);
  return response;
}

module.exports = { startNotificationScheduler, sendTestNotification, sendDailyRevisionNotifications };
