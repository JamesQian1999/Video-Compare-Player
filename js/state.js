// ===== 共享狀態與常數 =====
let baseDuration = 0; // 用較短的一支，避免超出
let seekDragging = false;
let syncOffset = 0; // 秒（由毫秒輸入換算）
let isResizing = false;
let viewMode = 'dual'; // 'dual', 'left', 'right'
let videoScale = 1; // 影片縮放比例
const minScale = 0.2; // 最小縮放比例
const maxScale = 10; // 最大縮放比例

// A-B 循環
let aPoint = null;
let bPoint = null;
let loopEnabled = false;

// 儲存使用者透過 resizer 自訂的欄寬，於進出比較模式時保留
let savedGridColumns = null;

// 靜音狀態
let isMuted = false;
let lastVolume = 1;

const SETTINGS_KEY = 'sbsPlayerSettings_v1';

// FPS 檢測變數
let detectedFPS = 30; // 預設FPS（兩支取較小者）
let leftFps = null;
let rightFps = null;
let fpsDetectionAttempts = 0;

// 每側媒體詳細資訊（除錯面板用）：{ name, sizeMB, mime, container, kind, mp4 }
let leftMediaInfo = null;
let rightMediaInfo = null;

// 拖移相關變量
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let translateX = 0;
let translateY = 0;
let dragMoved = false; // 此次拖動是否有實際移動
let suppressNextClick = false; // 拖動結束後抑制 click，避免誤觸播放/暫停

// ===== 影格索引主時鐘引擎 (frame-index master clock) 狀態 =====
// 唯一真相為 masterTime（master／左 時間軸上的秒數）。任何時刻（播放/暫停/逐格/seek）
// 兩支影片都被定位到「同一 master 時間」(右邊再加 syncOffset)。同源同 fps ⇒ 同一時間戳＝同一影格，
// 因此暫停必定停在同一 frame，不需要任何事後對齊。
let masterTime = 0;      // 連續播放頭（秒）
let isPlaying = false;   // 是否正在（由主時鐘驅動）播放
let playAnchorWall = 0;  // 起播當下的 performance.now()
let playAnchorTime = 0;  // 起播當下的 masterTime
let displayedFrame = -1; // 目前已 seek 定位的整數影格（播放時節流用）

// ===== 色彩校正（兩種色偏、兩種校正）=====
// (1) 'fullrange'：全範圍(yuvj420p/pc)影片，瀏覽器解碼與 ffmpeg 有線性色偏（實測 R²=0.999）。
//     校正係「瀏覽器像素 → ffmpeg 參考」的每通道仿射 out = in*CC_A + CC_B，
//     係數由 color_diag.html 對 Safari 實測擬合而得（把平均差 4.15→1.70 /255）。
// (2) 'bt709'：限制範圍(tv) + colr trc=1(BT.709 transfer) 影片，macOS 以 gamma≈1.961
//     解碼再轉顯示器（QuickTime gamma shift）→ 比 ffmpeg 淡。gamma 型色偏，仿射修不準，
//     校正＝out = 255*sRGB_EOTF(in/255)^(1/BT709_GAMMA)（256 階 LUT）。
// 顯示用 CSS/SVG filter；截圖用逐像素（精確、不依賴 ctx.filter 支援）。
const CC_A = 0.9274, CC_B = 13.03;                    // fullrange: out = in*CC_A + CC_B
const FULL_RANGE_CSS = 'contrast(0.9007) brightness(1.0296)'; // ≡ 上式（CSS 等效）
const BT709_GAMMA = 1.961;                            // bt709: macOS 對 trc=1 的解碼 gamma，可用 color_diag.html 實測微調
let leftColorKind = null, rightColorKind = null; // 每側偵測到的色偏種類：null | 'fullrange' | 'bt709'
let colorCorrectMode = 'auto'; // 'auto'（偵測到才校正）| 'fullrange'（強制仿射）| 'bt709'（強制gamma）| 'off'
