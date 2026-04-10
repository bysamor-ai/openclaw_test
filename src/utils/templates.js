/**
 * Built-in blog post templates.
 *
 * Each template provides a structural skeleton (sections array) and default
 * front-matter that can be overridden by the caller.
 */

export const TEMPLATES = {
  /** Classic how-to guide */
  howTo: {
    name: 'How-To Guide',
    sections: [
      'Introduction',
      'Prerequisites',
      'Step-by-Step Instructions',
      'Common Mistakes to Avoid',
      'Tips and Best Practices',
      'Conclusion',
    ],
    frontMatter: {
      type: 'how-to',
      estimatedReadTime: 5,
    },
  },

  /** Listicle post */
  listicle: {
    name: 'Listicle',
    sections: [
      'Introduction',
      'Item List',
      'Honorable Mentions',
      'Conclusion',
    ],
    frontMatter: {
      type: 'listicle',
      estimatedReadTime: 4,
    },
  },

  /** In-depth opinion / thought-leadership piece */
  opinion: {
    name: 'Opinion / Thought Leadership',
    sections: [
      'Hook / Opening Statement',
      'Context and Background',
      'Core Argument',
      'Supporting Evidence',
      'Counter-Arguments and Rebuttals',
      'Call to Action',
    ],
    frontMatter: {
      type: 'opinion',
      estimatedReadTime: 7,
    },
  },

  /** Product or tool review */
  review: {
    name: 'Product Review',
    sections: [
      'Introduction',
      'Overview',
      'Key Features',
      'Pros and Cons',
      'Who Is It For?',
      'Final Verdict',
    ],
    frontMatter: {
      type: 'review',
      estimatedReadTime: 6,
    },
  },

  /** Generic / freeform */
  generic: {
    name: 'Generic Post',
    sections: [
      'Introduction',
      'Main Body',
      'Conclusion',
    ],
    frontMatter: {
      type: 'generic',
      estimatedReadTime: 4,
    },
  },
};

/**
 * Return a template by key, falling back to 'generic' if not found.
 *
 * @param {string} key
 * @returns {object}
 */
export function getTemplate(key) {
  return TEMPLATES[key] ?? TEMPLATES.generic;
}

/** Names of all available templates. */
export const TEMPLATE_KEYS = Object.keys(TEMPLATES);
