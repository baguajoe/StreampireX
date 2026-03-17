#!/usr/bin/env python3
"""
patch_home_imports.py
Run from: /workspaces/SpectraSphere  (after create_srcdoc_modules.py)

Replaces the 4 broken  src="/animations/..."  iframes in home.js
with  srcDoc={...SrcDoc}  and adds the 5 import statements.
"""
import os, shutil, sys

HOME = "/workspaces/SpectraSphere/src/front/js/pages/home.js"

if not os.path.exists(HOME):
    print(f"ERROR: {HOME} not found"); sys.exit(1)

shutil.copy(HOME, HOME + ".bak_srcdoc")
print(f"Backed up → {HOME}.bak_srcdoc")

src = open(HOME).read()

# ── 1. Add imports ──────────────────────────────────────────────────────────
OLD_IMPORT = 'import recordingStudioSrcDoc from "../component/recordingStudioSrcDoc";'
NEW_IMPORTS = (
    'import recordingStudioSrcDoc from "../component/recordingStudioSrcDoc";\n'
    'import djStudioSrcDoc from "../component/djStudioSrcDoc";\n'
    'import beatMakerSrcDoc from "../component/beatMakerSrcDoc";\n'
    'import podcastStudioSrcDoc from "../component/podcastStudioSrcDoc";\n'
    'import radioStationSrcDoc from "../component/radioStationSrcDoc";\n'
    'import videoEditorSrcDoc from "../component/videoEditorSrcDoc";'
)

if OLD_IMPORT in src:
    if 'djStudioSrcDoc' not in src:
        src = src.replace(OLD_IMPORT, NEW_IMPORTS, 1)
        print("  ✓ Added 5 new import lines")
    else:
        print("  ℹ Imports already present — skipping")
else:
    print("  ⚠ Could not find recordingStudioSrcDoc import anchor")
    sys.exit(1)

# ── 2. Patch the 4 broken iframes ──────────────────────────────────────────
PATCHES = [
    # DJ Studio
    (
        'src="/animations/dj_studio.html"',
        'srcDoc={djStudioSrcDoc}'
    ),
    # Beat Maker DAW  (two possible whitespace variants)
    (
        'src="/animations/beat_maker_daw.html"',
        'srcDoc={beatMakerSrcDoc}'
    ),
    # Podcast Studio
    (
        'src="/animations/podcast_studio.html"',
        'srcDoc={podcastStudioSrcDoc}'
    ),
    # Radio Station
    (
        'src="/animations/radio_station.html"',
        'srcDoc={radioStationSrcDoc}'
    ),
    # Video Editor
    (
        'src="/animations/video_editor.html"',
        'srcDoc={videoEditorSrcDoc}'
    ),
]

total = 0
for old, new in PATCHES:
    if old in src:
        src = src.replace(old, new, 1)
        total += 1
        print(f"  ✓ Patched: {old}")
    else:
        print(f"  ⚠ NOT FOUND (may already be patched or path differs): {old}")

open(HOME, "w").write(src)
print(f"\nDone — {total}/5 iframes patched. home.js saved.")
print("Next: git add -A && git commit -m 'fix: replace animation src= iframes with srcDoc= to prevent route hijacking'")
