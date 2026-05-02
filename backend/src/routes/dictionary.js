/**
 * Dictionary Routes - /api/dictionary
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { lookupWord, searchWords } = require('../services/dictionaryService');

const router = express.Router();
router.use(authenticate);

// GET /api/dictionary/:word
router.get('/:word', async (req, res, next) => {
  try {
    const definition = await lookupWord(req.params.word);
    res.json(definition);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/dictionary/search?q=...
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    const results = await searchWords(q);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
