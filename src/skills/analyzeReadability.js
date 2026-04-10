/**
 * Skill: analyzeReadability
 *
 * Analyses blog post content for readability using the Flesch Reading Ease
 * formula plus auxiliary checks (sentence length, passive voice, paragraph
 * length). Returns a score, grade, and actionable suggestions.
 *
 * No external dependencies — pure text processing.
 */

import { requireString } from '../utils/validators.js';

/**
 * @typedef {'Very Easy'|'Easy'|'Fairly Easy'|'Standard'|'Fairly Difficult'|'Difficult'|'Very Difficult'} ReadabilityLevel
 */

/**
 * @typedef {Object} ReadabilityIssue
 * @property {'warning'|'info'} severity
 * @property {string}           message
 */

/**
 * @typedef {Object} ReadabilityReport
 * @property {number}           fleschScore     - 0-100 Flesch Reading Ease score
 * @property {ReadabilityLevel} level           - Human-readable level label
 * @property {number}           avgSentenceLen  - Average words per sentence
 * @property {number}           avgSyllablesPerWord
 * @property {number}           wordCount
 * @property {number}           sentenceCount
 * @property {ReadabilityIssue[]} issues
 * @property {string[]}         suggestions
 */

// ---------------------------------------------------------------------------
// Syllable counting (heuristic — accurate enough for scoring purposes)
// ---------------------------------------------------------------------------

/**
 * Estimate the number of syllables in an English word.
 *
 * @param {string} word
 * @returns {number}
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;

  // Remove silent trailing 'e'
  word = word.replace(/e$/, '');

  const vowelGroups = word.match(/[aeiouy]+/g);
  return vowelGroups ? vowelGroups.length : 1;
}

/**
 * Split text into sentences on ., !, or ? boundaries.
 *
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Split text into word tokens.
 *
 * @param {string} text
 * @returns {string[]}
 */
function tokenizeWords(text) {
  return text.match(/\b[a-zA-Z'-]+\b/g) ?? [];
}

// ---------------------------------------------------------------------------
// Passive voice detection (heuristic list)
// ---------------------------------------------------------------------------

const PASSIVE_INDICATORS = [
  'was', 'were', 'is', 'are', 'be', 'been', 'being',
  'has been', 'have been', 'had been',
  'will be', 'would be', 'should be', 'could be', 'might be',
];

/**
 * Count sentences that likely contain passive voice.
 *
 * @param {string[]} sentences
 * @returns {number}
 */
function countPassiveSentences(sentences) {
  return sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return PASSIVE_INDICATORS.some((p) =>
      new RegExp(`\\b${p}\\b.*ed\\b|\\b${p}\\b.*en\\b`).test(lower)
    );
  }).length;
}

// ---------------------------------------------------------------------------
// Flesch Reading Ease
// ---------------------------------------------------------------------------

/**
 * Map a Flesch score to a human-readable label.
 *
 * @param {number} score
 * @returns {ReadabilityLevel}
 */
function scoreToLevel(score) {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

// ---------------------------------------------------------------------------
// Public skill
// ---------------------------------------------------------------------------

/**
 * Analyse the readability of a blog post.
 *
 * @param {Object} options
 * @param {string} options.content  - Full post body text (required)
 * @param {string} [options.target] - Intended audience: 'general' | 'expert' (default: 'general')
 * @returns {ReadabilityReport}
 */
export function analyzeReadability({ content, target = 'general' } = {}) {
  requireString(content, 'content');

  const words = tokenizeWords(content);
  const sentences = splitSentences(content);
  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgSentenceLen = wordCount / sentenceCount;
  const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;

  // Flesch Reading Ease = 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
  const fleschScore = Math.min(
    100,
    Math.max(
      0,
      206.835 - 1.015 * avgSentenceLen - 84.6 * avgSyllablesPerWord
    )
  );

  const issues = [];
  const suggestions = [];

  // --- Sentence length ---
  const sentLenThreshold = target === 'expert' ? 30 : 20;
  if (avgSentenceLen > sentLenThreshold) {
    issues.push({
      severity: 'warning',
      message: `Average sentence length is ${avgSentenceLen.toFixed(1)} words (recommended max: ${sentLenThreshold}).`,
    });
    suggestions.push('Break long sentences into shorter ones to improve flow.');
  }

  // --- Passive voice ---
  const passiveCount = countPassiveSentences(sentences);
  const passiveRatio = passiveCount / sentenceCount;
  if (passiveRatio > 0.15) {
    issues.push({
      severity: 'warning',
      message: `~${Math.round(passiveRatio * 100)}% of sentences appear to use passive voice.`,
    });
    suggestions.push('Rewrite passive sentences in active voice for a more direct tone.');
  }

  // --- Readability score warnings ---
  const minScore = target === 'expert' ? 30 : 60;
  if (fleschScore < minScore) {
    issues.push({
      severity: 'warning',
      message: `Flesch score ${fleschScore.toFixed(1)} is below the recommended minimum of ${minScore} for a "${target}" audience.`,
    });
    suggestions.push('Simplify vocabulary and sentence structure to improve readability.');
  }

  // --- Paragraph length (approximate) ---
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const longParas = paragraphs.filter((p) => tokenizeWords(p).length > 150);
  if (longParas.length > 0) {
    issues.push({
      severity: 'info',
      message: `${longParas.length} paragraph(s) exceed 150 words — consider splitting them.`,
    });
    suggestions.push('Keep paragraphs to 3–5 sentences for better scannability.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Readability looks great — no major issues detected.');
  }

  return {
    fleschScore: parseFloat(fleschScore.toFixed(1)),
    level: scoreToLevel(fleschScore),
    avgSentenceLen: parseFloat(avgSentenceLen.toFixed(1)),
    avgSyllablesPerWord: parseFloat(avgSyllablesPerWord.toFixed(2)),
    wordCount,
    sentenceCount,
    issues,
    suggestions,
  };
}
