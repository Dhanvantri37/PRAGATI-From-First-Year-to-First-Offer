// utils/aiGuard.js
// Simple utility to validate AI responses and ensure proper JSON structure.

/**
 * Checks if the given text can be parsed as JSON after stripping optional markdown fences.
 * Returns parsed object or null if invalid.
 * @param {string} text
 * @returns {object|null}
 */
function ensureValidJson(text) {
  if (!text) return null;
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

module.exports = { ensureValidJson };
