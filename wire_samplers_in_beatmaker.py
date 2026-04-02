#!/usr/bin/env python3
"""
Wire Looperman + Freesound as tabs inside SamplerBeatMaker
"""

TARGET = "/workspaces/SpectraSphere/src/front/js/component/SamplerBeatMaker.js"

with open(TARGET, 'r') as f:
    code = f.read()

# ─── 1. Add imports at top ────────────────────────────────────────────────────
OLD_IMPORT = "import React, {"
NEW_IMPORT = """import LoopermanBrowser from './LoopermanBrowser';
import FreesoundBrowser from './FreesoundBrowser';
import React, {"""

if 'LoopermanBrowser' not in code:
    code = code.replace(OLD_IMPORT, NEW_IMPORT, 1)
    print("✅ Imports added")
else:
    print("⏭  Imports already present")

# ─── 2. Add tabs to tab array ─────────────────────────────────────────────────
OLD_TAB = "          { id: 'triple',     label: '🎚️ All 3',     title: 'SP-1200 + SPX3000 + Digital — unified 3-engine sampler with master clock' },"
NEW_TAB = """          { id: 'triple',     label: '🎚️ All 3',     title: 'SP-1200 + SPX3000 + Digital — unified 3-engine sampler with master clock' },
          { id: 'looperman',  label: '🎵 Loops',      title: 'Looperman — Free loops & acapellas' },
          { id: 'freesound',  label: '🔊 Sounds',     title: 'Freesound — Search & load free samples onto pads' },"""

if 'looperman' not in code:
    code = code.replace(OLD_TAB, NEW_TAB)
    print("✅ Tab buttons added")
else:
    print("⏭  Tab buttons already present")

# ─── 3. Add content panels ────────────────────────────────────────────────────
OLD_STEMS = "        {activeTab === 'stems' && ("
NEW_PANELS = """        {activeTab === 'looperman' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <LoopermanBrowser
              onLoadSample={(url, name) => {
                const pi = selectedPad !== null ? selectedPad : 0;
                loadSample(pi, url);
              }}
            />
          </div>
        )}
        {activeTab === 'freesound' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <FreesoundBrowser
              onLoadSample={(url, name, blob) => {
                const pi = selectedPad !== null ? selectedPad : 0;
                loadSample(pi, blob || url);
              }}
            />
          </div>
        )}
        {activeTab === 'stems' && ("""

if "activeTab === 'looperman'" not in code:
    code = code.replace(OLD_STEMS, NEW_PANELS)
    print("✅ Content panels added")
else:
    print("⏭  Content panels already present")

with open(TARGET, 'w') as f:
    f.write(code)

print("""
✅ Done — Looperman + Freesound wired into SamplerBeatMaker tabs

Now commit everything:
  git add -A && git commit -m "feat: Looperman + Freesound tabs inside SamplerBeatMaker, cleanup copyrighted kits" && git push
""")
