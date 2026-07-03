# Side-by-Side Media Sync Player｜雙媒體同步播放器

A frame-accurate, side-by-side video/image comparison player that runs entirely in the browser — no server, no upload, no dependencies. Files never leave your machine.

純前端、零依賴的雙媒體同步比對播放器。檔案只在瀏覽器本機處理，不會上傳。

## ✨ Features / 功能

- **Frame-perfect sync / 影格級同步**：frame-index master clock 引擎——播放、暫停、逐格、拖動時間軸時，兩支影片永遠定位在同一個 master 時間（右側可加毫秒級偏移），暫停必定停在同一格，無漂移。
- **Videos & images / 影片與圖片**：MP4, MOV, AVI, MKV, WebM / JPG, PNG, GIF, WebP, BMP。
- **4 view modes / 四種檢視**：雙視圖、只看左、只看右、重疊比較（可拖動的中央分隔線，Shift+click 瞬移）。
- **Frame stepping / 逐格比對**：自動從 MP4/MOV 容器（mdhd/stts）解析精確 FPS（含 29.97/23.976），支援手動覆寫。
- **A-B loop / A-B 循環**、**倍速 0.25×–2×**、**同步偏移微調 (ms)**。
- **Zoom & pan / 縮放拖移**：滾輪以游標為中心縮放，放大後可拖移，左右完全同步。
- **Snapshot / 截圖**：一鍵輸出三張 PNG（左右比較圖、左圖、右圖），含檔名標籤與時間戳。
- **Color correction / 色彩校正**：自動偵測全範圍 (full-range) 與 BT.709 gamma shift 色偏並校正（macOS/QuickTime 淡化問題），截圖逐像素精確處理。
- **中／English UI**：右上角 🌐 按鈕即時切換，設定自動記憶。
- **Settings persistence / 設定記憶**：倍速、音量、偏移、檢視模式、色彩模式、語言等存於 localStorage。

## ⌨️ Keyboard shortcuts / 快捷鍵

| Key | Action / 功能 |
|-----|---------------|
| `Space` | Play / Pause 播放／暫停 |
| `←` / `→` | Step -1 / +1 frame 逐格 |
| `1` `2` `3` `4` | Speed 0.5× / 1× / 1.5× / 2× 倍速 |
| `+` / `-` / `0` | Zoom in / out / reset 縮放 |
| `R` | Reset position 重置位置 |
| `V` | Cycle view mode 切換檢視（含比較） |
| `M` | Mute 靜音 |
| `F` | Fullscreen 全螢幕 |
| `S` | Snapshot 截圖 |
| `X` | Swap sides 左右對調 |
| `C` | Color correction 色彩校正 |
| `A` / `B` / `L` | Set A / Set B / Loop A-B 循環片段 |

## 🚀 Run locally / 本機執行

Just open `index.html` in a browser — no build step needed. 直接用瀏覽器開啟 `index.html` 即可。

Or serve it / 或起本機伺服器：

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## 🌐 Deploy to GitHub Pages / 發佈到 GitHub Pages

1. Push this folder to a GitHub repository (as the repo root). 把此資料夾內容推到 GitHub repo 根目錄。
2. Repo → **Settings → Pages** → Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)` → Save。
3. Visit / 開啟 `https://<username>.github.io/<repo>/`。

## 📁 Structure / 專案結構

```
├── index.html      # 版面（UI 結構）
├── css/style.css   # 樣式
└── js/
    ├── dom.js      # DOM 元素引用
    ├── state.js    # 共享狀態與常數
    ├── i18n.js     # 中/英字典與語言切換
    ├── utils.js    # 時間格式、通知等工具
    ├── probe.js    # MP4 容器解析（FPS / full-range / colr atom）
    ├── color.js    # 色彩校正（仿射 / BT.709 gamma LUT）
    ├── engine.js   # 影格索引主時鐘同步引擎
    ├── media.js    # 檔案載入、清除、左右對調
    ├── view.js     # 檢視模式、比較滑桿、縮放拖移
    ├── snapshot.js # 截圖輸出
    ├── settings.js # localStorage 設定
    └── main.js     # 事件掛載與初始化
```

## 📝 Notes / 備註

- Playback is seek-driven and therefore silent by design (the master clock seeks both videos frame by frame); the tool is built for frame-accurate visual comparison. 播放為 seek 驅動（無音訊），本工具以逐格畫面比對為目的。
- Color-correction coefficients were measured on macOS/Safari; see comments in `js/color.js`. 色彩校正係數以 macOS/Safari 實測擬合，詳見 `js/color.js` 註解。
