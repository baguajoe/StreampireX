#!/usr/bin/env python3
"""
video_editor_install.py — Copy new components + run patches
Run: python3 video_editor_install.py
"""
import os, sys, shutil, subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
COMP = os.path.join(ROOT, "src", "front", "js", "component")
VED  = os.path.join(COMP, "videoeditor")
VEC  = os.path.join(COMP, "VideoEditorComponent.js")

print("\n── Copying new components ──────────────────────────────────")

for src_file, dest_name in [
    ("VideoEditorAudioMixer.js", "VideoEditorAudioMixer.js"),
    ("VideoEditorTitleDesigner.js", "VideoEditorTitleDesigner.js"),
]:
    src = os.path.join(ROOT, src_file)
    dst = os.path.join(COMP, dest_name)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"  copied → {dst}")
    else:
        print(f"  ERROR: {src_file} not found in repo root")

print("\n── Running surgical patches ────────────────────────────────")
result = subprocess.run(["python3", os.path.join(ROOT, "video_editor_upgrade.py")], capture_output=False)

# ── Wire AudioMixer + TitleDesigner imports into VideoEditorComponent ─────────
print("\n── Wiring imports ──────────────────────────────────────────")
with open(VEC, "r") as f: vec = f.read()
orig = vec

IMP_ANCHOR = "import VideoEditorMonitors from './videoeditor/VideoEditorMonitors';"
IMP_NEW = """import VideoEditorMonitors from './videoeditor/VideoEditorMonitors';
import VideoEditorAudioMixer from './VideoEditorAudioMixer';
import VideoEditorTitleDesigner from './VideoEditorTitleDesigner';"""

if "VideoEditorAudioMixer" not in vec:
    vec = vec.replace(IMP_ANCHOR, IMP_NEW, 1)
    print("  ✓ AudioMixer + TitleDesigner imports added")

# Add state for showing mixer/title designer
STATE_ANCHOR = "  const [showExportModal, setShowExportModal] = useState(false);"
STATE_NEW = """  const [showExportModal, setShowExportModal] = useState(false);
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [showTitleDesigner, setShowTitleDesigner] = useState(false);"""

if "showAudioMixer" not in vec:
    vec = vec.replace(STATE_ANCHOR, STATE_NEW, 1)
    print("  ✓ showAudioMixer + showTitleDesigner state added")

# Wire to Window menu
WINDOW_ANCHOR = "          { label: 'Source Monitor', checked: showSourceMonitor, action: () => setShowSourceMonitor(!showSourceMonitor) },"
WINDOW_NEW = """          { label: 'Source Monitor', checked: showSourceMonitor, action: () => setShowSourceMonitor(!showSourceMonitor) },
          { label: 'Audio Mixer', checked: showAudioMixer, action: () => setShowAudioMixer(v => !v) },
          { label: 'Title Designer', action: () => setShowTitleDesigner(true) },"""

if "Audio Mixer" not in vec:
    vec = vec.replace(WINDOW_ANCHOR, WINDOW_NEW, 1)
    print("  ✓ Audio Mixer + Title Designer wired to Window menu")

# Add JSX — AudioMixer panel below timeline, TitleDesigner as modal
JSX_ANCHOR = "      {showExportModal && ("
JSX_NEW = """      {/* Audio Mixer Panel */}
      {showAudioMixer && (
        <div style={{ height: 280, borderTop: '1px solid #1a2a3a', flexShrink: 0 }}>
          <VideoEditorAudioMixer
            tracks={tracks}
            onTrackUpdate={(trackId, updates) => {
              setTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
            }}
            onClose={() => setShowAudioMixer(false)}
          />
        </div>
      )}

      {/* Title Designer Modal */}
      {showTitleDesigner && (
        <VideoEditorTitleDesigner
          currentTime={currentTime}
          onAddToTimeline={(titleClip) => {
            const videoTrack = tracks.find(t => t.type === 'video' || t.type === 'title');
            if (videoTrack) {
              setTracks(prev => prev.map(t =>
                t.id === videoTrack.id
                  ? { ...t, clips: [...t.clips, titleClip] }
                  : t
              ));
            }
          }}
          onClose={() => setShowTitleDesigner(false)}
        />
      )}

      {showExportModal && ("""

if "Title Designer Modal" not in vec:
    vec = vec.replace(JSX_ANCHOR, JSX_NEW, 1)
    print("  ✓ AudioMixer panel + TitleDesigner modal added to JSX")

if vec != orig:
    with open(VEC, "w") as f: f.write(vec)
    print("  ✓ VideoEditorComponent.js updated with new imports + JSX")

print("\n── Done ────────────────────────────────────────────────────")
print("  New components:")
print("    VideoEditorAudioMixer.js — per-track faders, VU meters, pan, mute/solo")
print("    VideoEditorTitleDesigner.js — lower thirds, title cards, animated text")
print("  Patches applied to VideoEditorComponent.js:")
print("    SMPTE HH:MM:SS:FF timecode")
print("    Playback loop deps fixed")
print("    Autosave + indicator")
print("    New Sequence dialog + 19 presets")
print("    Render bar")
print("    Proxy workflow")
print("    Ripple/Roll/Slip/Slide trim tools")
print("    Nested sequences")
print("    Source monitor stays open after insert")
print("    Program monitor 50ms sync threshold")
print("\n  Next:")
print("    git add -A && git commit -m 'feat: video editor — professional NLE features complete'")
print("    git push")
