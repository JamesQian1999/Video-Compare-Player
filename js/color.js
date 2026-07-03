// ===== 色彩校正 (🎨 / C)：兩種瀏覽器 vs ffmpeg 的色偏，各自對應一種校正 =====
// 1. 全範圍(yuvj420p/color_range=pc)影片：線性色偏。修正＝每通道 out=in*0.9274+13.03
//    （用 color_diag.html 對 Safari 實測擬合，R²=0.999，平均差 4.15→1.70/255）。
//    ※ 係數與顯示色彩管理有關，換瀏覽器/螢幕可用 color_diag.html 重新量測。
// 2. 限制範圍(tv) + transfer=BT.709(colr trc=1) 影片：macOS 把 BT.709 transfer 當
//    gamma≈1.961 解碼再轉顯示器（QuickTime gamma shift），畫面比 ffmpeg 淡（例：128→約137）。
//    這是 gamma 型色偏，仿射修不準；修正＝out = 255*sRGB_EOTF(in/255)^(1/1.961)。
//    顯示用 SVG feComponentTransfer 的 256 階 LUT；gamma 常數可用 color_diag.html 實測微調。
// - 顯示以 CSS/SVG filter 套在影片上；截圖以逐像素做（精確）。圖片不校正。
// - 模式：自動（依 H.264 SPS video_full_range_flag + 容器 colr atom 偵測）/ 強制全範圍 / 強制709 / 關。

// ===== BT.709 gamma 校正 LUT =====
// macOS 顯示 trc=1 影片：亮度 = v^1.961；顯示 sRGB 圖片：亮度 = sRGB_EOTF(v)。
// 要讓影片顯示與 ffmpeg 參考一致 ⇒ 校正 f(v) 使 f(v)^1.961 = sRGB_EOTF(v)
// ⇒ f(v) = sRGB_EOTF(v)^(1/1.961)。同一函數也正是「瀏覽器像素 → ffmpeg 參考」的映射。
function srgbEotf(x) { return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }
let _bt709Lut = null;
function bt709Lut() {
  if (!_bt709Lut) {
    _bt709Lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      _bt709Lut[i] = Math.round(255 * Math.pow(srgbEotf(i / 255), 1 / BT709_GAMMA));
    }
  }
  return _bt709Lut;
}
// 顯示用 SVG filter：feComponentTransfer type="table"（必須以 sRGB 空間運算），lazy 注入一次
function ensureBt709Filter() {
  if (document.getElementById('cc709')) return;
  const t = Array.from(bt709Lut(), v => (v / 255).toFixed(4)).join(' ');
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><filter id="cc709" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="table" tableValues="${t}"/><feFuncG type="table" tableValues="${t}"/><feFuncB type="table" tableValues="${t}"/></feComponentTransfer></filter></svg>`;
  document.body.appendChild(holder);
}

// 某一側應套用的色彩校正種類：null | 'fullrange' | 'bt709'
function sideCorrectKind(side) {
  if (colorCorrectMode === 'off') return null;
  if (colorCorrectMode === 'fullrange' || colorCorrectMode === 'bt709') return colorCorrectMode; // 強制
  return side === 'left' ? leftColorKind : rightColorKind; // auto：偵測到才校正
}

function cssForKind(kind) {
  if (kind === 'fullrange') return FULL_RANGE_CSS;
  if (kind === 'bt709') { ensureBt709Filter(); return 'url(#cc709)'; }
  return '';
}

// 顯示：以 CSS/SVG filter 套在「影片」元素上（圖片為既有 RGB，不需校正）
function applyColorCorrection() {
  leftVideo.style.filter  = cssForKind(sideCorrectKind('left'));
  rightVideo.style.filter = cssForKind(sideCorrectKind('right'));
  updateColorFixButton();
}

function updateColorFixButton() {
  const label = t('color.mode.' + colorCorrectMode) || t('color.mode.auto');
  colorFixBtn.innerHTML = t('color.btn', { label });
  // 寬度佔位：以「兩種語言 × 四種模式」中最長的字串固定按鈕寬度，
  // 切換模式或語言時按鈕不會忽大忽小
  if (!colorFixBtn.hasAttribute('data-i18n-reserve')) {
    let longest = '';
    ['auto', 'fullrange', 'bt709', 'off'].forEach((m) => {
      ['zh', 'en'].forEach((L) => {
        const s = I18N[L]['color.btn'].split('{label}').join(I18N[L]['color.mode.' + m]);
        if (s.length > longest.length) longest = s;
      });
    });
    colorFixBtn.setAttribute('data-i18n-reserve', longest);
  }
  // auto 且有偵測到、或任一強制模式，就高亮
  const active = (colorCorrectMode === 'fullrange') || (colorCorrectMode === 'bt709')
    || (colorCorrectMode === 'auto' && !!(leftColorKind || rightColorKind));
  colorFixBtn.classList.toggle('active', active);
}

function cycleColorCorrect() {
  const order = ['auto', 'fullrange', 'bt709', 'off'];
  colorCorrectMode = order[(order.indexOf(colorCorrectMode) + 1) % order.length];
  applyColorCorrection();
  saveSettings();
  const detail = t('color.cycle.' + colorCorrectMode);
  showTransientNotification('colorFixNotification', t('notify.colorCycle', { detail }), { background: 'var(--accent)', color: 'white', top: '120px' }, 2500);
}

// 產生「已色彩校正」的來源（截圖用，逐像素精確）
// 只對需要校正的「影片」側處理；否則直接回傳原始元素供 drawImage。
function correctedSource(m, side) {
  const kind = (m && m.kind === 'video') ? sideCorrectKind(side) : null;
  if (!m || !kind) return m ? m.el : null;
  const d = snapshotDims(m);
  if (!d || !d.w || !d.h) return m.el;
  const cv = document.createElement('canvas');
  cv.width = d.w; cv.height = d.h;
  const cx = cv.getContext('2d');
  cx.drawImage(m.el, 0, 0, d.w, d.h);
  try {
    const id = cx.getImageData(0, 0, d.w, d.h);
    const p = id.data;
    if (kind === 'bt709') {
      const lut = bt709Lut();
      for (let i = 0; i < p.length; i += 4) {
        p[i] = lut[p[i]]; p[i+1] = lut[p[i+1]]; p[i+2] = lut[p[i+2]];
      }
    } else {
      for (let i = 0; i < p.length; i += 4) {
        p[i]   = Math.min(255, Math.max(0, p[i]   * CC_A + CC_B));
        p[i+1] = Math.min(255, Math.max(0, p[i+1] * CC_A + CC_B));
        p[i+2] = Math.min(255, Math.max(0, p[i+2] * CC_A + CC_B));
      }
    }
    cx.putImageData(id, 0, 0);
  } catch (e) { console.warn('color correct (snapshot) failed, using raw:', e); return m.el; }
  return cv;
}
