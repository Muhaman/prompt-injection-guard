import { encodedPayload } from "./encodedPayload.js";
import { hiddenUnicode, normalizeText } from "./hiddenUnicode.js";
import { instructionOverride } from "./instructionOverride.js";
import { markdownExfil } from "./markdownExfil.js";
import { rolePlay } from "./rolePlay.js";
import type { Detector, DetectorResult } from "./rules.js";

export type { Detector, DetectorResult } from "./rules.js";
export { encodedPayload, hiddenUnicode, instructionOverride, markdownExfil, normalizeText, rolePlay };

const NORMALIZED_DETECTORS: Record<string, Detector> = {
  instructionOverride,
  rolePlay,
  encodedPayload,
  markdownExfil,
};

/**
 * Runs every detector and combines them: the score is the maximum, reasons are
 * prefixed with the detector that raised them. `hiddenUnicode` sees the raw text;
 * the rest see the normalized text so zero-width splitting and tag-smuggling
 * cannot hide a phrase from them.
 */
export function runDetectors(text: string): DetectorResult {
  const normalized = normalizeText(text);
  const results: [string, DetectorResult][] = [["hiddenUnicode", hiddenUnicode(text)]];
  for (const [name, detect] of Object.entries(NORMALIZED_DETECTORS)) {
    results.push([name, detect(normalized)]);
  }
  let score = 0;
  const reasons: string[] = [];
  for (const [name, result] of results) {
    score = Math.max(score, result.score);
    for (const reason of result.reasons) reasons.push(`${name}: ${reason}`);
  }
  return { score, reasons };
}
