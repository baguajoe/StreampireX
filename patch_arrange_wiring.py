#!/usr/bin/env python3
"""
patch_arrange_wiring.py
Wires SynthCreator, DrumDesigner, InstrumentBuilder to Arrange tracks.

Run from: /workspaces/SpectraSphere
  python3 /tmp/patch_arrange_wiring.py
"""

import os, shutil, re

REPO = "/workspaces/SpectraSphere"

def ok(m):   print(f"  ✅  {m}")
def warn(m): print(f"  ⚠️   {m}")
def err(m):  print(f"  ❌  {m}"); exit(1)

def patch_file(path, patches, label):
    if not os.path.exists(path):
        err(f"{label} not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    original = src
    for name, old, new in patches:
        if old == new:
            warn(f"  {name}: old==new, skipping")
        elif new in src:
            warn(f"  {name}: already patched")
        elif old not in src:
            warn(f"  {name}: anchor not found — skipping")
        else:
            src = src.replace(old, new, 1)
            ok(f"  {name}")
    if src != original:
        shutil.copy2(path, path + ".pre_wiring.bak")
        with open(path, "w", encoding="utf-8") as f:
            f.write(src)
        ok(f"  {label} saved")
    else:
        warn(f"  {label}: no changes written")

# ─────────────────────────────────────────────────────────────────────────────
# 1. SynthCreator.js — make exportWAV return the buffer
# ─────────────────────────────────────────────────────────────────────────────
print("\n── SynthCreator.js ──")
SYNTH = os.path.join(REPO, "src/front/js/component/SynthCreator.js")

patch_file(SYNTH, [
    # exportWAV: add return buf before the closing try, fix finally
    ("exportWAV returns buffer",
     "      setStatus('WAV exported!');\n    } catch (e) {\n      console.error(e);\n      setStatus('Export failed');\n    }\n    setExporting(false);\n    setTimeout(() => setStatus(''), 2000);\n  };",
     "      setStatus('WAV exported!');\n      setExporting(false);\n      setTimeout(() => setStatus(''), 2000);\n      return buf;\n    } catch (e) {\n      console.error(e);\n      setStatus('Export failed');\n      setExporting(false);\n      setTimeout(() => setStatus(''), 2000);\n      return null;\n    }\n  };"),

    # Assign to Track button: make async, pass buffer
    ("Assign to Track button",
     "{onAssignToTrack && (\n              <button className=\"sc-btn sc-btn-orange\" onClick={() => onAssignToTrack && onAssignToTrack(preset)}>",
     "{onAssignToTrack && (\n              <button className=\"sc-btn sc-btn-orange\" onClick={async () => { const buf = await exportWAV(); if (buf) onAssignToTrack(preset, buf); }}>"),
], "SynthCreator.js")

# ─────────────────────────────────────────────────────────────────────────────
# 2. DrumDesigner.js — make exportWAV return buffer, wire buttons
# ─────────────────────────────────────────────────────────────────────────────
print("\n── DrumDesigner.js ──")
DRUM = os.path.join(REPO, "src/front/js/component/DrumDesigner.js")

# Find the ArrayBuffer variable name in DrumDesigner
with open(DRUM, "r") as f:
    dd = f.read()
m = re.search(r'const (\w+) = new ArrayBuffer\(', dd)
dd_buf = m.group(1) if m else "buf"
print(f"  ArrayBuffer var: {dd_buf}")

# Find the exportWAV ending
m2 = re.search(r"setStatus\('WAV exported!'\);\n    \} catch \(e\) \{[^}]+\}\n    setExporting\(false\);\n  \};", dd)
if m2:
    old_end = m2.group(0)
    new_end = f"setStatus('WAV exported!');\n      setExporting(false);\n      return {dd_buf};\n    }} catch (e) {{\n      console.error('DrumDesigner export failed:', e);\n      setStatus('Export failed');\n      setExporting(false);\n      return null;\n    }}\n  }};"
else:
    old_end = None
    warn("  Could not find DrumDesigner exportWAV ending")

# Find the Assign to Pad button onClick
m3 = re.search(r'onClick=\{\(\) => \{ exportWAV\(\); onAssignToPad\([^)]+\); \}\}', dd)
if m3:
    old_btn = m3.group(0)
    new_btn = "onClick={async () => { const buf = await exportWAV(); onAssignToPad({ type: drumType, params: p, audioBuffer: buf }); }}"
else:
    old_btn = None
    warn("  Could not find DrumDesigner Assign to Pad onClick")

patches = []
if old_end:
    patches.append(("exportWAV returns buffer", old_end, new_end))
if old_btn:
    patches.append(("Assign to Pad button", old_btn, new_btn))

# Add "Send to Track" button after the Assign to Pad button closing tag
patches.append((
    "Send to Track button",
    "              🥁 Assign to Pad\n            </button>",
    """              🥁 Assign to Pad
            </button>
            {onAssignToTrack && (
              <button style={{ background: '#FF6600', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, marginLeft: 8 }}
                onClick={async () => { const buf = await exportWAV(); if (buf) onAssignToTrack({ type: drumType, audioBuffer: buf }); }}>
                🎚️ Send to Track
              </button>
            }""",
))

patch_file(DRUM, patches, "DrumDesigner.js")

# ─────────────────────────────────────────────────────────────────────────────
# 3. InstrumentBuilder.js — make exportWAV return buffer, wire button
# ─────────────────────────────────────────────────────────────────────────────
print("\n── InstrumentBuilder.js ──")
INSTR = os.path.join(REPO, "src/front/js/component/InstrumentBuilder.js")

with open(INSTR, "r") as f:
    ib = f.read()
m4 = re.search(r'const (\w+) = new ArrayBuffer\(', ib)
ib_buf = m4.group(1) if m4 else "buf"
print(f"  ArrayBuffer var: {ib_buf}")

m5 = re.search(r"setStatus\('WAV exported!'\);\n    \} catch \(e\) \{[^}]+\}\n    setExporting\(false\);\n  \};", ib)
if m5:
    ib_old_end = m5.group(0)
    ib_new_end = f"setStatus('WAV exported!');\n      setExporting(false);\n      return {ib_buf};\n    }} catch (e) {{\n      console.error(e);\n      setStatus('Export failed');\n      setExporting(false);\n      return null;\n    }}\n  }};"
else:
    ib_old_end = None
    warn("  Could not find InstrumentBuilder exportWAV ending")

# Find onAssignToTrack onClick in InstrumentBuilder
m6 = re.search(r'onClick=\{[^}]*onAssignToTrack\([^)]*\)[^}]*\}', ib)
if m6:
    ib_old_btn = m6.group(0)
    ib_new_btn = "onClick={async () => { const buf = await exportWAV(); if (buf && onAssignToTrack) onAssignToTrack({ instrName: instrName || 'Instrument' }, buf); }}"
else:
    ib_old_btn = None
    warn("  Could not find InstrumentBuilder onAssignToTrack onClick")

ib_patches = []
if ib_old_end:
    ib_patches.append(("exportWAV returns buffer", ib_old_end, ib_new_end))
if ib_old_btn:
    ib_patches.append(("Assign to Track button", ib_old_btn, ib_new_btn))

patch_file(INSTR, ib_patches, "InstrumentBuilder.js")

# ─────────────────────────────────────────────────────────────────────────────
# 4. RecordingStudio.js — add landBufferOnTrack helper + wire all 3 callbacks
# ─────────────────────────────────────────────────────────────────────────────
print("\n── RecordingStudio.js ──")
STUDIO = os.path.join(REPO, "src/front/js/pages/RecordingStudio.js")

HELPER = """  // ── Helper: land an AudioBuffer/ArrayBuffer on the next empty Arrange track ──
  const landBufferOnTrack = useCallback((audioBuffer, trackName) => {
    let targetIdx = tracks.findIndex(t => !t.audioBuffer);
    if (targetIdx === -1 && tracks.length < maxTracks) {
      targetIdx = tracks.length;
      setTracks(prev => [...prev, DEFAULT_TRACK(targetIdx)]);
    }
    if (targetIdx === -1) {
      setStatus("⚠ No empty tracks — clear a track first");
      return;
    }
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    const audioUrl = URL.createObjectURL(blob);
    updateTrack(targetIdx, { audioBuffer, audio_url: audioUrl, name: trackName });
    createRegionFromImport(targetIdx, audioBuffer, trackName, audioUrl);
    setStatus(`✓ "${trackName}" → Track ${targetIdx + 1}`);
    setViewMode("arrange");
  }, [tracks, maxTracks, updateTrack, createRegionFromImport]);

"""

patch_file(STUDIO, [
    # Insert helper before the synth view block
    ("landBufferOnTrack helper",
     '        {viewMode === "synth" && (',
     HELPER + '        {viewMode === "synth" && ('),

    # Wire SynthCreator
    ("SynthCreator onAssignToTrack",
     'onAssignToTrack={(preset) => {\n                addTrack && addTrack();\n                setStatus && setStatus(`🎛️ Synth "${preset.name}" assigned as new instrument track`);\n              }}',
     'onAssignToTrack={(preset, audioBuffer) => {\n                if (!audioBuffer) { setStatus("🎛️ Use Assign to Track in Synth Creator"); return; }\n                landBufferOnTrack(audioBuffer, preset?.name || "Synth");\n              }}'),

    # Wire DrumDesigner onAssignToPad
    ("DrumDesigner onAssignToPad",
     'onAssignToPad={(data) => {\n                setStatus && setStatus(`🥁 ${data.type.toUpperCase()} exported — load WAV into a pad`);\n                setViewMode("beatmaker");\n              }}',
     'onAssignToPad={(data) => {\n                if (data.audioBuffer) window.__spx_sampler_export = { buffer: data.audioBuffer, name: (data.type || "Drum").toUpperCase(), timestamp: Date.now() };\n                setStatus(`🥁 ${(data.type||"Drum").toUpperCase()} → Beat Maker pad`);\n                setViewMode("beatmaker");\n              }}\n              onAssignToTrack={(data) => {\n                if (!data.audioBuffer) { setStatus("🥁 Use Send to Track in Drum Designer"); return; }\n                landBufferOnTrack(data.audioBuffer, (data.type || "Drum").toUpperCase());\n              }}'),

    # Wire InstrumentBuilder
    ("InstrumentBuilder onAssignToTrack",
     'onAssignToTrack={(preset) => {\n                setStatus && setStatus(`🎸 Instrument ready — assigned to track`);\n                setViewMode("arrange");\n              }}',
     'onAssignToTrack={(preset, audioBuffer) => {\n                if (!audioBuffer) { setStatus("🎸 Use Assign to Track in Instrument Builder"); return; }\n                landBufferOnTrack(audioBuffer, preset?.instrName || "Instrument");\n              }}'),
], "RecordingStudio.js")

print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Done! Commit and push:

  git add -A
  git commit -m "feat: wire synth/drum/instrument exports to Arrange tracks"
  git push

  Flow after this:
    Synth  → Assign to Track  → renders WAV → Track N in Arrange
    Drum   → Assign to Pad    → goes to Beat Maker pad
    Drum   → Send to Track    → renders WAV → Track N in Arrange
    Instr  → Assign to Track  → renders WAV → Track N in Arrange
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
