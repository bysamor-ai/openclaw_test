/**
 * Skill: createPost
 *
 * Scaffolds a structured blog post object from a topic and optional settings.
 * The result is a plain data structure (no I/O) that callers can render, store,
 * or pass to other skills such as optimizeSEO or analyzeReadability.
 */

import { getTemplate, TEMPLATE_KEYS } from '../utils/templates.js';
import { requireString, optionalPositiveInt, requireOneOf } from '../utils/validators.js';

/**
 * @typedef {Object} PostSection
 * @property {string} heading  - Section heading text
 * @property {string} content  - Placeholder / generated body content
 */

/**
 * @typedef {Object} BlogPost
 * @property {string}        title        - Post title
 * @property {string}        topic        - Original topic input
 * @property {string}        slug         - URL-friendly slug
 * @property {string[]}      tags         - Suggested tags
 * @property {string}        metaDescription - Short SEO description
 * @property {string}        template     - Template key used
 * @property {number}        wordCountTarget - Target word count
 * @property {PostSection[]} sections     - Ordered list of sections
 * @property {Date}          createdAt    - Creation timestamp
 */

/**
 * Derive a URL-friendly slug from a title string.
 *
 * @param {string} title
 * @returns {string}
 */
function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generate a minimal meta description from the topic.
 *
 * @param {string} topic
 * @param {string} templateName
 * @returns {string}
 */
function buildMetaDescription(topic, templateName) {
  return `A comprehensive ${templateName.toLowerCase()} about ${topic}. Explore key insights, practical tips, and expert guidance.`;
}

/**
 * Derive a simple set of tags from the topic.
 *
 * @param {string} topic
 * @returns {string[]}
 */
function extractTags(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 5);
}

/**
 * Build section scaffolds from template section headings.
 *
 * @param {string[]} headings
 * @param {string}   topic
 * @returns {PostSection[]}
 */
function buildSections(headings, topic) {
  return headings.map((heading) => ({
    heading,
    content: `[Write your "${heading}" content about "${topic}" here.]`,
  }));
}

/**
 * Create a scaffolded blog post.
 *
 * @param {Object} options
 * @param {string} options.topic          - The subject of the post (required)
 * @param {string} [options.title]        - Custom title; defaults to topic
 * @param {string} [options.template]     - Template key (default: 'generic')
 * @param {number} [options.wordCountTarget=800] - Desired word count
 * @returns {BlogPost}
 */
export function createPost({ topic, title, template = 'generic', wordCountTarget } = {}) {
  requireString(topic, 'topic');
  requireOneOf(template, TEMPLATE_KEYS, 'template');
  const wct = optionalPositiveInt(wordCountTarget, 800, 'wordCountTarget');

  const resolvedTitle = (typeof title === 'string' && title.trim()) ? title.trim() : topic.trim();
  const tpl = getTemplate(template);

  return {
    title: resolvedTitle,
    topic: topic.trim(),
    slug: slugify(resolvedTitle),
    tags: extractTags(topic),
    metaDescription: buildMetaDescription(topic.trim(), tpl.name),
    template,
    wordCountTarget: wct,
    sections: buildSections(tpl.sections, topic.trim()),
    createdAt: new Date(),
  };
}
