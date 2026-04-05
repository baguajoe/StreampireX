#!/usr/bin/env python3
"""
Fix DJ tonearm SVG geometry.
Platter is 180x180px centered in turntable-wrap.
Pivot is top-right, arm sweeps left across platter, stylus hits groove.
Run: python3 patch_tonearm.py
"""

path = '/workspaces/SpectraSphere/src/front/js/component/djStudioSrcDoc.js'

f = open(path, 'r')
c = f.read()
f.close()

# Fix tonearm CSS - make it cover the full turntable area
c = c.replace(
    '.tonearm{position:absolute;top:6px;right:6px;width:60px;height:60px;pointer-events:none}',
    '.tonearm{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10}'
)

# Fix the SVG - Technics 1200 geometry:
# turntable-wrap is ~200px wide (180px platter + 10px padding each side)
# Pivot is at top-right: ~185px, 20px
# Platter center: ~100px, 100px  
# Stylus should land at ~75% radius from center = ~67px from center
# So stylus at approximately 130px, 90px when at outer groove

old_svg = '''        <!-- Tonearm SVG overlay -->
        <svg width="70" height="70" style="position:absolute;top:4px;right:5px;pointer-events:none">
          <!-- Pivot bearing -->
          <circle cx="58" cy="8" r="5" fill="#333" stroke="#666" stroke-width="1.5"/>
          <circle cx="58" cy="8" r="2" fill="#555"/>
          <!-- Main arm — shorter, angled correctly -->
          <line x1="58" y1="8" x2="28" y2="52" stroke="#999" stroke-width="2" stroke-linecap="round"/>
          <!-- S-bend headshell section -->
          <path d="M28,52 Q22,58 18,62" stroke="#bbb" stroke-width="2" fill="none" stroke-linecap="round"/>
          <!-- Headshell -->
          <rect x="12" y="60" width="10" height="5" rx="1" fill="#666" stroke="#888" stroke-width="1"/>
          <!-- Stylus tip glow -->
          <circle cx="14" cy="65" r="2.5" fill="#00ffcc" opacity="0.9"/>
          <circle cx="14" cy="65" r="4" fill="#00ffcc" opacity="0.2"/>
        </svg>'''

new_svg = '''        <!-- Tonearm SVG overlay — full turntable size -->
        <svg width="200" height="200" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10">
          <!-- Counterweight (rear of arm) -->
          <circle cx="188" cy="22" r="7" fill="#2a2a2a" stroke="#555" stroke-width="1.5"/>
          <circle cx="188" cy="22" r="4" fill="#1a1a1a" stroke="#444" stroke-width="1"/>
          <!-- Counterweight rod -->
          <line x1="181" y1="22" x2="174" y2="26" stroke="#555" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Pivot bearing housing (outer ring) -->
          <circle cx="172" cy="28" r="9" fill="#1e1e1e" stroke="#666" stroke-width="1.5"/>
          <circle cx="172" cy="28" r="6" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <circle cx="172" cy="28" r="2.5" fill="#777"/>
          <!-- Anti-skate adjuster -->
          <line x1="172" y1="37" x2="172" y2="44" stroke="#444" stroke-width="1.5"/>
          <circle cx="172" cy="46" r="3" fill="#333" stroke="#555" stroke-width="1"/>
          <!-- Main arm tube — long aluminium tube from pivot to S-bend -->
          <line x1="172" y1="28" x2="108" y2="88" stroke="#b0b0b0" stroke-width="3.5" stroke-linecap="round"/>
          <!-- Arm shadow/depth -->
          <line x1="173" y1="29" x2="109" y2="89" stroke="rgba(0,0,0,0.4)" stroke-width="5" stroke-linecap="round"/>
          <!-- Arm highlight -->
          <line x1="171" y1="27" x2="107" y2="87" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" stroke-linecap="round"/>
          <!-- S-curve first bend -->
          <path d="M108,88 C102,96 96,100 90,106" stroke="#c0c0c0" stroke-width="3" fill="none" stroke-linecap="round"/>
          <!-- S-curve second bend (reverse direction — the S) -->
          <path d="M90,106 C84,112 80,114 76,120" stroke="#c8c8c8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <!-- Headshell connector clip -->
          <rect x="70" y="117" width="12" height="5" rx="2" fill="#444" stroke="#777" stroke-width="1"/>
          <!-- Headshell body -->
          <rect x="68" y="122" width="14" height="9" rx="2" fill="#333" stroke="#666" stroke-width="1"/>
          <!-- Cartridge body -->
          <rect x="69" y="131" width="12" height="6" rx="1" fill="#222" stroke="#555" stroke-width="1"/>
          <!-- Cantilever -->
          <line x1="75" y1="137" x2="75" y2="142" stroke="#888" stroke-width="1"/>
          <!-- Stylus tip glow -->
          <circle cx="75" cy="142" r="2.5" fill="#00ffcc" opacity="1"/>
          <circle cx="75" cy="142" r="5" fill="#00ffcc" opacity="0.3"/>
          <circle cx="75" cy="142" r="9" fill="#00ffcc" opacity="0.1"/>
          <!-- Arm lift platform -->
          <rect x="155" y="38" width="12" height="5" rx="2" fill="#252525" stroke="#444" stroke-width="1"/>
        </svg>'''

# Replace for deck A
c = c.replace(old_svg, new_svg, 1)

# Also fix deck B (same SVG appears again)
c = c.replace(old_svg, new_svg, 1)

f = open(path, 'w')
f.write(c)
f.close()
print('done')
