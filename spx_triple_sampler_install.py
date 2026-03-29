#!/usr/bin/env python3
"""
spx_triple_sampler_install.py — Wire TripleSamplerTab into SamplerBeatMaker
Run from repo root: python3 spx_triple_sampler_install.py
"""
import os, sys, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
COMP = os.path.join(ROOT, "src", "front", "js", "component")
SBM  = os.path.join(COMP, "SamplerBeatMaker.js")
SRC  = os.path.join(ROOT, "TripleSamplerTab.js")
DST  = os.path.join(COMP, "TripleSamplerTab.js")

def check(p, label):
    if not os.path.exists(p):
        print(f"  ERROR: {label} not found: {p}"); sys.exit(1)
    print(f"  found: {label}")

print("\n── Checking files ──────────────────────────────────────────")
check(SBM, "SamplerBeatMaker.js"); check(SRC, "TripleSamplerTab.js")

# ── 1. Copy component ─────────────────────────────────────────────────────────
shutil.copy2(SRC, DST)
print(f"\n── Copied TripleSamplerTab.js → {DST}")

with open(SBM, "r") as f: src = f.read()
orig = src

# ── 2. Add import ─────────────────────────────────────────────────────────────
IMP_ANCHOR = "import SP1200Tab from './SP1200Tab';"
IMP_NEW    = "import SP1200Tab from './SP1200Tab';\nimport TripleSamplerTab from './TripleSamplerTab';"

if "TripleSamplerTab" not in src:
    src = src.replace(IMP_ANCHOR, IMP_NEW, 1)
    print("  added import")
else:
    print("  import already present")

# ── 3. Add tab to nav ─────────────────────────────────────────────────────────
TAB_ANCHOR = "{ id: 'stutter',    label: '⚡ Stutter',    title: 'Beat-Synced Stutter / Glitch FX — Gross Beat style' },"
TAB_NEW    = """{ id: 'stutter',    label: '⚡ Stutter',    title: 'Beat-Synced Stutter / Glitch FX — Gross Beat style' },
          { id: 'triple',     label: '🎚️ All 3',     title: 'SP-1200 + SPX3000 + Digital — unified 3-engine sampler with master clock' },"""

if "triple" not in src:
    src = src.replace(TAB_ANCHOR, TAB_NEW, 1)
    print("  added tab to nav")
else:
    print("  tab already present")

# ── 4. Add tab content ────────────────────────────────────────────────────────
CONTENT_ANCHOR = "{activeTab === 'spx3000' && ("
CONTENT_NEW    = """{activeTab === 'triple' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TripleSamplerTab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              sp1200Pads={null}
              spx3000Pads={null}
              digitalPads={pads}
            />
          </div>
        )}

        {activeTab === 'spx3000' && ("""

if "activeTab === 'triple'" not in src:
    src = src.replace(CONTENT_ANCHOR, CONTENT_NEW, 1)
    print("  added tab content")
else:
    print("  tab content already present")

# ── 5. Add Send to All 3 on SP1200/SPX3000 pads ──────────────────────────────
# Wire send button in sp1200 tab render — add prop
SP1200_ANCHOR = """<SP1200Tab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
            />"""
SP1200_NEW    = """<SP1200Tab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
              onSendToTriple={(padIdx, buffer, name) => {
                setActiveTab('triple');
              }}
            />"""

if "onSendToTriple" not in src:
    src = src.replace(SP1200_ANCHOR, SP1200_NEW, 1)
    print("  wired SP1200 onSendToTriple")
else:
    print("  SP1200 onSendToTriple already wired")

SPX3000_ANCHOR = """<SPX3000Tab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
            />"""
SPX3000_NEW   = """<SPX3000Tab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
              onSendToTriple={(padIdx, buffer, name) => {
                setActiveTab('triple');
              }}
            />"""

if "onSendToTriple" not in src or src.count("onSendToTriple") < 2:
    src = src.replace(SPX3000_ANCHOR, SPX3000_NEW, 1)
    print("  wired SPX3000 onSendToTriple")

# ── 6. Write ──────────────────────────────────────────────────────────────────
if src != orig:
    shutil.copy2(SBM, SBM + ".triple_bak")
    with open(SBM, "w") as f: f.write(src)
    print("\n  wrote patched SamplerBeatMaker.js")
else:
    print("\n  no changes needed")

print("\n── Done ────────────────────────────────────────────────────")
print("  TripleSamplerTab.js installed")
print("  'All 3' tab added to SamplerBeatMaker")
print("  SP1200 + SPX3000 + Digital pads unified")
print("  Master clock: SPX3000 96 PPQN")
print("  Mute/Solo per engine")
print("  Import buttons: pull pads from individual tabs")
print("\n  Next:")
print("    git add -A && git commit -m 'feat: All 3 unified sampler — SP1200 + SPX3000 + Digital with master clock'")
print("    git push")
