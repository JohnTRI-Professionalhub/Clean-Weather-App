import http from "node:http";
import { readFile } from "node:fs/promises";
const root = new URL("../../", import.meta.url);
const routes = {
  "/": "index.html",
  "/script.js": "script.js",
  "/weather.js": "weather.js",
  "/styles.css": "styles.css",
  "/favicon.svg": "favicon.svg",
  "/tests": "tests/browser/runner.html",
  "/runner.js": "tests/browser/runner.js",
};
const fixture = await readFile(
  new URL("audits/bauxite-2026-11-11.json", root),
  "utf8",
);
const bootstrap = await readFile(
  new URL("tests/browser/fixtures.js", root),
  "utf8",
);
http
  .createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname,
      file = routes[path];
    if (!file) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    try {
      let content = await readFile(new URL(file, root), "utf8");
      if (path === "/")
        content = content.replace(
          '<script type="module" src="script.js"></script>',
          "<script>window.__fixtureData=" +
            fixture +
            ";\n" +
            bootstrap +
            '</script><script type="module" src="script.js"></script>',
        );
      const type = file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".svg")
            ? "image/svg+xml"
            : "text/html";
      res.writeHead(200, {
        "Content-Type": type + "; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end("Test asset unavailable");
    }
  })
  .listen(8002, "127.0.0.1", () =>
    console.log(
      "Browser tests: http://127.0.0.1:8002/tests (fixtures only; no live weather requests)",
    ),
  );
