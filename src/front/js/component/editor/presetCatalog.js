import * as EffectPresetModule from "../../effects/presets/effectPresets.js";
import * as ShaderPresetModule from "../nodecompositor/vfx/shaderNodePresets.js";
import * as MotionPresetModule from "../../utils/motionstudio/presetLibrary.js";
import * as ExportPresetModule from "../../export/pipeline/exportPresets.js";
import * as AudioPresetModule from "../audio/plugins/presets/presetStore.js";
import * as ProjectRackPresetModule from "../audio/plugins/presets/projectRackStore.js";

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

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
      if (Array.isArray(nested)) {
        return toArrayItems(nested, key, source);
      }

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

const collectFromModule = (moduleObj, sourceLabel) => {
  return Object.entries(moduleObj)
    .filter(([key, value]) => {
      if (key === "default") return false;
      if (typeof value === "function") return false;
      return Array.isArray(value) || isPlainObject(value);
    })
    .flatMap(([key, value]) => toArrayItems(value, key, sourceLabel));
};

export const EFFECT_LIBRARY = [
  ...collectFromModule(EffectPresetModule, "Effects"),
  ...collectFromModule(ShaderPresetModule, "Shaders")
];

export const PRESET_LIBRARY = [
  ...collectFromModule(MotionPresetModule, "Motion"),
  ...collectFromModule(ExportPresetModule, "Export"),
  ...collectFromModule(AudioPresetModule, "Audio"),
  ...collectFromModule(ProjectRackPresetModule, "Rack")
];

export const TRANSITION_LIBRARY = [
  ...EFFECT_LIBRARY.filter((item) =>
    /transition|dissolve|wipe|glitch|zoom|fade/i.test(item.name)
  ),
  ...PRESET_LIBRARY.filter((item) =>
    /transition|dissolve|wipe|glitch|zoom|fade/i.test(item.name)
  )
];

export const COLOR_LIBRARY = [
  ...EFFECT_LIBRARY.filter((item) =>
    /color|lut|grade|contrast|saturation|temperature|tint|exposure/i.test(item.name)
  ),
  ...PRESET_LIBRARY.filter((item) =>
    /color|lut|grade|contrast|saturation|temperature|tint|exposure/i.test(item.name)
  )
];

export const summarizeLibraries = () => ({
  effects: EFFECT_LIBRARY.length,
  presets: PRESET_LIBRARY.length,
  transitions: TRANSITION_LIBRARY.length,
  color: COLOR_LIBRARY.length
});
