/* 幫 docs/ 裡的 HTML 蓋上資源版本號。
 *
 *   node tools/stamp.mjs
 *
 * 網址長這樣：assets/play.js?v=8f3a1c2d
 * v 是那個檔案內容的雜湊，所以只要檔案改了網址就會變，
 * 瀏覽器和 CDN 一定會重新抓 —— 不會出現「改了卻沒變」的情況。
 * 沒改的檔案雜湊不變，快取照樣有效。
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");

function hash(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
}

const hashes = new Map();
function versionOf(rel) {
  if (!hashes.has(rel)) {
    const file = path.join(DOCS, rel);
    hashes.set(rel, fs.existsSync(file) ? hash(file) : null);
  }
  return hashes.get(rel);
}

// href="assets/play.css" 或 src="assets/play.js"，可能已經帶著舊的 ?v=
const REF = /(href|src)="(assets\/[^"?]+\.(?:css|js))(\?v=[0-9a-f]+)?"/g;

let touched = 0;
for (const name of fs.readdirSync(DOCS).filter((f) => f.endsWith(".html"))) {
  const file = path.join(DOCS, name);
  const before = fs.readFileSync(file, "utf8");

  const after = before.replace(REF, (whole, attr, rel) => {
    const v = versionOf(rel);
    return v ? `${attr}="${rel}?v=${v}"` : whole;
  });

  if (after !== before) {
    fs.writeFileSync(file, after);
    touched++;
    console.log(`stamped ${name}`);
  }
}

for (const [rel, v] of hashes) console.log(`  ${rel} → ${v ?? "(missing)"}`);
console.log(touched ? `${touched} file(s) updated` : "already up to date");
