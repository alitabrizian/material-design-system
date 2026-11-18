import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { auditRoots } from "./audit-colors.mts";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "audit-colors.mts");

/** Audits one fixture file (paths are relative to this directory). */
function auditFixture(name: string): string[] {
  return auditRoots([`fixtures/audit-colors/${name}`], { repoRoot: here });
}

/** Violations use the platform separator; tests read them with forward slashes. */
function normalize(violations: string[]): string[] {
  return violations.map((violation) => violation.replaceAll("\\", "/"));
}

test("a stylesheet that only uses tokens passes", () => {
  assert.deepEqual(auditFixture("clean.css"), []);
});

test("every literal color in a stylesheet is reported with its line", () => {
  const violations = normalize(auditFixture("dirty.css"));
  assert.equal(violations.length, 4, violations.join("\n"));
  for (const violation of violations) {
    assert.match(violation, /^fixtures\/audit-colors\/dirty\.css:\d+: /);
  }
  assert.match(violations[0], /:3: hex color/);      // #ff0000
  assert.match(violations[1], /:4: color function/); // rgba(0, 0, 0, 0.5)
  assert.match(violations[2], /:5: named color/);    // white
  assert.match(violations[3], /:6: hex color/);      // #000
});

test("real SVG paints are reported, a component color input is not", () => {
  const violations = normalize(auditFixture("dirty.html"));
  assert.equal(violations.length, 2, violations.join("\n"));
  assert.match(violations[0], /:3: hex color:.*fill="#ff0000"/);
  assert.match(violations[1], /:4: SVG color attribute:.*stroke="red"/);
  assert.ok(!violations.some((v) => v.includes("pb-icon")), "pb-icon color input is an input, not a paint");
  assert.ok(!violations.some((v) => v.includes("mat-icon")), "mat-icon color input is an input, not a paint");
});

test("colors in comments are ignored", () => {
  assert.deepEqual(auditFixture("comments.css"), []);
});

test("this repository is clean", () => {
  const violations = auditRoots();
  assert.deepEqual(violations, [], violations.join("\n"));
});

test("the CLI exits 0 on a clean repository", () => {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0 violations/);
});
