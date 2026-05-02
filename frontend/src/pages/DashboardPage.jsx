import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { srsAPI, vocabAPI } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const MASTERY_LABELS = ['New', 'Beginner', 'Learning', 'Reviewing', 'Proficient', 'Mastered'];
const MASTERY_COLORS = ['#606080', '#f43f5e', '#f59e0b', '#eab308', '#10b981', '#06b6d4'];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentWords, setRecentWords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsRes, wordsRes] = await Promise.all([
        srsAPI.getStats(),
        vocabAPI.getAll({ limit: 5 }),
      ]);
      setStats(statsRes.data);
      setRecentWords(wordsRes.data.words || []);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div className="spinner" style={{ width: 48, height: 48 }} />
      </div>
    );
  }

  const streakFire = (stats?.streak || 0) > 0 ? '🔥' : '';
  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Good morning' : greetHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: 40 }}
      >
        <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
          {greeting}, <span className="gradient-text">{user?.displayName?.split(' ')[0] || 'Learner'}</span>
        </h1>
        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 16 }}>
          {stats?.dueToday > 0
            ? `You have ${stats.dueToday} word${stats.dueToday > 1 ? 's' : ''} to review today.`
            : 'All caught up! Add new words to keep growing.'}
        </p>
      </motion.div>

      {/* ── Stats Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 40,
      }}>
        {[
          { label: 'Due Today', value: stats?.dueToday ?? 0, icon: '📋', color: '#8b5cf6' },
          { label: 'Streak', value: `${stats?.streak ?? 0} days ${streakFire}`, icon: '🔥', color: '#f59e0b' },
          { label: 'Total Words', value: stats?.total ?? 0, icon: '📚', color: '#6366f1' },
          { label: 'Mastered', value: stats?.mastered ?? 0, icon: '🏆', color: '#10b981' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="glass-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            style={{ padding: '24px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>{stat.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--clr-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {stat.label}
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', color: stat.color }}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 40,
        }}
      >
        <button
          id="dash-start-review"
          onClick={() => navigate('/review')}
          className="glass-card"
          style={{
            padding: '28px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            border: stats?.dueToday > 0 ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--clr-border)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {stats?.dueToday > 0 && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, height: 3,
              background: 'var(--gradient-brand)',
            }} />
          )}
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Start Review</div>
          <div style={{ fontSize: 14, color: 'var(--clr-text-secondary)' }}>
            {stats?.dueToday > 0 ? `${stats.dueToday} cards waiting` : 'No cards due right now'}
          </div>
        </button>

        <button
          id="dash-scan-text"
          onClick={() => navigate('/ocr')}
          className="glass-card"
          style={{ padding: '28px 24px', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Scan Text</div>
          <div style={{ fontSize: 14, color: 'var(--clr-text-secondary)' }}>
            Capture words from photos using AI
          </div>
        </button>

        <button
          id="dash-lookup"
          onClick={() => navigate('/dictionary')}
          className="glass-card"
          style={{ padding: '28px 24px', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Dictionary</div>
          <div style={{ fontSize: 14, color: 'var(--clr-text-secondary)' }}>
            Look up any word instantly
          </div>
        </button>
      </motion.div>

      {/* ── Mastery Distribution ── */}
      {stats && stats.total > 0 && (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          style={{ padding: 24, marginBottom: 40 }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Mastery Distribution</h2>
          <div style={{ display: 'flex', gap: 4, height: 32, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {[stats.newCards, stats.learning, stats.mastered].map((count, i) => {
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              const colors = ['#606080', '#f59e0b', '#10b981'];
              return pct > 0 ? (
                <motion.div
                  key={i}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
                  style={{ background: colors[i], borderRadius: 4, minWidth: pct > 3 ? 20 : 0 }}
                  title={`${['New', 'Learning', 'Mastered'][i]}: ${count}`}
                />
              ) : null;
            })}
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'New', count: stats.newCards, color: '#606080' },
              { label: 'Learning', count: stats.learning, color: '#f59e0b' },
              { label: 'Mastered', count: stats.mastered, color: '#10b981' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                <span style={{ fontSize: 13, color: 'var(--clr-text-secondary)' }}>{item.label}: <strong style={{ color: 'var(--clr-text-primary)' }}>{item.count}</strong></span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Recently Added ── */}
      {recentWords.length > 0 && (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          style={{ padding: 24 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recently Added</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vocab')}>View All →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentWords.map((w, i) => (
              <div key={w.word || i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--clr-border)',
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{w.word}</span>
                  {w.definition?.meanings?.[0]?.definitions?.[0]?.definition && (
                    <div style={{ fontSize: 12, color: 'var(--clr-text-muted)', marginTop: 2, maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.definition.meanings[0].definitions[0].definition}
                    </div>
                  )}
                </div>
                <span className="badge" style={{
                  background: `${MASTERY_COLORS[w.masteryLevel || 0]}20`,
                  color: MASTERY_COLORS[w.masteryLevel || 0],
                }}>
                  {MASTERY_LABELS[w.masteryLevel || 0]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
