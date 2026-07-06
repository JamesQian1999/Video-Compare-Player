// ===== 初始化與事件掛載（保持與原版相同的執行順序）=====

// --- 語言初始化：優先用已儲存設定，否則依瀏覽器語言 ---
(function initLanguage() {
  let lang = null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) lang = JSON.parse(raw).lang || null;
  } catch {}
  currentLang = lang === 'en' || lang === 'zh' ? lang : detectDefaultLang();
  applyStaticTexts();
})();

// 切換語言後刷新所有由 JS 動態產生的文字
function refreshDynamicTexts() {
  updatePlayPauseButton();
  updateColorFixButton();
  updateCompareLabels();
  if (!leftFilename.classList.contains('has-file')) leftFilename.textContent = t('file.none');
  if (!rightFilename.classList.contains('has-file')) rightFilename.textContent = t('file.none');
  debugToggleBtn.textContent = debugInfoEl.classList.contains('collapsed') ? t('debug.expand') : t('debug.collapse');
  if (!debugInfoEl.classList.contains('collapsed')) updateDebugInfo();
  updateTimeUI();
  langBtn.textContent = t('btn.lang');
}

langBtn.addEventListener('click', toggleLanguage);

// File inputs
leftFile.addEventListener('change', e=>{
  console.log('Left file input changed:', e.target.files[0]);
  if (e.target.files[0]) {
    loadSide('left', e.target.files[0]);
  }
});

rightFile.addEventListener('change', e=>{
  console.log('Right file input changed:', e.target.files[0]);
  if (e.target.files[0]) {
    loadSide('right', e.target.files[0]);
  }
});

// 雙文件同時上傳
dualFile.addEventListener('change', e=>{
  console.log('Dual file input changed:', e.target.files);
  const files = e.target.files;

  if (files.length === 0) {
    return;
  } else if (files.length === 1) {
    // 只選了一個文件，載入到左邊
    loadSide('left', files[0]);
    alert(t('alert.dualOne'));
  } else if (files.length === 2) {
    // 選了兩個文件，分別載入
    loadSide('left', files[0]);
    loadSide('right', files[1]);
    console.log('Loading two files:', files[0].name, 'and', files[1].name);
  } else {
    // 選了超過兩個文件，只使用前兩個
    loadSide('left', files[0]);
    loadSide('right', files[1]);
    alert(t('alert.dualMany', { count: files.length, left: files[0].name, right: files[1].name }));
  }

  // 清空輸入框以便下次使用
  e.target.value = '';
});

leftClear.addEventListener('click', ()=> clearSide('left'));
rightClear.addEventListener('click', ()=> clearSide('right'));

// Drag & drop
[leftSlot, rightSlot].forEach(slot=>{
  slot.addEventListener('dragover', e=>{
    e.preventDefault();
    e.stopPropagation();
    slot.classList.add('dragover');
  });

  slot.addEventListener('dragenter', e=>{
    e.preventDefault();
    e.stopPropagation();
    slot.classList.add('dragover');
  });

  slot.addEventListener('dragleave', e=>{
    e.preventDefault();
    e.stopPropagation();
    // 只有當滑鼠真正離開容器時才移除樣式
    if (!slot.contains(e.relatedTarget)) {
      slot.classList.remove('dragover');
    }
  });

  slot.addEventListener('drop', e=>{
    e.preventDefault();
    e.stopPropagation();
    slot.classList.remove('dragover');

    const files = e.dataTransfer.files;
    console.log('Files dropped:', files);

    if (files && files.length > 0) {
      const file = files[0];
      console.log('File dropped:', file.name, 'Type:', file.type, 'Size:', file.size);

      // 檢查影片和圖片格式
      const validVideoTypes = ['video/', 'application/mp4', 'application/x-mp4'];
      const validVideoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv'];
      const validImageTypes = ['image/'];
      const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

      const isValidVideoType = validVideoTypes.some(type => file.type.startsWith(type));
      const isValidVideoExt = validVideoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      const isValidImageType = validImageTypes.some(type => file.type.startsWith(type));
      const isValidImageExt = validImageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (isValidVideoType || isValidVideoExt || isValidImageType || isValidImageExt) {
        loadSide(slot.dataset.side, file);
      } else {
        alert(t('alert.dropUnsupported', { name: file.name, type: file.type }));
      }
    }
  });
});

// 在整個視頻網格上添加拖放支援（支援同時拖放兩個檔案）
videoGrid.addEventListener('dragover', e=>{
  e.preventDefault();
  e.stopPropagation();
});

videoGrid.addEventListener('drop', e=>{
  e.preventDefault();
  e.stopPropagation();

  const files = e.dataTransfer.files;
  console.log('Files dropped on grid:', files);

  if (files && files.length >= 2) {
    // 有兩個或更多檔案，嘗試同時載入
    const validVideoTypes = ['video/', 'application/mp4', 'application/x-mp4'];
    const validVideoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv'];
    const validImageTypes = ['image/'];
    const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

    const mediaFiles = Array.from(files).filter(file => {
      const isValidVideoType = validVideoTypes.some(type => file.type.startsWith(type));
      const isValidVideoExt = validVideoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      const isValidImageType = validImageTypes.some(type => file.type.startsWith(type));
      const isValidImageExt = validImageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      return isValidVideoType || isValidVideoExt || isValidImageType || isValidImageExt;
    });

    if (mediaFiles.length >= 2) {
      loadSide('left', mediaFiles[0]);
      loadSide('right', mediaFiles[1]);
      console.log('Loading two files from drag:', mediaFiles[0].name, 'and', mediaFiles[1].name);

      if (mediaFiles.length > 2) {
        alert(t('alert.dropMany', { count: mediaFiles.length, left: mediaFiles[0].name, right: mediaFiles[1].name }));
      }
    } else if (mediaFiles.length === 1) {
      // 只有一個有效媒體檔案，提示用戶
      alert(t('alert.dropOne'));
    } else {
      alert(t('alert.dropNone'));
    }
  }
  // 如果少於兩個檔案，讓個別區域處理
});

playPauseBtn.addEventListener('click', () => {
  if (isAnyPlaying()) pauseBoth(); else playBoth();
});
resetBtn.addEventListener('click', ()=>{
  masterTime = 0;
  applyFrame();
  if (isPlaying) reanchor();
});
resetSizeBtn.addEventListener('click', resetVideoSize);
viewDualBtn.addEventListener('click', () => setViewMode('dual'));
viewLeftBtn.addEventListener('click', () => setViewMode('left'));
viewRightBtn.addEventListener('click', () => setViewMode('right'));
viewCompareBtn.addEventListener('click', () => setViewMode('compare'));
viewHighlightBtn.addEventListener('click', () => setViewMode('highlight'));

// 縮放按鈕事件
zoomInBtn.addEventListener('click', zoomIn);
zoomOutBtn.addEventListener('click', zoomOut);
resetZoomBtn.addEventListener('click', resetZoom);
resetPositionBtn.addEventListener('click', resetPosition);

// 新功能按鈕事件
snapshotBtn.addEventListener('click', takeSnapshot);
swapBtn.addEventListener('click', swapSides);
fullscreenBtn.addEventListener('click', toggleFullscreen);
colorFixBtn.addEventListener('click', cycleColorCorrect);
muteBtn.addEventListener('click', toggleMute);
setABtn.addEventListener('click', setAPoint);
setBBtn.addEventListener('click', setBPoint);
loopBtn.addEventListener('click', toggleLoop);
clearABBtn.addEventListener('click', clearAB);

// 點影片切換播放
[leftVideo, rightVideo].forEach(v => {
  v.addEventListener('click', (e) => {
    // 剛拖動結束的 click 抑制掉，避免拖移後自動播放
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    // 拖移期間不觸發播放切換
    if (v.classList.contains('dragging') || isDragging) return;
    // 比較模式下不切換播放（分隔線拖移與 shift+click 由 compare slider 接管）
    if (videoGrid.classList.contains('compare-view')) return;
    if (Number.isFinite(leftVideo.duration) || Number.isFinite(rightVideo.duration)) {
      if (isAnyPlaying()) pauseBoth(); else playBoth();
    }
  });
});

// 除錯面板切換
debugToggleBtn.addEventListener('click', () => {
  const collapsed = debugInfoEl.classList.toggle('collapsed');
  debugToggleBtn.textContent = collapsed ? t('debug.expand') : t('debug.collapse');
  if (!collapsed) updateDebugInfo();
});

// Seeking — 用 pointerdown/up 控制拖曳狀態，避免 input/change 順序不確定
seek.addEventListener('pointerdown', ()=>{ seekDragging = true; });
seek.addEventListener('pointerup',   ()=>{ seekDragging = false; });
seek.addEventListener('pointercancel',()=>{ seekDragging = false; });
seek.addEventListener('keydown', (e)=>{
  // 鍵盤拖拉時也標記
  if (['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(e.key)) seekDragging = true;
});
seek.addEventListener('keyup',   ()=>{ seekDragging = false; });
seek.addEventListener('input', ()=>{
  if (!baseDuration) return;
  masterTime = seek.value * baseDuration;
  applyFrame();
  if (isPlaying) reanchor();
});

// A/B 標記拖曳 — 直接在時間軸上調整循環點
// 反推 CSS 的定位公式：left = 8px + pos * (寬 - 16px)，所以 pos = (x - 8) / (寬 - 16)
function markerFrameFromPointer(e){
  const rect = seek.getBoundingClientRect();
  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left - 8) / (rect.width - 16)));
  return frameOf(pos * baseDuration);
}
function initMarkerDrag(markerEl, which){
  markerEl.addEventListener('pointerdown', (e)=>{
    if (!(baseDuration > 0)) return;
    e.preventDefault();
    markerEl.setPointerCapture(e.pointerId);
    markerEl.classList.add('dragging');
    const move = (ev)=>{
      // 吸附影格中央，並保持 A、B 至少相差一格（拖過頭時夾住，不清除另一點）
      let n = markerFrameFromPointer(ev);
      if (which === 'a' && bPoint !== null) n = Math.min(n, frameOf(bPoint) - 1);
      if (which === 'b' && aPoint !== null) n = Math.max(n, frameOf(aPoint) + 1);
      n = Math.max(0, Math.min(maxFrameIndex(), n));
      const t = frameCenterTime(n);
      if (which === 'a') aPoint = t; else bPoint = t;
      updateABMarkers();
    };
    const end = ()=>{
      markerEl.removeEventListener('pointermove', move);
      markerEl.classList.remove('dragging');
    };
    move(e);
    markerEl.addEventListener('pointermove', move);
    markerEl.addEventListener('pointerup', end, { once: true });
    markerEl.addEventListener('pointercancel', end, { once: true });
  });
}
initMarkerDrag(markerA, 'a');
initMarkerDrag(markerB, 'b');

// Speed + volume（倍速只影響主時鐘推進速度，不再改 video.playbackRate）
speed.addEventListener('change', ()=>{
  if (isPlaying) reanchor(); // 從當下重新起算，套用新倍速
  saveSettings();
});
volume.addEventListener('input', ()=>{
  const v = Number(volume.value);
  leftVideo.volume = v;
  rightVideo.volume = v;
  // 拉動音量取消靜音
  if (v > 0 && isMuted) setMuted(false);
  saveSettings();
});
// FPS 改變會改變影格切分，重新吸附到影格中央並更新顯示
fps.addEventListener('change', ()=>{
  applyFrame();
  if (isPlaying) reanchor();
  saveSettings();
});

// Offset
applyOffset.addEventListener('click', ()=>{
  // 兩支都載入才能套用偏移（即使 UI 已 disabled，這裡再保險一次）
  if (!Number.isFinite(leftVideo.duration) || !Number.isFinite(rightVideo.duration)) return;
  syncOffset = Number(offsetInput.value) / 1000; // ms -> s
  applyFrame(); // 右邊即時對齊到 master 時間 + 偏移
  saveSettings();
});
offsetInput.addEventListener('change', saveSettings);

stepFwdBtn.addEventListener('click', ()=> step(+1));
stepBackBtn.addEventListener('click', ()=> step(-1));

// 啟動唯一的主時鐘 + UI 迴圈
frameLoop();

// metadata 載入時更新基準時長（播放狀態由 isPlaying 主導，不再監聽 video play/pause/ended）
[leftVideo, rightVideo].forEach(v=>{
  v.addEventListener('loadedmetadata', updateBaseDuration);
});

// Keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if (['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.key === ' '){
    e.preventDefault();
    if (isAnyPlaying()) pauseBoth(); else playBoth();
  }
  if (e.key === 'ArrowRight') { e.preventDefault(); step(+1); }
  if (e.key === 'ArrowLeft' ) { e.preventDefault(); step(-1); }
  if (e.key === '1'){ speed.value = '0.5'; speed.dispatchEvent(new Event('change')); }
  if (e.key === '2'){ speed.value = '1';   speed.dispatchEvent(new Event('change')); }
  if (e.key === '3'){ speed.value = '1.5'; speed.dispatchEvent(new Event('change')); }
  if (e.key === '4'){ speed.value = '2';   speed.dispatchEvent(new Event('change')); }
  // 縮放快捷鍵
  if (e.key === '=' || e.key === '+'){ e.preventDefault(); zoomIn(); }
  if (e.key === '-'){ e.preventDefault(); zoomOut(); }
  if (e.key === '0'){ e.preventDefault(); resetZoom(); }
  // 重置位置快捷鍵
  if (e.key === 'r' || e.key === 'R'){ e.preventDefault(); resetPosition(); }
  // 切換視圖模式
  if (e.key === 'v' || e.key === 'V'){ e.preventDefault(); toggleViewMode(); }
  // 靜音
  if (e.key === 'm' || e.key === 'M'){ e.preventDefault(); toggleMute(); }
  // 全螢幕
  if (e.key === 'f' || e.key === 'F'){ e.preventDefault(); toggleFullscreen(); }
  // 截圖
  if (e.key === 's' || e.key === 'S'){ e.preventDefault(); takeSnapshot(); }
  // 對調
  if (e.key === 'x' || e.key === 'X'){ e.preventDefault(); swapSides(); }
  // 色彩校正（全範圍）切換
  if (e.key === 'c' || e.key === 'C'){ e.preventDefault(); cycleColorCorrect(); }
  // A-B 循環
  if (e.key === 'a' || e.key === 'A'){ e.preventDefault(); setAPoint(); }
  if (e.key === 'b' || e.key === 'B'){ e.preventDefault(); setBPoint(); }
  if (e.key === 'l' || e.key === 'L'){ e.preventDefault(); toggleLoop(); }
});

// 初始狀態：停用控制直到載入兩支
updateUIEnabled();
updatePlayPauseButton(); // 初始化按鈕狀態
applyColorCorrection();  // 初始化色彩校正按鈕/濾鏡狀態

// 初始化拖拉調整器
initResizer();

// 初始化縮放功能
initZoomFeature();

// 初始化拖移功能
initDragFeature();

// 初始化比較模式滑桿
initCompareSlider();

// 監聽視窗大小變化
window.addEventListener('resize', () => {
  // 延遲執行以避免頻繁觸發
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    checkAndAdjustVideoSize();
  }, 300);
});

// 組出某一側的媒體詳細資訊列（檔名/大小/容器/時長/解析度/編碼/FPS/聲音）
function debugMediaLine(side) {
  const info = side === 'left' ? leftMediaInfo : rightMediaInfo;
  const v = side === 'left' ? leftVideo : rightVideo;
  const img = side === 'left' ? leftImage : rightImage;
  const sideName = t(side === 'left' ? 'side.left' : 'side.right');
  if (!info) return `${sideName}: ${t('debug.notLoaded')}`;

  if (info.kind === 'image') {
    const res = img.naturalWidth ? `${img.naturalWidth}×${img.naturalHeight}` : '—';
    return t('debug.imageLine', {
      side: sideName, name: info.name, size: info.sizeMB, res,
      type: info.mime || t('debug.unknown'),
    });
  }

  const dur = Number.isFinite(v.duration) ? formatTime(v.duration) : '—';
  const res = v.videoWidth ? `${v.videoWidth}×${v.videoHeight}` : '—';
  const m = info.mp4;
  const codec = (m && m.video && m.video.codec) ? m.video.codec : t('debug.unknown');
  const sideFps = side === 'left' ? leftFps : rightFps;
  let audio;
  if (m) {
    audio = m.audio
      ? `${m.audio.codec || '?'} ${m.audio.channels || '?'}ch ${m.audio.sampleRate || '?'}Hz`
      : t('debug.audio.none');
  } else {
    // 非 MP4/MOV 容器：用瀏覽器 API 粗略判斷有無聲音
    const hasAudio = (v.audioTracks && v.audioTracks.length > 0)
      || (v.webkitAudioDecodedByteCount > 0) || v.mozHasAudio === true;
    audio = hasAudio ? t('debug.audio.yes') : t('debug.audio.unknown');
  }
  return t('debug.mediaLine', {
    side: sideName, name: info.name, size: info.sizeMB,
    container: info.container || '—', duration: dur, res, codec,
    fps: sideFps != null ? sideFps : t('debug.unknown'), audio,
  });
}

function updateDebugInfo() {
  const debugText = document.getElementById('debugText');

  debugText.innerHTML = t('debug.body', {
    leftLine: debugMediaLine('left'),
    rightLine: debugMediaLine('right'),
    offset: syncOffset.toFixed(3),
    baseDur: formatTime(baseDuration),
    detectedFPS,
    fpsSetting: fps.value,
    playState: isPlaying ? t('debug.playing') : t('debug.paused'),
    master: masterTime.toFixed(4),
    frame: frameOf(masterTime),
    totalFrames: totalFramesCount(),
    leftCur: Number.isFinite(leftVideo.duration) ? leftVideo.currentTime.toFixed(4) : '—',
    rightCur: Number.isFinite(rightVideo.duration) ? rightVideo.currentTime.toFixed(4) : '—',
    formats: getSupportedFormats(),
    leftReady: leftVideo.readyState,
    rightReady: rightVideo.readyState,
  });
}

// 只在除錯面板展開時才更新
setInterval(() => {
  if (!debugInfoEl.classList.contains('collapsed')) {
    updateDebugInfo();
  }
}, 1000);

// 初始化比較模式檔名標籤
updateCompareLabels();

// 載入使用者設定
loadSettings();

// 同步所有動態文字（含語言切換按鈕本身的文字）
refreshDynamicTexts();

// 全域錯誤處理
window.addEventListener('error', (e) => {
  console.error('Global error:', e);
});
