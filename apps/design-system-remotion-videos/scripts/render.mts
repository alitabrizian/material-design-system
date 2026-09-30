/**
 * Renders one MP4 per composition (every component, plus design-tokens and
 * showreel) into out/<id>.mp4. Bundles the Remotion project once and reuses
 * it for every composition, instead of paying the bundle cost per video as
 * separate `remotion render` calls would.
 *
 * Component scenes without a recording are skipped with a warning -- run
 * scripts/record.mts first (npx nx run design-system-remotion-videos:record).
 *
 * Usage:  node scripts/render.mts [composition-id ...]   (no ids = all)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv.slice(2);

console.log("Bundling...");
const serveUrl = await bundle({
  entryPoint: path.join(appRoot, "src/index.ts"),
  rootDir: appRoot,
  publicDir: path.join(appRoot, "public"),
});

const compositions = await getCompositions(serveUrl);
const unknown = requested.filter((id) => !compositions.some((c) => c.id === id));
if (unknown.length) {
  console.error(`Unknown scene id(s): ${unknown.join(", ")}`);
  process.exit(1);
}

const selected = requested.length ? compositions.filter((c) => requested.includes(c.id)) : compositions;
const skipped: string[] = [];

for (const composition of selected) {
  if ("recording" in composition.props && !composition.props.recording) {
    skipped.push(composition.id);
    continue;
  }
  const outputLocation = path.join(appRoot, "out", `${composition.id}.mp4`);
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation });
  console.log(`rendered  out/${composition.id}.mp4`);
}

if (skipped.length) {
  console.warn(`\nSkipped (no recording yet): ${skipped.join(", ")}\nRun: npx nx run design-system-remotion-videos:record -- ${skipped.join(" ")}`);
}
