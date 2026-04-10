import { analyzeReadability } from '../src/skills/analyzeReadability.js';

const EASY_TEXT =
  'The cat sat on the mat. It was a big cat. The mat was red. I like cats.';

const COMPLEX_TEXT =
  'The implementation of sophisticated algorithmic frameworks necessitates ' +
  'comprehensive understanding of computational paradigms and their theoretical ' +
  'underpinnings, particularly with respect to asymptotic complexity analysis. ' +
  'Furthermore, the utilization of advanced data structures requires practitioners ' +
  'to possess multifaceted expertise in mathematical foundations and engineering principles.';

describe('analyzeReadability', () => {
  test('returns a Flesch score between 0 and 100', () => {
    const report = analyzeReadability({ content: EASY_TEXT });
    expect(report.fleschScore).toBeGreaterThanOrEqual(0);
    expect(report.fleschScore).toBeLessThanOrEqual(100);
  });

  test('easy text scores higher than complex text', () => {
    const easyReport = analyzeReadability({ content: EASY_TEXT });
    const complexReport = analyzeReadability({ content: COMPLEX_TEXT });
    expect(easyReport.fleschScore).toBeGreaterThan(complexReport.fleschScore);
  });

  test('returns a readability level string', () => {
    const report = analyzeReadability({ content: EASY_TEXT });
    const validLevels = ['Very Easy', 'Easy', 'Fairly Easy', 'Standard', 'Fairly Difficult', 'Difficult', 'Very Difficult'];
    expect(validLevels).toContain(report.level);
  });

  test('reports correct word count', () => {
    const report = analyzeReadability({ content: 'Hello world foo bar' });
    expect(report.wordCount).toBe(4);
  });

  test('reports correct sentence count', () => {
    const report = analyzeReadability({ content: 'First sentence. Second sentence! Third?' });
    expect(report.sentenceCount).toBe(3);
  });

  test('reports avgSentenceLen', () => {
    const report = analyzeReadability({ content: EASY_TEXT });
    expect(typeof report.avgSentenceLen).toBe('number');
    expect(report.avgSentenceLen).toBeGreaterThan(0);
  });

  test('flags long sentences in suggestions', () => {
    const longSentenceText = (
      'This is an extremely long sentence that contains a very large number of words ' +
      'and is designed to exceed the recommended threshold for average sentence length ' +
      'which should trigger a warning in the readability analysis output. '
    ).repeat(3);
    const report = analyzeReadability({ content: longSentenceText });
    const hasIssue = report.issues.some((i) => i.message.includes('sentence length'));
    expect(hasIssue).toBe(true);
  });

  test('flags long paragraphs', () => {
    // Build a single paragraph > 150 words
    const bigParagraph = 'word '.repeat(160).trim();
    const report = analyzeReadability({ content: bigParagraph });
    const hasIssue = report.issues.some((i) => i.message.includes('paragraph'));
    expect(hasIssue).toBe(true);
  });

  test('returns suggestions array', () => {
    const report = analyzeReadability({ content: COMPLEX_TEXT });
    expect(Array.isArray(report.suggestions)).toBe(true);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  test('expert target is more lenient on sentence length', () => {
    // The same moderately-long text may not trigger a warning for experts
    const moderateText = (
      'These concepts require careful consideration of various factors. ' +
      'The analysis involves several interdependent variables. '
    ).repeat(5);
    const generalReport = analyzeReadability({ content: moderateText, target: 'general' });
    const expertReport = analyzeReadability({ content: moderateText, target: 'expert' });
    // Expert threshold is higher so fewer or no sentence-length warnings
    const generalWarnings = generalReport.issues.filter((i) => i.message.includes('sentence length')).length;
    const expertWarnings = expertReport.issues.filter((i) => i.message.includes('sentence length')).length;
    expect(expertWarnings).toBeLessThanOrEqual(generalWarnings);
  });

  test('throws when content is missing', () => {
    expect(() => analyzeReadability({})).toThrow(TypeError);
  });

  test('throws when content is an empty string', () => {
    expect(() => analyzeReadability({ content: '' })).toThrow(TypeError);
  });

  test('handles single-sentence content without throwing', () => {
    expect(() => analyzeReadability({ content: 'Just one sentence here.' })).not.toThrow();
  });
});
