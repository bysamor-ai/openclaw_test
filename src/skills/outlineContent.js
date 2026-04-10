/**
 * Skill: outlineContent
 *
 * Generates a hierarchical content outline (H2/H3) for a given topic or post.
 * The outline is returned as a plain data structure suitable for review,
 * storage, or further processing by other skills.
 */

import { requireString, optionalPositiveInt } from '../utils/validators.js';

/**
 * @typedef {Object} OutlineItem
 * @property {number}        level     - Heading level (2 = H2, 3 = H3)
 * @property {string}        heading   - Heading text
 * @property {OutlineItem[]} [children] - Nested sub-headings (H3 under H2)
 */

/**
 * @typedef {Object} ContentOutline
 * @property {string}        topic     - The input topic
 * @property {string}        title     - Suggested post title
 * @property {OutlineItem[]} outline   - Hierarchical list of headings
 * @property {number}        depth     - Max nesting depth used
 */

/**
 * Capitalise the first letter of a string.
 *
 * @param {string} s
 * @returns {string}
 */
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Produce deterministic but varied H3 sub-points for a given H2 section.
 *
 * @param {string} section  - Parent H2 heading text
 * @param {string} topic    - The overall topic
 * @param {number} count    - Number of H3 items to generate
 * @returns {OutlineItem[]}
 */
function generateSubPoints(section, topic, count) {
  const qualifiers = [
    `Key aspects of ${topic}`,
    `Common challenges`,
    `Best practices`,
    `Real-world examples`,
    `Tools and resources`,
    `Step-by-step guidance`,
    `Expert tips`,
    `Frequently asked questions`,
  ];

  return qualifiers.slice(0, count).map((text) => ({
    level: 3,
    heading: `${cap(text)} for ${section.toLowerCase()}`,
  }));
}

/**
 * Build a default section list when no custom sections are provided.
 *
 * @param {string} topic
 * @returns {string[]}
 */
function defaultSections(topic) {
  return [
    `Introduction to ${topic}`,
    `Why ${topic} matters`,
    `Core concepts`,
    `Practical applications`,
    `Advanced techniques`,
    `Common pitfalls and how to avoid them`,
    `Conclusion and next steps`,
  ];
}

/**
 * Generate a hierarchical content outline.
 *
 * @param {Object}   options
 * @param {string}   options.topic            - Main topic (required)
 * @param {string[]} [options.sections]       - Custom H2 headings; uses defaults if omitted
 * @param {number}   [options.subPointsPerSection=2] - Number of H3 sub-points per H2
 * @returns {ContentOutline}
 */
export function outlineContent({ topic, sections, subPointsPerSection } = {}) {
  requireString(topic, 'topic');
  const spp = optionalPositiveInt(subPointsPerSection, 2, 'subPointsPerSection');

  const resolvedSections = Array.isArray(sections) && sections.length > 0
    ? sections
    : defaultSections(topic.trim());

  const outline = resolvedSections.map((heading) => {
    const item = { level: 2, heading: cap(heading) };
    if (spp > 0) {
      item.children = generateSubPoints(heading, topic.trim(), spp);
    }
    return item;
  });

  return {
    topic: topic.trim(),
    title: `The Complete Guide to ${cap(topic.trim())}`,
    outline,
    depth: spp > 0 ? 2 : 1,
  };
}
