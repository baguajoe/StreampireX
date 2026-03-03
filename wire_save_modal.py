#!/usr/bin/env python3
"""
Wire SaveAsModal into RecordingStudio.js
1. Add import
2. Add state variables
3. Replace file:saveAs window.prompt with modal trigger
4. Add <SaveAsModal /> JSX before closing </div>
"""

filepath = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'

with open(filepath, 'r') as f:
    content = f.read()

changes = 0

# ── 1. Add import (after DAWMenuBar import) ──
import_target = "import DAWMenuBar from '../component/DAWMenuBar';"
import_line = "import SaveAsModal from '../component/SaveAsModal';"

if import_line not in content:
    if import_target in content:
        content = content.replace(
            import_target,
            import_target + "\n" + import_line
        )
        changes += 1
        print("1. Added SaveAsModal import")
    else:
        print("1. SKIP: Could not find DAWMenuBar import to anchor to")
else:
    print("1. SKIP: SaveAsModal import already exists")

# ── 2. Add state variables (after pianoRollScale state) ──
state_target = "const [pianoRollScale, setPianoRollScale] = useState('major');"
state_lines = """const [pianoRollScale, setPianoRollScale] = useState('major');

  // ── Save As modal state ──
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsData, setSaveAsData] = useState(null);"""

if 'showSaveAsModal' not in content:
    if state_target in content:
        content = content.replace(state_target, state_lines, 1)
        changes += 1
        print("2. Added showSaveAsModal state")
    else:
        print("2. SKIP: Could not find pianoRollScale state line")
else:
    print("2. SKIP: showSaveAsModal state already exists")

# ── 3. Replace file:saveAs case to use modal instead of prompt ──
old_saveAs = '''case "file:saveAs": {
        const saveData = {
          name: projectName, bpm,
          time_signature: timeSignature[0] + '/' + timeSignature[1],
          master_volume: masterVolume,
          tracks: tracks.map(t => ({
            name: t.name, volume: t.volume, pan: t.pan,
            muted: t.muted, solo: t.solo, effects: t.effects,
            color: t.color,
            regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })),
            audio_url: typeof t.audio_url === 'string' && !t.audio_url.startsWith('blob:') ? t.audio_url : null
          })),
          piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale,
          created_at: new Date().toISOString(), format: 'streampirex-daw', version: '1.0'
        };
        const jsonStr = JSON.stringify(saveData, null, 2);
        const fileName = window.prompt('Save project as:', projectName.replace(/\\s+/g, '_') + '.spx');
        if (fileName && fileName.trim()) {
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName.trim().endsWith('.spx') ? fileName.trim() : fileName.trim() + '.spx';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setStatus('Saved: ' + fileName.trim());
        }
        break;
      }'''

new_saveAs = '''case "file:saveAs": {
        const saveData = {
          name: projectName, bpm,
          time_signature: timeSignature[0] + '/' + timeSignature[1],
          master_volume: masterVolume,
          tracks: tracks.map(t => ({
            name: t.name, volume: t.volume, pan: t.pan,
            muted: t.muted, solo: t.solo, effects: t.effects,
            color: t.color,
            regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })),
            audio_url: typeof t.audio_url === 'string' && !t.audio_url.startsWith('blob:') ? t.audio_url : null
          })),
          piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale,
          created_at: new Date().toISOString(), format: 'streampirex-daw', version: '1.0'
        };
        setSaveAsData(JSON.stringify(saveData, null, 2));
        setShowSaveAsModal(true);
        break;
      }'''

if old_saveAs in content:
    content = content.replace(old_saveAs, new_saveAs, 1)
    changes += 1
    print("3. Replaced file:saveAs to use modal")
else:
    print("3. SKIP: Could not find exact file:saveAs block (may need manual edit)")

# ── 4. Add the download handler + JSX (before final closing </div> of the component) ──
# We'll add the SaveAsModal JSX + handler right before the final return's closing </div>
# Look for the handleMenuAction's default case or the end of the JSX

save_modal_jsx = '''
      {/* ═══════════════════ SAVE AS MODAL ═══════════════════ */}
      <SaveAsModal
        show={showSaveAsModal}
        defaultName={projectName}
        onSave={(fileName) => {
          if (saveAsData) {
            const blob = new Blob([saveAsData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatus('Saved: ' + fileName);
          }
          setShowSaveAsModal(false);
          setSaveAsData(null);
        }}
        onCancel={() => { setShowSaveAsModal(false); setSaveAsData(null); }}
      />'''

if 'SaveAsModal' not in content.split('return')[1] if 'return' in content else '':
    # Find the last </div> in the component's return statement
    # Look for the pattern: status bar area near end, before final </div>
    # Safer: find "{/* ═══════════════════ MAIN VIEW AREA" and add before final closing
    
    # Strategy: Add before the very last occurrence of "\n  );\n};" which closes the component
    end_marker = "\n  );\n};"
    if end_marker in content:
        # Insert before the closing
        last_idx = content.rfind(end_marker)
        # But we need to go inside the return's JSX, find the </div> before );\n};
        # Look for the last </div> before this marker
        search_area = content[:last_idx]
        last_div_idx = search_area.rfind('</div>')
        if last_div_idx > 0:
            # Insert the modal JSX right before this last </div>
            content = content[:last_div_idx] + save_modal_jsx + "\n    " + content[last_div_idx:]
            changes += 1
            print("4. Added SaveAsModal JSX to component return")
        else:
            print("4. SKIP: Could not find closing </div> for JSX insertion")
    else:
        print("4. SKIP: Could not find component end marker")
else:
    print("4. SKIP: SaveAsModal JSX already in return block")

# ── Write ──
if changes > 0:
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"\n✅ Applied {changes} changes to RecordingStudio.js")
    print("   Copy SaveAsModal.js to src/front/js/component/SaveAsModal.js")
    print("   Then test File > Save As in the DAW menu")
else:
    print("\nNo changes applied.")
