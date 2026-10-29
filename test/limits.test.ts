import { describe, expect, it } from "vitest";
import { createGuard } from "../src/guard.js";

describe("input limits", () => {
  it("blocks input over the default maxLength", async () => {
    const result = await createGuard().check("a".repeat(20_001));
    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(["input too long"]);
  });

  // maxLength is raised so the regexes really run on the adversarial input.
  const guard = createGuard({ maxLength: 100_000 });
  it.each([
    ["dotted local part without @", "a.".repeat(25_000)],
    ["image openers without ]", "![".repeat(25_000)],
    ["link openers without ]", "[".repeat(50_000)],
    ["repeated image prefixes without query", "![](http://x".repeat(4_000)],
    ["whitespace lines", "\n".repeat(50_000)],
    ["repeated JWT prefix", "eyJ".repeat(16_000)],
    ["repeated sk- prefix", "sk-".repeat(16_000)],
    ["spaces after system", `system${" ".repeat(50_000)}`],
  ])("checks %s in under 200 ms", async (_name, text) => {
    const start = performance.now();
    await guard.check(text);
    expect(performance.now() - start).toBeLessThan(200);
  });
});
