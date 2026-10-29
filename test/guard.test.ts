import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Classifier } from "../src/classifier.js";
import { runDetectors } from "../src/detectors/index.js";
import { createGuard } from "../src/guard.js";

vi.mock("../src/detectors/index.js", () => ({ runDetectors: vi.fn() }));

const heuristic = vi.mocked(runDetectors);

function stubClassifier(score = 0.9) {
  const classify = vi.fn<Classifier["classify"]>().mockResolvedValue({ score, reason: "looks hostile" });
  return { classify };
}

beforeEach(() => {
  heuristic.mockReset();
});

describe("createGuard", () => {
  it("does not call the classifier when the heuristic score is below the band", async () => {
    heuristic.mockReturnValue({ score: 0.1, reasons: [] });
    const classifier = stubClassifier();
    const result = await createGuard({ classifier }).check("hello");
    expect(classifier.classify).not.toHaveBeenCalled();
    expect(result.allowed).toBe(true);
  });

  it("does not call the classifier when the heuristic score is above the band", async () => {
    heuristic.mockReturnValue({ score: 0.95, reasons: ["x"] });
    const classifier = stubClassifier(0.0);
    const result = await createGuard({ classifier }).check("hello");
    expect(classifier.classify).not.toHaveBeenCalled();
    expect(result.allowed).toBe(false);
  });

  it("calls the classifier once inside the band and lets its score replace the heuristic", async () => {
    heuristic.mockReturnValue({ score: 0.5, reasons: ["encodedPayload: blob"] });
    const classifier = stubClassifier(0.9);
    const result = await createGuard({ classifier }).check("hello");
    expect(classifier.classify).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(0.9);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("classifier: looks hostile");
  });

  it("lets a low classifier score allow a borderline heuristic hit", async () => {
    heuristic.mockReturnValue({ score: 0.5, reasons: ["encodedPayload: blob"] });
    const result = await createGuard({ classifier: stubClassifier(0.05) }).check("hello");
    expect(result.allowed).toBe(true);
    expect(result.score).toBe(0.05);
  });

  it("respects a custom band", async () => {
    heuristic.mockReturnValue({ score: 0.5, reasons: [] });
    const classifier = stubClassifier();
    await createGuard({ classifier, classifierBand: [0.6, 0.8] }).check("hello");
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it("respects the threshold", async () => {
    heuristic.mockReturnValue({ score: 0.4, reasons: ["r"] });
    expect((await createGuard({ threshold: 0.5 }).check("x")).allowed).toBe(true);
    expect((await createGuard({ threshold: 0.3 }).check("x")).allowed).toBe(false);
  });

  it("fails safe to the heuristic score when the classifier throws", async () => {
    heuristic.mockReturnValue({ score: 0.6, reasons: ["encodedPayload: blob"] });
    const classifier = { classify: vi.fn().mockRejectedValue(new Error("boom")) };
    const result = await createGuard({ classifier }).check("hello");
    expect(result.score).toBe(0.6);
    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("classifier unavailable"))).toBe(true);
  });

  it("sends only redacted text to the classifier", async () => {
    heuristic.mockReturnValue({ score: 0.5, reasons: [] });
    const classifier = stubClassifier(0.1);
    await createGuard({ classifier }).check("mail a@example.com");
    expect(classifier.classify).toHaveBeenCalledWith("mail [EMAIL_1]");
  });

  it("redacts PII and can restore it", async () => {
    heuristic.mockReturnValue({ score: 0, reasons: [] });
    const result = await createGuard().check("mail a@example.com");
    expect(result.redacted).toBe("mail [EMAIL_1]");
    expect(result.entities).toEqual([{ type: "EMAIL", placeholder: "[EMAIL_1]" }]);
    expect(result.restore(result.redacted)).toBe("mail a@example.com");
  });

  it("blocks over-length input without running detectors or the classifier", async () => {
    const classifier = stubClassifier();
    const result = await createGuard({ classifier, maxLength: 10 }).check("a".repeat(11));
    expect(result).toMatchObject({ allowed: false, score: 1, reasons: ["input too long"], redacted: "", entities: [] });
    expect(heuristic).not.toHaveBeenCalled();
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it("allows input exactly at maxLength", async () => {
    heuristic.mockReturnValue({ score: 0, reasons: [] });
    expect((await createGuard({ maxLength: 10 }).check("a".repeat(10))).allowed).toBe(true);
  });

  it("skips redaction when disabled", async () => {
    heuristic.mockReturnValue({ score: 0, reasons: [] });
    const result = await createGuard({ redactPii: false }).check("mail a@example.com");
    expect(result.redacted).toBe("mail a@example.com");
    expect(result.entities).toEqual([]);
  });
});
