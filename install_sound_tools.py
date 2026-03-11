#!/usr/bin/env python3
"""
install_sound_tools.py
Wires SynthCreator, DrumDesigner, InstrumentBuilder into RecordingStudio.js

Run from: /workspaces/SpectraSphere
  python3 /tmp/install_sound_tools.py
"""

import os
import shutil
import sys

REPO = "/workspaces/SpectraSphere"
COMP = os.path.join(REPO, "src/front/js/component")
STYLES = os.path.join(REPO, "src/front/styles")
STUDIO = os.path.join(REPO, "src/front/js/pages/RecordingStudio.js")

# ── Where the new files live (same dir as this script or CWD) ──
SRC_DIR = os.path.dirname(os.path.abspath(__file__))

FILES = {
    "SynthCreator.js":       COMP,
    "SynthCreator.css":      STYLES,
    "DrumDesigner.js":       COMP,
    "DrumDesigner.css":      STYLES,
    "InstrumentBuilder.js":  COMP,
    "InstrumentBuilder.css": STYLES,
}

# ─────────────────────────────────────────────────────────────────────────────

def banner(msg):
    print(f"\n{'━'*50}")
    print(f"  {msg}")
    print('━'*50)

def ok(msg):   print(f"  ✅  {msg}")
def warn(msg): print(f"  ⚠️   {msg}")
def err(msg):  print(f"  ❌  {msg}"); sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Copy files
# ─────────────────────────────────────────────────────────────────────────────

banner("Step 1: Copying component files")

for filename, dest_dir in FILES.items():
    src = os.path.join(SRC_DIR, filename)
    # Also check CWD
    if not os.path.exists(src):
        src = os.path.join(os.getcwd(), filename)
    if not os.path.exists(src):
        err(f"Source file not found: {filename}\n  Looked in {SRC_DIR} and {os.getcwd()}")
    os.makedirs(dest_dir, exist_ok=True)
    shutil.copy2(src, os.path.join(dest_dir, filename))
    ok(f"{filename}  →  {dest_dir}")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Read RecordingStudio.js
# ─────────────────────────────────────────────────────────────────────────────

banner("Step 2: Patching RecordingStudio.js")

if not os.path.exists(STUDIO):
    err(f"RecordingStudio.js not found at:\n  {STUDIO}")

with open(STUDIO, "r", encoding="utf-8") as f:
    src = f.read()

original = src  # keep for diff check

# ─────────────────────────────────────────────────────────────────────────────
# PATCH A — Imports
# ─────────────────────────────────────────────────────────────────────────────

IMPORT_ANCHOR = 'import VocalProcessor from "../component/VocalProcessor";'
NEW_IMPORTS = (
    'import SynthCreator from "../component/SynthCreator";\n'
    'import DrumDesigner from "../component/DrumDesigner";\n'
    'import InstrumentBuilder from "../component/InstrumentBuilder";\n'
)

if "SynthCreator" in src:
    warn("SynthCreator already imported — skipping import patch")
elif IMPORT_ANCHOR not in src:
    # Fallback anchor — try any import line near the bottom of imports
    fallback = 'import MicSimulator from "../component/MicSimulator";'
    if fallback in src:
        src = src.replace(fallback, fallback + "\n" + NEW_IMPORTS.rstrip())
        ok("Imports added (fallback anchor)")
    else:
        warn("Could not find import anchor — skipping import patch (add manually)")
else:
    src = src.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + NEW_IMPORTS.rstrip())
    ok("Imports added after VocalProcessor import")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH B — Sidebar view buttons
# ─────────────────────────────────────────────────────────────────────────────

# We anchor on the AI Mix button label text which is unique
BTN_ANCHOR = """            AI Mix
          </button>"""

NEW_BUTTONS = """            AI Mix
          </button>
          <button
            className={`daw-view-tab ${viewMode === "synth" ? "active" : ""}`}
            onClick={() => setViewMode("synth")}
            title="Synth Creator — Build sounds from oscillators"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="3" />
              <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>{" "}
            Synth
          </button>
          <button
            className={`daw-view-tab ${viewMode === "drumdesigner" ? "active" : ""}`}
            onClick={() => setViewMode("drumdesigner")}
            title="Drum Designer — Synthesize kick, 808, snare, clap, hi-hat"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="8" rx="9" ry="4" />
              <path d="M3 8v8c0 2.21 4.03 4 9 4s9-1.79 9-4V8" />
            </svg>{" "}
            Drum Design
          </button>
          <button
            className={`daw-view-tab ${viewMode === "instrbuilder" ? "active" : ""}`}
            onClick={() => setViewMode("instrbuilder")}
            title="Instrument Builder — Layer synth, sample, sub, noise"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <path d="M8 6V4a2 2 0 0 1 4 0v2" />
              <line x1="12" y1="10" x2="12" y2="16" />
              <line x1="9" y1="13" x2="15" y2="13" />
            </svg>{" "}
            Instr Build
          </button>"""

if 'viewMode === "synth"' in src:
    warn("Sidebar buttons already present — skipping")
elif BTN_ANCHOR not in src:
    warn("AI Mix button anchor not found — skipping sidebar buttons (add manually)")
else:
    # Only replace the FIRST occurrence (there may be a .bak copy referenced)
    src = src.replace(BTN_ANCHOR, NEW_BUTTONS, 1)
    ok("Sidebar view buttons added after AI Mix")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH C — View render blocks
# ─────────────────────────────────────────────────────────────────────────────

# Anchor: the voicemidi view block is the last one; we insert after it.
# We look for a reliable closing pattern after the voicemidi view block.
RENDER_ANCHOR = '{viewMode === "voicemidi" && ('

NEW_RENDER_BLOCKS = """
        {viewMode === "synth" && (
          <div className="daw-synth-view" style={{ flex: 1, overflow: "auto", height: "100%" }}>
            <SynthCreator
              onClose={() => setViewMode("arrange")}
              onAssignToTrack={(preset) => {
                addTrack && addTrack();
                setStatus && setStatus(`🎛️ Synth "${preset.name}" assigned as new instrument track`);
              }}
            />
          </div>
        )}

        {viewMode === "drumdesigner" && (
          <div className="daw-drumdesigner-view" style={{ flex: 1, overflow: "auto", height: "100%" }}>
            <DrumDesigner
              onClose={() => setViewMode("beatmaker")}
              onAssignToPad={(data) => {
                setStatus && setStatus(`🥁 ${data.type.toUpperCase()} exported — load WAV into a pad`);
                setViewMode("beatmaker");
              }}
            />
          </div>
        )}

        {viewMode === "instrbuilder" && (
          <div className="daw-instrbuilder-view" style={{ flex: 1, overflow: "auto", height: "100%" }}>
            <InstrumentBuilder
              onClose={() => setViewMode("arrange")}
              onAssignToTrack={(preset) => {
                setStatus && setStatus(`🎸 Instrument ready — assigned to track`);
                setViewMode("arrange");
              }}
            />
          </div>
        )}

"""

if 'viewMode === "synth" &&' in src:
    warn("Render blocks already present — skipping")
elif RENDER_ANCHOR not in src:
    # Fallback: try to find the plugins view as anchor
    fallback = '{viewMode === "plugins" && ('
    if fallback in src:
        src = src.replace(fallback, NEW_RENDER_BLOCKS + "\n        " + fallback, 1)
        ok("Render blocks added (fallback anchor: plugins view)")
    else:
        warn("voicemidi/plugins anchor not found — skipping render blocks (add manually)")
else:
    src = src.replace(RENDER_ANCHOR, NEW_RENDER_BLOCKS + "\n        " + RENDER_ANCHOR, 1)
    ok("Render blocks added before voicemidi view")

# ─────────────────────────────────────────────────────────────────────────────
# WRITE OUTPUT
# ─────────────────────────────────────────────────────────────────────────────

if src == original:
    warn("No changes made to RecordingStudio.js (all patches skipped or already applied)")
else:
    # Backup original
    backup = STUDIO + ".pre_soundtools.bak"
    shutil.copy2(STUDIO, backup)
    ok(f"Backup saved: RecordingStudio.js.pre_soundtools.bak")

    with open(STUDIO, "w", encoding="utf-8") as f:
        f.write(src)
    ok("RecordingStudio.js updated")

# ─────────────────────────────────────────────────────────────────────────────
# DONE
# ─────────────────────────────────────────────────────────────────────────────

banner("All done! Next steps:")
print("""
  cd /workspaces/SpectraSphere

  # Verify the patches look right:
  grep -n "SynthCreator\\|DrumDesigner\\|InstrumentBuilder" src/front/js/pages/RecordingStudio.js

  # Commit and push:
  git add -A
  git commit -m "feat: add SynthCreator, DrumDesigner, InstrumentBuilder to DAW"
  git push
""")
