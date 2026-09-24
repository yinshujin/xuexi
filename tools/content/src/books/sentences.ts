/**
 * Split page text into sentences for reading along. Keeps the punctuation,
 * joins broken lines, and does not split after common abbreviations
 * ("Mr. Sloth", "Mrs. Penguin").
 */
const ABBREV = /\b(?:Mr|Mrs|Ms|Dr|St|Mt|Jr|Sr|vs)\.$/;

export function splitSentences(text: string): string[] {
  const clean = text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];
  const out: string[] = [];
  let cur = '';
  const tokens = clean.split(' ');
  tokens.forEach((tok, i) => {
    cur = cur ? `${cur} ${tok}` : tok;
    const next = tokens[i + 1];
    const ends = /[.!?…]["')\]]?$/.test(tok) && !ABBREV.test(tok);
    if (ends && (next === undefined || /^["'(\[]?[A-Z0-9]/.test(next))) {
      out.push(cur);
      cur = '';
    }
  });
  if (cur) out.push(cur);
  return out;
}

/** Words of a sentence as printed (with their punctuation). */
export function tokens(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean);
}

/** Letters/digits only, lowercase: for matching TTS word boundaries to tokens. */
export function bare(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');
}
