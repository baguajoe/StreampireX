#!/usr/bin/env python3
"""
patch_spx3000_wirein.py
Wires SPX3000Tab into SamplerBeatMaker.js

Run from your Codespace:
  python3 /tmp/patch_spx3000_wirein.py
"""

import os, shutil, sys

TARGET = None
for candidate in [
    '/workspaces/SpectraSphere/src/components/DAW/SamplerBeatMaker.js',
]:
    if os.path.exists(candidate):
        TARGET = candidate
        break

if not TARGET:
    # Try to find it
    import subprocess
    result = subprocess.run(['find', '/workspaces', '-name', 'SamplerBeatMaker.js', '-not', '-path', '*/node_modules/*'], capture_output=True, text=True)
    found = result.stdout.strip().split('\n')
    found = [f for f in found if f]
    if found:
        TARGET = found[0]
    else:
        print("ERROR: SamplerBeatMaker.js not found. Edit TARGET path in this script.")
        sys.exit(1)

print(f"Found: {TARGET}")

# Backup
backup = TARGET + '.bak_spx3000'
shutil.copy2(TARGET, backup)
print(f"Backup: {backup}")

with open(TARGET, 'r') as f:
    src = f.read()

original = src
changes = 0

# ── STEP 1: Add import ──────────────────────────────────────────────────────
import_line = "import SPX3000Tab from '../SPX3000Tab';"

if "SPX3000Tab" not in src:
    # Insert after the last import line in the imports block
    # Find InstrumentBuilder import (last known import) and insert after it
    anchor = "import InstrumentBuilder from './InstrumentBuilder';"
    if anchor in src:
        src = src.replace(anchor, anchor + '\n' + import_line)
        changes += 1
        print("✓ Added SPX3000Tab import")
    else:
        # Fallback: insert after first import line
        lines = src.split('\n')
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        lines.insert(last_import_idx + 1, import_line)
        src = '\n'.join(lines)
        changes += 1
        print("✓ Added SPX3000Tab import (fallback position)")
else:
    print("– SPX3000Tab import already present, skipping")

# ── STEP 2: Add tab to nav ──────────────────────────────────────────────────
tab_entry = "          { id: 'spx3000', label: '🎛️ SPX3000', title: 'SPX3000 — MPC3000 engine, 12-bit DAC, 4 banks, 96 PPQN' },"

if "'spx3000'" not in src:
    # Insert after the 'beats' tab entry in the tabs array
    beats_tab = "          { id: 'beats', label: '🎹 Beat Maker', title: 'Step Sequencer, Patterns, Song Mode' },"
    if beats_tab in src:
        src = src.replace(beats_tab, beats_tab + '\n' + tab_entry)
        changes += 1
        print("✓ Added SPX3000 tab to nav")
    else:
        # Try shorter match
        for anchor in [
            "id: 'beats'",
            "id: \"beats\"",
        ]:
            if anchor in src:
                # Find the full line and insert after it
                lines = src.split('\n')
                for i, line in enumerate(lines):
                    if anchor in line and 'Beat Maker' in line:
                        lines.insert(i + 1, tab_entry)
                        src = '\n'.join(lines)
                        changes += 1
                        print("✓ Added SPX3000 tab to nav (line search)")
                        break
                break
        else:
            print("⚠ Could not find beats tab anchor — add manually:")
            print("  " + tab_entry)
else:
    print("– SPX3000 tab already in nav, skipping")

# ── STEP 3: Add render block ────────────────────────────────────────────────
render_block = """
        {/* ── SPX3000 TAB ── */}
        {activeTab === 'spx3000' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <SPX3000Tab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
            />
          </div>
        )}
"""

if "activeTab === 'spx3000'" not in src:
    # Insert after the beats tab render block
    # Look for the closing of the beats block
    beats_block_end = "        )}\n\n        {/* ── STEMS TAB ── */"
    if beats_block_end in src:
        src = src.replace(beats_block_end, "        )}\n" + render_block + "\n        {/* ── STEMS TAB ── */")
        changes += 1
        print("✓ Added SPX3000 render block")
    else:
        # Try alternative: insert before stems tab
        for anchor in [
            "        {/* ── STEMS TAB ── */}",
            "{activeTab === 'stems'",
            "activeTab === 'stems'",
        ]:
            if anchor in src:
                src = src.replace(anchor, render_block + '\n        ' + anchor.lstrip(), 1)
                changes += 1
                print("✓ Added SPX3000 render block (stems anchor)")
                break
        else:
            print("⚠ Could not find render anchor — add manually after the beats tab block:")
            print(render_block)
else:
    print("– SPX3000 render block already present, skipping")

# ── Write result ─────────────────────────────────────────────────────────────
if changes > 0:
    with open(TARGET, 'w') as f:
        f.write(src)
    print(f"\n✅ {changes} change(s) applied to {TARGET}")
    print(f"   Backup at {backup}")

    # Verify
    with open(TARGET, 'r') as f:
        verify = f.read()
    checks = [
        ("import SPX3000Tab", "import present"),
        ("'spx3000'", "tab in nav"),
        ("activeTab === 'spx3000'", "render block present"),
    ]
    print("\nVerification:")
    for needle, label in checks:
        status = "✓" if needle in verify else "✗ MISSING"
        print(f"  {status}  {label}")
else:
    print("\n✅ No changes needed — already wired in")
