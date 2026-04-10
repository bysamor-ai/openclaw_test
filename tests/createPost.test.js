import { createPost } from '../src/skills/createPost.js';

describe('createPost', () => {
  test('creates a post with required fields from a topic', () => {
    const post = createPost({ topic: 'JavaScript testing' });

    expect(post.topic).toBe('JavaScript testing');
    expect(post.title).toBe('JavaScript testing');
    expect(typeof post.slug).toBe('string');
    expect(post.slug).toMatch(/^[a-z0-9-]+$/);
    expect(Array.isArray(post.sections)).toBe(true);
    expect(post.sections.length).toBeGreaterThan(0);
    expect(post.createdAt).toBeInstanceOf(Date);
  });

  test('uses a custom title when provided', () => {
    const post = createPost({ topic: 'TypeScript', title: 'Why TypeScript is Worth It' });
    expect(post.title).toBe('Why TypeScript is Worth It');
    expect(post.slug).toBe('why-typescript-is-worth-it');
  });

  test('slugifies special characters in the title', () => {
    const post = createPost({ topic: 'React & Next.js: A Deep Dive!' });
    expect(post.slug).not.toMatch(/[^a-z0-9-]/);
  });

  test('applies the howTo template', () => {
    const post = createPost({ topic: 'Docker', template: 'howTo' });
    expect(post.template).toBe('howTo');
    const headings = post.sections.map((s) => s.heading);
    expect(headings).toContain('Prerequisites');
    expect(headings).toContain('Step-by-Step Instructions');
  });

  test('applies the listicle template', () => {
    const post = createPost({ topic: 'productivity hacks', template: 'listicle' });
    const headings = post.sections.map((s) => s.heading);
    expect(headings).toContain('Item List');
  });

  test('respects a custom wordCountTarget', () => {
    const post = createPost({ topic: 'Python', wordCountTarget: 1200 });
    expect(post.wordCountTarget).toBe(1200);
  });

  test('defaults wordCountTarget to 800', () => {
    const post = createPost({ topic: 'Node.js' });
    expect(post.wordCountTarget).toBe(800);
  });

  test('generates tags from the topic', () => {
    const post = createPost({ topic: 'machine learning algorithms' });
    expect(Array.isArray(post.tags)).toBe(true);
    expect(post.tags.length).toBeGreaterThan(0);
  });

  test('throws when topic is missing', () => {
    expect(() => createPost({})).toThrow(TypeError);
  });

  test('throws when topic is an empty string', () => {
    expect(() => createPost({ topic: '   ' })).toThrow(TypeError);
  });

  test('throws for an unknown template key', () => {
    expect(() => createPost({ topic: 'test', template: 'nonExistent' })).toThrow(TypeError);
  });

  test('throws when wordCountTarget is not a positive integer', () => {
    expect(() => createPost({ topic: 'test', wordCountTarget: -5 })).toThrow(TypeError);
    expect(() => createPost({ topic: 'test', wordCountTarget: 0 })).toThrow(TypeError);
    expect(() => createPost({ topic: 'test', wordCountTarget: 1.5 })).toThrow(TypeError);
  });

  test('section content references the topic', () => {
    const post = createPost({ topic: 'GraphQL' });
    const hasTopicRef = post.sections.every((s) =>
      s.content.includes('GraphQL')
    );
    expect(hasTopicRef).toBe(true);
  });
});
