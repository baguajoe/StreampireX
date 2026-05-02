// =============================================================================
// useMidiInput.js — Web MIDI input hook
// =============================================================================
// Auto-detects all connected MIDI inputs, hot-plug aware, multi-device.
// Surfaces parsed messages through a single callback so consumers don't have
// to deal with status-byte arithmetic.
//
// Routing decisions (channel filter, learn mode, keygroup vs drum, recording)
// belong to the consumer, not this hook — keeps the hook reusable.
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * @param {(msg: ParsedMidi) => void} onMessage — invoked for every MIDI event
 *        from any enabled device that passes the channel filter.
 *
 * ParsedMidi shape:
 *   {
 *     deviceId: string,
 *     deviceName: string,
 *     manufacturer: string,
 *     raw: Uint8Array,      // raw MIDI bytes
 *     status: number,       // full status byte
 *     msgType: number,      // status & 0xF0 (0x80, 0x90, 0xB0, ...)
 *     channel: number,      // 0..15
 *     data1: number,        // first data byte (note / cc number / etc.)
 *     data2: number,        // second data byte (velocity / cc value)
 *     // Convenience flags:
 *     isNoteOn:  boolean,   // 0x90 + velocity > 0
 *     isNoteOff: boolean,   // 0x80, OR 0x90 + velocity 0
 *     isCC:      boolean,   // 0xB0
 *     isProgramChange: boolean, // 0xC0
 *     isPitchBend: boolean, // 0xE0
 *   }
 */
export default function useMidiInput(onMessage) {
  const [midiAccess, setMidiAccess]               = useState(null);
  const [inputs, setInputs]                       = useState([]);          // MIDIInput[]
  const [permissionState, setPermissionState]     = useState('prompt');    // prompt | granted | denied | unsupported
  const [enabledDeviceIds, setEnabledDeviceIds]   = useState(() => new Set());
  const [channelFilter, setChannelFilter]         = useState('all');       // 'all' | 0..15
  const [lastActivity, setLastActivity]           = useState(null);        // { deviceId, t }

  // Stable callback ref so device subscription doesn't re-run when consumer
  // recreates the handler.
  const onMsgRef = useRef(onMessage);
  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);

  const requestAccess = useCallback(() => {
    if (!navigator.requestMIDIAccess) {
      setPermissionState('unsupported');
      return;
    }
    navigator.requestMIDIAccess({ sysex: false }).then(
      access => {
        setMidiAccess(access);
        setPermissionState('granted');
        const refresh = () => setInputs([...access.inputs.values()]);
        refresh();
        access.onstatechange = refresh;
      },
      () => setPermissionState('denied')
    );
  }, []);

  // Request MIDI access on mount.
  useEffect(() => {
    requestAccess();
  }, [requestAccess]);

  // Auto-enable any newly-detected device (Bug #12 — controllers should "just work").
  // Also drop disconnected devices from the enabled set.
  useEffect(() => {
    setEnabledDeviceIds(prev => {
      const liveIds = new Set(inputs.map(i => i.id));
      const next = new Set();
      // Keep prior devices that are still connected
      prev.forEach(id => { if (liveIds.has(id)) next.add(id); });
      // Auto-enable any new devices
      inputs.forEach(input => { if (!prev.has(input.id)) next.add(input.id); });
      // Avoid re-render if unchanged
      if (next.size === prev.size && [...next].every(id => prev.has(id))) return prev;
      return next;
    });
  }, [inputs]);

  // Subscribe to onmidimessage on each enabled input. Re-subscribes when the
  // enabled set, channel filter, or device list changes.
  useEffect(() => {
    if (!midiAccess) return;
    const subscribed = [];
    inputs.forEach(input => {
      if (!enabledDeviceIds.has(input.id)) return;
      const handler = (event) => {
        const data = event.data;
        if (!data || data.length < 1) return;
        const status = data[0];
        const msgType = status & 0xF0;
        const channel = status & 0x0F;
        if (channelFilter !== 'all' && channel !== channelFilter) return;
        const data1 = data[1] ?? 0;
        const data2 = data[2] ?? 0;
        const parsed = {
          deviceId: input.id,
          deviceName: input.name || 'MIDI Device',
          manufacturer: input.manufacturer || '',
          raw: data,
          status,
          msgType,
          channel,
          data1,
          data2,
          isNoteOn:  msgType === 0x90 && data2 > 0,
          isNoteOff: msgType === 0x80 || (msgType === 0x90 && data2 === 0),
          isCC:      msgType === 0xB0,
          isProgramChange: msgType === 0xC0,
          isPitchBend:     msgType === 0xE0,
        };
        // Activity LED hook (consumer can read lastActivity to flash a UI bulb)
        setLastActivity({ deviceId: input.id, t: performance.now() });
        try { onMsgRef.current?.(parsed); } catch (e) { console.error('[useMidiInput]', e); }
      };
      input.onmidimessage = handler;
      subscribed.push(input);
    });
    return () => {
      subscribed.forEach(input => { try { input.onmidimessage = null; } catch (e) {} });
    };
  }, [midiAccess, inputs, enabledDeviceIds, channelFilter]);

  const toggleDevice = useCallback((id) => {
    setEnabledDeviceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    midiAccess,
    inputs,
    permissionState,
    enabledDeviceIds,
    setEnabledDeviceIds,
    toggleDevice,
    channelFilter,
    setChannelFilter,
    lastActivity,
    requestAccess,
  };
}
