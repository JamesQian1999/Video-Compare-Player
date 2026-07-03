// ===== 截圖：把兩邊目前畫面合成成 PNG（比較圖＋左右各一張）=====

// 取媒體原生尺寸
function snapshotDims(m) {
  if (!m) return null;
  if (m.kind === 'video') return { w: m.el.videoWidth, h: m.el.videoHeight };
  return { w: m.el.naturalWidth, h: m.el.naturalHeight };
}

// 把單一側渲染成一張自己的 canvas（原生解析度＋標籤列＋時間戳）
function renderSideCanvas(src, d, labelText, stamp) {
  if (!src || !d || !d.w || !d.h) return null;
  const labelH = 36;
  const canvas = document.createElement('canvas');
  canvas.width = d.w;
  canvas.height = d.h + labelH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, labelH, d.w, d.h);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e6edf6';
  ctx.font = '600 16px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.textAlign = 'left';
  ctx.fillText(labelText, 8, labelH / 2);

  ctx.font = '12px ui-monospace, Menlo, Consolas';
  ctx.fillStyle = '#8a93a6';
  ctx.textAlign = 'right';
  ctx.fillText(stamp, canvas.width - 8, labelH / 2);
  ctx.textAlign = 'left';
  return canvas;
}

// 把 canvas 下載成 PNG（可延遲，避免多檔同時下載被瀏覽器擋掉）
function downloadCanvas(canvas, filename, delay = 0) {
  setTimeout(() => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }, delay);
}

function takeSnapshot() {
  const l = activeMediaOf('left');
  const r = activeMediaOf('right');
  if (!l && !r) {
    alert(t('snapshot.noMedia'));
    return;
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tNow = getCurrentMasterTime();
  const stamp = `t=${formatTime(tNow)}`;
  const leftLabel = t('snapshot.leftLabel') + (leftFilename.classList.contains('has-file') ? leftFilename.textContent : '');
  const rightLabel = t('snapshot.rightLabel') + (rightFilename.classList.contains('has-file') ? rightFilename.textContent : '');
  // 取檔名（去副檔名、清掉檔名不允許字元）供下載檔名使用
  const baseName = (el) => {
    const raw = el.classList.contains('has-file') ? el.textContent : '';
    const noExt = raw.replace(/\.[^.]+$/, '');
    const safe = noExt.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '');
    return safe || 'na';
  };
  const leftName = baseName(leftFilename);
  const rightName = baseName(rightFilename);

  // 先準備「已色彩校正」的來源（全範圍影片會被逐像素修正；否則就是原始元素）
  const lsrc = l ? correctedSource(l, 'left') : null;
  const rsrc = r ? correctedSource(r, 'right') : null;

  // ── 比較圖（左右並排，統一高度）──
  const ld = snapshotDims(l), rd = snapshotDims(r);
  const targetH = Math.max(ld ? ld.h : 0, rd ? rd.h : 0) || 720;
  const lw = ld ? Math.round(ld.w * targetH / ld.h) : 0;
  const rw = rd ? Math.round(rd.w * targetH / rd.h) : 0;
  const gap = (lw && rw) ? 8 : 0;
  const labelH = 36;
  const canvas = document.createElement('canvas');
  canvas.width = lw + rw + gap;
  canvas.height = targetH + labelH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e6edf6';
  ctx.font = '600 16px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.textBaseline = 'middle';
  let x = 0;
  if (l) { ctx.drawImage(lsrc, x, labelH, lw, targetH); ctx.fillText(leftLabel, x + 8, labelH / 2); x += lw + gap; }
  if (r) { ctx.drawImage(rsrc, x, labelH, rw, targetH); ctx.fillText(rightLabel, x + 8, labelH / 2); }
  ctx.font = '12px ui-monospace, Menlo, Consolas';
  ctx.fillStyle = '#8a93a6';
  ctx.textAlign = 'right';
  ctx.fillText(stamp, canvas.width - 8, labelH / 2);
  ctx.textAlign = 'left';

  // ── 三張分開下載：比較圖、左圖、右圖（各延遲避免被擋）──
  let n = 0;
  downloadCanvas(canvas, `snapshot_${ts}_compare_${leftName}_${rightName}.png`, (n++) * 250);
  if (l) {
    const lc = renderSideCanvas(lsrc, ld, leftLabel, stamp);
    if (lc) downloadCanvas(lc, `snapshot_${ts}_left_${leftName}.png`, (n++) * 250);
  }
  if (r) {
    const rc = renderSideCanvas(rsrc, rd, rightLabel, stamp);
    if (rc) downloadCanvas(rc, `snapshot_${ts}_right_${rightName}.png`, (n++) * 250);
  }
}
