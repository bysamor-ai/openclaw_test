import { optimizeSEO } from '../src/skills/optimizeSEO.js';

const LONG_CONTENT = 'Search engine optimization is a critical part of any digital marketing strategy. '
  .repeat(20);

describe('optimizeSEO', () => {
  test('returns a score between 0 and 100', () => {
    const report = optimizeSEO({
      title: 'A Great Post About SEO',
      metaDescription: 'This is a detailed meta description that covers the basics of SEO and helps readers.',
      content: LONG_CONTENT,
    });
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  test('returns a letter grade', () => {
    const report = optimizeSEO({
      title: 'SEO Best Practices for Beginners and Advanced Users',
      metaDescription: 'Discover the top SEO techniques that help your blog rank higher in search results and attract more readers.',
      content: LONG_CONTENT,
      keyword: 'SEO',
      tags: ['seo', 'blogging', 'content'],
    });
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
  });

  test('penalises a short title', () => {
    const report = optimizeSEO({
      title: 'Hi',
      metaDescription: 'This is a perfectly fine meta description that is within the recommended character limit.',
      content: LONG_CONTENT,
    });
    const hasTitleIssue = report.issues.some((i) => i.message.includes('Title is'));
    expect(hasTitleIssue).toBe(true);
  });

  test('penalises missing keyword in title', () => {
    const report = optimizeSEO({
      title: 'A Generic Title Without the Keyword',
      metaDescription: 'A meta description that mentions content marketing.',
      content: LONG_CONTENT,
      keyword: 'content marketing',
    });
    expect(report.checks.keywordInTitle).toBe(false);
    const hasIssue = report.issues.some((i) => i.message.includes('Focus keyword'));
    expect(hasIssue).toBe(true);
  });

  test('penalises content below minimum word count', () => {
    const report = optimizeSEO({
      title: 'Short Post About Blogging',
      metaDescription: 'A meta description for a short post about blogging tips.',
      content: 'Just a few words.',
    });
    expect(report.checks.wordCount).toBe(false);
    const hasIssue = report.issues.some((i) => i.message.includes('words'));
    expect(hasIssue).toBe(true);
  });

  test('penalises meta description outside ideal range', () => {
    const report = optimizeSEO({
      title: 'Testing Meta Description Length',
      metaDescription: 'Short.',
      content: LONG_CONTENT,
    });
    expect(report.checks.metaLength).toBe(false);
  });

  test('detects keyword in first paragraph', () => {
    const contentWithEarlyKw = 'blogging is important. ' + LONG_CONTENT;
    const report = optimizeSEO({
      title: 'Blogging Tips for Beginners and Experts',
      metaDescription: 'Everything you need to know about blogging and writing great posts.',
      content: contentWithEarlyKw,
      keyword: 'blogging',
    });
    expect(report.checks.keywordInFirstParagraph).toBe(true);
  });

  test('flags insufficient tags', () => {
    const report = optimizeSEO({
      title: 'A Post About Writing',
      metaDescription: 'A meta description about writing and content creation for blogs.',
      content: LONG_CONTENT,
      tags: ['writing'],
    });
    expect(report.checks.hasTags).toBe(false);
  });

  test('passes tag check with 2+ tags', () => {
    const report = optimizeSEO({
      title: 'A Post About Writing',
      metaDescription: 'A meta description about writing and content creation for blogs.',
      content: LONG_CONTENT,
      tags: ['writing', 'blogging'],
    });
    expect(report.checks.hasTags).toBe(true);
  });

  test('returns suggestions array', () => {
    const report = optimizeSEO({
      title: 'T',
      metaDescription: 'Short.',
      content: 'Too short.',
    });
    expect(Array.isArray(report.suggestions)).toBe(true);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  test('throws when title is missing', () => {
    expect(() =>
      optimizeSEO({ title: '', metaDescription: 'x', content: 'y' })
    ).toThrow(TypeError);
  });

  test('throws when content is missing', () => {
    expect(() =>
      optimizeSEO({ title: 'Title', metaDescription: 'desc', content: '' })
    ).toThrow(TypeError);
  });
});
