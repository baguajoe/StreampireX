"use strict";
(self["webpackChunkreact_hello_webapp"] = self["webpackChunkreact_hello_webapp"] || []).push([["src_front_js_component_audio_worklets_compressorWorkletSource_js"],{

/***/ "./src/front/js/component/audio/worklets/compressorWorkletSource.js":
/*!**************************************************************************!*\
  !*** ./src/front/js/component/audio/worklets/compressorWorkletSource.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getCompressorWorkletSource: () => (/* binding */ getCompressorWorkletSource)
/* harmony export */ });
// =============================================================================
// compressorWorkletSource.js — Compressor AudioWorkletProcessor Source
// =============================================================================
// Returns the source code string for the compressor worklet.
// This is loaded as a Blob URL by PluginHost.
// RMS-based level detection → gain computer → smooth envelope → apply gain
// =============================================================================

var getCompressorWorkletSource = function getCompressorWorkletSource() {
  var processorName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'spx-compressor';
  return "\nclass ".concat(processorName.replace(/-/g, '_'), "Processor extends AudioWorkletProcessor {\n  static get parameterDescriptors() {\n    return [\n      { name: 'threshold', defaultValue: -18, minValue: -60, maxValue: 0 },\n      { name: 'ratio',     defaultValue: 4,   minValue: 1,   maxValue: 20 },\n      { name: 'attack',    defaultValue: 10,  minValue: 0.1, maxValue: 200 },  // ms\n      { name: 'release',   defaultValue: 150, minValue: 10,  maxValue: 2000 }, // ms\n      { name: 'knee',      defaultValue: 6,   minValue: 0,   maxValue: 30 },   // dB\n      { name: 'makeup',    defaultValue: 0,   minValue: 0,   maxValue: 24 },   // dB\n    ];\n  }\n\n  constructor() {\n    super();\n    this._envDb = -100; // envelope state in dB\n    this._rmsWindow = new Float32Array(512);\n    this._rmsIdx = 0;\n    this._rmsSum = 0;\n  }\n\n  process(inputs, outputs, parameters) {\n    const input = inputs[0];\n    const output = outputs[0];\n    if (!input || !input[0]) return true;\n\n    const numChannels = Math.min(input.length, output.length);\n    const blockSize = input[0].length;\n\n    const threshold = parameters.threshold[0] ?? -18;\n    const ratio     = parameters.ratio[0] ?? 4;\n    const attackMs  = parameters.attack[0] ?? 10;\n    const releaseMs = parameters.release[0] ?? 150;\n    const kneeDb    = parameters.knee[0] ?? 6;\n    const makeupDb  = parameters.makeup[0] ?? 0;\n\n    const attackCoeff  = Math.exp(-1.0 / (attackMs * 0.001 * sampleRate));\n    const releaseCoeff = Math.exp(-1.0 / (releaseMs * 0.001 * sampleRate));\n    const makeupLin    = Math.pow(10, makeupDb / 20);\n    const halfKnee     = kneeDb / 2;\n\n    for (let i = 0; i < blockSize; i++) {\n      // Sum channels for detection (mono sum)\n      let sum = 0;\n      for (let ch = 0; ch < numChannels; ch++) {\n        sum += input[ch][i];\n      }\n      const mono = sum / numChannels;\n\n      // RMS\n      const old = this._rmsWindow[this._rmsIdx];\n      this._rmsSum -= old * old;\n      this._rmsWindow[this._rmsIdx] = mono;\n      this._rmsSum += mono * mono;\n      this._rmsIdx = (this._rmsIdx + 1) % this._rmsWindow.length;\n      const rms = Math.sqrt(Math.max(0, this._rmsSum / this._rmsWindow.length));\n\n      // Convert to dB\n      const inputDb = rms > 1e-10 ? 20 * Math.log10(rms) : -100;\n\n      // Gain computer with soft knee\n      let gainReductionDb = 0;\n      if (kneeDb <= 0) {\n        // Hard knee\n        if (inputDb > threshold) {\n          gainReductionDb = (inputDb - threshold) * (1 - 1 / ratio);\n        }\n      } else {\n        // Soft knee\n        if (inputDb > threshold + halfKnee) {\n          gainReductionDb = (inputDb - threshold) * (1 - 1 / ratio);\n        } else if (inputDb > threshold - halfKnee) {\n          const x = inputDb - threshold + halfKnee;\n          gainReductionDb = (x * x) / (2 * kneeDb) * (1 - 1 / ratio);\n        }\n      }\n\n      // Envelope follower (attack/release)\n      const targetDb = -gainReductionDb;\n      const coeff = targetDb < this._envDb ? attackCoeff : releaseCoeff;\n      this._envDb = coeff * this._envDb + (1 - coeff) * targetDb;\n\n      // Apply gain\n      const gainLin = Math.pow(10, this._envDb / 20) * makeupLin;\n      for (let ch = 0; ch < numChannels; ch++) {\n        output[ch][i] = input[ch][i] * gainLin;\n      }\n    }\n\n    return true;\n  }\n}\n\nregisterProcessor('").concat(processorName, "', ").concat(processorName.replace(/-/g, '_'), "Processor);\n");
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (getCompressorWorkletSource);

/***/ })

}]);