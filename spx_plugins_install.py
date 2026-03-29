#!/usr/bin/env python3
"""
spx_plugins_install.py — StreamPireX Full Plugin Suite Installer
Drop in repo root alongside SPXPlugins.js and SPXWorklets_Analog.js
Run: python3 spx_plugins_install.py
"""
import os, sys, shutil, re

ROOT     = os.path.dirname(os.path.abspath(__file__))
COMP     = os.path.join(ROOT,"src","front","js","component")
ENGINE   = os.path.join(COMP,"audio","engine")
RS       = os.path.join(ROOT,"src","front","js","pages","RecordingStudio.js")
PLGSRC   = os.path.join(ROOT,"SPXPlugins.js")
WLTSRC   = os.path.join(ROOT,"SPXWorklets_Analog.js")

def check(p,label):
    if not os.path.exists(p):
        print(f"ERROR: {label} not found:\n  {p}"); sys.exit(1)
    print(f"  found: {label}")

print("\n── Checking files ──────────────────────────────────────────")
check(COMP,"component dir"); check(ENGINE,"audio/engine dir")
check(RS,"RecordingStudio.js"); check(PLGSRC,"SPXPlugins.js"); check(WLTSRC,"SPXWorklets_Analog.js")

# ── 1. Copy plugin UI file ────────────────────────────────────────────────────
print("\n── Installing SPXPlugins.js ────────────────────────────────")
dest = os.path.join(COMP,"SPXPlugins.js")
shutil.copy2(PLGSRC,dest)
print(f"  copied → {dest}")

# ── 2. Append analog worklets to SPXWorklets.js ───────────────────────────────
print("\n── Appending analog worklets to SPXWorklets.js ─────────────")
wlt_dest = os.path.join(ENGINE,"SPXWorklets.js")
wlt_src  = open(WLTSRC,"r",encoding="utf-8").read()
wlt_existing = open(wlt_dest,"r",encoding="utf-8").read()

if "getTapeForgeWorkletSource" in wlt_existing:
    print("  already patched — skipping worklets")
else:
    with open(wlt_dest,"a",encoding="utf-8") as f:
        f.write("\n\n// ── SPX Analog Suite (auto-appended by installer) ──\n")
        f.write(wlt_src)
    print(f"  appended {len(wlt_src.splitlines())} lines → {wlt_dest}")

# ── 3. Patch RecordingStudio.js ───────────────────────────────────────────────
print("\n── Patching RecordingStudio.js ─────────────────────────────")
with open(RS,"r",encoding="utf-8") as f:
    src = f.read()
original = src

# 3a. Add import after UnifiedFXChain
ANCHOR_IMPORT = "import UnifiedFXChain from '../component/UnifiedFXChain';"
SPX_IMPORT    = "import { SPXPluginHost, ALL_FX_EXTENDED } from '../component/SPXPlugins';"
if SPX_IMPORT in src:
    print("  import already present")
elif ANCHOR_IMPORT in src:
    src = src.replace(ANCHOR_IMPORT, ANCHOR_IMPORT+"\n"+SPX_IMPORT)
    print("  added SPXPlugins import")
else:
    print("  WARNING: could not find UnifiedFXChain import anchor")

# 3b. Replace inline ALL_FX array (lines 4253-4272) with ALL_FX_EXTENDED
OLD_ALLFX = """                        const ALL_FX = [
                          { key: "eq", name: "EQ", type: "eq" },
                          { key: "compressor", name: "Compressor", type: "comp" },
                          { key: "gate", name: "Gate", type: "comp" },
                          { key: "deesser", name: "De-Esser", type: "comp" },
                          { key: "limiter", name: "Limiter", type: "limit" },
                          { key: "reverb", name: "Reverb", type: "reverb" },
                          { key: "delay", name: "Delay", type: "delay" },
                          { key: "chorus", name: "Chorus", type: "reverb" },
                          { key: "flanger", name: "Flanger", type: "reverb" },
                          { key: "phaser", name: "Phaser", type: "filter" },
                          { key: "tremolo", name: "Tremolo", type: "filter" },
                          { key: "filter", name: "Filter", type: "filter" },
                          { key: "distortion", name: "Distortion", type: "distortion" },
                          { key: "bitcrusher", name: "Bit Crush", type: "distortion" },
                          { key: "tapeSaturation", name: "Tape Sat", type: "distortion" },
                          { key: "exciter", name: "Exciter", type: "distortion" },
                          { key: "stereoWidener", name: "Stereo W", type: "reverb" },
                          { key: "gainUtility", name: "Gain", type: "eq" },
                        ];"""

NEW_ALLFX = """                        const ALL_FX = ALL_FX_EXTENDED;"""

if OLD_ALLFX in src:
    src = src.replace(OLD_ALLFX, NEW_ALLFX)
    print("  replaced ALL_FX with ALL_FX_EXTENDED")
elif "const ALL_FX = ALL_FX_EXTENDED" in src:
    print("  ALL_FX already patched")
else:
    print("  WARNING: could not find ALL_FX array to replace — check line numbers")

# 3c. Add SPX groups to insert picker modal
OLD_PICKER_END = """              {
                cat: "Utility",
                items: [
                  { key: "filter", name: "Filter" },
                  { key: "gainUtility", name: "Gain Utility" },
                ],
              },
            ].map((group) => ("""

NEW_PICKER_END = """              {
                cat: "Utility",
                items: [
                  { key: "filter", name: "Filter" },
                  { key: "gainUtility", name: "Gain Utility" },
                ],
              },
              {
                cat: "SPX Analog",
                items: [
                  { key: "tapeForge",    name: "TapeForge"    },
                  { key: "valveGlow",    name: "ValveGlow"    },
                  { key: "ironCore",     name: "IronCore"     },
                  { key: "consoleSoul",  name: "ConsoleSoul"  },
                ],
              },
              {
                cat: "SPX Dynamics",
                items: [
                  { key: "brickWall",      name: "BrickWall"      },
                  { key: "warmPress",      name: "WarmPress"      },
                  { key: "glueBus",        name: "GlueBus"        },
                  { key: "fetStrike",      name: "FETStrike"      },
                  { key: "optoPress",      name: "OptoPress"      },
                  { key: "parallelCrush",  name: "ParallelCrush"  },
                  { key: "multiPress",     name: "MultiPress"     },
                  { key: "transGate",      name: "TransGate"      },
                ],
              },
              {
                cat: "SPX EQ",
                items: [
                  { key: "ironBand",      name: "IronBand"      },
                  { key: "spectraCurve",  name: "SpectraCurve"  },
                ],
              },
              {
                cat: "SPX Spatial",
                items: [
                  { key: "hallForgeS",     name: "HallForge I"    },
                  { key: "hallForgeL",     name: "HallForge II"   },
                  { key: "gateVerb",       name: "GateVerb"       },
                  { key: "vintageAir",     name: "VintageAir"     },
                  { key: "stochasticHall", name: "StochasticHall" },
                  { key: "greatHall",      name: "GreatHall"      },
                  { key: "plateForge",     name: "PlateForge"     },
                  { key: "springBox",      name: "SpringBox"      },
                  { key: "echoField",      name: "EchoField"      },
                  { key: "stereoBloom",    name: "StereoBloom"    },
                  { key: "pitchForge",     name: "PitchForge"     },
                  { key: "dualDelay",      name: "DualDelay"      },
                ],
              },
              {
                cat: "SPX Vocal",
                items: [
                  { key: "pitchLock",      name: "PitchLock"      },
                  { key: "voiceForge",     name: "VoiceForge"     },
                  { key: "breathGate",     name: "BreathGate"     },
                  { key: "sibilantCut",    name: "SibilantCut"    },
                  { key: "phantomDouble",  name: "PhantomDouble"  },
                  { key: "vocalSpace",     name: "VocalSpace"     },
                ],
              },
              {
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

if OLD_PICKER_END in src:
    src = src.replace(OLD_PICKER_END, NEW_PICKER_END)
    print("  added 7 SPX plugin groups to insert picker")
elif "SPX Analog" in src:
    print("  picker already patched")
else:
    print("  WARNING: could not find picker anchor — check RecordingStudio.js manually")

# 3d. Add SPXPluginHost renderer before closing return paren of RecordingStudio
# Find ConsoleFXPanel usage and add SPXPluginHost after it
OLD_CONSOLEFX = """            <ConsoleFXPanel"""
SPX_HOST_BLOCK = """            {/* SPX Floating Plugin Windows */}
            {tracks.map((t, ti) =>
              ALL_FX_EXTENDED
                .filter(fx => t.effects?.[fx.key]?.enabled && fx.component)
                .map(fx => (
                  <SPXPluginHost
                    key={ti + "_" + fx.key}
                    pluginKey={fx.key}
                    params={t.effects[fx.key] || {}}
                    onChange={(newParams) =>
                      setTracks(prev => prev.map((tr, idx) =>
                        idx === ti
                          ? { ...tr, effects: { ...tr.effects, [fx.key]: { ...tr.effects?.[fx.key], ...newParams, enabled: true } } }
                          : tr
                      ))
                    }
                    onClose={() => updateEffect(ti, fx.key, "enabled", false)}
                  />
                ))
            )}
            <ConsoleFXPanel"""

if OLD_CONSOLEFX in src and "SPXPluginHost" not in src:
    src = src.replace(OLD_CONSOLEFX, SPX_HOST_BLOCK, 1)
    print("  added SPXPluginHost renderer")
elif "SPXPluginHost" in src:
    print("  SPXPluginHost already present")
else:
    print("  WARNING: could not find ConsoleFXPanel anchor for SPXPluginHost")

# ── 4. Write patched file ─────────────────────────────────────────────────────
if src != original:
    backup = RS + ".bak"
    shutil.copy2(RS, backup)
    print(f"\n  backed up original → {backup}")
    with open(RS,"w",encoding="utf-8") as f:
        f.write(src)
    print(f"  wrote patched RecordingStudio.js")
else:
    print("\n  no changes made to RecordingStudio.js (all already patched)")

print("\n── Done ────────────────────────────────────────────────────")
print("  Files installed:")
print(f"    {os.path.join(COMP,'SPXPlugins.js')}")
print(f"    {wlt_dest}  (appended)")
print(f"    {RS}  (patched)")
print("\n  Next steps:")
print("    1. git add -A && git commit -m 'feat: SPX 57-plugin suite + analog worklets'")
print("    2. git push")
print("    3. Smoke test: open RecordingStudio → console insert slot → + Add Insert")
print("       → SPX Analog → TapeForge → should open floating window")
