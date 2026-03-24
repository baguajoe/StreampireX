export const SPX_MEDIA_BIN_SECTIONS = [
  {
    id: "project_bin",
    name: "Project",
    tabs: ["Media", "Sequences", "Titles", "Adjustment Layers"]
  },
  {
    id: "effects_bin",
    name: "Effects",
    tabs: ["Video FX", "Audio FX", "Transitions", "Generators"]
  },
  {
    id: "presets_bin",
    name: "Presets",
    tabs: ["Motion", "Color", "Text", "Audio", "Export"]
  },
  {
    id: "assets_bin",
    name: "Assets",
    tabs: ["Images", "Video", "Audio", "Graphics", "Templates"]
  }
];

export const SPX_MEDIA_BIN_COLUMNS = [
  "Name",
  "Type",
  "Duration",
  "FPS",
  "Resolution",
  "Date Added",
  "Tags"
];

console.log("SPX media bin sections:", SPX_MEDIA_BIN_SECTIONS.length);
