# Smoke Audit Batch 3: Recording Studio Bugs #7 & #8

## Bug #7: Microphone records mono in one ear only

**User-visible symptom:** User records vocals/instrument with a built-in or USB microphone (which delivers mono via `getUserMedia`). Playback routes the signal to only one channel (left or right ear), leaving the other silent. Expected: mono should play centered in both ears, or be true stereo.

**Code location:** `/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js`:
- Recording setup: lines 5545–5656 (`startRecording`)
- Decode and workaround: lines 5607–5635 (in `rec.onstop` callback)
- Playback chain: lines 5304–5347 (`buildPlaybackSources`)
- ChannelSplitter for metering: line 5314
- StereoPanner (no explicit channel config): line 5313

**Root cause:** When a microphone delivers 1-channel audio via `getUserMedia`, the `MediaRecorder` captures and encodes it as mono. On decode (line 5615), the AudioBuffer retains 1 channel. During playback, the mono buffer feeds through the playback graph (source → effects → gain → StereoPanner → splitter for analysers → master). 

The Web Audio API spec says a mono source should upmix to stereo when fed to a StereoPanner, but this only works if `channelCountMode` is `"max"` (the default for most nodes). However, several effect nodes in the FX chain (Convolver, and possibly the ChannelSplitter used for metering analysis) set `channelCountMode: "explicit"`, which pins the channel count and prevents upmixing. This routes the mono signal to the left channel only by default.

The current code includes a WORKAROUND (lines 5623–5635) that explicitly materializes a 2-channel buffer at decode time by copying the mono channel data to both L and R. This bypasses the channel upmixing issue entirely. While it solves the symptom, the root cause (missing `channelInterpretation: "speakers"` or `channelCountMode: "max"` on the source or StereoPanner) remains unaddressed.

**Category:** Pre-existing / Architectural

**Difficulty:** Small (30–60min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** The proper fix would be to set explicit channel interpretation on the playback nodes: either set `channelInterpretation: "speakers"` on the StereoPanner, or set `channelCountMode: "max"` on the BufferSource, or both. This would allow the standard Web Audio upmixing to work correctly. Alternatively, remove the workaround and rely on the Web Audio spec behavior once the chain is corrected. The workaround can then be retired. A third option is to keep the workaround as a safety net for edge cases but ensure the audio graph itself is also fixed so the intent is clear to future maintainers.

---

## Bug #8: Recording meters don't show levels during recording, only after

**User-visible symptom:** User arms a track and clicks Record. During recording, the track's input level meter (on the armed track's fader strip) remains dark/inactive and shows no movement. After recording stops and the audio is decoded, the recorded waveform appears and meters show retrospective levels. Expected: real-time meter movement DURING recording, like any professional DAW.

**Code location:** `/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js`:
- Recording start: lines 5545–5656 (`startRecording`)
- Meter animation loop: lines 5179–5204 (`startMeterAnimation`)
- Meter animation called at playback start: line 5447 (in `startPlayback`)
- Track analysers populated: line 5343 (in `buildPlaybackSources`)
- Track analyser retrieval check: line 5310 (in `buildPlaybackSources`)
- Playback sources rebuild during overdub record: line 5654

**Root cause:** During recording, `startPlayback(true)` is called with `overdub=true` (line 5654), which triggers `buildPlaybackSources()` (line 5441). However, `buildPlaybackSources()` only creates analysers for tracks that have a pre-existing `audioBuffer` (line 5310: `if (!t.audioBuffer) { trackAnalysersRef.current[i] = null; return; }`).

For the armed track being recorded to, if this is a fresh recording or a re-record with no prior audio, `t.audioBuffer` is null or undefined when playback is started. As a result, `trackAnalysersRef.current[armedTrackIndex]` is set to null (line 5310). When `startMeterAnimation()` runs (line 5447), the meter loop at lines 5184–5191 checks each track's analyser pair. For the null entry, line 5185 returns all zeros: `{ left: 0, right: 0, peak: 0 }`. Thus the meter for the recording track shows no activity.

The input monitor meter at the top (line 6728) DOES work during recording because it uses a separate `inputAnalyserRef` attached to the mic stream directly (line 5576). However, the per-track recording meters (shown in the Console view) have no dedicated analyser during recording.

**Category:** Pre-existing / Architectural

**Difficulty:** Tiny (<30min)

**Shared with:** none

**Dependencies:** none

**Fix approach:** Create a dedicated analyser for the armed track's input stream during recording, or modify `buildPlaybackSources()` to create analyser nodes for tracks with no audioBuffer yet (in recording mode). The simplest fix is to wire the `inputAnalyserRef` (which is already monitoring the mic) into the playback meter loop's data source, or create a second analyser on the `recMonitorGainRef` (the monitoring gain node, line 5583) so the same audio path that users hear during monitoring also feeds the real-time meter. When recording stops and the audioBuffer is created, the normal playback-based metres can take over.

