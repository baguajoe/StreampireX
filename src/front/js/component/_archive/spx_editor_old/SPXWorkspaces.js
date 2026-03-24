export const SPX_WORKSPACES = [
  {
    id: "editing",
    name: "Editing",
    layout: {
      left: ["bins", "binContent"],
      center: ["monitors"],
      right: ["inspector"],
      bottom: ["timeline"]
    }
  },
  {
    id: "color",
    name: "Color",
    layout: {
      left: ["bins"],
      center: ["monitors"],
      right: ["lutBrowser", "inspector"],
      bottom: ["timeline"]
    }
  },
  {
    id: "effects",
    name: "Effects",
    layout: {
      left: ["bins", "binContent"],
      center: ["monitors"],
      right: ["nodes", "inspector"],
      bottom: ["timeline"]
    }
  },
  {
    id: "audio",
    name: "Audio",
    layout: {
      left: ["bins"],
      center: ["monitors"],
      right: ["audioChains", "inspector"],
      bottom: ["timeline"]
    }
  }
];

export const SPX_DUAL_MONITOR_PRESETS = [
  { id: "source_program", name: "Source + Program" },
  { id: "program_large", name: "Program Large" },
  { id: "source_large", name: "Source Large" },
  { id: "stacked", name: "Stacked Monitors" }
];
