/**
 * Vocabulary Routes - /api/vocab
 * CRUD for user vocabulary lists
 */
const express = require('express');
const Joi = require('joi');
const { getDb } = require('../services/firebase');
const { authenticate } = require('../middleware/auth');
const { createInitialCardState } = require('../services/srsAlgorithm');
const { lookupWord } = require('../services/dictionaryService');

const router = express.Router();
router.use(authenticate);

// ─── GET /api/vocab ────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, masteryLevel, search } = req.query;
    const db = getDb();
    const userId = req.user.userId;

    let query = db
      .collection('users').doc(userId)
      .collection('vocab_words')
      .orderBy('addedAt', 'desc');

    if (masteryLevel !== undefined) {
      query = query.where('masteryLevel', '==', parseInt(masteryLevel));
    }

    const snapshot = await query.limit(parseInt(limit)).get();
    let words = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (search) {
      const q = search.toLowerCase();
      words = words.filter(w => w.word.includes(q));
    }

    res.json({ words, total: words.length, page: parseInt(page) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/vocab ───────────────────────────────────────────────────────────
// Add a word to user's vocab list + create SRS card
router.post('/', async (req, res, next) => {
  try {
    const schema = Joi.object({
      word: Joi.string().min(1).max(100).required(),
      source: Joi.string().valid('manual', 'ocr', 'dictionary', 'import').default('manual'),
      notes: Joi.string().max(500).allow('', null),
      tags: Joi.array().items(Joi.string()).max(10).default([]),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { word, source, notes, tags } = value;
    const normalized = word.toLowerCase().trim();
    const db = getDb();
    const userId = req.user.userId;

    // Check if word already exists for this user
    const existing = await db
      .collection('users').doc(userId)
      .collection('vocab_words')
      .where('word', '==', normalized)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ error: `"${normalized}" is already in your word list` });
    }

    // Look up definition automatically
    let definition = null;
    try {
      definition = await lookupWord(normalized);
    } catch (dictErr) {
      console.warn(`[Vocab] Could not auto-fetch definition for "${normalized}": ${dictErr.message}`);
    }

    const now = new Date().toISOString();
    const wordData = {
      word: normalized,
      source,
      notes: notes || null,
      tags,
      definition,
      addedAt: now,
      updatedAt: now,
      masteryLevel: 0,
    };

    // Use word as doc ID for easy lookup
    const wordRef = db
      .collection('users').doc(userId)
      .collection('vocab_words').doc(normalized);

    await wordRef.set(wordData);

    // Create initial SRS card
    const srsCard = createInitialCardState(normalized, userId);
    await db
      .collection('users').doc(userId)
      .collection('srs_cards').doc(normalized)
      .set(srsCard);

    res.status(201).json({ word: { id: normalized, ...wordData }, srsCard });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/vocab/:wordId ────────────────────────────────────────────────────
router.get('/:wordId', async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.userId;
    const doc = await db
      .collection('users').doc(userId)
      .collection('vocab_words').doc(req.params.wordId)
      .get();

    if (!doc.exists) return res.status(404).json({ error: 'Word not found' });

    // Also get SRS card state
    const cardDoc = await db
      .collection('users').doc(userId)
      .collection('srs_cards').doc(req.params.wordId)
      .get();

    res.json({
      word: { id: doc.id, ...doc.data() },
      srsCard: cardDoc.exists ? cardDoc.data() : null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/vocab/:wordId ─────────────────────────────────────────────────
router.patch('/:wordId', async (req, res, next) => {
  try {
    const schema = Joi.object({
      notes: Joi.string().max(500).allow('', null),
      tags: Joi.array().items(Joi.string()).max(10),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const db = getDb();
    const userId = req.user.userId;
    const wordRef = db
      .collection('users').doc(userId)
      .collection('vocab_words').doc(req.params.wordId);

    const doc = await wordRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Word not found' });

    await wordRef.update({ ...value, updatedAt: new Date().toISOString() });
    res.json({ message: 'Word updated' });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/vocab/:wordId ────────────────────────────────────────────────
router.delete('/:wordId', async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.userId;

    const wordRef = db
      .collection('users').doc(userId)
      .collection('vocab_words').doc(req.params.wordId);

    const doc = await wordRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Word not found' });

    // Delete both word and SRS card atomically
    const batch = db.batch();
    batch.delete(wordRef);
    batch.delete(db
      .collection('users').doc(userId)
      .collection('srs_cards').doc(req.params.wordId));
    await batch.commit();

    res.json({ message: `"${req.params.wordId}" removed from your word list` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
