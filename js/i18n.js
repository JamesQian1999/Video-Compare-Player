// ===== i18n：中/英介面文字字典與切換 =====
// 原則：所有介面文字集中於此，不寫死在 HTML/JS 邏輯裡。
// - 靜態文字：HTML 元素標 data-i18n（innerHTML）/ data-i18n-title（title 屬性），
//   由 applyStaticTexts() 套用。
// - 動態文字：程式以 t(key, params) 取字串（支援 {param} 插值）。
// - zh 內容與原版 side_by_side_video_new.html 逐字一致。

const I18N = {
  zh: {
    'app.docTitle': '雙媒體同步播放器｜Side‑by‑Side Media Sync Player',
    'app.title': '雙媒體同步播放器 <span class="muted">(支援影片和圖片、左右並排、播放與拖動同時同步)</span>',
    'app.tips': '快捷鍵：<span class="kbd">Space</span> 播放 · <span class="kbd">←/→</span> 逐格 · <span class="kbd">1-4</span> 倍速 · <span class="kbd">+/-/0</span> 縮放 · <span class="kbd">R</span> 重置位置 · <span class="kbd">V</span> 切換檢視 (含比較) · <span class="kbd">M</span> 靜音 · <span class="kbd">F</span> 全螢幕 · <span class="kbd">S</span> 截圖 · <span class="kbd">X</span> 對調 · <span class="kbd">C</span> 色彩校正 · <span class="kbd">A</span>/<span class="kbd">B</span>/<span class="kbd">L</span> 循環片段',
    'upload.dual': '📁 同時選擇兩個檔案',
    'chip.left': 'Left / 左',
    'chip.right': 'Right / 右',
    'upload.left': '選擇左檔案',
    'upload.right': '選擇右檔案',
    'btn.clear': '清除',
    'ph.left': '<div>拖曳影片或圖片到此，或點右上角「選擇左檔案」</div><div class="muted">支援影片：MP4, MOV, AVI, MKV, WebM<br/>支援圖片：JPG, PNG, GIF, WebP, BMP</div>',
    'ph.right': '<div>拖曳影片或圖片到此，或點右上角「選擇右檔案」</div><div class="muted">支援拖曳/點選上傳本機檔案<br/>影片和圖片均可同步比較</div>',
    'file.none': '尚未選擇檔案',
    'compare.divider.title': '拖動以比較',
    'compare.left': '左',
    'compare.right': '右',

    'help.shortcuts': '⌨️ 快捷鍵',
    'group.playback': '播放',
    'group.speed': '速度',
    'group.sound': '音量',
    'group.loop': 'A-B 循環',
    'group.view': '檢視',
    'group.zoom': '縮放',
    'group.tools': '工具',
    'group.sync': '同步偏移',

    'btn.play': '▶︎ 播放',
    'btn.pause': '⏸ 暫停',
    'btn.play.title': '播放/暫停 (Space)',
    'btn.stepBack': '◀ -1格',
    'btn.stepBack.title': '上一格 (←)',
    'btn.stepFwd': '+1格 ▶',
    'btn.stepFwd.title': '下一格 (→)',
    'btn.reset': '⏮ 回開頭',
    'btn.reset.title': '回到開頭',
    'btn.snapshot': '📸 截圖',
    'btn.snapshot.title': '截取目前畫面 (S)',
    'btn.swap': '⇄ 對調',
    'btn.swap.title': '對調左右 (X)',
    'btn.fullscreen': '⛶ 全螢幕',
    'btn.fullscreen.title': '全螢幕 (F)',
    'btn.colorFix.title': '色彩校正：自動偵測（全範圍仿射 / BT.709 gamma）→ 強制全範圍 → 強制709 → 關 (C)',
    'btn.resetSize': '⤢ 重置版面',
    'btn.resetSize.title': '重置左右欄寬與高度',
    'btn.viewDual': '◫ 雙視圖',
    'btn.viewDual.title': '左右並排 (V 循環切換)',
    'btn.viewLeft': '◀ 左側',
    'btn.viewLeft.title': '只看左側 (V 循環切換)',
    'btn.viewRight': '右側 ▶',
    'btn.viewRight.title': '只看右側 (V 循環切換)',
    'btn.viewCompare': '◧ 比較',
    'btn.viewCompare.title': '重疊比較 + 中央滑桿',
    'btn.viewHighlight': '◪ 差異',
    'btn.viewHighlight.title': '差異高亮：底圖轉灰階，紅=左比右亮、藍=左比右暗（V 循環切換）',
    'group.highlight': '差異門檻',
    'label.hlThr.title': '差異門檻：0–100 對應實際像素差 0–50，像素差 ≥ 門檻才標色',
    'btn.hlThrReset': '↺ 預設',
    'btn.hlThrReset.title': '重設為預設門檻',
    'highlight.empty': '載入媒體後顯示差異',
    'highlight.legend': '🔴 左 > 右 · 🔵 左 < 右',
    'btn.zoomOut.title': '縮小 (-)',
    'btn.zoomIn.title': '放大 (+)',
    'btn.resetZoom.title': '重置縮放 (0)',
    'btn.resetPosition': '⌖ 置中',
    'btn.resetPosition.title': '重置位置 (R)',
    'btn.mute.title': '靜音 (M)',
    'label.speed.title': '播放倍速 (1-4)',
    'label.fps': '逐格 FPS',
    'marker.a.title': 'A 點',
    'marker.b.title': 'B 點',
    'btn.setA.title': '設定 A 點 (A)',
    'btn.setB.title': '設定 B 點 (B)',
    'btn.loop': '🔁 循環',
    'btn.loop.title': '循環 A-B (L)',
    'btn.clearAB.title': '清除 A-B',
    'chip.syncTune': '同步微調（讓右邊提早/延後）',
    'label.offset': '偏移(ms)',
    'btn.applyOffset': '立即對齊',
    'hint.offset': '（正值＝右邊延後；負值＝右邊提早）',
    'info.title': '資訊',
    'btn.lang': '🌐 EN',
    'btn.theme.system': '🖥️ 系統',
    'btn.theme.light': '☀️ 淺色',
    'btn.theme.dark': '🌙 深色',
    'btn.theme.title': '切換主題：跟隨系統 → 淺色 → 深色',

    'media.video': '影片',
    'media.image': '圖片',
    'side.left': '左',
    'side.right': '右',
    'time.frame': '(影格 {cur}/{total})',

    'notify.fpsAuto': '已自動檢測影片FPS並設定為 {fps}',
    'notify.fpsBoth': '已偵測 FPS：左 {left}、右 {right}（採用 {chosen}）',
    'notify.autoResize': '📐 已自動調整豎直媒體大小以顯示控制欄位',

    'color.mode.auto': '自動',
    'color.mode.fullrange': '全範圍',
    'color.mode.bt709': '709',
    'color.mode.off': '關',
    'color.btn': '🎨 色彩:{label}',
    'color.cycle.auto': '自動（依 colr atom / SPS 偵測才校正）',
    'color.cycle.fullrange': '強制全範圍仿射（兩側都校正）',
    'color.cycle.bt709': '強制 BT.709 gamma（兩側都校正）',
    'color.cycle.off': '關閉',
    'notify.colorCycle': '🎨 色彩校正：{detail}',
    'color.kind.fullrange': '全範圍',
    'color.kind.bt709': 'BT.709 transfer（gamma 偏淡）',
    'notify.colorDetected': '🎨 偵測到{what}影片（{side}），已自動色彩校正',

    'load.confirmLarge': '檔案很大 ({size}MB)，可能載入緩慢或失敗。\n是否繼續載入？',
    'load.unsupported': '不支援的檔案格式！\n檔案：{name}\n類型：{type}\n大小：{size}MB\n檢測到：{detected}\n請使用影片格式（MP4, MOV, AVI, MKV, WebM）或圖片格式（JPG, PNG, GIF, WebP, BMP）',
    'load.loading': '<div>載入{type}中...</div><div class="muted">檔案：{name}<br/>大小：{size}MB<br/>檢測格式：{detected}</div>',
    'load.timeout': '<div style="color:var(--danger)">載入超時</div><div class="muted">檔案：{name}<br/>檔案可能過大或格式複雜</div>',
    'load.imageError': '<div style="color:var(--danger)">圖片載入失敗</div><div class="muted">檔案：{name}<br/>可能是不支援的圖片格式或檔案損壞</div>',
    'load.readError': '<div style="color:var(--danger)">載入失敗</div><div class="muted">檔案無法讀取：{message}<br/>檔案：{name}</div>',

    'err.loadFail': '{type}載入失敗',
    'err.tryOther': '請嘗試其他{type}檔案',
    'err.aborted': '載入被中斷',
    'err.abortedSug': '請重新選擇檔案',
    'err.network': '網路錯誤',
    'err.networkSug': '請檢查網路連線',
    'err.decode': '解碼失敗',
    'err.decodeSugVideo': '檔案可能損壞或使用了不支援的編碼格式<br/>建議使用 H.264 編碼的 MP4 檔案',
    'err.decodeSugImage': '圖片檔案可能損壞或使用了不支援的格式<br/>建議使用 JPG 或 PNG 格式',
    'err.notSupported': '格式不支援',
    'err.notSupportedSugVideo': '檔案格式或編碼不被支援<br/>建議轉換為標準的 H.264 MP4 格式',
    'err.notSupportedSugImage': '圖片格式不被支援<br/>建議轉換為 JPG 或 PNG 格式',
    'err.compress': '<br/>檔案較大，嘗試壓縮檔案',
    'err.body': '<div style="color:var(--danger)">{errorMsg}</div><div class="muted">檔案：{name}<br/>大小：{size}MB<br/>類型：{type}<br/>{suggestion}</div>',
    'err.unknownType': '未知',

    'alert.dualOne': '只選擇了一個檔案，已載入到左邊。\n請再選擇一個檔案載入到右邊。',
    'alert.dualMany': '選擇了 {count} 個檔案，只使用前兩個：\n左：{left}\n右：{right}',
    'alert.dropUnsupported': '不支援的檔案格式！\n檔案：{name}\n類型：{type}\n支援格式：\n影片：MP4, MOV, AVI, MKV, WebM\n圖片：JPG, PNG, GIF, WebP, BMP',
    'alert.dropMany': '拖放了 {count} 個媒體檔案，使用前兩個：\n左：{left}\n右：{right}',
    'alert.dropOne': '只拖放了一個媒體檔案，請拖放到具體的左邊或右邊區域。',
    'alert.dropNone': '沒有找到有效的媒體檔案。\n支援格式：\n影片：MP4, MOV, AVI, MKV, WebM\n圖片：JPG, PNG, GIF, WebP, BMP',

    'snapshot.noMedia': '請先載入媒體',
    'snapshot.leftLabel': 'Left / 左  ',
    'snapshot.rightLabel': 'Right / 右  ',

    'debug.none': '無',
    'debug.notLoaded': '未載入',
    'debug.playing': '播放中',
    'debug.paused': '暫停',
    'debug.cannotDetect': '無法檢測',
    'debug.unknown': '未知',
    'debug.audio.none': '無',
    'debug.audio.yes': '有',
    'debug.audio.unknown': '未知',
    'debug.section.shared': '共用資訊',
    'debug.row.name': '檔名',
    'debug.row.size': '大小',
    'debug.row.container': '容器',
    'debug.row.duration': '時長',
    'debug.row.res': '解析度',
    'debug.row.codec': '影片編碼',
    'debug.row.type': '類型',
    'debug.row.fps': 'FPS',
    'debug.row.audio': '聲音',
    'debug.row.currentTime': '目前時間',
    'debug.row.readyState': '載入狀態',
    'debug.row.offset': '同步偏移',
    'debug.row.baseDur': '基準時長',
    'debug.row.detectedFPS': '檢測 FPS',
    'debug.row.fpsSetting': '目前設定',
    'debug.row.master': '主時鐘引擎',
    'debug.row.frame': '影格',
    'debug.row.formats': '瀏覽器支援',
  },

  en: {
    'app.docTitle': 'Side-by-Side Media Sync Player',
    'app.title': 'Side-by-Side Media Sync Player <span class="muted">(videos & images, side by side, synced playback & seeking)</span>',
    'app.tips': 'Shortcuts: <span class="kbd">Space</span> Play · <span class="kbd">←/→</span> Step · <span class="kbd">1-4</span> Speed · <span class="kbd">+/-/0</span> Zoom · <span class="kbd">R</span> Reset position · <span class="kbd">V</span> Cycle view (incl. compare) · <span class="kbd">M</span> Mute · <span class="kbd">F</span> Fullscreen · <span class="kbd">S</span> Snapshot · <span class="kbd">X</span> Swap · <span class="kbd">C</span> Color fix · <span class="kbd">A</span>/<span class="kbd">B</span>/<span class="kbd">L</span> Loop segment',
    'upload.dual': '📁 Choose both files',
    'chip.left': 'Left',
    'chip.right': 'Right',
    'upload.left': 'Choose left file',
    'upload.right': 'Choose right file',
    'btn.clear': 'Clear',
    'ph.left': '<div>Drop a video or image here, or click “Choose left file” at the top right</div><div class="muted">Videos: MP4, MOV, AVI, MKV, WebM<br/>Images: JPG, PNG, GIF, WebP, BMP</div>',
    'ph.right': '<div>Drop a video or image here, or click “Choose right file” at the top right</div><div class="muted">Drag & drop or pick a local file<br/>Videos and images can both be compared in sync</div>',
    'file.none': 'No file selected',
    'compare.divider.title': 'Drag to compare',
    'compare.left': 'Left',
    'compare.right': 'Right',

    'help.shortcuts': '⌨️ Shortcuts',
    'group.playback': 'Playback',
    'group.speed': 'Speed',
    'group.sound': 'Volume',
    'group.loop': 'A-B Loop',
    'group.view': 'View',
    'group.zoom': 'Zoom',
    'group.tools': 'Tools',
    'group.sync': 'Sync offset',

    'btn.play': '▶︎ Play',
    'btn.pause': '⏸ Pause',
    'btn.play.title': 'Play/Pause (Space)',
    'btn.stepBack': '◀ -1 frame',
    'btn.stepBack.title': 'Previous frame (←)',
    'btn.stepFwd': '+1 frame ▶',
    'btn.stepFwd.title': 'Next frame (→)',
    'btn.reset': '⏮ Start',
    'btn.reset.title': 'Back to the beginning',
    'btn.snapshot': '📸 Snapshot',
    'btn.snapshot.title': 'Capture the current frame (S)',
    'btn.swap': '⇄ Swap',
    'btn.swap.title': 'Swap left/right (X)',
    'btn.fullscreen': '⛶ Fullscreen',
    'btn.fullscreen.title': 'Fullscreen (F)',
    'btn.colorFix.title': 'Color fix: auto detect (full-range affine / BT.709 gamma) → force full-range → force 709 → off (C)',
    'btn.resetSize': '⤢ Reset layout',
    'btn.resetSize.title': 'Reset column widths & heights',
    'btn.viewDual': '◫ Dual',
    'btn.viewDual.title': 'Side by side (V cycles views)',
    'btn.viewLeft': '◀ Left',
    'btn.viewLeft.title': 'Left only (V cycles views)',
    'btn.viewRight': 'Right ▶',
    'btn.viewRight.title': 'Right only (V cycles views)',
    'btn.viewCompare': '◧ Compare',
    'btn.viewCompare.title': 'Overlay compare + center slider',
    'btn.viewHighlight': '◪ Diff',
    'btn.viewHighlight.title': 'Difference highlight: grayscale base, red = left brighter, blue = left darker (V cycles views)',
    'group.highlight': 'Diff threshold',
    'label.hlThr.title': 'Threshold: 0–100 maps to an actual pixel diff of 0–50; pixels with diff ≥ threshold get colored',
    'btn.hlThrReset': '↺ Default',
    'btn.hlThrReset.title': 'Reset to the default threshold',
    'highlight.empty': 'Load media to see differences',
    'highlight.legend': '🔴 L > R · 🔵 L < R',
    'btn.zoomOut.title': 'Zoom out (-)',
    'btn.zoomIn.title': 'Zoom in (+)',
    'btn.resetZoom.title': 'Reset zoom (0)',
    'btn.resetPosition': '⌖ Center',
    'btn.resetPosition.title': 'Reset position (R)',
    'btn.mute.title': 'Mute (M)',
    'label.speed.title': 'Playback speed (1-4)',
    'label.fps': 'Step FPS',
    'marker.a.title': 'Point A',
    'marker.b.title': 'Point B',
    'btn.setA.title': 'Set point A (A)',
    'btn.setB.title': 'Set point B (B)',
    'btn.loop': '🔁 Loop',
    'btn.loop.title': 'Loop A-B (L)',
    'btn.clearAB.title': 'Clear A-B',
    'chip.syncTune': 'Sync fine-tune (advance/delay the right side)',
    'label.offset': 'Offset (ms)',
    'btn.applyOffset': 'Align now',
    'hint.offset': '(positive = right side later; negative = right side earlier)',
    'info.title': 'Information',
    'btn.lang': '🌐 中文',
    'btn.theme.system': '🖥️ System',
    'btn.theme.light': '☀️ Light',
    'btn.theme.dark': '🌙 Dark',
    'btn.theme.title': 'Switch theme: follow system → light → dark',

    'media.video': 'video',
    'media.image': 'image',
    'side.left': 'left',
    'side.right': 'right',
    'time.frame': '(frame {cur}/{total})',

    'notify.fpsAuto': 'Video FPS auto-detected and set to {fps}',
    'notify.fpsBoth': 'Detected FPS: left {left}, right {right} (using {chosen})',
    'notify.autoResize': '📐 Auto-resized vertical media to keep the controls visible',

    'color.mode.auto': 'Auto',
    'color.mode.fullrange': 'Full range',
    'color.mode.bt709': '709',
    'color.mode.off': 'Off',
    'color.btn': '🎨 Color: {label}',
    'color.cycle.auto': 'Auto (correct only when detected via colr atom / SPS)',
    'color.cycle.fullrange': 'Force full-range affine (both sides)',
    'color.cycle.bt709': 'Force BT.709 gamma (both sides)',
    'color.cycle.off': 'Off',
    'notify.colorCycle': '🎨 Color correction: {detail}',
    'color.kind.fullrange': 'full-range',
    'color.kind.bt709': 'BT.709 transfer (gamma washed-out)',
    'notify.colorDetected': '🎨 Detected {what} video ({side}) — color correction applied',

    'load.confirmLarge': 'Large file ({size}MB) — loading may be slow or fail.\nContinue?',
    'load.unsupported': 'Unsupported file format!\nFile: {name}\nType: {type}\nSize: {size}MB\nDetected: {detected}\nPlease use a video (MP4, MOV, AVI, MKV, WebM) or image (JPG, PNG, GIF, WebP, BMP) format',
    'load.loading': '<div>Loading {type}...</div><div class="muted">File: {name}<br/>Size: {size}MB<br/>Detected format: {detected}</div>',
    'load.timeout': '<div style="color:var(--danger)">Load timed out</div><div class="muted">File: {name}<br/>The file may be too large or too complex</div>',
    'load.imageError': '<div style="color:var(--danger)">Failed to load image</div><div class="muted">File: {name}<br/>Unsupported image format or corrupted file</div>',
    'load.readError': '<div style="color:var(--danger)">Load failed</div><div class="muted">File could not be read: {message}<br/>File: {name}</div>',

    'err.loadFail': 'Failed to load {type}',
    'err.tryOther': 'Try another {type} file',
    'err.aborted': 'Loading was interrupted',
    'err.abortedSug': 'Please choose the file again',
    'err.network': 'Network error',
    'err.networkSug': 'Check your network connection',
    'err.decode': 'Decode failed',
    'err.decodeSugVideo': 'The file may be corrupted or use an unsupported codec<br/>An H.264-encoded MP4 file is recommended',
    'err.decodeSugImage': 'The image may be corrupted or use an unsupported format<br/>JPG or PNG is recommended',
    'err.notSupported': 'Format not supported',
    'err.notSupportedSugVideo': 'The file format or codec is not supported<br/>Convert to a standard H.264 MP4',
    'err.notSupportedSugImage': 'The image format is not supported<br/>Convert to JPG or PNG',
    'err.compress': '<br/>The file is large — try compressing it',
    'err.body': '<div style="color:var(--danger)">{errorMsg}</div><div class="muted">File: {name}<br/>Size: {size}MB<br/>Type: {type}<br/>{suggestion}</div>',
    'err.unknownType': 'unknown',

    'alert.dualOne': 'Only one file was selected; it was loaded on the left.\nPlease pick another file for the right side.',
    'alert.dualMany': '{count} files selected; only the first two are used:\nLeft: {left}\nRight: {right}',
    'alert.dropUnsupported': 'Unsupported file format!\nFile: {name}\nType: {type}\nSupported formats:\nVideos: MP4, MOV, AVI, MKV, WebM\nImages: JPG, PNG, GIF, WebP, BMP',
    'alert.dropMany': '{count} media files dropped; using the first two:\nLeft: {left}\nRight: {right}',
    'alert.dropOne': 'Only one media file was dropped — drop it onto the left or right area specifically.',
    'alert.dropNone': 'No valid media files found.\nSupported formats:\nVideos: MP4, MOV, AVI, MKV, WebM\nImages: JPG, PNG, GIF, WebP, BMP',

    'snapshot.noMedia': 'Load media first',
    'snapshot.leftLabel': 'Left  ',
    'snapshot.rightLabel': 'Right  ',

    'debug.none': 'none',
    'debug.notLoaded': 'not loaded',
    'debug.playing': 'playing',
    'debug.paused': 'paused',
    'debug.cannotDetect': 'cannot detect',
    'debug.unknown': 'unknown',
    'debug.audio.none': 'none',
    'debug.audio.yes': 'yes',
    'debug.audio.unknown': 'unknown',
    'debug.section.shared': 'Shared',
    'debug.row.name': 'File name',
    'debug.row.size': 'Size',
    'debug.row.container': 'Container',
    'debug.row.duration': 'Duration',
    'debug.row.res': 'Resolution',
    'debug.row.codec': 'Video codec',
    'debug.row.type': 'Type',
    'debug.row.fps': 'FPS',
    'debug.row.audio': 'Audio',
    'debug.row.currentTime': 'Current time',
    'debug.row.readyState': 'Load state',
    'debug.row.offset': 'Sync offset',
    'debug.row.baseDur': 'Base duration',
    'debug.row.detectedFPS': 'Detected FPS',
    'debug.row.fpsSetting': 'setting',
    'debug.row.master': 'Master clock',
    'debug.row.frame': 'frame',
    'debug.row.formats': 'Browser support',
  },
};

let currentLang = 'zh';

function t(key, params) {
  const dict = I18N[currentLang] || I18N.zh;
  let s = (dict[key] !== undefined) ? dict[key] : (I18N.zh[key] !== undefined ? I18N.zh[key] : key);
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.split('{' + k + '}').join(String(params[k]));
    }
  }
  return s;
}

function detectDefaultLang() {
  const l = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return l.startsWith('zh') ? 'zh' : 'en';
}

// 套用所有標了 data-i18n / data-i18n-title 的靜態文字
function applyStaticTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.innerHTML = t(key);
    // 寬度佔位：把「另一語言」的文字放進隱藏的零高度行（CSS ::after），
    // 讓元素寬度固定為兩種語言中較寬者，切換語言時不會忽大忽小。
    // 只對純文字內容做（含 HTML 標籤的長文字如 tips/placeholder 不適用）。
    const zh = I18N.zh[key], en = I18N.en[key];
    if (typeof zh === 'string' && typeof en === 'string' && !zh.includes('<') && !en.includes('<')) {
      el.setAttribute('data-i18n-reserve', currentLang === 'zh' ? en : zh);
    }
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.documentElement.lang = currentLang === 'zh' ? 'zh-Hant' : 'en';
  document.title = t('app.docTitle');
}

function setLanguage(lang) {
  currentLang = lang === 'en' ? 'en' : 'zh';
  applyStaticTexts();
  refreshDynamicTexts(); // 定義於 main.js（呼叫時所有 script 已載入）
  saveSettings();        // 定義於 settings.js
}

function toggleLanguage() {
  setLanguage(currentLang === 'zh' ? 'en' : 'zh');
}
