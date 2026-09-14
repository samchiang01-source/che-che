/* 檢查 CSS class 有沒有撞名。
 *
 *   node tools/check-classes.mjs
 *
 * 為什麼需要這支：垃圾袋原本是 `bag b1`、`bag b2`，後來水泥車工地的
 * 地基和牆也叫 `build b1`、`build b2`。CSS 裡工地的 `.b1{...}` 排在後面，
 * 就把垃圾袋的動畫整個蓋掉——袋子站在原地不動，工人對著空氣甩手。
 * 這種錯在畫面上很難一眼看出來，但用程式檢查很容易。
 *
 * 判斷方式：每個元素的第一個 class 當作它的「種類」（bag、build、spray…）。
 * 如果某個修飾用的 class 同時出現在兩種不同的種類上，而 CSS 又有不帶限定的
 * 裸選擇器（`.b1{...}` 而不是 `.bag.b1{...}`），那兩邊就會互相蓋掉。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");

const js = fs.readFileSync(path.join(ROOT, "assets", "play.js"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "assets", "play.css"), "utf8");

// 每個 class → 它出現過的「種類」（也就是同一個元素上的第一個 class）
const kinds = new Map();
function record(classAttr) {
  const parts = classAttr.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return;
  const kind = parts[0];
  for (const c of parts) {
    if (!kinds.has(c)) kinds.set(c, new Set());
    kinds.get(c).add(kind);
  }
}
for (const m of js.matchAll(/class=["']([^"']+)["']/g)) record(m[1]);
for (const m of js.matchAll(/\bprop\(\s*["']([^"']+)["']/g)) record(m[1]);

// CSS 裡有沒有「只靠這個 class 就生效」的裸規則？`.bag.b1` 這種有限定的不算。
function hasBareRule(cls) {
  const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s,>+~])\\.${escaped}(?=[\\s,{:])`, "m").test(css);
}

const problems = [];
for (const [cls, kindSet] of kinds) {
  // 種類本身（例如 .bag 用在 bag 上）不算問題
  if (kindSet.size > 1 && !kindSet.has(cls) && hasBareRule(cls)) {
    problems.push({ cls, kinds: [...kindSet] });
  }
}

if (problems.length) {
  console.error("撞名的 class —— CSS 規則會互相蓋掉：\n");
  for (const p of problems) {
    console.error(`  .${p.cls}  同時用在: ${p.kinds.join("、")}`);
  }
  console.error("\n請把其中一組改名，或把 CSS 選擇器加上限定（例如 .bag.b1）。");
  process.exit(1);
}

console.log(`檢查 ${kinds.size} 個 class，沒有撞名。`);
