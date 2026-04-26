#!/usr/bin/env python3
"""
patch_cubase_css.py
───────────────────
CSS for the Cubase 2-section channel layout created by patch_cubase_jsx.py.

JSX structure (already wrapped by prior script):
  .daw-channel
    .daw-ch-colorbar
    .daw-ch-header
    .daw-ch-routing
    .ch-upper      ← SCROLLS (inserts + sends)
    .ch-mid        ← FIXED (M/S/e/rec + pan)
    .ch-lower      ← FIXED (fader + automation + name)

Cubase behavior:
  - Upper section scrolls internally; grows to fill available space
  - Full-width horizontal divider BELOW .ch-upper — forms continuous line across all channels
  - Mid+Lower = combined lower half, ALWAYS fully visible, never scrolls
  - Fader, meter, M/S, R/W, name always visible regardless of insert count

Technique:
  - .daw-channel is CSS grid with rows: auto auto auto 1fr auto auto
    (colorbar, header, routing, upper=1fr, mid=auto, lower=auto)
  - .ch-upper has overflow-y:auto, min-height:0 (critical for 1fr shrink)
  - .ch-upper has border-bottom: 2px — the full-width split line
  - Channels have gap:0 so borders merge into continuous horizontal stripe
  - Inner .daw-ch-inserts and .daw-ch-sends are normal flow inside upper (no nested scroll)
"""
import sys
import shutil
from pathlib import Path

PATH = Path("src/front/styles/RecordingStudio.css")

if not PATH.exists():
    print(f"ERROR: {PATH} not found")
    sys.exit(1)

text = PATH.read_text()
backup = PATH.with_suffix(PATH.suffix + ".bak_cubase_css")
shutil.copy(PATH, backup)
print(f"✓ Backup: {backup}")

# ─────────────────────────────────────────────────────────────
# 1. .daw-console-scroll — no gap, overflow-y hidden
# ─────────────────────────────────────────────────────────────
old_console_scroll = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:2px; padding:8px 8px 32px; overflow-x:auto; overflow-y:auto; height:100%; background:#0c111c; }'
new_console_scroll = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:0; padding:8px 8px 32px; overflow-x:auto; overflow-y:hidden; height:100%; background:#0c111c; }'

if old_console_scroll not in text:
    print("✗ .daw-console-scroll not found (expected original)")
    sys.exit(1)
text = text.replace(old_console_scroll, new_console_scroll)
print("✓ .daw-console-scroll — gap:0, vertical scroll off")

# ─────────────────────────────────────────────────────────────
# 2. .daw-channel — grid with upper=1fr (scrolls), mid+lower auto (fixed)
# ─────────────────────────────────────────────────────────────
old_channel = '.daw-channel { display:flex; flex-direction:column; align-items:center; background:#181e2d; border:1px solid #243048; border-radius:6px; cursor:pointer; flex-shrink:0; width:90px; min-width:90px; height:680px; min-height:680px; max-height:680px; padding-bottom:16px; overflow:visible; transition:border-color .15s, background .15s; }'

new_channel = """.daw-channel {
  display: grid;
  grid-template-rows:
    auto    /* colorbar */
    auto    /* header */
    auto    /* routing */
    1fr     /* ch-upper — scrolls, absorbs slack */
    auto    /* ch-mid — fixed */
    auto    /* ch-lower — fixed, always visible */
  ;
  background: #181e2d;
  border-top: 1px solid #243048;
  border-bottom: 1px solid #243048;
  border-right: 1px solid #243048;
  border-left: none;
  border-radius: 0;
  cursor: pointer;
  flex-shrink: 0;
  width: 90px;
  min-width: 90px;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  padding-bottom: 0;
  overflow: visible;
  transition: border-color .15s, background .15s;
}
.daw-console-scroll > .daw-channel:first-child {
  border-left: 1px solid #243048;
}"""

if old_channel not in text:
    print("✗ .daw-channel not found (expected original)")
    sys.exit(1)
text = text.replace(old_channel, new_channel)
print("✓ .daw-channel — 6-row grid, no rounded corners, shared borders")

# ─────────────────────────────────────────────────────────────
# 3. .daw-channel.master-channel — match new height, orange divider from tracks
# ─────────────────────────────────────────────────────────────
old_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:680px; min-height:680px; max-height:680px; padding-bottom:24px; overflow:visible; padding-bottom:8px; border-color:rgba(255,102,0,.3); }'
new_master = """.daw-channel.master-channel {
  width: 100px;
  min-width: 100px;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  padding-bottom: 0;
  overflow: visible;
  border-top-color: rgba(255,102,0,.3);
  border-bottom-color: rgba(255,102,0,.3);
  border-right-color: rgba(255,102,0,.3);
  border-left: 2px solid rgba(255,102,0,.4);
  margin-left: 6px;
}"""

if old_master not in text:
    print("✗ .daw-channel.master-channel not found")
    sys.exit(1)
text = text.replace(old_master, new_master)
print("✓ .daw-channel.master-channel — orange left divider, matches new height")

# ─────────────────────────────────────────────────────────────
# 4. Selected state — teal highlight without rounding
# ─────────────────────────────────────────────────────────────
old_selected = '.daw-channel.selected { border-color:var(--rs-teal); background:rgba(0,255,200,.12); }'
new_selected = '.daw-channel.selected { border-top-color:var(--rs-teal); border-bottom-color:var(--rs-teal); border-right-color:var(--rs-teal); background:rgba(0,255,200,.12); }'

if old_selected not in text:
    print("⚠ .daw-channel.selected not found — skipping (non-fatal)")
else:
    text = text.replace(old_selected, new_selected)
    print("✓ .daw-channel.selected — teal without rounding")

# ─────────────────────────────────────────────────────────────
# 5. .daw-ch-inserts — no fixed height, fills upper section
# ─────────────────────────────────────────────────────────────
old_inserts = '.daw-ch-inserts { padding:3px 4px; width:100%; height:140px; min-height:140px; max-height:140px; overflow-y:auto; flex-shrink:0; }'
new_inserts = """.daw-ch-inserts {
  padding: 4px;
  width: 100%;
  min-height: 0;
  background: #0a0f18;
}"""

if old_inserts not in text:
    print("✗ .daw-ch-inserts not found")
    sys.exit(1)
text = text.replace(old_inserts, new_inserts)
print("✓ .daw-ch-inserts — fills upper section, no fixed height")

# ─────────────────────────────────────────────────────────────
# 6. .daw-ch-sends — compact, same bg as inserts
# ─────────────────────────────────────────────────────────────
old_sends = '.daw-ch-sends { width:100%; padding:2px 4px; flex-shrink:0; height:60px; min-height:60px; max-height:60px; overflow:hidden; }'
new_sends = """.daw-ch-sends {
  width: 100%;
  padding: 4px;
  background: #0a0f18;
  border-top: 1px solid #1e2638;
}"""

if old_sends not in text:
    print("✗ .daw-ch-sends not found")
    sys.exit(1)
text = text.replace(old_sends, new_sends)
print("✓ .daw-ch-sends — compact, matches inserts bg")

# ─────────────────────────────────────────────────────────────
# 7. .daw-ch-fader-area — remove fixed height, fills naturally
# ─────────────────────────────────────────────────────────────
old_fader_area = '.daw-ch-fader-area { display:flex; flex-direction:column; align-items:center; padding:4px; width:100%; height:220px; min-height:220px; max-height:220px; flex-shrink:0;  }'
new_fader_area = """.daw-ch-fader-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  width: 100%;
  height: 220px;
  min-height: 220px;
  max-height: 220px;
  background: #13182a;
}"""

if old_fader_area not in text:
    print("✗ .daw-ch-fader-area not found")
    sys.exit(1)
text = text.replace(old_fader_area, new_fader_area)
print("✓ .daw-ch-fader-area — fixed 220px in lower section")

# ─────────────────────────────────────────────────────────────
# 8. NEW rules for ch-upper / ch-mid / ch-lower
#     Append at end so they override any conflicting earlier rules
# ─────────────────────────────────────────────────────────────
cubase_sections = """

/* ═══════════════════════════════════════════════════════════
   CUBASE 2-SECTION CHANNEL LAYOUT
   Upper = routing+inserts+sends, scrolls internally
   Mid+Lower = controls+fader+name, always fully visible
   Full-width split line between .ch-upper and .ch-mid
   ═══════════════════════════════════════════════════════════ */

/* UPPER — scrollable container for inserts + sends */
.ch-upper {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;           /* critical for 1fr grid row to shrink */
  overflow-y: auto;        /* SCROLLS when inserts overflow */
  overflow-x: hidden;
  background: #0a0f18;
  border-top: 1px solid #2a3d5a;
  border-bottom: 2px solid #00ffc866;  /* THE CUBASE SPLIT LINE — full-width across all channels */
}
.ch-upper::-webkit-scrollbar { width: 4px; }
.ch-upper::-webkit-scrollbar-track { background: #060a10; }
.ch-upper::-webkit-scrollbar-thumb { background: #243048; border-radius: 2px; }
.ch-upper::-webkit-scrollbar-thumb:hover { background: #3a4a5f; }

/* MID — fixed controls row (M/S/e/rec + pan), never scrolls */
.ch-mid {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex-shrink: 0;
  background: #13182a;
  padding: 2px 0;
}

/* LOWER — fixed fader + automation + name, ALWAYS fully visible */
.ch-lower {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex-shrink: 0;
  background: #13182a;
}

/* Remove any inherited margins inside wrappers */
.ch-upper > *,
.ch-mid > *,
.ch-lower > * {
  margin: 0;
}

/* Inserts inside .ch-upper — no independent scroll (parent handles it) */
.ch-upper .daw-ch-inserts {
  overflow: visible !important;
  height: auto !important;
  max-height: none !important;
  min-height: 0 !important;
  flex-shrink: 0;
}
/* Sends inside .ch-upper — no independent scroll */
.ch-upper .daw-ch-sends {
  overflow: visible !important;
  height: auto !important;
  max-height: none !important;
  flex-shrink: 0;
}
"""

text += cubase_sections
print("✓ Appended .ch-upper / .ch-mid / .ch-lower rules + split line")

# ─────────────────────────────────────────────────────────────
# Write
# ─────────────────────────────────────────────────────────────
PATH.write_text(text)
print(f"\n✓ Written: {PATH}")
print(f"  Size: {len(text)} bytes")
print(f"\nNext:")
print(f"  npm run build 2>&1 | tail -3")
print(f"\nRevert:")
print(f"  cp {backup} {PATH}")
