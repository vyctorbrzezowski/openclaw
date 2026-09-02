import type { ServerResponse } from "node:http";
import type { Plugin } from "vite";

const ERROR_EMOJI_FIXTURE_PATH = "/__fixtures/error-emoji/";

const ERROR_EMOJI_FIXTURE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <title>Error emoji · OpenClaw Control UI mock</title>
    <script>
      const mediaQuery = matchMedia("(prefers-color-scheme: light)");
      const applyTheme = () => {
        const mode = mediaQuery.matches ? "light" : "dark";
        document.documentElement.dataset.theme = mode;
        document.documentElement.dataset.themeMode = mode;
        document.documentElement.classList.toggle("wa-light", mode === "light");
        document.documentElement.classList.toggle("wa-dark", mode === "dark");
        document.documentElement.style.colorScheme = mode;
      };
      applyTheme();
      mediaQuery.addEventListener?.("change", applyTheme);
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/test-helpers/error-emoji-fixture.ts"></script>
  </body>
</html>`;

export function createErrorEmojiFixturePlugin(): Plugin {
  return {
    name: "openclaw-control-ui-error-emoji-fixture",
    configureServer(server) {
      const serve = (res: ServerResponse, next: (error?: Error) => void) => {
        void server
          .transformIndexHtml(ERROR_EMOJI_FIXTURE_PATH, ERROR_EMOJI_FIXTURE_HTML)
          .then((html) => {
            res.statusCode = 200;
            res.setHeader("content-type", "text/html; charset=utf-8");
            res.end(html);
          })
          .catch((error: unknown) => next(error as Error));
      };
      server.middlewares.use(ERROR_EMOJI_FIXTURE_PATH, (_req, res, next) => {
        serve(res, next);
      });
      server.middlewares.use("/", (req, res, next) => {
        if (req.url !== "/" && req.url !== "/index.html") {
          next();
          return;
        }
        serve(res, next);
      });
    },
  };
}

export { ERROR_EMOJI_FIXTURE_PATH };
