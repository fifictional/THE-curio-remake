import { TOPIC_MERGE_SIMILARITY } from './constants';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'and',
  'or',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'into',
  'about',
]);

/** Lightweight topic normalization for dedup without pgvector */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTitleCaseMinorWord(word: string): boolean {
  if (word.length === 1) {
    return false;
  }
  return STOP_WORDS.has(word) || word === 'vs';
}

function capitalizeWordPart(part: string): string {
  if (!part) return part;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

/** Leave acronyms (USA, AI) and mixed-case proper nouns (iOS) from the LLM untouched. */
function shouldPreserveCasing(token: string): boolean {
  const letters = token.match(/[A-Za-z]/g);
  if (!letters || letters.length === 0) {
    return false;
  }
  const joined = letters.join('');
  if (joined.length >= 2 && joined === joined.toUpperCase()) {
    return true;
  }
  return /[A-Z]/.test(token.slice(1));
}

/** Capitalize alpha segments, preserving punctuation (O'Reilly, don't) and hyphenated parts. */
function capitalizeToken(token: string): string {
  if (shouldPreserveCasing(token)) {
    return token;
  }

  const apostropheParts = token.split("'");
  if (apostropheParts.length > 1) {
    return apostropheParts
      .map((part, index) => {
        if (index === 0) {
          return part.replace(/[a-zA-Z]+/g, (segment) => capitalizeWordPart(segment));
        }
        if (part.length === 1 && /[a-z]/i.test(part)) {
          return part.toLowerCase();
        }
        return part.replace(/[a-zA-Z]+/g, (segment) => capitalizeWordPart(segment));
      })
      .join("'");
  }

  return token
    .split('-')
    .map((part) => part.replace(/[a-zA-Z]+/g, (segment) => capitalizeWordPart(segment)))
    .join('-');
}

/** Case-law citations use " v " or " v. " between parties — not comparison "vs". */
function isCaseLawTopic(topic: string): boolean {
  return /\s+v\.?\s+/i.test(topic);
}

function isCaseLawConnector(token: string): boolean {
  const bare = token.replace(/[^A-Za-z]/g, '').toLowerCase();
  return bare === 'v';
}

/**
 * Display label for memory topics.
 * - General topics: title case (Harry Potter Spells); preserves LLM acronyms (iOS, COVID-19).
 * - Case-law names: title-case parties; connector stays lowercase "v" (OSCOLA / Bluebook style).
 */
export function formatTopicDisplayName(topic: string): string {
  const trimmed = topic.trim();
  if (!trimmed) {
    return trimmed;
  }

  const tokens = trimmed.split(/\s+/);
  const caseLaw = isCaseLawTopic(trimmed);

  return tokens
    .map((token, index) => {
      if (caseLaw && isCaseLawConnector(token)) {
        return token.replace(/[A-Z]/g, (char) => char.toLowerCase());
      }

      const bare = token.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      if (!caseLaw && index > 0 && isTitleCaseMinorWord(bare)) {
        return token.toLowerCase();
      }

      return capitalizeToken(token);
    })
    .join(' ');
}

function contentWords(topic: string): string[] {
  return normalizeTopic(topic)
    .split(' ')
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

function uniqueWords(words: string[]): string[] {
  return words.filter((word, index) => words.indexOf(word) === index);
}

function countIntersection(uniqueA: string[], uniqueB: string[]): number {
  const lookup = new Set(uniqueB);
  let intersection = 0;
  for (let index = 0; index < uniqueA.length; index += 1) {
    if (lookup.has(uniqueA[index])) {
      intersection += 1;
    }
  }
  return intersection;
}

function bigrams(words: string[]): string[] {
  const pairs: string[] = [];
  for (let index = 0; index < words.length - 1; index += 1) {
    pairs.push(`${words[index]} ${words[index + 1]}`);
  }
  return pairs;
}

export function topicSimilarity(a: string, b: string): number {
  const na = normalizeTopic(a);
  const nb = normalizeTopic(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.95;

  const wa = contentWords(a);
  const wb = contentWords(b);
  if (wa.length === 0 || wb.length === 0) return 0;

  const uniqueA = uniqueWords(wa);
  const uniqueB = uniqueWords(wb);
  const intersection = countIntersection(uniqueA, uniqueB);

  const jaccard = (2 * intersection) / (uniqueA.length + uniqueB.length);
  const sharedBigrams = bigrams(wa).filter((pair) => bigrams(wb).includes(pair));

  if (sharedBigrams.length > 0 && intersection >= 2) {
    return Math.max(jaccard, 0.9);
  }

  if (
    sharedBigrams.length > 0 &&
    intersection >= 1 &&
    Math.min(uniqueA.length, uniqueB.length) <= 3
  ) {
    return Math.max(jaccard, 0.88);
  }

  const [smaller, larger] =
    uniqueA.length <= uniqueB.length ? [uniqueA, uniqueB] : [uniqueB, uniqueA];
  const largerLookup = new Set(larger);
  let contained = 0;
  for (let index = 0; index < smaller.length; index += 1) {
    if (largerLookup.has(smaller[index])) {
      contained += 1;
    }
  }
  const subsetRatio = contained / smaller.length;
  if (subsetRatio >= 0.67 && intersection >= 2) {
    return Math.max(jaccard, 0.87);
  }

  return jaccard;
}

export function areSimilarTopics(
  a: string,
  b: string,
  threshold = TOPIC_MERGE_SIMILARITY,
): boolean {
  return topicSimilarity(a, b) >= threshold;
}
