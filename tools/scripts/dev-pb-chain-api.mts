/**
 * Runs the pb.chain backend (apps/pb.chain/aspnet-core/Src/PB.Chain.Web.Host) for local development
 * (also used by .claude/launch.json), on https://localhost:44306.
 *
 * pb.chain is a submodule with its own build conventions, so two things differ from a plain
 * `dotnet run`:
 *   - ImportDirectoryBuildProps=false: the workspace's Directory.Build.props (warnings as errors,
 *     implicit usings) must not leak into pb.chain's projects;
 *   - DOTNET_ROLL_FORWARD=Major: the projects target .NET 6, which is not installed; they run on the
 *     newest installed runtime instead.
 */

import { spawn } from "node:child_process";
import path from "node:path";

const project = path.resolve("apps/pb.chain/aspnet-core/Src/PB.Chain.Web.Host");

const child = spawn(
  "dotnet",
  ["run", "--launch-profile", "PB.Chain.Web.Host", "-p:ImportDirectoryBuildProps=false"],
  { cwd: project, stdio: "inherit", env: { ...process.env, DOTNET_ROLL_FORWARD: "Major" } },
);
child.on("exit", (code) => process.exit(code ?? 1));
