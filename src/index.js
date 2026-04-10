/**
 * Smart Blog Skills Plugin
 *
 * Exposes a set of composable blog writing skills:
 *   - createPost       – scaffold a full blog post from a topic + options
 *   - outlineContent   – generate a structured content outline
 *   - optimizeSEO      – analyse and score a post for SEO, return suggestions
 *   - analyzeReadability – grade readability and suggest improvements
 */

export { createPost } from './skills/createPost.js';
export { outlineContent } from './skills/outlineContent.js';
export { optimizeSEO } from './skills/optimizeSEO.js';
export { analyzeReadability } from './skills/analyzeReadability.js';

/**
 * Convenience factory that bundles all skills into a single plugin object.
 *
 * @returns {{ createPost, outlineContent, optimizeSEO, analyzeReadability }}
 */
export async function createBlogPlugin() {
  const { createPost } = await import('./skills/createPost.js');
  const { outlineContent } = await import('./skills/outlineContent.js');
  const { optimizeSEO } = await import('./skills/optimizeSEO.js');
  const { analyzeReadability } = await import('./skills/analyzeReadability.js');

  return { createPost, outlineContent, optimizeSEO, analyzeReadability };
}
