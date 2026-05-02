/**
 * Intelligent Vocabulary Trainer - Express Server
 * Main entry point for the backend API
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Route imports
const authRoutes = require('./routes/auth');
const vocabRoutes = require('./routes/vocab');
const srsRoutes = require('./routes/srs');
const dictionaryRoutes = require('./routes/dictionary');
const visionRoutes = require('./routes/vision');
const notificationRoutes = require('./routes/notifications');

// Service imports
const { initFirebase } = require('./services/firebase');
const { startNotificationScheduler } = require('./services/notificationScheduler');

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    // In demo/dev mode, allow all origins for local network testing
    if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/vocab', vocabRoutes);
app.use('/api/srs', srsRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Startup ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await initFirebase();
    console.log('[Firebase] Initialized successfully');

    startNotificationScheduler();
    console.log('[Scheduler] Daily notification scheduler started');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Vocab Trainer API running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

module.exports = app;
