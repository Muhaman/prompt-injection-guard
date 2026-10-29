import { applyRules, type Detector, type Rule } from "./rules.js";

const RULES: Rule[] = [
  {
    pattern: /\byou are (?:now )?(?:DAN\b|an? (?:unrestricted|unfiltered|uncensored|jailbroken)\b)/i,
    score: 0.85,
    reason: "assigns an unrestricted persona",
  },
  {
    pattern: /\b(?:do anything now|developer mode|jailbreak(?:ed)?)\b/i,
    score: 0.7,
    reason: "references a known jailbreak mode",
  },
  {
    pattern:
      /\b(?:pretend|act|behave|roleplay|role-play)\b[^.\n]{0,30}\b(?:as|like|to be)\b[^.\n]{0,40}\b(?:no|without|free (?:of|from))\b[^.\n]{0,20}\b(?:rules|restrictions|limits|limitations|filters|guidelines|ethics)\b/i,
    score: 0.8,
    reason: "asks for a persona without rules or restrictions",
  },
  {
    pattern: /\b(?:without|bypass|disable|turn off)\b[^.\n]{0,20}\b(?:safety|content) (?:policy|policies|filters?|guidelines|checks)\b/i,
    score: 0.7,
    reason: "asks to bypass safety controls",
  },
  {
    pattern: /\bfrom now on,? you (?:are|will|must|shall)\b/i,
    score: 0.6,
    reason: "redefines the model's behaviour from now on",
  },
  {
    pattern: /\bpretend (?:that )?you (?:are|have no|can)\b/i,
    score: 0.5,
    reason: "asks the model to pretend to be something else",
  },
  {
    pattern: /\bno (?:restrictions|limitations|filters)\b/i,
    score: 0.4,
    reason: "mentions having no restrictions",
  },
];

export const rolePlay: Detector = (text) => applyRules(text, RULES);
