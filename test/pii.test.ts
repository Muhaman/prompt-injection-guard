import { describe, expect, it } from "vitest";
import { redactPii } from "../src/pii/redact.js";

describe("redactPii", () => {
  it("redacts a Luhn-valid card number", () => {
    const r = redactPii("Card: 4111 1111 1111 1111 thanks");
    expect(r.redacted).toBe("Card: [CARD_1] thanks");
    expect(r.entities).toEqual([{ type: "CARD", placeholder: "[CARD_1]" }]);
  });

  it("leaves a card-like number that fails Luhn", () => {
    const text = "Order 4111 1111 1111 1112 shipped";
    expect(redactPii(text).redacted).toBe(text);
  });

  it("numbers distinct emails and reuses placeholders for repeats", () => {
    const r = redactPii("a@example.com, b@example.com, a@example.com");
    expect(r.redacted).toBe("[EMAIL_1], [EMAIL_2], [EMAIL_1]");
    expect(r.entities).toHaveLength(2);
  });

  it("restores the original text", () => {
    const text = "Mail a@example.com or call (415) 555-0132; SSN 123-45-6789.";
    const r = redactPii(text);
    expect(r.redacted).not.toContain("a@example.com");
    expect(r.restore(r.redacted)).toBe(text);
  });

  it("redacts phone and SSN", () => {
    const r = redactPii("Call +1 415-555-0132, SSN 123-45-6789");
    expect(r.redacted).toBe("Call [PHONE_1], SSN [SSN_1]");
  });

  it("redacts a valid IBAN but not a bad checksum", () => {
    expect(redactPii("Pay DE89 3704 0044 0532 0130 00 today").redacted).toBe("Pay [IBAN_1] today");
    const bad = "Pay DE00 3704 0044 0532 0130 00 today";
    expect(redactPii(bad).redacted).toBe(bad);
  });

  it("redacts API keys as SECRET", () => {
    const r = redactPii("key=sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789");
    expect(r.redacted).toBe("key=[SECRET_1]");
  });

  it("restores text produced by the model that reuses placeholders", () => {
    const r = redactPii("Write to a@example.com");
    expect(r.restore("Sure, I will write to [EMAIL_1].")).toBe("Sure, I will write to a@example.com.");
  });
});
