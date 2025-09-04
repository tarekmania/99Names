import { DivineName } from '@/data/names';

export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}+/gu, "");
}

export function normalizeCore(raw: string): string {
  let s = stripDiacritics(raw.toLowerCase().trim());
  s = s.replace(/[^a-z]/g, "");        // remove non-letters
  s = s.replace(/^(ar|al)/, "");       // drop ar-/al- prefix

  // collapse repeated vowels
  s = s.replace(/a+/g, "a")
       .replace(/e+/g, "e")
       .replace(/i+/g, "i")
       .replace(/o+/g, "o")
       .replace(/u+/g, "u");

  // digraph normalization
  s = s.replace(/ae/g, "a")
       .replace(/ou/g, "u")
       .replace(/ai|ei/g, "i");

  // guttural simplification
  s = s.replace(/kh/g, "h");

  // allow rahmen -> rahman
  if (s.endsWith("en")) s = s.slice(0, -2) + "an";

  // collapse duplicate consonants
  s = s.replace(/(.)\1+/g, "$1");
  return s;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[b.length];
}

// Similar short names that need strict matching to avoid confusion
const SIMILAR_SHORT_NAMES = new Set([
  'ali', 'alim', 'aleem', 'aalim', 'aalee', 'alee',
  'halim', 'haleem', 'haalim', 
  'hakam', 'haakam', 'hakaam',
  'hakim', 'hakeem', 'haakim',
  'azim', 'azeem', 'aazim',
  'aziz', 'azeez', 'azees'
]);

export function matchesName(input: string, target: DivineName): boolean {
  const normInput = normalizeCore(input);
  const candidates = [target.englishName, ...target.aliases].map(normalizeCore);
  
  // Check for exact matches first
  if (candidates.some(c => normInput === c)) {
    return true;
  }
  
  // For very short inputs (≤ 3 chars), require exact match to avoid confusion
  if (normInput.length <= 3) {
    return false;
  }
  
  // For inputs that are similar to other known short names, be more strict
  if (SIMILAR_SHORT_NAMES.has(normInput) || normInput.length <= 5) {
    // Only allow fuzzy matching for clear elongations or valid variations
    return candidates.some(c => {
      if (normInput === c) return true;
      
      const distance = levenshtein(normInput, c);
      if (distance > 1) return false;
      
      // For known similar short names, only allow if input is clearly longer (elongation)
      if (SIMILAR_SHORT_NAMES.has(normInput) && SIMILAR_SHORT_NAMES.has(c)) {
        return normInput.length > c.length + 1; // Must be significantly longer
      }
      
      // Allow single character additions for elongations (e.g., "aleem" -> "alim")
      if (normInput.length > c.length && distance === 1) {
        return true;
      }
      
      // Disallow matches between similar length short names to prevent confusion
      if (Math.abs(normInput.length - c.length) <= 1 && Math.max(normInput.length, c.length) <= 5) {
        return false;
      }
      
      return distance <= 1;
    });
  }
  
  // For longer names, use the original fuzzy matching
  return candidates.some(c => levenshtein(normInput, c) <= 1);
}