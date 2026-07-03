// ===== 通用工具：時間格式、FPS 對齊、暫時性通知 =====

function formatTime(t){
  if (!isFinite(t)) return '--:--';
  const total = Math.max(0, t);
  const h = Math.floor(total/3600);
  const m = Math.floor((total%3600)/60);
  const s = Math.floor(total%60);
  const ms = Math.floor((total - Math.floor(total)) * 1000);
  const pad = (n) => n.toString().padStart(2,'0');
  return (h>0? (pad(h)+':'):'') + pad(m)+':'+pad(s) + (h>0? '' : (ms? '.'+String(ms).padStart(3,'0'):''));
}

// 對齊到常見的標準幀率（容差 0.05）
function snapToCommonFps(raw) {
  const common = [23.976023976, 24, 25, 29.970029970, 30, 47.952047952, 48, 50, 59.940059940, 60, 90, 100, 120];
  for (const c of common) {
    if (Math.abs(raw - c) < 0.05) return c;
  }
  return raw;
}

function roundFpsForDisplay(raw) {
  // 三位小數，整數則不顯示小數
  const r3 = Math.round(raw * 1000) / 1000;
  return Number.isInteger(r3) ? r3 : Number(r3.toFixed(3));
}

function showFPSDetectionNotification(message) {
  const html = (typeof message === 'number')
    ? `🎯 ${t('notify.fpsAuto', { fps: message })}`
    : `🎯 ${message}`;
  showTransientNotification('fpsDetectionNotification', html, {
    background: 'var(--accent-2)', color: '#065f46', top: '70px'
  }, 4000);
}

// 通用 transient notification：存在就更新文字並重置淡出，不存在就建立
function showTransientNotification(id, html, styleVars, durationMs) {
  let n = document.getElementById(id);
  if (!n) {
    n = document.createElement('div');
    n.id = id;
    n.style.cssText = `
      position: fixed;
      top: ${styleVars.top || '20px'};
      right: 20px;
      background: ${styleVars.background};
      color: ${styleVars.color};
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(n);
  }
  n.innerHTML = html;
  n.style.opacity = '1';
  // 重置淡出計時
  if (n._hideTimer) clearTimeout(n._hideTimer);
  if (n._removeTimer) clearTimeout(n._removeTimer);
  n._hideTimer = setTimeout(() => {
    n.style.opacity = '0';
    n._removeTimer = setTimeout(() => {
      if (n.parentNode) n.parentNode.removeChild(n);
    }, 300);
  }, durationMs);
}

// 顯示自動調整通知
function showAutoResizeNotification() {
  showTransientNotification('autoResizeNotification', t('notify.autoResize'), {
    background: 'var(--accent)', color: 'white', top: '20px'
  }, 3000);
}
