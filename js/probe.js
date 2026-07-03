// ===== 媒體檔案解析：MP4 容器 FPS / H.264 full-range / colr atom / 檔頭分析 =====

// 解析 MP4 / MOV 容器，從 mdhd (timescale) 與 stts (sample deltas) 取得精確 FPS
// 與 ffprobe 相同來源，連 29.97/23.976 這種非整數速率都能對到
async function probeMP4FrameRate(file) {
  const u32 = (b, o) => (b[o] * 0x1000000) + (b[o+1] << 16) + (b[o+2] << 8) + b[o+3];
  const u64 = (b, o) => u32(b, o) * 0x100000000 + u32(b, o+4);

  async function readBytes(start, length) {
    if (start < 0 || start + length > file.size) length = Math.max(0, file.size - start);
    if (length <= 0) return new Uint8Array(0);
    return new Uint8Array(await file.slice(start, start + length).arrayBuffer());
  }

  async function readBoxHeader(offset, parentEnd) {
    if (offset + 8 > parentEnd) return null;
    const head = await readBytes(offset, 8);
    if (head.length < 8) return null;
    let size = u32(head, 0);
    const type = String.fromCharCode(head[4], head[5], head[6], head[7]);
    let headerSize = 8;
    if (size === 1) {
      const ext = await readBytes(offset + 8, 8);
      size = u64(ext, 0);
      headerSize = 16;
    } else if (size === 0) {
      size = parentEnd - offset;
    }
    if (size < headerSize) return null;
    return { type, size, dataOffset: offset + headerSize, end: offset + size };
  }

  async function findBox(name, start, end) {
    let off = start;
    while (off + 8 <= end) {
      const h = await readBoxHeader(off, end);
      if (!h || h.end <= off) return null;
      if (h.type === name) return h;
      off = h.end;
    }
    return null;
  }

  // 找頂層 moov
  const moov = await findBox('moov', 0, file.size);
  if (!moov) return null;

  // 走訪所有 trak，找 handler_type === 'vide'
  let off = moov.dataOffset;
  while (off + 8 <= moov.end) {
    const trak = await readBoxHeader(off, moov.end);
    if (!trak || trak.end <= off) break;
    if (trak.type === 'trak') {
      const mdia = await findBox('mdia', trak.dataOffset, trak.end);
      if (mdia) {
        const hdlr = await findBox('hdlr', mdia.dataOffset, mdia.end);
        let isVideo = false;
        if (hdlr) {
          const need = Math.min(16, hdlr.end - hdlr.dataOffset);
          const hdlrData = await readBytes(hdlr.dataOffset, need);
          if (hdlrData.length >= 12) {
            const handlerType = String.fromCharCode(hdlrData[8], hdlrData[9], hdlrData[10], hdlrData[11]);
            isVideo = (handlerType === 'vide');
          }
        }
        if (isVideo) {
          const mdhd = await findBox('mdhd', mdia.dataOffset, mdia.end);
          if (!mdhd) { off = trak.end; continue; }
          const mdhdData = await readBytes(mdhd.dataOffset, mdhd.end - mdhd.dataOffset);
          const version = mdhdData[0];
          const timescale = version === 1 ? u32(mdhdData, 20) : u32(mdhdData, 12);
          if (!timescale) { off = trak.end; continue; }

          const minf = await findBox('minf', mdia.dataOffset, mdia.end);
          if (!minf) { off = trak.end; continue; }
          const stbl = await findBox('stbl', minf.dataOffset, minf.end);
          if (!stbl) { off = trak.end; continue; }
          const stts = await findBox('stts', stbl.dataOffset, stbl.end);
          if (!stts) { off = trak.end; continue; }

          const sttsData = await readBytes(stts.dataOffset, stts.end - stts.dataOffset);
          if (sttsData.length < 8) { off = trak.end; continue; }
          const entryCount = u32(sttsData, 4);

          let totalSamples = 0;
          let totalDelta = 0;
          for (let i = 0; i < entryCount; i++) {
            const base = 8 + i * 8;
            if (base + 8 > sttsData.length) break;
            const sampleCount = u32(sttsData, base);
            const sampleDelta = u32(sttsData, base + 4);
            totalSamples += sampleCount;
            totalDelta += sampleCount * sampleDelta;
          }
          if (totalDelta === 0) { off = trak.end; continue; }
          const fps = (totalSamples * timescale) / totalDelta;
          return { fps, timescale, totalSamples, totalDelta };
        }
      }
    }
    off = trak.end;
  }
  return null;
}

// 解析 MP4 內 H.264 SPS 的 video_full_range_flag，判斷是否為全範圍(pc)影片。
// 走訪 moov→trak(vide)→mdia→minf→stbl→stsd→avc1/avc3→avcC→SPS→VUI。
// 回傳 true(全範圍) / false(限制範圍) / null(無法判定，如非 H.264 或解析失敗)。
async function probeH264FullRange(file) {
  try {
    const u32 = (b, o) => (b[o] * 0x1000000) + (b[o+1] << 16) + (b[o+2] << 8) + b[o+3];
    const u64 = (b, o) => u32(b, o) * 0x100000000 + u32(b, o+4);
    async function readBytes(start, length) {
      if (start < 0 || start + length > file.size) length = Math.max(0, file.size - start);
      if (length <= 0) return new Uint8Array(0);
      return new Uint8Array(await file.slice(start, start + length).arrayBuffer());
    }
    async function readBoxHeader(offset, parentEnd) {
      if (offset + 8 > parentEnd) return null;
      const head = await readBytes(offset, 8);
      if (head.length < 8) return null;
      let size = u32(head, 0);
      const type = String.fromCharCode(head[4], head[5], head[6], head[7]);
      let headerSize = 8;
      if (size === 1) { const ext = await readBytes(offset + 8, 8); size = u64(ext, 0); headerSize = 16; }
      else if (size === 0) { size = parentEnd - offset; }
      if (size < headerSize) return null;
      return { type, size, dataOffset: offset + headerSize, end: offset + size };
    }
    async function findBox(name, start, end) {
      let off = start;
      while (off + 8 <= end) {
        const h = await readBoxHeader(off, end);
        if (!h || h.end <= off) return null;
        if (h.type === name) return h;
        off = h.end;
      }
      return null;
    }
    const moov = await findBox('moov', 0, file.size);
    if (!moov) return null;
    let off = moov.dataOffset;
    while (off + 8 <= moov.end) {
      const trak = await readBoxHeader(off, moov.end);
      if (!trak || trak.end <= off) break;
      if (trak.type === 'trak') {
        const mdia = await findBox('mdia', trak.dataOffset, trak.end);
        if (mdia) {
          const hdlr = await findBox('hdlr', mdia.dataOffset, mdia.end);
          let isVideo = false;
          if (hdlr) {
            const hd = await readBytes(hdlr.dataOffset, Math.min(16, hdlr.end - hdlr.dataOffset));
            if (hd.length >= 12) isVideo = String.fromCharCode(hd[8], hd[9], hd[10], hd[11]) === 'vide';
          }
          if (isVideo) {
            const minf = await findBox('minf', mdia.dataOffset, mdia.end);
            const stbl = minf && await findBox('stbl', minf.dataOffset, minf.end);
            const stsd = stbl && await findBox('stsd', stbl.dataOffset, stbl.end);
            if (!stsd) return null;
            // stsd: 4 bytes version/flags + 4 bytes entry_count，接著是 sample entries
            let seOff = stsd.dataOffset + 8;
            const se = await readBoxHeader(seOff, stsd.end);
            if (!se) return null;
            if (se.type !== 'avc1' && se.type !== 'avc3') return null; // 只支援 H.264 自動偵測
            // VisualSampleEntry 標頭固定 78 bytes，之後才是子 box（avcC…）
            const childStart = se.dataOffset + 78;
            const avcC = await findBox('avcC', childStart, se.end);
            if (!avcC) return null;
            const cfg = await readBytes(avcC.dataOffset, avcC.end - avcC.dataOffset);
            if (cfg.length < 7) return null;
            const numSps = cfg[5] & 0x1f;
            if (numSps < 1) return null;
            const spsLen = (cfg[6] << 8) | cfg[7];
            if (8 + spsLen > cfg.length) return null;
            const sps = cfg.slice(8, 8 + spsLen);
            return parseSpsFullRange(sps);
          }
        }
      }
      off = trak.end;
    }
    return null;
  } catch (e) { console.warn('probeH264FullRange failed:', e); return null; }
}

// 從 H.264 SPS NAL 解析 video_full_range_flag（含去除 emulation prevention、Exp-Golomb）
function parseSpsFullRange(sps) {
  // 去除 03（0x000003 → 0x0000）並跳過 1 byte NAL header
  const rbsp = [];
  for (let i = 1; i < sps.length; i++) {
    if (i >= 3 && sps[i] === 0x03 && sps[i-1] === 0x00 && sps[i-2] === 0x00) continue;
    rbsp.push(sps[i]);
  }
  let bitPos = 0;
  const bit = () => { const b = (rbsp[bitPos >> 3] >> (7 - (bitPos & 7))) & 1; bitPos++; return b; };
  const bits = (n) => { let v = 0; while (n--) v = (v << 1) | bit(); return v >>> 0; };
  const ue = () => { let z = 0; while (bit() === 0 && bitPos < rbsp.length * 8) z++; return z ? ((1 << z) - 1 + bits(z)) : 0; };
  const se = () => { const k = ue(); return (k & 1) ? ((k + 1) >> 1) : -(k >> 1); };

  const profile_idc = bits(8);
  bits(8);            // constraint flags + reserved
  bits(8);            // level_idc
  ue();               // seq_parameter_set_id
  const highProfiles = [100,110,122,244,44,83,86,118,128,138,139,134,135];
  if (highProfiles.includes(profile_idc)) {
    const chroma = ue();
    if (chroma === 3) bit(); // separate_colour_plane_flag
    ue(); ue();              // bit_depth_luma/chroma_minus8
    bit();                   // qpprime_y_zero_transform_bypass_flag
    if (bit()) {             // seq_scaling_matrix_present_flag
      const n = (chroma !== 3) ? 8 : 12;
      for (let i = 0; i < n; i++) {
        if (bit()) {         // seq_scaling_list_present_flag[i]
          let last = 8, next = 8; const size = i < 6 ? 16 : 64;
          for (let j = 0; j < size; j++) {
            if (next !== 0) { const d = se(); next = (last + d + 256) % 256; }
            last = (next === 0) ? last : next;
          }
        }
      }
    }
  }
  ue();                      // log2_max_frame_num_minus4
  const poc = ue();          // pic_order_cnt_type
  if (poc === 0) ue();       // log2_max_pic_order_cnt_lsb_minus4
  else if (poc === 1) {
    bit(); se(); se();       // delta_pic_order_always_zero_flag, offsets
    const num = ue();
    for (let i = 0; i < num; i++) se();
  }
  ue();                      // max_num_ref_frames
  bit();                     // gaps_in_frame_num_value_allowed_flag
  ue();                      // pic_width_in_mbs_minus1
  ue();                      // pic_height_in_map_units_minus1
  const frameMbsOnly = bit();
  if (!frameMbsOnly) bit();  // mb_adaptive_frame_field_flag
  bit();                     // direct_8x8_inference_flag
  if (bit()) { ue(); ue(); ue(); ue(); } // frame_cropping_flag + 4 offsets
  const vui = bit();         // vui_parameters_present_flag
  if (!vui) return null;     // 沒有 VUI 就無法得知，交給手動
  if (bit()) { const idc = bits(8); if (idc === 255) { bits(16); bits(16); } } // aspect_ratio
  if (bit()) bit();          // overscan
  if (bit()) {               // video_signal_type_present_flag
    bits(3);                 // video_format
    return bit() === 1;      // video_full_range_flag ← 目標
  }
  return null;               // 未標示 → 交給手動
}

// 解析 MP4/MOV 容器的 colr atom（stsd 第一個 sample entry 內），取得色彩標記。
// 回傳 { type:'nclx'|'nclc', primaries, trc, matrix, fullRange:true|false|null } 或 null。
// 例：trc=1(BT.709)+fullRange=false ⇒ macOS 會產生 gamma shift（偏淡）→ 需要 'bt709' 校正。
async function probeMp4ColorTags(file) {
  try {
    const u32 = (b, o) => (b[o] * 0x1000000) + (b[o+1] << 16) + (b[o+2] << 8) + b[o+3];
    const u64 = (b, o) => u32(b, o) * 0x100000000 + u32(b, o+4);
    async function readBytes(start, length) {
      if (start < 0 || start + length > file.size) length = Math.max(0, file.size - start);
      if (length <= 0) return new Uint8Array(0);
      return new Uint8Array(await file.slice(start, start + length).arrayBuffer());
    }
    async function readBoxHeader(offset, parentEnd) {
      if (offset + 8 > parentEnd) return null;
      const head = await readBytes(offset, 8);
      if (head.length < 8) return null;
      let size = u32(head, 0);
      const type = String.fromCharCode(head[4], head[5], head[6], head[7]);
      let headerSize = 8;
      if (size === 1) { const ext = await readBytes(offset + 8, 8); size = u64(ext, 0); headerSize = 16; }
      else if (size === 0) { size = parentEnd - offset; }
      if (size < headerSize) return null;
      return { type, size, dataOffset: offset + headerSize, end: offset + size };
    }
    async function findBox(name, start, end) {
      let off = start;
      while (off + 8 <= end) {
        const h = await readBoxHeader(off, end);
        if (!h || h.end <= off) return null;
        if (h.type === name) return h;
        off = h.end;
      }
      return null;
    }
    const moov = await findBox('moov', 0, file.size);
    if (!moov) return null;
    let off = moov.dataOffset;
    while (off + 8 <= moov.end) {
      const trak = await readBoxHeader(off, moov.end);
      if (!trak || trak.end <= off) break;
      if (trak.type === 'trak') {
        const mdia = await findBox('mdia', trak.dataOffset, trak.end);
        if (mdia) {
          const hdlr = await findBox('hdlr', mdia.dataOffset, mdia.end);
          let isVideo = false;
          if (hdlr) {
            const hd = await readBytes(hdlr.dataOffset, Math.min(16, hdlr.end - hdlr.dataOffset));
            if (hd.length >= 12) isVideo = String.fromCharCode(hd[8], hd[9], hd[10], hd[11]) === 'vide';
          }
          if (isVideo) {
            const minf = await findBox('minf', mdia.dataOffset, mdia.end);
            const stbl = minf && await findBox('stbl', minf.dataOffset, minf.end);
            const stsd = stbl && await findBox('stsd', stbl.dataOffset, stbl.end);
            if (!stsd) return null;
            // stsd: 4 bytes version/flags + 4 bytes entry_count，接著第一個 sample entry
            const se = await readBoxHeader(stsd.dataOffset + 8, stsd.end);
            if (!se) return null;
            // VisualSampleEntry 標頭固定 78 bytes，之後是子 box（colr/avcC/pasp…），不限 codec
            const colr = await findBox('colr', se.dataOffset + 78, se.end);
            if (!colr) return null;
            const d = await readBytes(colr.dataOffset, Math.min(11, colr.end - colr.dataOffset));
            if (d.length < 10) return null;
            const ctype = String.fromCharCode(d[0], d[1], d[2], d[3]);
            if (ctype !== 'nclx' && ctype !== 'nclc') return null; // ISO nclx / QuickTime nclc
            const primaries = (d[4] << 8) | d[5];
            const trc = (d[6] << 8) | d[7];
            const matrix = (d[8] << 8) | d[9];
            // nclx 才有 full_range_flag（最高位元）；nclc 沒有 → null（交給 SPS 偵測）
            const fullRange = (ctype === 'nclx' && d.length >= 11) ? ((d[10] & 0x80) !== 0) : null;
            return { type: ctype, primaries, trc, matrix, fullRange };
          }
        }
      }
      off = trak.end;
    }
    return null;
  } catch (e) { console.warn('probeMp4ColorTags failed:', e); return null; }
}

// 解析 MP4/MOV 容器的完整媒體資訊（供除錯面板顯示）：
// 走訪所有 trak，回傳 { video: {codec,width,height,duration}, audio: {codec,channels,sampleRate,duration} }
// 非 MP4/MOV 容器（WebM/AVI…）回傳 null，由呼叫端以 video 元素屬性補顯示。
async function probeMp4Info(file) {
  try {
    const u32 = (b, o) => (b[o] * 0x1000000) + (b[o+1] << 16) + (b[o+2] << 8) + b[o+3];
    const u16 = (b, o) => (b[o] << 8) | b[o+1];
    const u64 = (b, o) => u32(b, o) * 0x100000000 + u32(b, o+4);
    async function readBytes(start, length) {
      if (start < 0 || start + length > file.size) length = Math.max(0, file.size - start);
      if (length <= 0) return new Uint8Array(0);
      return new Uint8Array(await file.slice(start, start + length).arrayBuffer());
    }
    async function readBoxHeader(offset, parentEnd) {
      if (offset + 8 > parentEnd) return null;
      const head = await readBytes(offset, 8);
      if (head.length < 8) return null;
      let size = u32(head, 0);
      const type = String.fromCharCode(head[4], head[5], head[6], head[7]);
      let headerSize = 8;
      if (size === 1) { const ext = await readBytes(offset + 8, 8); size = u64(ext, 0); headerSize = 16; }
      else if (size === 0) { size = parentEnd - offset; }
      if (size < headerSize) return null;
      return { type, size, dataOffset: offset + headerSize, end: offset + size };
    }
    async function findBox(name, start, end) {
      let off = start;
      while (off + 8 <= end) {
        const h = await readBoxHeader(off, end);
        if (!h || h.end <= off) return null;
        if (h.type === name) return h;
        off = h.end;
      }
      return null;
    }
    const moov = await findBox('moov', 0, file.size);
    if (!moov) return null;
    const info = { video: null, audio: null };
    let off = moov.dataOffset;
    while (off + 8 <= moov.end) {
      const trak = await readBoxHeader(off, moov.end);
      if (!trak || trak.end <= off) break;
      if (trak.type === 'trak') {
        const mdia = await findBox('mdia', trak.dataOffset, trak.end);
        if (mdia) {
          // handler type：'vide' / 'soun'
          let handler = null;
          const hdlr = await findBox('hdlr', mdia.dataOffset, mdia.end);
          if (hdlr) {
            const hd = await readBytes(hdlr.dataOffset, Math.min(16, hdlr.end - hdlr.dataOffset));
            if (hd.length >= 12) handler = String.fromCharCode(hd[8], hd[9], hd[10], hd[11]);
          }
          if (handler === 'vide' || handler === 'soun') {
            // mdhd：timescale + duration → 軌道時長（秒）
            let duration = null;
            const mdhd = await findBox('mdhd', mdia.dataOffset, mdia.end);
            if (mdhd) {
              const md = await readBytes(mdhd.dataOffset, Math.min(32, mdhd.end - mdhd.dataOffset));
              if (md.length >= 24) {
                const version = md[0];
                const ts = version === 1 ? u32(md, 20) : u32(md, 12);
                const dur = version === 1 ? u64(md, 24) : u32(md, 16);
                if (ts) duration = dur / ts;
              }
            }
            // stsd 第一個 sample entry：codec 四字碼 + 影/音參數
            const minf = await findBox('minf', mdia.dataOffset, mdia.end);
            const stbl = minf && await findBox('stbl', minf.dataOffset, minf.end);
            const stsd = stbl && await findBox('stsd', stbl.dataOffset, stbl.end);
            if (stsd) {
              const se = await readBoxHeader(stsd.dataOffset + 8, stsd.end);
              if (se) {
                const entry = await readBytes(se.dataOffset, Math.min(36, se.end - se.dataOffset));
                if (handler === 'vide' && !info.video) {
                  // VisualSampleEntry：width/height 位於 entry data 偏移 24/26
                  info.video = {
                    codec: se.type,
                    width: entry.length >= 26 ? u16(entry, 24) : null,
                    height: entry.length >= 28 ? u16(entry, 26) : null,
                    duration,
                  };
                } else if (handler === 'soun' && !info.audio) {
                  // AudioSampleEntry：channelcount 偏移 16、samplerate(16.16) 偏移 24
                  info.audio = {
                    codec: se.type,
                    channels: entry.length >= 18 ? u16(entry, 16) : null,
                    sampleRate: entry.length >= 28 ? u16(entry, 24) : null, // 16.16 定點數的整數部
                    duration,
                  };
                }
              }
            }
          }
        }
      }
      off = trak.end;
    }
    return (info.video || info.audio) ? info : null;
  } catch (e) { console.warn('probeMp4Info failed:', e); return null; }
}

// 檢測影片FPS - 被動式採樣，使用者播放時才會收集，不會自動播放
function detectVideoFPS(video, callback) {
  if (!video || !('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
    callback(30);
    return;
  }
  let frameCount = 0;
  let startTime = null;
  const maxSamples = 12;
  let done = false;

  function frameCallback(now) {
    if (done) return;
    if (startTime === null) startTime = now;
    frameCount++;
    if (frameCount >= maxSamples) {
      const elapsed = (now - startTime) / 1000;
      const detected = frameCount / elapsed;
      // 對齊到常見的標準幀率
      const common = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120];
      let best = Math.round(detected);
      let bestDiff = Math.abs(detected - best);
      for (const c of common) {
        const d = Math.abs(detected - c);
        if (d < bestDiff) { best = Math.round(c); bestDiff = d; }
      }
      if (best >= 10 && best <= 240) {
        done = true;
        console.log(`FPS detected: ${best} (raw: ${detected.toFixed(2)})`);
        callback(best);
        return;
      }
    }
    video.requestVideoFrameCallback(frameCallback);
  }
  video.requestVideoFrameCallback(frameCallback);
  // 10 秒後若沒收集到足夠樣本，使用預設值
  setTimeout(() => {
    if (!done) {
      done = true;
      console.log('FPS detection timed out (user has not played long enough), default 30');
      callback(30);
    }
  }, 10000);
}

// 檔案格式分析工具
function analyzeFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      const bytes = new Uint8Array(arrayBuffer.slice(0, 12));

      // 檢查檔案標頭
      let fileType = 'unknown';
      if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        fileType = 'MP4/MOV container';
      } else if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
        fileType = 'WebM/MKV container';
      } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        fileType = 'AVI container';
      }

      resolve({
        detectedType: fileType,
        headerBytes: Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      });
    };
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

function getSupportedFormats() {
  const video = document.createElement('video');
  const formats = [];

  // 詳細檢測各種格式
  const testFormats = [
    { format: 'MP4 (H.264)', mime: 'video/mp4; codecs="avc1.42E01E"' },
    { format: 'MP4 (H.265)', mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' },
    { format: 'WebM (VP8)', mime: 'video/webm; codecs="vp8"' },
    { format: 'WebM (VP9)', mime: 'video/webm; codecs="vp9"' },
    { format: 'OGG', mime: 'video/ogg' },
    { format: 'MOV', mime: 'video/quicktime' }
  ];

  testFormats.forEach(test => {
    const support = video.canPlayType(test.mime);
    if (support === 'probably') {
      formats.push(`${test.format} ✓`);
    } else if (support === 'maybe') {
      formats.push(`${test.format} ?`);
    }
  });

  return formats.length > 0 ? formats.join(', ') : t('debug.cannotDetect');
}
