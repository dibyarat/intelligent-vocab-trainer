/**
 * Auth Routes - /api/auth
 * Registration, login, profile management
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/firebase');
const { authenticate, generateToken } = require('../middleware/auth');

const router = express.Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(2).max(50).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password, displayName } = value;
    const db = getDb();

    // Check if email already exists
    const existing = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const userData = {
      userId,
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      createdAt: now,
      updatedAt: now,
      notificationsEnabled: false,
      fcmToken: null,
      dailyGoal: 10, // Default 10 words per day
      streak: 0,
      lastActiveAt: now,
    };

    await db.collection('users').doc(userId).set(userData);

    const token = generateToken(userId, email);
    const { passwordHash: _, ...userPublic } = userData;

    res.status(201).json({ token, user: userPublic });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = value;
    const db = getDb();

    const snapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();
    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last active
    await userDoc.ref.update({ lastActiveAt: new Date().toISOString() });

    const token = generateToken(user.userId, user.email);
    const { passwordHash, ...userPublic } = user;

    res.json({ token, user: userPublic });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.user.userId).get();

    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const { passwordHash, ...userPublic } = doc.data();
    res.json({ user: userPublic });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const schema = Joi.object({
      displayName: Joi.string().min(2).max(50),
      dailyGoal: Joi.number().integer().min(1).max(100),
      notificationsEnabled: Joi.boolean(),
      fcmToken: Joi.string().allow(null),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const db = getDb();
    await db.collection('users').doc(req.user.userId).update({
      ...value,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
