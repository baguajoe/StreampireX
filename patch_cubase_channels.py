#!/usr/bin/env python3
"""
patch_cubase_channels.py
────────────────────────
Cubase-style mixer: upper box (routing/inserts/sends) + lower box (controls/fader/name)
with ONE GLOBAL draggable divider that aligns all channels horizontally.

Approach:
  - CSS custom property --mixer-upper-h on .daw-console (default 260px)
  - Grid rows use that variable to size the upper section
  - Visual divider line shown via bright border at the split point
  - Drag handle added as a new DOM element in the mixer (one JSX change per mixer view)

For now: CSS only. Divider is visually fixed at 260px. Drag handle = next step after this works.
"""
import sys
import shutil
from pathlib import Path

PATH = Path("src/front/styles/RecordingStudio.css")

if not PATH.exists():
    print(f"ERROR: {PATH} not found")
    sys.exit(1)

text = PATH.read_text()
backup = PATH.with_suffix(PATH.suffix + ".bak_cubase")
shutil.copy(PATH, backup)
print(f"✓ Backup: {backup}")

# ─────────────────────────────────────────────────────────────
# 1. .daw-console-scroll — set CSS var for global upper height
# ─────────────────────────────────────────────────────────────
old_console_scroll = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:2px; padding:8px 8px 32px; overflow-x:auto; overflow-y:auto; height:100%; background:#0c111c; }'
new_console_scroll = """.daw-console-scroll {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 2px;
  padding: 8px 8px 32px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  background: #0c111c;
  --mixer-upper-h: 260px;
}"""

if old_console_scroll not in text:
    print("✗ .daw-console-scroll not found")
    sys.exit(1)
text = text.replace(old_console_scroll, new_console_scroll)
print("✓ .daw-console-scroll — CSS var --mixer-upper-h set")

# ─────────────────────────────────────────────────────────────
# 2. .daw-channel — grid with EXPLICIT upper/lower sections via CSS var
# ─────────────────────────────────────────────────────────────
old_channel = '.daw-channel { display:flex; flex-direction:column; align-items:center; background:#181e2d; border:1px solid #243048; border-radius:6px; cursor:pointer; flex-shrink:0; width:90px; min-width:90px; height:680px; min-height:680px; max-height:680px; padding-bottom:16px; overflow:visible; transition:border-color .15s, background .15s; }'

new_channel = """.daw-channel {
  display: grid;
  grid-template-rows:
    auto                       /* 1: colorbar */
    auto                       /* 2: header */
    auto                       /* 3: routing */
    var(--mixer-upper-h, 260px) /* 4: INSERTS (upper box — height driven by global var) */
    auto                       /* 5: SENDS (still in upper visually, uses own space) */
    auto                       /* 6: controls M/S/e/rec */
    auto                       /* 7: pan */
    1fr                        /* 8: fader-area fills remaining */
    auto                       /* 9: automation */
    auto                       /* 10: name */
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
    print("✗ .daw-channel not found")
    sys.exit(1)
text = text.replace(old_channel, new_channel)
print("✓ .daw-channel — grid with var-driven upper section")

# ─────────────────────────────────────────────────────────────
# 3. .daw-channel.master-channel
# ─────────────────────────────────────────────────────────────
old_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:680px; min-height:680px; max-height:680px; padding-bottom:24px; overflow:visible; padding-bottom:8px; border-color:rgba(255,102,0,.3); }'
new_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:100%; min-height:0; max-height:100%; padding-bottom:4px; overflow:visible; border-color:rgba(255,102,0,.3); }'

if old_master not in text:
    print("✗ .daw-channel.master-channel not found")
    sys.exit(1)
text = text.replace(old_master, new_master)
print("✓ .daw-channel.master-channel — matches new height")

# ─────────────────────────────────────────────────────────────
# 4. .daw-ch-inserts — no fixed height, fills the upper grid row, scrolls inside
# ─────────────────────────────────────────────────────────────
old_inserts = '.daw-ch-inserts { padding:3px 4px; width:100%; height:140px; min-height:140px; max-height:140px; overflow-y:auto; flex-shrink:0; }'
new_inserts = """.daw-ch-inserts {
  padding: 6px 4px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  border-top: 2px solid #2a3d5a;
  background: #0a0f18;
}"""

if old_inserts not in text:
    print("✗ .daw-ch-inserts not found")
    sys.exit(1)
text = text.replace(old_inserts, new_inserts)
print("✓ .daw-ch-inserts — fills upper row, scrolls internally")

# ─────────────────────────────────────────────────────────────
# 5. .daw-ch-sends — visible divider between upper and lower
# ─────────────────────────────────────────────────────────────
old_sends = '.daw-ch-sends { width:100%; padding:2px 4px; flex-shrink:0; height:60px; min-height:60px; max-height:60px; overflow:hidden; }'
new_sends = """.daw-ch-sends {
  width: 100%;
  padding: 3px 4px;
  max-height: 60px;
  overflow-y: auto;
  border-top: 1px solid #1e2638;
  border-bottom: 3px solid #00ffc855;
  background: #0a0f18;
}"""

if old_sends not in text:
    print("✗ .daw-ch-sends not found")
    sys.exit(1)
text = text.replace(old_sends, new_sends)
print("✓ .daw-ch-sends — bright bottom divider = section split line")

# ─────────────────────────────────────────────────────────────
# 6. .daw-ch-fader-area — flexible, fills lower section
# ─────────────────────────────────────────────────────────────
old_fader_area = '.daw-ch-fader-area { display:flex; flex-direction:column; align-items:center; padding:4px; width:100%; height:220px; min-height:220px; max-height:220px; flex-shrink:0;  }'
new_fader_area = """.daw-ch-fader-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  width: 100%;
  min-height: 220px;
  height: 100%;
  background: #13182a;
}"""

if old_fader_area not in text:
    print("✗ .daw-ch-fader-area not found")
    sys.exit(1)
text = text.replace(old_fader_area, new_fader_area)
print("✓ .daw-ch-fader-area — fills lower section")

# Write
PATH.write_text(text)
print(f"\n✓ Written: {PATH}")
print(f"  Size: {len(text)} bytes")
print("\nNext:")
print("  npm run build 2>&1 | tail -3")
print(f"\nRevert:")
print(f"  cp {backup} {PATH}")
