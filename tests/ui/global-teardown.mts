/**
 * In an update run (A11Y_UPDATE=1), merges the findings each a11y test wrote into
 * a11y-baseline/<site>.json. Pages that were not run keep their recorded entries.
 */

import fs from "node:fs";
import path from "node:path";
import { A11Y_BASELINE_DIR, A11Y_FINDINGS_DIR, type A11yCounts } from "./targets.mts";

export default function globalTeardown() {
  if (!process.env.A11Y_UPDATE || !fs.existsSync(A11Y_FINDINGS_DIR)) return;
  for (const site of fs.readdirSync(A11Y_FINDINGS_DIR)) {
    const file = path.join(A11Y_BASELINE_DIR, `${site}.json`);
    const merged: Record<string, A11yCounts> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    for (const finding of fs.readdirSync(path.join(A11Y_FINDINGS_DIR, site))) {
      const { key, counts } = JSON.parse(fs.readFileSync(path.join(A11Y_FINDINGS_DIR, site, finding), "utf8"));
      if (Object.keys(counts).length) merged[key] = counts;
      else delete merged[key];
    }
    const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
    fs.mkdirSync(A11Y_BASELINE_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
    console.log(`a11y baseline: ${path.relative(process.cwd(), file)} (${Object.keys(sorted).length} pages with known issues)`);
  }
  fs.rmSync(A11Y_FINDINGS_DIR, { recursive: true, force: true });
}
