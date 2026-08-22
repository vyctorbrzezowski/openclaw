// Dedicated Vite config for the standalone composer bench bundle.
// Loaded through the Vite CLI (not tsx) so the CJS deps of ./vite.config.ts
// keep their bundler-side interop; see scripts/control-ui-bench-build.ts.
// Output ships ONLY the bench page: no app index, no sidebar/topbar surface,
// no service worker, no public assets.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { composerBenchHtml } from "../scripts/lib/control-ui-composer-bench-html.ts";
import { controlUiHoverGuardPlugin } from "./config/control-ui-hover-guard.ts";
import { controlUiLocaleModulesPlugin } from "./config/control-ui-locales.ts";
import {
  controlUiBrowserOnlySharedModuleAliases,
  resolveControlUiBuildInfo,
  resolveExternalPackageAliasesForVite,
  resolveSourcePackageAliasesForVite,
  resolveTsconfigPathAliasesForVite,
} from "./vite.config.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../.artifacts/control-ui-bench");
const benchRoot = path.join(here, "node_modules", ".cache", "control-ui-bench");

// The generated page IS the Vite root so the emitted index.html stays flat;
// the markup's "/src/..." references are rewritten to relative paths up to
// ui/src and resolved against this file's location.
function writeBenchEntryHtml(): string {
  fs.mkdirSync(benchRoot, { recursive: true });
  const inputHtml = path.join(benchRoot, "index.html");
  fs.writeFileSync(inputHtml, composerBenchHtml.replaceAll('"/src/', '"../../../src/'));
  return inputHtml;
}

export default defineConfig({
  base: "./",
  root: benchRoot,
  publicDir: false,
  cacheDir: path.resolve(here, "../.artifacts/control-ui-bench-vite"),
  define: {
    "globalThis.OPENCLAW_CONTROL_UI_BUILD_INFO": JSON.stringify(resolveControlUiBuildInfo()),
  },
  css: {
    postcss: {
      plugins: [controlUiHoverGuardPlugin()],
    },
  },
  plugins: [controlUiLocaleModulesPlugin(), controlUiBrowserOnlySharedModuleAliases()],
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: true,
    rolldownOptions: {
      input: { index: writeBenchEntryHtml() },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
