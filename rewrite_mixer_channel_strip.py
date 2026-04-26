#!/usr/bin/env python3
"""
Full rewrite of mixer channel strip CSS — Cubase-style.

Strips every rule block touching:
  .daw-console-scroll, .daw-channel (+ variants), .ch-upper, .ch-mid,
  .ch-lower, .mixer-resize-handle

Appends one coherent block with no !important cascade.

ARCHITECTURE:
  .daw-channel (flex col, height:100%)
    ├── colorbar + header + routing   [fixed content height]
    ├── .ch-upper                     [user-draggable via --mixer-upper-h]
    ├── .mixer-resize-handle          [midline drag handle — still works]
    ├── .ch-mid (pan)                 [fixed]
    └── .ch-lower                     [flex 1 1 0 — absorbs remaining space]
        ├── controls (M/S/e)          [fixed]
        ├── .daw-ch-fader-area        [flex 1 1 0 — faders grow with pane]
        ├── automation (R/W)          [fixed]
        └── name + vol display        [fixed, pinned to bottom]

Run from repo root:
    python3 rewrite_mixer_channel_strip.py
"""
import os, re, shutil, sys
from datetime import datetime

CSS_PATH = "src/front/styles/RecordingStudio.css"

# Patterns for selectors whose rules should be stripped entirely
SELECTOR_PATTERNS = [
    r"^\.daw-console-scroll\b",
    r"^\.daw-channel\b",
    r"^\.ch-upper\b",
    r"^\.ch-mid\b",
    r"^\.ch-lower\b",
    r"^\.mixer-resize-handle\b",
]

def backup(path):
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    bak = f"{path}.bak_{stamp}"
    shutil.copy(path, bak)
    print(f"  backup: {bak}")
    return bak

def read(p):
    with open(p, "r", encoding="utf-8") as f: return f.read()

def write(p, c):
    with open(p, "w", encoding="utf-8") as f: f.write(c)

def strip_matching_rules(css):
    """
    Parse CSS and remove rule blocks whose selector list contains any of the
    target selectors. Preserves rules inside @media blocks untouched (rare).
    """
    result = []
    i = 0
    n = len(css)
    stripped = 0

    while i < n:
        # Find next '{'
        brace = css.find("{", i)
        if brace == -1:
            result.append(css[i:])
            break

        # Selector segment
        selector_start = i
        selector_text = css[i:brace]

        # Find matching '}' (handle nested braces for @media etc)
        depth = 1
        j = brace + 1
        while j < n and depth > 0:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        rule_end = j

        # Selector starts with @ — preserve as-is (don't try to parse)
        selector_stripped = selector_text.strip()
        if selector_stripped.startswith("@"):
            result.append(css[selector_start:rule_end])
            i = rule_end
            continue

        # Check if any target pattern matches any selector in the list
        selectors = [s.strip() for s in selector_stripped.split(",")]
        def matches_any(sel):
            return any(re.search(p, sel) for p in SELECTOR_PATTERNS)

        which_match = [matches_any(s) for s in selectors]

        if not any(which_match):
            # No match — keep rule
            result.append(css[selector_start:rule_end])
        elif all(which_match):
            # All selectors match — drop entire rule
            stripped += 1
        else:
            # Mixed — keep only non-matching selectors
            kept = [s for s, m in zip(selectors, which_match) if not m]
            body = css[brace:rule_end]
            # Preserve leading whitespace from original
            leading = re.match(r"\s*", css[selector_start:]).group(0)
            result.append(leading + ", ".join(kept) + " " + body.lstrip())
            stripped += 1

        i = rule_end

    return "".join(result), stripped


CLEAN_BLOCK = """

/* ═══════════════════════════════════════════════════════════════
   MIXER CHANNEL STRIP — Cubase-style layout (clean rewrite)
   Single source of truth. No !important cascade.
   ═══════════════════════════════════════════════════════════════ */

/* Console pane: horizontal scroll, channels stretch to full height */
.daw-console-scroll {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 2px;
  padding: 8px 8px 0;
  height: 100%;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  background: #0c111c;
}

/* Channel strip: flex column, fills console height */
.daw-channel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: relative;
  flex-shrink: 0;
  width: 92px;
  min-width: 92px;
  height: 100%;
  min-height: 0;
  padding: 0;
  background: #181e2d;
  border: 1px solid #243048;
  border-radius: 4px;
  cursor: pointer;
  overflow: visible;
  transition: border-color .15s, background .15s;
}
.daw-channel:hover { border-color: #2e3d5a; background: #1e263a; }
.daw-channel.selected { border-color: #00ffc8; background: rgba(0,255,200,.08); }
.daw-channel.armed { border-color: rgba(255,59,48,.6); }
.daw-channel.bus-channel { border-color: rgba(59,130,246,.4); }
.daw-channel.bus-channel.selected { border-color: #3b82f6; background: rgba(59,130,246,.08); }
.daw-channel.linked { box-shadow: 0 0 0 2px rgba(0,255,200,.6); }
.daw-channel.master-channel {
  width: 100px;
  min-width: 100px;
  margin-left: 4px;
  border-color: rgba(255,102,0,.3);
}
.daw-channel.master-channel.selected {
  border-color: #ff6600;
  background: rgba(255,102,0,.08);
}

/* FIXED top sections */
.daw-ch-colorbar,
.daw-ch-header,
.daw-ch-routing {
  flex: 0 0 auto;
}

/* TOP VARIABLE — inserts + sends, resized via midline handle */
.ch-upper {
  display: flex;
  flex-direction: column;
  flex: 0 0 var(--mixer-upper-h, 180px);
  min-height: 40px;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0a0f18;
}
.ch-upper::-webkit-scrollbar { width: 5px; }
.ch-upper::-webkit-scrollbar-thumb { background: #2a3648; border-radius: 2px; }
.ch-upper .daw-ch-inserts,
.ch-upper .daw-ch-sends {
  flex: 0 0 auto;
  width: 100%;
  padding: 4px 5px;
}

/* MIDLINE resize handle */
.mixer-resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  background: #4a4a4a;
  cursor: ns-resize;
  z-index: 20;
  transition: background 0.1s;
}
.mixer-resize-handle:hover,
.mixer-resize-handle.dragging {
  background: #00ffc8;
  box-shadow: 0 0 8px rgba(0,255,200,.5);
}

/* MID — pan knob, fixed content height */
.ch-mid {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  padding: 3px 0;
  background: #13182a;
}

/* BOTTOM — absorbs remaining space, contains fader + controls + label */
.ch-lower {
  flex: 1 1 0;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  padding-bottom: 3px;
  background: #13182a;
  overflow: visible;
}

/* Inside .ch-lower: only fader-area flexes, rest is fixed */
.ch-lower .daw-ch-controls,
.ch-lower .daw-ch-automation,
.ch-lower .daw-ch-name,
.ch-lower .daw-ch-vol-display {
  flex: 0 0 auto;
}

.ch-lower .daw-ch-fader-area {
  flex: 1 1 0;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 4px;
  overflow: visible;
}
"""


def main():
    if not os.path.exists(CSS_PATH):
        print(f"✗ not found: {CSS_PATH}")
        sys.exit(1)

    print(f"[rewrite] {CSS_PATH}")
    bak = backup(CSS_PATH)

    css = read(CSS_PATH)
    orig_len = len(css)

    css, stripped = strip_matching_rules(css)
    print(f"  ✓ stripped {stripped} rule block(s)")

    # Collapse excess blank lines
    css = re.sub(r"\n{4,}", "\n\n\n", css)

    # Append clean block at end
    css = css.rstrip() + CLEAN_BLOCK

    write(CSS_PATH, css)

    new_len = len(css)
    print(f"\n  before:  {orig_len:,} chars")
    print(f"  after:   {new_len:,} chars")
    print(f"  delta:   {new_len - orig_len:+,} chars")
    print(f"\n✓ DONE")
    print(f"\nTest:")
    print(f"  npm run build 2>&1 | tail -3")
    print(f"  (hard-refresh browser — Ctrl+Shift+R)")
    print(f"\nRollback:")
    print(f"  cp {bak} {CSS_PATH}")
    print(f"\nCommit if good:")
    print(f"  git add {CSS_PATH}")
    print(f"  git commit -m 'Mixer: rewrite channel strip CSS (Cubase-style)'")
    print(f"  git push origin main")


if __name__ == "__main__":
    main()
