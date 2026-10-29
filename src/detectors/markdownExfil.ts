import { applyRules, type Detector, type Rule } from "./rules.js";

const SENSITIVE_PARAM = "(?:d|data|q|query|c|content|secret|token|key|prompt|session|cookie|history|chat)";

const RULES: Rule[] = [
  {
    pattern: new RegExp(`!\\[[^\\]]{0,200}\\]\\(\\s{0,10}https?:\\/\\/[^)\\s]{0,1000}[?&]${SENSITIVE_PARAM}=[^)\\s]{0,1000}\\)`, "i"),
    score: 0.9,
    reason: "markdown image whose URL carries data in a query parameter",
  },
  {
    pattern: /!\[[^\]]{0,200}\]\(\s{0,10}https?:\/\/[^)\s]{0,1000}\?[^)\s]{0,1000}\)/i,
    score: 0.7,
    reason: "markdown image with a query string (possible data exfiltration)",
  },
  {
    pattern: /<img\b[^>]{0,500}\bsrc\s{0,5}=\s{0,5}["']?https?:\/\/[^"'>\s]{0,1000}\?/i,
    score: 0.7,
    reason: "HTML image with a query string (possible data exfiltration)",
  },
  {
    pattern: /<(?:iframe|script|object|embed)\b/i,
    score: 0.6,
    reason: "embeds active HTML content",
  },
  {
    pattern: new RegExp(`\\[[^\\]]{0,200}\\]\\(\\s{0,10}https?:\\/\\/[^)\\s]{0,1000}[?&]${SENSITIVE_PARAM}=[^)\\s]{0,1000}\\)`, "i"),
    score: 0.5,
    reason: "markdown link whose URL carries data in a query parameter",
  },
  {
    pattern: /\b(?:append|embed|encode|include|put)\b[^.\n]{0,60}\b(?:in|into|as)\b[^.\n]{0,20}\b(?:url|link|image|query string)\b/i,
    score: 0.5,
    reason: "asks to place data inside a URL or image",
  },
];

export const markdownExfil: Detector = (text) => applyRules(text, RULES);
