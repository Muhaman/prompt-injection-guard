import { applyRules, type Detector, type Rule } from "./rules.js";

const VERBS = "ignore|disregard|forget|override|bypass|discard|abandon";
const QUALIFIERS = "previous|prior|above|earlier|preceding|all|any|your|system|original|initial";
const NOUNS = "instructions?|prompts?|rules|guidelines|directions|directives|context|constraints|programming";
const PROMPT_WORDS = "system|hidden|initial|original|secret|developer";

const RULES: Rule[] = [
  {
    pattern: new RegExp(`\\b(?:${VERBS})\\b[^.\\n]{0,25}?\\b(?:${QUALIFIERS})\\b[^.\\n]{0,20}?\\b(?:${NOUNS})\\b`, "i"),
    score: 0.85,
    reason: "asks the model to ignore or override earlier instructions",
  },
  {
    pattern: new RegExp(
      `\\b(?:reveal|show|print|repeat|output|leak|display|disclose|expose|tell me)\\b[^.\\n]{0,40}?\\b(?:${PROMPT_WORDS})\\s{1,5}(?:prompt|instructions?|message)`,
      "i",
    ),
    score: 0.8,
    reason: "asks for the system prompt",
  },
  {
    pattern: new RegExp(`\\bwhat (?:is|are|were) your (?:${PROMPT_WORDS}) (?:prompt|instructions?)`, "i"),
    score: 0.7,
    reason: "asks what the system prompt says",
  },
  {
    pattern: /\brepeat\b[^.\n]{0,20}\b(?:everything|words|text)\b[^.\n]{0,20}\babove\b/i,
    score: 0.7,
    reason: "asks the model to repeat the text above",
  },
  {
    pattern: /\bnew\s+(?:instructions?|task|rules)\s*:/i,
    score: 0.6,
    reason: "announces replacement instructions",
  },
  {
    pattern: /<\|?(?:im_start|im_end|system|endoftext)\|?>|\[\/?INST\]|<<\/?SYS>>/i,
    score: 0.8,
    reason: "contains chat-template control tokens",
  },
  {
    pattern: /^[ \t]{0,20}(?:system|assistant)[ \t]{0,5}:/im,
    score: 0.6,
    reason: "spoofs a system or assistant turn",
  },
  {
    pattern: /\b(?:do not|don't|never)\s+(?:follow|obey|listen to|comply with)\b[^.\n]{0,30}\b(?:instructions?|rules|guidelines|system)/i,
    score: 0.75,
    reason: "tells the model not to follow its instructions",
  },
  {
    pattern: /\byou (?:must|should|will|shall) (?:now )?(?:only )?(?:obey|follow|comply with)\b[^.\n]{0,20}\b(?:me|my|these|this|the following)\b/i,
    score: 0.6,
    reason: "demands obedience to the user's text",
  },
  {
    pattern: /\b(?:sudo mode|admin(?:istrator)? override|override (?:mode|protocol|safety))\b/i,
    score: 0.6,
    reason: "claims elevated privileges",
  },
];

export const instructionOverride: Detector = (text) => applyRules(text, RULES);
