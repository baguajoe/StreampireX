const clone = (value) => JSON.parse(JSON.stringify(value));

export const findClipLocation = (tracks = [], clipId) => {
  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex += 1) {
    const track = tracks[trackIndex];
    const clipIndex = (track.clips || []).findIndex((clip) => clip.id === clipId);
    if (clipIndex !== -1) {
      return { trackIndex, clipIndex, track, clip: track.clips[clipIndex] };
    }
  }
  return null;
};

export const updateClipInTracks = (tracks = [], clipId, updater) =>
  tracks.map((track) => ({
    ...track,
    clips: (track.clips || []).map((clip) =>
      clip.id === clipId ? updater(clone(clip), track) : clip
    )
  }));

const toSafeId = (value, fallback = "item") =>
  String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const normalizeLibraryItem = (item, kind = "preset") => ({
  id: item?.id || `${kind}-${Date.now()}`,
  name: item?.name || item?.title || `${kind} ${Date.now()}`,
  category: item?.category || "General",
  source: item?.source || "SPX",
  kind,
  raw: item?.raw || item || {}
});

const ensureBaseClipState = (clip = {}) => ({
  ...clip,
  presets: Array.isArray(clip.presets) ? clip.presets : [],
  effects: Array.isArray(clip.effects) ? clip.effects : [],
  transitions: Array.isArray(clip.transitions) ? clip.transitions : [],
  colorAdjustments: clip.colorAdjustments || {
    exposure: 0,
    contrast: 0,
    saturation: 100,
    temperature: 0,
    tint: 0
  },
  transform: clip.transform || {
    x: 0,
    y: 0,
    scale: 100,
    rotation: 0,
    opacity: 100
  },
  metadata: clip.metadata || {}
});

const inferBlendMode = (item) => {
  const text = `${item?.name || ""} ${item?.category || ""}`.toLowerCase();
  if (/screen/.test(text)) return "screen";
  if (/multiply/.test(text)) return "multiply";
  if (/overlay/.test(text)) return "overlay";
  if (/soft light/.test(text)) return "soft-light";
  return "normal";
};

const applyHeuristicPresetValues = (clip, item) => {
  const next = ensureBaseClipState(clip);
  const text = `${item?.name || ""} ${item?.category || ""}`.toLowerCase();

  if (/zoom/.test(text)) next.transform.scale = Math.min(220, (next.transform.scale || 100) + 12);
  if (/fade|dissolve/.test(text)) next.transform.opacity = Math.max(15, next.transform.opacity ?? 100);
  if (/cinematic|film/.test(text)) next.colorAdjustments.contrast += 8;
  if (/vibrant|pop/.test(text)) next.colorAdjustments.saturation += 10;
  if (/warm|gold|sunset/.test(text)) next.colorAdjustments.temperature += 8;
  if (/cool|teal|blue|arctic/.test(text)) next.colorAdjustments.temperature -= 8;
  if (/contrast/.test(text)) next.colorAdjustments.contrast += 12;
  if (/saturation/.test(text)) next.colorAdjustments.saturation += 12;
  if (/exposure|bright/.test(text)) next.colorAdjustments.exposure += 0.2;
  if (/dark|night/.test(text)) next.colorAdjustments.exposure -= 0.2;

  if (/blend|overlay|screen|multiply|soft light/.test(text)) {
    next.blendMode = inferBlendMode(item);
  }

  return next;
};

export const applyPresetToClip = (tracks = [], clipId, preset) =>
  updateClipInTracks(tracks, clipId, (clip) => {
    const next = applyHeuristicPresetValues(clip, preset);
    next.presets = [
      ...next.presets,
      {
        id: preset.id || `preset-${Date.now()}`,
        name: preset.name,
        category: preset.category || "Preset",
        source: preset.source || "SPX",
        kind: preset.kind || "preset"
      }
    ];
    return next;
  });

export const applyEffectToClip = (tracks = [], clipId, effect) =>
  updateClipInTracks(tracks, clipId, (clip) => {
    const next = ensureBaseClipState(clip);
    next.effects = [
      ...next.effects,
      {
        id: effect.id || `effect-${Date.now()}`,
        name: effect.name,
        category: effect.category || "Effect",
        source: effect.source || "SPX",
        enabled: true,
        params: clone(effect.raw || {})
      }
    ];
    return next;
  });

export const applyColorToClip = (tracks = [], clipId, colorItem) =>
  updateClipInTracks(tracks, clipId, (clip) => {
    const next = applyHeuristicPresetValues(clip, colorItem);
    next.presets = [
      ...next.presets,
      {
        id: colorItem.id || `color-${Date.now()}`,
        name: colorItem.name,
        category: colorItem.category || "Color",
        source: colorItem.source || "SPX",
        kind: "color"
      }
    ];
    return next;
  });

export const applyTransitionToClip = (tracks = [], clipId, transition) => {
  const location = findClipLocation(tracks, clipId);
  if (!location) return tracks;

  const track = location.track;
  const clipIndex = location.clipIndex;
  const nextClip = (track.clips || [])[clipIndex + 1];

  return tracks.map((t) => {
    if (t.id !== track.id) return t;

    return {
      ...t,
      clips: (t.clips || []).map((clip, idx) => {
        if (idx === clipIndex) {
          const next = ensureBaseClipState(clip);
          next.transitions = [
            ...(next.transitions || []),
            {
              id: transition.id || `transition-${Date.now()}`,
              name: transition.name,
              category: transition.category || "Transition",
              source: transition.source || "SPX",
              edge: "out",
              targetClipId: nextClip?.id || null
            }
          ];
          return next;
        }

        if (nextClip && clip.id === nextClip.id) {
          const next = ensureBaseClipState(clip);
          next.transitions = [
            ...(next.transitions || []),
            {
              id: `${transition.id || "transition"}-linked-${Date.now()}`,
              name: transition.name,
              category: transition.category || "Transition",
              source: transition.source || "SPX",
              edge: "in",
              targetClipId: location.clip.id
            }
          ];
          return next;
        }

        return clip;
      })
    };
  });
};

export const updateSelectedClipProperty = (tracks = [], clipId, path = [], value) => {
  const parts = Array.isArray(path) ? path : String(path).split(".");
  return updateClipInTracks(tracks, clipId, (clip) => {
    const next = ensureBaseClipState(clip);
    let cursor = next;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      cursor[key] = cursor[key] || {};
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
    return next;
  });
};

export const removePresetFromClip = (tracks = [], clipId, presetId) =>
  updateClipInTracks(tracks, clipId, (clip) => {
    const next = ensureBaseClipState(clip);
    next.presets = (next.presets || []).filter((p) => p.id !== presetId);
    return next;
  });

export const removeEffectFromClip = (tracks = [], clipId, effectId) =>
  updateClipInTracks(tracks, clipId, (clip) => {
    const next = ensureBaseClipState(clip);
    next.effects = (next.effects || []).filter((p) => p.id !== effectId);
    return next;
  });

export const removeTransitionFromClip = (tracks = [], clipId, transitionId) =>
  updateClipInTracks(tracks, clipId, (clip) => {
    const next = ensureBaseClipState(clip);
    next.transitions = (next.transitions || []).filter((p) => p.id !== transitionId);
    return next;
  });
