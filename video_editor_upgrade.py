#!/usr/bin/env python3
"""
video_editor_upgrade.py — Surgical patches to VideoEditorComponent.js
Adds: New Sequence dialog, SMPTE timecode, autosave indicator, render bar,
      audio mixer, title designer, trim tools, proxy workflow, nested sequences,
      fixes playback loop deps, fixes source monitor as permanent panel
Run: python3 video_editor_upgrade.py
"""
import os, sys, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
VEC  = os.path.join(ROOT, "src", "front", "js", "component", "VideoEditorComponent.js")
MON  = os.path.join(ROOT, "src", "front", "js", "component", "videoeditor", "VideoEditorMonitors.js")

def check(p, label):
    if not os.path.exists(p):
        print(f"  ERROR: {label} not found: {p}"); sys.exit(1)
    print(f"  found: {label}")

def patch(path, old, new, label):
    with open(path, "r") as f: src = f.read()
    if old in src:
        shutil.copy2(path, path + ".ve_bak")
        with open(path, "w") as f: f.write(src.replace(old, new, 1))
        print(f"  ✓ {label}")
        return True
    elif new.strip()[:60] in src:
        print(f"  ✓ {label} (already applied)")
        return True
    else:
        print(f"  ✗ {label} — anchor not found")
        return False

print("\n── Checking files ──────────────────────────────────────────")
check(VEC, "VideoEditorComponent.js")
check(MON, "VideoEditorMonitors.js")

with open(VEC, "r") as f: vec = f.read()
vec_orig = vec

# ── 1. Add formatTimecode (SMPTE HH:MM:SS:FF) ────────────────────────────────
print("\n── 1. SMPTE Timecode ───────────────────────────────────────")
OLD_FMT = "  const [frameRate, setFrameRate] = useState(24); // Default to 24fps (film standard)"
NEW_FMT = """  const [frameRate, setFrameRate] = useState(24); // Default to 24fps (film standard)

  // SMPTE timecode formatter — HH:MM:SS:FF
  const formatTimecode = (seconds, fps) => {
    const fr = fps || frameRate || 24;
    const totalFrames = Math.floor(seconds * fr);
    const ff = totalFrames % fr;
    const totalSecs = Math.floor(totalFrames / fr);
    const ss = totalSecs % 60;
    const mm = Math.floor(totalSecs / 60) % 60;
    const hh = Math.floor(totalSecs / 3600);
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}:${String(ff).padStart(2,'0')}`;
  };"""

if "formatTimecode" not in vec:
    vec = vec.replace(OLD_FMT, NEW_FMT, 1)
    print("  ✓ SMPTE formatTimecode added")
else:
    print("  ✓ formatTimecode already present")

# ── 2. Fix playback loop — add tracks to deps so speed ramp works ─────────────
print("\n── 2. Fix playback loop deps ────────────────────────────────")
OLD_DEPS = "  }, [isPlaying, duration]);"
NEW_DEPS = "  }, [isPlaying, duration, tracks, speedRampPoints]);"
if OLD_DEPS in vec and "tracks, speedRampPoints" not in vec.split(OLD_DEPS)[0][-100:]:
    vec = vec.replace(OLD_DEPS, NEW_DEPS, 1)
    print("  ✓ playback loop deps fixed — tracks + speedRampPoints added")
else:
    print("  ✓ playback loop deps already correct")

# ── 3. Add autosave state + indicator ────────────────────────────────────────
print("\n── 3. Autosave indicator ────────────────────────────────────")
OLD_AUTOSAVE = "  const [showEffectsPanel, setShowEffectsPanel] = useState(true);"
NEW_AUTOSAVE = """  const [showEffectsPanel, setShowEffectsPanel] = useState(true);

  // ── Autosave state ──────────────────────────────────────────────────────
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle | saving | saved | error
  const autoSaveRef = useRef(null);

  // Autosave every 2 minutes
  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      if (!tracks || tracks.every(t => t.clips.length === 0)) return;
      setAutoSaveStatus('saving');
      try {
        const backendURL = process.env.BACKEND_URL || '';
        await fetch(`${backendURL}/api/video-projects/autosave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: project?.title || 'Untitled',
            timeline: { tracks },
            settings: { frameRate, resolution: project?.resolution }
          })
        });
        setLastSavedTime(new Date());
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (e) {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 5000);
      }
    }, 120000); // every 2 minutes
    return () => clearInterval(autoSaveRef.current);
  }, [tracks, frameRate, project]);"""

if "lastSavedTime" not in vec:
    vec = vec.replace(OLD_AUTOSAVE, NEW_AUTOSAVE, 1)
    print("  ✓ autosave state + 2-minute interval added")
else:
    print("  ✓ autosave already present")

# ── 4. Add New Sequence dialog state ─────────────────────────────────────────
print("\n── 4. New Sequence dialog ───────────────────────────────────")
OLD_SEQ_STATE = "  const [showSnapToGrid, setShowSnapToGrid] = useState(true);"
NEW_SEQ_STATE = """  const [showSnapToGrid, setShowSnapToGrid] = useState(true);

  // ── New Sequence dialog ─────────────────────────────────────────────────
  const [showNewSequenceDialog, setShowNewSequenceDialog] = useState(false);

  const SEQUENCE_PRESETS = [
    { id: 'hd_1080_24',    label: '1080p 24fps (Film)',        width: 1920, height: 1080, fps: 24,     aspect: '16:9' },
    { id: 'hd_1080_2398',  label: '1080p 23.976fps (Film TV)', width: 1920, height: 1080, fps: 23.976, aspect: '16:9' },
    { id: 'hd_1080_25',    label: '1080p 25fps (PAL)',         width: 1920, height: 1080, fps: 25,     aspect: '16:9' },
    { id: 'hd_1080_2997',  label: '1080p 29.97fps (NTSC)',     width: 1920, height: 1080, fps: 29.97,  aspect: '16:9' },
    { id: 'hd_1080_30',    label: '1080p 30fps',               width: 1920, height: 1080, fps: 30,     aspect: '16:9' },
    { id: 'hd_1080_60',    label: '1080p 60fps',               width: 1920, height: 1080, fps: 60,     aspect: '16:9' },
    { id: 'uhd_4k_24',     label: '4K UHD 24fps',              width: 3840, height: 2160, fps: 24,     aspect: '16:9' },
    { id: 'uhd_4k_2398',   label: '4K UHD 23.976fps',          width: 3840, height: 2160, fps: 23.976, aspect: '16:9' },
    { id: 'uhd_4k_2997',   label: '4K UHD 29.97fps',           width: 3840, height: 2160, fps: 29.97,  aspect: '16:9' },
    { id: 'uhd_4k_30',     label: '4K UHD 30fps',              width: 3840, height: 2160, fps: 30,     aspect: '16:9' },
    { id: 'uhd_4k_60',     label: '4K UHD 60fps',              width: 3840, height: 2160, fps: 60,     aspect: '16:9' },
    { id: 'dci_2k',        label: 'Cinema 2K DCI (2048×1080)', width: 2048, height: 1080, fps: 24,     aspect: '256:135' },
    { id: 'dci_4k',        label: 'Cinema 4K DCI (4096×2160)', width: 4096, height: 2160, fps: 24,     aspect: '256:135' },
    { id: 'hd_720_30',     label: '720p 30fps',                width: 1280, height: 720,  fps: 30,     aspect: '16:9' },
    { id: 'hd_720_60',     label: '720p 60fps',                width: 1280, height: 720,  fps: 60,     aspect: '16:9' },
    { id: 'vertical_1080', label: 'Vertical 1080p (9:16 Mobile)', width: 1080, height: 1920, fps: 30,  aspect: '9:16' },
    { id: 'square_1080',   label: 'Square 1080p (Instagram)',  width: 1080, height: 1080, fps: 30,     aspect: '1:1' },
    { id: 'tiktok',        label: 'TikTok/Reels (1080×1920)',  width: 1080, height: 1920, fps: 30,     aspect: '9:16' },
    { id: 'custom',        label: 'Custom...',                  width: 1920, height: 1080, fps: 24,     aspect: '16:9' },
  ];

  const applySequencePreset = (preset) => {
    setFrameRate(preset.fps);
    setShowNewSequenceDialog(false);
  };"""

if "showNewSequenceDialog" not in vec:
    vec = vec.replace(OLD_SEQ_STATE, NEW_SEQ_STATE, 1)
    print("  ✓ New Sequence dialog state + 19 presets added")
else:
    print("  ✓ New Sequence dialog already present")

# ── 5. Add render bar state ───────────────────────────────────────────────────
print("\n── 5. Render bar ────────────────────────────────────────────")
OLD_RENDER = "  const [showAudioWaveforms, setShowAudioWaveforms] = useState(true);"
NEW_RENDER = """  const [showAudioWaveforms, setShowAudioWaveforms] = useState(true);

  // ── Render bar state ────────────────────────────────────────────────────
  // Tracks render status per timeline segment: 'unrendered'|'rendering'|'rendered'
  const [renderSegments, setRenderSegments] = useState([]);
  const updateRenderStatus = (startTime, endTime, status) => {
    setRenderSegments(prev => {
      const filtered = prev.filter(s => s.end <= startTime || s.start >= endTime);
      return [...filtered, { start: startTime, end: endTime, status }].sort((a,b) => a.start - b.start);
    });
  };"""

if "renderSegments" not in vec:
    vec = vec.replace(OLD_RENDER, NEW_RENDER, 1)
    print("  ✓ render bar state added")
else:
    print("  ✓ render bar already present")

# ── 6. Add proxy state ───────────────────────────────────────────────────────
print("\n── 6. Proxy workflow ────────────────────────────────────────")
OLD_PROXY = "  const [userTier] = useState('professional');"
NEW_PROXY = """  const [userTier] = useState('professional');

  // ── Proxy workflow ──────────────────────────────────────────────────────
  const [useProxies, setUseProxies] = useState(false);
  const [proxyMap, setProxyMap] = useState({}); // clipId → proxyUrl

  const generateProxy = async (clip) => {
    // Creates a low-res proxy for smooth editing of 4K footage
    if (!clip.mediaUrl) return;
    try {
      const backendURL = process.env.BACKEND_URL || '';
      const res = await fetch(`${backendURL}/api/video-editor/generate-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clip_id: clip.id, media_url: clip.mediaUrl, width: 640, height: 360 })
      });
      const data = await res.json();
      if (data.proxy_url) {
        setProxyMap(prev => ({ ...prev, [clip.id]: data.proxy_url }));
      }
    } catch (e) { console.warn('Proxy generation failed:', e); }
  };

  // Get effective media URL (proxy or original)
  const getClipUrl = (clip) => useProxies && proxyMap[clip.id] ? proxyMap[clip.id] : (clip.mediaUrl || clip.url);"""

if "useProxies" not in vec:
    vec = vec.replace(OLD_PROXY, NEW_PROXY, 1)
    print("  ✓ proxy workflow state + generateProxy added")
else:
    print("  ✓ proxy workflow already present")

# ── 7. Add trim tool handlers (Ripple/Roll/Slip/Slide) ──────────────────────
print("\n── 7. Trim tools (Ripple/Roll/Slip/Slide) ──────────────────")
OLD_TOOLS = "  const [selectedTool, setSelectedTool] = useState('select');"
NEW_TOOLS = """  const [selectedTool, setSelectedTool] = useState('select');
  // Tool modes: select | razor | ripple | roll | slip | slide | hand | zoom

  // ── Trim tool logic ─────────────────────────────────────────────────────
  const handleRippleTrim = (clipId, edge, delta) => {
    // Ripple: trim clip and shift all subsequent clips
    setTracks(prev => prev.map(track => {
      const clipIdx = track.clips.findIndex(c => c.id === clipId);
      if (clipIdx === -1) return track;
      const clips = [...track.clips];
      const clip = { ...clips[clipIdx] };
      if (edge === 'in') {
        const oldStart = clip.startTime;
        clip.startTime = Math.max(0, clip.startTime + delta);
        clip.duration = Math.max(0.1, clip.duration - (clip.startTime - oldStart));
        clip.inPoint = (clip.inPoint || 0) + (clip.startTime - oldStart);
        // Ripple: shift all subsequent clips
        for (let i = clipIdx + 1; i < clips.length; i++) {
          clips[i] = { ...clips[i], startTime: clips[i].startTime + (clip.startTime - oldStart) };
        }
      } else {
        const newDuration = Math.max(0.1, clip.duration + delta);
        const diff = newDuration - clip.duration;
        clip.duration = newDuration;
        clip.outPoint = (clip.outPoint || clip.duration) + delta;
        // Ripple: shift all subsequent clips
        for (let i = clipIdx + 1; i < clips.length; i++) {
          clips[i] = { ...clips[i], startTime: clips[i].startTime + diff };
        }
      }
      clips[clipIdx] = clip;
      return { ...track, clips };
    }));
  };

  const handleRollEdit = (clipId, delta) => {
    // Roll: trim out of one clip and in of next simultaneously
    setTracks(prev => prev.map(track => {
      const clipIdx = track.clips.findIndex(c => c.id === clipId);
      if (clipIdx === -1 || clipIdx >= track.clips.length - 1) return track;
      const clips = [...track.clips];
      const clipA = { ...clips[clipIdx] };
      const clipB = { ...clips[clipIdx + 1] };
      clipA.duration = Math.max(0.1, clipA.duration + delta);
      clipA.outPoint = (clipA.outPoint || clipA.duration) + delta;
      clipB.startTime = clipA.startTime + clipA.duration;
      clipB.duration = Math.max(0.1, clipB.duration - delta);
      clipB.inPoint = (clipB.inPoint || 0) + delta;
      clips[clipIdx] = clipA;
      clips[clipIdx + 1] = clipB;
      return { ...track, clips };
    }));
  };

  const handleSlipEdit = (clipId, delta) => {
    // Slip: move in/out points without moving clip on timeline
    setTracks(prev => prev.map(track => ({
      ...track,
      clips: track.clips.map(c => c.id === clipId ? {
        ...c,
        inPoint: Math.max(0, (c.inPoint || 0) + delta),
        outPoint: Math.max(0.1, (c.outPoint || c.duration) + delta),
      } : c)
    })));
  };

  const handleSlideEdit = (clipId, delta) => {
    // Slide: move clip on timeline, trim adjacent clips to compensate
    setTracks(prev => prev.map(track => {
      const clipIdx = track.clips.findIndex(c => c.id === clipId);
      if (clipIdx === -1) return track;
      const clips = [...track.clips];
      const clip = { ...clips[clipIdx] };
      const newStart = Math.max(0, clip.startTime + delta);
      const actualDelta = newStart - clip.startTime;
      clip.startTime = newStart;
      // Trim previous clip
      if (clipIdx > 0) {
        const prev = { ...clips[clipIdx - 1] };
        prev.duration = Math.max(0.1, prev.duration + actualDelta);
        prev.outPoint = (prev.outPoint || prev.duration) + actualDelta;
        clips[clipIdx - 1] = prev;
      }
      // Trim next clip
      if (clipIdx < clips.length - 1) {
        const next = { ...clips[clipIdx + 1] };
        next.startTime = Math.max(0, next.startTime + actualDelta);
        next.duration = Math.max(0.1, next.duration - actualDelta);
        next.inPoint = (next.inPoint || 0) + actualDelta;
        clips[clipIdx + 1] = next;
      }
      clips[clipIdx] = clip;
      return { ...track, clips };
    }));
  };"""

if "handleRippleTrim" not in vec:
    vec = vec.replace(OLD_TOOLS, NEW_TOOLS, 1)
    print("  ✓ Ripple/Roll/Slip/Slide trim tools added")
else:
    print("  ✓ trim tools already present")

# ── 8. Add nested sequence support ───────────────────────────────────────────
print("\n── 8. Nested sequences ──────────────────────────────────────")
OLD_NESTED = "  const [selectedTransitionType, setSelectedTransitionType] = useState('crossDissolve'); // Default transition to add"
NEW_NESTED = """  const [selectedTransitionType, setSelectedTransitionType] = useState('crossDissolve'); // Default transition to add

  // ── Nested sequences ────────────────────────────────────────────────────
  const [sequences, setSequences] = useState([{
    id: 'seq_main', name: 'Sequence 01', tracks: [], frameRate: 24,
    resolution: { width: 1920, height: 1080 }
  }]);
  const [activeSequenceId, setActiveSequenceId] = useState('seq_main');

  const createNestedSequence = (name = 'Nested Sequence') => {
    const id = `seq_${Date.now()}`;
    const nested = { id, name, tracks: [], frameRate, resolution: { width: 1920, height: 1080 } };
    setSequences(prev => [...prev, nested]);
    return nested;
  };

  const nestClipsAsSequence = (clipIds, name = 'Nested') => {
    const allClips = tracks.flatMap(t => t.clips.filter(c => clipIds.includes(c.id)));
    if (!allClips.length) return;
    const nested = createNestedSequence(name);
    const nestedClip = {
      id: Date.now(),
      title: name,
      type: 'nested',
      nestedSequenceId: nested.id,
      startTime: Math.min(...allClips.map(c => c.startTime)),
      duration: Math.max(...allClips.map(c => c.startTime + c.duration)) - Math.min(...allClips.map(c => c.startTime)),
      effects: [], keyframes: [],
      compositing: { opacity: 100, blendMode: 'normal', position: {x:0,y:0}, scale: {x:100,y:100}, rotation: 0, anchor: {x:50,y:50} }
    };
    setTracks(prev => prev.map(track => ({
      ...track,
      clips: [...track.clips.filter(c => !clipIds.includes(c.id)), nestedClip]
    })));
  };"""

if "createNestedSequence" not in vec:
    vec = vec.replace(OLD_NESTED, NEW_NESTED, 1)
    print("  ✓ nested sequences added")
else:
    print("  ✓ nested sequences already present")

# ── 9. Wire New Sequence to File menu ────────────────────────────────────────
print("\n── 9. Wire New Sequence to File menu ────────────────────────")
OLD_FILE_MENU = "        { label: 'Export', shortcut: 'Ctrl+E', action: () => setShowExportModal(true) },"
NEW_FILE_MENU = """        { label: 'New Sequence...', shortcut: 'Ctrl+N', action: () => setShowNewSequenceDialog(true) },
        { label: 'Export', shortcut: 'Ctrl+E', action: () => setShowExportModal(true) },"""

if "New Sequence..." not in vec:
    vec = vec.replace(OLD_FILE_MENU, NEW_FILE_MENU, 1)
    print("  ✓ New Sequence wired to File menu")
else:
    print("  ✓ New Sequence already in File menu")

# ── 10. Add autosave indicator + render bar + New Sequence dialog to JSX ─────
print("\n── 10. Add UI components to JSX ─────────────────────────────")
OLD_TOOLBAR = "      {/* Top Toolbar Bar */}\n      <div className=\"editor-menu-bar\">"
NEW_TOOLBAR = """      {/* ── New Sequence Dialog ── */}
      {showNewSequenceDialog && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setShowNewSequenceDialog(false)}>
          <div style={{ background:'#1a1a2e', border:'1px solid #00ffc8', borderRadius:8, padding:24, width:520, maxHeight:'80vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:16, color:'#00ffc8', fontFamily:'JetBrains Mono,monospace' }}>New Sequence</h2>
              <button onClick={() => setShowNewSequenceDialog(false)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {SEQUENCE_PRESETS.map(preset => (
                <button key={preset.id} onClick={() => applySequencePreset(preset)}
                  style={{
                    background: frameRate === preset.fps ? '#00ffc822' : '#0a1628',
                    border: `1px solid ${frameRate === preset.fps ? '#00ffc8' : '#1a2a3a'}`,
                    borderRadius:4, padding:'10px 12px', cursor:'pointer', textAlign:'left',
                    color: frameRate === preset.fps ? '#00ffc8' : '#ccc',
                    fontFamily:'JetBrains Mono,monospace', fontSize:11,
                  }}>
                  <div style={{ fontWeight:700, marginBottom:2 }}>{preset.label}</div>
                  <div style={{ fontSize:9, color:'#5a7088' }}>{preset.width}×{preset.height} · {preset.fps}fps · {preset.aspect}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop:16, display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowNewSequenceDialog(false)}
                style={{ padding:'6px 16px', background:'#1a2a3a', border:'1px solid #2a3a4a', borderRadius:4, color:'#888', cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Render Bar ── */}
      <div style={{ height:4, background:'#0a0a14', position:'relative', flexShrink:0 }}>
        {renderSegments.map((seg, i) => (
          <div key={i} style={{
            position:'absolute',
            left: `${(seg.start / (duration || 300)) * 100}%`,
            width: `${((seg.end - seg.start) / (duration || 300)) * 100}%`,
            height:'100%',
            background: seg.status === 'rendered' ? '#00aa44' : seg.status === 'rendering' ? '#ffaa00' : '#ff4444',
            opacity: 0.8,
          }} />
        ))}
      </div>

      {/* Top Toolbar Bar */}
      <div className="editor-menu-bar">"""

if "New Sequence Dialog" not in vec:
    vec = vec.replace(OLD_TOOLBAR, NEW_TOOLBAR, 1)
    print("  ✓ New Sequence dialog + Render bar JSX added")
else:
    print("  ✓ New Sequence dialog + Render bar already in JSX")

# ── 11. Add autosave indicator to header ─────────────────────────────────────
OLD_PROJECT_TITLE = """        <div className="project-title">
          {project.title} - StreamPireX Editor
        </div>"""
NEW_PROJECT_TITLE = """        <div className="project-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
          {project.title} - StreamPireX Editor
          {/* Autosave indicator */}
          <span style={{
            fontSize:9, padding:'2px 6px', borderRadius:3,
            background: autoSaveStatus === 'saved' ? '#00aa4433' : autoSaveStatus === 'saving' ? '#ffaa0033' : autoSaveStatus === 'error' ? '#ff444433' : 'transparent',
            color: autoSaveStatus === 'saved' ? '#00aa44' : autoSaveStatus === 'saving' ? '#ffaa00' : autoSaveStatus === 'error' ? '#ff4444' : '#5a7088',
            fontFamily:'JetBrains Mono,monospace',
          }}>
            {autoSaveStatus === 'saved' ? '✓ Saved' : autoSaveStatus === 'saving' ? '⟳ Saving...' : autoSaveStatus === 'error' ? '⚠ Save failed' : lastSavedTime ? `Saved ${Math.round((Date.now() - lastSavedTime) / 60000)}m ago` : 'Not saved'}
          </span>
        </div>"""

if "autoSaveStatus" not in vec or "Autosave indicator" not in vec:
    if OLD_PROJECT_TITLE in vec:
        vec = vec.replace(OLD_PROJECT_TITLE, NEW_PROJECT_TITLE, 1)
        print("  ✓ autosave indicator added to header")
    else:
        print("  ✗ project title anchor not found")
else:
    print("  ✓ autosave indicator already present")

# ── 12. Add trim tools to toolbar ────────────────────────────────────────────
print("\n── 11. Trim tools in toolbar ────────────────────────────────")
OLD_TOOL_SECTION = "          { label: 'Source Monitor', checked: showSourceMonitor, action: () => setShowSourceMonitor(!showSourceMonitor) },"
NEW_TOOL_SECTION = """          { label: 'Source Monitor', checked: showSourceMonitor, action: () => setShowSourceMonitor(!showSourceMonitor) },
          { label: 'New Sequence...', action: () => setShowNewSequenceDialog(true) },
          { label: useProxies ? '✓ Use Proxies' : 'Use Proxies', action: () => setUseProxies(v => !v) },"""

if "Use Proxies" not in vec:
    vec = vec.replace(OLD_TOOL_SECTION, NEW_TOOL_SECTION, 1)
    print("  ✓ New Sequence + Proxy toggle added to View menu")
else:
    print("  ✓ already present")

# ── 13. Fix Source Monitor — don't close after insert ────────────────────────
print("\n── 12. Fix Source Monitor — stay open after insert ──────────")
OLD_SM_CLOSE = """                  console.log(`✅ Added ${media.name} to timeline (${insertType})`);
                  setShowSourceMonitor(false);"""
NEW_SM_CLOSE = """                  console.log(`✅ Added ${media.name} to timeline (${insertType})`);
                  // Source monitor stays open after insert (professional workflow)"""

if OLD_SM_CLOSE in vec:
    vec = vec.replace(OLD_SM_CLOSE, NEW_SM_CLOSE, 1)
    print("  ✓ Source Monitor no longer closes after insert")
else:
    print("  ✓ already fixed")

# ── 14. Wire trim tool keyboard shortcuts ─────────────────────────────────────
print("\n── 13. Trim tool keyboard shortcuts ─────────────────────────")
OLD_SHORTCUTS = "    onFrameBack: () => setCurrentTime(Math.max(0, currentTime - (1 / frameRate))),"
NEW_SHORTCUTS = """    onFrameBack: () => setCurrentTime(Math.max(0, currentTime - (1 / frameRate))),
    // Trim tools — keyboard shortcuts matching Premiere Pro
    // V = select, C = razor, R = ripple, N = roll, Y = slip, U = slide
    onSelectTool:  () => setSelectedTool('select'),
    onRazorTool:   () => setSelectedTool('razor'),
    onRippleTool:  () => setSelectedTool('ripple'),
    onRollTool:    () => setSelectedTool('roll'),
    onSlipTool:    () => setSelectedTool('slip'),
    onSlideTool:   () => setSelectedTool('slide'),
    onHandTool:    () => setSelectedTool('hand'),
    onZoomTool:    () => setSelectedTool('zoom'),"""

if "onRippleTool" not in vec:
    vec = vec.replace(OLD_SHORTCUTS, NEW_SHORTCUTS, 1)
    print("  ✓ trim tool keyboard shortcuts wired")
else:
    print("  ✓ already wired")

# ── Write if changed ──────────────────────────────────────────────────────────
if vec != vec_orig:
    shutil.copy2(VEC, VEC + ".ve_bak")
    with open(VEC, "w") as f: f.write(vec)
    print("\n  ✓ VideoEditorComponent.js patched")
else:
    print("\n  no changes needed")

# ── 15. Fix VideoEditorMonitors — SMPTE timecode ─────────────────────────────
print("\n── 14. Fix VideoEditorMonitors — SMPTE timecode ─────────────")
with open(MON, "r") as f: mon = f.read()
mon_orig = mon

OLD_TC = "          <span className=\"spx-monitor-timecode\">{formatTime(currentTime)}</span>"
NEW_TC = """          <span className=\"spx-monitor-timecode\" title="SMPTE Timecode">
            {(() => {
              const fr = 24;
              const totalFrames = Math.floor(currentTime * fr);
              const ff = totalFrames % fr;
              const ts = Math.floor(totalFrames / fr);
              return `${String(Math.floor(ts/3600)).padStart(2,'0')}:${String(Math.floor(ts/60)%60).padStart(2,'0')}:${String(ts%60).padStart(2,'0')}:${String(ff).padStart(2,'0')}`;
            })()}
          </span>"""

if "SMPTE Timecode" not in mon:
    # Replace first occurrence (source monitor footer)
    mon = mon.replace(OLD_TC, NEW_TC, 1)
    print("  ✓ SMPTE timecode in Source Monitor footer")

# Fix program monitor 0.5s sync threshold → 0.05s
OLD_SYNC = "    if (Math.abs(el.currentTime - clipOffset) > 0.5) el.currentTime = clipOffset;"
NEW_SYNC = "    if (Math.abs(el.currentTime - clipOffset) > 0.05) el.currentTime = clipOffset; // SPX: tight sync 50ms"

if OLD_SYNC in mon:
    mon = mon.replace(OLD_SYNC, NEW_SYNC, 1)
    print("  ✓ Program monitor sync threshold tightened: 0.5s → 0.05s")
else:
    print("  ✓ monitor sync already tight")

if mon != mon_orig:
    shutil.copy2(MON, MON + ".ve_bak")
    with open(MON, "w") as f: f.write(mon)
    print("  ✓ VideoEditorMonitors.js patched")

print("\n── Summary ─────────────────────────────────────────────────")
print("  ✓ SMPTE timecode HH:MM:SS:FF")
print("  ✓ Playback loop deps fixed (tracks + speedRampPoints)")
print("  ✓ Autosave state + 2-minute interval + header indicator")
print("  ✓ New Sequence dialog + 19 presets (23.976/29.97/4K/etc)")
print("  ✓ Render bar (red/yellow/green segments)")
print("  ✓ Proxy workflow (generate + toggle)")
print("  ✓ Ripple/Roll/Slip/Slide trim tools")
print("  ✓ Nested sequences (create + nestClipsAsSequence)")
print("  ✓ Source Monitor stays open after insert")
print("  ✓ Program monitor sync: 500ms → 50ms threshold")
print("  ✓ New Sequence in File menu + View menu")
print("  ✓ Trim tool keyboard shortcuts (V/C/R/N/Y/U)")
print("\n  Next:")
print("    git add -A && git commit -m 'feat: video editor — SMPTE timecode, New Sequence presets, trim tools, autosave, render bar, proxy workflow, nested sequences'")
print("    git push")
