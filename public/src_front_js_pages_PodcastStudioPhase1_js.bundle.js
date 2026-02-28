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
/* harmony import */ var _babel_runtime_helpers_toConsumableArray__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/toConsumableArray */ "./node_modules/@babel/runtime/helpers/esm/toConsumableArray.js");
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "./node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ "./node_modules/@babel/runtime/helpers/esm/slicedToArray.js");
/* harmony import */ var _babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js");
/* harmony import */ var _babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "./node_modules/@babel/runtime/helpers/esm/classCallCheck.js");
/* harmony import */ var _babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @babel/runtime/helpers/createClass */ "./node_modules/@babel/runtime/helpers/esm/createClass.js");
/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @babel/runtime/regenerator */ "./node_modules/@babel/runtime/regenerator/index.js");
/* harmony import */ var _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_7__);






function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_1__["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }

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
    (0,_babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_4__["default"])(this, WAVRecordingEngine);
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
  return (0,_babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_5__["default"])(WAVRecordingEngine, [{
    key: "start",
    value: function () {
      var _start = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_3__["default"])(/*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().mark(function _callee() {
        var _this = this;
        var bufferSize, _t;
        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              this.audioContext = new AudioContext({
                sampleRate: this.sampleRate
              });
              this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

              // Use AudioWorklet for high-performance PCM capture
              // Falls back to ScriptProcessorNode if AudioWorklet unavailable
              _context.prev = 1;
              _context.next = 2;
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
              _context.next = 4;
              break;
            case 3:
              _context.prev = 3;
              _t = _context["catch"](1);
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
            case "end":
              return _context.stop();
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
  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(null),
    _useState2 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState, 2),
    micStream = _useState2[0],
    setMicStream = _useState2[1];
  var _useState3 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(''),
    _useState4 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState3, 2),
    selectedMic = _useState4[0],
    setSelectedMic = _useState4[1];
  var _useState5 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(''),
    _useState6 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState5, 2),
    selectedCamera = _useState6[0],
    setSelectedCamera = _useState6[1];
  var _useState7 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)({
      mics: [],
      cameras: []
    }),
    _useState8 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState7, 2),
    devices = _useState8[0],
    setDevices = _useState8[1];
  var _useState9 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(0),
    _useState0 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState9, 2),
    micLevel = _useState0[0],
    setMicLevel = _useState0[1];
  var _useState1 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(false),
    _useState10 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState1, 2),
    videoEnabled = _useState10[0],
    setVideoEnabled = _useState10[1];
  var _useState11 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(false),
    _useState12 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState11, 2),
    isMicTesting = _useState12[0],
    setIsMicTesting = _useState12[1];
  var _useState13 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(false),
    _useState14 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState13, 2),
    isReady = _useState14[0],
    setIsReady = _useState14[1];
  var videoRef = (0,react__WEBPACK_IMPORTED_MODULE_7__.useRef)(null);
  var analyserRef = (0,react__WEBPACK_IMPORTED_MODULE_7__.useRef)(null);
  var animFrameRef = (0,react__WEBPACK_IMPORTED_MODULE_7__.useRef)(null);
  (0,react__WEBPACK_IMPORTED_MODULE_7__.useEffect)(function () {
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
    var _ref2 = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_3__["default"])(/*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().mark(function _callee2() {
      var constraints, stream, ctx, source, analyser, _updateLevel, _t2;
      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().wrap(function (_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
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
            _context2.next = 1;
            return navigator.mediaDevices.getUserMedia(constraints);
          case 1:
            stream = _context2.sent;
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
            _context2.next = 3;
            break;
          case 2:
            _context2.prev = 2;
            _t2 = _context2["catch"](0);
            console.error('Device access error:', _t2);
          case 3:
          case "end":
            return _context2.stop();
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
  (0,react__WEBPACK_IMPORTED_MODULE_7__.useEffect)(function () {
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
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "green-room"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "green-room-header"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("h2", null, "\uD83D\uDFE2 Green Room"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("p", {
    className: "green-room-subtitle"
  }, "Check your setup before joining the studio")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "green-room-content"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "green-room-preview"
  }, videoEnabled ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("video", {
    ref: videoRef,
    autoPlay: true,
    muted: true,
    playsInline: true,
    className: "green-room-video"
  }) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "green-room-avatar"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "avatar-initial"
  }, (userName === null || userName === void 0 || (_userName$charAt = userName.charAt(0)) === null || _userName$charAt === void 0 ? void 0 : _userName$charAt.toUpperCase()) || '?'), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("p", null, userName || 'Guest')), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "green-room-mic-level"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "mic-level-bar"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "mic-level-fill",
    style: {
      height: "".concat(micLevel, "%"),
      backgroundColor: micLevel > 80 ? '#ff4444' : micLevel > 50 ? '#FF6600' : '#00ffc8'
    }
  })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "mic-level-label"
  }, isMicTesting ? "".concat(Math.round(micLevel), "%") : '—'))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "green-room-controls"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "device-select-group"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("label", null, "\uD83C\uDFA4 Microphone"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("select", {
    value: selectedMic,
    onChange: function onChange(e) {
      return setSelectedMic(e.target.value);
    },
    className: "device-select"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("option", {
    value: ""
  }, "Default Microphone"), devices.mics.map(function (d) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("option", {
      key: d.deviceId,
      value: d.deviceId
    }, d.label || "Mic ".concat(d.deviceId.slice(0, 8)));
  }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "device-select-group"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("label", null, "\uD83D\uDCF7 Camera"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("select", {
    value: selectedCamera,
    onChange: function onChange(e) {
      return setSelectedCamera(e.target.value);
    },
    className: "device-select",
    disabled: !videoEnabled
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("option", {
    value: ""
  }, "Default Camera"), devices.cameras.map(function (d) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("option", {
      key: d.deviceId,
      value: d.deviceId
    }, d.label || "Camera ".concat(d.deviceId.slice(0, 8)));
  }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "device-toggles"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "toggle-btn ".concat(videoEnabled ? 'active' : ''),
    onClick: function onClick() {
      return setVideoEnabled(!videoEnabled);
    }
  }, videoEnabled ? '📹 Video On' : '📹 Video Off'), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "toggle-btn test-btn ".concat(isMicTesting ? 'testing' : ''),
    onClick: isMicTesting ? stopMicTest : startMicTest
  }, isMicTesting ? '⏹ Stop Test' : '🎙 Test Mic')), isMicTesting && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "audio-quality-check"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "quality-item ".concat(micLevel > 5 ? 'pass' : 'fail')
  }, micLevel > 5 ? '✅' : '❌', " Microphone detected"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "quality-item ".concat(micLevel < 80 ? 'pass' : 'warn')
  }, micLevel < 80 ? '✅' : '⚠️', " Audio level", micLevel >= 80 ? ' — too loud, move back' : ' OK'), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "quality-item pass"
  }, "\u2705 Recording quality: WAV 48kHz / 24-bit")), !isHost && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "waiting-message"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "waiting-spinner"
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("p", null, "Waiting for host to start the session...")))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "green-room-actions"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "btn-leave",
    onClick: onLeave
  }, "Leave"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "btn-join-studio",
    onClick: handleJoin,
    disabled: !isHost && !isReady
  }, isHost ? '🎙 Start Studio' : '✅ Ready to Join')));
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
  var _useState15 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(null),
    _useState16 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState15, 2),
    transcript = _useState16[0],
    setTranscript = _useState16[1];
  var _useState17 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)([]),
    _useState18 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState17, 2),
    words = _useState18[0],
    setWords = _useState18[1]; // { word, start, end, deleted, isFiller }
  var _useState19 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(false),
    _useState20 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState19, 2),
    isTranscribing = _useState20[0],
    setIsTranscribing = _useState20[1];
  var _useState21 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(false),
    _useState22 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState21, 2),
    isPlaying = _useState22[0],
    setIsPlaying = _useState22[1];
  var _useState23 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(0),
    _useState24 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState23, 2),
    currentTime = _useState24[0],
    setCurrentTime = _useState24[1];
  var _useState25 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(true),
    _useState26 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState25, 2),
    showFillers = _useState26[0],
    setShowFillers = _useState26[1];
  var _useState27 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)([]),
    _useState28 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState27, 2),
    editHistory = _useState28[0],
    setEditHistory = _useState28[1];
  var _useState29 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)({
      fillers: 0,
      pauses: 0,
      totalRemoved: 0
    }),
    _useState30 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState29, 2),
    stats = _useState30[0],
    setStats = _useState30[1];
  var audioRef = (0,react__WEBPACK_IMPORTED_MODULE_7__.useRef)(null);
  var token = sessionStorage.getItem('token');
  var FILLER_WORDS = ['um', 'uh', 'uhh', 'umm', 'hmm', 'hm', 'ah', 'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically', 'actually', 'literally', 'right', 'so', 'well', 'er', 'erm'];

  // Transcribe audio
  var handleTranscribe = /*#__PURE__*/function () {
    var _ref4 = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_3__["default"])(/*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().mark(function _callee3() {
      var res, data, processedWords, i, gap, fillerCount, pauseCount, _t3;
      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().wrap(function (_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            setIsTranscribing(true);
            _context3.prev = 1;
            _context3.next = 2;
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
            res = _context3.sent;
            _context3.next = 3;
            return res.json();
          case 3:
            data = _context3.sent;
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
            _context3.next = 5;
            break;
          case 4:
            _context3.prev = 4;
            _t3 = _context3["catch"](1);
            console.error('Transcription error:', _t3);
          case 5:
            setIsTranscribing(false);
          case 6:
          case "end":
            return _context3.stop();
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
      return [].concat((0,_babel_runtime_helpers_toConsumableArray__WEBPACK_IMPORTED_MODULE_0__["default"])(prev), [{
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
      return [].concat((0,_babel_runtime_helpers_toConsumableArray__WEBPACK_IMPORTED_MODULE_0__["default"])(prev), [{
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
  var _useState31 = (0,react__WEBPACK_IMPORTED_MODULE_7__.useState)(null),
    _useState32 = (0,_babel_runtime_helpers_slicedToArray__WEBPACK_IMPORTED_MODULE_2__["default"])(_useState31, 2),
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
    var _ref5 = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_3__["default"])(/*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().mark(function _callee4() {
      var edl, res, data, _t4;
      return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().wrap(function (_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            edl = generateEDL();
            _context4.prev = 1;
            _context4.next = 2;
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
            res = _context4.sent;
            _context4.next = 3;
            return res.json();
          case 3:
            data = _context4.sent;
            if (data.edited_audio_url) {
              onEditComplete(data.edited_audio_url, data.transcript);
            }
            _context4.next = 5;
            break;
          case 4:
            _context4.prev = 4;
            _t4 = _context4["catch"](1);
            console.error('Apply edits error:', _t4);
          case 5:
          case "end":
            return _context4.stop();
        }
      }, _callee4, null, [[1, 4]]);
    }));
    return function applyEdits() {
      return _ref5.apply(this, arguments);
    };
  }();

  // Playback with word highlighting
  (0,react__WEBPACK_IMPORTED_MODULE_7__.useEffect)(function () {
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
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "transcript-editor"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "transcript-header"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("h3", null, "\uD83D\uDCDD Text-Based Editor"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("p", {
    className: "transcript-subtitle"
  }, "Click words to remove them. Select ranges by dragging. Edit your podcast like a document.")), !transcript && !isTranscribing && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "transcript-empty"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "btn-transcribe",
    onClick: handleTranscribe
  }, "\u2728 Generate Transcript"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("p", null, "AI transcription with word-level timestamps")), isTranscribing && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "transcript-loading"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "loading-spinner"
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("p", null, "Transcribing audio... This may take 30-60 seconds"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "loading-steps"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "step active"
  }, "\uD83C\uDFA4 Uploading audio"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "step"
  }, "\uD83E\uDDE0 AI processing"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "step"
  }, "\uD83D\uDCDD Generating timestamps"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "step"
  }, "\uD83D\uDD0D Detecting fillers"))), words.length > 0 && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement((react__WEBPACK_IMPORTED_MODULE_7___default().Fragment), null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "transcript-toolbar"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "toolbar-actions"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "toolbar-btn remove-fillers",
    onClick: removeAllFillers
  }, "\uD83D\uDDD1 Remove Fillers (", stats.fillers, ")"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "toolbar-btn remove-pauses",
    onClick: removeAllPauses
  }, "\u23E9 Trim Pauses (", stats.pauses, ")"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "toolbar-btn undo",
    onClick: handleUndo,
    disabled: editHistory.length === 0
  }, "\u21A9 Undo")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "toolbar-stats"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "stat"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("strong", null, stats.totalRemoved), " words removed"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "stat"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("strong", null, Math.round(words.filter(function (w) {
    return w.deleted;
  }).reduce(function (acc, w) {
    return acc + (w.end - w.start);
  }, 0)), "s"), " trimmed")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "toolbar-toggles"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("label", {
    className: "toggle-label"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("input", {
    type: "checkbox",
    checked: showFillers,
    onChange: function onChange(e) {
      return setShowFillers(e.target.checked);
    }
  }), "Highlight fillers"))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("audio", {
    ref: audioRef,
    src: audioUrl
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "transcript-text"
  }, words.map(function (w) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
      key: w.id,
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
      title: "".concat(w.start.toFixed(1), "s - ").concat(w.end.toFixed(1), "s").concat(w.isFiller ? ' (filler)' : '').concat(w.isPause ? " (".concat(w.pauseDuration.toFixed(1), "s pause)") : '')
    }, w.isPause && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
      className: "pause-marker"
    }, "\u23F8 ", w.pauseDuration.toFixed(1), "s"), w.word, ' ');
  })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "transcript-apply"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("button", {
    className: "btn-apply-edits",
    onClick: applyEdits
  }, "\u2702\uFE0F Apply Edits & Export"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
    className: "apply-note"
  }, "Creates a new audio file with your edits applied"))));
};

// =============================================================================
// 4. PROGRESSIVE UPLOAD ENGINE
// =============================================================================
// Uploads chunks every 30 seconds during recording so files are nearly
// ready when you hit stop (like Riverside)
var ProgressiveUploader = /*#__PURE__*/function () {
  function ProgressiveUploader(sessionId, trackId, token) {
    (0,_babel_runtime_helpers_classCallCheck__WEBPACK_IMPORTED_MODULE_4__["default"])(this, ProgressiveUploader);
    this.sessionId = sessionId;
    this.trackId = trackId;
    this.token = token;
    this.chunkIndex = 0;
    this.uploadedChunks = [];
    this.isUploading = false;
    this.queue = [];
  }
  return (0,_babel_runtime_helpers_createClass__WEBPACK_IMPORTED_MODULE_5__["default"])(ProgressiveUploader, [{
    key: "uploadChunk",
    value: function () {
      var _uploadChunk = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_3__["default"])(/*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().mark(function _callee5(blob, currentDuration) {
        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
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
            case "end":
              return _context5.stop();
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
      var _processQueue = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_3__["default"])(/*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().mark(function _callee6() {
        var _this$queue$shift, blob, chunkIndex, currentDuration, formData, res, _t5;
        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              if (!(this.queue.length === 0)) {
                _context6.next = 1;
                break;
              }
              this.isUploading = false;
              return _context6.abrupt("return");
            case 1:
              this.isUploading = true;
              _this$queue$shift = this.queue.shift(), blob = _this$queue$shift.blob, chunkIndex = _this$queue$shift.chunkIndex, currentDuration = _this$queue$shift.currentDuration;
              _context6.prev = 2;
              formData = new FormData();
              formData.append('chunk', blob, "chunk_".concat(chunkIndex, ".wav"));
              formData.append('session_id', this.sessionId);
              formData.append('track_id', this.trackId);
              formData.append('chunk_index', chunkIndex);
              formData.append('duration', currentDuration);
              _context6.next = 3;
              return fetch('/api/podcast-studio/upload-chunk', {
                method: 'POST',
                headers: {
                  'Authorization': "Bearer ".concat(this.token)
                },
                body: formData
              });
            case 3:
              res = _context6.sent;
              if (res.ok) {
                this.uploadedChunks.push(chunkIndex);
              }
              _context6.next = 5;
              break;
            case 4:
              _context6.prev = 4;
              _t5 = _context6["catch"](2);
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
            case "end":
              return _context6.stop();
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
      var _finalizeUpload = (0,_babel_runtime_helpers_asyncToGenerator__WEBPACK_IMPORTED_MODULE_3__["default"])(/*#__PURE__*/_babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().mark(function _callee7(finalBlob) {
        var formData, res;
        return _babel_runtime_regenerator__WEBPACK_IMPORTED_MODULE_6___default().wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              // Upload the complete final WAV file
              formData = new FormData();
              formData.append('audio', finalBlob, "recording_".concat(this.trackId, ".wav"));
              formData.append('session_id', this.sessionId);
              formData.append('track_id', this.trackId);
              formData.append('is_final', 'true');
              formData.append('uploaded_chunks', JSON.stringify(this.uploadedChunks));
              _context7.next = 1;
              return fetch('/api/podcast-studio/upload-track', {
                method: 'POST',
                headers: {
                  'Authorization': "Bearer ".concat(this.token)
                },
                body: formData
              });
            case 1:
              res = _context7.sent;
              _context7.next = 2;
              return res.json();
            case 2:
              return _context7.abrupt("return", _context7.sent);
            case 3:
            case "end":
              return _context7.stop();
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
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "quality-selector"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("label", {
    className: "quality-label"
  }, "Recording Quality"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
    className: "quality-options"
  }, qualities.map(function (q) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
      key: q.id,
      className: "quality-option ".concat(value === q.id ? 'selected' : '', " ").concat(q.recommended ? 'recommended' : ''),
      onClick: function onClick() {
        return onChange(q.id);
      }
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
      className: "quality-header"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
      className: "quality-icon"
    }, q.icon), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
      className: "quality-name"
    }, q.label), q.recommended && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", {
      className: "quality-badge"
    }, "Recommended")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("p", {
      className: "quality-desc"
    }, q.description), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("div", {
      className: "quality-stats"
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", null, q.bitrate), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_7___default().createElement("span", null, q.fileSize)));
  })));
};

// =============================================================================
// EXPORT ALL PHASE 1 COMPONENTS
// =============================================================================



/***/ })

}]);