"use strict";
(self["webpackChunkreact_hello_webapp"] = self["webpackChunkreact_hello_webapp"] || []).push([["src_front_js_pages_PodcastStudioPhase1_js"],{

/***/ "./src/front/js/pages/PodcastStudioPhase1.js":
/*!***************************************************!*\
  !*** ./src/front/js/pages/PodcastStudioPhase1.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GreenRoom: () => (/* binding */ GreenRoom),
/* harmony export */   ProgressiveUploader: () => (/* binding */ ProgressiveUploader),
/* harmony export */   RecordingQualitySelector: () => (/* binding */ RecordingQualitySelector),
/* harmony export */   TranscriptEditor: () => (/* binding */ TranscriptEditor),
/* harmony export */   WAVRecordingEngine: () => (/* binding */ WAVRecordingEngine),
/* harmony export */   float32ToPCM16: () => (/* binding */ float32ToPCM16),
/* harmony export */   float32ToPCM24: () => (/* binding */ float32ToPCM24)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// =============================================================================
// PHASE 1: PODCAST STUDIO UPGRADES — Riverside-Quality Features
// =============================================================================
// Location: src/front/js/pages/PodcastStudio.js (merge into existing)
//
// UPGRADES:
//   1. WAV/Lossless Recording (PCM capture via Web Audio API)
//   2. AI Transcription + Text-Based Editing
//   3. Auto Filler Word & Pause Removal
//   4. Green Room / Pre-Session Lobby
//   5. Progressive Upload (chunk upload during recording)
//
// =============================================================================



// =============================================================================
// 1. WAV/LOSSLESS RECORDING ENGINE
// =============================================================================
// Replaces MediaRecorder Opus with raw PCM capture for studio-quality audio
// Records at 48kHz/24-bit — same quality tier as Riverside's "uncompressed" claim

var WAVRecordingEngine = /*#__PURE__*/function () {
  function WAVRecordingEngine(stream) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, WAVRecordingEngine);
    this.stream = stream;
    this.sampleRate = options.sampleRate || 48000;
    this.bitDepth = options.bitDepth || 24; // 16 or 24
    this.channels = options.channels || 1; // mono for voice
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.chunks = [];
    this.isRecording = false;
    this.onDataAvailable = options.onDataAvailable || null; // For progressive upload
    this.chunkInterval = options.chunkInterval || 30000; // 30s chunks
    this.chunkTimer = null;
    this.totalSamples = 0;
  }
  return _createClass(WAVRecordingEngine, [{
    key: "start",
    value: function () {
      var _start = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var _this = this;
        var bufferSize, _t;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              this.audioContext = new AudioContext({
                sampleRate: this.sampleRate
              });
              this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

              // Use AudioWorklet for high-performance PCM capture
              // Falls back to ScriptProcessorNode if AudioWorklet unavailable
              _context.p = 1;
              _context.n = 2;
              return this.audioContext.audioWorklet.addModule(URL.createObjectURL(new Blob([WAV_WORKLET_CODE], {
                type: 'application/javascript'
              })));
            case 2:
              this.processorNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor', {
                processorOptions: {
                  bitDepth: this.bitDepth
                }
              });
              this.processorNode.port.onmessage = function (e) {
                if (e.data.type === 'pcm-data') {
                  _this.chunks.push(e.data.buffer);
                  _this.totalSamples += e.data.sampleCount;
                }
              };
              _context.n = 4;
              break;
            case 3:
              _context.p = 3;
              _t = _context.v;
              // Fallback: ScriptProcessorNode (deprecated but universal)
              bufferSize = 4096;
              this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
              this.processorNode.onaudioprocess = function (e) {
                if (!_this.isRecording) return;
                var input = e.inputBuffer.getChannelData(0);
                var pcmData = _this.bitDepth === 24 ? float32ToPCM24(input) : float32ToPCM16(input);
                _this.chunks.push(pcmData);
                _this.totalSamples += input.length;
              };
            case 4:
              this.sourceNode.connect(this.processorNode);
              this.processorNode.connect(this.audioContext.destination);
              this.isRecording = true;

              // Progressive upload: send chunks periodically
              if (this.onDataAvailable) {
                this.chunkTimer = setInterval(function () {
                  if (_this.chunks.length > 0) {
                    var chunkBlob = _this._buildPartialWAV();
                    _this.onDataAvailable(chunkBlob, _this.totalSamples / _this.sampleRate);
                  }
                }, this.chunkInterval);
              }
            case 5:
              return _context.a(2);
          }
        }, _callee, this, [[1, 3]]);
      }));
      function start() {
        return _start.apply(this, arguments);
      }
      return start;
    }()
  }, {
    key: "stop",
    value: function stop() {
      this.isRecording = false;
      if (this.chunkTimer) clearInterval(this.chunkTimer);
      if (this.processorNode) {
        this.processorNode.disconnect();
        this.sourceNode.disconnect();
      }
      if (this.audioContext) {
        this.audioContext.close();
      }
      return this._buildWAV();
    }
  }, {
    key: "_buildPartialWAV",
    value: function _buildPartialWAV() {
      // Build WAV from current chunks without clearing them
      var dataLength = this.chunks.reduce(function (acc, c) {
        return acc + c.byteLength;
      }, 0);
      return this._createWAVBlob(dataLength);
    }
  }, {
    key: "_buildWAV",
    value: function _buildWAV() {
      var dataLength = this.chunks.reduce(function (acc, c) {
        return acc + c.byteLength;
      }, 0);
      return this._createWAVBlob(dataLength);
    }
  }, {
    key: "_createWAVBlob",
    value: function _createWAVBlob(dataLength) {
      var bytesPerSample = this.bitDepth / 8;
      var headerSize = 44;
      var buffer = new ArrayBuffer(headerSize + dataLength);
      var view = new DataView(buffer);

      // RIFF header
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      writeString(view, 8, 'WAVE');

      // fmt chunk
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // chunk size
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, this.channels, true);
      view.setUint32(24, this.sampleRate, true);
      view.setUint32(28, this.sampleRate * this.channels * bytesPerSample, true);
      view.setUint16(32, this.channels * bytesPerSample, true);
      view.setUint16(34, this.bitDepth, true);

      // data chunk
      writeString(view, 36, 'data');
      view.setUint32(40, dataLength, true);

      // Copy PCM data
      var output = new Uint8Array(buffer);
      var offset = headerSize;
      var _iterator = _createForOfIteratorHelper(this.chunks),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var chunk = _step.value;
          output.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      return new Blob([buffer], {
        type: 'audio/wav'
      });
    }
  }, {
    key: "getDuration",
    value: function getDuration() {
      return this.totalSamples / this.sampleRate;
    }
  }]);
}(); // AudioWorklet processor code (runs in audio thread)
var WAV_WORKLET_CODE = "\nclass PCMCaptureProcessor extends AudioWorkletProcessor {\n    constructor(options) {\n        super();\n        this.bitDepth = options.processorOptions?.bitDepth || 24;\n        this.buffer = [];\n        this.bufferSize = 0;\n        this.flushSize = 48000; // Flush every ~1 second at 48kHz\n    }\n\n    process(inputs) {\n        const input = inputs[0];\n        if (!input || !input[0]) return true;\n\n        const samples = input[0];\n        const bytesPerSample = this.bitDepth / 8;\n        const pcmBuffer = new ArrayBuffer(samples.length * bytesPerSample);\n        const view = new DataView(pcmBuffer);\n\n        for (let i = 0; i < samples.length; i++) {\n            const s = Math.max(-1, Math.min(1, samples[i]));\n            if (this.bitDepth === 24) {\n                const val = Math.round(s * 8388607);\n                const offset = i * 3;\n                view.setUint8(offset, val & 0xFF);\n                view.setUint8(offset + 1, (val >> 8) & 0xFF);\n                view.setUint8(offset + 2, (val >> 16) & 0xFF);\n            } else {\n                view.setInt16(i * 2, Math.round(s * 32767), true);\n            }\n        }\n\n        this.buffer.push(pcmBuffer);\n        this.bufferSize += samples.length;\n\n        if (this.bufferSize >= this.flushSize) {\n            const totalBytes = this.buffer.reduce((a, b) => a + b.byteLength, 0);\n            const merged = new ArrayBuffer(totalBytes);\n            const out = new Uint8Array(merged);\n            let off = 0;\n            for (const buf of this.buffer) {\n                out.set(new Uint8Array(buf), off);\n                off += buf.byteLength;\n            }\n            this.port.postMessage({\n                type: 'pcm-data',\n                buffer: merged,\n                sampleCount: this.bufferSize\n            }, [merged]);\n            this.buffer = [];\n            this.bufferSize = 0;\n        }\n\n        return true;\n    }\n}\nregisterProcessor('pcm-capture-processor', PCMCaptureProcessor);\n";

// PCM conversion helpers
function float32ToPCM16(float32Array) {
  var buffer = new ArrayBuffer(float32Array.length * 2);
  var view = new DataView(buffer);
  for (var i = 0; i < float32Array.length; i++) {
    var s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}
function float32ToPCM24(float32Array) {
  var buffer = new ArrayBuffer(float32Array.length * 3);
  var view = new DataView(buffer);
  for (var i = 0; i < float32Array.length; i++) {
    var s = Math.max(-1, Math.min(1, float32Array[i]));
    var val = Math.round(s * 8388607);
    var offset = i * 3;
    view.setUint8(offset, val & 0xFF);
    view.setUint8(offset + 1, val >> 8 & 0xFF);
    view.setUint8(offset + 2, val >> 16 & 0xFF);
  }
  return buffer;
}
function writeString(view, offset, string) {
  for (var i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// =============================================================================
// 2. GREEN ROOM / PRE-SESSION LOBBY
// =============================================================================

var GreenRoom = function GreenRoom(_ref) {
  var _userName$charAt;
  var sessionId = _ref.sessionId,
    isHost = _ref.isHost,
    userName = _ref.userName,
    onJoinStudio = _ref.onJoinStudio,
    onLeave = _ref.onLeave;
  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null),
    _useState2 = _slicedToArray(_useState, 2),
    micStream = _useState2[0],
    setMicStream = _useState2[1];
  var _useState3 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(''),
    _useState4 = _slicedToArray(_useState3, 2),
    selectedMic = _useState4[0],
    setSelectedMic = _useState4[1];
  var _useState5 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(''),
    _useState6 = _slicedToArray(_useState5, 2),
    selectedCamera = _useState6[0],
    setSelectedCamera = _useState6[1];
  var _useState7 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
      mics: [],
      cameras: []
    }),
    _useState8 = _slicedToArray(_useState7, 2),
    devices = _useState8[0],
    setDevices = _useState8[1];
  var _useState9 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0),
    _useState0 = _slicedToArray(_useState9, 2),
    micLevel = _useState0[0],
    setMicLevel = _useState0[1];
  var _useState1 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false),
    _useState10 = _slicedToArray(_useState1, 2),
    videoEnabled = _useState10[0],
    setVideoEnabled = _useState10[1];
  var _useState11 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false),
    _useState12 = _slicedToArray(_useState11, 2),
    isMicTesting = _useState12[0],
    setIsMicTesting = _useState12[1];
  var _useState13 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false),
    _useState14 = _slicedToArray(_useState13, 2),
    isReady = _useState14[0],
    setIsReady = _useState14[1];
  var videoRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  var analyserRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  var animFrameRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    // Enumerate devices
    navigator.mediaDevices.enumerateDevices().then(function (deviceList) {
      setDevices({
        mics: deviceList.filter(function (d) {
          return d.kind === 'audioinput';
        }),
        cameras: deviceList.filter(function (d) {
          return d.kind === 'videoinput';
        })
      });
    });
  }, []);
  var startMicTest = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var constraints, stream, ctx, source, analyser, _updateLevel, _t2;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            _context2.p = 0;
            constraints = {
              audio: selectedMic ? {
                deviceId: {
                  exact: selectedMic
                }
              } : true,
              video: videoEnabled && selectedCamera ? {
                deviceId: {
                  exact: selectedCamera
                },
                width: 1280,
                height: 720
              } : videoEnabled ? {
                width: 1280,
                height: 720
              } : false
            };
            _context2.n = 1;
            return navigator.mediaDevices.getUserMedia(constraints);
          case 1:
            stream = _context2.v;
            setMicStream(stream);
            setIsMicTesting(true);

            // Show video preview
            if (videoRef.current && videoEnabled) {
              videoRef.current.srcObject = stream;
            }

            // Mic level meter
            ctx = new AudioContext();
            source = ctx.createMediaStreamSource(stream);
            analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;
            _updateLevel = function updateLevel() {
              var data = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(data);
              var avg = data.reduce(function (a, b) {
                return a + b;
              }) / data.length;
              setMicLevel(avg / 255 * 100);
              animFrameRef.current = requestAnimationFrame(_updateLevel);
            };
            _updateLevel();
            _context2.n = 3;
            break;
          case 2:
            _context2.p = 2;
            _t2 = _context2.v;
            console.error('Device access error:', _t2);
          case 3:
            return _context2.a(2);
        }
      }, _callee2, null, [[0, 2]]);
    }));
    return function startMicTest() {
      return _ref2.apply(this, arguments);
    };
  }();
  var stopMicTest = function stopMicTest() {
    if (micStream) {
      micStream.getTracks().forEach(function (t) {
        return t.stop();
      });
      setMicStream(null);
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsMicTesting(false);
    setMicLevel(0);
  };
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    return function () {
      stopMicTest();
    };
  }, []);
  var handleJoin = function handleJoin() {
    // Pass selected devices to studio
    onJoinStudio({
      micId: selectedMic,
      cameraId: selectedCamera,
      videoEnabled: videoEnabled,
      stream: micStream
    });
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
    className: "green-room",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      className: "green-room-header",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("h2", {
        children: "\uD83D\uDFE2 Green Room"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
        className: "green-room-subtitle",
        children: "Check your setup before joining the studio"
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      className: "green-room-content",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "green-room-preview",
        children: [videoEnabled ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("video", {
          ref: videoRef,
          autoPlay: true,
          muted: true,
          playsInline: true,
          className: "green-room-video"
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "green-room-avatar",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
            className: "avatar-initial",
            children: (userName === null || userName === void 0 || (_userName$charAt = userName.charAt(0)) === null || _userName$charAt === void 0 ? void 0 : _userName$charAt.toUpperCase()) || '?'
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
            children: userName || 'Guest'
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "green-room-mic-level",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
            className: "mic-level-bar",
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
              className: "mic-level-fill",
              style: {
                height: "".concat(micLevel, "%"),
                backgroundColor: micLevel > 80 ? '#ff4444' : micLevel > 50 ? '#FF6600' : '#00ffc8'
              }
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
            className: "mic-level-label",
            children: isMicTesting ? "".concat(Math.round(micLevel), "%") : '—'
          })]
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "green-room-controls",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "device-select-group",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
            children: "\uD83C\uDFA4 Microphone"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("select", {
            value: selectedMic,
            onChange: function onChange(e) {
              return setSelectedMic(e.target.value);
            },
            className: "device-select",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
              value: "",
              children: "Default Microphone"
            }), devices.mics.map(function (d) {
              return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
                value: d.deviceId,
                children: d.label || "Mic ".concat(d.deviceId.slice(0, 8))
              }, d.deviceId);
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "device-select-group",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
            children: "\uD83D\uDCF7 Camera"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("select", {
            value: selectedCamera,
            onChange: function onChange(e) {
              return setSelectedCamera(e.target.value);
            },
            className: "device-select",
            disabled: !videoEnabled,
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
              value: "",
              children: "Default Camera"
            }), devices.cameras.map(function (d) {
              return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("option", {
                value: d.deviceId,
                children: d.label || "Camera ".concat(d.deviceId.slice(0, 8))
              }, d.deviceId);
            })]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "device-toggles",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
            className: "toggle-btn ".concat(videoEnabled ? 'active' : ''),
            onClick: function onClick() {
              return setVideoEnabled(!videoEnabled);
            },
            children: videoEnabled ? '📹 Video On' : '📹 Video Off'
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
            className: "toggle-btn test-btn ".concat(isMicTesting ? 'testing' : ''),
            onClick: isMicTesting ? stopMicTest : startMicTest,
            children: isMicTesting ? '⏹ Stop Test' : '🎙 Test Mic'
          })]
        }), isMicTesting && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "audio-quality-check",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
            className: "quality-item ".concat(micLevel > 5 ? 'pass' : 'fail'),
            children: [micLevel > 5 ? '✅' : '❌', " Microphone detected"]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
            className: "quality-item ".concat(micLevel < 80 ? 'pass' : 'warn'),
            children: [micLevel < 80 ? '✅' : '⚠️', " Audio level", micLevel >= 80 ? ' — too loud, move back' : ' OK']
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
            className: "quality-item pass",
            children: "\u2705 Recording quality: WAV 48kHz / 24-bit"
          })]
        }), !isHost && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "waiting-message",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
            className: "waiting-spinner"
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
            children: "Waiting for host to start the session..."
          })]
        })]
      })]
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      className: "green-room-actions",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
        className: "btn-leave",
        onClick: onLeave,
        children: "Leave"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
        className: "btn-join-studio",
        onClick: handleJoin,
        disabled: !isHost && !isReady,
        children: isHost ? '🎙 Start Studio' : '✅ Ready to Join'
      })]
    })]
  });
};

// =============================================================================
// 3. AI TRANSCRIPTION + TEXT-BASED EDITING
// =============================================================================
// Uses Whisper/Deepgram for word-level timestamps, then lets you edit
// the transcript to edit the audio (delete words = cut audio)

var TranscriptEditor = function TranscriptEditor(_ref3) {
  var audioUrl = _ref3.audioUrl,
    episodeId = _ref3.episodeId,
    onEditComplete = _ref3.onEditComplete;
  var _useState15 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null),
    _useState16 = _slicedToArray(_useState15, 2),
    transcript = _useState16[0],
    setTranscript = _useState16[1];
  var _useState17 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]),
    _useState18 = _slicedToArray(_useState17, 2),
    words = _useState18[0],
    setWords = _useState18[1]; // { word, start, end, deleted, isFiller }
  var _useState19 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false),
    _useState20 = _slicedToArray(_useState19, 2),
    isTranscribing = _useState20[0],
    setIsTranscribing = _useState20[1];
  var _useState21 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false),
    _useState22 = _slicedToArray(_useState21, 2),
    isPlaying = _useState22[0],
    setIsPlaying = _useState22[1];
  var _useState23 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0),
    _useState24 = _slicedToArray(_useState23, 2),
    currentTime = _useState24[0],
    setCurrentTime = _useState24[1];
  var _useState25 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(true),
    _useState26 = _slicedToArray(_useState25, 2),
    showFillers = _useState26[0],
    setShowFillers = _useState26[1];
  var _useState27 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]),
    _useState28 = _slicedToArray(_useState27, 2),
    editHistory = _useState28[0],
    setEditHistory = _useState28[1];
  var _useState29 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
      fillers: 0,
      pauses: 0,
      totalRemoved: 0
    }),
    _useState30 = _slicedToArray(_useState29, 2),
    stats = _useState30[0],
    setStats = _useState30[1];
  var audioRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  var token = sessionStorage.getItem('token');
  var FILLER_WORDS = ['um', 'uh', 'uhh', 'umm', 'hmm', 'hm', 'ah', 'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically', 'actually', 'literally', 'right', 'so', 'well', 'er', 'erm'];

  // Transcribe audio
  var handleTranscribe = /*#__PURE__*/function () {
    var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      var res, data, processedWords, i, gap, fillerCount, pauseCount, _t3;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            setIsTranscribing(true);
            _context3.p = 1;
            _context3.n = 2;
            return fetch('/api/podcast-studio/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer ".concat(token)
              },
              body: JSON.stringify({
                audio_url: audioUrl,
                episode_id: episodeId
              })
            });
          case 2:
            res = _context3.v;
            _context3.n = 3;
            return res.json();
          case 3:
            data = _context3.v;
            if (data.words) {
              processedWords = data.words.map(function (w, i) {
                return {
                  id: i,
                  word: w.word || w.punctuated_word,
                  start: w.start,
                  end: w.end,
                  confidence: w.confidence,
                  deleted: false,
                  isFiller: FILLER_WORDS.some(function (f) {
                    return w.word.toLowerCase().replace(/[.,!?]/g, '') === f;
                  }),
                  isPause: false,
                  speaker: w.speaker || 0
                };
              }); // Detect long pauses (> 1.5 seconds between words)
              for (i = 1; i < processedWords.length; i++) {
                gap = processedWords[i].start - processedWords[i - 1].end;
                if (gap > 1.5) {
                  processedWords[i].isPause = true;
                  processedWords[i].pauseDuration = gap;
                }
              }
              setWords(processedWords);
              setTranscript(data.full_text);

              // Count stats
              fillerCount = processedWords.filter(function (w) {
                return w.isFiller;
              }).length;
              pauseCount = processedWords.filter(function (w) {
                return w.isPause;
              }).length;
              setStats({
                fillers: fillerCount,
                pauses: pauseCount,
                totalRemoved: 0
              });
            }
            _context3.n = 5;
            break;
          case 4:
            _context3.p = 4;
            _t3 = _context3.v;
            console.error('Transcription error:', _t3);
          case 5:
            setIsTranscribing(false);
          case 6:
            return _context3.a(2);
        }
      }, _callee3, null, [[1, 4]]);
    }));
    return function handleTranscribe() {
      return _ref4.apply(this, arguments);
    };
  }();

  // Remove all filler words
  var removeAllFillers = function removeAllFillers() {
    var updated = words.map(function (w) {
      return _objectSpread(_objectSpread({}, w), {}, {
        deleted: w.deleted || w.isFiller
      });
    });
    setWords(updated);
    var removed = updated.filter(function (w) {
      return w.deleted;
    }).length;
    setStats(function (prev) {
      return _objectSpread(_objectSpread({}, prev), {}, {
        totalRemoved: removed
      });
    });
    setEditHistory(function (prev) {
      return [].concat(_toConsumableArray(prev), [{
        type: 'remove_fillers',
        timestamp: Date.now()
      }]);
    });
  };

  // Remove all long pauses (trim to 0.5s)
  var removeAllPauses = function removeAllPauses() {
    var updated = words.map(function (w) {
      return _objectSpread(_objectSpread({}, w), {}, {
        trimmedPause: w.isPause ? Math.max(0.5, w.pauseDuration * 0.3) : undefined
      });
    });
    setWords(updated);
    setEditHistory(function (prev) {
      return [].concat(_toConsumableArray(prev), [{
        type: 'remove_pauses',
        timestamp: Date.now()
      }]);
    });
  };

  // Toggle delete on a word (click to strike through)
  var toggleWord = function toggleWord(id) {
    var updated = words.map(function (w) {
      return w.id === id ? _objectSpread(_objectSpread({}, w), {}, {
        deleted: !w.deleted
      }) : w;
    });
    setWords(updated);
    var removed = updated.filter(function (w) {
      return w.deleted;
    }).length;
    setStats(function (prev) {
      return _objectSpread(_objectSpread({}, prev), {}, {
        totalRemoved: removed
      });
    });
  };

  // Select range of words to delete
  var _useState31 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null),
    _useState32 = _slicedToArray(_useState31, 2),
    selectionStart = _useState32[0],
    setSelectionStart = _useState32[1];
  var handleWordMouseDown = function handleWordMouseDown(id) {
    setSelectionStart(id);
  };
  var handleWordMouseUp = function handleWordMouseUp(id) {
    if (selectionStart !== null && selectionStart !== id) {
      var start = Math.min(selectionStart, id);
      var end = Math.max(selectionStart, id);
      var updated = words.map(function (w) {
        return w.id >= start && w.id <= end ? _objectSpread(_objectSpread({}, w), {}, {
          deleted: true
        }) : w;
      });
      setWords(updated);
      var removed = updated.filter(function (w) {
        return w.deleted;
      }).length;
      setStats(function (prev) {
        return _objectSpread(_objectSpread({}, prev), {}, {
          totalRemoved: removed
        });
      });
    }
    setSelectionStart(null);
  };

  // Undo last edit
  var handleUndo = function handleUndo() {
    if (editHistory.length === 0) return;
    var lastEdit = editHistory[editHistory.length - 1];
    if (lastEdit.type === 'remove_fillers') {
      setWords(function (prev) {
        return prev.map(function (w) {
          return _objectSpread(_objectSpread({}, w), {}, {
            deleted: w.isFiller ? false : w.deleted
          });
        });
      });
    }
    setEditHistory(function (prev) {
      return prev.slice(0, -1);
    });
  };

  // Generate edit decision list (timestamps to keep/cut)
  var generateEDL = function generateEDL() {
    var edl = [];
    var currentSegment = null;
    words.forEach(function (w) {
      if (!w.deleted) {
        if (!currentSegment) {
          currentSegment = {
            start: w.start,
            end: w.end
          };
        } else {
          currentSegment.end = w.end;
        }
      } else {
        if (currentSegment) {
          edl.push(currentSegment);
          currentSegment = null;
        }
      }
    });
    if (currentSegment) edl.push(currentSegment);
    return edl;
  };

  // Apply edits — send EDL to backend for actual audio cutting
  var applyEdits = /*#__PURE__*/function () {
    var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      var edl, res, data, _t4;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.p = _context4.n) {
          case 0:
            edl = generateEDL();
            _context4.p = 1;
            _context4.n = 2;
            return fetch('/api/podcast-studio/apply-text-edits', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer ".concat(token)
              },
              body: JSON.stringify({
                episode_id: episodeId,
                audio_url: audioUrl,
                edit_decision_list: edl,
                words: words.filter(function (w) {
                  return !w.deleted;
                }).map(function (w) {
                  return {
                    word: w.word,
                    start: w.start,
                    end: w.end
                  };
                })
              })
            });
          case 2:
            res = _context4.v;
            _context4.n = 3;
            return res.json();
          case 3:
            data = _context4.v;
            if (data.edited_audio_url) {
              onEditComplete(data.edited_audio_url, data.transcript);
            }
            _context4.n = 5;
            break;
          case 4:
            _context4.p = 4;
            _t4 = _context4.v;
            console.error('Apply edits error:', _t4);
          case 5:
            return _context4.a(2);
        }
      }, _callee4, null, [[1, 4]]);
    }));
    return function applyEdits() {
      return _ref5.apply(this, arguments);
    };
  }();

  // Playback with word highlighting
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    if (!audioRef.current) return;
    var audio = audioRef.current;
    var handleTimeUpdate = function handleTimeUpdate() {
      return setCurrentTime(audio.currentTime);
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return function () {
      return audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);
  var playFromWord = function playFromWord(word) {
    if (audioRef.current) {
      audioRef.current.currentTime = word.start;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
    className: "transcript-editor",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      className: "transcript-header",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("h3", {
        children: "\uD83D\uDCDD Text-Based Editor"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
        className: "transcript-subtitle",
        children: "Click words to remove them. Select ranges by dragging. Edit your podcast like a document."
      })]
    }), !transcript && !isTranscribing && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      className: "transcript-empty",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
        className: "btn-transcribe",
        onClick: handleTranscribe,
        children: "\u2728 Generate Transcript"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
        children: "AI transcription with word-level timestamps"
      })]
    }), isTranscribing && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
      className: "transcript-loading",
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
        className: "loading-spinner"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
        children: "Transcribing audio... This may take 30-60 seconds"
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "loading-steps",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
          className: "step active",
          children: "\uD83C\uDFA4 Uploading audio"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
          className: "step",
          children: "\uD83E\uDDE0 AI processing"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
          className: "step",
          children: "\uD83D\uDCDD Generating timestamps"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
          className: "step",
          children: "\uD83D\uDD0D Detecting fillers"
        })]
      })]
    }), words.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "transcript-toolbar",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "toolbar-actions",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("button", {
            className: "toolbar-btn remove-fillers",
            onClick: removeAllFillers,
            children: ["\uD83D\uDDD1 Remove Fillers (", stats.fillers, ")"]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("button", {
            className: "toolbar-btn remove-pauses",
            onClick: removeAllPauses,
            children: ["\u23E9 Trim Pauses (", stats.pauses, ")"]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
            className: "toolbar-btn undo",
            onClick: handleUndo,
            disabled: editHistory.length === 0,
            children: "\u21A9 Undo"
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "toolbar-stats",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("span", {
            className: "stat",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("strong", {
              children: stats.totalRemoved
            }), " words removed"]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("span", {
            className: "stat",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("strong", {
              children: [Math.round(words.filter(function (w) {
                return w.deleted;
              }).reduce(function (acc, w) {
                return acc + (w.end - w.start);
              }, 0)), "s"]
            }), " trimmed"]
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
          className: "toolbar-toggles",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("label", {
            className: "toggle-label",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("input", {
              type: "checkbox",
              checked: showFillers,
              onChange: function onChange(e) {
                return setShowFillers(e.target.checked);
              }
            }), "Highlight fillers"]
          })
        })]
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("audio", {
        ref: audioRef,
        src: audioUrl
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
        className: "transcript-text",
        children: words.map(function (w) {
          return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("span", {
            className: ['transcript-word', w.deleted ? 'deleted' : '', w.isFiller && showFillers ? 'filler' : '', w.isPause ? 'has-pause' : '', currentTime >= w.start && currentTime <= w.end ? 'playing' : ''].filter(Boolean).join(' '),
            onMouseDown: function onMouseDown() {
              return handleWordMouseDown(w.id);
            },
            onMouseUp: function onMouseUp() {
              return handleWordMouseUp(w.id);
            },
            onClick: function onClick() {
              return toggleWord(w.id);
            },
            onDoubleClick: function onDoubleClick() {
              return playFromWord(w);
            },
            title: "".concat(w.start.toFixed(1), "s - ").concat(w.end.toFixed(1), "s").concat(w.isFiller ? ' (filler)' : '').concat(w.isPause ? " (".concat(w.pauseDuration.toFixed(1), "s pause)") : ''),
            children: [w.isPause && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("span", {
              className: "pause-marker",
              children: ["\u23F8 ", w.pauseDuration.toFixed(1), "s"]
            }), w.word, ' ']
          }, w.id);
        })
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
        className: "transcript-apply",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("button", {
          className: "btn-apply-edits",
          onClick: applyEdits,
          children: "\u2702\uFE0F Apply Edits & Export"
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
          className: "apply-note",
          children: "Creates a new audio file with your edits applied"
        })]
      })]
    })]
  });
};

// =============================================================================
// 4. PROGRESSIVE UPLOAD ENGINE
// =============================================================================
// Uploads chunks every 30 seconds during recording so files are nearly
// ready when you hit stop (like Riverside)
var ProgressiveUploader = /*#__PURE__*/function () {
  function ProgressiveUploader(sessionId, trackId, token) {
    _classCallCheck(this, ProgressiveUploader);
    this.sessionId = sessionId;
    this.trackId = trackId;
    this.token = token;
    this.chunkIndex = 0;
    this.uploadedChunks = [];
    this.isUploading = false;
    this.queue = [];
  }
  return _createClass(ProgressiveUploader, [{
    key: "uploadChunk",
    value: function () {
      var _uploadChunk = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(blob, currentDuration) {
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.n) {
            case 0:
              this.queue.push({
                blob: blob,
                chunkIndex: this.chunkIndex++,
                currentDuration: currentDuration
              });
              if (!this.isUploading) {
                this.processQueue();
              }
            case 1:
              return _context5.a(2);
          }
        }, _callee5, this);
      }));
      function uploadChunk(_x, _x2) {
        return _uploadChunk.apply(this, arguments);
      }
      return uploadChunk;
    }()
  }, {
    key: "processQueue",
    value: function () {
      var _processQueue = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
        var _this$queue$shift, blob, chunkIndex, currentDuration, formData, res, _t5;
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.p = _context6.n) {
            case 0:
              if (!(this.queue.length === 0)) {
                _context6.n = 1;
                break;
              }
              this.isUploading = false;
              return _context6.a(2);
            case 1:
              this.isUploading = true;
              _this$queue$shift = this.queue.shift(), blob = _this$queue$shift.blob, chunkIndex = _this$queue$shift.chunkIndex, currentDuration = _this$queue$shift.currentDuration;
              _context6.p = 2;
              formData = new FormData();
              formData.append('chunk', blob, "chunk_".concat(chunkIndex, ".wav"));
              formData.append('session_id', this.sessionId);
              formData.append('track_id', this.trackId);
              formData.append('chunk_index', chunkIndex);
              formData.append('duration', currentDuration);
              _context6.n = 3;
              return fetch('/api/podcast-studio/upload-chunk', {
                method: 'POST',
                headers: {
                  'Authorization': "Bearer ".concat(this.token)
                },
                body: formData
              });
            case 3:
              res = _context6.v;
              if (res.ok) {
                this.uploadedChunks.push(chunkIndex);
              }
              _context6.n = 5;
              break;
            case 4:
              _context6.p = 4;
              _t5 = _context6.v;
              console.error("Chunk ".concat(chunkIndex, " upload failed:"), _t5);
              // Re-queue failed chunk
              this.queue.unshift({
                blob: blob,
                chunkIndex: chunkIndex,
                currentDuration: currentDuration
              });
            case 5:
              this.processQueue();
            case 6:
              return _context6.a(2);
          }
        }, _callee6, this, [[2, 4]]);
      }));
      function processQueue() {
        return _processQueue.apply(this, arguments);
      }
      return processQueue;
    }()
  }, {
    key: "finalizeUpload",
    value: function () {
      var _finalizeUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(finalBlob) {
        var formData, res;
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.n) {
            case 0:
              // Upload the complete final WAV file
              formData = new FormData();
              formData.append('audio', finalBlob, "recording_".concat(this.trackId, ".wav"));
              formData.append('session_id', this.sessionId);
              formData.append('track_id', this.trackId);
              formData.append('is_final', 'true');
              formData.append('uploaded_chunks', JSON.stringify(this.uploadedChunks));
              _context7.n = 1;
              return fetch('/api/podcast-studio/upload-track', {
                method: 'POST',
                headers: {
                  'Authorization': "Bearer ".concat(this.token)
                },
                body: formData
              });
            case 1:
              res = _context7.v;
              _context7.n = 2;
              return res.json();
            case 2:
              return _context7.a(2, _context7.v);
          }
        }, _callee7, this);
      }));
      function finalizeUpload(_x3) {
        return _finalizeUpload.apply(this, arguments);
      }
      return finalizeUpload;
    }()
  }, {
    key: "getProgress",
    value: function getProgress() {
      return {
        chunksUploaded: this.uploadedChunks.length,
        chunksQueued: this.queue.length,
        isUploading: this.isUploading
      };
    }
  }]);
}(); // =============================================================================
// 5. RECORDING QUALITY SELECTOR
// =============================================================================
// Let user choose between WAV (lossless) and Opus (compressed) based on
// their internet speed and storage preferences
var RecordingQualitySelector = function RecordingQualitySelector(_ref6) {
  var value = _ref6.value,
    onChange = _ref6.onChange;
  var qualities = [{
    id: 'wav-24',
    label: 'Studio (WAV 48kHz/24-bit)',
    description: 'Uncompressed lossless — same as Riverside Pro',
    bitrate: '~2.3 Mbps',
    fileSize: '~17 MB/min',
    icon: '🏆',
    recommended: true
  }, {
    id: 'wav-16',
    label: 'High (WAV 48kHz/16-bit)',
    description: 'Lossless CD quality — great for most podcasts',
    bitrate: '~1.5 Mbps',
    fileSize: '~11 MB/min',
    icon: '⭐'
  }, {
    id: 'opus-256',
    label: 'Standard (Opus 256kbps)',
    description: 'Near-lossless compressed — saves bandwidth',
    bitrate: '256 kbps',
    fileSize: '~1.9 MB/min',
    icon: '📡'
  }, {
    id: 'opus-128',
    label: 'Compact (Opus 128kbps)',
    description: 'Good quality compressed — for slow connections',
    bitrate: '128 kbps',
    fileSize: '~0.96 MB/min',
    icon: '📱'
  }];
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
    className: "quality-selector",
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("label", {
      className: "quality-label",
      children: "Recording Quality"
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
      className: "quality-options",
      children: qualities.map(function (q) {
        return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
          className: "quality-option ".concat(value === q.id ? 'selected' : '', " ").concat(q.recommended ? 'recommended' : ''),
          onClick: function onClick() {
            return onChange(q.id);
          },
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
            className: "quality-header",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
              className: "quality-icon",
              children: q.icon
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
              className: "quality-name",
              children: q.label
            }), q.recommended && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
              className: "quality-badge",
              children: "Recommended"
            })]
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
            className: "quality-desc",
            children: q.description
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)("div", {
            className: "quality-stats",
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
              children: q.bitrate
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("span", {
              children: q.fileSize
            })]
          })]
        }, q.id);
      })
    })]
  });
};

// =============================================================================
// EXPORT ALL PHASE 1 COMPONENTS
// =============================================================================



/***/ })

}]);