import { describe, expect, it } from 'vitest';
import { areSimilarTopics, formatTopicDisplayName, topicSimilarity } from './topic-similarity';

describe('formatTopicDisplayName', () => {
  it('title-cases general topics with proper nouns', () => {
    expect(formatTopicDisplayName('Harry potter spells')).toBe('Harry Potter Spells');
    expect(formatTopicDisplayName('mandarin chinese basic greetings')).toBe(
      'Mandarin Chinese Basic Greetings',
    );
  });

  it('title-cases academic topics, keeping minor words lowercase', () => {
    expect(formatTopicDisplayName('Contract Law: Consideration')).toBe(
      'Contract Law: Consideration',
    );
    expect(formatTopicDisplayName('past consideration rule')).toBe('Past Consideration Rule');
    expect(formatTopicDisplayName('Implied Assumpsit exception')).toBe(
      'Implied Assumpsit Exception',
    );
  });

  it('keeps comparison "vs" in title case, not case-law mode', () => {
    expect(formatTopicDisplayName('frontend vs backend')).toBe('Frontend vs Backend');
    expect(formatTopicDisplayName('react vs vue')).toBe('React vs Vue');
    expect(formatTopicDisplayName('AI vs ML')).toBe('AI vs ML');
    expect(formatTopicDisplayName('machine learning vs deep learning')).toBe(
      'Machine Learning vs Deep Learning',
    );
  });

  it('capitalises single-letter designators', () => {
    expect(formatTopicDisplayName('Vitamin A')).toBe('Vitamin A');
    expect(formatTopicDisplayName('vitamin a')).toBe('Vitamin A');
    expect(formatTopicDisplayName('type a personality')).toBe('Type A Personality');
    expect(formatTopicDisplayName('plan b emergency')).toBe('Plan B Emergency');
  });

  it('preserves mixed-case proper nouns and acronyms from the LLM', () => {
    expect(formatTopicDisplayName('iOS App Development')).toBe('iOS App Development');
    expect(formatTopicDisplayName('USA history')).toBe('USA History');
    expect(formatTopicDisplayName('COVID-19 spread')).toBe('COVID-19 Spread');
  });

  it('capitalises tokens with internal punctuation', () => {
    expect(formatTopicDisplayName("o'reilly auto parts")).toBe("O'Reilly Auto Parts");
    expect(formatTopicDisplayName("don't panic")).toBe("Don't Panic");
  });

  it('title-cases case-law names with lowercase v connector', () => {
    expect(
      formatTopicDisplayName(
        'butler machine tool co ltd v ex-cell-o corp (england) ltd',
      ),
    ).toBe('Butler Machine Tool Co Ltd v Ex-Cell-O Corp (England) Ltd');
    expect(formatTopicDisplayName('donoghue v stevenson')).toBe('Donoghue v Stevenson');
  });

  it('leaves numeric tokens unchanged', () => {
    expect(formatTopicDisplayName('chapter 19')).toBe('Chapter 19');
    expect(formatTopicDisplayName('v8 engine basics')).toBe('V8 Engine Basics');
  });
});

describe('topicSimilarity', () => {
  it('treats identical topics as a full match', () => {
    expect(topicSimilarity('Past Consideration Rule', 'past consideration rule')).toBe(1);
  });

  it('matches wording variants of the same legal concept', () => {
    expect(
      areSimilarTopics('past consideration rule', 'past consideration in contract law'),
    ).toBe(true);
  });

  it('does not merge unrelated topics', () => {
    expect(areSimilarTopics('contract law', 'criminal law')).toBe(false);
  });
});
