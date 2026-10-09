// Serves an `expo export -p web` output dir for `PARITY_TARGET=expo`, with an SPA fallback
// to index.html (as the planned vercel.json rewrite does).
//
// Usage: node static-server.mjs <dir>  (env PARITY_PORT)

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? process.env.PARITY_EXPO_DIR ?? "");
const port = Number(process.env.PARITY_PORT ?? 3210);
if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`static-server: ${root}/index.html not found (set PARITY_EXPO_DIR to an expo export -p web output)`);
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    let file = path.join(root, pathname);
    const rel = path.relative(root, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) file = path.join(root, "index.html");
    // Expo Router exports `/insights` as `insights.html`.
    const candidates = [file, `${file}.html`, path.join(file, "index.html"), path.join(root, "index.html")];
    const found = candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
    if (!found) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(found)] ?? "application/octet-stream" });
    fs.createReadStream(found).pipe(res);
  })
  .listen(port, "127.0.0.1", () => console.log(`[parity static] ${root} on 127.0.0.1:${port}`));
