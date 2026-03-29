#!/usr/bin/env python3
"""
spx_plugins_install2.py — SPX Round 2: EQ Suite + Creative Plugins + Stutter Tab
Drop in repo root alongside SPXPlugins_EQ.js and SPXPlugins_Creative.js
Run: python3 spx_plugins_install2.py
"""
import os, sys, shutil, re

ROOT   = os.path.dirname(os.path.abspath(__file__))
COMP   = os.path.join(ROOT, "src", "front", "js", "component")
RS     = os.path.join(ROOT, "src", "front", "js", "pages", "RecordingStudio.js")
SBM    = os.path.join(ROOT, "src", "front", "js", "component", "SamplerBeatMaker.js")
SPX    = os.path.join(COMP, "SPXPlugins.js")
EQ_SRC = os.path.join(ROOT, "SPXPlugins_EQ.js")
CR_SRC = os.path.join(ROOT, "SPXPlugins_Creative.js")

def check(p, label):
    if not os.path.exists(p):
        print(f"  ERROR: {label} not found: {p}"); sys.exit(1)
    print(f"  found: {label}")

print("\n── Checking files ──────────────────────────────────────────")
check(COMP, "component dir"); check(RS, "RecordingStudio.js")
check(SBM, "SamplerBeatMaker.js"); check(SPX, "SPXPlugins.js")
check(EQ_SRC, "SPXPlugins_EQ.js"); check(CR_SRC, "SPXPlugins_Creative.js")

# ── 1. Copy new plugin files ──────────────────────────────────────────────────
print("\n── Copying plugin files ────────────────────────────────────")
for src, name in [(EQ_SRC, "SPXPlugins_EQ.js"), (CR_SRC, "SPXPlugins_Creative.js")]:
    dst = os.path.join(COMP, name)
    shutil.copy2(src, dst)
    print(f"  copied → {dst}")

# ── 2. Patch SPXPlugins.js — add imports + new registry entries ───────────────
print("\n── Patching SPXPlugins.js ──────────────────────────────────")
with open(SPX, "r", encoding="utf-8") as f:
    spx = f.read()
spx_orig = spx

# Add imports at top if not present
EQ_IMPORT = "import { PultecForgeUI, DynamicEQUI, GraphicEQUI, TiltEQUI, BaxandallEQUI, EQ_FX_ADDITIONS } from './SPXPlugins_EQ';"
CR_IMPORT = "import { VocoderSPXUI, GranularFreezeUI, NoiseReductionUI, RingModUI, FormantFilterUI, SpectrumAnalyzerUI, CREATIVE_FX_ADDITIONS } from './SPXPlugins_Creative';"

if EQ_IMPORT not in spx:
    # Insert after the first import line
    first_import_end = spx.find("\n", spx.find("import ")) + 1
    spx = spx[:first_import_end] + EQ_IMPORT + "\n" + CR_IMPORT + "\n" + spx[first_import_end:]
    print("  added EQ + Creative imports")
else:
    print("  imports already present")

# Extend ALL_FX_EXTENDED array — add new entries before closing ];
OLD_END = "  { key: \"harmonicSum\",     name: \"HarmonicSum\",   type: \"distortion\", component: \"HarmonicSumUI\"  },\n];"
NEW_END = """  { key: "harmonicSum",     name: "HarmonicSum",   type: "distortion", component: "HarmonicSumUI"  },
  // ── SPX EQ SUITE ──
  { key: "pultecForge",    name: "PultecForge",   type: "eq",         component: "PultecForgeUI"   },
  { key: "dynamicEQ",      name: "DynamicEQ",     type: "eq",         component: "DynamicEQUI"     },
  { key: "graphicEQ",      name: "GraphicEQ",     type: "eq",         component: "GraphicEQUI"     },
  { key: "tiltEQ",         name: "TiltEQ",        type: "eq",         component: "TiltEQUI"        },
  { key: "baxandallEQ",    name: "BaxandallEQ",   type: "eq",         component: "BaxandallEQUI"   },
  // ── SPX CREATIVE ──
  { key: "vocoderSPX",     name: "VocoderSPX",    type: "filter",     component: "VocoderSPXUI"    },
  { key: "granularFreeze", name: "GranularFreeze",type: "reverb",     component: "GranularFreezeUI" },
  { key: "noiseReduction", name: "NoiseRedux",    type: "filter",     component: "NoiseReductionUI" },
  { key: "ringMod",        name: "RingMod",       type: "distortion", component: "RingModUI"        },
  { key: "formantFilter",  name: "FormantFilter", type: "filter",     component: "FormantFilterUI"  },
  { key: "spectrumAnalyzer",name:"SpectrumAnalyzer",type:"eq",        component:"SpectrumAnalyzerUI"},
];"""

if "pultecForge" not in spx:
    if OLD_END in spx:
        spx = spx.replace(OLD_END, NEW_END)
        print("  extended ALL_FX_EXTENDED with 11 new plugins")
    else:
        print("  WARNING: could not find ALL_FX_EXTENDED end anchor")
else:
    print("  ALL_FX_EXTENDED already extended")

# Extend COMPONENT_MAP
OLD_MAP = "  GainRiderUI, HarmonicSumUI,\n};"
NEW_MAP = """  GainRiderUI, HarmonicSumUI,
  // EQ Suite
  PultecForgeUI, DynamicEQUI, GraphicEQUI, TiltEQUI, BaxandallEQUI,
  // Creative
  VocoderSPXUI, GranularFreezeUI, NoiseReductionUI, RingModUI, FormantFilterUI, SpectrumAnalyzerUI,
};"""

if "PultecForgeUI" not in spx:
    if OLD_MAP in spx:
        spx = spx.replace(OLD_MAP, NEW_MAP)
        print("  extended COMPONENT_MAP")
    else:
        print("  WARNING: could not find COMPONENT_MAP end anchor")
else:
    print("  COMPONENT_MAP already extended")

if spx != spx_orig:
    shutil.copy2(SPX, SPX + ".bak")
    with open(SPX, "w", encoding="utf-8") as f:
        f.write(spx)
    print("  wrote patched SPXPlugins.js")

# ── 3. Patch RecordingStudio.js insert picker — add new groups ────────────────
print("\n── Patching RecordingStudio.js picker ──────────────────────")
with open(RS, "r", encoding="utf-8") as f:
    rs = f.read()
rs_orig = rs

OLD_MASTERING_END = """              {
                cat: "SPX Mastering",
                items: [
                  { key: "masterWall",      name: "MasterWall"      },
                  { key: "stereoForge",     name: "StereoForge"     },
                  { key: "loudnessMeter",   name: "LoudnessMeter"   },
                  { key: "harmonicExcite",  name: "HarmonicExcite"  },
                  { key: "vinylPress",      name: "VinylPress"      },
                  { key: "ditherForge",     name: "DitherForge"     },
                  { key: "dcBlock",         name: "DCBlock"         },
                  { key: "spaceForge",      name: "SpaceForge"      },
                  { key: "vortexMod",       name: "VortexMod"       },
                  { key: "gainRider",       name: "GainRider"       },
                  { key: "harmonicSum",     name: "HarmonicSum"     },
                ],
              },
            ].map((group) => ("""

NEW_MASTERING_END = """              {
                cat: "SPX Mastering",
                items: [
                  { key: "masterWall",      name: "MasterWall"      },
                  { key: "stereoForge",     name: "StereoForge"     },
                  { key: "loudnessMeter",   name: "LoudnessMeter"   },
                  { key: "harmonicExcite",  name: "HarmonicExcite"  },
                  { key: "vinylPress",      name: "VinylPress"      },
                  { key: "ditherForge",     name: "DitherForge"     },
                  { key: "dcBlock",         name: "DCBlock"         },
                  { key: "spaceForge",      name: "SpaceForge"      },
                  { key: "vortexMod",       name: "VortexMod"       },
                  { key: "gainRider",       name: "GainRider"       },
                  { key: "harmonicSum",     name: "HarmonicSum"     },
                ],
              },
              {
                cat: "SPX EQ Suite",
                items: [
                  { key: "pultecForge",   name: "PultecForge"  },
                  { key: "dynamicEQ",     name: "DynamicEQ"    },
                  { key: "graphicEQ",     name: "GraphicEQ"    },
                  { key: "tiltEQ",        name: "TiltEQ"       },
                  { key: "baxandallEQ",   name: "BaxandallEQ"  },
                ],
              },
              {
                cat: "SPX Creative",
                items: [
                  { key: "vocoderSPX",     name: "VocoderSPX"     },
                  { key: "granularFreeze", name: "GranularFreeze" },
                  { key: "noiseReduction", name: "NoiseRedux"     },
                  { key: "ringMod",        name: "RingMod"        },
                  { key: "formantFilter",  name: "FormantFilter"  },
                  { key: "spectrumAnalyzer",name:"SpectrumAnalyzer"},
                ],
              },
            ].map((group) => ("""

if "SPX EQ Suite" not in rs:
    if OLD_MASTERING_END in rs:
        rs = rs.replace(OLD_MASTERING_END, NEW_MASTERING_END)
        print("  added SPX EQ Suite + Creative groups to picker")
    else:
        print("  WARNING: could not find mastering group anchor in picker")
else:
    print("  picker already has EQ Suite + Creative groups")

if rs != rs_orig:
    shutil.copy2(RS, RS + ".bak2")
    with open(RS, "w", encoding="utf-8") as f:
        f.write(rs)
    print("  wrote patched RecordingStudio.js")

# ── 4. Patch SamplerBeatMaker.js — add Stutter tab ───────────────────────────
print("\n── Patching SamplerBeatMaker.js — Stutter tab ──────────────")
with open(SBM, "r", encoding="utf-8") as f:
    sbm = f.read()
sbm_orig = sbm

# Add import
STUTTER_IMPORT = "import StutterEngine from './StutterEngine';"
if STUTTER_IMPORT not in sbm:
    # Find last import line and add after
    last_import = sbm.rfind("\nimport ")
    end_of_import = sbm.find("\n", last_import + 1)
    sbm = sbm[:end_of_import+1] + STUTTER_IMPORT + "\n" + sbm[end_of_import+1:]
    print("  added StutterEngine import")
else:
    print("  StutterEngine import already present")

# Add tab to tab array — after instrument tab entry
OLD_INSTRUMENT_TAB = "          { id: 'instrument', label: '🎸 Instrument', title: 'Custom Instrument Builder' },"
NEW_INSTRUMENT_TAB = """          { id: 'instrument', label: '🎸 Instrument', title: 'Custom Instrument Builder' },
          { id: 'stutter',    label: '⚡ Stutter',    title: 'Beat-Synced Stutter / Glitch FX — Gross Beat style' },"""

if "'stutter'" not in sbm:
    if OLD_INSTRUMENT_TAB in sbm:
        sbm = sbm.replace(OLD_INSTRUMENT_TAB, NEW_INSTRUMENT_TAB)
        print("  added Stutter tab to tab array")
    else:
        print("  WARNING: could not find instrument tab anchor")
else:
    print("  Stutter tab already in array")

# Add Stutter tab content — find the instrument tab content block and add after it
# Look for the closing of the sampler-content-wrapper div which is after all tab content
OLD_WRAPPER_END = "      </div>\n    </div>\n  );\n}"

# Find where to insert stutter content — after the last activeTab block before wrapper end
# We insert before the closing of sampler-content-wrapper
STUTTER_CONTENT = """
        {/* ── STUTTER TAB ── */}
        {activeTab === 'stutter' && (
          <StutterEngine
            audioContext={ctxRef.current}
            audioBuffer={pads[selectedPad || 0]?.buffer || null}
            outputNode={ctxRef.current?.destination}
            bpm={bpm}
            trackName={pads[selectedPad || 0]?.name || 'Select a Pad'}
            onClose={() => setActiveTab('beats')}
            isEmbedded={true}
          />
        )}
"""

if "activeTab === 'stutter'" not in sbm:
    # Find the closing of sampler-content-wrapper
    anchor = "      </div>\n    </div>\n  );\n}"
    if anchor in sbm:
        sbm = sbm.replace(anchor, STUTTER_CONTENT + anchor, 1)
        print("  added Stutter tab content")
    else:
        # Try alternative closing pattern
        anchor2 = "    </div>\n  );\n}"
        if anchor2 in sbm:
            sbm = sbm.replace(anchor2, STUTTER_CONTENT + anchor2, 1)
            print("  added Stutter tab content (alt anchor)")
        else:
            print("  WARNING: could not find content anchor for stutter tab — add manually")
else:
    print("  Stutter tab content already present")

if sbm != sbm_orig:
    shutil.copy2(SBM, SBM + ".bak")
    with open(SBM, "w", encoding="utf-8") as f:
        f.write(sbm)
    print("  wrote patched SamplerBeatMaker.js")

print("\n── Done ────────────────────────────────────────────────────")
print("  Total new plugins: 11 (5 EQ + 6 Creative)")
print("  Stutter tab: wired into SamplerBeatMaker")
print("\n  Next:")
print("    npm run build 2>&1 | tail -20")
print("    git add -A && git commit -m 'feat: EQ suite, vocoder, stutter tab, creative plugins'")
print("    git push")
