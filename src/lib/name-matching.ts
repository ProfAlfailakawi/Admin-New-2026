import { normalizeArabic } from './utils';

/**
 * SMART PRODUCT NAME MATCHING LIBRARY
 * Handles Arabic normalization and fuzzy string matching
 */

/**
 * Calculates Levenshtein distance between two strings
 */
export const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[a.length][b.length];
};

/**
 * Returns a similarity score between 0 and 1
 */
export const getSimilarity = (s1: string, s2: string): number => {
  const norm1 = normalizeArabic(s1);
  const norm2 = normalizeArabic(s2);
  
  if (norm1 === norm2) return 1;
  
  // 1. Full substring containment (bi-directional)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const lengthDiff = Math.abs(norm1.length - norm2.length);
    const maxLength = Math.max(norm1.length, norm2.length);
    // If one is inside the other, they are very similar. 
    // Small words inside big ones are less certain than big inside slightly bigger.
    return 1 - (lengthDiff / maxLength) * 0.4; 
  }

  // 2. Word-level matching (handling out-of-order words)
  const words1 = norm1.split(/\s+/).filter(w => w.length > 1);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 1);
  
  if (words1.length > 0 && words2.length > 0) {
    let matchedWords = 0;
    const largerSet = words1.length > words2.length ? words1 : words2;
    const smallerSet = words1.length > words2.length ? words2 : words1;
    
    for (const w1 of smallerSet) {
      if (largerSet.some(w2 => w2.includes(w1) || w1.includes(w2))) {
        matchedWords++;
      }
    }
    
    if (matchedWords > 0) {
      const matchRatio = matchedWords / Math.max(words1.length, words2.length);
      if (matchRatio >= 0.5) return matchRatio * 0.9;
    }
  }

  // 3. Fallback to Levenshtein for typos
  const distance = getLevenshteinDistance(norm1, norm2);
  const longest = Math.max(norm1.length, norm2.length);
  return (longest - distance) / longest;
};

/**
 * Finds the best match for a given product name from existing products
 */
export const findBestProductMatch = (
  input: string, 
  existingProducts: { name: string }[],
  memory: Record<string, string> = {},
  threshold = 0.7
): string | null => {
  if (!input || input.length < 3) return null;

  const normalizedInput = normalizeArabic(input);

  // 1. Check learning memory first
  if (memory[normalizedInput]) {
    return memory[normalizedInput];
  }

  // 2. Exact match in existing products (normalized)
  const exactMatch = existingProducts.find(p => normalizeArabic(p.name) === normalizedInput);
  if (exactMatch) return exactMatch.name;

  // 3. Fuzzy match
  let bestMatch: string | null = null;
  let highestScore = 0;

  // Track unique names to avoid redundant calculations
  const uniqueNames = Array.from(new Set(existingProducts.map(p => p.name)));

  for (const name of uniqueNames) {
    const score = getSimilarity(input, name);
    if (score > highestScore && score >= threshold) {
      highestScore = score;
      bestMatch = name;
    }
  }

  return bestMatch;
};
