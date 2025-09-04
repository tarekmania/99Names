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

export function matchesName(input: string, target: DivineName): boolean {
  const normInput = normalizeCore(input);
  const candidates = [target.englishName, ...target.aliases].map(normalizeCore);
  return candidates.some(c => normInput === c || levenshtein(normInput, c) <= 1);
}