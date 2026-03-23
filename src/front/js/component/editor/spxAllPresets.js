import { SPX_190_PRESETS } from "./spx190Presets.js";
import { SPX_300_PRESETS, SPX_300_PRESET_LIBRARY } from "./spx300Presets.js";
import { SPX_NODE_TEMPLATES } from "./spxNodeTemplates.js";
import { SPX_LUT_PACK } from "./spxLUTPack.js";
import { SPX_PRESET_THUMBNAILS } from "./spxPresetThumbnails.js";
import { SPX_MEDIA_BIN_SECTIONS } from "./spxMediaBinSchema.js";

const flattenPresetObject = (obj) => Object.values(obj).flat();

export const SPX_190_PRESET_LIBRARY = flattenPresetObject(SPX_190_PRESETS);
export const SPX_300_LIBRARY = SPX_300_PRESET_LIBRARY || flattenPresetObject(SPX_300_PRESETS);

export const ALL_VIDEO_PRESETS = [
  ...SPX_190_PRESET_LIBRARY,
  ...SPX_300_LIBRARY
];

export const ALL_NODE_TEMPLATES = SPX_NODE_TEMPLATES;
export const ALL_LUTS = SPX_LUT_PACK;
export const ALL_THUMBNAILS = SPX_PRESET_THUMBNAILS;
export const ALL_MEDIA_BIN_SECTIONS = SPX_MEDIA_BIN_SECTIONS;

export const ALL_PRESETS = {
  video: ALL_VIDEO_PRESETS,
  nodes: ALL_NODE_TEMPLATES,
  luts: ALL_LUTS,
  thumbs: ALL_THUMBNAILS,
  mediaBin: ALL_MEDIA_BIN_SECTIONS
};

console.log("SPX 190 presets:", SPX_190_PRESET_LIBRARY.length);
console.log("SPX 300 presets:", SPX_300_LIBRARY.length);
console.log("ALL VIDEO PRESETS:", ALL_VIDEO_PRESETS.length);
console.log("NODE TEMPLATES:", ALL_NODE_TEMPLATES.length);
console.log("LUT PACK:", ALL_LUTS.length);
console.log("THUMBNAILS:", ALL_THUMBNAILS.length);
console.log("MEDIA BIN SECTIONS:", ALL_MEDIA_BIN_SECTIONS.length);
