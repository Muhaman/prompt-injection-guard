export interface DetectorResult {
  score: number;
  reasons: string[];
}

/** Scores text in 0..1; reasons explain every rule that fired. */
export type Detector = (text: string) => DetectorResult;

export interface Rule {
  pattern: RegExp;
  score: number;
  reason: string;
}

/** Runs every rule; the detector score is the strongest match. */
export function applyRules(text: string, rules: readonly Rule[]): DetectorResult {
  let score = 0;
  const reasons: string[] = [];
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      score = Math.max(score, rule.score);
      reasons.push(rule.reason);
    }
  }
  return { score, reasons };
}
