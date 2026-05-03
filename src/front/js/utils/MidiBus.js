// =============================================================================
// MidiBus.js — singleton Web MIDI access + multi-listener dispatcher
// =============================================================================
// Architectural #13b: three components were independently calling
// navigator.requestMIDIAccess() and assigning input.onmidimessage =
// handlerOfTheDay — that single slot meant whichever component mounted last
// won, and the others silently stopped receiving messages. The bus claims
// onmidimessage on every input once and fans messages out to all subscribers,
// so callers can coexist without coordination.

let _accessPromise = null;
const _msgListeners = new Set();      // fn(event, input)
const _deviceListeners = new Set();   // fn(devicesList)

const listInputs = (access) => {
  const out = [];
  access.inputs.forEach((input, id) => {
    out.push({ id, name: input.name, manufacturer: input.manufacturer, state: input.state });
  });
  return out;
};

const wireAccess = (access) => {
  // Bus claims onmidimessage on every input and dispatches to all subscribers.
  access.inputs.forEach(input => {
    input.onmidimessage = (e) => {
      _msgListeners.forEach(fn => {
        try { fn(e, input); } catch (err) { console.warn('[MidiBus] listener threw:', err); }
      });
    };
  });
};

const ensureAccess = () => {
  if (_accessPromise) return _accessPromise;
  if (!navigator.requestMIDIAccess) {
    _accessPromise = Promise.reject(new Error('Web MIDI not supported'));
    return _accessPromise;
  }
  _accessPromise = navigator.requestMIDIAccess({ sysex: false }).then(access => {
    wireAccess(access);
    access.onstatechange = () => {
      wireAccess(access);
      const devices = listInputs(access);
      _deviceListeners.forEach(fn => {
        try { fn(devices); } catch (err) { console.warn('[MidiBus] device listener threw:', err); }
      });
    };
    return access;
  });
  return _accessPromise;
};

// ── Public API ──

export const isMidiSupported = () => !!navigator.requestMIDIAccess;

export const getMidiAccess = () => ensureAccess();

// Returns current input list (resolves once access is granted).
export const listMidiInputs = async () => {
  const access = await ensureAccess();
  return listInputs(access);
};

// subscribe({ onMessage?, onDevicesChange?, deviceId? }) → unsubscribe()
//   onMessage(event, input)   — fires for every MIDIMessageEvent
//   onDevicesChange(devices)  — fires once on subscribe + on every state change
//   deviceId                  — if provided, only forward messages from that input
export const subscribeMidi = ({ onMessage, onDevicesChange, deviceId } = {}) => {
  let cancelled = false;
  const msgWrapper = onMessage
    ? (event, input) => {
        if (cancelled) return;
        if (deviceId && input.id !== deviceId) return;
        onMessage(event, input);
      }
    : null;
  if (msgWrapper) _msgListeners.add(msgWrapper);
  if (onDevicesChange) _deviceListeners.add(onDevicesChange);

  ensureAccess()
    .then(access => { if (!cancelled && onDevicesChange) onDevicesChange(listInputs(access)); })
    .catch(() => { /* caller can use getMidiAccess() if it needs the error */ });

  return () => {
    cancelled = true;
    if (msgWrapper) _msgListeners.delete(msgWrapper);
    if (onDevicesChange) _deviceListeners.delete(onDevicesChange);
  };
};
