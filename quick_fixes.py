#!/usr/bin/env python3
"""
Quick fixes for StreamPireX timing patch issues:
1. Fix syntax errors in ArrangerView.js
2. Fix audio import level to 0.0 dB instead of -1.9 dB
"""

import sys
import os

def fix_arranger_syntax():
    """Fix syntax errors in ArrangerView.js"""
    file_path = "./src/front/js/component/ArrangerView.js"
    
    if not os.path.exists(file_path):
        print(f"❌ {file_path} not found")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix the syntax errors
    fixes_applied = 0
    
    # Fix 1: Remove extra parenthesis
    if "beatToPx(region.startBeat, zoom, bpm));" in content:
        content = content.replace("beatToPx(region.startBeat, zoom, bpm));", "beatToPx(region.startBeat, zoom, bpm);")
        fixes_applied += 1
        print("✅ Fixed extra parenthesis in region.startBeat")
    
    # Fix 2: Fix Math.max parenthesis
    if "Math.max(beatToPx(region.duration, zoom, bpm)), 8);" in content:
        content = content.replace("Math.max(beatToPx(region.duration, zoom, bpm)), 8);", "Math.max(beatToPx(region.duration, zoom, bpm), 8);")
        fixes_applied += 1
        print("✅ Fixed Math.max parenthesis")
    
    # Fix 3: Fix any remaining bmp typos
    if ", bmp)" in content:
        content = content.replace(", bmp)", ", bpm)")
        fixes_applied += 1
        print("✅ Fixed bmp → bpm typo")
    
    # Write the fixed file
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"📝 {fixes_applied} syntax fixes applied to ArrangerView.js")
    return fixes_applied > 0

def fix_audio_level():
    """Fix audio import level to 0.0 dB"""
    file_path = "./src/front/js/pages/RecordingStudio.js"
    
    if not os.path.exists(file_path):
        print(f"❌ {file_path} not found")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    fixes_applied = 0
    
    # Look for audio import level settings
    patterns_to_fix = [
        # Pattern 1: Direct volume assignment in audio import
        ("volume: 0.8", "volume: 1.0"),
        ("volume: 0.81", "volume: 1.0"),  # -1.9 dB ≈ 0.81
        ("volume: .8", "volume: 1.0"),
        ("volume: .81", "volume: 1.0"),
        
        # Pattern 2: Audio buffer processing
        ("audioBuffer.gain = 0.8", "audioBuffer.gain = 1.0"),
        ("audioBuffer.gain = 0.81", "audioBuffer.gain = 1.0"),
        
        # Pattern 3: Track default volume
        ("volume: -1.9", "volume: 0.0"),
        ("volume: -2", "volume: 0.0"),
        
        # Pattern 4: dB to linear conversion
        ("Math.pow(10, -1.9 / 20)", "1.0"),
        ("Math.pow(10, -2 / 20)", "1.0"),
    ]
    
    for old_pattern, new_pattern in patterns_to_fix:
        if old_pattern in content:
            content = content.replace(old_pattern, new_pattern)
            fixes_applied += 1
            print(f"✅ Fixed audio level: {old_pattern} → {new_pattern}")
    
    # Look for DEFAULT_TRACK function and ensure volume is 1.0
    if "DEFAULT_TRACK" in content and "volume:" in content:
        lines = content.split('\n')
        in_default_track = False
        for i, line in enumerate(lines):
            if "DEFAULT_TRACK" in line and "=>" in line:
                in_default_track = True
            elif in_default_track and "volume:" in line and ("0.8" in line or "0.81" in line):
                lines[i] = line.replace("0.8", "1.0").replace("0.81", "1.0")
                fixes_applied += 1
                print("✅ Fixed DEFAULT_TRACK volume to 1.0")
                break
            elif in_default_track and ("}" in line or "return" in line):
                in_default_track = False
        content = '\n'.join(lines)
    
    # Write the fixed file
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"📝 {fixes_applied} audio level fixes applied to RecordingStudio.js")
    return fixes_applied > 0

def main():
    print("🔧 StreamPireX Quick Fixes")
    print("=" * 30)
    
    if not os.path.exists('./src/front/js/'):
        print("❌ Not in StreamPireX directory")
        print("   Run from /workspaces/SpectraSphere")
        return 1
    
    print("\n1️⃣ Fixing syntax errors...")
    syntax_fixed = fix_arranger_syntax()
    
    print("\n2️⃣ Fixing audio import levels...")
    audio_fixed = fix_audio_level()
    
    if syntax_fixed or audio_fixed:
        print("\n✅ FIXES APPLIED!")
        print("\n🚀 Next steps:")
        print("1. Run: npm run build")
        print("2. Test audio import (should be 0.0 dB)")
        print("3. Test timing synchronization")
        return 0
    else:
        print("\n⚠️ No issues found to fix")
        return 1

if __name__ == "__main__":
    sys.exit(main())
