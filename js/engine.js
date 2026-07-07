// ===== 影格索引主時鐘引擎 (frame-index master clock) =====
// 唯一真相為 masterTime（master/左 時間軸秒數）。任何時刻（播放/暫停/逐格/seek）
// 兩支影片都被定位到「同一 master 時間」(右邊再加 syncOffset)。
// 同源同 fps ⇒ 同一時間戳＝同一影格，因此「暫停必定停在同一 frame」由建構保證，
// 不需要任何事後對齊或漂移校正。播放採 seek 驅動並節流成「每格一次」。
//
// 播放推進節拍（v2：兩邊 seek 完成才前進一格，HD 也保證同步）：
// - 舊版用 wall clock 推進 masterTime，每格對兩邊發 seek 但「不等」seek 完成。
//   SD 影片 seek 快，看起來沒事；HD 影片 seek 比一格還久，且兩邊解碼完成時間不同，
//   於是快的一邊一直往前跳、慢的一邊卡住 → 「一邊在動、一邊不動」且逐漸脫拍。
// - 新版改為「以兩邊 seeked 事件為節拍」：發出第 N 格的 seek 後，必須等左右兩支
//   都 seeked 完成，才准前進到第 N+1 格。解碼快 ⇒ 依實時節拍播；解碼慢 ⇒ 自然變慢
//   （不用 real time），但任何時刻兩邊必為同一格，永不脫拍。
//
// 已知取捨：
// - 播放時「無音訊」（seek 驅動不播聲音）；volume/mute UI 保留僅為與原版對等。
// - HD/高 fps 影片解碼較慢時，播放會慢於實時（以換取兩邊嚴格同步）。

// ===== 影格索引主時鐘引擎：核心函式 =====
function fpsVal(){ return Math.max(1, Number(fps.value) || detectedFPS || 30); }
function speedVal(){ const r = Number(speed.value); return (r > 0) ? r : 1; }
function totalFramesCount(){ const d = baseDuration || 0; return Math.max(0, Math.floor(d * fpsVal())); }
function maxFrameIndex(){ return Math.max(0, totalFramesCount() - 1); }
function frameOf(t){ return Math.floor(t * fpsVal() + 1e-6); }
function frameCenterTime(n){ return (n + 0.5) / fpsVal(); } // 影格中央，落點穩定不卡格邊界
function reanchor(){
  playAnchorWall = performance.now(); playAnchorTime = masterTime; displayedFrame = frameOf(masterTime);
  nextFrameWall = performance.now();          // 立刻可推進下一格
  seekPending = waitingLeft = waitingRight = false; // 丟棄舊 seek 的等待狀態
}

// 只做「把兩支影片定位到給定時間」這件事（右邊加 syncOffset）；圖片側略過
function seekBoth(t){
  if (Number.isFinite(leftVideo.duration))  leftVideo.currentTime  = Math.max(0, Math.min(t, leftVideo.duration));
  if (Number.isFinite(rightVideo.duration)) rightVideo.currentTime = Math.max(0, Math.min(t + syncOffset, rightVideo.duration));
}

// ===== 播放推進：以「兩邊 seek 完成」為節拍（HD 也保證同步）=====
let seekPending = false;       // 目前是否有一組播放 seek 還沒被兩邊完成
let waitingLeft = false;       // 是否還在等左邊 seeked
let waitingRight = false;      // 是否還在等右邊 seeked
let seekStartWall = 0;         // 這組 seek 發出的時間（看門狗逾時用）
let nextFrameWall = 0;         // 下一格最早可推進的時間（實時節拍；解碼較慢時自然被超過）
const SEEK_WATCHDOG_MS = 3000; // seeked 遲遲不來（同格夾住/解碼異常）就放行，避免卡死

// 兩支影片各自 seeked 完成時清掉對應的等待旗標；兩邊都好了才算整組完成
leftVideo.addEventListener('seeked',  () => { waitingLeft  = false; if (!waitingRight) seekPending = false; });
rightVideo.addEventListener('seeked', () => { waitingRight = false; if (!waitingLeft)  seekPending = false; });

// 對單支發出 seek；回傳「是否需要等它的 seeked」（有實際位移＝會發 seeked；圖片/未載入＝不等）
function armSeek(video, target){
  if (!Number.isFinite(video.duration)) return false;
  target = Math.max(0, Math.min(target, video.duration));
  const prev = video.currentTime;
  video.currentTime = target;
  return Math.abs(prev - target) > 1e-4; // 位移夠大才會觸發 seeked，否則不要等它
}

// 播放專用：發出一組 seek，並記錄「要等左右哪幾邊」，兩邊都 seeked 才准前進
function beginSeekBoth(t){
  waitingLeft  = armSeek(leftVideo, t);
  waitingRight = armSeek(rightVideo, t + syncOffset);
  seekPending  = waitingLeft || waitingRight;
  seekStartWall = performance.now();
}

// 手動定位（暫停/逐格/seek bar/reset/offset/swap/loop）：
// 先把 masterTime 吸附到最近的影格中央，再把兩支定位到「同一 master 時間」。
// 兩側拿到同一時間 ⇒ 同源同 fps 必為同一影格，暫停即對齊、無需事後補償。
function applyFrame(){
  const d = baseDuration || 0;
  if (d > 0) masterTime = Math.max(0, Math.min(masterTime, d));
  const n = Math.max(0, Math.min(maxFrameIndex(), frameOf(masterTime)));
  masterTime = frameCenterTime(n);
  displayedFrame = n;
  seekBoth(masterTime);
  audioSeekManual(); // 音訊：手動定位時硬對齊到 master 時間（含 syncOffset）
  updateTimeUI();
}

function playBoth(){
  const anyLoaded = Number.isFinite(leftVideo.duration) || Number.isFinite(rightVideo.duration);
  if (!anyLoaded) return;
  // 已到尾端就從頭播
  if ((baseDuration || 0) > 0 && masterTime >= baseDuration - 1e-3) masterTime = 0;
  isPlaying = true;
  reanchor();
  audioPlay(); // 音訊：對齊到 master 時間後原生播放（有聲音）
  updatePlayPauseButton();
}
function pauseBoth(){
  isPlaying = false;
  audioPause(); // 音訊：先停，再由 applyFrame 對齊到定格位置
  // 吸附到目前影格中央並定位兩邊，確保停在同一 frame
  applyFrame();
  updatePlayPauseButton();
}

// 主時鐘 + UI 迴圈（合併舊 tick 與播放推進，全程只有這一個 rAF）
function frameLoop(){
  if (isPlaying) {
    const now = performance.now();
    if (seekPending) {
      // 等左右兩邊都把「這一格」解出來才前進；解碼慢就慢，但絕不脫拍。
      // 看門狗：seeked 遲遲不來（同格夾住/解碼異常）超過門檻就放行，避免整個卡死。
      if (now - seekStartWall > SEEK_WATCHDOG_MS) { seekPending = waitingLeft = waitingRight = false; }
    } else if (now >= nextFrameWall) {
      // 兩邊都就緒，且已到（實時）節拍點 → 前進一格
      const next = displayedFrame + 1;
      if (next > maxFrameIndex()) {
        // 到尾端：定格於最後一格並暫停
        masterTime = baseDuration || 0;
        pauseBoth();
      } else {
        displayedFrame = next;
        masterTime = frameCenterTime(next);
        beginSeekBoth(masterTime); // 對兩邊發 seek，並開始等兩邊 seeked
        // 實時節拍：下一格最早可推進時間。解碼慢於此 ⇒ 被自然超過 ⇒ 慢放；快於此 ⇒ 等到點才播。
        nextFrameWall = now + 1000 / (fpsVal() * speedVal());
        audioTick();               // 音訊：連續播放中做漂移校正（偏差過大才拉回，避免爆音）
        maybeLoopAB(masterTime);
      }
    }
    updateTimeUI();
  } else {
    updateTimeUI();
  }
  updateBuffered();
  requestAnimationFrame(frameLoop);
}

// Step frames — 逐格前進/後退，精確落在同一影格
function step(delta){
  isPlaying = false; // 逐格必為暫停態
  const n = Math.max(0, Math.min(maxFrameIndex(), frameOf(masterTime) + delta));
  masterTime = frameCenterTime(n);
  applyFrame();
  updatePlayPauseButton();
}

// 更新時間軸與時間標籤（時間一律由 masterTime 導出，不再讀 video.currentTime）
function updateTimeUI(){
  const d = baseDuration || Math.max(leftVideo.duration||0, rightVideo.duration||0) || 0;
  if (d > 0 && !seekDragging) { seek.value = Math.max(0, Math.min(1, masterTime / d)); }
  cur.textContent = formatTime(masterTime);

  // 影格編號顯示
  const f = fpsVal();
  if (d > 0) {
    const tf = Math.floor(d * f);
    const cf = Math.max(0, Math.min(tf > 0 ? tf - 1 : 0, Math.floor(masterTime * f)));
    frameCounter.textContent = t('time.frame', { cur: cf, total: tf });
  } else {
    frameCounter.textContent = '';
  }
}

function updateBaseDuration(){
  const ld = Number.isFinite(leftVideo.duration) ? leftVideo.duration : Infinity;
  const rd = Number.isFinite(rightVideo.duration) ? rightVideo.duration : Infinity;

  // 如果兩個都有，取較短的；如果只有一個，用那個
  if (ld !== Infinity && rd !== Infinity) {
    baseDuration = Math.min(ld, rd);
  } else if (ld !== Infinity) {
    baseDuration = ld;
  } else if (rd !== Infinity) {
    baseDuration = rd;
  } else {
    baseDuration = 0;
  }

  dur.textContent = formatTime(baseDuration);
  updateUIEnabled();
  updateABMarkers();

  // 載入後（未播放時）把兩支定位到同一 master 時間，確保初始顯示同格
  if (!isPlaying) applyFrame();

  // 檢查是否需要自動調整影片大小
  checkAndAdjustVideoSize();
}

// 更新播放/暫停按鈕狀態（由主時鐘 isPlaying 決定，非 video.paused）
function updatePlayPauseButton() {
  if (isPlaying) {
    playPauseBtn.innerHTML = t('btn.pause');
    playPauseBtn.classList.remove('primary');
    playPauseBtn.classList.add('ghost');
  } else {
    playPauseBtn.innerHTML = t('btn.play');
    playPauseBtn.classList.remove('ghost');
    playPauseBtn.classList.add('primary');
  }
}

// 取得指定側目前顯示的媒體元素（影片或圖片）
function activeMediaOf(side) {
  const v = side === 'left' ? leftVideo : rightVideo;
  const img = side === 'left' ? leftImage : rightImage;
  if (v.style.display !== 'none' && Number.isFinite(v.duration)) return { kind: 'video', el: v };
  if (img.style.display !== 'none' && img.src && img.complete) return { kind: 'image', el: img };
  return null;
}

function isAnyPlaying() {
  return isPlaying; // 播放狀態由主時鐘決定
}

// 取目前 master 時間（唯一真相）
function getCurrentMasterTime() {
  return masterTime;
}

// A-B 循環
function setAPoint() {
  aPoint = getCurrentMasterTime();
  if (bPoint !== null && aPoint >= bPoint) bPoint = null;
  updateABMarkers();
}
function setBPoint() {
  bPoint = getCurrentMasterTime();
  if (aPoint !== null && bPoint <= aPoint) aPoint = null;
  updateABMarkers();
}
function clearAB() {
  aPoint = null; bPoint = null; loopEnabled = false;
  loopBtn.classList.remove('active');
  updateABMarkers();
}
function toggleLoop() {
  loopEnabled = !loopEnabled;
  loopBtn.classList.toggle('active', loopEnabled);
}
function updateABMarkers() {
  const d = baseDuration || Math.max(leftVideo.duration || 0, rightVideo.duration || 0);
  if (aPoint !== null && d > 0) {
    markerA.style.display = '';
    markerA.style.setProperty('--pos', Math.max(0, Math.min(1, aPoint / d)));
  } else {
    markerA.style.display = 'none';
  }
  if (bPoint !== null && d > 0) {
    markerB.style.display = '';
    markerB.style.setProperty('--pos', Math.max(0, Math.min(1, bPoint / d)));
  } else {
    markerB.style.display = 'none';
  }
}
function maybeLoopAB(currentTime) {
  if (!loopEnabled) return;
  const d = baseDuration || Math.max(leftVideo.duration || 0, rightVideo.duration || 0);
  const a = aPoint !== null ? aPoint : 0;
  const b = bPoint !== null ? bPoint : d;
  if (!(b > a)) return;
  // 到 B 前半格就回捲到 A，兩邊仍同格
  if (currentTime >= b - (0.5 / fpsVal())) {
    masterTime = a;
    applyFrame();
    if (isPlaying) reanchor();
  }
}

// 緩衝進度條
function updateBuffered() {
  const v = Number.isFinite(leftVideo.duration) ? leftVideo : (Number.isFinite(rightVideo.duration) ? rightVideo : null);
  if (!v || !v.buffered || v.buffered.length === 0 || !v.duration) {
    seekBuffered.style.setProperty('--buf-start', '0%');
    seekBuffered.style.setProperty('--buf-end', '0%');
    return;
  }
  // 找到包含目前時間的區間，否則用最後一段
  let start = v.buffered.start(0), end = v.buffered.end(0);
  for (let i = 0; i < v.buffered.length; i++) {
    if (v.buffered.start(i) <= v.currentTime && v.currentTime <= v.buffered.end(i)) {
      start = v.buffered.start(i);
      end = v.buffered.end(i);
      break;
    }
    end = v.buffered.end(i);
  }
  const d = baseDuration || v.duration;
  seekBuffered.style.setProperty('--buf-start', `${(start / d) * 100}%`);
  seekBuffered.style.setProperty('--buf-end', `${(end / d) * 100}%`);
}
