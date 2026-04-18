#!/usr/bin/env python3
"""
Direct fix for specific ArrangerView.js syntax errors
Targets the exact lines causing build failures
"""

import os

def fix_exact_errors():
    """Fix the exact syntax errors shown in the console"""
    file_path = "./src/front/js/component/ArrangerView.js"
    
    if not os.path.exists(file_path):
        print(f"❌ {file_path} not found")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    print("🔧 Fixing exact syntax errors...")
    
    # Fix the specific errors shown in console
    fixes = [
        # Line 180: const left = beatToPx(region.startBeat, zoom, bpm));
        ('beatToPx(region.startBeat, zoom, bpm));', 'beatToPx(region.startBeat, zoom, bpm);'),
        
        # Line 181: Math.max(beatToPx(region.duration, zoom, bpm)), 8);
        ('Math.max(beatToPx(region.duration, zoom, bpm)), 8);', 'Math.max(beatToPx(region.duration, zoom, bmp), 8);'),
        
        # Line 448: const x1 = beatToPx(cycleStart, zoom, bpm)) - scrollLeft;
        ('beatToPx(cycleStart, zoom, bpm)) - scrollLeft;', 'beatToPx(cycleStart, zoom, bpm) - scrollLeft;'),
        
        # Line 449: const x2 = beatToPx(cycleEnd, zoom, bpm)) - scrollLeft;
        ('beatToPx(cycleEnd, zoom, bpm)) - scrollLeft;', 'beatToPx(cycleEnd, zoom, bpm) - scrollLeft;'),
        
        # Any remaining double closing parens
        ('zoom, bpm));', 'zoom, bpm);'),
        ('zoom, bpm)),', 'zoom, bpm),'),
        
        # Fix any pxToBeat errors
        ('pxToBeat(dx, zoom, bpm));', 'pxToBeat(dx, zoom, bpm);'),
    ]
    
    fixes_applied = 0
    
    for old, new in fixes:
        if old in content:
            content = content.replace(old, new)
            fixes_applied += 1
            print(f"✅ Fixed: {old[:50]}...")
    
    # Write the file
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"📝 Applied {fixes_applied} fixes")
    return fixes_applied > 0

if __name__ == "__main__":
    print("🔧 Direct Syntax Error Fix")
    print("=" * 30)
    
    if not os.path.exists('./src/front/js/component/'):
        print("❌ Run from /workspaces/SpectraSphere")
        exit(1)
    
    success = fix_exact_errors()
    
    if success:
        print("\n✅ SYNTAX ERRORS FIXED!")
        print("Run: npm run build")
    else:
        print("\n⚠️ No errors found to fix")
