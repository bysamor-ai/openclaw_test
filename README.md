# Smart Blog Skills Plugin

A lightweight, dependency-free JavaScript plugin that provides composable **blog writing skills** — post scaffolding, content outlining, SEO analysis, and readability grading — all as pure functions with no I/O side-effects.

## Skills

| Skill | Description |
|---|---|
| `createPost` | Scaffold a full blog post from a topic, template, and word-count target |
| `outlineContent` | Generate a hierarchical H2/H3 content outline |
| `optimizeSEO` | Score a post for SEO quality and return actionable suggestions |
| `analyzeReadability` | Grade content with Flesch Reading Ease and flag style issues |

## Installation

```bash
npm install
```

## Usage

```js
import { createPost, outlineContent, optimizeSEO, analyzeReadability } from './src/index.js';

// 1. Scaffold a post
const post = createPost({
  topic: 'JavaScript performance tips',
  template: 'howTo',
  wordCountTarget: 1200,
});

// 2. Generate an outline
const outline = outlineContent({ topic: post.topic, subPointsPerSection: 3 });

// 3. Check SEO (after writing the content)
const seo = optimizeSEO({
  title: post.title,
  metaDescription: post.metaDescription,
  content: '<your written content>',
  keyword: 'JavaScript performance',
  tags: post.tags,
});
console.log(`SEO score: ${seo.score}/100 (${seo.grade})`);

// 4. Check readability
const readability = analyzeReadability({ content: '<your written content>' });
console.log(`Readability: ${readability.level} (Flesch ${readability.fleschScore})`);
```

## Available Templates

| Key | Name |
|---|---|
| `howTo` | How-To Guide |
| `listicle` | Listicle |
| `opinion` | Opinion / Thought Leadership |
| `review` | Product Review |
| `generic` | Generic Post (default) |

## Running Tests

```bash
npm test
```

## Project Structure

```
src/
  index.js                  – Plugin entry point (re-exports all skills)
  skills/
    createPost.js           – Post scaffolding skill
    outlineContent.js       – Content outline skill
    optimizeSEO.js          – SEO analysis skill
    analyzeReadability.js   – Readability grading skill
  utils/
    templates.js            – Built-in post templates
    validators.js           – Input validation helpers
tests/
  createPost.test.js
  outlineContent.test.js
  optimizeSEO.test.js
  analyzeReadability.test.js
```
