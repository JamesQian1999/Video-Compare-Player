// ===== 差異高亮檢視 (highlight view) =====
// 兩側媒體逐像素相減：底圖為左側灰階，像素差 ≥ 門檻的位置依「正負」染色
//   紅 = 左比右亮（正）、藍 = 左比右暗（負）；差異越大顏色越飽和。
// 差異幅度取 RGB 三通道差的最大值（純色差也抓得到），正負號取亮度差。
// 門檻由 UI 滑桿即時調整：顯示 0–100，實際像素差門檻＝顯示值 × HL_THR_SCALE（0–50），
// 讓滑桿在低門檻區有兩倍的調整解析度。
//
// 效能與時機：
// - 處理解析度上限 HL_MAX_PIXELS（超過等比例縮小），避免 4K 每格全解析度掃描。
// - 自帶 rAF 迴圈，但只在「簽章」（currentTime / 來源 / 門檻）改變或被 seeked/load
//   事件標記 dirty 時才重算 —— currentTime 在 seek 當下就變（畫格稍後才解碼好），
//   所以 seeked 再補渲染一次，確保拿到的是新畫格。
// - 影片元素在 highlight 模式下被 CSS 隱藏，但主時鐘照常 seek，drawImage 不受影響。
// - 注意：色彩校正是 CSS filter，drawImage 拿到的是原始像素；兩側一致，不影響相減。

const HL_MAX_PIXELS = 1000000;
const HL_THR_SCALE = 0.5; // 顯示值(0–100) → 實際像素差門檻(0–50)
const HL_DEFAULT_THRESHOLD = Number(hlThrInput.value) || 12; // 預設門檻（顯示值）＝HTML 上的初始值
let hlThreshold = HL_DEFAULT_THRESHOLD; // 顯示值；實際門檻見 renderHighlight 的 thr
let hlForce = false;
let hlLastSig = '';

const hlSrcL = document.createElement('canvas');
const hlSrcR = document.createElement('canvas');
const hlCtxL = hlSrcL.getContext('2d', { willReadFrequently: true });
const hlCtxR = hlSrcR.getContext('2d', { willReadFrequently: true });

function requestHighlightRender() { hlForce = true; }

// 取某一側可繪製的來源與原生尺寸（影片或圖片）
function hlSourceOf(side) {
  const m = activeMediaOf(side);
  if (!m) return null;
  const w = m.kind === 'video' ? m.el.videoWidth : m.el.naturalWidth;
  const h = m.kind === 'video' ? m.el.videoHeight : m.el.naturalHeight;
  if (!w || !h) return null;
  return { el: m.el, w, h };
}

function renderHighlight() {
  const l = hlSourceOf('left');
  const r = hlSourceOf('right');
  const ref = l || r; // 尺寸基準：優先左側；兩側解析度不同時把另一側拉伸到同尺寸再相減
  const octx = highlightCanvas.getContext('2d');

  if (!ref) {
    highlightPh.style.display = '';
    octx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);
    return;
  }
  highlightPh.style.display = 'none';

  const scale = Math.min(1, Math.sqrt(HL_MAX_PIXELS / (ref.w * ref.h)));
  const w = Math.max(1, Math.round(ref.w * scale));
  const h = Math.max(1, Math.round(ref.h * scale));
  if (highlightCanvas.width !== w) highlightCanvas.width = w;
  if (highlightCanvas.height !== h) highlightCanvas.height = h;
  if (hlSrcL.width !== w) { hlSrcL.width = w; hlSrcR.width = w; }
  if (hlSrcL.height !== h) { hlSrcL.height = h; hlSrcR.height = h; }

  let dl = null, dr = null;
  if (l) { hlCtxL.drawImage(l.el, 0, 0, w, h); dl = hlCtxL.getImageData(0, 0, w, h); }
  if (r) { hlCtxR.drawImage(r.el, 0, 0, w, h); dr = hlCtxR.getImageData(0, 0, w, h); }

  const base = dl || dr;          // 只載入一側時顯示該側灰階、不標差異
  const B = (dl && dr) ? dr.data : null;
  const A = base.data;
  const out = octx.createImageData(w, h);
  const O = out.data;
  const thr = Math.max(1, hlThreshold * HL_THR_SCALE); // 門檻 0 時仍要求差 ≥1，完全相同的像素不染色

  for (let i = 0; i < A.length; i += 4) {
    const g = A[i] * 0.299 + A[i + 1] * 0.587 + A[i + 2] * 0.114;
    let rr = g, gg = g, bb = g;
    if (B) {
      const dR = A[i] - B[i], dG = A[i + 1] - B[i + 1], dB = A[i + 2] - B[i + 2];
      const ad = Math.max(Math.abs(dR), Math.abs(dG), Math.abs(dB));
      if (ad >= thr) {
        const lum = dR * 0.299 + dG * 0.587 + dB * 0.114;
        const pos = lum !== 0 ? lum > 0 : (dR + dG + dB) >= 0;
        const k = Math.min(1, 0.4 + (ad - thr) / 80); // 基礎 40% 染色，隨差異加深
        const keep = g * (1 - k);
        if (pos) { rr = keep + 255 * k; gg = keep; bb = keep; }
        else     { bb = keep + 255 * k; rr = keep; gg = keep; }
      }
    }
    O[i] = rr; O[i + 1] = gg; O[i + 2] = bb; O[i + 3] = 255;
  }
  octx.putImageData(out, 0, 0);
}

// 簽章：這些值有變才需要重算（播放時 currentTime 每格變一次 ⇒ 每格重算一次）
function hlSignature() {
  return [
    leftVideo.currentTime, rightVideo.currentTime,
    leftVideo.src, rightVideo.src, leftImage.src, rightImage.src,
    leftVideo.style.display, leftImage.style.display,
    rightVideo.style.display, rightImage.style.display,
    hlThreshold,
  ].join('|');
}

// 任一側影片還在 seek（新畫格尚未解碼完成）就不能相減——
// 否則會拿「一邊新畫格、一邊舊畫格」來比，整個畫面被誤標成差異。
// 此時維持上一張一致的結果，等兩邊都定位完成（seeked）才重算。
function hlBusy() {
  if (Number.isFinite(leftVideo.duration) && (leftVideo.seeking || leftVideo.readyState < 2)) return true;
  if (Number.isFinite(rightVideo.duration) && (rightVideo.seeking || rightVideo.readyState < 2)) return true;
  return false;
}

(function highlightLoop() {
  if (viewMode === 'highlight' && !hlBusy()) {
    const sig = hlSignature();
    if (hlForce || sig !== hlLastSig) {
      hlLastSig = sig;
      hlForce = false;
      renderHighlight();
    }
  }
  requestAnimationFrame(highlightLoop);
})();

// seek 之後新畫格解碼完成（seeked）、媒體載入完成時補渲染一次
[leftVideo, rightVideo].forEach(v => {
  v.addEventListener('seeked', requestHighlightRender);
  v.addEventListener('loadeddata', requestHighlightRender);
});
[leftImage, rightImage].forEach(im => im.addEventListener('load', requestHighlightRender));

// 門檻滑桿：即時重算並顯示數值
function setHlThreshold(v) {
  hlThreshold = Math.max(0, Math.min(100, Number(v) || 0));
  hlThrInput.value = hlThreshold;
  hlThrValEl.textContent = hlThreshold;
  requestHighlightRender();
}
hlThrInput.addEventListener('input', () => setHlThreshold(hlThrInput.value));
hlThrInput.addEventListener('change', () => saveSettings());

// 重設為預設門檻
hlThrResetBtn.addEventListener('click', () => {
  setHlThreshold(HL_DEFAULT_THRESHOLD);
  saveSettings();
});

// 點擊差異畫布 = 播放/暫停（與點影片一致；拖移後的 click 要抑制）
highlightCanvas.addEventListener('click', () => {
  if (suppressNextClick) { suppressNextClick = false; return; }
  if (isDragging || highlightCanvas.classList.contains('dragging')) return;
  if (Number.isFinite(leftVideo.duration) || Number.isFinite(rightVideo.duration)) {
    if (isAnyPlaying()) pauseBoth(); else playBoth();
  }
});
