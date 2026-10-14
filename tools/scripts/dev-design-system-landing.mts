/**
 * Dev server and build for the design-system landing page (apps/design-system-landing; also used by
 * .claude/launch.json and `npx nx run design-system-landing:serve`).
 *
 *   node tools/scripts/dev-design-system-landing.mts           -> build the tokens, serve on PORT (default 4300)
 *   node tools/scripts/dev-design-system-landing.mts --build   -> build the tokens, write a static site to dist/apps/design-system-landing
 *
 * The page is plain HTML/CSS/JS with no bundler. It links the design tokens package as /tokens/*
 * (tokens.css, yekan-bakh.css, icons.css and their fonts), served straight from
 * libs/material-design-system/tokens/dist, so token edits show up on the next refresh after a
 * token rebuild.
 *
 * Each framework card opens that framework's docs site. The addresses come from
 * apps/design-system-landing/src/docs-links.json; an environment variable overrides each one:
 *   LANDING_ANGULAR_DOCS_URL, LANDING_BLAZOR_DOCS_URL, LANDING_REACT_DOCS_URL, LANDING_SVELTE_DOCS_URL
 * A framework with no address shows as "coming soon".
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appRoot = path.join(repoRoot, "apps/design-system-landing/src");
const tokensRoot = path.join(repoRoot, "libs/material-design-system/tokens/dist");
const outRoot = path.join(repoRoot, "dist/apps/design-system-landing");
const FRAMEWORKS = ["angular", "blazor", "react", "svelte"];

// `npm start` (tools/scripts/serve-all.mts) builds the tokens once and sets DESIGN_TOKENS_PREBUILT, so
// this server does not wipe tokens/dist while the other apps are compiling against it.
if (!process.env.DESIGN_TOKENS_PREBUILT) {
  const tokens = spawnSync("node", ["libs/material-design-system/tokens/scripts/build-tokens.mts"], { cwd: repoRoot, stdio: "inherit" });
  if (tokens.status !== 0) {
    process.exit(tokens.status ?? 1);
  }
}

/** docs-links.json with the LANDING_<FRAMEWORK>_DOCS_URL overrides applied. */
function docsLinks(): string {
  const links = JSON.parse(fs.readFileSync(path.join(appRoot, "docs-links.json"), "utf8"));
  for (const key of FRAMEWORKS) {
    const value = process.env[`LANDING_${key.toUpperCase()}_DOCS_URL`];
    if (value !== undefined) {
      links[key] = value === "" ? null : value;
    }
  }
  return JSON.stringify(links, null, 2);
}

if (process.argv.includes("--build")) {
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.cpSync(appRoot, outRoot, { recursive: true });
  fs.cpSync(tokensRoot, path.join(outRoot, "tokens"), { recursive: true });
  fs.writeFileSync(path.join(outRoot, "docs-links.json"), docsLinks());
  console.log(`Landing page written to ${path.relative(repoRoot, outRoot)}`);
  process.exit(0);
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

/** Maps a URL path to a file under the app or the tokens package; null if it escapes both. */
function resolveFile(urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath);
  const [root, rest] = decoded.startsWith("/tokens/") ? [tokensRoot, decoded.slice("/tokens/".length)] : [appRoot, decoded.slice(1)];
  const file = path.resolve(root, rest === "" ? "index.html" : rest);
  return file.startsWith(root + path.sep) || file === root ? file : null;
}

const port = Number(process.env.PORT ?? 4300);

http
  .createServer((request, response) => {
    const urlPath = new URL(request.url ?? "/", "http://localhost").pathname;
    if (urlPath === "/docs-links.json") {
      response.writeHead(200, { "Content-Type": TYPES[".json"], "Cache-Control": "no-cache" });
      response.end(docsLinks());
      return;
    }
    const file = resolveFile(urlPath);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404, { "Content-Type": TYPES[".txt"] });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Design system landing page: http://127.0.0.1:${port}`);
  });
