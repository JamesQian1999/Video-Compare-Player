// ===== 媒體載入/清除/對調、FPS 套用、檔名顯示 =====

// 更新檔案名稱顯示
function updateFilename(side, filename) {
  const filenameElement = side === 'left' ? leftFilename : rightFilename;
  if (filename) {
    filenameElement.textContent = filename;
    filenameElement.classList.add('has-file');
  } else {
    filenameElement.textContent = t('file.none');
    filenameElement.classList.remove('has-file');
  }
  updateCompareLabels();
}

// 記下某一側的 FPS，並更新 UI 的 fps 設定（兩側不同時取較小值，逐格才不會跳過）
function applySideFps(side, value) {
  if (side === 'left') leftFps = value;
  else if (side === 'right') rightFps = value;

  let chosen;
  if (leftFps != null && rightFps != null) {
    chosen = Math.min(leftFps, rightFps);
  } else {
    chosen = leftFps ?? rightFps ?? value;
  }
  detectedFPS = chosen;
  fps.value = chosen;

  let msg;
  if (leftFps != null && rightFps != null && leftFps !== rightFps) {
    msg = t('notify.fpsBoth', { left: leftFps, right: rightFps, chosen });
  } else {
    msg = t('notify.fpsAuto', { fps: chosen });
  }
  showFPSDetectionNotification(msg);
  saveSettings();
}

async function loadSide(side, file){
  console.log(`Loading ${side} side with file:`, file);
  console.log('File details:', {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: new Date(file.lastModified).toLocaleString()
  });

  // 立即更新檔案名稱顯示
  updateFilename(side, file.name);

  // 分析檔案格式
  const analysis = await analyzeFile(file);
  console.log('File analysis:', analysis);

  // 檢查檔案大小（超過500MB警告）
  if (file.size > 500 * 1024 * 1024) {
    if (!confirm(t('load.confirmLarge', { size: (file.size / 1024 / 1024).toFixed(1) }))) {
      return;
    }
  }

  // 檢查文件類型
  const validVideoTypes = ['video/', 'application/mp4', 'application/x-mp4'];
  const validVideoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv'];
  const validImageTypes = ['image/'];
  const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

  const isValidVideoType = validVideoTypes.some(type => file.type.startsWith(type));
  const isValidVideoExt = validVideoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  const isValidImageType = validImageTypes.some(type => file.type.startsWith(type));
  const isValidImageExt = validImageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

  const isVideo = isValidVideoType || isValidVideoExt;
  const isImage = isValidImageType || isValidImageExt;

  if (!isVideo && !isImage) {
    alert(t('load.unsupported', {
      name: file.name,
      type: file.type,
      size: (file.size / 1024 / 1024).toFixed(1),
      detected: analysis.detectedType
    }));
    return;
  }

  const v = side==='left'? leftVideo : rightVideo;
  const img = side==='left'? leftImage : rightImage;
  const ph = side==='left'? leftPh : rightPh;

  // 記錄媒體詳細資訊（除錯面板用）；MP4/MOV 另外解析容器內的編碼/聲音資訊
  const mediaInfo = {
    name: file.name,
    sizeMB: (file.size / 1024 / 1024).toFixed(1),
    mime: file.type,
    container: analysis.detectedType,
    kind: isVideo ? 'video' : 'image',
    mp4: null,
  };
  if (side === 'left') leftMediaInfo = mediaInfo; else rightMediaInfo = mediaInfo;
  if (isVideo) {
    probeMp4Info(file).then((mi) => { mediaInfo.mp4 = mi; }).catch(() => {});
  }

  // 顯示加載中狀態（自訂內容期間移除 data-i18n，避免切換語言時被預設文字覆蓋）
  const fileTypeText = isVideo ? t('media.video') : t('media.image');
  ph.removeAttribute('data-i18n');
  ph.innerHTML = t('load.loading', {
    type: fileTypeText,
    name: file.name,
    size: (file.size / 1024 / 1024).toFixed(1),
    detected: analysis.detectedType
  });
  ph.style.display = 'flex';

  try {
    // 先清理之前的URL
    if (v.src && v.src.startsWith('blob:')) {
      URL.revokeObjectURL(v.src);
    }
    if (img.src && img.src.startsWith('blob:')) {
      URL.revokeObjectURL(img.src);
    }

    const url = URL.createObjectURL(file);
    console.log(`Created object URL for ${side}:`, url);

    if (isVideo) {
      // 載入影片
      img.style.display = 'none';
      v.style.display = 'block';
      v.src = url;
      v.removeAttribute('controls');
      v.muted = isMuted; // 套用目前靜音狀態

      // 設定載入超時
      const loadTimeout = setTimeout(() => {
        console.error(`${side} video load timeout`);
        ph.innerHTML = t('load.timeout', { name: file.name });
        ph.style.display = 'flex';
      }, 30000); // 30秒超時

      v.addEventListener('loadedmetadata', ()=>{
        clearTimeout(loadTimeout);
        console.log(`${side} video loaded successfully:`, {
          duration: v.duration,
          videoWidth: v.videoWidth,
          videoHeight: v.videoHeight,
          readyState: v.readyState
        });
        ph.style.display = 'none';
        updateBaseDuration();
        // 自動把音量套用
        v.volume = Number(volume.value);
        v.playbackRate = Number(speed.value);

        // 色偏偵測：H.264 SPS video_full_range_flag + 容器 colr atom。
        //   full-range → 'fullrange' 仿射校正；
        //   limited-range 且 colr trc=1(BT.709) → 'bt709' gamma 校正（macOS 偏淡）。
        Promise.all([probeH264FullRange(file), probeMp4ColorTags(file)]).then(([spsFull, colr]) => {
          const isFull = spsFull === true || (colr && colr.fullRange === true);
          let kind = null;
          if (isFull) kind = 'fullrange';
          else if (colr && colr.trc === 1) kind = 'bt709';
          if (side === 'left') leftColorKind = kind; else rightColorKind = kind;
          applyColorCorrection();
          if (kind) {
            const what = t('color.kind.' + kind);
            console.log(`[${side}] ${what} video detected → 色彩校正 (mode=${colorCorrectMode})`, colr);
            if (colorCorrectMode === 'auto') {
              showTransientNotification('colorFixNotification', t('notify.colorDetected', { what, side: t(side === 'left' ? 'side.left' : 'side.right') }), { background: 'var(--accent)', color: 'white', top: '120px' }, 3500);
            }
          }
        });

        // FPS 偵測：優先從 MP4/MOV 容器解析（與 ffprobe 同來源、精確）；
        // 解析不到時才退回 requestVideoFrameCallback 取樣估算
        probeMP4FrameRate(file).then((res) => {
          if (res && Number.isFinite(res.fps) && res.fps >= 1 && res.fps <= 240) {
            const snapped = snapToCommonFps(res.fps);
            const display = roundFpsForDisplay(snapped);
            console.log(`[${side}] Container FPS: raw=${res.fps.toFixed(6)} (samples=${res.totalSamples}, timescale=${res.timescale}) → ${display}`);
            applySideFps(side, display);
            return;
          }
          // 容器解析失敗 → 退回採樣（每側各跑一次）
          detectVideoFPS(v, (detectedFps) => {
            console.log(`[${side}] Sampled FPS (fallback): ${detectedFps}`);
            applySideFps(side, detectedFps);
          });
        }).catch((err) => {
          console.warn(`[${side}] FPS probe failed:`, err);
        });
      }, { once:true });

      v.addEventListener('error', (e)=>{
        clearTimeout(loadTimeout);
        console.error(`${side} video load error:`, e);
        handleMediaError(v, file, ph, 'video');
      }, { once:true });

    } else if (isImage) {
      // 載入圖片
      v.style.display = 'none';
      img.style.display = 'block';
      img.src = url;

      img.addEventListener('load', ()=>{
        console.log(`${side} image loaded successfully:`, {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
        ph.style.display = 'none';
        updateBaseDuration();
      }, { once:true });

      img.addEventListener('error', (e)=>{
        console.error(`${side} image load error:`, e);
        ph.innerHTML = t('load.imageError', { name: file.name });
        ph.style.display = 'flex';
      }, { once:true });
    }

  } catch (error) {
    console.error('Error creating object URL:', error);
    ph.innerHTML = t('load.readError', { message: error.message, name: file.name });
    ph.style.display = 'flex';
  }
}

// 處理媒體載入錯誤（mediaKind: 'video' | 'image'）
function handleMediaError(mediaElement, file, placeholder, mediaKind) {
  console.error('Media error details:', mediaElement.error);
  console.error('File info:', {
    name: file.name,
    type: file.type,
    size: file.size
  });

  const typeText = t('media.' + mediaKind);
  let errorMsg = t('err.loadFail', { type: typeText });
  let suggestion = t('err.tryOther', { type: typeText });

  if (mediaElement.error) {
    switch(mediaElement.error.code) {
      case mediaElement.error.MEDIA_ERR_ABORTED:
        errorMsg = t('err.aborted');
        suggestion = t('err.abortedSug');
        break;
      case mediaElement.error.MEDIA_ERR_NETWORK:
        errorMsg = t('err.network');
        suggestion = t('err.networkSug');
        break;
      case mediaElement.error.MEDIA_ERR_DECODE:
        errorMsg = t('err.decode');
        suggestion = mediaKind === 'video' ?
          t('err.decodeSugVideo') :
          t('err.decodeSugImage');
        break;
      case mediaElement.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMsg = t('err.notSupported');
        suggestion = mediaKind === 'video' ?
          t('err.notSupportedSugVideo') :
          t('err.notSupportedSugImage');
        break;
    }
  }

  // 提供具體的解決建議
  if (file.size > 100 * 1024 * 1024) {
    suggestion += t('err.compress');
  }

  placeholder.innerHTML = t('err.body', {
    errorMsg,
    name: file.name,
    size: (file.size / 1024 / 1024).toFixed(1),
    type: file.type || t('err.unknownType'),
    suggestion
  });
  placeholder.style.display = 'flex';
}

function clearSide(side){
  const v = side==='left'? leftVideo : rightVideo;
  const img = side==='left'? leftImage : rightImage;
  const ph = side==='left'? leftPh : rightPh;
  const fileInput = side==='left'? leftFile : rightFile;

  v.pause();
  if (v.src && v.src.startsWith('blob:')) URL.revokeObjectURL(v.src);
  v.removeAttribute('src');
  v.load();
  v.style.display = 'block';

  if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  img.removeAttribute('src');
  img.style.display = 'none';

  // 重置文件輸入框
  fileInput.value = '';

  // 清除檔案名稱顯示
  updateFilename(side, null);

  // 恢復預設placeholder內容（並補回 data-i18n，讓語言切換能更新）
  const phKey = side === 'left' ? 'ph.left' : 'ph.right';
  ph.setAttribute('data-i18n', phKey);
  ph.innerHTML = t(phKey);
  ph.style.display = '';

  // 清掉這一側的媒體資訊
  if (side === 'left') leftMediaInfo = null; else if (side === 'right') rightMediaInfo = null;

  // 清掉這一側的 FPS 記錄，並回退到另一側（兩側都清就回 30）
  // 清掉這一側的色偏偵測並移除色彩校正
  if (side === 'left') leftColorKind = null; else if (side === 'right') rightColorKind = null;
  applyColorCorrection();

  if (side === 'left') leftFps = null;
  else if (side === 'right') rightFps = null;
  if (leftFps == null && rightFps == null) {
    detectedFPS = 30;
    fps.value = 30;
    fpsDetectionAttempts = 0;
  } else {
    const remain = leftFps ?? rightFps;
    detectedFPS = remain;
    fps.value = remain;
  }

  updateBaseDuration();
}

// 對調左右
function swapSides() {
  // 交換目前 src、display、檔名顯示
  const lVid = { src: leftVideo.src, display: leftVideo.style.display };
  const rVid = { src: rightVideo.src, display: rightVideo.style.display };
  const lImg = { src: leftImage.src, display: leftImage.style.display };
  const rImg = { src: rightImage.src, display: rightImage.style.display };
  const lName = leftFilename.textContent;
  const rName = rightFilename.textContent;
  const lHasFile = leftFilename.classList.contains('has-file');
  const rHasFile = rightFilename.classList.contains('has-file');
  const wasPlaying = isAnyPlaying();
  const t0 = getCurrentMasterTime();

  pauseBoth();

  leftVideo.src = rVid.src || '';
  leftVideo.style.display = rVid.display;
  rightVideo.src = lVid.src || '';
  rightVideo.style.display = lVid.display;

  leftImage.src = rImg.src || '';
  leftImage.style.display = rImg.display;
  rightImage.src = lImg.src || '';
  rightImage.style.display = lImg.display;

  // 檔名互換
  leftFilename.textContent = rName;
  leftFilename.classList.toggle('has-file', rHasFile);
  rightFilename.textContent = lName;
  rightFilename.classList.toggle('has-file', lHasFile);
  updateCompareLabels();

  // 色偏偵測結果互換 + 重套色彩校正
  const tmpKind = leftColorKind; leftColorKind = rightColorKind; rightColorKind = tmpKind;
  applyColorCorrection();

  // 媒體詳細資訊互換
  const tmpInfo = leftMediaInfo; leftMediaInfo = rightMediaInfo; rightMediaInfo = tmpInfo;

  // placeholder 切換
  leftPh.style.display = (rVid.src || rImg.src) ? 'none' : 'flex';
  rightPh.style.display = (lVid.src || lImg.src) ? 'none' : 'flex';

  // 重新對齊播放位置（回到同一 master 時間）
  const restore = () => {
    masterTime = t0;
    applyFrame();
    if (wasPlaying) playBoth();
  };
  // 等待 metadata 載入後再 seek
  let pending = 0;
  const tryStart = () => { if (pending <= 0) restore(); };
  if (leftVideo.src) { pending++; leftVideo.addEventListener('loadedmetadata', () => { pending--; tryStart(); }, { once: true }); }
  if (rightVideo.src) { pending++; rightVideo.addEventListener('loadedmetadata', () => { pending--; tryStart(); }, { once: true }); }
  if (pending === 0) restore();
}
