#!/usr/bin/env python3
"""
Fix tonearm by line number. No string matching failures.
Current state from grep:
Line 203: main arm line x1=208,y1=26 x2=148,y2=80
Line 210: S-bend first path M148,80
Line 211: S-bend second path M130,96
Lines 224+: stylus

Platter center in SVG coords: ~95,100 (platter is 180px wide, centered in wrap)
Outer groove: ~68px from center = ~163,100 area... but arm comes from top-right
Stylus should land at ~130,135 (outer groove, upper-right quadrant of platter)
"""

path = '/workspaces/SpectraSphere/src/front/js/component/djStudioSrcDoc.js'

with open(path, 'r') as f:
    lines = f.readlines()

# Print lines 200-235 so we can see exact content
print("Current lines 200-235:")
for i, line in enumerate(lines[199:235], start=200):
    print(f"{i}: {line}", end='')

print("\n--- Applying fix ---")

# Fix line 203: main arm endpoint - extend arm further down-left
lines[202] = '          <!-- Main arm tube — from pivot toward platter outer edge -->\n'
lines[203] = '          <line x1="208" y1="26" x2="145" y2="85" stroke="url(#armGrad)" stroke-width="5" stroke-linecap="round"/>\n'

# Find the shadow and highlight lines (204, 205 area) and fix them too
for i in range(200, 215):
    if 'rgba(0,0,0,0.6)' in lines[i] and 'stroke-width="7"' in lines[i]:
        lines[i] = '          <line x1="209" y1="27" x2="146" y2="86" stroke="rgba(0,0,0,0.6)" stroke-width="7" stroke-linecap="round"/>\n'
        print(f"Fixed shadow line {i+1}")
    if 'rgba(255,255,255,0.18)' in lines[i]:
        lines[i] = '          <line x1="207" y1="25" x2="144" y2="84" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-linecap="round"/>\n'
        print(f"Fixed highlight line {i+1}")

# Find and replace S-bend paths
for i in range(205, 220):
    if 'M148,80' in lines[i] or 'M140,90' in lines[i]:
        # Smooth S-curve: arm end → curves forward then slightly back → headshell
        # At scale: platter outer groove is around x=130,y=130 from top-left of wrap
        lines[i] = '          <!-- S-bend smooth curve -->\n'
        lines[i+1] = '          <path d="M145,85 C136,95 126,97 120,105 C114,113 112,120 114,128" stroke="#c2c2c2" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n'
        # Remove the old second path line if it exists
        if 'M130,96' in lines[i+2] or 'M130,96' in lines[i+1]:
            lines[i+2] = ''
        print(f"Fixed S-bend at line {i+1}")
        break

# Find headshell and stylus lines and fix positions to match new endpoint 114,128
for i in range(210, 240):
    if '<!-- Headshell connector -->' in lines[i]:
        lines[i]   = '          <!-- Headshell connector -->\n'
        lines[i+1] = '          <rect x="107" y="126" width="14" height="5" rx="2" fill="#3a3a3a" stroke="#666" stroke-width="1"/>\n'
        lines[i+2] = '          <!-- Headshell body -->\n'
        lines[i+3] = '          <rect x="105" y="131" width="16" height="11" rx="2" fill="#2a2a2a" stroke="#555" stroke-width="1"/>\n'
        lines[i+4] = '          <!-- Cartridge -->\n'
        lines[i+5] = '          <rect x="106" y="142" width="14" height="6" rx="1" fill="#1c1c1c" stroke="#444" stroke-width="1"/>\n'
        lines[i+6] = '          <!-- Cantilever -->\n'
        lines[i+7] = '          <line x1="113" y1="148" x2="113" y2="154" stroke="#666" stroke-width="1.5"/>\n'
        print(f"Fixed headshell at line {i+1}")
        break

# Fix stylus glow circles
for i in range(215, 245):
    if '<!-- Stylus' in lines[i] or ('<!-- Platter center' in lines[i]):
        lines[i]   = '          <!-- Stylus glow — on outer groove -->\n'
        lines[i+1] = '          <circle cx="113" cy="154" r="3" fill="#00ffcc" opacity="1"/>\n'
        lines[i+2] = '          <circle cx="113" cy="154" r="6" fill="#00ffcc" opacity="0.35"/>\n'
        lines[i+3] = '          <circle cx="113" cy="154" r="11" fill="#00ffcc" opacity="0.12"/>\n'
        # Clear any extra old circles
        if i+4 < len(lines) and '<circle cx="115"' in lines[i+4]:
            lines[i+4] = ''
        if i+4 < len(lines) and '<circle cx="115"' in lines[i+4]:
            lines[i+4] = ''
        print(f"Fixed stylus at line {i+1}")
        break

with open(path, 'w') as f:
    f.writelines(lines)

print("Done")
