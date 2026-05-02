/**
 * Vision Routes - /api/vision
 * OCR image processing via Cloud Vision API
 */
const express = require('express');
const multer = require('multer');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { extractTextFromImage } = require('../services/visionService');

const router = express.Router();
router.use(authenticate);

// Store file in memory (no disk writes in Cloud Run)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed (JPEG, PNG, WEBP)'), false);
    }
    cb(null, true);
  },
});

// ─── POST /api/vision/ocr (multipart file upload) ─────────────────────────────
router.post('/ocr', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const result = await extractTextFromImage(base64Image, mimeType);

    res.json({
      fullText: result.fullText,
      words: result.words,
      wordCount: result.words.length,
      blocks: result.blocks,
    });
  } catch (err) {
    if (err.message.includes('Only image')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── POST /api/vision/ocr/base64 (JSON base64 payload) ───────────────────────
router.post('/ocr/base64', async (req, res, next) => {
  try {
    const schema = Joi.object({
      image: Joi.string().required(), // base64 string
      mimeType: Joi.string()
        .valid('image/jpeg', 'image/png', 'image/webp')
        .default('image/jpeg'),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Validate base64 size (roughly 10MB decoded = ~13.3MB base64)
    if (value.image.length > 14 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 10 MB)' });
    }

    const result = await extractTextFromImage(value.image, value.mimeType);

    res.json({
      fullText: result.fullText,
      words: result.words,
      wordCount: result.words.length,
      blocks: result.blocks,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
