import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vocabAPI } from '../api';
import toast from 'react-hot-toast';

const MASTERY_LABELS = ['New', 'Beginner', 'Learning', 'Reviewing', 'Proficient', 'Mastered'];
const MASTERY_COLORS = ['#606080', '#f43f5e', '#f59e0b', '#eab308', '#10b981', '#06b6d4'];

export default function VocabListPage() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadWords(); }, []);

  async function loadWords() {
    try {
      const { data } = await vocabAPI.getAll({ limit: 100 });
      setWords(data.words || []);
    } catch {
      toast.error('Failed to load vocabulary');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newWord.trim()) return;
    setAdding(true);
    try {
      const { data } = await vocabAPI.addWord({ word: newWord.trim(), source: 'manual' });
      setWords(prev => [{ id: data.word.id, ...data.word }, ...prev]);
      setNewWord('');
      toast.success(`"${data.word.word}" added to your list! 📚`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add word');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(wordId) {
    if (!confirm(`Remove "${wordId}" from your list?`)) return;
    try {
      await vocabAPI.remove(wordId);
      setWords(prev => prev.filter(w => (w.id || w.word) !== wordId));
      toast.success('Word removed');
    } catch {
      toast.error('Failed to remove word');
    }
  }

  const filtered = search
    ? words.filter(w => w.word.includes(search.toLowerCase()))
    : words;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 28, fontFamily: 'var(--font-display)', marginBottom: 24 }}>
          <span className="gradient-text">My Words</span>
          <span style={{ marginLeft: 12, fontSize: 16, color: 'var(--clr-text-muted)', fontWeight: 400 }}>
            {words.length} total
          </span>
        </h1>
      </motion.div>

      {/* ── Add Word Form ── */}
      <motion.form
        onSubmit={handleAdd}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <input
          id="add-word-input"
          className="input-field"
          placeholder="Type a word to add..."
          value={newWord}
          onChange={e => setNewWord(e.target.value)}
          style={{ flex: 1 }}
          autoFocus
        />
        <button
          id="add-word-submit"
          type="submit"
          className="btn btn-primary"
          disabled={adding || !newWord.trim()}
        >
          {adding ? '...' : '+ Add'}
        </button>
      </motion.form>

      {/* ── Search ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ marginBottom: 20 }}
      >
        <input
          id="search-words"
          className="input-field"
          placeholder="🔍 Search your words..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </motion.div>

      {/* ── Word List ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--clr-text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          {search ? 'No words match your search.' : 'Your word list is empty. Add your first word above!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {filtered.map((w, i) => {
              const wordId = w.id || w.word;
              const isExpanded = expandedId === wordId;
              const def = w.definition?.meanings?.[0]?.definitions?.[0];

              return (
                <motion.div
                  key={wordId}
                  className="glass-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                  style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : wordId)}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>{w.word}</span>
                        {w.definition?.phonetic && (
                          <span style={{ fontSize: 13, color: 'var(--clr-text-muted)' }}>{w.definition.phonetic}</span>
                        )}
                      </div>
                      {def?.definition && !isExpanded && (
                        <div style={{
                          fontSize: 13, color: 'var(--clr-text-muted)', marginTop: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%',
                        }}>
                          {def.definition}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span className="badge" style={{
                        background: `${MASTERY_COLORS[w.masteryLevel || 0]}20`,
                        color: MASTERY_COLORS[w.masteryLevel || 0],
                      }}>
                        {MASTERY_LABELS[w.masteryLevel || 0]}
                      </span>
                      <span style={{ color: 'var(--clr-text-muted)', fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
                        ▾
                      </span>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          padding: '0 20px 16px',
                          borderTop: '1px solid var(--clr-border)',
                          paddingTop: 16,
                        }}>
                          {w.definition?.meanings?.map((m, mi) => (
                            <div key={mi} style={{ marginBottom: 12 }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                background: 'rgba(139,92,246,0.12)',
                                color: 'var(--clr-violet)',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                marginBottom: 6,
                              }}>
                                {m.partOfSpeech}
                              </span>
                              {m.definitions?.slice(0, 3).map((d, di) => (
                                <div key={di} style={{ marginBottom: 6, paddingLeft: 8 }}>
                                  <p style={{ fontSize: 14, color: 'var(--clr-text-primary)' }}>
                                    {di + 1}. {d.definition}
                                  </p>
                                  {d.example && (
                                    <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                                      "{d.example}"
                                    </p>
                                  )}
                                </div>
                              ))}
                              {m.synonyms?.length > 0 && (
                                <div style={{ fontSize: 12, color: 'var(--clr-text-secondary)', marginTop: 4, paddingLeft: 8 }}>
                                  <strong>Synonyms:</strong> {m.synonyms.slice(0, 5).join(', ')}
                                </div>
                              )}
                            </div>
                          ))}

                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                              Source: {w.source || 'manual'} · Added: {new Date(w.addedAt).toLocaleDateString()}
                            </span>
                            <div style={{ flex: 1 }} />
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={(e) => { e.stopPropagation(); handleDelete(wordId); }}
                              style={{ padding: '4px 12px', fontSize: 12 }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
