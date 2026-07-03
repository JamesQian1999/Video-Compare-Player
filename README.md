# Side-by-Side Media Sync Player

A frame-accurate, side-by-side video/image comparison player that runs entirely in the browser — no server, no upload, no dependencies. Files never leave your machine.

> Chinese version: [README.zh.md](README.zh.md)

## Features

- **Frame-perfect sync** — A frame-index master clock keeps both videos locked to the same position during playback, pause, frame stepping, and scrubbing. An optional per-millisecond offset is available for the right side. No drift.
- **Videos & images** — Supports MP4, MOV, AVI, MKV, WebM and JPG, PNG, GIF, WebP, BMP.
- **4 view modes** — Side by side, left only, right only, and overlay comparison with a draggable split line (Shift+click to jump instantly).
- **Frame stepping** — FPS is parsed directly from the MP4/MOV container (mdhd/stts atoms), including fractional rates such as 29.97 and 23.976. Manual override is also supported.
- **A-B loop** — Mark in/out points and loop a segment on both videos simultaneously.
- **Variable speed** — 0.25× to 2× playback speed.
- **Zoom & pan** — Scroll-wheel zoom centered on the cursor; drag to pan when zoomed in. Both sides stay in sync.
- **Snapshot** — Export three PNGs in one click: side-by-side comparison, left frame, and right frame. Each image is labeled with the filename and timestamp.
- **Color correction** — Detects and corrects full-range and BT.709 gamma shift (the washed-out look from macOS/QuickTime). Applied per-pixel in snapshots.
- **Bilingual UI** — Switch between English and Chinese at any time via the 🌐 button.
- **Persistent settings** — Speed, volume, offset, view mode, color mode, and language are saved to localStorage.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` / `→` | Step −1 / +1 frame |
| `1` `2` `3` `4` | Speed 0.5× / 1× / 1.5× / 2× |
| `+` / `-` / `0` | Zoom in / out / reset |
| `R` | Reset zoom and position |
| `V` | Cycle view mode |
| `M` | Mute |
| `F` | Fullscreen |
| `S` | Snapshot |
| `X` | Swap left and right |
| `C` | Toggle color correction |
| `A` / `B` / `L` | Set A point / Set B point / Toggle A-B loop |

## Usage

Open `index.html` directly in a browser — no build step or installation required.

To serve locally:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Project Structure

```
├── index.html      # UI markup
├── css/style.css   # Styles
└── js/
    ├── dom.js      # DOM element references
    ├── state.js    # Shared state and constants
    ├── i18n.js     # English/Chinese strings and language switching
    ├── utils.js    # Time formatting, notifications, helpers
    ├── probe.js    # MP4 container parser (FPS, full-range flag, colr atom)
    ├── color.js    # Color correction (affine transform, BT.709 gamma LUT)
    ├── engine.js   # Frame-index master clock sync engine
    ├── media.js    # File loading, clearing, and side swapping
    ├── view.js     # View modes, comparison slider, zoom and pan
    ├── snapshot.js # Snapshot export
    ├── settings.js # localStorage persistence
    └── main.js     # Event binding and initialization
```

## Notes

- Playback is seek-driven, so audio is intentionally disabled. This tool is designed for frame-accurate visual comparison.
- Color correction coefficients were measured on macOS/Safari. See `js/color.js` for details.
