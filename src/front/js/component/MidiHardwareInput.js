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