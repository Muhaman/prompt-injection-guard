import type { Detector } from "./rules.js";

const BASE64_RUN = /[A-Za-z0-9+/]{40,}={0,2}/g;
const PERCENT_RUN = /(?:%[0-9A-Fa-f]{2}){12,}/g;
const INSTRUCTION_WORDS = /\b(?:ignore|disregard|instructions?|system prompt|reveal|override)\b/i;

function printableRatio(s: string): number {
  if (s.length === 0) return 0;
  let printable = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if ((c >= 32 && c <= 126) || c === 9 || c === 10 || c === 13) printable++;
  }
  return printable / s.length;
}

function scoreBase64(run: string): { score: number; reason: string } {
  // Pure-lowercase or pure-uppercase runs are almost always paths, slugs or identifiers.
  if (!/[A-Z]/.test(run) || !/[a-z]/.test(run)) return { score: 0, reason: "" };
  const decoded = Buffer.from(run, "base64").toString("utf8");
  if (printableRatio(decoded) >= 0.9) {
    return INSTRUCTION_WORDS.test(decoded)
      ? { score: 0.9, reason: "base64 blob decodes to instruction-like text" }
      : { score: 0.6, reason: "base64 blob decodes to readable text" };
  }
  return { score: 0.5, reason: "long opaque base64-like blob" };
}

function scorePercent(run: string): { score: number; reason: string } {
  try {
    const decoded = decodeURIComponent(run);
    return INSTRUCTION_WORDS.test(decoded)
      ? { score: 0.85, reason: "percent-encoded run decodes to instruction-like text" }
      : { score: 0.4, reason: "long percent-encoded run" };
  } catch {
    return { score: 0.4, reason: "long percent-encoded run" };
  }
}

export const encodedPayload: Detector = (text) => {
  let score = 0;
  const reasons: string[] = [];
  const record = (hit: { score: number; reason: string }) => {
    if (hit.score === 0) return;
    score = Math.max(score, hit.score);
    reasons.push(hit.reason);
  };
  for (const m of text.matchAll(BASE64_RUN)) record(scoreBase64(m[0]));
  for (const m of text.matchAll(PERCENT_RUN)) record(scorePercent(m[0]));
  return { score, reasons };
};
