// =============================================================================
// MidiBus.js — singleton Web MIDI access + multi-listener dispatcher
// =============================================================================
// Architectural #13b: three components were independently calling
// navigator.requestMIDIAccess() and assigning input.onmidimessage =
// handlerOfTheDay — that single slot meant whichever component mounted last
// won, and the others silently stopped receiving messages. The bus claims
// onmidimessage on every input once and fans messages out to all subscribers,
// so callers can coexist without coordination.
//
// Part 12: virtual inputs. Sources like the QWERTY-keyboard engine register
// themselves as virtual inputs and emit synthetic MIDIMessageEvents through
// the same dispatch path, so every existing subscriber receives them as if
// they came from real hardware — no per-consumer changes required.

let _accessPromise = null;
let _accessRef = null;                // cached MIDIAccess once resolved (null if unsupported / pending)
const _msgListeners = new Set();      // fn(event, input)
const _deviceListeners = new Set();   // fn(devicesList)
const _virtualInputs = new Map();     // id → { name, manufacturer }

const _dispatchMessage = (event, input) => {
  _msgListeners.forEach(fn => {
    try { fn(event, input); } catch (err) { console.warn('[MidiBus] listener threw:', err); }
  });
};

const _hardwareDevices = () => {
  const out = [];
  if (!_accessRef) return out;
  _accessRef.inputs.forEach((input, id) => {
    out.push({ id, name: input.name, manufacturer: input.manufacturer, state: input.state });
  });
  return out;
};

const _virtualDevices = () => {
  const out = [];
  _virtualInputs.forEach((v, id) => {
    out.push({ id, name: v.name, manufacturer: v.manufacturer || 'SPX', state: 'connected' });
  });
  return out;
};

const _buildDeviceList = () => [..._hardwareDevices(), ..._virtualDevices()];

const _notifyDeviceListeners = () => {
  const devices = _buildDeviceList();
  _deviceListeners.forEach(fn => {
    try { fn(devices); } catch (err) { console.warn('[MidiBus] device listener threw:', err); }
  });
};

const wireAccess = (access) => {
  // Bus claims onmidimessage on every input and dispatches to all subscribers.
  access.inputs.forEach(input => {
    input.onmidimessage = (e) => _dispatchMessage(e, input);
  });
};

const ensureAccess = () => {
  if (_accessPromise) return _accessPromise;
  if (!navigator.requestMIDIAccess) {
    _accessPromise = Promise.reject(new Error('Web MIDI not supported'));
    return _accessPromise;
  }
  _accessPromise = navigator.requestMIDIAccess({ sysex: false }).then(access => {
    _accessRef = access;
    wireAccess(access);
    access.onstatechange = () => {
      wireAccess(access);
      _notifyDeviceListeners();
    };
    return access;
  });
  return _accessPromise;
};

// ── Public API ──

export const isMidiSupported = () => !!navigator.requestMIDIAccess;

export const getMidiAccess = () => ensureAccess();

// Returns current input list (resolves once access is granted). Includes virtuals.
export const listMidiInputs = async () => {
  try { await ensureAccess(); } catch { /* unsupported — virtuals still listed */ }
  return _buildDeviceList();
};

// subscribe({ onMessage?, onDevicesChange?, deviceId? }) → unsubscribe()
//   onMessage(event, input)   — fires for every MIDIMessageEvent (real or virtual)
//   onDevicesChange(devices)  — fires once on subscribe + on every device change
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

  // Fire initial device list. If Web MIDI is supported, wait for access so the
  // hardware list is included; otherwise emit just the virtuals immediately.
  if (onDevicesChange) {
    if (isMidiSupported()) {
      ensureAccess()
        .then(() => { if (!cancelled) onDevicesChange(_buildDeviceList()); })
        .catch(() => { if (!cancelled) onDevicesChange(_buildDeviceList()); });
    } else {
      // microtask so subscribers can finish setup before the callback fires
      Promise.resolve().then(() => { if (!cancelled) onDevicesChange(_buildDeviceList()); });
    }
  }

  return () => {
    cancelled = true;
    if (msgWrapper) _msgListeners.delete(msgWrapper);
    if (onDevicesChange) _deviceListeners.delete(onDevicesChange);
  };
};

// ── Virtual input API (Part 12) ──
// Sources like qwertyMidi.js register a virtual input, then emit synthetic
// MIDIMessageEvents through emitVirtualMessage. Every subscriber receives them
// the same way it receives hardware messages.
export const midiBus = {
  registerVirtualInput(id, name, manufacturer = 'SPX') {
    _virtualInputs.set(id, { name, manufacturer });
    _notifyDeviceListeners();
  },
  unregisterVirtualInput(id) {
    if (_virtualInputs.delete(id)) _notifyDeviceListeners();
  },
  emitVirtualMessage(deviceId, statusByte, data1, data2 = 0) {
    const v = _virtualInputs.get(deviceId);
    if (!v) return;  // unregistered — silent drop, prevents stuck-note races during disable
    const event = { data: [statusByte, data1, data2], timeStamp: performance.now() };
    const input = { id: deviceId, name: v.name, manufacturer: v.manufacturer || 'SPX', state: 'connected' };
    _dispatchMessage(event, input);
  },
  getVirtualInputs() { return _virtualDevices(); },
};
