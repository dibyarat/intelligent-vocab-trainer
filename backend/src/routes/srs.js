/**
 * SRS Routes - /api/srs
 * Spaced Repetition review sessions and card management
 */
const express = require('express');
const Joi = require('joi');
const { getDb } = require('../services/firebase');
const { authenticate } = require('../middleware/auth');
const {
  calculateNextReview,
  createInitialCardState,
  getDueCards,
  calculateDailyStats,
} = require('../services/srsAlgorithm');

const router = express.Router();
router.use(authenticate);

// ─── GET /api/srs/due ─────────────────────────────────────────────────────────
// Returns today's due cards for the user (with word data joined)
router.get('/due', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const db = getDb();
    const userId = req.user.userId;

    // Fetch all SRS cards with nextReviewDate <= tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const cardsSnap = await db
      .collection('users').doc(userId)
      .collection('srs_cards')
      .where('nextReviewDate', '<=', tomorrow.toISOString())
      .get();

    const cards = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const dueCards = getDueCards(cards, parseInt(limit));

    // Join with word data
    const enriched = await Promise.all(
      dueCards.map(async (card) => {
        const wordDoc = await db
          .collection('users').doc(userId)
          .collection('vocab_words').doc(card.wordId)
          .get();

        return {
          ...card,
          word: wordDoc.exists ? wordDoc.data() : null,
        };
      })
    );

    // Filter out cards with missing words
    const valid = enriched.filter(c => c.word !== null);

    res.json({ cards: valid, total: valid.length });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/srs/stats ───────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.userId;

    const cardsSnap = await db
      .collection('users').doc(userId)
      .collection('srs_cards')
      .get();

    const cards = cardsSnap.docs.map(d => d.data());
    const stats = calculateDailyStats(cards);

    // Fetch user streak info
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};

    res.json({
      ...stats,
      streak: userData.streak || 0,
      dailyGoal: userData.dailyGoal || 10,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/srs/review ─────────────────────────────────────────────────────
// Submit a review result for a card
router.post('/review', async (req, res, next) => {
  try {
    const schema = Joi.object({
      wordId: Joi.string().required(),
      quality: Joi.number().integer().min(0).max(5).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { wordId, quality } = value;
    const db = getDb();
    const userId = req.user.userId;

    // Get current card state
    const cardRef = db
      .collection('users').doc(userId)
      .collection('srs_cards').doc(wordId);

    const cardDoc = await cardRef.get();
    if (!cardDoc.exists) {
      return res.status(404).json({ error: 'SRS card not found for this word' });
    }

    const currentCard = cardDoc.data();

    // Calculate next review parameters
    const nextState = calculateNextReview(currentCard, quality);

    // Update card
    await cardRef.update({
      ...nextState,
      reviewCount: (currentCard.reviewCount || 0) + 1,
    });

    // Update user streak
    await updateUserStreak(db, userId);

    res.json({
      message: 'Review recorded',
      nextReviewDate: nextState.nextReviewDate,
      interval: nextState.interval,
      masteryLevel: nextState.masteryLevel,
      easeFactor: nextState.easeFactor,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/srs/reset/:wordId ─────────────────────────────────────────────
router.post('/reset/:wordId', async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.userId;
    const { wordId } = req.params;

    const initial = createInitialCardState(wordId, userId);
    await db
      .collection('users').doc(userId)
      .collection('srs_cards').doc(wordId)
      .set(initial);

    res.json({ message: 'Card reset to initial state', card: initial });
  } catch (err) {
    next(err);
  }
});

// ─── Helper: Update user streak ───────────────────────────────────────────────
async function updateUserStreak(db, userId) {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  const user = userDoc.data() || {};

  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = user.streak || 0;
  if (lastActive) {
    const lastDay = new Date(lastActive);
    lastDay.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) streak += 1;
    else if (diffDays === 0) { /* same day, no change */ }
    else streak = 1; // Streak broken
  } else {
    streak = 1;
  }

  await userRef.update({
    streak,
    lastActiveAt: new Date().toISOString(),
  });
}

module.exports = router;
