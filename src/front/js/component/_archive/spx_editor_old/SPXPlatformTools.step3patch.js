import * as Step3 from "./SPXStep3Features.js";

export const createProjectSave = (editorState) => {
  return Step3.createCloudProjectPayload({
    name: "SPX Project",
    timeline: editorState.tracks || [],
    assets: editorState.assets || [],
    presets: editorState.savedUserPresets || [],
    comments: editorState.comments || []
  });
};

export const createVersion = (editorState) => {
  return Step3.createVersionSnapshot({
    projectId: "local",
    state: editorState
  });
};

export const addComment = (time, text, author = "User") => {
  return Step3.createTimelineComment({
    time,
    text,
    author
  });
};

export const createBrandKit = () => {
  return Step3.createBrandKit({
    name: "Default Brand",
    colors: ["#00ffc8", "#ff6600"],
    fonts: ["Inter", "Montserrat"]
  });
};

export const performanceSnapshot = () => {
  return Step3.createPerformanceSnapshot({
    fps: 60,
    memoryMB: 512,
    renderQueue: 0,
    gpuUsage: 35
  });
};

export const defaultCaptionStyle = () => {
  return Step3.createCaptionStyle({
    name: "SPX Default Captions"
  });
};

export const defaultWorkspacePreset = () => {
  return Step3.createWorkspacePreset({
    name: "SPX Editing Workspace",
    panels: {
      left: ["bins", "binContent"],
      center: ["monitors"],
      right: ["inspector"],
      bottom: ["timeline"]
    }
  });
};

export const defaultMarketplacePreset = () => {
  return Step3.createMarketplacePreset({
    name: "Cinematic Warm Pack",
    category: "Color",
    price: 19,
    author: "SPX"
  });
};

export const defaultMarketplaceTemplate = () => {
  return Step3.createMarketplaceTemplate({
    name: "Podcast Intro Template",
    type: "Template",
    price: 29,
    author: "SPX"
  });
};

export const defaultShortcuts = Step3.SPX_DEFAULT_SHORTCUTS;
