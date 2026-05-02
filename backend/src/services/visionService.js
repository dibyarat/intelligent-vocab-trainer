/**
 * OCR / Vision Service
 * Uses Google Cloud Vision API for text detection from uploaded images.
 * In DEMO_MODE, uses a local word-extraction fallback (no GCP needed).
 */

const DEMO_MODE = process.env.DEMO_MODE === 'true';

let visionClient = null;

function getVisionClient() {
  if (!visionClient) {
    const vision = require('@google-cloud/vision');
    visionClient = new vision.ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
  }
  return visionClient;
}

/**
 * Extract text from a base64-encoded image using Cloud Vision OCR
 * @param {string} base64Image - Base64 encoded image string (without data URI prefix)
 * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
 * @returns {Object} { fullText, words, blocks }
 */
async function extractTextFromImage(base64Image, mimeType = 'image/jpeg') {
  // ── Demo Mode: return sample OCR data ──
  if (DEMO_MODE) {
    return getDemoOCRResult();
  }

  const client = getVisionClient();

  const request = {
    image: { content: base64Image },
    features: [
      { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
    ],
  };

  const [result] = await client.annotateImage(request);

  if (result.error) {
    throw new Error(`Vision API error: ${result.error.message}`);
  }

  const fullTextAnnotation = result.fullTextAnnotation;
  if (!fullTextAnnotation) {
    return { fullText: '', words: [], blocks: [] };
  }

  const fullText = fullTextAnnotation.text || '';

  // Extract individual words with bounding boxes
  const words = [];
  const blocks = [];

  for (const page of fullTextAnnotation.pages || []) {
    for (const block of page.blocks || []) {
      const blockText = extractTextFromBlock(block);
      if (blockText.trim()) {
        blocks.push({
          text: blockText.trim(),
          confidence: block.confidence || 0,
          boundingBox: normalizeBoundingBox(block.boundingBox),
        });
      }

      for (const paragraph of block.paragraphs || []) {
        for (const word of paragraph.words || []) {
          const wordText = word.symbols
            .map(s => s.text)
            .join('');

          // Only include alphabetic words (no numbers, punctuation)
          if (/^[a-zA-Z]{2,}$/.test(wordText)) {
            words.push({
              text: wordText.toLowerCase(),
              displayText: wordText,
              confidence: word.confidence || 0,
              boundingBox: normalizeBoundingBox(word.boundingBox),
            });
          }
        }
      }
    }
  }

  // Deduplicate words (case-insensitive)
  const seen = new Set();
  const uniqueWords = words.filter(w => {
    const key = w.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by confidence descending
  uniqueWords.sort((a, b) => b.confidence - a.confidence);

  return { fullText, words: uniqueWords, blocks };
}

/**
 * Extract text from a Vision API Block object
 */
function extractTextFromBlock(block) {
  return (block.paragraphs || [])
    .map(p =>
      (p.words || [])
        .map(w => (w.symbols || []).map(s => s.text).join(''))
        .join(' ')
    )
    .join('\n');
}

/**
 * Normalize bounding box vertices to { x, y, width, height } format
 */
function normalizeBoundingBox(boundingBox) {
  if (!boundingBox || !boundingBox.vertices || boundingBox.vertices.length < 4) {
    return null;
  }
  const verts = boundingBox.vertices;
  const xs = verts.map(v => v.x || 0);
  const ys = verts.map(v => v.y || 0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

/**
 * Demo OCR result with sample vocabulary words
 */
function getDemoOCRResult() {
  const sampleText = 'The ephemeral beauty of the aurora borealis is a quintessential example of nature\'s sublime artistry. Such serendipitous encounters with ineffable phenomena leave an indelible impression on the observer, fostering a profound sense of equanimity and reverence.';

  const sampleWords = [
    'ephemeral', 'beauty', 'aurora', 'borealis', 'quintessential',
    'example', 'nature', 'sublime', 'artistry', 'serendipitous',
    'encounters', 'ineffable', 'phenomena', 'indelible', 'impression',
    'observer', 'fostering', 'profound', 'equanimity', 'reverence',
  ];

  return {
    fullText: sampleText,
    words: sampleWords.map((w, i) => ({
      text: w.toLowerCase(),
      displayText: w.charAt(0).toUpperCase() + w.slice(1),
      confidence: 0.99 - (i * 0.01),
      boundingBox: null,
    })),
    blocks: [{
      text: sampleText,
      confidence: 0.98,
      boundingBox: null,
    }],
  };
}

module.exports = { extractTextFromImage };
