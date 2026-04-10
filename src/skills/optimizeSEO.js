/**
 * Skill: optimizeSEO
 *
 * Analyses a blog post's title, meta description, content, and tags against
 * a target keyword and returns an SEO score (0-100) plus actionable suggestions.
 *
 * No external API calls are made; all analysis is performed on the supplied text.
 */

import { requireString } from '../utils/validators.js';

/** Word count of the full post body required for a passing score. */
const MIN_WORD_COUNT = 300;

/** Ideal meta description length range (characters). */
const META_DESC_MIN = 120;
const META_DESC_MAX = 160;

/** Ideal title length range (characters). */
const TITLE_MIN = 30;
const TITLE_MAX = 65;

/**
 * @typedef {Object} SEOIssue
 * @property {'error'|'warning'|'info'} severity
 * @property {string} message
 */

/**
 * @typedef {Object} SEOReport
 * @property {number}     score        - 0-100 composite SEO score
 * @property {string}     grade        - Letter grade derived from score
 * @property {SEOIssue[]} issues       - Ordered list of findings
 * @property {string[]}   suggestions  - Human-readable improvement actions
 * @property {Object}     checks       - Boolean map of individual checks
 */

/**
 * Count how many times `keyword` appears in `text` (case-insensitive).
 *
 * @param {string} text
 * @param {string} keyword
 * @returns {number}
 */
function countOccurrences(text, keyword) {
  if (!keyword) return 0;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(escaped, 'gi')) ?? []).length;
}

/**
 * Convert a numeric score to a letter grade.
 *
 * @param {number} score
 * @returns {string}
 */
function toGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Analyse a blog post for SEO quality.
 *
 * @param {Object}   options
 * @param {string}   options.title           - Post title (required)
 * @param {string}   options.metaDescription - Meta description text (required)
 * @param {string}   options.content         - Full post body text (required)
 * @param {string}   [options.keyword]       - Focus keyword / keyphrase
 * @param {string[]} [options.tags]          - Post tags
 * @returns {SEOReport}
 */
export function optimizeSEO({ title, metaDescription, content, keyword = '', tags = [] } = {}) {
  requireString(title, 'title');
  requireString(metaDescription, 'metaDescription');
  requireString(content, 'content');

  const issues = [];
  const suggestions = [];
  const checks = {};
  let deductions = 0;

  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const titleLower = title.toLowerCase();
  const metaLower = metaDescription.toLowerCase();
  const contentLower = content.toLowerCase();
  const kw = keyword.toLowerCase().trim();

  // --- Title checks ---
  checks.titleLength = title.length >= TITLE_MIN && title.length <= TITLE_MAX;
  if (!checks.titleLength) {
    issues.push({ severity: 'warning', message: `Title is ${title.length} chars; ideal range is ${TITLE_MIN}–${TITLE_MAX}.` });
    suggestions.push(`Adjust title length to between ${TITLE_MIN} and ${TITLE_MAX} characters.`);
    deductions += 10;
  }

  if (kw) {
    checks.keywordInTitle = titleLower.includes(kw);
    if (!checks.keywordInTitle) {
      issues.push({ severity: 'error', message: `Focus keyword "${keyword}" not found in title.` });
      suggestions.push(`Include the focus keyword "${keyword}" in the title.`);
      deductions += 15;
    }
  }

  // --- Meta description checks ---
  checks.metaLength = metaDescription.length >= META_DESC_MIN && metaDescription.length <= META_DESC_MAX;
  if (!checks.metaLength) {
    issues.push({ severity: 'warning', message: `Meta description is ${metaDescription.length} chars; ideal range is ${META_DESC_MIN}–${META_DESC_MAX}.` });
    suggestions.push(`Rewrite meta description to be ${META_DESC_MIN}–${META_DESC_MAX} characters.`);
    deductions += 10;
  }

  if (kw) {
    checks.keywordInMeta = metaLower.includes(kw);
    if (!checks.keywordInMeta) {
      issues.push({ severity: 'warning', message: `Focus keyword "${keyword}" missing from meta description.` });
      suggestions.push(`Add the focus keyword "${keyword}" to the meta description.`);
      deductions += 8;
    }
  }

  // --- Content checks ---
  checks.wordCount = wordCount >= MIN_WORD_COUNT;
  if (!checks.wordCount) {
    issues.push({ severity: 'error', message: `Content has only ${wordCount} words; minimum recommended is ${MIN_WORD_COUNT}.` });
    suggestions.push(`Expand the post to at least ${MIN_WORD_COUNT} words.`);
    deductions += 20;
  }

  if (kw) {
    const kwDensity = wordCount > 0 ? (countOccurrences(content, kw) / wordCount) * 100 : 0;
    checks.keywordDensity = kwDensity >= 0.5 && kwDensity <= 2.5;
    if (kwDensity < 0.5) {
      issues.push({ severity: 'warning', message: `Keyword density is ${kwDensity.toFixed(2)}% — too low (min 0.5%).` });
      suggestions.push(`Use the keyword "${keyword}" more naturally throughout the post.`);
      deductions += 8;
    } else if (kwDensity > 2.5) {
      issues.push({ severity: 'warning', message: `Keyword density is ${kwDensity.toFixed(2)}% — too high (max 2.5%). May look like keyword stuffing.` });
      suggestions.push(`Reduce repeated use of "${keyword}" to avoid keyword stuffing.`);
      deductions += 8;
    }

    checks.keywordInFirstParagraph = contentLower.indexOf(kw) < 200;
    if (!checks.keywordInFirstParagraph) {
      issues.push({ severity: 'info', message: `Focus keyword not found in first ~200 characters of content.` });
      suggestions.push(`Mention the focus keyword "${keyword}" early in the first paragraph.`);
      deductions += 5;
    }
  }

  // --- Tags check ---
  checks.hasTags = Array.isArray(tags) && tags.length >= 2;
  if (!checks.hasTags) {
    issues.push({ severity: 'info', message: `Post has fewer than 2 tags.` });
    suggestions.push('Add at least 2–5 relevant tags to improve discoverability.');
    deductions += 4;
  }

  const score = Math.max(0, 100 - deductions);

  return {
    score,
    grade: toGrade(score),
    issues,
    suggestions,
    checks,
  };
}
