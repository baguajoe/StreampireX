#!/usr/bin/env python3
"""
patch_cubase_complete.py
────────────────────────
Complete Cubase-style mixer: correct split ratio + flex channel + divider + scrolling upper.

Changes:
  JSX:
    1. useState(50) → useState(35) for splitTopH (arrange gets 35%, mixer gets 65%)
  CSS:
    2. .daw-console-scroll: allow vertical scroll fallback if channels don't fit
    3. .daw-channel: flex column, height 100% of pane, no fixed 680px
    4. .daw-channel.master-channel: matches new height
    5. .daw-ch-inserts: no fixed height (parent .ch-upper handles size)
    6. .daw-ch-sends: no fixed height
    7. APPEND: .ch-upper scrolls + takes remaining space
    8. APPEND: .ch-mid fixed + divider above
    9. APPEND: .ch-lower fixed + always visible

Prerequisites: patch_cubase_jsx.py must have run (ch-upper/mid/lower wrappers exist)
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

if 'className="ch-upper"' not in js_text:
    print("✗ ch-upper wrappers not in JSX. Run patch_cubase_jsx.py first.")
    sys.exit(1)
if '.ch-upper' in css_text:
    print("✗ .ch-upper already in CSS. Revert first.")
    sys.exit(1)

js_backup = JS_PATH.with_suffix(JS_PATH.suffix + ".bak_complete")
css_backup = CSS_PATH.with_suffix(CSS_PATH.suffix + ".bak_complete")
shutil.copy(JS_PATH, js_backup)
shutil.copy(CSS_PATH, css_backup)
print(f"✓ Backups saved\n")

# ═════════════════════════════════════════════════════════════
# JSX: change default split ratio to give mixer more room
# ═════════════════════════════════════════════════════════════
old_split = 'const [splitTopH, setSplitTopH] = useState(50);'
new_split = 'const [splitTopH, setSplitTopH] = useState(35);'

if old_split not in js_text:
    print("⚠ splitTopH useState(50) not found — non-fatal, skipping")
else:
    js_text = js_text.replace(old_split, new_split, 1)
    print("✓ JSX: splitTopH default 50% → 35% (mixer gets 65%)")
    JS_PATH.write_text(js_text)
    print(f"✓ JSX written\n")

# ═════════════════════════════════════════════════════════════
# CSS: mixer structure
# ═════════════════════════════════════════════════════════════

# 1. .daw-console-scroll: channels stretch to pane height, vertical scroll fallback
old_console = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:2px; padding:8px 8px 32px; overflow-x:auto; overflow-y:auto; height:100%; background:#0c111c; }'
new_console = '.daw-console-scroll { display:flex; flex-direction:row; align-items:stretch; gap:2px; padding:8px 8px 32px; overflow-x:auto; overflow-y:auto; height:100%; min-height:0; background:#0c111c; }'
if old_console in css_text:
    css_text = css_text.replace(old_console, new_console)
    print("✓ CSS: .daw-console-scroll — min-height:0 for flex child")

# 2. .daw-channel: flex column, 100% height of pane
old_channel = '.daw-channel { display:flex; flex-direction:column; align-items:center; background:#181e2d; border:1px solid #243048; border-radius:6px; cursor:pointer; flex-shrink:0; width:90px; min-width:90px; height:680px; min-height:680px; max-height:680px; padding-bottom:16px; overflow:visible; transition:border-color .15s, background .15s; }'

new_channel = """.daw-channel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #181e2d;
  border: 1px solid #243048;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  width: 90px;
  min-width: 90px;
  height: 100%;
  min-height: 0;
  padding-bottom: 0;
  overflow: visible;
  transition: border-color .15s, background .15s;
}"""

if old_channel not in css_text:
    print("✗ .daw-channel base rule not found")
    sys.exit(1)
css_text = css_text.replace(old_channel, new_channel)
print("✓ CSS: .daw-channel — flex column, height:100%")

# 3. master channel match
old_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:680px; min-height:680px; max-height:680px; padding-bottom:24px; overflow:visible; padding-bottom:8px; border-color:rgba(255,102,0,.3); }'
new_master = '.daw-channel.master-channel { width:100px; min-width:100px; height:100%; min-height:0; padding-bottom:0; overflow:visible; border-color:rgba(255,102,0,.3); }'

if old_master not in css_text:
    print("✗ .daw-channel.master-channel not found")
    sys.exit(1)
css_text = css_text.replace(old_master, new_master)
print("✓ CSS: .daw-channel.master-channel — matches")

# 4. inserts: no internal scroll
old_inserts = '.daw-ch-inserts { padding:3px 4px; width:100%; height:140px; min-height:140px; max-height:140px; overflow-y:auto; flex-shrink:0; }'
new_inserts = '.daw-ch-inserts { padding:3px 4px; width:100%; flex-shrink:0; }'

if old_inserts not in css_text:
    print("✗ .daw-ch-inserts not found")
    sys.exit(1)
css_text = css_text.replace(old_inserts, new_inserts)
print("✓ CSS: .daw-ch-inserts — no fixed height")

# 5. sends: no fixed height
old_sends = '.daw-ch-sends { width:100%; padding:2px 4px; flex-shrink:0; height:60px; min-height:60px; max-height:60px; overflow:hidden; }'
new_sends = '.daw-ch-sends { width:100%; padding:2px 4px; flex-shrink:0; }'

if old_sends not in css_text:
    print("✗ .daw-ch-sends not found")
    sys.exit(1)
css_text = css_text.replace(old_sends, new_sends)
print("✓ CSS: .daw-ch-sends — no fixed height")

# 6. APPEND wrappers
append_css = """

/* ═══════════════════════════════════════════════════════════
   CUBASE 2-SECTION FLEX LAYOUT
   Upper scrolls (inserts + sends) — takes remaining space
   Lower always fully visible (M/S + fader + name) — fixed content
   Divider line above M/S (border-top on .ch-mid)
   ═══════════════════════════════════════════════════════════ */

.ch-upper {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0a0f18;
}
.ch-upper::-webkit-scrollbar { width: 4px; }
.ch-upper::-webkit-scrollbar-track { background: transparent; }
.ch-upper::-webkit-scrollbar-thumb { background: #243048; border-radius: 2px; }
.ch-upper::-webkit-scrollbar-thumb:hover { background: #3a4a5f; }

.ch-mid {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 0 0 auto;
  background: #13182a;
  border-top: 1px solid #4a6b8a;
}

.ch-lower {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 0 0 auto;
  background: #13182a;
}

.daw-ch-send-slot.empty {
  cursor: default;
  min-height: 16px;
}
"""

css_text += append_css
print("✓ CSS: .ch-upper / .ch-mid / .ch-lower appended with divider")

CSS_PATH.write_text(css_text)
print(f"✓ CSS written: {CSS_PATH}")

print(f"\nNext:")
print(f"  npm run build 2>&1 | tail -3")
print(f"\nRevert:")
print(f"  cp {js_backup} {JS_PATH}")
print(f"  cp {css_backup} {CSS_PATH}")
