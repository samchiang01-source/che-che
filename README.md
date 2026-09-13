# 車車出動

給 3 歲小孩的車車互動網頁。垃圾車、水泥車、消防車、卡車、高鐵、輕軌，點一下就出動。

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

互動只有兩層：點下方按鈕叫車，點畫面上正在開的車觸發專屬動作。

## 技術上值得知道的幾件事

- **沒有任何相依套件**，也沒有建置步驟。`docs/` 就是最終送出去的內容。
- **聲音全部即時合成**（Web Audio API），repo 裡沒有任何音檔。垃圾車放的是《給愛麗絲》，因為台灣的垃圾車就是這樣。
- **車名用 `speechSynthesis` 念出來**（`zh-TW`），沒有中文語音的裝置會靜靜跳過。
- **車子是手寫 SVG**，不是圖片，所以任何解析度都清楚。
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

同一份 `docs/` 同時發到兩個地方，推上 `main` 就會自動更新。

| 平台 | 怎麼觸發 | 設定在哪 |
|---|---|---|
| GitHub Pages | GitHub 內建，推 `main` 就重建 | repo Settings → Pages（Source: `main` / `/docs`） |
| Cloudflare Pages | GitHub Actions 呼叫 wrangler | `.github/workflows/cloudflare-pages.yml` |

### Cloudflare Pages 需要的設定

1. Cloudflare 上要先有一個叫 `che-che` 的 Pages 專案（Direct Upload 類型）。
2. GitHub repo 的 Settings → Secrets and variables → Actions 要有兩個 secret：
   - `CLOUDFLARE_API_TOKEN` — 權限選 **Cloudflare Pages: Edit**
   - `CLOUDFLARE_ACCOUNT_ID`

兩個都設好之後，每次推 `main` 就會自動部署，也可以在 Actions 分頁手動觸發。
