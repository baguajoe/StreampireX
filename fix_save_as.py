#!/usr/bin/env python3
"""
Fix file:saveAs in RecordingStudio.js
Removes showSaveFilePicker (fails silently on Codespace URLs)
Always uses prompt + download approach instead.
"""

filepath = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'

with open(filepath, 'r') as f:
    content = f.read()

# Find the old saveAs block - look for the showSaveFilePicker check
old = """if (window.showSaveFilePicker) {
          // Modern browsers — native OS save dialog
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: `${projectName.replace(/\\s+/g, '_')}.spx`,
              types: [{
                description: 'StreamPireX Project',
                accept: { 'application/json': ['.spx'] }
              }]
            });
            const writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            setStatus(`✓ Saved: ${handle.name}`);
          } catch (err) {
            if (err.name !== 'AbortError') setStatus(`✗ Save failed: ${err.message}`);
          }
        } else {
          // Fallback for Firefox/Safari — prompt for name then download
          const fileName = window.prompt('Save project as:', `${projectName.replace(/\\s+/g, '_')}.spx`);"""

new = """// Prompt for filename then download
          const fileName = window.prompt('Save project as:', `${projectName.replace(/\\s+/g, '_')}.spx`);"""

if old in content:
    content = content.replace(old, new)
    # Also remove the extra closing brace from the else block
    # The old code had:  } else { ... }  — we removed the if/else, so drop trailing }
    # Find and remove the stray closing brace
    with open(filepath, 'w') as f:
        f.write(content)
    print("✅ Fixed file:saveAs — removed showSaveFilePicker, always uses prompt+download")
else:
    print("Could not find exact showSaveFilePicker block. Trying alternate match...")
    
    # Try a more flexible search
    if 'showSaveFilePicker' in content:
        # Find the saveAs case and count lines
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'showSaveFilePicker' in line and i > 0:
                print(f"  Found showSaveFilePicker at line {i+1}: {line.strip()}")
        
        print("\nManual fix needed. In the file:saveAs case, delete the")
        print("'if (window.showSaveFilePicker) { ... } else {' wrapper")
        print("and keep only the prompt+download code inside the else block.")
    else:
        print("showSaveFilePicker not found — may already be fixed!")
