import * as Step1 from "./SPXStep1Features.js";
import * as Step2 from "./SPXStep2Features.js";
import * as Step3 from "./SPXStep3Features.js";
import * as Perf from "./SPXPerformanceLayer.js";
import * as Interact from "./SPXInteractionLayer.js";

export const createLiveEditorState = () => ({
  markers: [],
  comments: [],
  savedUserPresets: [],
  versionHistory: [],
  workspaces: [],
  brandKits: [],
  performance: Perf.createPerformanceState(),
  interaction: {
    drag: Interact.createDragState(),
    trim: Interact.createTrimState(),
    panelSizes: {
      left: Interact.createPanelSize(320, 600),
      right: Interact.createPanelSize(340, 600),
      bottom: Interact.createPanelSize(1200, 260)
    }
  }
});

export const applyMarker = (state, time, label = "Marker") => ({
  ...state,
  markers: Step1.attachMarkerToTimeline(
    state.markers || [],
    Step1.createMarker({ time, label })
  )
});

export const savePreset = (state, name, settings = {}) => ({
  ...state,
  savedUserPresets: [
    ...(state.savedUserPresets || []),
    Step1.saveUserPreset({ name, settings })
  ]
});

export const createMaskForClip = (clip) => ({
  ...clip,
  masks: [...(clip.masks || []), Step2.createMask({ feather: 10, points: [] })]
});

export const createShapeForClip = (clip) => ({
  ...clip,
  shapes: [...(clip.shapes || []), Step2.createShapeLayer({})]
});

export const createWorkspace = (state, name = "Workspace") => ({
  ...state,
  workspaces: [
    ...(state.workspaces || []),
    Step3.createWorkspacePreset({
      name,
      panels: {
        left: ["bins"],
        center: ["monitors"],
        right: ["inspector"],
        bottom: ["timeline"]
      }
    })
  ]
});

export const addCommentAtTime = (state, time, text) => ({
  ...state,
  comments: [
    ...(state.comments || []),
    Step3.createTimelineComment({ time, text })
  ]
});

export const snapshotVersion = (state) => ({
  ...state,
  versionHistory: [
    ...(state.versionHistory || []),
    Step3.createVersionSnapshot({
      projectId: "local",
      state
    })
  ]
});

export const createBrandKitEntry = (state, name = "Default Brand Kit") => ({
  ...state,
  brandKits: [
    ...(state.brandKits || []),
    Step3.createBrandKit({
      name,
      colors: ["#00ffc8", "#ff6600"],
      fonts: ["Inter"]
    })
  ]
});
