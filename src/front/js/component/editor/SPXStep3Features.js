export const createCaptionStyle = ({
  id,
  name = "Default Captions",
  fontFamily = "Inter",
  fontSize = 42,
  color = "#ffffff",
  stroke = "#000000",
  strokeWidth = 2,
  background = "transparent",
  animationPreset = "fade_up"
} = {}) => ({
  id: id || `caption_${Date.now()}`,
  name,
  fontFamily,
  fontSize,
  color,
  stroke,
  strokeWidth,
  background,
  animationPreset
});

export const createVersionSnapshot = ({
  id,
  projectId,
  label = "Auto Save",
  state = {}
} = {}) => ({
  id: id || `version_${Date.now()}`,
  projectId,
  label,
  state,
  createdAt: new Date().toISOString()
});

export const createTimelineComment = ({
  id,
  time = 0,
  text = "",
  author = "User"
} = {}) => ({
  id: id || `comment_${Date.now()}`,
  time,
  text,
  author,
  createdAt: new Date().toISOString()
});

export const createCloudProjectPayload = ({
  id,
  name = "Untitled Project",
  timeline = [],
  assets = [],
  presets = [],
  comments = []
} = {}) => ({
  id: id || `project_${Date.now()}`,
  name,
  timeline,
  assets,
  presets,
  comments,
  savedAt: new Date().toISOString()
});

export const createMarketplacePreset = ({
  id,
  name,
  category = "Preset",
  price = 0,
  author = "SPX Creator",
  tags = []
} = {}) => ({
  id: id || `market_preset_${Date.now()}`,
  name,
  category,
  price,
  author,
  tags
});

export const createMarketplaceTemplate = ({
  id,
  name,
  type = "Template",
  price = 0,
  author = "SPX Creator",
  tags = []
} = {}) => ({
  id: id || `market_template_${Date.now()}`,
  name,
  type,
  price,
  author,
  tags
});

export const createBrandKit = ({
  id,
  name = "Brand Kit",
  logo = "",
  colors = [],
  fonts = [],
  introMusic = ""
} = {}) => ({
  id: id || `brandkit_${Date.now()}`,
  name,
  logo,
  colors,
  fonts,
  introMusic
});

export const SPX_DEFAULT_SHORTCUTS = {
  playPause: "Space",
  splitClip: "Ctrl+K",
  rippleDelete: "Shift+Delete",
  saveProject: "Ctrl+S",
  undo: "Ctrl+Z",
  redo: "Ctrl+Shift+Z"
};

export const createWorkspacePreset = ({
  id,
  name = "Custom Workspace",
  panels = {}
} = {}) => ({
  id: id || `workspace_${Date.now()}`,
  name,
  panels
});

export const createPerformanceSnapshot = ({
  fps = 60,
  memoryMB = 0,
  renderQueue = 0,
  gpuUsage = 0
} = {}) => ({
  fps,
  memoryMB,
  renderQueue,
  gpuUsage,
  timestamp: new Date().toISOString()
});
