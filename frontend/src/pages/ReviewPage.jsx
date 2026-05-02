import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { srsAPI } from '../api';
import toast from 'react-hot-toast';

const QUALITY_BUTTONS = [
  { q: 0, label: 'Forgot', emoji: '❌', color: '#f43f5e', desc: 'No idea' },
  { q: 2, label: 'Hard',   emoji: '😓', color: '#f59e0b', desc: 'Barely remembered' },
  { q: 3, label: 'Good',   emoji: '🙂', color: '#eab308', desc: 'Got it after thinking' },
  { q: 4, label: 'Easy',   emoji: '😊', color: '#10b981', desc: 'Quick recall' },
  { q: 5, label: 'Perfect',emoji: '🌟', color: '#06b6d4', desc: 'Instant recall' },
];

export default function ReviewPage() {
  const [cards, setCards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => { loadDueCards(); }, []);

  async function loadDueCards() {
    setLoading(true);
    try {
      const { data } = await srsAPI.getDueCards(30);
      setCards(data.cards || []);
      if ((data.cards || []).length === 0) setSessionDone(true);
    } catch {
      toast.error('Failed to load review cards');
    } finally {
      setLoading(false);
    }
  }

  const handleReview = useCallback(async (quality) => {
    if (submitting) return;
    const card = cards[current];
    if (!card) return;

    setSubmitting(true);
    try {
      await srsAPI.submitReview({ wordId: card.wordId || card.id, quality });
      setReviewed(r => r + 1);
      setDirection(1);
      setRevealed(false);

      if (current + 1 >= cards.length) {
        setSessionDone(true);
      } else {
        setTimeout(() => setCurrent(c => c + 1), 200);
      }
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }, [cards, current, submitting]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 16 }}>
        <div className="spinner" style={{ width: 48, height: 48 }} />
        <span style={{ color: 'var(--clr-text-secondary)' }}>Loading review cards...</span>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center' }}
      >
        <div style={{ fontSize: 72, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 8 }}>
          <span className="gradient-text">Session Complete!</span>
        </h1>
        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 16, marginBottom: 32, maxWidth: 360 }}>
          {reviewed > 0
            ? `You reviewed ${reviewed} card${reviewed > 1 ? 's' : ''}. Great job keeping your streak alive!`
            : 'No cards were due. Come back later or add new words to your list.'}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => window.location.href = '/dashboard'}>
            ← Dashboard
          </button>
          <button className="btn btn-ghost" onClick={() => { setSessionDone(false); setCurrent(0); setReviewed(0); loadDueCards(); }}>
            🔄 Reload
          </button>
        </div>
      </motion.div>
    );
  }

  const card = cards[current];
  const word = card?.word;
  const progress = cards.length > 0 ? ((current + 1) / cards.length) * 100 : 0;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* ── Progress Bar ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--clr-text-secondary)' }}>
            Card {current + 1} of {cards.length}
          </span>
          <span style={{ fontSize: 14, color: 'var(--clr-text-muted)' }}>
            {reviewed} reviewed
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'var(--gradient-brand)', borderRadius: 99 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* ── Flashcard ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="glass-card"
          initial={{ opacity: 0, x: direction * 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 100 }}
          transition={{ duration: 0.3 }}
          style={{
            padding: '40px 32px',
            minHeight: 320,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: !revealed ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden',
          }}
          onClick={() => !revealed && setRevealed(true)}
        >
          {/* Glow line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'var(--gradient-brand)', opacity: 0.6,
          }} />

          {/* Word */}
          <h2 style={{
            fontSize: 42,
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            marginBottom: 8,
            letterSpacing: -0.5,
          }}>
            {word?.word || card?.wordId || 'Unknown'}
          </h2>

          {word?.definition?.phonetic && (
            <div style={{ color: 'var(--clr-text-muted)', fontSize: 16, marginBottom: 20 }}>
              {word.definition.phonetic}
            </div>
          )}

          {!revealed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ color: 'var(--clr-text-muted)', fontSize: 14, marginTop: 20 }}
            >
              Tap to reveal definition
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', width: '100%' }}
            >
              {word?.definition?.meanings?.map((m, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    background: 'rgba(139,92,246,0.15)',
                    color: 'var(--clr-violet)',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}>
                    {m.partOfSpeech}
                  </span>
                  {m.definitions?.slice(0, 2).map((d, j) => (
                    <div key={j} style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--clr-text-primary)' }}>
                        {d.definition}
                      </p>
                      {d.example && (
                        <p style={{ fontSize: 13, color: 'var(--clr-text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                          "{d.example}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )) || (
                <p style={{ color: 'var(--clr-text-secondary)' }}>No definition available</p>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Rating Buttons ── */}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ marginTop: 24 }}
        >
          <p style={{ textAlign: 'center', color: 'var(--clr-text-muted)', fontSize: 13, marginBottom: 12 }}>
            How well did you know this?
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${QUALITY_BUTTONS.length}, 1fr)`,
            gap: 8,
          }}>
            {QUALITY_BUTTONS.map(btn => (
              <button
                key={btn.q}
                id={`review-q${btn.q}`}
                disabled={submitting}
                onClick={() => handleReview(btn.q)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '14px 8px',
                  background: `${btn.color}10`,
                  border: `1px solid ${btn.color}30`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  color: btn.color,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${btn.color}25`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${btn.color}10`; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ fontSize: 24 }}>{btn.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{btn.label}</span>
                <span style={{ fontSize: 10, color: 'var(--clr-text-muted)' }}>{btn.desc}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
