#!/usr/bin/env python3
"""
Debug Console Fader Values

Adds console logging to track when/where tracks get different volume values.
This will help us see exactly where the volume inconsistency comes from.

Run: python3 debug_fader_values.py src/front/js/pages/RecordingStudio.js
Then open browser console and create a few tracks to see the logs.
"""

import sys

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def add_debug_logging(path):
    print(f"Adding debug logging to {path}")
    src = read_file(path)
    
    # Add debug logging to DEFAULT_TRACK
    old_default = '''const DEFAULT_TRACK = (i, type = "audio") => ({
  id: uid(),
  name: `${type === "midi" ? "MIDI" : type === "bus" ? "Bus" : type === "aux" ? "Aux" : "Audio"} ${i + 1}`,
  trackType: type,
  instrument: type === "midi" ? { program: 0, name: "Acoustic Grand" } : null,
  volume: 1.0, pan: 0, muted: false, solo: false, armed: false,
  audio_url: null, color: TRACK_COLORS[i % TRACK_COLORS.length],
  audioBuffer: null, effects: DEFAULT_EFFECTS(), regions: [],
});'''

    new_default = '''const DEFAULT_TRACK = (i, type = "audio") => {
  const track = {
    id: uid(),
    name: `${type === "midi" ? "MIDI" : type === "bus" ? "Bus" : type === "aux" ? "Aux" : "Audio"} ${i + 1}`,
    trackType: type,
    instrument: type === "midi" ? { program: 0, name: "Acoustic Grand" } : null,
    volume: 1.0, pan: 0, muted: false, solo: false, armed: false,
    audio_url: null, color: TRACK_COLORS[i % TRACK_COLORS.length],
    audioBuffer: null, effects: DEFAULT_EFFECTS(), regions: [],
  };
  console.log(`[DEBUG] DEFAULT_TRACK created: ${track.name}, volume=${track.volume}, type=${type}`);
  return track;
};'''

    if old_default in src:
        src = src.replace(old_default, new_default)
        print("  [OK] Added DEFAULT_TRACK logging")
    else:
        print("  [SKIP] DEFAULT_TRACK not found")

    # Add debug logging to updateTrack
    old_update = '''  const updateTrack = useCallback((i, u) => setTracks(p => p.map((t, idx) => idx === i ? { ...t, ...u } : t)), []);'''
    
    new_update = '''  const updateTrack = useCallback((i, u) => {
    if (u.volume !== undefined) console.log(`[DEBUG] updateTrack: Track ${i} volume ${u.volume}`);
    setTracks(p => p.map((t, idx) => idx === i ? { ...t, ...u } : t));
  }, []);'''

    if old_update in src:
        src = src.replace(old_update, new_update)
        print("  [OK] Added updateTrack logging")
    else:
        print("  [SKIP] updateTrack not found")

    # Add debug logging to setTracks calls
    # Find all places where tracks array gets modified
    import re
    
    # Add logging when tracks state changes
    old_tracks_effect = '''  useEffect(() => {
    if (!audioCtxRef.current || !masterGainRef.current) return;
    tracks.filter(t => t.trackType === "bus" || t.trackType === "aux").forEach(t => ensureBusGraph(t));
    tracks.filter(t => t.trackType !== "bus" && t.trackType !== "aux").forEach(t => ensureTrackGraph(t));
  }, [tracks]);'''

    new_tracks_effect = '''  useEffect(() => {
    console.log(`[DEBUG] Tracks changed:`, tracks.map(t => `${t.name}:vol=${t.volume}`));
    if (!audioCtxRef.current || !masterGainRef.current) return;
    tracks.filter(t => t.trackType === "bus" || t.trackType === "aux").forEach(t => ensureBusGraph(t));
    tracks.filter(t => t.trackType !== "bus" && t.trackType !== "aux").forEach(t => ensureTrackGraph(t));
  }, [tracks]);'''

    if old_tracks_effect in src:
        src = src.replace(old_tracks_effect, new_tracks_effect)
        print("  [OK] Added tracks useEffect logging")
    else:
        print("  [SKIP] tracks useEffect not found")

    write_file(path, src)
    print(f"Debug logging added. Check browser console after creating tracks.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 debug_fader_values.py <RecordingStudio.js>")
        sys.exit(1)
    add_debug_logging(sys.argv[1])
