// ===== 音訊子系統（專用隱藏 <audio> 元素，被主時鐘帶著跑）=====
//
// 背景：影片顯示走 seek 驅動（見 engine.js 檔頭），被 seek 的 <video> 是暫停態不出聲。
// 因此聲音改由兩個「獨立的隱藏 <audio>」負責：與影片共用同一個 blob URL，但由主時鐘
// (masterTime) 帶著原生播放。原生播放 ⇒ 有聲音、倍速自動保留音高（preservesPitch）。
//
// 同步策略：
// - 起播/手動定位時「硬對齊」currentTime = masterTime（右側再加 syncOffset）。
// - 連續播放中不每格重設（會爆音），改在主迴圈做「漂移校正」：偏差 > DRIFT 才拉回。
// 混音：每側各自 volume/mute，再乘上總音量/總靜音 ⇒ 可分開調整、同時輸出＝混音。

const AUDIO_DRIFT = 0.06; // 秒；播放中音訊與 masterTime 偏差超過此值才硬拉回（避免爆音）

// 兩個隱藏音訊元素（不顯示、不進版面）
const leftAudio = document.createElement('audio');
const rightAudio = document.createElement('audio');
for (const a of [leftAudio, rightAudio]) {
  a.preload = 'auto';
  a.style.display = 'none';
  // 倍速時保留音高（避免花栗鼠音）；各家前綴都設一次
  a.preservesPitch = true;
  a.mozPreservesPitch = true;
  a.webkitPreservesPitch = true;
  document.body.appendChild(a);
}
// 這一側是否有可播放的音訊來源（影片才有；圖片/未載入為 false）
let leftHasAudio = false;
let rightHasAudio = false;

function audioElOf(side) { return side === 'left' ? leftAudio : rightAudio; }
function clamp01(x) { x = Number(x); return x > 1 ? 1 : x < 0 ? 0 : (x || 0); }

// 這一側音訊在 master 時間軸上的目標時間（右側加同步偏移）
function audioTargetTime(side) {
  return side === 'left' ? masterTime : masterTime + syncOffset;
}
function clampToDur(a, t) {
  t = Math.max(0, t);
  if (Number.isFinite(a.duration)) t = Math.min(t, a.duration);
  return t;
}

// ---- 來源管理（與影片共用同一 blob URL；本模組不負責 revoke，交給 media.js）----
function setAudioSource(side, url) {
  const a = audioElOf(side);
  if (!url) { clearAudioSource(side); return; }
  a.src = url;
  a.load();
  if (side === 'left') leftHasAudio = true; else rightHasAudio = true;
  applyAudioGains();
}
function clearAudioSource(side) {
  const a = audioElOf(side);
  a.pause();
  a.removeAttribute('src');
  a.load();
  if (side === 'left') leftHasAudio = false; else rightHasAudio = false;
}
// 對調左右：連同音訊來源一起換（swapSides 呼叫）
function swapAudio() {
  const lsrc = leftHasAudio ? leftAudio.src : null;
  const rsrc = rightHasAudio ? rightAudio.src : null;
  if (rsrc) setAudioSource('left', rsrc); else clearAudioSource('left');
  if (lsrc) setAudioSource('right', lsrc); else clearAudioSource('right');
}

// ---- 播放生命週期（由 engine.js 的 playBoth/pauseBoth/applyFrame/frameLoop 呼叫）----
function audioApplyRate() {
  const r = speedVal();
  for (const a of [leftAudio, rightAudio]) {
    a.playbackRate = r;
    a.preservesPitch = true;
    a.mozPreservesPitch = true;
    a.webkitPreservesPitch = true;
  }
}
// 起播：對齊到 master 時間後原生播放（各側獨立）
function audioPlay() {
  audioApplyRate();
  playOne('left');
  playOne('right');
}
function playOne(side) {
  const has = side === 'left' ? leftHasAudio : rightHasAudio;
  if (!has) return;
  const a = audioElOf(side);
  try { a.currentTime = clampToDur(a, audioTargetTime(side)); } catch {}
  const p = a.play();
  if (p && p.catch) p.catch(() => {}); // 忽略自動播放政策等被拒的情況
}
function audioPause() {
  leftAudio.pause();
  rightAudio.pause();
}
// 手動定位（暫停/逐格/seek/offset/loop 回捲）：硬對齊 currentTime
function audioSeekManual() {
  seekOne('left');
  seekOne('right');
}
function seekOne(side) {
  const has = side === 'left' ? leftHasAudio : rightHasAudio;
  if (!has) return;
  const a = audioElOf(side);
  try { a.currentTime = clampToDur(a, audioTargetTime(side)); } catch {}
}
// 連續播放中的漂移校正：偏差過大才拉回，平常讓它自然播放
function audioTick() {
  driftOne('left');
  driftOne('right');
}
function driftOne(side) {
  const has = side === 'left' ? leftHasAudio : rightHasAudio;
  if (!has) return;
  const a = audioElOf(side);
  if (a.paused || !Number.isFinite(a.duration)) return;
  const target = clampToDur(a, audioTargetTime(side));
  if (Math.abs(a.currentTime - target) > AUDIO_DRIFT) {
    try { a.currentTime = target; } catch {}
  }
}

// ---- 混音／音量（左右可分開調整；各側 volume × 總音量、任一靜音即靜音）----
function applyAudioGains() {
  const mv = clamp01(volume.value);
  leftAudio.volume  = clamp01(mv * leftAudioVol);
  rightAudio.volume = clamp01(mv * rightAudioVol);
  leftAudio.muted  = isMuted || leftAudioMuted;
  rightAudio.muted = isMuted || rightAudioMuted;
}

// 單側音量（滑桿 input）
function setSideVolume(side, v) {
  v = clamp01(v);
  if (side === 'left') leftAudioVol = v; else rightAudioVol = v;
  // 拉動音量視為取消該側靜音
  if (v > 0) setSideMuted(side, false, true);
  applyAudioGains();
  saveSettings();
}
// 單側靜音（skipSave：由 setSideVolume 內部呼叫時避免重複存檔）
function setSideMuted(side, muted, skipSave) {
  if (side === 'left') leftAudioMuted = muted; else rightAudioMuted = muted;
  const btn = side === 'left' ? leftMuteBtn : rightMuteBtn;
  if (btn) {
    btn.innerHTML = muted ? '🔇' : '🔊';
    btn.classList.toggle('active', muted);
  }
  applyAudioGains();
  if (!skipSave) saveSettings();
}
function toggleSideMuted(side) {
  const cur = side === 'left' ? leftAudioMuted : rightAudioMuted;
  setSideMuted(side, !cur);
}
