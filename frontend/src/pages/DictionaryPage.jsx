import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dictionaryAPI, vocabAPI } from '../api';
import toast from 'react-hot-toast';

export default function DictionaryPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await dictionaryAPI.lookup(query.trim());
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Word not found');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleAddToVocab = useCallback(async () => {
    if (!result?.word) return;
    try {
      await vocabAPI.addWord({ word: result.word, source: 'dictionary' });
      toast.success(`"${result.word}" added to your training queue! 🎯`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add word');
    }
  }, [result]);

  const playAudio = (url) => {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(() => toast.error('Audio playback failed'));
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 28, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
          <span className="gradient-text">Dictionary</span>
        </h1>
        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 15, marginBottom: 28 }}>
          Search any English word for definitions, pronunciation, and examples.
        </p>
      </motion.div>

      {/* ── Search ── */}
      <motion.form
        onSubmit={handleSearch}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'flex', gap: 12, marginBottom: 32 }}
      >
        <input
          id="dict-search"
          className="input-field"
          placeholder="e.g. ephemeral, serendipity, ubiquitous..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, fontSize: 17 }}
          autoFocus
        />
        <button id="dict-search-btn" type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
          {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : '🔍 Lookup'}
        </button>
      </motion.form>

      {/* ── Error ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card"
          style={{ padding: 24, textAlign: 'center', marginBottom: 20 }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤷</div>
          <p style={{ color: 'var(--clr-text-secondary)' }}>{error}</p>
        </motion.div>
      )}

      {/* ── Result ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{
              padding: '28px 28px 20px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(6,182,212,0.05) 100%)',
              borderBottom: '1px solid var(--clr-border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 900, marginBottom: 4 }}>
                    {result.word}
                  </h2>
                  {result.phonetic && (
                    <span style={{ color: 'var(--clr-text-muted)', fontSize: 16 }}>{result.phonetic}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {result.phonetics?.find(p => p.audio) && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => playAudio(result.phonetics.find(p => p.audio).audio)}
                      title="Play pronunciation"
                    >
                      🔊 Listen
                    </button>
                  )}
                  <button id="dict-add-word" className="btn btn-primary btn-sm" onClick={handleAddToVocab}>
                    + Add to List
                  </button>
                </div>
              </div>
            </div>

            {/* Meanings */}
            <div style={{ padding: '20px 28px 28px' }}>
              {result.meanings?.map((m, i) => (
                <div key={i} style={{ marginBottom: 24 }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    background: 'rgba(139,92,246,0.12)',
                    color: 'var(--clr-violet)',
                    borderRadius: 99,
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 14,
                    textTransform: 'capitalize',
                  }}>
                    {m.partOfSpeech}
                  </div>

                  {m.definitions?.map((d, j) => (
                    <div key={j} style={{ marginBottom: 14, paddingLeft: 16, borderLeft: '2px solid var(--clr-border)' }}>
                      <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--clr-text-muted)', marginRight: 6 }}>{j + 1}.</span>
                        {d.definition}
                      </p>
                      {d.example && (
                        <p style={{ fontSize: 13, color: 'var(--clr-text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                          Example: "{d.example}"
                        </p>
                      )}
                      {d.synonyms?.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {d.synonyms.slice(0, 5).map(s => (
                            <button
                              key={s}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 10px', fontSize: 11 }}
                              onClick={() => { setQuery(s); }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {m.synonyms?.length > 0 && (
                    <div style={{ marginTop: 8, paddingLeft: 16 }}>
                      <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>Synonyms: </span>
                      <span style={{ fontSize: 13, color: 'var(--clr-emerald)' }}>
                        {m.synonyms.join(', ')}
                      </span>
                    </div>
                  )}
                  {m.antonyms?.length > 0 && (
                    <div style={{ marginTop: 4, paddingLeft: 16 }}>
                      <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>Antonyms: </span>
                      <span style={{ fontSize: 13, color: 'var(--clr-rose)' }}>
                        {m.antonyms.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
