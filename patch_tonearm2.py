#!/usr/bin/env python3
"""
Clean tonearm rewrite. Platter 180px, wrap has 50px right padding.
Total wrap width ~240px, height ~200px.
Platter center at approx 100px from left, 100px from top.
Pivot at 210px from left, 20px from top (top-right corner).
Stylus lands on outer groove ~75px from platter center.
"""

path = '/workspaces/SpectraSphere/src/front/js/component/djStudioSrcDoc.js'
f = open(path, 'r')
c = f.read()
f.close()

# The tonearm SVG block — replace whatever is in there now
# Find and replace the entire SVG element for deck A and B

OLD_SVG_MARKER = '<!-- Tonearm SVG overlay — full turntable size -->'

NEW_SVG = '''<!-- Tonearm SVG overlay — full turntable size -->
        <svg viewBox="0 0 240 210" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible">
          <defs>
            <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#d0d0d0"/>
              <stop offset="50%" style="stop-color:#909090"/>
              <stop offset="100%" style="stop-color:#606060"/>
            </linearGradient>
          </defs>

          <!-- Counterweight (behind pivot, going right) -->
          <line x1="220" y1="22" x2="208" y2="26" stroke="#444" stroke-width="3" stroke-linecap="round"/>
          <ellipse cx="226" cy="20" rx="9" ry="7" fill="#1a1a1a" stroke="#555" stroke-width="1.5"/>
          <ellipse cx="226" cy="20" rx="5" ry="4" fill="#111" stroke="#333" stroke-width="1"/>

          <!-- Pivot bearing housing -->
          <circle cx="208" cy="26" r="10" fill="#1c1c1c" stroke="#777" stroke-width="2"/>
          <circle cx="208" cy="26" r="6" fill="#252525" stroke="#555" stroke-width="1.5"/>
          <circle cx="208" cy="26" r="2.5" fill="#999"/>

          <!-- Anti-skate string -->
          <line x1="208" y1="36" x2="208" y2="50" stroke="#333" stroke-width="1" stroke-dasharray="2,2"/>
          <circle cx="208" cy="52" r="3" fill="#222" stroke="#444" stroke-width="1"/>

          <!-- Main arm tube — from pivot toward platter outer edge -->
          <!-- Pivot 208,26 → pre-S-bend point ~148,80 -->
          <line x1="208" y1="26" x2="148" y2="80" stroke="url(#armGrad)" stroke-width="5" stroke-linecap="round"/>
          <!-- Shadow -->
          <line x1="209" y1="27" x2="149" y2="81" stroke="rgba(0,0,0,0.6)" stroke-width="7" stroke-linecap="round"/>
          <!-- Highlight -->
          <line x1="207" y1="25" x2="147" y2="79" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-linecap="round"/>

          <!-- S-bend — first curve outward -->
          <path d="M148,80 C142,88 136,90 130,96" stroke="#c0c0c0" stroke-width="4" fill="none" stroke-linecap="round"/>
          <!-- S-bend — second curve inward (makes the S) -->
          <path d="M130,96 C124,102 120,106 116,114" stroke="#c8c8c8" stroke-width="3.5" fill="none" stroke-linecap="round"/>

          <!-- Headshell connector -->
          <rect x="109" y="112" width="14" height="5" rx="2" fill="#3a3a3a" stroke="#666" stroke-width="1"/>
          <!-- Headshell body -->
          <rect x="107" y="117" width="16" height="11" rx="2" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <!-- Cartridge -->
          <rect x="108" y="128" width="14" height="7" rx="1" fill="#1c1c1c" stroke="#444" stroke-width="1"/>
          <!-- Cantilever line -->
          <line x1="115" y1="135" x2="115" y2="141" stroke="#666" stroke-width="1.5"/>

          <!-- Stylus tip — lands on outer groove of platter -->
          <!-- Platter center ~95,100, outer groove ~65px radius → stylus at ~115,140 -->
          <circle cx="115" cy="141" r="3" fill="#00ffcc" opacity="1"/>
          <circle cx="115" cy="141" r="6" fill="#00ffcc" opacity="0.35"/>
          <circle cx="115" cy="141" r="11" fill="#00ffcc" opacity="0.12"/>
          <circle cx="115" cy="141" r="16" fill="#00ffcc" opacity="0.05"/>

          <!-- Arm lift cueing lever -->
          <rect x="192" y="38" width="13" height="5" rx="2" fill="#1e1e1e" stroke="#444" stroke-width="1"/>
          <rect x="196" y="43" width="5" height="8" rx="1" fill="#161616" stroke="#333" stroke-width="1"/>
        </svg>'''

# Replace all occurrences of the old marker + SVG block
import re

# Replace the SVG block — find from the marker to </svg>
pattern = r'<!-- Tonearm SVG overlay — full turntable size -->.*?</svg>'
replacement = NEW_SVG

new_c = re.sub(pattern, replacement, c, flags=re.DOTALL)

if new_c == c:
    print('ERROR: pattern not found')
else:
    f = open(path, 'w')
    f.write(new_c)
    f.close()
    count = len(re.findall(pattern, c, flags=re.DOTALL))
    print(f'done — replaced {count} occurrence(s)')
