// ===== localStorage 設定持久化（sbsPlayerSettings_v1）=====

function saveSettings() {
  try {
    const s = {
      offsetMs: Number(offsetInput.value) || 0,
      speed: speed.value,
      volume: Number(volume.value),
      lastVolume: lastVolume,
      fps: Number(fps.value),
      viewMode,
      muted: isMuted,
      colorCorrectMode,
      lang: currentLang,
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
    if (s.fps) fps.value = s.fps;
    if (s.viewMode) setViewMode(s.viewMode);
    if (s.muted) setMuted(true);
    if (s.colorCorrectMode) colorCorrectMode = s.colorCorrectMode === 'on' ? 'fullrange' : s.colorCorrectMode; // 舊設定 'on' ≡ 強制全範圍
    applyColorCorrection();
  } catch {}
}
