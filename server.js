import http from "node:http";
import { readFile } from "node:fs/promises";
const root = new URL("./", import.meta.url);
const files = {
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/styles.css": ["styles.css", "text/css"],
  "/script.js": ["script.js", "text/javascript"],
  "/weather.js": ["weather.js", "text/javascript"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"],
};
http
  .createServer(async (req, res) => {
    const file = files[new URL(req.url, "http://localhost").pathname];
    if (!file) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    try {
      const data = await readFile(new URL(file[0], root));
      res.writeHead(200, {
        "Content-Type": `${file[1]}; charset=utf-8`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(500);
      res.end("Unable to read file");
    }
  })
  .listen(8001, "127.0.0.1", () => console.log("Atmos: http://127.0.0.1:8001"));
