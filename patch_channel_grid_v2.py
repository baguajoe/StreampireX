#!/usr/bin/env python3
"""
patch_channel_grid_v2.py
────────────────────────
Cubase-style channel with 3 visible sections. No overflow:hidden (preserves insert picker).

Grid rows:
  HEADER  (auto x3)  — colorbar, header, routing
  TOP     (1fr)      — inserts, scrolls internally via min-height:0
  MID     (auto x3)  — controls, pan, sends
  BOTTOM  (220px+)   — fader-area pinned, automation, name

Visible section dividers via bright 2px borders at section boundaries.
"""
import sys
import shutil
from pathlib import Path

PATH = Path("src/front/styles/RecordingStudio.css")

if not PATH.exists():
    print(f"ERROR: {PATH} not found. Run from /workspaces/SpectraSphere")
    sys.exit(1)

text = PATH.read_text()
backup = PATH.with_suffix(PATH.suffix + ".bak_grid_v2")
shutil.copy(PATH, backup)
print(f"✓ Backup: {backup}")

# ─────────────────────────────────────────────────────────────
# 1. .daw-console-scroll — overflow-y hidden so channels fit pane
# ─────────────────────────────────────────────────────────────
old_console_scroll = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:2px; padding:8px 8px 32px; overflow-x:auto; overflow-y:auto; height:100%; background:#0c111c; }'
new_console_scroll = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:2px; padding:8px 8px 32px; overflow-x:auto; overflow-y:hidden; height:100%; background:#0c111c; }'

if old_console_scroll not in text:
    print("✗ .daw-console-scroll not found")
    sys.exit(1)
text = text.replace(old_console_scroll, new_console_scroll)
print("✓ .daw-console-scroll — vertical scroll off")

# ─────────────────────────────────────────────────────────────
# 2. .daw-channel — grid, NO overflow:hidden (keeps picker working)
# ─────────────────────────────────────────────────────────────
old_channel = '.daw-channel { display:flex; flex-direction:column; align-items:center; background:#181e2d; border:1px solid #243048; border-radius:6px; cursor:pointer; flex-shrink:0; width:90px; min-width:90px; height:680px; min-height:680px; max-height:680px; padding-bottom:16px; overflow:visible; transition:border-color .15s, background .15s; }'

new_channel = """.daw-channel {
  display: grid;
  grid-template-rows:
    auto    /* 1: colorbar */
    auto    /* 2: header (icon + num) */
    auto    /* 3: routing */
    1fr     /* 4: inserts — absorbs space, scrolls internally */
    auto    /* 5: controls (M/S/e/rec) */
    auto    /* 6: pan */
    auto    /* 7: sends */
    220px   /* 8: fader-area (fixed, pinned above automation) */
    auto    /* 9: automation (R/W) */
    auto    /* 10: name */
  ;
  background: #181e2d;
  border: 1px solid #243048;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  width: 90px;
  min-width: 90px;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  padding-bottom: 4px;
  overflow: visible;
  transition: border-color .15s, background .15s;
}"""

if old_channel not in text:
    print("✗ .daw-channel base rule not found")
    sys.exit(1)
text = text.replace(old_channel, new_channel)
print("✓ .daw-channel — grid, overflow:visible (picker preserved)")

# ─────────────────────────────────────────────────────────────
# 3. .daw-channel.master-channel
# ─────────────────────────────────────────────────────────────
old_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:680px; min-height:680px; max-height:680px; padding-bottom:24px; overflow:visible; padding-bottom:8px; border-color:rgba(255,102,0,.3); }'
new_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:100%; min-height:0; max-height:100%; padding-bottom:4px; overflow:visible; border-color:rgba(255,102,0,.3); }'

if old_master not in text:
    print("✗ .daw-channel.master-channel not found")
    sys.exit(1)
text = text.replace(old_master, new_master)
print("✓ .daw-channel.master-channel — height 100%")

# ─────────────────────────────────────────────────────────────
# 4. .daw-ch-inserts — min-height:0 for 1fr shrink, visible min 120px when content small
# ─────────────────────────────────────────────────────────────
old_inserts = '.daw-ch-inserts { padding:3px 4px; width:100%; height:140px; min-height:140px; max-height:140px; overflow-y:auto; flex-shrink:0; }'
new_inserts = """.daw-ch-inserts {
  padding: 6px 4px;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  border-top: 2px solid #2a3d5a;
  border-bottom: 2px solid #2a3d5a;
  background: #0a0f18;
}"""

if old_inserts not in text:
    print("✗ .daw-ch-inserts not found")
    sys.exit(1)
text = text.replace(old_inserts, new_inserts)
print("✓ .daw-ch-inserts — flex height, bright dividers, dark bg")

# ─────────────────────────────────────────────────────────────
# 5. .daw-ch-sends — compact with divider
# ─────────────────────────────────────────────────────────────
old_sends = '.daw-ch-sends { width:100%; padding:2px 4px; flex-shrink:0; height:60px; min-height:60px; max-height:60px; overflow:hidden; }'
new_sends = """.daw-ch-sends {
  width: 100%;
  padding: 3px 4px;
  max-height: 60px;
  overflow-y: auto;
  border-top: 1px solid #1e2638;
}"""

if old_sends not in text:
    print("✗ .daw-ch-sends not found")
    sys.exit(1)
text = text.replace(old_sends, new_sends)
print("✓ .daw-ch-sends — compact, divider")

# ─────────────────────────────────────────────────────────────
# 6. .daw-ch-fader-area — bright top divider separates MID from BOTTOM
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
  border-top: 2px solid #2a3d5a;
  background: #13182a;
}"""

if old_fader_area not in text:
    print("✗ .daw-ch-fader-area not found")
    sys.exit(1)
text = text.replace(old_fader_area, new_fader_area)
print("✓ .daw-ch-fader-area — 220px, bright top divider")

# Write
PATH.write_text(text)
print(f"\n✓ Written: {PATH}")
print(f"  Size: {len(text)} bytes")
print("\nNext:")
print("  npm run build 2>&1 | tail -3")
print(f"\nRevert if broken:")
print(f"  cp {backup} {PATH}")
