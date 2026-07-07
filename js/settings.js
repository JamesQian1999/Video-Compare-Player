// ===== 主題（深色 / 淺色 / 跟隨系統）=====

// 依 themeMode 套用主題：'system' 移除 data-theme（交給 CSS 的 prefers-color-scheme），
// 'light'/'dark' 則在 <html> 上明確鎖定。
function applyTheme() {
  const root = document.documentElement;
  if (themeMode === 'light' || themeMode === 'dark') {
    root.setAttribute('data-theme', themeMode);
  } else {
    root.removeAttribute('data-theme');
  }
}

// 更新主題按鈕文字（依目前模式與語言）
function updateThemeButton() {
  if (!themeBtn) return;
  themeBtn.textContent = t('btn.theme.' + themeMode);
  themeBtn.title = t('btn.theme.title');
}

// 循環切換：系統 → 淺色 → 深色 → 系統
function cycleTheme() {
  themeMode = themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
  applyTheme();
  updateThemeButton();
  saveSettings();
}

// ===== localStorage 設定持久化（sbsPlayerSettings_v1）=====

function saveSettings() {
  try {
    const s = {
      offsetMs: Number(offsetInput.value) || 0,
      speed: speed.value,
      volume: Number(volume.value),
      lastVolume: lastVolume,
      leftAudioVol,
      rightAudioVol,
      leftAudioMuted,
      rightAudioMuted,
      fps: Number(fps.value),
      viewMode,
      highlightThr: hlThreshold,
      muted: isMuted,
      colorCorrectMode,
      lang: currentLang,
      theme: themeMode,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.offsetMs !== undefined) { offsetInput.value = s.offsetMs; syncOffset = s.offsetMs / 1000; }
    if (s.speed) speed.value = s.speed;
    if (s.volume !== undefined) volume.value = s.volume;
    if (s.lastVolume !== undefined && s.lastVolume > 0) lastVolume = s.lastVolume;
    // 左右分軌音量／靜音
    if (s.leftAudioVol !== undefined) { leftAudioVol = s.leftAudioVol; leftVolume.value = s.leftAudioVol; }
    if (s.rightAudioVol !== undefined) { rightAudioVol = s.rightAudioVol; rightVolume.value = s.rightAudioVol; }
    if (s.leftAudioMuted) setSideMuted('left', true, true);
    if (s.rightAudioMuted) setSideMuted('right', true, true);
    if (s.fps) fps.value = s.fps;
    if (s.highlightThr !== undefined) setHlThreshold(s.highlightThr);
    if (s.viewMode) setViewMode(s.viewMode);
    if (s.muted) setMuted(true);
    if (s.colorCorrectMode) colorCorrectMode = s.colorCorrectMode === 'on' ? 'fullrange' : s.colorCorrectMode; // 舊設定 'on' ≡ 強制全範圍
    applyColorCorrection();
    if (s.theme === 'light' || s.theme === 'dark' || s.theme === 'system') themeMode = s.theme;
  } catch {}
}
