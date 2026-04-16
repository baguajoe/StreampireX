#!/usr/bin/env python3
"""
BPM / Region sync fix.

Patches:
  1. ArrangerView.js:
     - handleFileDrop: detect BPM first, store durationSeconds, prompt if project has audio
     - Add useEffect to recalc region.duration from durationSeconds on BPM change
     - Add "Detect Tempo" + "Set project BPM from this region" context menu items
     - WaveformMini/MidiRegionMini: no change needed
     - Region sizing: unchanged (still uses beats)

  2. RecordingStudio.js:
     - createRegionFromImport: store durationSeconds
     - createRegionFromRecording: store durationSeconds
     - handleImport: detect BPM with prompt (not silent confirm on big diff only)
     - Add useEffect to recalc region.duration from durationSeconds on BPM change

Run from repo root:
    python3 apply_bpm_fix.py <path-to-ArrangerView.js> <path-to-RecordingStudio.js>
"""

import sys
import os
import re


def read(p):
    with open(p, 'r', encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def replace_once(src, old, new, label):
    count = src.count(old)
    if count == 0:
        print(f"  [SKIP] {label}: anchor not found")
        return src, False
    if count > 1:
        print(f"  [FAIL] {label}: anchor matched {count} times (need exactly 1)")
        sys.exit(1)
    print(f"  [OK]   {label}")
    return src.replace(old, new, 1), True


# ---------------------------------------------------------------------------
# ArrangerView.js patches
# ---------------------------------------------------------------------------
def patch_arranger(path):
    print(f"\n== Patching {path} ==")
    src = read(path)

    # --- Patch 1: Replace handleFileDrop with BPM-aware version ---
    old_drop = '''  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || f.name.match(/\\.(mp3|wav|ogg|aac|flac|m4a)$/i));
    if (!files.length) return;
    const scrollEl = e.currentTarget;
    const rect = scrollEl.getBoundingClientRect();
    const dropX = e.clientX - rect.left + scrollEl.scrollLeft;
    const startBeat = Math.max(0, Math.floor(pxToBeat(dropX, zoom)));
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const arrayBuf = await file.arrayBuffer();
      let duration = 4;
      let decodedBuf = null;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        decodedBuf = await ctx.decodeAudioData(arrayBuf);
        duration = decodedBuf.duration;
        // BPM detection
        try {
          const ch = decodedBuf.getChannelData(0); const sr = decodedBuf.sampleRate;
          const step = Math.floor(sr * 0.01);
          const peaks = [];
          for (let s = 0; s < ch.length - step; s += step) {
            let r = 0; for (let k = 0; k < step; k++) r += ch[s+k]*ch[s+k];
            peaks.push(Math.sqrt(r/step));
          }
          const avg = peaks.reduce((a,b)=>a+b,0)/peaks.length;
          const thr = avg * 1.5;
          const beats = []; let last = -1;
          for (let i = 1; i < peaks.length-1; i++) {
            if (peaks[i]>thr && peaks[i]>peaks[i-1] && peaks[i]>peaks[i+1] && (i-last)>20) { beats.push(i*0.01); last=i; }
          }
          if (beats.length > 3) {
            const intervals = beats.slice(1).map((b,i)=>b-beats[i]);
            const avgInt = intervals.reduce((a,b)=>a+b,0)/intervals.length;
            const det = Math.round(60/avgInt);
            if (det>=60 && det<=200 && onBpmDetected) onBpmDetected(det);
          }
        } catch(e) {}
        ctx.close();
      } catch(err) {}
      const beatsPerSecond = bpm / 60;
      const regionBeats = Math.ceil(duration * beatsPerSecond);
      const i = tracks.length;
      const newTrack = {
        id: `trk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name.replace(/\\.[^.]+$/, ''),
        trackType: 'audio',
        volume: 0.8, pan: 0,
        muted: false, solo: false, armed: false,
        color: TRACK_COLORS[i % TRACK_COLORS.length],
        audioBuffer: decodedBuf,
        audio_url: url,
        regions: [{
          id: `reg_${Date.now()}`,
          startBeat: startBeat,
          duration: regionBeats,
          audioUrl: url,
          name: file.name.replace(/\\.[^.]+$/, ''),
          color: TRACK_COLORS[i % TRACK_COLORS.length],
        }],
      };
      setTracks(prev => [...prev, newTrack]);
      setSelectedTrack(i);
    }
  }, [tracks.length, bpm, zoom, setTracks]);'''

    new_drop = '''  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || f.name.match(/\\.(mp3|wav|ogg|aac|flac|m4a)$/i));
    if (!files.length) return;
    const scrollEl = e.currentTarget;
    const rect = scrollEl.getBoundingClientRect();
    const dropX = e.clientX - rect.left + scrollEl.scrollLeft;
    const startBeat = Math.max(0, Math.floor(pxToBeat(dropX, zoom)));

    // Project is "empty" if no existing track has any audio regions
    const projectHasAudio = tracks.some(t => (t.regions || []).some(r => r.audioUrl || r.durationSeconds));

    for (const file of files) {
      const url = URL.createObjectURL(file);
      const arrayBuf = await file.arrayBuffer();
      let duration = 4;
      let decodedBuf = null;
      let detectedBpm = null;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        decodedBuf = await ctx.decodeAudioData(arrayBuf);
        duration = decodedBuf.duration;
        // BPM detection
        try {
          const ch = decodedBuf.getChannelData(0); const sr = decodedBuf.sampleRate;
          const step = Math.floor(sr * 0.01);
          const peaks = [];
          for (let s = 0; s < ch.length - step; s += step) {
            let r = 0; for (let k = 0; k < step; k++) r += ch[s+k]*ch[s+k];
            peaks.push(Math.sqrt(r/step));
          }
          const avg = peaks.reduce((a,b)=>a+b,0)/peaks.length;
          const thr = avg * 1.5;
          const beats = []; let last = -1;
          for (let i = 1; i < peaks.length-1; i++) {
            if (peaks[i]>thr && peaks[i]>peaks[i-1] && peaks[i]>peaks[i+1] && (i-last)>20) { beats.push(i*0.01); last=i; }
          }
          if (beats.length > 3) {
            const intervals = beats.slice(1).map((b,i)=>b-beats[i]);
            const avgInt = intervals.reduce((a,b)=>a+b,0)/intervals.length;
            const det = Math.round(60/avgInt);
            if (det>=60 && det<=200) detectedBpm = det;
          }
        } catch(e) {}
        ctx.close();
      } catch(err) {}

      // Decide which BPM to use for sizing this region
      let effectiveBpm = bpm;
      if (detectedBpm) {
        if (!projectHasAudio) {
          // Empty project: silently adopt detected BPM
          effectiveBpm = detectedBpm;
          if (onBpmDetected) onBpmDetected(detectedBpm);
        } else if (Math.abs(detectedBpm - bpm) >= 1) {
          // Has audio: ask
          const msg = `Detected BPM: ${detectedBpm}\\nProject BPM: ${bpm}\\n\\nSet project to ${detectedBpm} BPM?`;
          if (window.confirm(msg)) {
            effectiveBpm = detectedBpm;
            if (onBpmDetected) onBpmDetected(detectedBpm);
          }
          // else: keep project BPM; region will be sized to detected BPM visually
          // so waveform still lines up to itself but won't be on-grid
          else {
            effectiveBpm = detectedBpm;
          }
        }
      }

      const beatsPerSecond = effectiveBpm / 60;
      const regionBeats = duration * beatsPerSecond;
      const i = tracks.length;
      const newTrack = {
        id: `trk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name.replace(/\\.[^.]+$/, ''),
        trackType: 'audio',
        volume: 0.8, pan: 0,
        muted: false, solo: false, armed: false,
        color: TRACK_COLORS[i % TRACK_COLORS.length],
        audioBuffer: decodedBuf,
        audio_url: url,
        regions: [{
          id: `reg_${Date.now()}`,
          startBeat: startBeat,
          duration: regionBeats,
          durationSeconds: duration,       // source of truth
          originalBpm: effectiveBpm,       // BPM region was created at
          audioUrl: url,
          name: file.name.replace(/\\.[^.]+$/, ''),
          color: TRACK_COLORS[i % TRACK_COLORS.length],
        }],
      };
      setTracks(prev => [...prev, newTrack]);
      setSelectedTrack(i);
    }
  }, [tracks, bpm, zoom, setTracks, onBpmDetected]);'''

    src, _ = replace_once(src, old_drop, new_drop, "ArrangerView.handleFileDrop")

    # --- Patch 2: Add BPM-change recalc effect right after totalBeats useMemo ---
    old_scroll_anchor = '''  // ── Scroll sync ──'''
    new_scroll_anchor = '''  // ── Recalc region durations when BPM changes ──
  // Regions store durationSeconds as source of truth; duration (beats) is derived.
  const lastBpmRef = useRef(bpm);
  useEffect(() => {
    if (lastBpmRef.current === bpm) return;
    const oldBpm = lastBpmRef.current;
    lastBpmRef.current = bpm;
    setTracks(prev => prev.map(t => ({
      ...t,
      regions: (t.regions || []).map(r => {
        // If region has durationSeconds, recalc duration from it
        if (typeof r.durationSeconds === "number" && r.durationSeconds > 0) {
          return { ...r, duration: r.durationSeconds * (bpm / 60) };
        }
        // Legacy region (no durationSeconds) — rescale from old BPM
        if (typeof r.duration === "number" && r.duration > 0 && oldBpm > 0) {
          const seconds = r.duration * (60 / oldBpm);
          return { ...r, duration: seconds * (bpm / 60), durationSeconds: seconds };
        }
        return r;
      }),
    })));
  }, [bpm, setTracks]);

  // ── Scroll sync ──'''

    src, _ = replace_once(src, old_scroll_anchor, new_scroll_anchor, "ArrangerView.bpm-recalc effect")

    # --- Patch 3: Add "Detect Tempo" + "Set BPM from region" to region context menu ---
    old_ctx = '''  const handleRegionContextMenu = useCallback((e, region, trackIndex) => {
    e.preventDefault(); e.stopPropagation();
    const clickBeat = pxToBeat(e.clientX - timelineRef.current?.getBoundingClientRect().left + scrollLeft, zoom);
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "Duplicate",   icon: "⧉", action: () => duplicateRegion(trackIndex, region.id) },
        { label: "Split here",  icon: "✂", action: () => splitRegion(trackIndex, region.id, clickBeat) },
        ...(tracks[trackIndex]?.trackType === "instrument" && region.notes
          ? [{ label: "Edit in Piano Roll", icon: "🎹", action: () => onOpenPianoRoll && onOpenPianoRoll(trackIndex, region.id) }]
          : []
        ),
        "---",
        { label: "Delete",      icon: "🗑", danger: true, action: () => deleteRegion(trackIndex, region.id) },
      ],
    });
  }, [zoom, scrollLeft, tracks, duplicateRegion, splitRegion, deleteRegion, onOpenPianoRoll]);'''

    new_ctx = '''  // ── Detect tempo of an existing region ──
  const detectRegionTempo = useCallback(async (trackIndex, regionId) => {
    const track = tracks[trackIndex];
    const region = (track?.regions || []).find(r => r.id === regionId);
    if (!region?.audioUrl) return null;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const resp = await fetch(region.audioUrl);
      const arrayBuf = await resp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      const ch = decoded.getChannelData(0); const sr = decoded.sampleRate;
      const step = Math.floor(sr * 0.01);
      const peaks = [];
      for (let s = 0; s < ch.length - step; s += step) {
        let r = 0; for (let k = 0; k < step; k++) r += ch[s+k]*ch[s+k];
        peaks.push(Math.sqrt(r/step));
      }
      const avg = peaks.reduce((a,b)=>a+b,0)/peaks.length;
      const thr = avg * 1.5;
      const hits = []; let last = -1;
      for (let i = 1; i < peaks.length-1; i++) {
        if (peaks[i]>thr && peaks[i]>peaks[i-1] && peaks[i]>peaks[i+1] && (i-last)>20) { hits.push(i*0.01); last=i; }
      }
      ctx.close();
      if (hits.length < 4) return null;
      const intervals = hits.slice(1).map((b,i)=>b-hits[i]);
      const avgInt = intervals.reduce((a,b)=>a+b,0)/intervals.length;
      const det = Math.round(60/avgInt);
      if (det>=60 && det<=200) return det;
      return null;
    } catch(e) { return null; }
  }, [tracks]);

  const handleRegionContextMenu = useCallback((e, region, trackIndex) => {
    e.preventDefault(); e.stopPropagation();
    const clickBeat = pxToBeat(e.clientX - timelineRef.current?.getBoundingClientRect().left + scrollLeft, zoom);
    const isAudioRegion = !!region.audioUrl;
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "Duplicate",   icon: "⧉", action: () => duplicateRegion(trackIndex, region.id) },
        { label: "Split here",  icon: "✂", action: () => splitRegion(trackIndex, region.id, clickBeat) },
        ...(tracks[trackIndex]?.trackType === "instrument" && region.notes
          ? [{ label: "Edit in Piano Roll", icon: "🎹", action: () => onOpenPianoRoll && onOpenPianoRoll(trackIndex, region.id) }]
          : []
        ),
        ...(isAudioRegion ? [
          "---",
          { label: "Detect tempo", icon: "♩", action: async () => {
            const det = await detectRegionTempo(trackIndex, region.id);
            if (det) {
              const msg = `Detected ${det} BPM\\n\\nCurrent project BPM: ${bpm}\\n\\nSet project BPM to ${det}?`;
              if (window.confirm(msg) && onBpmChange) onBpmChange(det);
            } else {
              window.alert("Could not detect tempo from this region.");
            }
          }},
        ] : []),
        "---",
        { label: "Delete",      icon: "🗑", danger: true, action: () => deleteRegion(trackIndex, region.id) },
      ],
    });
  }, [zoom, scrollLeft, tracks, bpm, duplicateRegion, splitRegion, deleteRegion, onOpenPianoRoll, detectRegionTempo, onBpmChange]);'''

    src, _ = replace_once(src, old_ctx, new_ctx, "ArrangerView.context-menu + detectRegionTempo")

    write(path, src)
    print(f"  Wrote {len(src)} chars")


# ---------------------------------------------------------------------------
# RecordingStudio.js patches
# ---------------------------------------------------------------------------
def patch_recording_studio(path):
    print(f"\n== Patching {path} ==")
    src = read(path)

    # --- Patch 1: createRegionFromRecording — add durationSeconds ---
    old_rec = '''  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startBeat = secondsToBeat(playOffsetRef.current, bpm);
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: tracks[trackIndex]?.name || `Track ${trackIndex + 1}`, startBeat, duration: durationBeat, audioUrl, color: tracks[trackIndex]?.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
  };'''

    new_rec = '''  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startBeat = secondsToBeat(playOffsetRef.current, bpm);
    const durationSeconds = audioBuffer.duration;
    const durationBeat = secondsToBeat(durationSeconds, bpm);
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: tracks[trackIndex]?.name || `Track ${trackIndex + 1}`, startBeat, duration: durationBeat, durationSeconds, originalBpm: bpm, audioUrl, color: tracks[trackIndex]?.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
  };'''

    src, _ = replace_once(src, old_rec, new_rec, "RecordingStudio.createRegionFromRecording")

    # --- Patch 2: createRegionFromImport — add durationSeconds ---
    old_imp = '''  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: name || `Import ${trackIndex + 1}`, startBeat: 0, duration: durationBeat, audioUrl, color: t.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
  };'''

    new_imp = '''  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const durationSeconds = audioBuffer.duration;
    const durationBeat = secondsToBeat(durationSeconds, bpm);
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: name || `Import ${trackIndex + 1}`, startBeat: 0, duration: durationBeat, durationSeconds, originalBpm: bpm, audioUrl, color: t.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
  };'''

    src, _ = replace_once(src, old_imp, new_imp, "RecordingStudio.createRegionFromImport")

    # --- Patch 3: handleImport — prompt on mismatch, not just >5 diff ---
    old_import_detect = '''        try {
          const ch = buf.getChannelData(0); const sr = buf.sampleRate; const step = Math.floor(sr * 0.01);
          const peaks = []; for (let s = 0; s < ch.length - step; s += step) { let r = 0; for (let k = 0; k < step; k++) r += ch[s+k]*ch[s+k]; peaks.push(Math.sqrt(r/step)); }
          const avg = peaks.reduce((a,b)=>a+b,0)/peaks.length; const thr = avg * 1.5;
          const beats = []; let last = -1;
          for (let i = 1; i < peaks.length-1; i++) { if (peaks[i]>thr && peaks[i]>peaks[i-1] && peaks[i]>peaks[i+1] && (i-last)>20) { beats.push(i*0.01); last=i; } }
          if (beats.length > 3) { const intervals = beats.slice(1).map((b,i)=>b-beats[i]); const avgInt = intervals.reduce((a,b)=>a+b,0)/intervals.length; const det = Math.round(60/avgInt); if (det>=60&&det<=200) { setBpm(det); setStatus('♩ BPM: '+det+' from "'+name+'"'); } }
        } catch(e) {}'''

    new_import_detect = '''        try {
          const ch = buf.getChannelData(0); const sr = buf.sampleRate; const step = Math.floor(sr * 0.01);
          const peaks = []; for (let s = 0; s < ch.length - step; s += step) { let r = 0; for (let k = 0; k < step; k++) r += ch[s+k]*ch[s+k]; peaks.push(Math.sqrt(r/step)); }
          const avg = peaks.reduce((a,b)=>a+b,0)/peaks.length; const thr = avg * 1.5;
          const beats = []; let last = -1;
          for (let i = 1; i < peaks.length-1; i++) { if (peaks[i]>thr && peaks[i]>peaks[i-1] && peaks[i]>peaks[i+1] && (i-last)>20) { beats.push(i*0.01); last=i; } }
          if (beats.length > 3) {
            const intervals = beats.slice(1).map((b,i)=>b-beats[i]);
            const avgInt = intervals.reduce((a,b)=>a+b,0)/intervals.length;
            const det = Math.round(60/avgInt);
            if (det>=60&&det<=200) {
              const projectHasAudio = tracks.some((t,idx) => idx !== ti && (t.regions||[]).some(r => r.audioUrl || r.durationSeconds));
              if (!projectHasAudio) {
                setBpm(det); setStatus('♩ BPM: '+det+' from "'+name+'"');
              } else if (Math.abs(det - bpm) >= 1) {
                const msg = `Detected BPM: ${det}\\nProject BPM: ${bpm}\\n\\nSet project to ${det} BPM?`;
                if (window.confirm(msg)) { setBpm(det); setStatus('♩ BPM: '+det+' from "'+name+'"'); }
              }
            }
          }
        } catch(e) {}'''

    src, _ = replace_once(src, old_import_detect, new_import_detect, "RecordingStudio.handleImport BPM prompt")

    # --- Patch 4: Add BPM-change recalc effect for regions ---
    # Anchor: place immediately after the existing "Sync refs" useEffect block
    old_sync_anchor = '''  // ── Sync refs ──
  useEffect(() => { trackConsoleCharRef.current = trackConsoleChar; }, [trackConsoleChar]);
  useEffect(() => { masterConsoleCharRef.current = masterConsoleChar; }, [masterConsoleChar]);
  useEffect(() => { setWamPlugins(getInstalledWAMPlugins() || []); }, []);'''

    new_sync_anchor = '''  // ── Sync refs ──
  useEffect(() => { trackConsoleCharRef.current = trackConsoleChar; }, [trackConsoleChar]);
  useEffect(() => { masterConsoleCharRef.current = masterConsoleChar; }, [masterConsoleChar]);
  useEffect(() => { setWamPlugins(getInstalledWAMPlugins() || []); }, []);

  // ── Recalc region durations when BPM changes ──
  // durationSeconds is source of truth; duration (beats) is derived.
  const lastBpmRef = useRef(bpm);
  useEffect(() => {
    if (lastBpmRef.current === bpm) return;
    const oldBpm = lastBpmRef.current;
    lastBpmRef.current = bpm;
    setTracks(prev => prev.map(t => ({
      ...t,
      regions: (t.regions || []).map(r => {
        if (typeof r.durationSeconds === "number" && r.durationSeconds > 0) {
          return { ...r, duration: secondsToBeat(r.durationSeconds, bpm), startBeat: typeof r.startSeconds === "number" ? secondsToBeat(r.startSeconds, bpm) : r.startBeat };
        }
        if (typeof r.duration === "number" && r.duration > 0 && oldBpm > 0) {
          const seconds = beatToSeconds(r.duration, oldBpm);
          return { ...r, duration: secondsToBeat(seconds, bpm), durationSeconds: seconds };
        }
        return r;
      }),
    })));
  }, [bpm]);'''

    src, _ = replace_once(src, old_sync_anchor, new_sync_anchor, "RecordingStudio.bpm-recalc effect")

    write(path, src)
    print(f"  Wrote {len(src)} chars")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 apply_bpm_fix.py <ArrangerView.js> <RecordingStudio.js>")
        sys.exit(1)
    patch_arranger(sys.argv[1])
    patch_recording_studio(sys.argv[2])
    print("\n== Done ==")
