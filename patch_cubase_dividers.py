#!/usr/bin/env python3
"""
patch_cubase_dividers.py
────────────────────────
Makes section dividers span full width across all channels (Cubase-style)
while keeping the SpectraSphere teal/orange/dark-blue palette.

Technique:
  - Remove gap between channels (was 2px → 0)
  - Remove rounded corners from individual channels (only outer mixer rounded)
  - Adjacent channel borders merge into single vertical lines
  - Horizontal section borders (inserts top, sends bottom, fader top) align across all channels
    because all channels share the same grid-template-rows

Keeps: teal/orange accents, dark blue bg, selected/armed states
Requires: patch_cubase_channels.py must have run first (builds on its grid structure)
"""
import sys
import shutil
from pathlib import Path

PATH = Path("src/front/styles/RecordingStudio.css")

if not PATH.exists():
    print(f"ERROR: {PATH} not found")
    sys.exit(1)

text = PATH.read_text()
backup = PATH.with_suffix(PATH.suffix + ".bak_dividers")
shutil.copy(PATH, backup)
print(f"✓ Backup: {backup}")

# ─────────────────────────────────────────────────────────────
# 1. .daw-console-scroll — remove gap between channels
# ─────────────────────────────────────────────────────────────
old_console = """.daw-console-scroll {
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

new_console = """.daw-console-scroll {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  padding: 8px 8px 32px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  background: #0c111c;
  --mixer-upper-h: 260px;
}"""

if old_console not in text:
    print("✗ .daw-console-scroll (post-cubase) not found — did you run patch_cubase_channels.py?")
    sys.exit(1)
text = text.replace(old_console, new_console)
print("✓ Removed gap between channels")

# ─────────────────────────────────────────────────────────────
# 2. .daw-channel — remove rounded corners, adjust borders to merge
# ─────────────────────────────────────────────────────────────
old_channel_open = """.daw-channel {
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

new_channel_open = """.daw-channel {
  display: grid;
  grid-template-rows:
    auto                       /* 1: colorbar */
    auto                       /* 2: header */
    auto                       /* 3: routing */
    var(--mixer-upper-h, 260px) /* 4: INSERTS (upper box — height driven by global var) */
    auto                       /* 5: SENDS */
    auto                       /* 6: controls M/S/e/rec */
    auto                       /* 7: pan */
    1fr                        /* 8: fader-area fills remaining */
    auto                       /* 9: automation */
    auto                       /* 10: name */
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
  padding-bottom: 4px;
  overflow: visible;
  transition: border-color .15s, background .15s;
}
.daw-console-scroll > .daw-channel:first-child {
  border-left: 1px solid #243048;
}
.daw-console-scroll > .daw-channel:first-child .daw-ch-colorbar {
  border-top-left-radius: 4px;
}
.daw-console-scroll > .daw-channel:last-child .daw-ch-colorbar {
  border-top-right-radius: 4px;
}"""

if old_channel_open not in text:
    print("✗ .daw-channel (post-cubase) not found")
    sys.exit(1)
text = text.replace(old_channel_open, new_channel_open)
print("✓ .daw-channel — no gaps, no rounded corners, shared borders")

# ─────────────────────────────────────────────────────────────
# 3. .daw-channel.master-channel — add subtle separator from track channels
# ─────────────────────────────────────────────────────────────
old_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:100%; min-height:0; max-height:100%; padding-bottom:4px; overflow:visible; border-color:rgba(255,102,0,.3); }'
new_master = """.daw-channel.master-channel {
  width: 100px;
  min-width: 100px;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  padding-bottom: 4px;
  overflow: visible;
  border-top-color: rgba(255,102,0,.3);
  border-bottom-color: rgba(255,102,0,.3);
  border-right-color: rgba(255,102,0,.3);
  border-left: 2px solid rgba(255,102,0,.4);
  margin-left: 6px;
}"""

if old_master not in text:
    print("✗ .daw-channel.master-channel (post-cubase) not found")
    sys.exit(1)
text = text.replace(old_master, new_master)
print("✓ .daw-channel.master-channel — orange left divider, gap from tracks")

# ─────────────────────────────────────────────────────────────
# 4. .daw-ch-inserts — border now goes full width (no per-channel gap)
# ─────────────────────────────────────────────────────────────
old_inserts = """.daw-ch-inserts {
  padding: 6px 4px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  border-top: 2px solid #2a3d5a;
  background: #0a0f18;
}"""

new_inserts = """.daw-ch-inserts {
  padding: 6px 4px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  border-top: 1px solid #2a3d5a;
  border-bottom: 1px solid #2a3d5a;
  background: #0a0f18;
}"""

if old_inserts not in text:
    print("✗ .daw-ch-inserts (post-cubase) not found")
    sys.exit(1)
text = text.replace(old_inserts, new_inserts)
print("✓ .daw-ch-inserts — matching 1px dividers top/bottom")

# ─────────────────────────────────────────────────────────────
# 5. .daw-ch-sends — remove thick teal border, use standard divider
# ─────────────────────────────────────────────────────────────
old_sends = """.daw-ch-sends {
  width: 100%;
  padding: 3px 4px;
  max-height: 60px;
  overflow-y: auto;
  border-top: 1px solid #1e2638;
  border-bottom: 3px solid #00ffc855;
  background: #0a0f18;
}"""

new_sends = """.daw-ch-sends {
  width: 100%;
  padding: 3px 4px;
  max-height: 60px;
  overflow-y: auto;
  border-bottom: 1px solid #2a3d5a;
  background: #0a0f18;
}"""

if old_sends not in text:
    print("✗ .daw-ch-sends (post-cubase) not found")
    sys.exit(1)
text = text.replace(old_sends, new_sends)
print("✓ .daw-ch-sends — standard divider, no thick teal line")

# ─────────────────────────────────────────────────────────────
# 6. .daw-ch-fader-area — thin divider
# ─────────────────────────────────────────────────────────────
old_fader = """.daw-ch-fader-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  width: 100%;
  min-height: 220px;
  height: 100%;
  background: #13182a;
}"""

new_fader = """.daw-ch-fader-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  width: 100%;
  min-height: 220px;
  height: 100%;
  border-top: 1px solid #2a3d5a;
  background: #13182a;
}"""

if old_fader not in text:
    print("✗ .daw-ch-fader-area (post-cubase) not found")
    sys.exit(1)
text = text.replace(old_fader, new_fader)
print("✓ .daw-ch-fader-area — thin divider above")

# ─────────────────────────────────────────────────────────────
# 7. Selected state — keep teal highlight but no rounded corners
# ─────────────────────────────────────────────────────────────
old_selected = '.daw-channel.selected { border-color:var(--rs-teal); background:rgba(0,255,200,.12); }'
new_selected = '.daw-channel.selected { border-top-color:var(--rs-teal); border-bottom-color:var(--rs-teal); border-right-color:var(--rs-teal); background:rgba(0,255,200,.12); }'

if old_selected not in text:
    print("⚠ .daw-channel.selected not found — skipping (non-fatal)")
else:
    text = text.replace(old_selected, new_selected)
    print("✓ .daw-channel.selected — teal highlight without rounding")

# ─────────────────────────────────────────────────────────────
# Write
# ─────────────────────────────────────────────────────────────
PATH.write_text(text)
print(f"\n✓ Written: {PATH}")
print(f"  Size: {len(text)} bytes")
print("\nNext:")
print("  npm run build 2>&1 | tail -3")
print(f"\nRevert:")
print(f"  cp {backup} {PATH}")
