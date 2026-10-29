import type { Detector } from "./rules.js";

const isTag = (cp: number) => cp >= 0xe0000 && cp <= 0xe007f;
const isBidi = (cp: number) => (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069);
// ZWJ/ZWNJ are legitimate in emoji sequences and several scripts, so they score low on their own.
const isJoiner = (cp: number) => cp === 0x200c || cp === 0x200d;
const isZeroWidth = (cp: number) =>
  (cp >= 0x200b && cp <= 0x200f) || (cp >= 0x2060 && cp <= 0x2064) || cp === 0xfeff;

/**
 * Canonical form used by the other detectors: NFKC, invisible characters removed,
 * and Unicode tag characters decoded to the ASCII they smuggle.
 */
export function normalizeText(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFKC")) {
    const cp = ch.codePointAt(0) ?? 0;
    if (isTag(cp)) {
      const ascii = cp - 0xe0000;
      if (ascii >= 0x20 && ascii <= 0x7e) out += String.fromCharCode(ascii);
    } else if (!isBidi(cp) && !isJoiner(cp) && !isZeroWidth(cp)) {
      out += ch;
    }
  }
  return out;
}

export const hiddenUnicode: Detector = (text) => {
  let tags = 0;
  let bidi = 0;
  let zeroWidth = 0;
  let joiners = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (isTag(cp)) tags++;
    else if (isBidi(cp)) bidi++;
    else if (isZeroWidth(cp)) zeroWidth++;
    else if (isJoiner(cp)) joiners++;
  }
  const reasons: string[] = [];
  let score = 0;
  if (tags > 0) {
    score = 0.95;
    reasons.push(`${tags} invisible Unicode tag character(s)`);
  }
  if (bidi > 0) {
    score = Math.max(score, 0.8);
    reasons.push(`${bidi} bidirectional control character(s)`);
  }
  if (zeroWidth > 0) {
    score = Math.max(score, 0.8);
    reasons.push(`${zeroWidth} zero-width character(s)`);
  }
  if (joiners > 0) {
    score = Math.max(score, 0.2);
    reasons.push(`${joiners} zero-width joiner(s)`);
  }
  return { score, reasons };
};
