// Static build + local preview of the composer bench for static hosting
// (Vercel). Thin orchestrator around `vite -c ui/bench.vite.config.ts`: the
// config is loaded by the Vite CLI itself (its bundler handles the CJS deps of
// ui/vite.config.ts; a direct tsx import breaks on them).
//
//   node --import tsx scripts/control-ui-bench-build.ts            # build
//   node --import tsx scripts/control-ui-bench-build.ts --preview  # serve build
//
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const benchConfig = path.join(repoRoot, "ui", "bench.vite.config.ts");
const viteBin = path.join(repoRoot, "node_modules", ".bin", "vite");
const outDir = path.join(repoRoot, ".artifacts", "control-ui-bench");

function parseArgs(args: string[]): { port?: string; preview: boolean } {
  const options: { port?: string; preview: boolean } = { preview: false };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--preview") {
      options.preview = true;
    } else if (args[index] === "--port") {
      const parsed = Number(args[++index]);
      if (Number.isInteger(parsed) && parsed > 0 && parsed < 65_536) {
        options.port = String(parsed);
      }
    }
  }
  return options;
}

// Filesystem hits win over rewrites, so /assets/* still serve directly while
// the dev-server bench paths (/chat?bench=..., /bench) reach the single page.
function writeVercelConfig(): void {
  fs.writeFileSync(
    path.join(outDir, "vercel.json"),
    `${JSON.stringify(
      {
        rewrites: [
          { source: "/chat", destination: "/index.html" },
          { source: "/bench", destination: "/index.html" },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

// Composer model/runtime rows resolve provider marks through public assets at
// runtime (controlUiPublicAssetPath); ship the icon set beside the bundle.
function copyProviderIcons(): void {
  fs.cpSync(
    path.join(repoRoot, "ui", "public", "provider-icons"),
    path.join(outDir, "provider-icons"),
    { recursive: true },
  );
}

function runVite(args: string[]): number {
  const result = spawnSync(viteBin, ["-c", benchConfig, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

const { port, preview } = parseArgs(process.argv.slice(2));
const exitCode = preview
  ? runVite(["preview", ...(port ? ["--port", port] : [])])
  : (() => {
      const code = runVite(["build"]);
      if (code !== 0 || !fs.existsSync(path.join(outDir, "index.html"))) {
        return code === 0 ? 1 : code;
      }
      writeVercelConfig();
      copyProviderIcons();
      console.log(`[control-ui-bench] output: ${path.relative(repoRoot, outDir)}`);
      console.log(
        `[control-ui-bench] update: vercel deploy ${path.relative(repoRoot, outDir)} --prod --yes`,
      );
      console.log(
        `[control-ui-bench] local proof: node --import tsx scripts/control-ui-bench-build.ts --preview`,
      );
      return 0;
    })();
if (exitCode !== 0) {
  console.error(`[control-ui-bench] FAILED (exit ${exitCode})`);
}
process.exit(exitCode);
