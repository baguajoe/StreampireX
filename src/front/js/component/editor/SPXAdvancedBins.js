import {
  ALL_VIDEO_PRESETS,
  ALL_NODE_TEMPLATES,
  ALL_LUTS
} from "./spxAllPresets.js";

const withTags = (item, tags = []) => ({
  ...item,
  tags,
  rating: item.rating || 0
});

export const SPX_ADVANCED_BIN_DATA = {
  smartFolders: [
    {
      id: "smart_favorites",
      name: "Favorites",
      resolver: (ctx) => ctx.allItems.filter((item) => (item.rating || 0) >= 4)
    },
    {
      id: "smart_cinematic",
      name: "Cinematic",
      resolver: (ctx) => ctx.allItems.filter((item) =>
        /cinematic|film|blockbuster|trailer/i.test(item.name || "")
      )
    },
    {
      id: "smart_social",
      name: "Social",
      resolver: (ctx) => ctx.allItems.filter((item) =>
        /social|youtube|tiktok|instagram|reel/i.test(item.name || "")
      )
    },
    {
      id: "smart_glitch",
      name: "Glitch / Stylized",
      resolver: (ctx) => ctx.allItems.filter((item) =>
        /glitch|rgb|vhs|anime|comic|stylized|cyberpunk/i.test(item.name || "")
      )
    },
    {
      id: "smart_audio",
      name: "Audio Essentials",
      resolver: (ctx) => ctx.allItems.filter((item) =>
        (item.category || "").toLowerCase() === "audio"
      )
    }
  ],

  projectBins: [
    { id: "project_media", name: "Media" },
    { id: "project_sequences", name: "Sequences" },
    { id: "project_titles", name: "Titles" },
    { id: "project_adjustments", name: "Adjustment Layers" }
  ],

  effectBins: [
    { id: "effects_video", name: "Video FX" },
    { id: "effects_audio", name: "Audio FX" },
    { id: "effects_transitions", name: "Transitions" },
    { id: "effects_generators", name: "Generators" }
  ],

  presetBins: [
    { id: "presets_motion", name: "Motion" },
    { id: "presets_color", name: "Color" },
    { id: "presets_text", name: "Text" },
    { id: "presets_audio", name: "Audio" },
    { id: "presets_export", name: "Export" }
  ],

  assetBins: [
    { id: "assets_templates", name: "Templates" },
    { id: "assets_luts", name: "LUTs" },
    { id: "assets_overlays", name: "Overlays" },
    { id: "assets_lowerthirds", name: "Lower Thirds" },
    { id: "assets_logos", name: "Logos" }
  ],

  nodeBins: [
    { id: "nodes_compositing", name: "Compositing" },
    { id: "nodes_color", name: "Color Pipelines" },
    { id: "nodes_keying", name: "Keying" },
    { id: "nodes_stylized", name: "Stylized" },
    { id: "nodes_social", name: "Social Templates" }
  ]
};

export const buildIndexedItems = (assets = []) => {
  const video = ALL_VIDEO_PRESETS.map((item) => withTags(item, [
    item.category || "General",
    item.source || "SPX"
  ]));

  const luts = ALL_LUTS.map((item) => withTags(item, ["LUT", item.category || "Color"]));
  const nodes = ALL_NODE_TEMPLATES.map((item) => withTags(item, ["Nodes", item.category || "Compositing"]));
  const media = assets.map((item) => withTags(item, ["Media", item.type || "unknown"]));

  return [...video, ...luts, ...nodes, ...media];
};

export const resolveFolderItems = (folderId, assets = []) => {
  const byCategory = (name) =>
    ALL_VIDEO_PRESETS.filter((p) => (p.category || "").toLowerCase() === name.toLowerCase());

  const folderMap = {
    project_media: assets,
    project_sequences: [],
    project_titles: byCategory("Titles"),
    project_adjustments: [],
    effects_video: byCategory("Video FX"),
    effects_audio: byCategory("Audio"),
    effects_transitions: byCategory("Transitions"),
    effects_generators: [],
    presets_motion: byCategory("Motion"),
    presets_color: ALL_LUTS,
    presets_text: byCategory("Titles"),
    presets_audio: byCategory("Audio"),
    presets_export: [],
    assets_templates: [],
    assets_luts: ALL_LUTS,
    assets_overlays: [],
    assets_lowerthirds: byCategory("Titles"),
    assets_logos: [],
    nodes_compositing: ALL_NODE_TEMPLATES.filter((n) => n.category === "Compositing" || n.category === "Layout"),
    nodes_color: ALL_NODE_TEMPLATES.filter((n) => n.category === "Color"),
    nodes_keying: ALL_NODE_TEMPLATES.filter((n) => /key/i.test(n.name)),
    nodes_stylized: ALL_NODE_TEMPLATES.filter((n) => n.category === "Stylized"),
    nodes_social: ALL_NODE_TEMPLATES.filter((n) => n.category === "Social" || n.category === "Podcast")
  };

  if (folderId.startsWith("smart_")) {
    const allItems = buildIndexedItems(assets);
    const folder = SPX_ADVANCED_BIN_DATA.smartFolders.find((f) => f.id === folderId);
    return folder ? folder.resolver({ allItems }) : [];
  }

  return folderMap[folderId] || [];
};
