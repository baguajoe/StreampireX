// =============================================================================
// MidiHardwareInput.js — Web MIDI API Controller Support
// =============================================================================
// Location: src/front/js/component/MidiHardwareInput.js
// Connects external MIDI controllers (Akai MPK Mini, Novation Launchpad, etc.)
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

const VELOCITY_CURVES = {
  linear: (v) => v,
  soft: (v) => Math.round(Math.pow(v / 127, 0.6) * 127),
  hard: (v) => Math.round(Math.pow(v / 127, 1.5) * 127),
  fixed: () => 100,
  compressed: (v) => Math.round(64 + (v / 127) * 63),
};

const MidiHardwareInput = ({
  onNoteOn, onNoteOff, onCC, onPitchBend, onPadTrigger,
  drumMode = false, channelFilter = -1,
}) => {
  const [midiAccess, setMidiAccess] = useState(null);
  const [devices, setDevices] = useState([]);
  const [activeDevice, setActiveDevice] = useState(null);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(null);
  const [lastNote, setLastNote] = useState(null);
  const [lastCC, setLastCC] = useState(null);
  const [velocityCurve, setVelocityCurve] = useState('linear');
  const [noteCount, setNoteCount] = useState(0);
  const [midiActivity, setMidiActivity] = useState(false);
  const [padMapping, setPadMapping] = useState('gm');
  const [transpose, setTranspose] = useState(0);
  const [octaveShift, setOctaveShift] = useState(0);

  const activityTimeoutRef = useRef(null);

  const mapNoteToPad = useCallback((note) => {
    if (padMapping === 'gm') {
      const GM = { 36:0,37:1,38:2,39:3,40:4,41:5,42:6,43:7,44:8,45:9,46:10,47:11,48:12,49:13,50:14,51:15 };
      return GM[note] ?? -1;
    } else if (padMapping === 'chromatic') {
      const base = 36 + (octaveShift * 12);
      const idx = note - base;
      return (idx >= 0 && idx < 16) ? idx : -1;
    }
    return note % 16;
  }, [padMapping, octaveShift]);

  const handleMidiMessage = useCallback((event) => {
    const [status, data1, data2] = event.data;
    const type = status & 0xF0;
    const channel = status & 0x0F;

    if (channelFilter >= 0 && channel !== channelFilter) return;

    // Activity indicator
    setMidiActivity(true);
    clearTimeout(activityTimeoutRef.current);
    activityTimeoutRef.current = setTimeout(() => setMidiActivity(false), 150);

    const curveFunc = VELOCITY_CURVES[velocityCurve] || VELOCITY_CURVES.linear;

    if (type === 0x90 && data2 > 0) {
      // Note On
      const note = data1 + transpose + (octaveShift * 12);
      const velocity = curveFunc(data2);
      setLastNote({ note, velocity, channel, type: 'on' });
      setNoteCount(c => c + 1);

      if (drumMode && onPadTrigger) {
        const pad = mapNoteToPad(data1);
        if (pad >= 0) onPadTrigger(pad, velocity / 127);
      }
      if (onNoteOn) onNoteOn(note, velocity, channel);

    } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
      // Note Off
      const note = data1 + transpose + (octaveShift * 12);
      setLastNote({ note, velocity: 0, channel, type: 'off' });
      if (onNoteOff) onNoteOff(note, channel);

    } else if (type === 0xB0) {
      // Control Change
      setLastCC({ controller: data1, value: data2, channel });
      if (onCC) onCC(data1, data2, channel);

    } else if (type === 0xE0) {
      // Pitch Bend
      const bend = ((data2 << 7) | data1) - 8192;
      if (onPitchBend) onPitchBend(bend, channel);
    }
  }, [channelFilter, velocityCurve, transpose, octaveShift, drumMode, mapNoteToPad,
      onNoteOn, onNoteOff, onCC, onPitchBend, onPadTrigger]);

  // ==========================================================================
  // INIT WEB MIDI
  // ==========================================================================

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setSupported(false);
      setError('Web MIDI not supported in this browser. Try Chrome or Edge.');
      return;
    }

    navigator.requestMIDIAccess({ sysex: false })
      .then(access => {
        setMidiAccess(access);
        updateDevices(access);

        access.onstatechange = () => updateDevices(access);
      })
      .catch(err => {
        setError(`MIDI access denied: ${err.message}`);
      });

    return () => {
      clearTimeout(activityTimeoutRef.current);
    };
  }, []);

  const updateDevices = useCallback((access) => {
    const inputs = [];
    access.inputs.forEach((input, id) => {
      inputs.push({ id, name: input.name, manufacturer: input.manufacturer, state: input.state });
    });
    setDevices(inputs);

    // Auto-connect first device
    if (inputs.length > 0 && !activeDevice) {
      connectDevice(access, inputs[0].id);
    }
  }, [activeDevice]);

  const connectDevice = useCallback((access, deviceId) => {
    // Disconnect previous
    if (access) {
      access.inputs.forEach(input => { input.onmidimessage = null; });
    }

    const input = access?.inputs.get(deviceId);
    if (input) {
      input.onmidimessage = handleMidiMessage;
      setActiveDevice({ id: deviceId, name: input.name });
    }
  }, [handleMidiMessage]);

  const disconnectDevice = useCallback(() => {
    if (midiAccess) {
      midiAccess.inputs.forEach(input => { input.onmidimessage = null; });
    }
    setActiveDevice(null);
  }, [midiAccess]);

  // Reconnect when handler changes
  useEffect(() => {
    if (midiAccess && activeDevice) {
      connectDevice(midiAccess, activeDevice.id);
    }
  }, [handleMidiMessage]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!supported) {
    return (
      <div className="midi-hw-panel midi-hw-unsupported">
        <div className="midi-hw-icon">🎹</div>
        <div>Web MIDI not supported. Use Chrome or Edge.</div>
      </div>
    );
  }

  return (
    <div className="midi-hw-panel">
      <div className="midi-hw-header">
        <span className="midi-hw-title">
          🎹 MIDI Controller
          <span className={`midi-hw-dot ${midiActivity ? 'active' : ''}`} />
        </span>
        {noteCount > 0 && <span className="midi-hw-count">{noteCount} notes</span>}
      </div>

      {error && <div className="midi-hw-error">⚠️ {error}</div>}

      {/* Device Selector */}
      <div className="midi-hw-devices">
        {devices.length === 0 ? (
          <div className="midi-hw-no-device">No MIDI devices detected. Plug in a controller.</div>
        ) : (
          <select className="midi-hw-select"
            value={activeDevice?.id || ''}
            onChange={e => connectDevice(midiAccess, e.target.value)}>
            <option value="">Select device...</option>
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} {d.manufacturer ? `(${d.manufacturer})` : ''}
              </option>
            ))}
          </select>
        )}
        {activeDevice && (
          <button className="midi-hw-disconnect" onClick={disconnectDevice}>✕</button>
        )}
      </div>

      {/* Settings */}
      {activeDevice && (
        <div className="midi-hw-settings">
          <div className="midi-hw-setting">
            <label>Velocity:</label>
            <select className="midi-hw-select" value={velocityCurve}
              onChange={e => setVelocityCurve(e.target.value)}>
              {Object.keys(VELOCITY_CURVES).map(k => (
                <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="midi-hw-setting">
            <label>Transpose:</label>
            <div className="midi-hw-spinbox">
              <button onClick={() => setTranspose(t => t - 1)}>−</button>
              <span>{transpose > 0 ? `+${transpose}` : transpose}</span>
              <button onClick={() => setTranspose(t => t + 1)}>+</button>
            </div>
          </div>

          <div className="midi-hw-setting">
            <label>Octave:</label>
            <div className="midi-hw-spinbox">
              <button onClick={() => setOctaveShift(o => Math.max(-3, o - 1))}>−</button>
              <span>{octaveShift > 0 ? `+${octaveShift}` : octaveShift}</span>
              <button onClick={() => setOctaveShift(o => Math.min(3, o + 1))}>+</button>
            </div>
          </div>

          {drumMode && (
            <div className="midi-hw-setting">
              <label>Pad Map:</label>
              <select className="midi-hw-select" value={padMapping}
                onChange={e => setPadMapping(e.target.value)}>
                <option value="gm">GM Drums</option>
                <option value="chromatic">Chromatic</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Live Monitor */}
      {activeDevice && (
        <div className="midi-hw-monitor">
          {lastNote && (
            <span className="midi-hw-last">
              {lastNote.type === 'on' ? '🟢' : '⚫'}
              Note {lastNote.note} vel:{lastNote.velocity} ch:{lastNote.channel + 1}
            </span>
          )}
          {lastCC && (
            <span className="midi-hw-last">
              🎛️ CC{lastCC.controller}={lastCC.value} ch:{lastCC.channel + 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MidiHardwareInput;
// =============================================================================
// MIDI OUTPUT — Send MIDI to hardware synths, drum machines, etc.
// =============================================================================
// Works with: Any class-compliant USB MIDI device
// Examples: Moog Subsequent 37, Roland JX-3P, Korg Minilogue, Arturia,
//           Teenage Engineering, Elektron, any hardware synth with USB MIDI
// =============================================================================

export function useMidiOutput() {
  const [outputs, setOutputs] = React.useState([]);
  const [activeOutput, setActiveOutput] = React.useState(null);
  const [midiAccess, setMidiAccess] = React.useState(null);
  const outputRef = React.useRef(null);

  React.useEffect(() => {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess({ sysex: false }).then(access => {
      setMidiAccess(access);
      const outs = [];
      access.outputs.forEach((out, id) => {
        outs.push({ id, name: out.name, manufacturer: out.manufacturer, state: out.state });
      });
      setOutputs(outs);
      // Auto-connect first output
      if (outs.length > 0) {
        const first = access.outputs.values().next().value;
        outputRef.current = first;
        setActiveOutput({ id: first.id, name: first.name });
      }
      // Listen for device changes
      access.onstatechange = () => {
        const updated = [];
        access.outputs.forEach((out, id) => {
          updated.push({ id, name: out.name, manufacturer: out.manufacturer, state: out.state });
        });
        setOutputs(updated);
      };
    }).catch(err => console.warn('MIDI Output error:', err));
  }, []);

  const connectOutput = React.useCallback((deviceId) => {
    if (!midiAccess) return;
    const out = midiAccess.outputs.get(deviceId);
    if (out) {
      outputRef.current = out;
      setActiveOutput({ id: deviceId, name: out.name });
    }
  }, [midiAccess]);

  // ── Send note on ──
  const noteOn = React.useCallback((note, velocity = 100, channel = 0) => {
    if (!outputRef.current) return;
    outputRef.current.send([0x90 | (channel & 0x0F), note & 0x7F, velocity & 0x7F]);
  }, []);

  // ── Send note off ──
  const noteOff = React.useCallback((note, channel = 0) => {
    if (!outputRef.current) return;
    outputRef.current.send([0x80 | (channel & 0x0F), note & 0x7F, 0]);
  }, []);

  // ── Send CC ──
  const sendCC = React.useCallback((cc, value, channel = 0) => {
    if (!outputRef.current) return;
    outputRef.current.send([0xB0 | (channel & 0x0F), cc & 0x7F, value & 0x7F]);
  }, []);

  // ── Send pitch bend ──
  const sendPitchBend = React.useCallback((value, channel = 0) => {
    // value: -8192 to 8191
    if (!outputRef.current) return;
    const v = Math.max(-8192, Math.min(8191, value)) + 8192;
    outputRef.current.send([0xE0 | (channel & 0x0F), v & 0x7F, (v >> 7) & 0x7F]);
  }, []);

  // ── Send program change ──
  const sendProgramChange = React.useCallback((program, channel = 0) => {
    if (!outputRef.current) return;
    outputRef.current.send([0xC0 | (channel & 0x0F), program & 0x7F]);
  }, []);

  // ── Send clock ──
  const sendClock = React.useCallback(() => {
    if (!outputRef.current) return;
    outputRef.current.send([0xF8]);
  }, []);

  // ── Send start ──
  const sendStart = React.useCallback(() => {
    if (!outputRef.current) return;
    outputRef.current.send([0xFA]);
  }, []);

  // ── Send stop ──
  const sendStop = React.useCallback(() => {
    if (!outputRef.current) return;
    outputRef.current.send([0xFC]);
  }, []);

  // ── All notes off (panic) ──
  const allNotesOff = React.useCallback((channel = 0) => {
    if (!outputRef.current) return;
    outputRef.current.send([0xB0 | (channel & 0x0F), 123, 0]);
  }, []);

  // ── Send full chord ──
  const sendChord = React.useCallback((notes, velocity = 100, channel = 0) => {
    notes.forEach(note => noteOn(note, velocity, channel));
  }, [noteOn]);

  // ── Release full chord ──
  const releaseChord = React.useCallback((notes, channel = 0) => {
    notes.forEach(note => noteOff(note, channel));
  }, [noteOff]);

  // ── Send MIDI clock sync at BPM ──
  const startClockSync = React.useCallback((bpm) => {
    const intervalMs = (60 / bpm / 24) * 1000; // 24 ppqn
    const id = setInterval(() => sendClock(), intervalMs);
    sendStart();
    return () => { clearInterval(id); sendStop(); };
  }, [sendClock, sendStart, sendStop]);

  return {
    outputs,
    activeOutput,
    connectOutput,
    noteOn,
    noteOff,
    sendCC,
    sendPitchBend,
    sendProgramChange,
    sendClock,
    sendStart,
    sendStop,
    allNotesOff,
    sendChord,
    releaseChord,
    startClockSync,
    isConnected: !!activeOutput,
  };
}

// =============================================================================
// MidiOutputPanel — UI component for selecting MIDI output device
// =============================================================================
export function MidiOutputPanel({ onOutputReady }) {
  const midi = useMidiOutput();

  React.useEffect(() => {
    if (midi.isConnected && onOutputReady) onOutputReady(midi);
  }, [midi.isConnected]);

  const S = {
    panel: { background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11, color: '#cdd6f4' },
    title: { color: '#cba6f7', fontWeight: 700, marginBottom: 8, fontSize: 12 },
    row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
    select: { flex: 1, background: '#161b22', border: '1px solid #30363d', color: '#cdd6f4', borderRadius: 4, padding: '3px 6px', fontSize: 11 },
    badge: { padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: midi.isConnected ? 'rgba(0,255,100,0.15)' : 'rgba(255,100,100,0.15)', color: midi.isConnected ? '#00ff64' : '#ff6464' },
    btn: { padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: '#313244', color: '#cdd6f4' },
  };

  return (
    <div style={S.panel}>
      <div style={S.title}>🎹 MIDI Output</div>
      <div style={S.row}>
        <select style={S.select}
          value={midi.activeOutput?.id || ''}
          onChange={e => midi.connectOutput(e.target.value)}>
          {midi.outputs.length === 0
            ? <option value=''>No MIDI output devices found</option>
            : midi.outputs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
          }
        </select>
        <span style={S.badge}>{midi.isConnected ? '● LIVE' : '○ OFF'}</span>
      </div>
      {midi.isConnected && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={S.btn} onClick={() => midi.allNotesOff()}>⚡ Panic</button>
          <button style={S.btn} onClick={() => midi.sendStart()}>▶ Start</button>
          <button style={S.btn} onClick={() => midi.sendStop()}>■ Stop</button>
          <div style={{ fontSize: 10, color: '#585b70', alignSelf: 'center' }}>
            {midi.activeOutput?.name}
          </div>
        </div>
      )}
      {!navigator.requestMIDIAccess && (
        <div style={{ color: '#ff9500', fontSize: 10, marginTop: 6 }}>
          ⚠️ MIDI requires Chrome or Edge browser
        </div>
      )}
    </div>
  );
}
