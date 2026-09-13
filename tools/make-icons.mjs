/* 產生 App 圖示 PNG（加到主畫面時會用到）。
 *
 * 刻意不依賴任何套件：用 Node 內建的 zlib 直接寫出 PNG，
 * 這樣 repo 不需要 node_modules，CI 也不用安裝東西。
 *
 *   node tools/make-icons.mjs
 */

import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "icons");
const SIZES = [512, 192, 180];

/* ---------------- PNG 編碼 ---------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // 每條掃描線前面要加一個 filter byte，這裡一律用 0（None）
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy
      ? rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4)
      : Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------- 畫圖 ---------------- */

function hex(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function canvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}

// source-over，coverage 當作 alpha，邊緣就有抗鋸齒
function blend(c, x, y, [r, g, b], coverage) {
  if (coverage <= 0) return;
  const a = Math.min(1, coverage);
  const i = (y * c.size + x) * 4;
  const da = c.data[i + 3] / 255;
  const outA = a + da * (1 - a);
  if (outA <= 0) return;
  c.data[i]     = Math.round((r * a + c.data[i]     * da * (1 - a)) / outA);
  c.data[i + 1] = Math.round((g * a + c.data[i + 1] * da * (1 - a)) / outA);
  c.data[i + 2] = Math.round((b * a + c.data[i + 2] * da * (1 - a)) / outA);
  c.data[i + 3] = Math.round(outA * 255);
}

// 用 signed distance field 畫，邊緣自然帶抗鋸齒
function fillSDF(c, x0, y0, x1, y1, sdf, color) {
  const lo = (v) => Math.max(0, Math.floor(v) - 2);
  const hi = (v) => Math.min(c.size - 1, Math.ceil(v) + 2);
  for (let y = lo(y0); y <= hi(y1); y++) {
    for (let x = lo(x0); x <= hi(x1); x++) {
      const d = sdf(x + 0.5, y + 0.5);
      blend(c, x, y, color, 0.5 - d);
    }
  }
}

function rect(c, x, y, w, h, color, radius = 0) {
  const cx = x + w / 2, cy = y + h / 2;
  const hw = w / 2, hh = h / 2;
  const r = Math.min(radius, hw, hh);
  fillSDF(c, x, y, x + w, y + h, (px, py) => {
    const qx = Math.abs(px - cx) - (hw - r);
    const qy = Math.abs(py - cy) - (hh - r);
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
  }, color);
}

function circle(c, cx, cy, r, color) {
  fillSDF(c, cx - r, cy - r, cx + r, cy + r, (px, py) => Math.hypot(px - cx, py - cy) - r, color);
}

/* ---------------- 圖示本身：垃圾車，因為它是他的最愛 ---------------- */

function drawIcon(size) {
  const c = canvas(size);
  const u = (v) => v * size; // 用 0~1 的相對座標描述，任何尺寸都對得上

  const SKY   = hex("#BFE3F2");
  const ROAD  = hex("#4C525C");
  const LINE  = hex("#F3D34A");
  const BODY  = hex("#EFC81C");
  const DARK  = hex("#D3AE10");
  const CAB   = hex("#F5D430");
  const GLASS = hex("#DCF0F8");
  const GREEN = hex("#3C8C3C");
  const TYRE  = hex("#2B3138");
  const HUB   = hex("#D6DEE4");

  rect(c, 0, 0, u(1), u(0.74), SKY);
  rect(c, 0, u(0.74), u(1), u(0.26), ROAD);
  for (let i = 0; i < 4; i++) {
    rect(c, u(0.06 + i * 0.26), u(0.885), u(0.14), u(0.022), LINE, u(0.011));
  }

  rect(c, u(0.28), u(0.36), u(0.46), u(0.30), BODY, u(0.02));
  rect(c, u(0.72), u(0.30), u(0.18), u(0.36), DARK, u(0.02));
  rect(c, u(0.10), u(0.40), u(0.20), u(0.26), CAB,  u(0.025));
  rect(c, u(0.135), u(0.435), u(0.13), u(0.11), GLASS, u(0.015));
  rect(c, u(0.34), u(0.555), u(0.30), u(0.065), GREEN, u(0.012));

  for (const cx of [0.30, 0.62, 0.80]) {
    circle(c, u(cx), u(0.705), u(0.085), TYRE);
    circle(c, u(cx), u(0.705), u(0.036), HUB);
  }

  return encodePNG(size, c.data);
}

/* ---------------- 輸出 ---------------- */

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, drawIcon(size));
  console.log(`wrote ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
}
