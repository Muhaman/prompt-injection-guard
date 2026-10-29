import { readFileSync } from "node:fs";
import { z } from "zod";
import { createGuard } from "../src/guard.js";

const RowSchema = z.object({ text: z.string(), label: z.enum(["benign", "injection"]) });

const rows = readFileSync(new URL("./dataset.jsonl", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => RowSchema.parse(JSON.parse(line)));

// Heuristics + PII only: no classifier, so the bench needs no API key.
const guard = createGuard();
let tp = 0;
let fp = 0;
let fn = 0;
let tn = 0;
const misses: string[] = [];

for (const row of rows) {
  const blocked = !(await guard.check(row.text)).allowed;
  const injection = row.label === "injection";
  if (blocked && injection) tp++;
  else if (blocked) {
    fp++;
    misses.push(`false positive: ${row.text}`);
  } else if (injection) {
    fn++;
    misses.push(`false negative: ${row.text}`);
  } else tn++;
}

const ratio = (num: number, den: number) => (den === 0 ? 0 : num / den);
const precision = ratio(tp, tp + fp);
const recall = ratio(tp, tp + fn);
const f1 = ratio(2 * precision * recall, precision + recall);
const show = (value: number) => value.toFixed(3);
const preview = (text: string) => JSON.stringify(text.length > 90 ? `${text.slice(0, 87)}...` : text);

const lines = [
  "### prompt-injection-guard bench (heuristics + PII, no classifier)",
  "",
  `Dataset: ${rows.length} hand-written lines (${tp + fn} injection, ${tn + fp} benign), author-written and synthetic.`,
  "",
  "| Metric | Value |",
  "| --- | --- |",
  `| Precision | ${show(precision)} |`,
  `| Recall | ${show(recall)} |`,
  `| F1 | ${show(f1)} |`,
  `| TP / FP / FN / TN | ${tp} / ${fp} / ${fn} / ${tn} |`,
  "",
  "<details><summary>Misclassified lines</summary>",
  "",
  ...misses.map((m) => `- ${m.startsWith("false positive") ? "false positive" : "false negative"}: ${preview(m.slice(m.indexOf(": ") + 2))}`),
  "",
  "</details>",
];
console.log(lines.join("\n"));
