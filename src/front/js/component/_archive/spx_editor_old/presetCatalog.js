import * as EffectPresetModule from "../../effects/presets/effectPresets.js";
import * as ShaderPresetModule from "../nodecompositor/vfx/shaderNodePresets.js";
import * as MotionPresetModule from "../../utils/motionstudio/presetLibrary.js";
import * as ExportPresetModule from "../../export/pipeline/exportPresets.js";
import * as AudioPresetModule from "../audio/plugins/presets/presetStore.js";
import * as ProjectRackPresetModule from "../audio/plugins/presets/projectRackStore.js";
import {
  ALL_VIDEO_PRESETS,
  ALL_LUTS,
  ALL_NODE_TEMPLATES
} from "./spxAllPresets.js";

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const dedupeById = (items = []) => {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = item.id || `${item.name}-${item.category}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toArrayItems = (value, category = "General", source = "Unknown") => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item, index) => {
        if (typeof item === "string") {
          return {
            id: `${source}-${category}-${index}`,
            name: item,
            category,
            source,
            raw: item
          };
        }

        if (isPlainObject(item)) {
          return {
            id: item.id || `${source}-${category}-${index}`,
            name:
              item.name ||
              item.title ||
              item.label ||
              item.presetName ||
              item.key ||
              `Preset ${index + 1}`,
            category: item.category || category,
            source,
            raw: item
          };
        }

        return {
          id: `${source}-${category}-${index}`,
          name: String(item),
          category,
          source,
          raw: item
        };
      });
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, nested]) => {
      if (Array.isArray(nested)) return toArrayItems(nested, key, source);

      if (isPlainObject(nested)) {
        const hasPrimitiveLeaves = Object.values(nested).some(
          (v) => typeof v !== "object" || v === null
        );

        if (hasPrimitiveLeaves) {
          return [
            {
              id: `${source}-${category}-${key}`,
              name: nested.name || nested.title || key,
              category,
              source,
              raw: nested
            }
          ];
        }

        return toArrayItems(nested, key, source);
      }

      return [
        {
          id: `${source}-${category}-${key}`,
          name: key,
          category,
          source,
          raw: nested
        }
      ];
    });
  }

  return [];
};

const collectFromModule = (moduleObj, sourceLabel) =>
  Object.entries(moduleObj)
    .filter(([key, value]) => key !== "default" && typeof value !== "function" && (Array.isArray(value) || isPlainObject(value)))
    .flatMap(([key, value]) => toArrayItems(value, key, sourceLabel));

const spxVideoPresetItems = (ALL_VIDEO_PRESETS || []).map((item, index) => ({
  id: item.id || `spx-video-${index}`,
  name: item.name || item.title || item.label || `SPX Preset ${index + 1}`,
  category: item.category || item.group || "SPX Video",
  source: "SPX Video",
  raw: item
}));

const spxLutItems = (ALL_LUTS || []).map((item, index) => ({
  id: item.id || `spx-lut-${index}`,
  name: item.name || item.title || `LUT ${index + 1}`,
  category: item.category || "LUT",
  source: "SPX LUT",
  raw: item
}));

const spxNodeItems = (ALL_NODE_TEMPLATES || []).map((item, index) => ({
  id: item.id || `spx-node-${index}`,
  name: item.name || item.title || `Node Template ${index + 1}`,
  category: item.category || "Node Template",
  source: "SPX Nodes",
  raw: item
}));

export const EFFECT_LIBRARY = dedupeById([
  ...collectFromModule(EffectPresetModule, "Effects"),
  ...collectFromModule(ShaderPresetModule, "Shaders"),
  ...spxNodeItems
]);

export const PRESET_LIBRARY = dedupeById([
  ...spxVideoPresetItems,
  ...collectFromModule(MotionPresetModule, "Motion"),
  ...collectFromModule(ExportPresetModule, "Export"),
  ...collectFromModule(AudioPresetModule, "Audio"),
  ...collectFromModule(ProjectRackPresetModule, "Rack")
]);

export const TRANSITION_LIBRARY = dedupeById([
  ...EFFECT_LIBRARY.filter((item) =>
    /transition|dissolve|wipe|glitch|zoom|fade|slide|push/i.test(item.name)
  ),
  ...PRESET_LIBRARY.filter((item) =>
    /transition|dissolve|wipe|glitch|zoom|fade|slide|push/i.test(item.name)
  )
]);

export const COLOR_LIBRARY = dedupeById([
  ...spxLutItems,
  ...EFFECT_LIBRARY.filter((item) =>
    /color|lut|grade|contrast|saturation|temperature|tint|exposure|film/i.test(item.name)
  ),
  ...PRESET_LIBRARY.filter((item) =>
    /color|lut|grade|contrast|saturation|temperature|tint|exposure|film|cinematic|teal|orange/i.test(item.name)
  )
]);

export const summarizeLibraries = () => ({
  effects: EFFECT_LIBRARY.length,
  presets: PRESET_LIBRARY.length,
  transitions: TRANSITION_LIBRARY.length,
  color: COLOR_LIBRARY.length
});
