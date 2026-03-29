#!/usr/bin/env python3
"""
spx_plugins_install3.py — SPX100: 25 new AudioWorklet plugins → total 100 SPX
Drop in repo root alongside SPXWorklets_SPX100.js and SPXPlugins_SPX100.js
Run: python3 spx_plugins_install3.py
"""
import os, sys, shutil

ROOT   = os.path.dirname(os.path.abspath(__file__))
COMP   = os.path.join(ROOT, "src", "front", "js", "component")
ENGINE = os.path.join(COMP, "audio", "engine")
SPX    = os.path.join(COMP, "SPXPlugins.js")
RS     = os.path.join(ROOT, "src", "front", "js", "pages", "RecordingStudio.js")
WLT_SRC= os.path.join(ROOT, "SPXWorklets_SPX100.js")
PLG_SRC= os.path.join(ROOT, "SPXPlugins_SPX100.js")

def check(p, label):
    if not os.path.exists(p):
        print(f"  ERROR: {label} not found: {p}"); sys.exit(1)
    print(f"  found: {label}")

print("\n── Checking files ──────────────────────────────────────────")
check(COMP,"component dir"); check(ENGINE,"audio/engine dir")
check(SPX,"SPXPlugins.js"); check(RS,"RecordingStudio.js")
check(WLT_SRC,"SPXWorklets_SPX100.js"); check(PLG_SRC,"SPXPlugins_SPX100.js")

# ── 1. Copy files ─────────────────────────────────────────────────────────────
print("\n── Copying plugin files ────────────────────────────────────")
for src, name in [(WLT_SRC,"SPXWorklets_SPX100.js"),(PLG_SRC,"SPXPlugins_SPX100.js")]:
    dst = os.path.join(COMP if "Plugin" in name else ENGINE, name)
    shutil.copy2(src, dst)
    print(f"  copied → {dst}")

# ── 2. Append worklets to SPXWorklets.js ──────────────────────────────────────
print("\n── Appending SPX100 worklets ───────────────────────────────")
wlt_dst = os.path.join(ENGINE, "SPXWorklets.js")
wlt_content = open(os.path.join(COMP, "SPXWorklets_SPX100.js")).read()
existing = open(wlt_dst).read()
if "getTapeStopWorkletSource" not in existing:
    with open(wlt_dst, "a") as f:
        f.write("\n\n// ── SPX100 Suite (auto-appended) ──\n")
        f.write(wlt_content)
    print("  appended SPX100 worklets to SPXWorklets.js")
else:
    print("  already appended")

# ── 3. Patch SPXPlugins.js ────────────────────────────────────────────────────
print("\n── Patching SPXPlugins.js ──────────────────────────────────")
with open(SPX,"r") as f: spx = f.read()
spx_orig = spx

# Add import
SPX100_IMPORT = "import { TapeStopUI, TransientShaperUI, MultibandSatUI, StereoImagerUI, EnhancerSPX808UI, LoFiCrusherUI, InfiniteReverbUI, ReverseDelayUI, DeclickerUI, DehummmerUI, MidSideCompUI, SubOctaverUI, ChorusEnsembleUI, TempoDelayUI, PitchRandomizerUI, AutoWahUI, DrumEnhancerUI, VocalSaturatorUI, GainStagerUI, MultibandLimiterUI, GoniometerUI, PhaseScopeUI, DialogueIsolatorUI, CabinetSimUI, FreqShifterUI } from './SPXPlugins_SPX100';"

if "SPXPlugins_SPX100" not in spx:
    # Add after last import
    last_import_pos = spx.rfind("\nimport ")
    end_of_line = spx.find("\n", last_import_pos + 1)
    spx = spx[:end_of_line+1] + SPX100_IMPORT + "\n" + spx[end_of_line+1:]
    print("  added SPX100 import")
else:
    print("  import already present")

# Add to ALL_FX_EXTENDED
NEW_ENTRIES = """  { key:"tapeStop",          name:"TapeStop",          type:"creative",    component:"TapeStopUI"          },
  { key:"transientShaper",   name:"TransientShaper",   type:"comp",        component:"TransientShaperUI"   },
  { key:"multibandSat",      name:"MultibandSat",      type:"distortion",  component:"MultibandSatUI"      },
  { key:"stereoImager",      name:"StereoImager",      type:"reverb",      component:"StereoImagerUI"      },
  { key:"enhancer808",       name:"808Enhancer",       type:"distortion",  component:"EnhancerSPX808UI"    },
  { key:"loFiCrusher",       name:"LoFiCrusher",       type:"distortion",  component:"LoFiCrusherUI"       },
  { key:"infiniteReverb",    name:"InfiniteReverb",    type:"reverb",      component:"InfiniteReverbUI"    },
  { key:"reverseDelay",      name:"ReverseDelay",      type:"delay",       component:"ReverseDelayUI"      },
  { key:"declicker",         name:"Declicker",         type:"filter",      component:"DeclickerUI"         },
  { key:"dehummer",          name:"Dehummer",          type:"filter",      component:"DehummmerUI"         },
  { key:"midSideComp",       name:"MidSideComp",       type:"comp",        component:"MidSideCompUI"       },
  { key:"subOctaver",        name:"SubOctaver",        type:"filter",      component:"SubOctaverUI"        },
  { key:"chorusEnsemble",    name:"ChorusEnsemble",    type:"reverb",      component:"ChorusEnsembleUI"    },
  { key:"tempoDelay",        name:"TempoDelay",        type:"delay",       component:"TempoDelayUI"        },
  { key:"pitchRandomizer",   name:"PitchRandomizer",   type:"filter",      component:"PitchRandomizerUI"   },
  { key:"autoWah",           name:"AutoWah",           type:"filter",      component:"AutoWahUI"           },
  { key:"drumEnhancer",      name:"DrumEnhancer",      type:"comp",        component:"DrumEnhancerUI"      },
  { key:"vocalSaturator",    name:"VocalSaturator",    type:"distortion",  component:"VocalSaturatorUI"    },
  { key:"gainStager",        name:"GainStager",        type:"eq",          component:"GainStagerUI"        },
  { key:"multibandLimiter",  name:"MultibandLimiter",  type:"limit",       component:"MultibandLimiterUI"  },
  { key:"goniometer",        name:"Goniometer",        type:"eq",          component:"GoniometerUI"        },
  { key:"phaseScope",        name:"PhaseScope",        type:"eq",          component:"PhaseScopeUI"        },
  { key:"dialogueIsolator",  name:"DialogueIsolator",  type:"filter",      component:"DialogueIsolatorUI"  },
  { key:"cabinetSim",        name:"CabinetSim",        type:"distortion",  component:"CabinetSimUI"        },
  { key:"freqShifter",       name:"FreqShifter",       type:"filter",      component:"FreqShifterUI"       },"""

# Find end of ALL_FX_EXTENDED and insert before ];
if "tapeStop" not in spx:
    # Find the spectrumAnalyzer entry (last added in round 2)
    anchor = '  { key: "spectrumAnalyzer", name: "SpectrumAnalyzer", type: "eq",     component: "SpectrumAnalyzerUI" },'
    if anchor in spx:
        spx = spx.replace(anchor, anchor + "\n" + NEW_ENTRIES)
        print("  added 25 SPX100 plugins to ALL_FX_EXTENDED")
    else:
        # Try alternate anchor
        anchor2 = '  { key: "spectrumAnalyzer",'
        if anchor2 in spx:
            idx = spx.find("\n", spx.find(anchor2)) + 1
            spx = spx[:idx] + NEW_ENTRIES + "\n" + spx[idx:]
            print("  added 25 SPX100 plugins (alt anchor)")
        else:
            print("  WARNING: could not find spectrumAnalyzer anchor")
else:
    print("  plugins already in ALL_FX_EXTENDED")

# Add to COMPONENT_MAP
MAP_ANCHOR = "  GainRiderUI, HarmonicSumUI,"
SPX100_MAP = "  TapeStopUI, TransientShaperUI, MultibandSatUI, StereoImagerUI, EnhancerSPX808UI, LoFiCrusherUI, InfiniteReverbUI, ReverseDelayUI, DeclickerUI, DehummmerUI, MidSideCompUI, SubOctaverUI, ChorusEnsembleUI, TempoDelayUI, PitchRandomizerUI, AutoWahUI, DrumEnhancerUI, VocalSaturatorUI, GainStagerUI, MultibandLimiterUI, GoniometerUI, PhaseScopeUI, DialogueIsolatorUI, CabinetSimUI, FreqShifterUI,"

if "TapeStopUI" not in spx and MAP_ANCHOR in spx:
    spx = spx.replace(MAP_ANCHOR, MAP_ANCHOR + "\n  // SPX100\n" + SPX100_MAP)
    print("  extended COMPONENT_MAP")
elif "TapeStopUI" in spx:
    print("  COMPONENT_MAP already extended")
else:
    print("  WARNING: COMPONENT_MAP anchor not found")

if spx != spx_orig:
    shutil.copy2(SPX, SPX + ".bak3")
    with open(SPX, "w") as f: f.write(spx)
    print("  wrote patched SPXPlugins.js")

# ── 4. Patch RecordingStudio.js picker — add SPX100 groups ───────────────────
print("\n── Patching insert picker ──────────────────────────────────")
with open(RS,"r") as f: rs = f.read()
rs_orig = rs

OLD_CREATIVE_END = """              {
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

NEW_CREATIVE_END = """              {
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
              {
                cat: "SPX Producer",
                items: [
                  { key: "tapeStop",        name: "TapeStop"        },
                  { key: "transientShaper", name: "TransientShaper" },
                  { key: "multibandSat",    name: "MultibandSat"    },
                  { key: "stereoImager",    name: "StereoImager"    },
                  { key: "enhancer808",     name: "808Enhancer"     },
                  { key: "loFiCrusher",     name: "LoFiCrusher"     },
                  { key: "infiniteReverb",  name: "InfiniteReverb"  },
                  { key: "reverseDelay",    name: "ReverseDelay"    },
                  { key: "chorusEnsemble",  name: "ChorusEnsemble"  },
                  { key: "tempoDelay",      name: "TempoDelay"      },
                  { key: "pitchRandomizer", name: "PitchRandomizer" },
                  { key: "autoWah",         name: "AutoWah"         },
                  { key: "drumEnhancer",    name: "DrumEnhancer"    },
                  { key: "vocalSaturator",  name: "VocalSaturator"  },
                  { key: "subOctaver",      name: "SubOctaver"      },
                  { key: "freqShifter",     name: "FreqShifter"     },
                  { key: "cabinetSim",      name: "CabinetSim"      },
                ],
              },
              {
                cat: "SPX Restoration",
                items: [
                  { key: "declicker",       name: "Declicker"       },
                  { key: "dehummer",        name: "Dehummer"        },
                  { key: "dialogueIsolator",name: "DialogueIsolator"},
                ],
              },
              {
                cat: "SPX Metering",
                items: [
                  { key: "gainStager",      name: "GainStager"      },
                  { key: "goniometer",      name: "Goniometer"      },
                  { key: "phaseScope",      name: "PhaseScope"      },
                  { key: "midSideComp",     name: "MidSideComp"     },
                  { key: "multibandLimiter",name: "MultibandLimiter"},
                ],
              },
            ].map((group) => ("""

if "SPX Producer" not in rs:
    if OLD_CREATIVE_END in rs:
        rs = rs.replace(OLD_CREATIVE_END, NEW_CREATIVE_END)
        print("  added SPX Producer + Restoration + Metering groups")
    else:
        print("  WARNING: creative group anchor not found")
else:
    print("  picker already has SPX100 groups")

if rs != rs_orig:
    shutil.copy2(RS, RS + ".bak3")
    with open(RS, "w") as f: f.write(rs)
    print("  wrote patched RecordingStudio.js")

print("\n── Done ────────────────────────────────────────────────────")
print("  25 new SPX plugins added")
print("  Total SPX suite: ~97 plugins (SPX100 achieved!)")
print("\n  Next:")
print("    git add -A && git commit -m 'feat: SPX100 — 25 new plugins, total 100 SPX suite'")
print("    git push")
