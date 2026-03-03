#!/usr/bin/env python3
"""
Adds 'file:saveDesktop' case to RecordingStudio.js handleMenuAction switch.
Run: python3 add_save_desktop.py
"""

filepath = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'

with open(filepath, 'r') as f:
    content = f.read()

# Find the insertion point — right before case 'file:importAudio'
target = "case "file:importAudio":"

if target not in content:
    print("ERROR: Could not find 'file:importAudio' case in RecordingStudio.js")
    exit(1)

new_case = """case 'file:saveDesktop': {
        // Force download — works on all browsers including Codespace URLs
        const dlData = {
          name: projectName, bpm,
          time_signature: `${timeSignature[0]}/${timeSignature[1]}`,
          master_volume: masterVolume,
          tracks: tracks.map(t => ({
            name: t.name, volume: t.volume, pan: t.pan,
            muted: t.muted, solo: t.solo, effects: t.effects,
            color: t.color, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })),
            audio_url: typeof t.audio_url === 'string' && !t.audio_url.startsWith('blob:') ? t.audio_url : null
          })),
          piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale,
          created_at: new Date().toISOString(), format: 'streampirex-daw', version: '1.0'
        };
        const dlBlob = new Blob([JSON.stringify(dlData, null, 2)], { type: 'application/json' });
        const dlUrl = URL.createObjectURL(dlBlob);
        const dlA = document.createElement('a');
        dlA.href = dlUrl; dlA.download = `${projectName.replace(/\\s+/g, '_')}.spx`;
        document.body.appendChild(dlA); dlA.click(); document.body.removeChild(dlA);
        URL.revokeObjectURL(dlUrl);
        setStatus(`✓ Downloaded: ${projectName}.spx`);
        break;
      }
      """

content = content.replace(target, new_case + target)

with open(filepath, 'w') as f:
    f.write(content)

print("✅ Added 'file:saveDesktop' case to RecordingStudio.js")
print("   Now click File > Save to Desktop in the DAW menu.")
