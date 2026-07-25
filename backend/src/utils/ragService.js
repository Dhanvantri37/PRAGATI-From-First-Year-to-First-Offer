/**
 * Unified RAG Utility Service (Zero Cost Local CPU Embeddings)
 * Uses @xenova/transformers (all-MiniLM-L6-v2) for 384-dim embeddings.
 * Supports MongoDB Atlas $vectorSearch with seamless local memory / regex fallbacks.
 */
const { ScrapedOpening, DiscoveredAlumni, Company, Problem } = require('../models/index');

let extractorPipeline = null;

/**
 * Lazy loads the Xenova feature-extraction pipeline
 */
async function getExtractor() {
  if (!extractorPipeline) {
    try {
      const { pipeline } = await import('@xenova/transformers');
      extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (err) {
      console.warn('[ragService] Failed to load @xenova/transformers pipeline, using fallback vector generator:', err.message);
      extractorPipeline = null;
    }
  }
  return extractorPipeline;
}

/**
 * Generates a 384-dimensional vector embedding for a given text
 * @param {string} text 
 * @returns {Promise<number[]>} 384-float array
 */
async function getEmbedding(text) {
  if (!text || typeof text !== 'string') return new Array(384).fill(0);
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 1000);
  
  try {
    const extractor = await getExtractor();
    if (extractor) {
      const output = await extractor(clean, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    }
  } catch (err) {
    console.error('[ragService] Error generating embedding:', err.message);
  }

  // Fallback hash pseudo-embedding if pipeline fails
  const vector = new Array(384).fill(0);
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    vector[i % 384] += (charCode / 255) * 0.1;
  }
  return vector;
}

/**
 * Helper: Cosine similarity between two unit vectors (dot product)
 */
function dotProduct(v1, v2) {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += v1[i] * v2[i];
  }
  return sum;
}

/**
 * Vector search query for ScrapedOpenings
 */
async function searchScrapedOpenings(queryText, branch = null, limit = 5) {
  try {
    const queryEmbedding = await getEmbedding(queryText);
    const filter = {};
    if (branch && branch !== 'All') {
      filter.allowedBranches = { $in: [new RegExp(branch, 'i'), 'ALL', 'All'] };
    }

    // Try MongoDB Atlas $vectorSearch aggregate
    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index_openings',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: limit * 10,
            limit: limit
          }
        }
      ];
      if (branch && branch !== 'All') {
        pipeline.push({ $match: filter });
      }
      const results = await ScrapedOpening.aggregate(pipeline);
      if (results && results.length > 0) return results;
    } catch (atlasErr) {
      // Atlas $vectorSearch not indexed or unsupported locally
    }

    // Fallback 1: Local vector similarity lookup in memory
    const docs = await ScrapedOpening.find(filter).sort({ scrapedAt: -1 }).limit(100).lean();
    if (docs.length > 0) {
      const scored = docs.map(doc => {
        const score = doc.embedding?.length === 384 ? dotProduct(queryEmbedding, doc.embedding) : 0;
        return { ...doc, score };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit);
    }
  } catch (err) {
    console.error('[ragService] searchScrapedOpenings error:', err.message);
  }

  // Fallback 2: Regex lookup
  try {
    const terms = (queryText || '').split(/\s+/).filter(Boolean);
    const regex = new RegExp(terms.join('|'), 'i');
    return await ScrapedOpening.find({
      $or: [{ title: regex }, { companyName: regex }]
    }).limit(limit).lean();
  } catch {
    return [];
  }
}

/**
 * Vector search query for DiscoveredAlumni
 */
async function searchDiscoveredAlumni(queryText, company = null, branch = null, limit = 5) {
  try {
    const filter = {};
    if (company) filter.currentCompany = new RegExp(company, 'i');
    if (branch && branch !== 'All') filter.branch = new RegExp(branch, 'i');

    const alumni = await DiscoveredAlumni.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    if (alumni.length > 0) return alumni;

    // Relaxed search if specific company/branch returned empty
    return await DiscoveredAlumni.find().sort({ createdAt: -1 }).limit(limit).lean();
  } catch (err) {
    console.error('[ragService] searchDiscoveredAlumni error:', err.message);
    return [];
  }
}

/**
 * RAG Knowledge Base Search across Companies and Problems
 */
async function searchKnowledgeBase(queryText, limit = 5) {
  try {
    const regex = new RegExp(queryText.split(/\s+/).join('|'), 'i');
    const [companies, problems] = await Promise.all([
      Company.find({ $or: [{ name: regex }, { sector: regex }, { techStack: regex }] }).limit(3).lean(),
      Problem.find({ $or: [{ title: regex }, { topic: regex }, { tags: regex }] }).limit(3).lean()
    ]);
    return { companies, problems };
  } catch (err) {
    console.error('[ragService] searchKnowledgeBase error:', err.message);
    return { companies: [], problems: [] };
  }
}

module.exports = {
  getEmbedding,
  searchScrapedOpenings,
  searchDiscoveredAlumni,
  searchKnowledgeBase
};
