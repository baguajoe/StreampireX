#!/usr/bin/env python3
"""
patch_cubase_final.py
─────────────────────
Final patch: adds 2 empty send slots (always visible) + activates .ch-upper/.ch-mid/.ch-lower CSS.

Prerequisites:
  - patch_cubase_jsx.py must have run (4 ch-upper wrappers exist)
  - CSS must be clean (no ch-upper rules)

Changes:
  1. JSX: add 2 empty send slots in block 1's .daw-ch-sends when bus list is empty
  2. JSX: add 2 empty send slots in block 2's .daw-ch-sends (master, no iteration)
  3. CSS: grid .daw-channel, .ch-upper scrolls, .ch-mid/.ch-lower fixed bottom, 1 thin divider
  4. Insert picker preserved (no overflow:hidden on .daw-channel)
"""
import sys
import shutil
from pathlib import Path

JS_PATH = Path("src/front/js/pages/RecordingStudio.js")
CSS_PATH = Path("src/front/styles/RecordingStudio.css")

for p in (JS_PATH, CSS_PATH):
    if not p.exists():
        print(f"ERROR: {p} not found")
        sys.exit(1)

js_text = JS_PATH.read_text()
css_text = CSS_PATH.read_text()

# Pre-flight
if 'className="ch-upper"' not in js_text:
    print("✗ ch-upper not in JSX. Run patch_cubase_jsx.py first.")
    sys.exit(1)
if '.ch-upper' in css_text:
    print("✗ CSS already has .ch-upper rules. Revert CSS first.")
    sys.exit(1)

js_backup = JS_PATH.with_suffix(JS_PATH.suffix + ".bak_final")
css_backup = CSS_PATH.with_suffix(CSS_PATH.suffix + ".bak_final")
shutil.copy(JS_PATH, js_backup)
shutil.copy(CSS_PATH, css_backup)
print(f"✓ Backups: {js_backup}, {css_backup}\n")

# ═════════════════════════════════════════════════════════════
# JSX PART — Add 2 empty send slots
# ═════════════════════════════════════════════════════════════

# BLOCK 1 sends — currently maps over buses, no fallback for empty
# Wrap the map with empty-slot fallback: show 2 empty slots if no buses
block1_sends_old = """                        <div className="daw-ch-sends">
                          <div className="daw-ch-sends-label">SENDS</div>
                          {tracks.filter(b=>b.trackType==="bus").map(bus=>("""

block1_sends_new = """                        <div className="daw-ch-sends">
                          <div className="daw-ch-sends-label">SENDS</div>
                          {tracks.filter(b=>b.trackType==="bus").length === 0 && (
                            <>
                              <div className="daw-ch-send-slot empty"></div>
                              <div className="daw-ch-send-slot empty"></div>
                            </>
                          )}
                          {tracks.filter(b=>b.trackType==="bus").map(bus=>("""

if block1_sends_old not in js_text:
    print("✗ Block 1 sends anchor not found")
    sys.exit(1)
js_text = js_text.replace(block1_sends_old, block1_sends_new, 1)
print("✓ Block 1: added 2 empty send slots fallback")

# BLOCK 2 sends (master) — currently just a label, no slots
block2_sends_old = """                    <div className="daw-ch-sends">
                      <div className="daw-ch-sends-label">SENDS</div>
                    </div>"""

block2_sends_new = """                    <div className="daw-ch-sends">
                      <div className="daw-ch-sends-label">SENDS</div>
                      <div className="daw-ch-send-slot empty"></div>
                      <div className="daw-ch-send-slot empty"></div>
                    </div>"""

if block2_sends_old not in js_text:
    print("✗ Block 2 sends anchor not found")
    sys.exit(1)
js_text = js_text.replace(block2_sends_old, block2_sends_new, 1)
print("✓ Block 2: added 2 empty send slots")

# Blocks 3 & 4 (console view) don't have sends — skip

# Write JSX
JS_PATH.write_text(js_text)
print(f"✓ JSX written: {JS_PATH}\n")

# ═════════════════════════════════════════════════════════════
# CSS PART — 2-section layout
# ═════════════════════════════════════════════════════════════

# 1. .daw-channel → grid
old_channel = '.daw-channel { display:flex; flex-direction:column; align-items:center; background:#181e2d; border:1px solid #243048; border-radius:6px; cursor:pointer; flex-shrink:0; width:90px; min-width:90px; height:680px; min-height:680px; max-height:680px; padding-bottom:16px; overflow:visible; transition:border-color .15s, background .15s; }'

new_channel = """.daw-channel {
  display: grid;
  grid-template-rows:
    auto      /* colorbar */
    auto      /* header */
    auto      /* routing */
    260px     /* ch-upper — scrolls */
    auto      /* ch-mid — fixed */
    auto      /* ch-lower — fixed, always visible */
  ;
  background: #181e2d;
  border: 1px solid #243048;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  width: 90px;
  min-width: 90px;
  height: auto;
  min-height: 0;
  max-height: none;
  padding-bottom: 4px;
  overflow: visible;
  transition: border-color .15s, background .15s;
}"""

if old_channel not in css_text:
    print("✗ .daw-channel base rule not found")
    sys.exit(1)
css_text = css_text.replace(old_channel, new_channel)
print("✓ .daw-channel → grid, upper=260px")

# 2. Master channel matches
old_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:680px; min-height:680px; max-height:680px; padding-bottom:24px; overflow:visible; padding-bottom:8px; border-color:rgba(255,102,0,.3); }'
new_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:auto; min-height:0; max-height:none; padding-bottom:4px; overflow:visible; border-color:rgba(255,102,0,.3); }'

if old_master in css_text:
    css_text = css_text.replace(old_master, new_master)
    print("✓ .daw-channel.master-channel — matches new grid")

# 3. .daw-ch-inserts — no internal scroll (parent .ch-upper scrolls)
old_inserts = '.daw-ch-inserts { padding:3px 4px; width:100%; height:140px; min-height:140px; max-height:140px; overflow-y:auto; flex-shrink:0; }'
new_inserts = '.daw-ch-inserts { padding:3px 4px; width:100%; flex-shrink:0; }'

if old_inserts not in css_text:
    print("✗ .daw-ch-inserts not found")
    sys.exit(1)
css_text = css_text.replace(old_inserts, new_inserts)
print("✓ .daw-ch-inserts — removed internal scroll")

# 4. .daw-ch-sends — no fixed height
old_sends_css = '.daw-ch-sends { width:100%; padding:2px 4px; flex-shrink:0; height:60px; min-height:60px; max-height:60px; overflow:hidden; }'
new_sends_css = '.daw-ch-sends { width:100%; padding:2px 4px; flex-shrink:0; }'

if old_sends_css not in css_text:
    print("✗ .daw-ch-sends not found")
    sys.exit(1)
css_text = css_text.replace(old_sends_css, new_sends_css)
print("✓ .daw-ch-sends — removed fixed height")

# 5. Append new rules
append_css = """

/* ═══════════════════════════════════════════════════════════
   CUBASE 2-SECTION CHANNEL LAYOUT
   ═══════════════════════════════════════════════════════════ */

/* UPPER: routing + inserts + sends. Fixed 260px, scrolls internally. */
.ch-upper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 260px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0a0f18;
  border-bottom: 1px solid #2a3d5a;  /* THE Cubase divider */
}
.ch-upper::-webkit-scrollbar { width: 4px; }
.ch-upper::-webkit-scrollbar-track { background: transparent; }
.ch-upper::-webkit-scrollbar-thumb { background: #243048; border-radius: 2px; }
.ch-upper::-webkit-scrollbar-thumb:hover { background: #3a4a5f; }

/* MID: M/S/e/rec + pan. Fixed, always visible. */
.ch-mid {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex-shrink: 0;
  background: #13182a;
}

/* LOWER: fader + automation + name. Fixed, always visible. */
.ch-lower {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex-shrink: 0;
  background: #13182a;
}

/* Empty send slots (matching insert slot style) */
.daw-ch-send-slot.empty {
  border-radius: 3px;
  margin-bottom: 2px;
  padding: 3px 6px;
  min-height: 16px;
  background: rgba(255,255,255,.02);
  border: 1px solid #1e2638;
}
"""

css_text += append_css
print("✓ Appended .ch-upper / .ch-mid / .ch-lower + send slot rules")

# Write CSS
CSS_PATH.write_text(css_text)
print(f"✓ CSS written: {CSS_PATH}")

print(f"\nNext:")
print(f"  npm run build 2>&1 | tail -3")
print(f"\nRevert:")
print(f"  cp {js_backup} {JS_PATH}")
print(f"  cp {css_backup} {CSS_PATH}")
