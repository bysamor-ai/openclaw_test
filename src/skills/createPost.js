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

/** Map of lowercased section headings to hint-generating functions. */
const SECTION_HINTS = {
  'introduction':               (t) => `Introduce "${t}": explain its importance and what readers will learn. Hook the audience and establish reading motivation.`,
  'main body':                  (t) => `Deep-dive into "${t}". Provide concrete information, data, or case studies to support your main points.`,
  'conclusion':                 (t) => `Summarise the key takeaways of "${t}", reinforce the core message, and give readers a clear next step.`,
  'prerequisites':              (t) => `List knowledge, tools, or conditions readers need before tackling "${t}".`,
  'step-by-step instructions':  (t) => `Walk through how to accomplish "${t}" with clear, numbered steps and supporting examples.`,
  'common mistakes to avoid':   (t) => `Identify frequent errors in "${t}" and explain how to recognise and avoid each one.`,
  'tips and best practices':    (t) => `Share actionable tips and best practices for "${t}" to help readers achieve better outcomes.`,
  'item list':                  (t) => `List the most important items related to "${t}", with a short explanation and rationale for each.`,
  'honorable mentions':         (t) => `Highlight notable items related to "${t}" that didn't make the main list but are worth knowing.`,
  'hook / opening statement':   (t) => `Open with a compelling story, question, or statistic that draws readers into "${t}".`,
  'context and background':     (t) => `Provide historical context and current landscape of "${t}" to set the scene for your argument.`,
  'core argument':              (t) => `State your central claim about "${t}" clearly, backed by logic and evidence.`,
  'supporting evidence':        (t) => `Provide research data, expert quotes, or real-world examples that strengthen your argument about "${t}".`,
  'counter-arguments and rebuttals': (t) => `Anticipate objections to your position on "${t}" and provide confident, well-reasoned rebuttals.`,
  'call to action':             (t) => `Encourage readers to take a specific action related to "${t}" and explain how to get started.`,
  'overview':                   (t) => `Give a high-level overview of "${t}", including background, key features, and typical use cases.`,
  'key features':               (t) => `Detail the core features of "${t}", explaining the practical value of each.`,
  'pros and cons':              (t) => `Objectively list the advantages and disadvantages of "${t}" to help readers make an informed decision.`,
  "who is it for?":             (t) => `Describe the ideal audience for "${t}" and note who might not benefit from it.`,
  'final verdict':              (t) => `Deliver your overall assessment of "${t}" and a clear recommendation based on the full review.`,
};

/**
 * Return a writing hint for a section heading.
 *
 * @param {string} heading
 * @param {string} topic
 * @returns {string}
 */
function sectionHint(heading, topic) {
  const fn = SECTION_HINTS[heading.toLowerCase()];
  return fn
    ? fn(topic)
    : `Write the "${heading}" section for "${topic}". Provide specific, valuable information relevant to this part of the post.`;
}

/**
 * Build section scaffolds from template section headings.
 *
 * @param {string[]} headings
 * @param {string}   topic
 * @param {number}   wordTarget  - Per-section word-count target
 * @returns {PostSection[]}
 */
function buildSections(headings, topic, wordTarget) {
  return headings.map((heading) => ({
    heading,
    hint: sectionHint(heading, topic),
    wordTarget,
    content: '',
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
    sections: buildSections(tpl.sections, topic.trim(), Math.round(wct / tpl.sections.length)),
    createdAt: new Date(),
  };
}
