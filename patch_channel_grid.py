#!/usr/bin/env python3
"""
patch_channel_grid.py
─────────────────────
Converts .daw-channel from flex-column to CSS Grid with 4 explicit rows:
  HEADER  (auto)  — colorbar, header, routing
  TOP     (1fr)   — inserts, scrolls internally when plugins overflow
  MID     (auto)  — controls (M/S/e/rec), pan, sends
  BOTTOM  (auto)  — fader-area, automation, name  [ALWAYS VISIBLE]

Cubase behavior:
  - Channel never scrolls as a whole
  - Fader + meter + R/W + name are PINNED at bottom regardless of insert count
  - Inserts area grows to fill available space, scrolls internally when full
  - No JSX changes — CSS only, grid row assignment by child class

Run from /workspaces/SpectraSphere:
  python3 /tmp/patch_channel_grid.py
"""
import sys
import shutil
from pathlib import Path

PATH = Path("src/front/styles/RecordingStudio.css")

if not PATH.exists():
    print(f"ERROR: {PATH} not found. Run from /workspaces/SpectraSphere")
    sys.exit(1)

text = PATH.read_text()
backup = PATH.with_suffix(PATH.suffix + ".bak_grid")
shutil.copy(PATH, backup)
print(f"✓ Backup saved: {backup}")

# ─────────────────────────────────────────────────────────────
# 1. REPLACE .daw-console-scroll to constrain channel heights
# ─────────────────────────────────────────────────────────────
old_console_scroll = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:2px; padding:8px 8px 32px; overflow-x:auto; overflow-y:auto; height:100%; background:#0c111c; }'
new_console_scroll = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:2px; padding:8px 8px 32px; overflow-x:auto; overflow-y:hidden; height:100%; background:#0c111c; }'

if old_console_scroll not in text:
    print("✗ Could not find .daw-console-scroll rule")
    sys.exit(1)
text = text.replace(old_console_scroll, new_console_scroll)
print("✓ Updated .daw-console-scroll (overflow-y hidden)")

# ─────────────────────────────────────────────────────────────
# 2. REPLACE .daw-channel from flex to grid
# ─────────────────────────────────────────────────────────────
old_channel = '.daw-channel { display:flex; flex-direction:column; align-items:center; background:#181e2d; border:1px solid #243048; border-radius:6px; cursor:pointer; flex-shrink:0; width:90px; min-width:90px; height:680px; min-height:680px; max-height:680px; padding-bottom:16px; overflow:visible; transition:border-color .15s, background .15s; }'

new_channel = """.daw-channel {
  display: grid;
  grid-template-rows:
    auto    /* colorbar */
    auto    /* header (icon + num) */
    auto    /* routing */
    1fr     /* inserts — absorbs space, scrolls internally */
    auto    /* controls (M/S/e/rec) */
    auto    /* pan */
    auto    /* sends */
    auto    /* fader-area (pinned) */
    auto    /* automation (R/W) */
    auto    /* name (pinned bottom) */
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
  padding-bottom: 8px;
  overflow: hidden;
  transition: border-color .15s, background .15s;
}"""

if old_channel not in text:
    print("✗ Could not find .daw-channel base rule")
    sys.exit(1)
text = text.replace(old_channel, new_channel)
print("✓ Converted .daw-channel to CSS Grid")

# ─────────────────────────────────────────────────────────────
# 3. REPLACE .daw-channel.master-channel (match height to 100%)
# ─────────────────────────────────────────────────────────────
old_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:680px; min-height:680px; max-height:680px; padding-bottom:24px; overflow:visible; padding-bottom:8px; border-color:rgba(255,102,0,.3); }'
new_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:100%; min-height:0; max-height:100%; padding-bottom:8px; overflow:hidden; border-color:rgba(255,102,0,.3); }'

if old_master not in text:
    print("✗ Could not find .daw-channel.master-channel rule")
    sys.exit(1)
text = text.replace(old_master, new_master)
print("✓ Updated .daw-channel.master-channel height")

# ─────────────────────────────────────────────────────────────
# 4. REPLACE .daw-ch-inserts — remove fixed height, enable flex scroll
# ─────────────────────────────────────────────────────────────
old_inserts = '.daw-ch-inserts { padding:3px 4px; width:100%; height:140px; min-height:140px; max-height:140px; overflow-y:auto; flex-shrink:0; }'
new_inserts = """.daw-ch-inserts {
  padding: 3px 4px;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  border-top: 1px solid #1e2638;
  border-bottom: 1px solid #1e2638;
  background: #0d1219;
}"""

if old_inserts not in text:
    print("✗ Could not find .daw-ch-inserts rule")
    sys.exit(1)
text = text.replace(old_inserts, new_inserts)
print("✓ Updated .daw-ch-inserts (scrolls internally, no fixed height)")

# ─────────────────────────────────────────────────────────────
# 5. REPLACE .daw-ch-sends — keep compact, add divider
# ─────────────────────────────────────────────────────────────
old_sends = '.daw-ch-sends { width:100%; padding:2px 4px; flex-shrink:0; height:60px; min-height:60px; max-height:60px; overflow:hidden; }'
new_sends = """.daw-ch-sends {
  width: 100%;
  padding: 2px 4px;
  max-height: 60px;
  overflow-y: auto;
  border-top: 1px solid #1e2638;
}"""

if old_sends not in text:
    print("✗ Could not find .daw-ch-sends rule")
    sys.exit(1)
text = text.replace(old_sends, new_sends)
print("✓ Updated .daw-ch-sends (compact, with divider)")

# ─────────────────────────────────────────────────────────────
# 6. REPLACE .daw-ch-fader-area — pin to bottom, keep fixed height
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
  border-top: 1px solid #1e2638;
  background: #181e2d;
}"""

if old_fader_area not in text:
    print("✗ Could not find .daw-ch-fader-area rule")
    sys.exit(1)
text = text.replace(old_fader_area, new_fader_area)
print("✓ Updated .daw-ch-fader-area (pinned bottom, divider on top)")

# ─────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────
PATH.write_text(text)
print(f"\n✓ Patched: {PATH}")
print(f"  Size: {len(text)} bytes")
print("\nNext steps:")
print("  1. cd /workspaces/SpectraSphere")
print("  2. npm run build 2>&1 | tail -3")
print("  3. Take a screenshot of the mixer view")
print("  4. If broken: cp", backup, PATH)
