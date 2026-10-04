/**
 * Runs the pb.chain Angular 13 app (apps/pb.chain/angular) on http://localhost:4400, talking to the
 * backend from dev-pb-chain-api.mts. Also used by .claude/launch.json.
 *
 * Angular 13's webpack predates OpenSSL 3, so on current Node it needs the legacy OpenSSL provider.
 * Its packages come from `yarn install` in apps/pb.chain/angular (yarn 1, see its yarn.lock).
 */

import { spawn } from "node:child_process";
import path from "node:path";

const app = path.resolve("apps/pb.chain/angular");
const ng = path.join(app, "node_modules/@angular/cli/bin/ng");

const child = spawn(process.execPath, [ng, "serve", "--port", "4400"], {
  cwd: app,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--openssl-legacy-provider"].filter(Boolean).join(" "),
    NG_CLI_ANALYTICS: "false",
  },
});
child.on("exit", (code) => process.exit(code ?? 1));
