import { isValidIban, isValidLuhn } from "./luhn.js";

export type PiiType = "EMAIL" | "PHONE" | "CARD" | "SSN" | "IBAN" | "SECRET";

export interface PiiPattern {
  type: PiiType;
  regex: RegExp;
  validate?: (match: string) => boolean;
  /** Keep the span reserved even when validation fails, so lower-priority patterns cannot re-match inside it. */
  claimInvalid?: boolean;
}

const isPlausibleSsn = (value: string) => {
  const [area, group, serial] = value.split("-");
  return (
    area !== "000" && area !== "666" && !area?.startsWith("9") && group !== "00" && serial !== "0000"
  );
};

/**
 * Every quantifier is bounded so matching stays linear on adversarial input.
 * Ordered by priority: earlier patterns claim their span first. */
export const PII_PATTERNS: readonly PiiPattern[] = [
  {
    type: "SECRET",
    regex:
      /\b(?:sk-ant-[A-Za-z0-9_-]{8,200}|sk-[A-Za-z0-9_-]{20,200}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,255}|xox[baprs]-[A-Za-z0-9-]{10,100}|eyJ[A-Za-z0-9_-]{10,500}\.[A-Za-z0-9_-]{10,500}\.[A-Za-z0-9_-]{10,500})/g,
  },
  { type: "EMAIL", regex: /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){0,8}\.[A-Za-z]{2,24}\b/g },
  {
    type: "IBAN",
    regex: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g,
    validate: isValidIban,
    claimInvalid: true,
  },
  { type: "CARD", regex: /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g, validate: isValidLuhn, claimInvalid: true },
  { type: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g, validate: isPlausibleSsn },
  { type: "PHONE", regex: /(?<![\w+])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-]?)\d{3}[\s.-]?\d{4}(?!\d)/g },
];
