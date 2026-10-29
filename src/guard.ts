import { ClassifierError, type Classifier } from "./classifier.js";
import { runDetectors } from "./detectors/index.js";
import type { PiiType } from "./pii/patterns.js";
import { redactPii } from "./pii/redact.js";

export interface GuardOptions {
  /** Scores at or above this are blocked. Default 0.5. */
  threshold?: number;
  classifier?: Classifier;
  /** Inclusive heuristic score range that is escalated to the classifier. Default [0.3, 0.7]. */
  classifierBand?: [number, number];
  /** Default true. */
  redactPii?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  score: number;
  reasons: string[];
  redacted: string;
  entities: { type: PiiType; placeholder: string }[];
  restore(text: string): string;
}

export interface Guard {
  check(text: string): Promise<GuardResult>;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function createGuard(options: GuardOptions = {}): Guard {
  const threshold = options.threshold ?? 0.5;
  const [bandLow, bandHigh] = options.classifierBand ?? [0.3, 0.7];
  const { classifier } = options;
  const shouldRedact = options.redactPii ?? true;

  return {
    async check(text) {
      const pii = shouldRedact
        ? redactPii(text)
        : { redacted: text, entities: [], restore: (s: string) => s };

      const heuristic = runDetectors(text);
      let score = heuristic.score;
      const reasons = [...heuristic.reasons];

      if (classifier && score >= bandLow && score <= bandHigh) {
        try {
          // Only the redacted text leaves the process.
          const verdict = await classifier.classify(pii.redacted);
          score = clamp01(verdict.score);
          reasons.push(`classifier: ${verdict.reason}`);
        } catch (err) {
          const code = err instanceof ClassifierError ? err.code : "unknown_error";
          reasons.push(`classifier unavailable (${code}); using heuristic score`);
        }
      }

      return {
        allowed: score < threshold,
        score,
        reasons,
        redacted: pii.redacted,
        entities: pii.entities,
        restore: pii.restore,
      };
    },
  };
}
