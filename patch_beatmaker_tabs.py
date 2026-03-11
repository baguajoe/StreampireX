#!/usr/bin/env python3
"""
patch_beatmaker_tabs.py
Adds SynthCreator, DrumDesigner, InstrumentBuilder as tabs in SamplerBeatMaker.js

Run from: /workspaces/SpectraSphere
  python3 /tmp/patch_beatmaker_tabs.py
"""

import os
import shutil

REPO   = "/workspaces/SpectraSphere"
TARGET = os.path.join(REPO, "src/front/js/component/SamplerBeatMaker.js")

def ok(m):   print(f"  ✅  {m}")
def warn(m): print(f"  ⚠️   {m}")
def err(m):  print(f"  ❌  {m}"); exit(1)

if not os.path.exists(TARGET):
    err(f"SamplerBeatMaker.js not found at {TARGET}")

with open(TARGET, "r", encoding="utf-8") as f:
    src = f.read()

original = src

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1 — Imports
# ─────────────────────────────────────────────────────────────────────────────

IMPORT_ANCHOR = "import StemSeparatorTab from './tabs/StemSeparatorTab';"
NEW_IMPORTS = """import StemSeparatorTab from './tabs/StemSeparatorTab';
import SynthCreator from './SynthCreator';
import DrumDesigner from './DrumDesigner';
import InstrumentBuilder from './InstrumentBuilder';"""

if "import SynthCreator" in src:
    warn("Imports already present — skipping")
elif IMPORT_ANCHOR not in src:
    warn(f"Import anchor not found: {IMPORT_ANCHOR!r} — skipping import patch")
else:
    src = src.replace(IMPORT_ANCHOR, NEW_IMPORTS)
    ok("Imports added")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 2 — Add 3 tabs to the tab nav array
# ─────────────────────────────────────────────────────────────────────────────

TAB_ANCHOR = "          { id: 'stems', label: '✂️ Stems', title: 'AI Stem Separator' },"

NEW_TABS = """          { id: 'stems', label: '✂️ Stems', title: 'AI Stem Separator' },
          { id: 'synth', label: '🎛️ Synth', title: 'Synth Creator — Build sounds from oscillators' },
          { id: 'drumdesign', label: '🥁 Drum Design', title: 'Drum Designer — Synthesize kick, 808, snare, clap, hi-hat' },
          { id: 'instrbuilder', label: '🎸 Instr Build', title: 'Instrument Builder — Layer synth, sample, sub, noise' },"""

if "id: 'synth'" in src:
    warn("Tab nav entries already present — skipping")
elif TAB_ANCHOR not in src:
    warn(f"Tab nav anchor not found — skipping tab nav patch")
else:
    src = src.replace(TAB_ANCHOR, NEW_TABS)
    ok("Tab nav entries added")

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 3 — Render blocks (after the stems tab render block)
# ─────────────────────────────────────────────────────────────────────────────

RENDER_ANCHOR = """        {/* ── STEMS TAB ── */}
        {activeTab === 'stems' && (
          <StemSeparatorTab
            engine={{
              loadBufferToPad: (pi, buffer, name) => {
                setPads(p => {
                  const u = [...p];
                  u[pi] = { ...u[pi], buffer, name: name || `Stem ${pi + 1}`, trimEnd: buffer.duration };
                  return u;
                });
              },
            }}
          />
        )}"""

NEW_RENDER = """        {/* ── STEMS TAB ── */}
        {activeTab === 'stems' && (
          <StemSeparatorTab
            engine={{
              loadBufferToPad: (pi, buffer, name) => {
                setPads(p => {
                  const u = [...p];
                  u[pi] = { ...u[pi], buffer, name: name || `Stem ${pi + 1}`, trimEnd: buffer.duration };
                  return u;
                });
              },
            }}
          />
        )}

        {/* ── SYNTH CREATOR TAB ── */}
        {activeTab === 'synth' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            <SynthCreator
              onClose={() => setActiveTab('beats')}
              onAssignToPad={(preset) => {
                setActiveTab('beats');
                setStatus && setStatus(`🎛️ Synth "${preset.name}" ready — export WAV to load into a pad`);
              }}
            />
          </div>
        )}

        {/* ── DRUM DESIGNER TAB ── */}
        {activeTab === 'drumdesign' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            <DrumDesigner
              onClose={() => setActiveTab('beats')}
              onAssignToPad={({ type, params }) => {
                setStatus && setStatus(`🥁 ${type.toUpperCase()} designed — download WAV and drag to a pad`);
              }}
            />
          </div>
        )}

        {/* ── INSTRUMENT BUILDER TAB ── */}
        {activeTab === 'instrbuilder' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            <InstrumentBuilder
              onClose={() => setActiveTab('beats')}
              onAssignToTrack={() => {
                setActiveTab('beats');
              }}
            />
          </div>
        )}"""

if "activeTab === 'synth'" in src:
    warn("Render blocks already present — skipping")
elif RENDER_ANCHOR not in src:
    warn("Stems render block anchor not found — skipping render patch")
else:
    src = src.replace(RENDER_ANCHOR, NEW_RENDER)
    ok("Render blocks added")

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────

if src == original:
    warn("No changes made — all patches already applied or anchors not found")
else:
    backup = TARGET + ".pre_beatmaker_tabs.bak"
    shutil.copy2(TARGET, backup)
    ok(f"Backup saved: SamplerBeatMaker.js.pre_beatmaker_tabs.bak")
    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(src)
    ok("SamplerBeatMaker.js updated")

print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Done! Now run:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  grep -n "synth\\|drumdesign\\|instrbuilder" src/front/js/component/SamplerBeatMaker.js

  git add -A
  git commit -m "feat: add Synth, Drum Design, Instr Build tabs to Beat Maker"
  git push
""")
