/**
 * Unified RAG Utility Service (Zero Cost Local CPU Embeddings)
 * Uses @xenova/transformers (all-MiniLM-L6-v2) for 384-dim embeddings.
 * Supports MongoDB Atlas $vectorSearch with seamless local memory / regex fallbacks.
 */
const axios = require('axios');
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
 * Fetch live alumni profiles from public web search on the fly
 */
async function fetchLiveAlumniWeb(searchTerm) {
  try {
    const query = `site:linkedin.com/in "KIT" ${searchTerm}`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const resp = await axios.get(ddgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 4000
    });
    const html = resp.data || '';
    const results = [];
    const linkRegex = /<a class="result__snippet[^>]*>(.*?)<\/a>/gi;
    let match;
    let idx = 1;
    while ((match = linkRegex.exec(html)) !== null && idx <= 4) {
      const snippet = match[1].replace(/<[^>]+>/g, '').trim();
      if (snippet.length > 10) {
        const cleanName = snippet.split('-')[0].split('|')[0].trim().slice(0, 30);
        const searchLink = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent('KIT ' + searchTerm)}`;
        const newAlumnus = await DiscoveredAlumni.findOneAndUpdate(
          { linkedinUrl: searchLink },
          {
            name: cleanName.length > 3 ? cleanName : `KIT Professional (${searchTerm})`,
            linkedinUrl: searchLink,
            currentCompany: searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1),
            role: snippet.slice(0, 60),
            branch: 'Engineering',
            gradYear: 'Alumnus',
            discoveredAt: new Date()
          },
          { upsert: true, new: true }
        ).lean();
        results.push(newAlumnus);
        idx++;
      }
    }
    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Dynamic search query for DiscoveredAlumni (DB + Live Web Search)
 */
async function searchDiscoveredAlumni(queryText, company = null, branch = null, limit = 8) {
  try {
    const filter = {};
    const searchString = (queryText || company || '').trim();
    if (searchString) {
      const regex = new RegExp(searchString.split(/\s+/).join('|'), 'i');
      filter.$or = [
        { name: regex },
        { currentCompany: regex },
        { role: regex },
        { branch: regex }
      ];
    }
    if (branch && branch !== 'All') filter.branch = new RegExp(branch, 'i');

    let alumni = await DiscoveredAlumni.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

    // If a custom search term was typed and DB has few matches, perform live web discovery!
    if (searchString && alumni.length < 3) {
      const liveResults = await fetchLiveAlumniWeb(searchString);
      if (liveResults && liveResults.length > 0) {
        alumni = [...liveResults, ...alumni].slice(0, limit);
      } else {
        // Dynamic fallback card for the exact searched term
        const dynamicSearchLink = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent('KIT College ' + searchString)}`;
        const dynamicCard = {
          _id: 'dynamic_' + Date.now(),
          name: `KIT Alumni (${searchString})`,
          linkedinUrl: dynamicSearchLink,
          currentCompany: searchString.charAt(0).toUpperCase() + searchString.slice(1),
          role: `Professional / Specialist at ${searchString}`,
          branch: 'CSE / IT / ENTC',
          gradYear: 'Alumni Network'
        };
        alumni = [dynamicCard, ...alumni];
      }
    }

    if (alumni.length > 0) return alumni;
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
