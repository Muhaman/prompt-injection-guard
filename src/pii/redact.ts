import { PII_PATTERNS, type PiiType } from "./patterns.js";

export interface PiiEntity {
  type: PiiType;
  placeholder: string;
}

export interface RedactionResult {
  redacted: string;
  entities: PiiEntity[];
  /** Replaces placeholders (e.g. in a model reply) with the original values. */
  restore(text: string): string;
}

interface Span {
  start: number;
  end: number;
  type: PiiType;
  value: string;
}

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && a.end > b.start;

export function redactPii(text: string): RedactionResult {
  const claimed: { start: number; end: number }[] = [];
  const spans: Span[] = [];

  for (const pattern of PII_PATTERNS) {
    for (const match of text.matchAll(pattern.regex)) {
      const value = match[0];
      const range = { start: match.index, end: match.index + value.length };
      if (claimed.some((c) => overlaps(c, range))) continue;
      if (pattern.validate && !pattern.validate(value)) {
        if (pattern.claimInvalid) claimed.push(range);
        continue;
      }
      claimed.push(range);
      spans.push({ ...range, type: pattern.type, value });
    }
  }
  spans.sort((a, b) => a.start - b.start);

  const placeholders = new Map<string, string>();
  const originals = new Map<string, string>();
  const counters = new Map<PiiType, number>();
  const entities: PiiEntity[] = [];
  let redacted = "";
  let cursor = 0;

  for (const span of spans) {
    const key = `${span.type}\u0000${span.value}`;
    let placeholder = placeholders.get(key);
    if (placeholder === undefined) {
      const n = (counters.get(span.type) ?? 0) + 1;
      counters.set(span.type, n);
      placeholder = `[${span.type}_${n}]`;
      placeholders.set(key, placeholder);
      originals.set(placeholder, span.value);
      entities.push({ type: span.type, placeholder });
    }
    redacted += text.slice(cursor, span.start) + placeholder;
    cursor = span.end;
  }
  redacted += text.slice(cursor);

  const restore = (input: string) => {
    let out = input;
    for (const [placeholder, original] of originals) out = out.replaceAll(placeholder, () => original);
    return out;
  };
  return { redacted, entities, restore };
}
