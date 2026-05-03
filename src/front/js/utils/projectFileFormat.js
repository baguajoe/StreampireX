// =============================================================================
// projectFileFormat.js — .spxsonic zip-based project save/load
// =============================================================================
// Bug #8a/b: replace JSON-only save with a self-contained zip carrying both
// project metadata and the actual audio buffers. End users get one file, no
// dangling blob: URLs, and edits made in the AudioClipEditor (Part 5) round-trip
// because the rendered buffer travels with the project.
//
// Layout inside the zip:
//   project.json                  → { version, tool, savedAt, project }
//   audio/<audio_id>.wav          → 16-bit PCM WAV, one per unique buffer
//
// The legacy .spx JSON format is still loadable via parseLegacyJson().

import JSZip from "jszip";

export const FILE_FORMAT_VERSION = 1;
export const FILE_TOOL_TAG = "spx-sonic-studio";
export const FILE_EXTENSION = "spxsonic";

// ── WAV serialisation (16-bit PCM, RIFF) ──────────────────────────────────
export const audioBufferToWav = (audioBuffer) => {
  const numCh = audioBuffer.numberOfChannels;
  const sr = audioBuffer.sampleRate;
  const len = audioBuffer.length;
  const interleaved = new Float32Array(len * numCh);
  for (let c = 0; c < numCh; c++) {
    const ch = audioBuffer.getChannelData(c);
    for (let i = 0; i < len; i++) interleaved[i * numCh + c] = ch[i];
  }
  const bytesPerSample = 2;
  const dataSize = interleaved.length * bytesPerSample;
  const ab = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(ab);
  const wr = (off, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(off + i, str.charCodeAt(i)); };
  wr(0, "RIFF"); dv.setUint32(4, 36 + dataSize, true); wr(8, "WAVE");
  wr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * numCh * bytesPerSample, true);
  dv.setUint16(32, numCh * bytesPerSample, true); dv.setUint16(34, 16, true);
  wr(36, "data"); dv.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
};

// ── Save: zip up project.json + audio/*.wav ──────────────────────────────
// audioBuffers: Map<string, AudioBuffer> keyed by stable id (track id, region id, etc).
// projectData: any JSON-serialisable object — the caller is responsible for stripping
// blob: URLs and for tagging tracks/regions with audio_id pointers into the map.
export const saveProjectFile = async (projectData, audioBuffers) => {
  const zip = new JSZip();
  const meta = {
    version: FILE_FORMAT_VERSION,
    tool: FILE_TOOL_TAG,
    savedAt: new Date().toISOString(),
    project: projectData,
  };
  zip.file("project.json", JSON.stringify(meta, null, 2));
  if (audioBuffers && audioBuffers.size) {
    const audioFolder = zip.folder("audio");
    for (const [key, buf] of audioBuffers.entries()) {
      if (!buf) continue;
      const wav = audioBufferToWav(buf);
      // Sanitize key for filesystem safety. Keys come from track/region IDs.
      const safe = String(key).replace(/[^a-zA-Z0-9._-]/g, "_");
      audioFolder.file(`${safe}.wav`, wav);
    }
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
};

// ── Load: try zip first, fall back to legacy JSON ────────────────────────
// Returns { project, audioBuffers: Map<string, AudioBuffer>, version, tool, isLegacy }.
export const loadProjectFile = async (blobOrFile, audioContext) => {
  // Read once into ArrayBuffer so we can sniff the magic and reuse if it's JSON.
  const ab = blobOrFile instanceof Blob ? await blobOrFile.arrayBuffer() : blobOrFile;
  const isZip = ab.byteLength >= 4 && (() => {
    const dv = new DataView(ab);
    // PK\x03\x04 (local file header) or PK\x05\x06 (empty zip).
    return dv.getUint8(0) === 0x50 && dv.getUint8(1) === 0x4b && (dv.getUint8(2) === 0x03 || dv.getUint8(2) === 0x05);
  })();

  if (!isZip) return parseLegacyJson(ab);

  const zip = await JSZip.loadAsync(ab);
  const projectFile = zip.file("project.json");
  if (!projectFile) throw new Error("project.json missing from .spxsonic archive");
  const meta = JSON.parse(await projectFile.async("string"));
  if (meta.tool && meta.tool !== FILE_TOOL_TAG) {
    // eslint-disable-next-line no-console
    console.warn(`[spxsonic] file tool tag = ${meta.tool}, expected ${FILE_TOOL_TAG} — loading anyway`);
  }
  const audioBuffers = new Map();
  if (audioContext) {
    const audioEntries = [];
    zip.folder("audio")?.forEach((relPath, file) => { if (!file.dir) audioEntries.push([relPath, file]); });
    for (const [relPath, file] of audioEntries) {
      try {
        const wavAb = await file.async("arraybuffer");
        // decodeAudioData transfers the buffer in some browsers — slice for safety.
        const decoded = await audioContext.decodeAudioData(wavAb.slice(0));
        const key = relPath.replace(/\.wav$/i, "");
        audioBuffers.set(key, decoded);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[spxsonic] failed to decode ${relPath}:`, e);
      }
    }
  }
  return { project: meta.project, audioBuffers, version: meta.version, tool: meta.tool, savedAt: meta.savedAt, isLegacy: false };
};

// Legacy JSON-only .spx (or .json) files predate the zip format. Audio is gone.
const parseLegacyJson = async (ab) => {
  const text = new TextDecoder("utf-8").decode(ab);
  const data = JSON.parse(text);
  if (data.format && data.format !== "streampirex-daw") {
    throw new Error(`Unrecognized project format: ${data.format}`);
  }
  // Adapt legacy shape (flat) to the new {project, ...} shape so callers have one path.
  return { project: data, audioBuffers: new Map(), version: 0, tool: "legacy", savedAt: data.created_at || null, isLegacy: true };
};
