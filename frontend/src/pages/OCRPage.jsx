import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { visionAPI, vocabAPI, dictionaryAPI } from '../api';
import toast from 'react-hot-toast';

export default function OCRPage() {
  const [extractedWords, setExtractedWords] = useState([]);
  const [fullText, setFullText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordDefinition, setWordDefinition] = useState(null);
  const [defLoading, setDefLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [addedWords, setAddedWords] = useState(new Set());

  const processImage = useCallback(async (file) => {
    setProcessing(true);
    setExtractedWords([]);
    setFullText('');
    setSelectedWord(null);
    setWordDefinition(null);
    setAddedWords(new Set());

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result;
          const base64Data = result.split(',')[1]; // Strip data URI prefix
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data } = await visionAPI.ocrBase64(base64, file.type);
      setExtractedWords(data.words || []);
      setFullText(data.fullText || '');
      toast.success(`Found ${data.wordCount || 0} unique words! 🔍`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'OCR processing failed');
    } finally {
      setProcessing(false);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      processImage(acceptedFiles[0]);
    }
  }, [processImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.bmp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSelectWord = useCallback(async (word) => {
    setSelectedWord(word);
    setDefLoading(true);
    setWordDefinition(null);
    try {
      const { data } = await dictionaryAPI.lookup(word.text);
      setWordDefinition(data);
    } catch {
      setWordDefinition(null);
    } finally {
      setDefLoading(false);
    }
  }, []);

  const handleAddWord = useCallback(async (wordText) => {
    try {
      await vocabAPI.addWord({ word: wordText, source: 'ocr' });
      setAddedWords(prev => new Set([...prev, wordText]));
      toast.success(`"${wordText}" added to training queue! 📚`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add word');
    }
  }, []);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 28, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
          <span className="gradient-text">Scan Text</span>
        </h1>
        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 15, marginBottom: 28 }}>
          Upload a photo of text to extract words. Select any word to see its meaning and add it to your training list.
        </p>
      </motion.div>

      {/* ── Upload Zone ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        {...getRootProps()}
        id="ocr-dropzone"
        style={{
          padding: 48,
          border: `2px dashed ${isDragActive ? 'var(--clr-violet)' : 'var(--clr-border)'}`,
          borderRadius: 'var(--radius-xl)',
          background: isDragActive ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 200ms',
          marginBottom: 32,
        }}
      >
        <input {...getInputProps()} />
        {processing ? (
          <div>
            <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--clr-violet)', fontWeight: 600 }}>
              Processing image with Cloud Vision AI...
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📷</div>
            <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
              {isDragActive ? 'Drop image here...' : 'Drag & drop an image, or click to select'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--clr-text-muted)' }}>
              Supports JPEG, PNG, WEBP — Max 10 MB
            </p>
          </>
        )}
      </motion.div>

      {/* ── Results Layout ── */}
      {(extractedWords.length > 0 || previewUrl) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left: Image Preview + Words */}
          <div>
            {previewUrl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card"
                style={{ padding: 12, marginBottom: 16, overflow: 'hidden' }}
              >
                <img
                  src={previewUrl}
                  alt="Uploaded text"
                  style={{ width: '100%', borderRadius: 12, maxHeight: 250, objectFit: 'contain' }}
                />
              </motion.div>
            )}

            {/* Full Text */}
            {fullText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card"
                style={{ padding: 16, marginBottom: 16 }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Detected Text
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--clr-text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto' }}>
                  {fullText}
                </p>
              </motion.div>
            )}

            {/* Word Cloud */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card"
              style={{ padding: 20 }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Extracted Words ({extractedWords.length})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {extractedWords.map(w => {
                  const isSelected = selectedWord?.text === w.text;
                  const isAdded = addedWords.has(w.text);
                  return (
                    <button
                      key={w.text}
                      onClick={() => handleSelectWord(w)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 99,
                        border: isSelected
                          ? '1px solid var(--clr-violet)'
                          : isAdded
                            ? '1px solid var(--clr-emerald)'
                            : '1px solid var(--clr-border)',
                        background: isSelected
                          ? 'rgba(139,92,246,0.2)'
                          : isAdded
                            ? 'rgba(16,185,129,0.1)'
                            : 'rgba(255,255,255,0.03)',
                        color: isAdded ? 'var(--clr-emerald)' : 'var(--clr-text-primary)',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'all 150ms',
                      }}
                    >
                      {isAdded && '✓ '}{w.displayText || w.text}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right: Selected Word Definition */}
          <div>
            <AnimatePresence mode="wait">
              {selectedWord ? (
                <motion.div
                  key={selectedWord.text}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-card"
                  style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 20 }}
                >
                  <div style={{
                    padding: '24px 24px 16px',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.04))',
                    borderBottom: '1px solid var(--clr-border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                        {selectedWord.displayText || selectedWord.text}
                      </h2>
                      {!addedWords.has(selectedWord.text) ? (
                        <button
                          id="ocr-add-word"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddWord(selectedWord.text)}
                        >
                          + Add to List
                        </button>
                      ) : (
                        <span style={{ color: 'var(--clr-emerald)', fontSize: 13, fontWeight: 600 }}>✓ Added</span>
                      )}
                    </div>
                    {wordDefinition?.phonetic && (
                      <span style={{ color: 'var(--clr-text-muted)', fontSize: 15 }}>
                        {wordDefinition.phonetic}
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '20px 24px' }}>
                    {defLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <div className="spinner" />
                      </div>
                    ) : wordDefinition ? (
                      wordDefinition.meanings?.map((m, i) => (
                        <div key={i} style={{ marginBottom: 18 }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            background: 'rgba(139,92,246,0.12)',
                            color: 'var(--clr-violet)',
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 10,
                          }}>
                            {m.partOfSpeech}
                          </span>
                          {m.definitions?.slice(0, 3).map((d, j) => (
                            <div key={j} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: '2px solid var(--clr-border)' }}>
                              <p style={{ fontSize: 14, lineHeight: 1.5 }}>{d.definition}</p>
                              {d.example && (
                                <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontStyle: 'italic', marginTop: 3 }}>
                                  "{d.example}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: 32, color: 'var(--clr-text-muted)' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
                        No definition found for this word
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card"
                  style={{ padding: 48, textAlign: 'center' }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>👈</div>
                  <p style={{ color: 'var(--clr-text-muted)', fontSize: 15 }}>
                    Select a word from the extracted list to see its definition
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Responsive override for grid ── */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
