/**
 * Notification Routes - /api/notifications
 */
const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { sendTestNotification } = require('../services/notificationScheduler');
const { getDb } = require('../services/firebase');

const router = express.Router();
router.use(authenticate);

// POST /api/notifications/token - Register or update FCM token
router.post('/token', async (req, res, next) => {
  try {
    const schema = Joi.object({
      fcmToken: Joi.string().required(),
      notificationsEnabled: Joi.boolean().default(true),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const db = getDb();
    await db.collection('users').doc(req.user.userId).update({
      fcmToken: value.fcmToken,
      notificationsEnabled: value.notificationsEnabled,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'FCM token registered successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/test - Send a test notification to the logged-in user
router.post('/test', async (req, res, next) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.userId).get();
    const user = userDoc.data();

    if (!user.fcmToken) {
      return res.status(400).json({ error: 'No FCM token registered for this user' });
    }

    const response = await sendTestNotification(req.user.userId, user.fcmToken);
    res.json({ message: 'Test notification sent', messageId: response });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/token - Unregister FCM token (opt-out)
router.delete('/token', async (req, res, next) => {
  try {
    const db = getDb();
    await db.collection('users').doc(req.user.userId).update({
      fcmToken: null,
      notificationsEnabled: false,
      updatedAt: new Date().toISOString(),
    });
    res.json({ message: 'Notifications disabled' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
