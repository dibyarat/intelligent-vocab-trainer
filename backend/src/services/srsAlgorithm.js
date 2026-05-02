/**
 * Spaced Repetition System (SRS) - SM-2 Algorithm Implementation
 *
 * Based on SuperMemo 2 algorithm by Piotr Woźniak.
 * Each word card has:
 *   - repetitions: how many times reviewed successfully
 *   - easeFactor: how easy the card is (2.5 default, min 1.3)
 *   - interval: days until next review
 *   - nextReviewDate: ISO timestamp of next scheduled review
 *   - masteryLevel: 0-5 (0=new, 1-2=learning, 3-4=reviewing, 5=mastered)
 */

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const EASE_BONUS = 0.1;
const EASE_PENALTY = 0.2;

/**
 * Quality ratings from 0 to 5:
 * 0 - Complete blackout (forgot entirely)
 * 1 - Incorrect, but remembered upon seeing answer
 * 2 - Incorrect, but seemed easy to recall
 * 3 - Correct, with significant difficulty
 * 4 - Correct, after a hesitation
 * 5 - Perfect, immediate recall
 */

/**
 * Calculate next review parameters based on quality rating (SM-2)
 * @param {Object} card - Current card state
 * @param {number} quality - Quality rating 0-5
 * @returns {Object} Updated card state
 */
function calculateNextReview(card, quality) {
  if (quality < 0 || quality > 5) {
    throw new Error('Quality rating must be between 0 and 5');
  }

  let { repetitions, easeFactor, interval } = card;

  // Ensure defaults for new cards
  repetitions = repetitions || 0;
  easeFactor = easeFactor || INITIAL_EASE_FACTOR;
  interval = interval || 0;

  if (quality >= 3) {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Failed recall - reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor (EF') = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  nextReviewDate.setHours(0, 0, 0, 0); // Set to start of day

  return {
    repetitions,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    interval,
    nextReviewDate: nextReviewDate.toISOString(),
    lastReviewedAt: new Date().toISOString(),
    masteryLevel: calculateMasteryLevel(repetitions, easeFactor),
  };
}

/**
 * Calculate mastery level 0-5 from SRS state
 */
function calculateMasteryLevel(repetitions, easeFactor) {
  if (repetitions === 0) return 0;
  if (repetitions === 1) return 1;
  if (repetitions <= 3) return 2;
  if (repetitions <= 5) return 3;
  if (easeFactor >= 2.3) return 4;
  return 5;
}

/**
 * Create initial card state for a new word
 * @param {string} wordId - Firestore word document ID
 * @param {string} userId - User ID
 */
function createInitialCardState(wordId, userId) {
  const now = new Date().toISOString();
  return {
    wordId,
    userId,
    repetitions: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    interval: 0,
    nextReviewDate: now, // Due immediately
    lastReviewedAt: null,
    masteryLevel: 0,
    addedAt: now,
    reviewCount: 0,
    streak: 0,
  };
}

/**
 * Get due cards for a user - cards where nextReviewDate <= today
 * @param {Array} cards - Array of card objects from Firestore
 * @param {number} limit - Max cards to return
 */
function getDueCards(cards, limit = 20) {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today

  return cards
    .filter(card => {
      if (!card.nextReviewDate) return true; // New cards are always due
      return new Date(card.nextReviewDate) <= now;
    })
    .sort((a, b) => {
      // Prioritize: overdue first, then by mastery level (lowest first)
      const dateA = new Date(a.nextReviewDate || 0);
      const dateB = new Date(b.nextReviewDate || 0);
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
      return (a.masteryLevel || 0) - (b.masteryLevel || 0);
    })
    .slice(0, limit);
}

/**
 * Calculate daily stats for a user
 */
function calculateDailyStats(cards) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueToday = cards.filter(c => {
    const nextReview = new Date(c.nextReviewDate || 0);
    return nextReview < tomorrow;
  }).length;

  const mastered = cards.filter(c => c.masteryLevel === 5).length;
  const learning = cards.filter(c => c.masteryLevel > 0 && c.masteryLevel < 5).length;
  const newCards = cards.filter(c => c.masteryLevel === 0).length;

  return { dueToday, mastered, learning, newCards, total: cards.length };
}

module.exports = {
  calculateNextReview,
  createInitialCardState,
  getDueCards,
  calculateDailyStats,
  calculateMasteryLevel,
};
