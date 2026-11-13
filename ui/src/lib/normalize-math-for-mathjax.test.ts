import { describe, expect, it } from 'vitest';
import { normalizeMathForMathJax } from './normalize-math-for-mathjax';

describe('normalizeMathForMathJax', () => {
  it('wraps MC option shape with bare LaTeX like (8\\pi)', () => {
    expect(normalizeMathForMathJax('(8\\pi)')).toBe('\\(8\\pi\\)');
    expect(normalizeMathForMathJax('  (16\\pi)  ')).toBe('\\(16\\pi\\)');
  });

  it('wraps numeric option without pi', () => {
    expect(normalizeMathForMathJax('(64)')).toBe('(64)');
  });

  it('converts radius (r = n) to inline math', () => {
    expect(normalizeMathForMathJax('What is the area with radius (r = 4)?')).toBe(
      'What is the area with radius \\(r = 4\\)?',
    );
    expect(
      normalizeMathForMathJax('What is the area of a circle with radius (r = 4)?'),
    ).toBe('What is the area of a circle with radius \\(r = 4\\)?');
  });

  it('does not alter fenced code blocks', () => {
    const md = '```\n\\pi\n```';
    expect(normalizeMathForMathJax(md)).toBe(md);
  });

  it('leaves already-delimited math unchanged', () => {
    expect(normalizeMathForMathJax('\\(25\\pi\\)')).toBe('\\(25\\pi\\)');
  });
});
