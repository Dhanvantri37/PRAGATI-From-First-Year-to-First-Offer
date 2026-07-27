/**
 * ragService.js — PRAGATI Unified RAG Engine (v2)
 *
 * Provides:
 *   getEmbedding(text)                        → 384-dim float[] vector (local CPU, $0 cost)
 *   vectorSearch(query, collection, n)         → top-n MongoDB vector search results
 *   searchContext(query, opts)                 → smart multi-collection search with formatted context
 *
 * Collections indexed (create Atlas vector index on each):
 *   pragati_rag_docs     — general job/news/college docs
 *   pragati_alumni       — KIT's alumni profiles
 *   pragati_jobs         — scraped job/internship listings
 *   pragati_interviews   — student interview experiences
 *   pragati_aptitude     — aptitude patterns & company preferences
 *
 * Uses: @xenova/transformers (Xenova/all-MiniLM-L6-v2)
 *   - Runs 100% locally on the backend CPU, zero API cost
 *   - Model is downloaded once and cached in node_modules/.cache/
 *
 * MongoDB Atlas Vector Index required on each collection:
 *   field: "embedding", dimensions: 384, similarity: "cosine"
 */

const mongoose = require('mongoose');

// Lazy singleton — model loads once on first call
let _embedder = null;

async function getEmbedder() {
  if (_embedder) return _embedder;

  const { pipeline } = await import('@xenova/transformers');
  _embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    progress_callback: null,
  });

  console.log('[RAG] Xenova/all-MiniLM-L6-v2 embedder ready ✅');
  return _embedder;
}

/**
 * Convert any text to a 384-dimension cosine-normalized vector.
 */
async function getEmbedding(text) {
  const model = await getEmbedder();
  const output = await model(String(text).slice(0, 512), {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

/**
 * Run a semantic vector search against any MongoDB collection.
 */
async function vectorSearch(queryText, collectionName, limit = 3) {
  try {
    const vector = await getEmbedding(queryText);
    const db = mongoose.connection.db;

    if (!db) {
      console.warn('[RAG] MongoDB not connected — returning empty context');
      return [];
    }

    const results = await db.collection(collectionName).aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: vector,
          numCandidates: Math.max(limit * 10, 50),
          limit,
        },
      },
      {
        $project: {
          _id: 0,
          embedding: 0,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]).toArray();

    return results;
  } catch (err) {
    console.warn(`[RAG] vectorSearch failed on "${collectionName}": ${err.message}`);
    return [];
  }
}

/**
 * searchContext — Smart multi-collection RAG context builder.
 *
 * @param {string} query     - Natural language query
 * @param {object} opts
 *   @param {string[]} [opts.collections]  - Which collections to search (default: all relevant)
 *   @param {number}   [opts.limit]        - Results per collection (default: 3)
 *   @param {string}   [opts.module]       - 'interview'|'aptitude'|'alumni'|'jobs'|'general'
 *   @param {string}   [opts.department]   - Filter context by department
 * @returns {Promise<string>}  - Formatted context string ready for LLM injection
 */
async function searchContext(query, opts = {}) {
  const { limit = 3, module = 'general', department } = opts;

  // Choose collections based on module for better accuracy
  const collectionMap = {
    interview:  ['pragati_interviews', 'pragati_alumni', 'pragati_jobs'],
    aptitude:   ['pragati_aptitude',   'pragati_rag_docs'],
    alumni:     ['pragati_alumni'],
    jobs:       ['pragati_jobs',        'pragati_rag_docs'],
    drives:     ['pragati_jobs',        'pragati_alumni'],
    discussions:['pragati_rag_docs',    'pragati_alumni', 'pragati_jobs'],
    company:    ['pragati_interviews',  'pragati_alumni', 'pragati_jobs'],
    general:    ['pragati_rag_docs',    'pragati_jobs',   'pragati_alumni'],
  };

  const collections = opts.collections || collectionMap[module] || collectionMap.general;

  // Search all relevant collections in parallel
  const allResults = await Promise.all(
    collections.map(col => vectorSearch(query, col, limit).catch(() => []))
  );

  // Flatten + deduplicate by content
  const seen = new Set();
  const flat = allResults.flat().filter(doc => {
    const key = JSON.stringify(doc).slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (flat.length === 0) return '';

  // Format into LLM-readable context
  const lines = ['--- PRAGATI Knowledge Base Context ---'];
  flat.forEach((doc, i) => {
    lines.push(`\n[${i + 1}]`);
    if (doc.type === 'alumni') {
      lines.push(`Alumni: ${doc.name || 'Unknown'} | ${doc.role || ''} @ ${doc.company || ''} | Batch: ${doc.batch || ''} | ${doc.department || ''}`);
      if (doc.bio) lines.push(`Bio: ${doc.bio}`);
    } else if (doc.type === 'job') {
      lines.push(`Job: ${doc.title || ''} at ${doc.company || ''} | Branches: ${(doc.branches || []).join(', ')}`);
      if (doc.description) lines.push(`Description: ${doc.description?.slice(0, 200)}`);
    } else if (doc.type === 'interview_experience') {
      lines.push(`Interview @ ${doc.company || ''} (${doc.year || ''}): ${doc.content?.slice(0, 300)}`);
    } else if (doc.type === 'aptitude') {
      lines.push(`Aptitude tip: ${doc.content?.slice(0, 300)}`);
    } else {
      // General doc
      const text = doc.text || doc.content || doc.description || '';
      if (text) lines.push(text.slice(0, 300));
    }
  });
  lines.push('\n--- End of Context ---');

  return lines.join('\n');
}

/**
 * upsertDoc — Save a document with its embedding into a RAG collection.
 *
 * @param {string} collectionName  - e.g. 'pragati_alumni', 'pragati_jobs'
 * @param {object} doc             - Document to store (must have a unique key field)
 * @param {string} textForEmbed    - Text to vectorize
 * @param {string} [uniqueField]   - Field name used for upsert dedup (default: '_key')
 */
async function upsertDoc(collectionName, doc, textForEmbed, uniqueField = '_key') {
  try {
    const embedding = await getEmbedding(textForEmbed);
    const db = mongoose.connection.db;
    if (!db) return;

    const filter = uniqueField && doc[uniqueField]
      ? { [uniqueField]: doc[uniqueField] }
      : { _id: new mongoose.Types.ObjectId() };

    await db.collection(collectionName).updateOne(
      filter,
      { $set: { ...doc, embedding, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.warn(`[RAG] upsertDoc failed on "${collectionName}": ${err.message}`);
  }
}

module.exports = { getEmbedding, vectorSearch, searchContext, upsertDoc };
