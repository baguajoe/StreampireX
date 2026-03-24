export const createAutosaveEntry = (project) => ({
  id: `autosave_${Date.now()}`,
  project,
  savedAt: new Date().toISOString()
});

export const createUndoRedoStack = () => ({
  undo: [],
  redo: [],
  push(state) {
    this.undo.push(JSON.parse(JSON.stringify(state)));
    this.redo = [];
  },
  undoState(current) {
    if (!this.undo.length) return current;
    const prev = this.undo.pop();
    this.redo.push(JSON.parse(JSON.stringify(current)));
    return prev;
  },
  redoState(current) {
    if (!this.redo.length) return current;
    const next = this.redo.pop();
    this.undo.push(JSON.parse(JSON.stringify(current)));
    return next;
  }
});

export const createCrashRecoveryPayload = (projectState) => ({
  id: `recovery_${Date.now()}`,
  projectState,
  createdAt: new Date().toISOString()
});

export const validateProjectSchema = (project) => {
  const errors = [];
  if (!project) errors.push("Project missing");
  if (project && !Array.isArray(project.timeline || [])) errors.push("Timeline must be an array");
  if (project && !Array.isArray(project.assets || [])) errors.push("Assets must be an array");
  return {
    valid: errors.length === 0,
    errors
  };
};

export const createMissingAssetReport = (assets = []) => {
  return assets
    .filter((asset) => asset && asset.missing)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      reason: "missing asset"
    }));
};

export const createRenderFailureReport = (job, error) => ({
  id: `render_fail_${Date.now()}`,
  jobId: job?.id || "unknown",
  error: String(error || "Unknown error"),
  createdAt: new Date().toISOString()
});

export const exportProjectPackage = (project) => ({
  fileName: `${project?.name || "spx_project"}.json`,
  payload: JSON.stringify(project, null, 2)
});

export const importProjectPackage = (jsonText) => {
  try {
    return { ok: true, data: JSON.parse(jsonText) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
};
