# 車車出動

給 3 歲小孩的車車互動網頁。垃圾車、水泥車、消防車、卡車、高鐵、輕軌，點一下就出動，而且會開到現場做自己的工作。

- **玩的頁面** — `docs/index.html`
- **給家長的內容建議** — `docs/guide.html`

## 設計前提

3 歲的限制決定了全部的設計：**不識字、手指不精準、注意力 1~3 分鐘、愛重複**。所以：

| 項目 | 做法 |
|---|---|
| 文字 | 幾乎不出現，用圖示加語音 |
| 按鈕 | 至少 80×80px，間距要大 |
| 操作 | 只有「點一下」，沒有拖曳、雙擊、長按 |
| 失敗 | 沒有錯誤狀態，選錯就再試 |
| 音效 | 一定要有，但留靜音鍵給家長 |
| 關卡 | 不計時、不計分、沒有排行榜 |

## 互動只有兩層

1. **點下面的按鈕** → 那台車開出來，語音念出車名。
2. **點畫面上的車** → 它開到工作現場、停下來、把工作做完，語音講出它在做什麼，然後繼續開。

每台車都有自己的工作，這樣小孩認的就不只是外型，而是「這台車是做什麼的」：

| 車 | 現場 | 做的事 | 聲音 |
|---|---|---|---|
| 垃圾車 | 路邊三袋垃圾 | 收走垃圾，馬路變乾淨 | 《給愛麗絲》 |
| 水泥車 | 一塊坑坑巴巴的地 | 鋪成平整的水泥地 | 引擎低鳴 + 傾倒聲 |
| 消防車 | 失火的房子 | 噴水滅火，冒出白煙 | 警笛 + 水柱 |
| 卡車 | 商店與貨物 | 把貨送進店裡 | 大喇叭 |
| 高鐵 | 月台與乘客 | 載大家去很遠的地方 | 風切聲 |
| 輕軌 | 車站與乘客 | 到站開門讓大家上車 | 叮叮 |

工作做完後現場會復原，所以可以一直重複玩 —— 這正是 3 歲最吃的那一味。

## 技術上值得知道的幾件事

- **沒有任何相依套件**，也沒有建置步驟。`docs/` 就是最終送出去的內容。
- **聲音全部即時合成**（Web Audio API），repo 裡沒有任何音檔。垃圾車放的是《給愛麗絲》，因為台灣的垃圾車就是這樣。
- **旁白用 `speechSynthesis` 念出來**（`zh-TW`），沒有中文語音的裝置會靜靜跳過。畫面上同步顯示同一句字幕，方便家長跟著念。
- **車子是手寫 SVG**，不是圖片，所以任何解析度都清楚。車體一律畫成朝左再用 `scaleX(-1)` 翻面，車頭才會朝向前進方向。
- 開車動畫用 `left` 的 keyframes 跑；要停下來工作時改成 `transition`，工作完再用**負的 `animation-delay`** 把動畫捲回停車的位置接著跑，位置才不會跳。
- 台灣細節：高鐵跑高架橋、輕軌跑草坪軌道、高鐵是 700T 的白底橘線。

## 本機預覽

```bash
node tools/serve.mjs
```

開 <http://localhost:4173/>。這個伺服器只服務 `docs/`，跟線上送出去的內容一致。

## 重新產生 App 圖示

`docs/icons/*.png` 是程式畫出來的，不是設計稿：

```bash
node tools/make-icons.mjs
```

`tools/make-icons.mjs` 用 Node 內建的 zlib 直接寫 PNG，所以不需要 `node_modules`。改圖示請改那支程式，不要直接改 PNG。

## 部署

同一份 `docs/` 同時發到兩個地方，內容一樣，兩個網址都能用。

| 平台 | 網址 | 怎麼觸發 |
|---|---|---|
| GitHub Pages | <https://samchiang01-source.github.io/che-che/> | GitHub 內建，推 `main` 就重建 |
| Cloudflare | <https://che-che.samchiang01.workers.dev/> | GitHub Actions 呼叫 wrangler |

GitHub Pages 的來源設在 repo Settings → Pages，指向 `main` 分支的 `/docs`，不需要 workflow。

### Cloudflare

Cloudflare 已經把 Pages 併進 Workers，所以這個專案是 Workers 型態的靜態站：設定在 `wrangler.jsonc`，部署指令是 `wrangler deploy`（不是舊的 `wrangler pages deploy`）。

手動部署一次：

```bash
npx wrangler deploy
```

自動部署由 `.github/workflows/cloudflare.yml` 負責，需要 repo 的兩個 Actions secret：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` — 在 Cloudflare 建 API token，權限要包含 **Workers Scripts: Edit**

兩個都設好之後，每次推 `main` 就會自動部署，也可以在 Actions 分頁手動觸發。
