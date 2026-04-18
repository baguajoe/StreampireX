#!/usr/bin/env python3
"""
StreamPireX DAW Timing Fixes Patch Script
Fixes core timing synchronization issues:
1. Metronome BPM sync
2. Cycle audio restart  
3. Timeline grid BPM sync
4. Context menu positioning

Run in your /workspaces/SpectraSphere directory
"""

import sys
import os

def patch_recording_studio():
    """Apply timing fixes to RecordingStudio.js"""
    file_path = "./src/front/js/pages/RecordingStudio.js"
    
    if not os.path.exists(file_path):
        print(f"❌ Error: {file_path} not found")
        return False
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Create backup
    backup_path = file_path + '.backup'
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"📁 Backup: {backup_path}")
    
    patches_applied = 0
    
    # Patch 1: Add metronome BPM sync useEffect
    patch1_find = """  // ── Start/stop metronome ──
  const startMetronome = useCallback(() => {"""
    
    patch1_replace = """  // ── Metronome BPM sync ──
  useEffect(() => {
    if (metronomeOn && metronomeIntervalRef.current) {
      // Restart metronome at new tempo when BPM changes
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
      startMetronome();
    }
  }, [bpm, startMetronome]);

  // ── Start/stop metronome ──
  const startMetronome = useCallback(() => {"""
    
    if patch1_find in content:
        content = content.replace(patch1_find, patch1_replace)
        patches_applied += 1
        print("✅ Metronome BPM sync useEffect added")
    else:
        print("⚠️  Metronome section not found - may need manual fix")
    
    # Patch 2: Fix cycle audio restart (try multiple patterns)
    patch2_patterns = [
        # Pattern 1: Most likely
        ("""        // ── At cycle boundary? ──
        if (cycleEnabled && beatNow >= cycleEnd) {
          playOffsetRef.current = (performance.now() - playStartRef.current) / 1000 - (cycleStart * 60) / bpm;
          playStartRef.current = performance.now() - (cycleStart * 60 * 1000) / bpm;
          audioRef.current.currentTime = (cycleStart * 60) / bpm;
        }""",
         """        // ── At cycle boundary? ──
        if (cycleEnabled && beatNow >= cycleEnd) {
          // Stop current audio sources and restart from cycle start
          if (trackSourcesRef.current) {
            Object.values(trackSourcesRef.current).forEach(sources => {
              if (Array.isArray(sources)) {
                sources.forEach(src => src?.stop && src.stop());
              }
            });
            trackSourcesRef.current = {};
          }
          
          // Reset timing to cycle start
          playOffsetRef.current = (performance.now() - playStartRef.current) / 1000 - (cycleStart * 60) / bpm;
          playStartRef.current = performance.now() - (cycleStart * 60 * 1000) / bpm;
          audioRef.current.currentTime = (cycleStart * 60) / bpm;
          
          // Restart audio tracks from cycle start
          tracks.forEach((track, trackIndex) => {
            if (track.regions) {
              track.regions.forEach(region => {
                const regionStart = region.startBeat;
                const regionEnd = regionStart + region.duration;
                if (regionStart >= cycleStart && regionStart < cycleEnd) {
                  // This region should be playing in the cycle - restart it
                  const regionOffsetTime = ((regionStart - cycleStart) * 60) / bpm;
                  setTimeout(() => {
                    playRegion(region, trackIndex, cycleStart);
                  }, regionOffsetTime * 1000);
                }
              });
            }
          });
        }"""),
        
        # Pattern 2: Simplified fallback
        ("""if (cycleEnabled && beatNow >= cycleEnd) {
          playOffsetRef.current = (performance.now() - playStartRef.current) / 1000 - (cycleStart * 60) / bpm;
          playStartRef.current = performance.now() - (cycleStart * 60 * 1000) / bpm;
          audioRef.current.currentTime = (cycleStart * 60) / bpm;
        }""",
         """if (cycleEnabled && beatNow >= cycleEnd) {
          // Stop current audio sources and restart from cycle start  
          if (trackSourcesRef.current) {
            Object.values(trackSourcesRef.current).forEach(sources => {
              if (Array.isArray(sources)) {
                sources.forEach(src => src?.stop && src.stop());
              }
            });
            trackSourcesRef.current = {};
          }
          
          playOffsetRef.current = (performance.now() - playStartRef.current) / 1000 - (cycleStart * 60) / bpm;
          playStartRef.current = performance.now() - (cycleStart * 60 * 1000) / bpm;
          audioRef.current.currentTime = (cycleStart * 60) / bpm;
        }""")
    ]
    
    patch2_applied = False
    for find_str, replace_str in patch2_patterns:
        if find_str in content:
            content = content.replace(find_str, replace_str)
            patches_applied += 1
            patch2_applied = True
            print("✅ Cycle audio restart logic fixed")
            break
    
    if not patch2_applied:
        print("⚠️  Cycle boundary section not found - may need manual fix")
    
    # Write patched file
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"📝 {patches_applied} patches applied to RecordingStudio.js")
    return patches_applied > 0

def patch_arranger_view():
    """Apply timing fixes to ArrangerView.js"""
    file_path = "./src/front/js/component/ArrangerView.js"
    
    if not os.path.exists(file_path):
        print(f"❌ Error: {file_path} not found")
        return False
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Create backup
    backup_path = file_path + '.backup'
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"📁 Backup: {backup_path}")
    
    patches_applied = 0
    
    # Patch 1: Make beatToPx BPM-aware
    if """const beatToPx    = (beat, zoom) => {
  return beat * zoom;
};""" in content:
        content = content.replace(
            """const beatToPx    = (beat, zoom) => {
  return beat * zoom;
};""",
            """const beatToPx    = (beat, zoom, bpm = 120) => {
  return beat * zoom * (bpm / 120);
};""")
        patches_applied += 1
        print("✅ beatToPx made BPM-aware")
    
    # Patch 2: Make pxToBeat BPM-aware  
    if """const pxToBeat    = (px, zoom) => {
  return px / zoom;
};""" in content:
        content = content.replace(
            """const pxToBeat    = (px, zoom) => {
  return px / zoom;
};""",
            """const pxToBeat    = (px, zoom, bpm = 120) => {
  return px / zoom / (bpm / 120);
};""")
        patches_applied += 1
        print("✅ pxToBeat made BPM-aware")
    
    # Patch 3: Add bpm to component signatures and calls
    component_patches = [
        ("const Region = React.memo(({", ", bmp = 120,"),
        ("const GridOverlay = React.memo(({", ", bpm = 120"),  
        ("const Playhead = React.memo(({", ", bpm = 120")
    ]
    
    for search, add_param in component_patches:
        if search in content and add_param not in content:
            # Find the line and add bpm parameter
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if search in line and "}) => {" in lines[i+2]:  # Component signature pattern
                    # Add bpm parameter to the parameters list
                    if add_param.strip() not in lines[i+1]:
                        lines[i+1] = lines[i+1].rstrip().rstrip(',') + add_param
                        patches_applied += 1
                        break
            content = '\n'.join(lines)
    
    # Patch 4: Update function calls to include BMP parameter
    call_patches = [
        ("beatToPx(", ", bpm)"),
        ("pxToBeat(", ", bpm)")
    ]
    
    for func_call, param_add in call_patches:
        # Only replace calls that don't already have 3 parameters
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if func_call in line and param_add.rstrip() not in line:
                # Count commas to see if it already has bpm parameter
                call_start = line.find(func_call)
                if call_start >= 0:
                    # Find the closing parenthesis for this call
                    paren_count = 0
                    call_end = call_start + len(func_call)
                    while call_end < len(line):
                        if line[call_end] == '(':
                            paren_count += 1
                        elif line[call_end] == ')':
                            if paren_count == 0:
                                break
                            paren_count -= 1
                        call_end += 1
                    
                    # Extract the parameters
                    params = line[call_start + len(func_call):call_end]
                    if params.count(',') == 1:  # Only has 2 parameters, needs bmp
                        line = line[:call_end] + param_add + line[call_end:]
                        lines[i] = line
                        patches_applied += 1
        
        content = '\n'.join(lines)
    
    # Patch 5: Fix context menu positioning
    ctx_menu_old = """const ContextMenu = React.memo(({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={menuRef} className="arr-ctx-menu" style={{ left: x, top: y }}>"""

    ctx_menu_new = """const ContextMenu = React.memo(({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Adjust position to keep menu on screen
  const adjustedStyle = useMemo(() => {
    const menuWidth = 200;
    const menuHeight = items.length * 32 + 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = Math.max(10, Math.min(x, viewportWidth - menuWidth - 10));
    let adjustedY = Math.max(10, Math.min(y, viewportHeight - menuHeight - 10));
    
    return { left: adjustedX, top: adjustedY };
  }, [x, y, items.length]);

  return (
    <div ref={menuRef} className="arr-ctx-menu" style={adjustedStyle}>"""
    
    if ctx_menu_old in content:
        content = content.replace(ctx_menu_old, ctx_menu_new)
        patches_applied += 1
        print("✅ Context menu positioning fixed")
    
    # Write patched file
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"📝 {patches_applied} patches applied to ArrangerView.js")
    return patches_applied > 0

def main():
    print("🔧 StreamPireX DAW Timing Fixes")
    print("=" * 40)
    
    if not os.path.exists('./src/front/js/'):
        print("❌ Error: Not in StreamPireX root directory")
        print("   Please run from /workspaces/SpectraSphere")
        return 1
    
    print("\n📝 Applying patches...")
    
    success1 = patch_recording_studio()
    success2 = patch_arranger_view()
    
    if success1 or success2:
        print("\n✅ TIMING FIXES APPLIED!")
        print("\n🚀 Next steps:")
        print("1. Run: npm run build")  
        print("2. Test metronome BPM sync")
        print("3. Test cycle/loop audio restart")
        print("4. Test timeline grid scaling with BPM changes")
        print("5. Test context menu positioning")
        return 0
    else:
        print("\n❌ No patches applied - files may have changed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
