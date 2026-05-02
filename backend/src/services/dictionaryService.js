/**
 * Dictionary Service
 * Integrates with Free Dictionary API and caches results in Firestore
 */
const axios = require('axios');
const { getDb } = require('./firebase');

const DICTIONARY_BASE_URL = process.env.DICTIONARY_API_BASE_URL
  || 'https://api.dictionaryapi.dev/api/v2/entries/en';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Look up a word definition, using Firestore cache first
 * @param {string} word - Word to look up
 * @returns {Object} Word definition data
 */
async function lookupWord(word) {
  const normalized = word.toLowerCase().trim();
  if (!normalized || !/^[a-zA-Z]+$/.test(normalized)) {
    throw new Error('Invalid word: must contain only letters');
  }

  // Check Firestore cache
  const cached = await getCachedDefinition(normalized);
  if (cached) return cached;

  // Fetch from Free Dictionary API
  const definition = await fetchFromApi(normalized);

  // Cache the result
  await cacheDefinition(normalized, definition);

  return definition;
}

/**
 * Fetch definition from Free Dictionary API
 */
async function fetchFromApi(word) {
  try {
    const response = await axios.get(`${DICTIONARY_BASE_URL}/${encodeURIComponent(word)}`, {
      timeout: 10000,
    });

    return parseApiResponse(word, response.data);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new Error(`Word "${word}" not found in dictionary`);
    }
    throw new Error(`Dictionary API error: ${err.message}`);
  }
}

/**
 * Parse the Free Dictionary API response into a clean structure
 */
function parseApiResponse(word, data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No definition found for "${word}"`);
  }

  const entry = data[0];
  const result = {
    word: entry.word || word,
    phonetic: entry.phonetic || null,
    phonetics: (entry.phonetics || [])
      .filter(p => p.text || p.audio)
      .map(p => ({ text: p.text || null, audio: p.audio || null })),
    meanings: [],
    sourceUrls: entry.sourceUrls || [],
    fetchedAt: new Date().toISOString(),
  };

  for (const meaning of entry.meanings || []) {
    const parsed = {
      partOfSpeech: meaning.partOfSpeech,
      definitions: (meaning.definitions || []).slice(0, 5).map(d => ({
        definition: d.definition,
        example: d.example || null,
        synonyms: d.synonyms || [],
        antonyms: d.antonyms || [],
      })),
      synonyms: (meaning.synonyms || []).slice(0, 10),
      antonyms: (meaning.antonyms || []).slice(0, 10),
    };
    result.meanings.push(parsed);
  }

  return result;
}

/**
 * Get cached definition from Firestore
 */
async function getCachedDefinition(word) {
  try {
    const db = getDb();
    const docRef = db.collection('dictionary_cache').doc(word);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const data = doc.data();
    const fetchedAt = new Date(data.fetchedAt);
    const age = Date.now() - fetchedAt.getTime();

    if (age > CACHE_TTL_MS) {
      // Cache expired
      await docRef.delete();
      return null;
    }

    return data;
  } catch (err) {
    console.warn(`[Dictionary] Cache read failed for "${word}":`, err.message);
    return null;
  }
}

/**
 * Cache definition in Firestore
 */
async function cacheDefinition(word, definition) {
  try {
    const db = getDb();
    await db.collection('dictionary_cache').doc(word).set(definition);
  } catch (err) {
    console.warn(`[Dictionary] Cache write failed for "${word}":`, err.message);
  }
}

/**
 * Search for words matching a query prefix (for autocomplete)
 */
async function searchWords(query, limit = 10) {
  if (!query || query.length < 2) return [];

  const normalized = query.toLowerCase().trim();
  const db = getDb();

  // Search cached dictionary entries first
  const snapshot = await db.collection('dictionary_cache')
    .where('word', '>=', normalized)
    .where('word', '<=', normalized + '\uf8ff')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    word: doc.data().word,
    phonetic: doc.data().phonetic || null,
    shortDefinition: doc.data().meanings?.[0]?.definitions?.[0]?.definition || null,
  }));
}

module.exports = { lookupWord, searchWords };
