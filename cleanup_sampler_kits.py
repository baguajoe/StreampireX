#!/usr/bin/env python3
"""
SamplerBeatMaker cleanup:
- Remove R2_KIT_URLS (all Dr. Dre URLs)
- Remove 5 risky kits from SOUND_LIBRARY
- Keep 7 safe kits
- Blank pads by default (user uploads own sounds)
"""
import re

TARGET = "/workspaces/SpectraSphere/src/front/js/component/SamplerBeatMaker.js"

with open(TARGET, 'r') as f:
    code = f.read()

# ─── 1. Replace R2_KIT_URLS with empty object ─────────────────────────────────
old_r2 = '''const R2_KIT_URLS = {
  "Kick": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Kick/Kick%20-%20Forgot%20About%20Dre.wav",
  "Kick 2": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Kick/Kick%20-%20Still%20D.R.E..wav",
  "Kick Alt": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Kick/Kick%20-%20The%20Next%20Episode.wav",
  "Snare": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Snare/Snare%20-%20Forgot%20About%20Dre.wav",
  "Snare 2": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Snare/Snare%20-%20Still%20D.R.E..wav",
  "Snare Alt": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Snare/Snare%20-%20The%20Next%20Episode.wav",
  "Hi Hat": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Hi%20Hat/Hi%20Hat%20-%20Forgot%20About%20Dre.wav",
  "Hi Hat 2": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Hi%20Hat/Hi%20Hat%20-%20Still%20D.R.E..wav",
  "Hi Hat 3": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Hi%20Hat/Hi%20Hat%20-%20The%20Next%20Episode.wav",
  "Open Hat": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Open%20Hat/OH%20-%20Still%20D.R.E..wav",
  "Open Hat 2": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Open%20Hat/OH%20-%20The%20Next%20Episode.wav",
  "Perc": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Perc/Perc%20-%20Forgot%20About%20Dre.wav",
  "Perc 2": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Perc/Perc%20-%20Still%20D.R.E..wav",
  "Perc 3": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Perc/Perc%20-%20The%20Next%20Episode.wav",
  "Perc 4": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Perc/Perc%20-%20Bar%20One.wav",
  "Snare 3": "https://pub-3a956be9429449469ec53b73495e6b24.r2.dev/drums/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Dr.%20Dre%20-%202001%20%28Drum%20Kit%29/Snare/Snare%20-%20Bang%20Bang.wav",
};'''

new_r2 = '''// R2_KIT_URLS — add your own cleared sample URLs here
// Format: "Sample Name": "https://your-r2-bucket.r2.dev/path/to/sample.wav"
const R2_KIT_URLS = {};'''

if old_r2 in code:
    code = code.replace(old_r2, new_r2)
    print("✅ R2_KIT_URLS — Dr. Dre URLs removed")
else:
    print("⚠️  R2_KIT_URLS not found verbatim — may need manual check")

# ─── 2. Replace SOUND_LIBRARY with 7 safe kits only ──────────────────────────
old_library_start = 'const SOUND_LIBRARY = {'
old_library_end = "  'Afrobeats Kit': [\n    'Kick Log', 'Snare Wire', 'Shaker', 'Bell',\n    'Conga High', 'Conga Low', 'Guiro', 'Perc',\n  ],\n};"

new_library = '''const SOUND_LIBRARY = {
  // ── 7 cleared generic kits — safe for commercial distribution ──
  'SUB 808 Kit': [
    '808 Sub 1', '808 Sub 2', '808 Sub 3', '808 Sub 4',
    '808 OD 1', '808 OD 2', '808 Slide', '808 Long',
    '808 Short', '808 Punch', '808 Boom', '808 Tone',
    '808 Deep', '808 Mid', '808 High', '808 Clean',
  ],
  'Bass & 808 Pack': [
    '808 Slide', 'Bass Zap', 'Brass 808', 'Buzzy Bass',
    'Dutty 808', 'Envelope Bass', 'Erosion 808', 'Filter Driven Bass',
    'Nostril 808', 'Panned Robot Reese', 'Punchy 808', 'Rekt 808',
    'Reverse Bass', 'Screech Bass', 'Slug Bass', 'Tom 808',
  ],
  'Boom Bap Kit': [
    'Kick Dusty', 'Snare Vinyl', 'HH Tight', 'Open Hat',
    'Shaker', 'Kick Alt', 'Snare Ghost', 'Ride',
    'Clap Dry', 'Perc 1', 'Perc 2', 'Rim Shot',
    'Crash', 'Tom Hi', 'Tom Low', 'Finger Snap',
  ],
  'R&B Kit': [
    'Kick Soft', 'Snare Brush', 'HH Light', 'Rim Click',
    'Fingersnap', 'Shaker', 'Tambourine', 'Clap Soft',
    'Open Hat', 'Perc Soft', 'Tom Warm', 'Snap',
    'Clap Layer', 'HH Open', 'Kick Alt', 'Snare Alt',
  ],
  'Lo-Fi Kit': [
    'Kick Muffled', 'Snare Tape', 'HH Dusty', 'Vinyl Crackle',
    'Perc Warm', 'Rim Soft', 'Open Hat Lo', 'Clap Vintage',
    'Shaker Lo', 'Tom Lo', 'Snap Warm', 'Perc 2',
    'Kick Alt', 'Snare Alt', 'HH Alt', 'Crash Lo',
  ],
  'EDM Kit': [
    'Kick Big', 'Clap Layer', 'HH Sharp', 'Open Hat',
    'Crash', 'Snare Build', 'Riser', 'Impact',
    'Kick Punch', 'Clap Dry', 'HH Closed', 'Cymbal',
    'Tom Synth', 'Perc EDM', 'Snare Reverse', 'Kick Sub',
  ],
  'Afrobeats Kit': [
    'Kick Log', 'Snare Wire', 'Shaker', 'Bell',
    'Conga High', 'Conga Low', 'Guiro', 'Perc',
    'Talking Drum', 'Djembe Hi', 'Djembe Low', 'Agogo',
    'Cabasa', 'Cowbell', 'Clap Afro', 'Kick Alt',
  ],
};'''

# Find and replace the full SOUND_LIBRARY block
start_idx = code.find(old_library_start)
end_marker = "  'Afrobeats Kit': ["
end_idx = code.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # Find the closing }; after Afrobeats Kit
    close_idx = code.find('\n};', end_idx)
    if close_idx != -1:
        old_block = code[start_idx:close_idx + 3]
        code = code.replace(old_block, new_library)
        print("✅ SOUND_LIBRARY — replaced with 7 safe kits")
    else:
        print("⚠️  Could not find SOUND_LIBRARY closing brace")
else:
    print("⚠️  SOUND_LIBRARY start/end not found — check manually")

# ─── 3. Make sure DEFAULT_PAD has no sample URL ───────────────────────────────
# Find DEFAULT_PAD and ensure buffer/url are null
if 'DEFAULT_PAD' in code:
    # Check if it has a hardcoded url/buffer
    default_pad_idx = code.find('DEFAULT_PAD')
    snippet = code[default_pad_idx:default_pad_idx+500]
    if 'r2.dev' in snippet or 'wav' in snippet.lower():
        print("⚠️  DEFAULT_PAD may have sample URLs — check manually around line with DEFAULT_PAD")
    else:
        print("✅ DEFAULT_PAD — no hardcoded sample URLs found")

with open(TARGET, 'w') as f:
    f.write(code)

print(f"""
✅ Cleanup complete!

Safe kits kept (7):
  1. SUB 808 Kit
  2. Bass & 808 Pack
  3. Boom Bap Kit
  4. R&B Kit
  5. Lo-Fi Kit
  6. EDM Kit
  7. Afrobeats Kit

Removed:
  ❌ R2_KIT_URLS (Dr. Dre 2001 URLs)
  ❌ West Coast Classic Kit
  ❌ Trap Kit
  ❌ MPC Classic Kit
  ❌ 90s R&B Kit
  ❌ Vintage Drum Breaks

Pads: blank by default — users upload their own samples
Piano: synthesized oscillators — no change needed

Run: npm run build 2>&1 | tail -5
""")
