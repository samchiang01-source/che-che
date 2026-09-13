/* 本機預覽用的靜態伺服器（零依賴）。
 *
 *   node tools/serve.mjs [port]
 *
 * 只服務 docs/，跟 GitHub Pages / Cloudflare Pages 送出去的內容一致。
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");
const PORT = Number(process.argv[2] || 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = path.join(ROOT, url);
    if (url.endsWith("/")) file = path.join(file, "index.html");

    // 別讓 ../ 跳出 docs/
    if (!path.resolve(file).startsWith(path.resolve(ROOT))) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    fs.readFile(file, (err, buf) => {
      if (err) {
        fs.readFile(path.join(ROOT, "404.html"), (e2, notFound) => {
          res.writeHead(404, { "content-type": TYPES[".html"] });
          res.end(e2 ? "Not found" : notFound);
        });
        return;
      }
      res.writeHead(200, {
        "content-type": TYPES[path.extname(file)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(buf);
    });
  })
  .listen(PORT, () => console.log(`車車出動 → http://localhost:${PORT}/`));
