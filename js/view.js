// ===== 檢視模式 / 比較滑桿 / 欄寬 resizer / 縮放與拖移 / 全螢幕 / 靜音 =====

function updateUIEnabled(){
  // 檢查是否至少有一個媒體載入（影片或圖片）
  const leftLoaded = Number.isFinite(leftVideo.duration) || (leftImage.src && leftImage.complete);
  const rightLoaded = Number.isFinite(rightVideo.duration) || (rightImage.src && rightImage.complete);
  const ready = leftLoaded || rightLoaded;

  [playPauseBtn, stepFwdBtn, stepBackBtn, resetBtn, seek, speed, volume, fps].forEach(el=>{
    el.disabled = !ready;
    el.style.opacity = ready? 1: .6;
  });

  // 同步偏移只在兩個都載入時啟用
  const syncReady = leftLoaded && rightLoaded;
  applyOffset.disabled = !syncReady;
  applyOffset.style.opacity = syncReady? 1: .6;
  offsetInput.disabled = !syncReady;
  offsetInput.style.opacity = syncReady? 1: .6;
}

// 同步比較模式左下／右下的檔名標籤，與底部檔名列保持一致
function updateCompareLabels() {
  const lHas = leftFilename.classList.contains('has-file');
  const rHas = rightFilename.classList.contains('has-file');
  compareLabelLeft.textContent = lHas ? leftFilename.textContent : t('compare.left');
  compareLabelRight.textContent = rHas ? rightFilename.textContent : t('compare.right');
  compareLabelLeft.title = compareLabelLeft.textContent;
  compareLabelRight.title = compareLabelRight.textContent;
}

// 影片縮放功能（保留向後兼容性）
function updateVideoScale(scale) {
  videoScale = Math.max(minScale, Math.min(maxScale, scale));
  updateVideoTransform();

  // 如果縮放回到1倍，重置位移
  if (videoScale === 1) {
    resetPosition();
  }

  // 更新縮放顯示（如果需要的話）
  console.log(`Video scale: ${(videoScale * 100).toFixed(0)}%`);
}

function updateVideoTransform() {
  // 先縮放，再移動 - 這樣移動距離就是基於縮放後的座標系
  const transform = `scale(${videoScale}) translate(${translateX / videoScale}px, ${translateY / videoScale}px)`;
  leftVideo.style.transform = transform;
  rightVideo.style.transform = transform;
  leftImage.style.transform = transform;
  rightImage.style.transform = transform;
  highlightCanvas.style.transform = transform;
}

function resetPosition() {
  translateX = 0;
  translateY = 0;
  updateVideoTransform();
}

function zoomIn() {
  // 以視圖中心縮放
  zoomAtPoint(videoScale * 1.1, 0, 0, videoScale);
}

function zoomOut() {
  // 以視圖中心縮放
  zoomAtPoint(videoScale / 1.1, 0, 0, videoScale);
}

function resetZoom() {
  updateVideoScale(1);
  resetPosition();
}

// 設置視圖模式
function setViewMode(mode) {
  const prev = viewMode;
  // compare / highlight 都是「單欄覆蓋」模式，共用欄寬保存/還原與縮放重置邏輯
  const isOverlay = (m) => m === 'compare' || m === 'highlight';
  const enteringCompare = isOverlay(mode) && !isOverlay(prev);
  const leavingCompare = isOverlay(prev) && !isOverlay(mode);

  viewMode = mode;

  // 進出覆蓋模式時：保存/還原 resizer 設定的欄寬，並重置縮放與位移避免畫面亂跳；
  // 另外暫時關閉欄寬過渡，避免兩支影片擠在縮短中的單欄裡那種「亂跳」動畫
  if (enteringCompare || leavingCompare) {
    const prevTransition = videoGrid.style.transition;
    videoGrid.style.transition = 'none';
    requestAnimationFrame(() => { videoGrid.style.transition = prevTransition; });
  }

  if (enteringCompare) {
    if (videoGrid.style.gridTemplateColumns) {
      savedGridColumns = videoGrid.style.gridTemplateColumns;
      videoGrid.style.gridTemplateColumns = '';
    }
    // 比較模式需要兩支影片精確對齊，重置縮放與位移
    resetZoom();
    // 重置 compare 分隔線到中央
    videoGrid.style.removeProperty('--compare-pos');
  } else if (leavingCompare) {
    if (savedGridColumns) {
      videoGrid.style.gridTemplateColumns = savedGridColumns;
      savedGridColumns = null;
    }
    resetZoom();
  }

  // 移除所有視圖類別
  videoGrid.classList.remove('single-view-left', 'single-view-right', 'compare-view', 'highlight-view');

  // 重置所有按鈕樣式
  [viewDualBtn, viewLeftBtn, viewRightBtn, viewCompareBtn, viewHighlightBtn].forEach(b => {
    b.classList.remove('primary');
    b.classList.add('ghost');
  });

  // 根據模式設置
  if (mode === 'left') {
    videoGrid.classList.add('single-view-left');
    viewLeftBtn.classList.remove('ghost');
    viewLeftBtn.classList.add('primary');
  } else if (mode === 'right') {
    videoGrid.classList.add('single-view-right');
    viewRightBtn.classList.remove('ghost');
    viewRightBtn.classList.add('primary');
  } else if (mode === 'compare') {
    videoGrid.classList.add('compare-view');
    viewCompareBtn.classList.remove('ghost');
    viewCompareBtn.classList.add('primary');
  } else if (mode === 'highlight') {
    videoGrid.classList.add('highlight-view');
    viewHighlightBtn.classList.remove('ghost');
    viewHighlightBtn.classList.add('primary');
  } else {
    viewMode = 'dual';
    viewDualBtn.classList.remove('ghost');
    viewDualBtn.classList.add('primary');
  }

  // 差異門檻滑桿只在 highlight 模式顯示；進入時立刻重算一次
  highlightGroup.style.display = viewMode === 'highlight' ? '' : 'none';
  if (viewMode === 'highlight' && typeof requestHighlightRender === 'function') requestHighlightRender();

  saveSettings();
}

// 切換視圖模式（用於鍵盤快捷鍵）
function toggleViewMode() {
  // 循環切換：dual -> left -> right -> compare -> highlight -> dual
  const order = ['dual', 'left', 'right', 'compare', 'highlight'];
  const idx = order.indexOf(viewMode);
  setViewMode(order[(idx + 1) % order.length]);
}

// Compare 滑桿拖動：直接拖分隔線本身（命中區 14px 寬）
function initCompareSlider() {
  let draggingCompare = false;

  function setComparePos(clientX) {
    const rect = videoGrid.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    // 留 2% 邊界，避免分隔線卡在最邊緣無法拖回
    pct = Math.max(2, Math.min(98, pct));
    videoGrid.style.setProperty('--compare-pos', pct + '%');
  }

  const onMove = (e) => {
    if (!draggingCompare) return;
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setComparePos(x);
  };
  const onUp = () => {
    if (!draggingCompare) return;
    draggingCompare = false;
    compareDivider.classList.remove('dragging');
    document.body.style.userSelect = '';
  };

  const onDown = (e) => {
    if (!videoGrid.classList.contains('compare-view')) return;
    e.preventDefault();
    e.stopPropagation();
    draggingCompare = true;
    compareDivider.classList.add('dragging');
    document.body.style.userSelect = 'none';
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setComparePos(x);
  };

  compareDivider.addEventListener('mousedown', onDown);
  compareDivider.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);

  // 比較模式下 shift+click 可瞬移分隔線
  videoGrid.addEventListener('click', (e) => {
    if (!videoGrid.classList.contains('compare-view')) return;
    if (e.target === compareDivider || compareDivider.contains(e.target)) return;
    if (!e.shiftKey) return;
    setComparePos(e.clientX);
  });
}

// 以指定點為中心縮放
function zoomAtPoint(newScale, offsetX, offsetY, oldScale) {
  // 限制縮放範圍
  newScale = Math.max(minScale, Math.min(maxScale, newScale));

  if (newScale === oldScale) return; // 如果縮放比例沒變就不處理

  // 計算縮放比例變化
  const scaleRatio = newScale / oldScale;

  // 調整位移以保持指定點在縮放中心
  // 考慮當前的位移，計算滑鼠位置在縮放空間中的實際位置
  const currentPointX = (offsetX - translateX) / oldScale;
  const currentPointY = (offsetY - translateY) / oldScale;

  // 計算新位移，使該點在縮放後保持在同樣的螢幕位置
  const newTranslateX = offsetX - currentPointX * newScale;
  const newTranslateY = offsetY - currentPointY * newScale;

  // 更新位移
  translateX = newTranslateX;
  translateY = newTranslateY;

  // 限制拖移範圍
  const maxTranslateBase = 300;
  const maxTranslate = maxTranslateBase * newScale;
  translateX = Math.max(-maxTranslate, Math.min(maxTranslate, translateX));
  translateY = Math.max(-maxTranslate, Math.min(maxTranslate, translateY));

  // 更新縮放比例
  videoScale = newScale;

  // 應用變換
  updateVideoTransform();

  // 如果縮放回到1倍或以下，重置位移
  if (videoScale <= 1) {
    resetPosition();
  }

  console.log(`Zoom at point: ${(videoScale * 100).toFixed(0)}%, offset: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}), translate: (${translateX.toFixed(1)}, ${translateY.toFixed(1)})`);
}

// 檢查並自動調整影片大小
function checkAndAdjustVideoSize() {
  // 檢查兩個媒體是否都已載入
  const leftLoaded = Number.isFinite(leftVideo.duration) || leftImage.src;
  const rightLoaded = Number.isFinite(rightVideo.duration) || rightImage.src;

  if (!leftLoaded || !rightLoaded) {
    return;
  }

  // 檢查兩個媒體是否都是豎直方向（高度大於寬度）
  let leftIsVertical = false;
  let rightIsVertical = false;

  if (Number.isFinite(leftVideo.duration) && leftVideo.style.display !== 'none') {
    leftIsVertical = leftVideo.videoHeight > leftVideo.videoWidth;
  } else if (leftImage.src && leftImage.style.display !== 'none') {
    leftIsVertical = leftImage.naturalHeight > leftImage.naturalWidth;
  }

  if (Number.isFinite(rightVideo.duration) && rightVideo.style.display !== 'none') {
    rightIsVertical = rightVideo.videoHeight > rightVideo.videoWidth;
  } else if (rightImage.src && rightImage.style.display !== 'none') {
    rightIsVertical = rightImage.naturalHeight > rightImage.naturalWidth;
  }

  if (leftIsVertical && rightIsVertical) {
    // 兩個都是豎直媒體，計算需要的高度
    const windowHeight = window.innerHeight;
    const controlsHeight = 250; // 控制欄位和其他元素的估計高度
    const availableHeight = windowHeight - controlsHeight;

    // 取得媒體容器的當前高度
    const leftSlotHeight = leftSlot.offsetHeight;

    if (leftSlotHeight > availableHeight) {
      // 需要調整高度
      const newHeight = Math.max(300, availableHeight); // 最小300px
      leftSlot.style.height = `${newHeight}px`;
      rightSlot.style.height = `${newHeight}px`;

      console.log(`自動調整豎直媒體高度: ${newHeight}px (視窗高度: ${windowHeight}px)`);

      // 顯示通知
      showAutoResizeNotification();
    }
  }
}

// 重置影片大小
function resetVideoSize() {
  if (videoGrid.classList.contains('compare-view')) {
    // 比較模式：分隔線回到中央，並把影片縮放與位移也重置（影片置中）
    // 不動 grid-template-columns —— compare-view CSS 已經是單欄
    videoGrid.style.removeProperty('--compare-pos');
    resetZoom();
  } else {
    videoGrid.style.gridTemplateColumns = '1fr 1fr';
  }
  // 清掉先前 resizer 暫存的欄寬，避免下次離開比較模式時又被還原
  savedGridColumns = null;
  // 重置影片槽的高度
  leftSlot.style.height = '';
  rightSlot.style.height = '';
  // 重新檢查是否需要調整
  setTimeout(checkAndAdjustVideoSize, 100);
}

// 添加拖拉調整功能
function initResizer() {
  let startX = 0;
  let startLeftWidth = 0;
  let startRightWidth = 0;
  let containerWidth = 0;

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    startX = e.clientX;

    const gridRect = videoGrid.getBoundingClientRect();
    containerWidth = gridRect.width - 6; // 減去新的 gap

    const leftContainer = leftSlot.parentElement; // video-container
    const rightContainer = rightSlot.parentElement; // video-container
    const leftRect = leftContainer.getBoundingClientRect();
    const rightRect = rightContainer.getBoundingClientRect();

    startLeftWidth = leftRect.width;
    startRightWidth = rightRect.width;

    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    e.preventDefault();
    const deltaX = e.clientX - startX;

    // 計算新的寬度比例
    const newLeftWidth = Math.max(200, Math.min(containerWidth - 200, startLeftWidth + deltaX));
    const newRightWidth = containerWidth - newLeftWidth;

    // 轉換為百分比
    const leftPercent = (newLeftWidth / containerWidth) * 100;
    const rightPercent = (newRightWidth / containerWidth) * 100;

    // 更新 grid 模板
    videoGrid.style.gridTemplateColumns = `${leftPercent}% ${rightPercent}%`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizer.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// 添加滾輪縮放功能
function initZoomFeature() {
  let zoomEndTimer = null;
  const allMedia = [leftVideo, rightVideo, leftImage, rightImage, highlightCanvas];

  // 為兩個影片槽（與差異畫布容器）添加滾輪事件
  [leftSlot, rightSlot, highlightContainer].forEach(slot => {
    slot.addEventListener('wheel', (e) => {
      e.preventDefault();

      // 連續滾輪縮放時關閉 transition，避免兩邊不同步
      allMedia.forEach(el => el.classList.add('dragging'));
      clearTimeout(zoomEndTimer);
      zoomEndTimer = setTimeout(() => {
        allMedia.forEach(el => el.classList.remove('dragging'));
      }, 150);

      // 計算滑鼠在容器中的位置
      const rect = slot.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 計算滑鼠位置相對於容器中心的偏移
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const offsetX = mouseX - centerX;
      const offsetY = mouseY - centerY;

      // 記錄縮放前的比例和位移
      const oldScale = videoScale;

      if (e.deltaY < 0) {
        zoomAtPoint(videoScale * 1.1, offsetX, offsetY, oldScale);
      } else {
        zoomAtPoint(videoScale / 1.1, offsetX, offsetY, oldScale);
      }
    }, { passive: false });
  });
}

// 添加拖移功能
function initDragFeature() {
  // 為兩個影片和圖片添加拖移事件
  [leftVideo, rightVideo, leftImage, rightImage, highlightCanvas].forEach(element => {
    element.addEventListener('mousedown', (e) => {
      // 只有在放大狀態下才允許拖移
      if (videoScale <= 1) return;

      e.preventDefault();
      isDragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      // 同時加給左右兩邊，避免另一邊 0.1s transition 造成「延遲」
      [leftVideo, rightVideo, leftImage, rightImage, highlightCanvas].forEach(el => el.classList.add('dragging'));
      document.body.style.userSelect = 'none';
    });
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || videoScale <= 1) return;

    e.preventDefault();
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    if (!dragMoved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
      dragMoved = true;
    }

    translateX += deltaX;
    translateY += deltaY;

    const maxTranslateBase = 200;
    const maxTranslate = maxTranslateBase * videoScale;

    translateX = Math.max(-maxTranslate, Math.min(maxTranslate, translateX));
    translateY = Math.max(-maxTranslate, Math.min(maxTranslate, translateY));

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    updateVideoTransform();
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      // 如果有實際移動，抑制接下來的 click（避免拖完誤觸播放）
      if (dragMoved) suppressNextClick = true;
      dragMoved = false;
      document.body.style.userSelect = '';
      leftVideo.classList.remove('dragging');
      rightVideo.classList.remove('dragging');
      leftImage.classList.remove('dragging');
      rightImage.classList.remove('dragging');
      highlightCanvas.classList.remove('dragging');
    }
  });

  // 行動裝置：放大後單指觸控拖移（與滑鼠拖移相同邏輯）
  [leftVideo, rightVideo, leftImage, rightImage, highlightCanvas].forEach(element => {
    element.addEventListener('touchstart', (e) => {
      if (videoScale <= 1 || e.touches.length !== 1) return;
      isDragging = true;
      dragMoved = false;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      [leftVideo, rightVideo, leftImage, rightImage, highlightCanvas].forEach(el => el.classList.add('dragging'));
    }, { passive: true });
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging || videoScale <= 1 || e.touches.length !== 1) return;
    e.preventDefault(); // 拖移中避免頁面跟著捲動

    const deltaX = e.touches[0].clientX - dragStartX;
    const deltaY = e.touches[0].clientY - dragStartY;
    if (!dragMoved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
      dragMoved = true;
    }

    translateX += deltaX;
    translateY += deltaY;

    const maxTranslateBase = 200;
    const maxTranslate = maxTranslateBase * videoScale;
    translateX = Math.max(-maxTranslate, Math.min(maxTranslate, translateX));
    translateY = Math.max(-maxTranslate, Math.min(maxTranslate, translateY));

    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;

    updateVideoTransform();
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      if (dragMoved) suppressNextClick = true;
      dragMoved = false;
      leftVideo.classList.remove('dragging');
      rightVideo.classList.remove('dragging');
      leftImage.classList.remove('dragging');
      rightImage.classList.remove('dragging');
      highlightCanvas.classList.remove('dragging');
    }
  });
}

// 靜音
function setMuted(muted) {
  isMuted = muted;
  if (muted) {
    // 進入靜音前若音量 > 0 才記下；否則保留先前 lastVolume，避免後續解除靜音時拿到 0
    const cur = Number(volume.value);
    if (cur > 0) lastVolume = cur;
    else if (!(lastVolume > 0)) lastVolume = 1;
    leftVideo.muted = true;
    rightVideo.muted = true;
    muteBtn.innerHTML = '🔇';
    muteBtn.classList.add('active');
  } else {
    // 解除靜音時若音量還是 0，回復到上次有聲的音量
    if (Number(volume.value) === 0 && lastVolume > 0) {
      volume.value = lastVolume;
      leftVideo.volume = lastVolume;
      rightVideo.volume = lastVolume;
    }
    leftVideo.muted = false;
    rightVideo.muted = false;
    muteBtn.innerHTML = '🔊';
    muteBtn.classList.remove('active');
  }
  saveSettings();
}
function toggleMute() { setMuted(!isMuted); }

// 全螢幕
function toggleFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) req.call(root);
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  }
}
