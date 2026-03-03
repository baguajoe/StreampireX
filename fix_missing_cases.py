#!/usr/bin/env python3
"""
Adds missing file:saveAs and file:openLocal cases to RecordingStudio.js
Inserts right after: case "file:save": saveProject(); break;
"""

filepath = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'

with open(filepath, 'r') as f:
    content = f.read()

target = '''case "file:save":
        saveProject();
        break;'''

if target not in content:
    print("ERROR: Could not find file:save case block")
    exit(1)

insert = '''case "file:save":
        saveProject();
        break;
      case "file:openLocal": {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.spx,.json';
        inp.onchange = async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try {
            const text = await f.text(); const data = JSON.parse(text);
            if (data.format !== 'streampirex-daw') { setStatus('Not a valid StreamPireX project'); return; }
            stopEverything(); setProjectId(null);
            setProjectName(data.name || 'Imported Project');
            setBpm(data.bpm || 120); setMasterVolume(data.master_volume || 0.8);
            if (data.time_signature) { const ts = data.time_signature.split('/').map(Number); if (ts.length === 2) setTimeSignature(ts); }
            if (data.piano_roll_notes) setPianoRollNotes(data.piano_roll_notes);
            if (data.piano_roll_key) setPianoRollKey(data.piano_roll_key);
            if (data.piano_roll_scale) setPianoRollScale(data.piano_roll_scale);
            const trackCount = Math.min(Math.max(data.tracks?.length || 1, 1), maxTracks);
            const loaded = Array.from({ length: trackCount }, (_, i) => ({
              ...DEFAULT_TRACK(i), ...(data.tracks[i] || {}), audioBuffer: null,
              effects: data.tracks[i]?.effects || DEFAULT_EFFECTS(), regions: data.tracks[i]?.regions || []
            }));
            setTracks(loaded); setSelectedTrackIndex(0);
            setStatus('Opened: ' + (data.name || 'project'));
          } catch (err) { setStatus('Failed to open: ' + err.message); }
        };
        inp.click();
        break;
      }
      case "file:saveAs": {
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

content = content.replace(target, insert, 1)

with open(filepath, 'w') as f:
    f.write(content)

print("Done! Added file:openLocal and file:saveAs cases.")
print("Test: File > Save As should now show a prompt and download .spx")
print("Test: File > Open From Desktop should open a file picker for .spx files")
