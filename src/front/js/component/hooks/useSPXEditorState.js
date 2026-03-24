import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { SPX_DEFAULT_TRACKS } from "../editor/SPXTimelineConfig";
import * as Step1 from "../editor/SPXStep1Features.js";
import * as Live from "../editor/SPXLiveWiring.js";
import * as Perf from "../editor/SPXPerformanceLayer.js";
import * as Stable from "../editor/SPXStabilityLayer.js";
import * as Actions from "../editor/SPXEditorActions.js";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useSPXEditorState = () => {
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const sourceVideoRef = useRef(null);
  const programVideoRef = useRef(null);
  const undoRedoRef = useRef(Stable.createUndoRedoStack());

  const [projectName] = useState("Professional Video Project");
  const [activeTool, setActiveTool] = useState("select");
  const [activeSidebarTab, setActiveSidebarTab] = useState("project");
  const [effectSearch, setEffectSearch] = useState("");
  const [presetSearch, setPresetSearch] = useState("");
  const [transitionSearch, setTransitionSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");

  const [assets, setAssets] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedClipIds, setSelectedClipIds] = useState([]);
  const [draggedPreset, setDraggedPreset] = useState(null);
  const [draggedMedia, setDraggedMedia] = useState(null);

  const [sourceInPoint, setSourceInPoint] = useState(null);
  const [sourceOutPoint, setSourceOutPoint] = useState(null);

  const [tracks, setTracks] = useState(
    SPX_DEFAULT_TRACKS.map((t, i) => ({
      ...t,
      clips:
        i === 4 ? [{ id: uid(), name: "Main Footage", start: 0, length: 5, presets: [], effects: [], transitions: [], blendMode: "normal", sourceType: "placeholder", transform: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 }, colorAdjustments: { exposure: 0, contrast: 0, saturation: 100, temperature: 0, tint: 0 } }] :
        i === 3 ? [{ id: uid(), name: "B-Roll", start: 2, length: 3, presets: [], effects: [], transitions: [], blendMode: "normal", sourceType: "placeholder", transform: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 }, colorAdjustments: { exposure: 0, contrast: 0, saturation: 100, temperature: 0, tint: 0 } }] :
        i === 2 ? [{ id: uid(), name: "Title Overlay", start: 1, length: 2, presets: [], effects: [], transitions: [], blendMode: "screen", sourceType: "placeholder", transform: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 }, colorAdjustments: { exposure: 0, contrast: 0, saturation: 100, temperature: 0, tint: 0 } }] :
        i === 5 ? [{ id: uid(), name: "Dialogue", start: 0, length: 5, presets: [], effects: [], transitions: [], blendMode: "normal", sourceType: "placeholder", transform: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 }, colorAdjustments: { exposure: 0, contrast: 0, saturation: 100, temperature: 0, tint: 0 } }] :
        i === 6 ? [{ id: uid(), name: "Music", start: 1, length: 6, presets: [], effects: [], transitions: [], blendMode: "normal", sourceType: "placeholder", transform: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 }, colorAdjustments: { exposure: 0, contrast: 0, saturation: 100, temperature: 0, tint: 0 } }] :
        []
    }))
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(10);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [markers, setMarkers] = useState([
    Step1.createMarker({ time: 1.5, label: "Intro", color: "yellow" }),
    Step1.createMarker({ time: 4.0, label: "Cut Point", color: "cyan" })
  ]);
  const [snapModes, setSnapModes] = useState(Step1.SPX_SNAP_MODES);
  const [rippleMode, setRippleMode] = useState("none");
  const [savedUserPresets, setSavedUserPresets] = useState([]);
  const [performance, setPerformance] = useState(Perf.createPerformanceState());
  const [comments, setComments] = useState([]);
  const [versionHistory, setVersionHistory] = useState([]);
  const [brandKits, setBrandKits] = useState([]);
  const [autosaves, setAutosaves] = useState([]);

  const selectedClipLocation = useMemo(
    () => Actions.findClipLocation(tracks, selectedClipId),
    [tracks, selectedClipId]
  );

  const selectedClip = selectedClipLocation?.clip || null;
  const selectedTrack = selectedClipLocation?.track || null;

  const currentSourceAsset = useMemo(() => {
    if (!selectedClip?.assetId) return null;
    return assets.find((asset) => asset.id === selectedClip.assetId) || null;
  }, [assets, selectedClip]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const typing = ["input", "textarea", "select"].includes(tag);
      if (typing) return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) {
        e.preventDefault();
        deleteSelectedClip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipId, deleteSelectedClip]);

  

useEffect(() => {

  const handleKeyDown = (e) => {

    const tag = (document.activeElement?.tagName || "").toLowerCase()
    const typing = ["input","textarea","select"].includes(tag)

    if(typing) return

    if(e.key === "Delete" || e.key === "Backspace"){

      if(selectedClipId){

        deleteSelectedClip()

      }

    }

    if(e.key === " "){

      e.preventDefault()

      setIsPlaying(p => !p)

    }

    if(e.key === "ArrowRight"){

      setCurrentTime(t => t + 0.04)

    }

    if(e.key === "ArrowLeft"){

      setCurrentTime(t => Math.max(0, t - 0.04))

    }

  }

  window.addEventListener("keydown", handleKeyDown)

  return () => window.removeEventListener("keydown", handleKeyDown)

}, [selectedClipId, deleteSelectedClip])


const layers = useMemo(
    () =>
      tracks.flatMap((track) =>
        (track.clips || []).map((clip) => ({
          id: clip.id,
          name: clip.name,
          type: track.type,
          trackId: track.id
        }))
      ),
    [tracks]
  );

  useEffect(() => {
    return () => {
      assets.forEach((asset) => {
        if (asset.objectUrl) {
          try { URL.revokeObjectURL(asset.objectUrl); } catch (_) {}
        }
      });
    };
  }, [assets]);

  const snapshotState = useCallback(() => ({
    tracks,
    assets,
    selectedClipId,
    selectedClipIds,
    currentTime,
    markers,
    snapModes,
    rippleMode,
    savedUserPresets,
    comments
  }), [tracks, assets, selectedClipId, selectedClipIds, currentTime, markers, snapModes, rippleMode, savedUserPresets, comments]);

  const pushUndo = useCallback(() => {
    undoRedoRef.current.push(snapshotState());
  }, [snapshotState]);

  const syncMediaTime = useCallback((time) => {
    if (sourceVideoRef.current) sourceVideoRef.current.currentTime = Math.max(0, time);
    if (programVideoRef.current) programVideoRef.current.currentTime = Math.max(0, time);
    setCurrentTime(Math.max(0, time));
  }, []);

  const handleUploadMedia = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f, index) => {
      const type = (f.type || "").startsWith("video/")
        ? "video"
        : (f.type || "").startsWith("audio/")
        ? "audio"
        : (f.type || "").startsWith("image/")
        ? "image"
        : "media";

      return {
        id: `${Date.now()}-${index}`,
        name: f.name,
        type,
        mimeType: f.type || "unknown",
        duration: type === "audio" ? 5 : type === "video" ? 5 : 4,
        raw: f,
        objectUrl: URL.createObjectURL(f)
      };
    });
    setAssets((prev) => [...prev, ...mapped]);
  }, []);

  const deleteSelectedClip = useCallback(() => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: (track.clips || []).filter((clip) => clip.id !== selectedClipId)
      }))
    );
    setSelectedClipId(null);
    setSelectedClipIds([]);
  }, [pushUndo, selectedClipId]);

  const toggleTrackLock = useCallback((trackId) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, locked: !track.locked } : track
      )
    );
  }, []);

  const toggleTrackMute = useCallback((trackId) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      )
    );
  }, []);

  const toggleTrackSolo = useCallback((trackId) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, solo: !track.solo } : track
      )
    );
  }, []);

  const trimClipLeft = useCallback((clipId, delta) => {
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: (track.clips || []).map((clip) => {
          if (clip.id !== clipId) return clip;
          const nextStart = Math.max(0, clip.start + delta);
          const consumed = nextStart - clip.start;
          return {
            ...clip,
            start: nextStart,
            length: Math.max(0.25, clip.length - consumed)
          };
        })
      }))
    );
  }, []);

  const trimClipRight = useCallback((clipId, delta) => {
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: (track.clips || []).map((clip) => {
          if (clip.id !== clipId) return clip;
          return {
            ...clip,
            length: Math.max(0.25, clip.length + delta)
          };
        })
      }))
    );
  }, []);

  const unlinkSelectedClip = useCallback(() => {
    if (!selectedClipId) return;
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: (track.clips || []).map((clip) =>
          clip.id === selectedClipId ? { ...clip, linkedGroupId: null } : clip
        )
      }))
    );
  }, [selectedClipId]);

  const linkSelectedToLinkedGroup = useCallback(() => {
    if (!selectedClipId) return;
    const groupId = `link-${Date.now()}`;
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: (track.clips || []).map((clip) =>
          clip.id === selectedClipId ? { ...clip, linkedGroupId: groupId } : clip
        )
      }))
    );
  }, [selectedClipId]);

  const insertSourceToTimeline = useCallback((mode = "both") => {
    if (!currentSourceAsset) return;

    const sourceDuration = Math.max(
      0.25,
      ((sourceOutPoint ?? currentSourceAsset.duration ?? 4) - (sourceInPoint ?? 0)) || (currentSourceAsset.duration ?? 4)
    );

    setDraggedMedia({
      ...currentSourceAsset,
      duration: sourceDuration,
      insertMode: mode
    });
  }, [currentSourceAsset, sourceInPoint, sourceOutPoint]);

  const addTrack = useCallback((type = "video") => {
    pushUndo();
    setTracks((prev) => {
      const sameType = prev.filter((t) => t.type === type);
      const nextNum = sameType.length + 1;
      const id = `${type === "video" ? "v" : type === "audio" ? "a" : "t"}${nextNum}-${uid()}`;
      const name = `${type === "video" ? "V" : type === "audio" ? "A" : type[0].toUpperCase()}${nextNum}`;
      const newTrack = { id, name, type, clips: [], locked: false, muted: false, solo: false };

      if (type === "video") {
        const audioIndex = prev.findIndex((t) => t.type === "audio");
        if (audioIndex === -1) return [...prev, newTrack];
        const copy = [...prev];
        copy.splice(audioIndex, 0, newTrack);
        return copy;
      }

      return [...prev, newTrack];
    });
  }, [pushUndo]);

  const removeTrack = useCallback((trackId) => {
    pushUndo();
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    if (selectedTrack?.id === trackId) {
      setSelectedClipId(null);
      setSelectedClipIds([]);
    }
  }, [pushUndo, selectedTrack]);

  const handlePlayPause = useCallback(() => {
    const media = sourceVideoRef.current || programVideoRef.current;
    if (media) {
      if (media.paused) {
        media.play();
        if (sourceVideoRef.current && sourceVideoRef.current !== media) {
          sourceVideoRef.current.currentTime = media.currentTime;
          sourceVideoRef.current.play().catch(() => {});
        }
        if (programVideoRef.current && programVideoRef.current !== media) {
          programVideoRef.current.currentTime = media.currentTime;
          programVideoRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
      } else {
        media.pause();
        sourceVideoRef.current?.pause();
        programVideoRef.current?.pause();
        setIsPlaying(false);
      }
      return;
    }

    setIsPlaying((prev) => !prev);
  }, []);

  const handlePause = useCallback(() => {
    sourceVideoRef.current?.pause();
    programVideoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const stepTime = useCallback((delta) => {
    const media = sourceVideoRef.current || programVideoRef.current;
    if (media) {
      const next = Math.max(0, media.currentTime + delta);
      syncMediaTime(next);
      return;
    }
    setCurrentTime((prev) => Math.max(0, prev + delta));
  }, [syncMediaTime]);

  const setPlayhead = useCallback((time) => {
    syncMediaTime(time);
  }, [syncMediaTime]);

  const handleRewind = useCallback(() => {
    stepTime(-1);
  }, [stepTime]);

  const handleFastForward = useCallback(() => {
    stepTime(1);
  }, [stepTime]);

  const handleExport = useCallback(() => {
    const payload = {
      projectName,
      exportedAt: new Date().toISOString(),
      tracks,
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        duration: a.duration
      })),
      selectedClipId,
      sourceInPoint,
      sourceOutPoint
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "_").toLowerCase()}_export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [projectName, tracks, assets, selectedClipId, sourceInPoint, sourceOutPoint]);

  const markSourceIn = useCallback((time) => setSourceInPoint(time), []);
  const markSourceOut = useCallback((time) => setSourceOutPoint(time), []);
  const clearSourceIO = useCallback(() => {
    setSourceInPoint(null);
    setSourceOutPoint(null);
  }, []);

  const onDragPresetStart = useCallback((preset) => {
    setDraggedPreset(preset);
    setDraggedMedia(null);
  }, []);

  const onDragMediaStart = useCallback((asset) => {
    setDraggedMedia(asset);
    setDraggedPreset(null);
  }, []);

  const applyPresetToClip = useCallback((trackId, clipId, preset) => {
    pushUndo();
    setTracks((prev) => Actions.applyPresetToClip(prev, clipId, Actions.normalizeLibraryItem(preset, "preset")));
  }, [pushUndo]);

  const applyEffectToSelectedClip = useCallback((effect) => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) => Actions.applyEffectToClip(prev, selectedClipId, Actions.normalizeLibraryItem(effect, "effect")));
  }, [pushUndo, selectedClipId]);

  const applyPresetToSelectedClip = useCallback((preset) => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) => Actions.applyPresetToClip(prev, selectedClipId, Actions.normalizeLibraryItem(preset, "preset")));
  }, [pushUndo, selectedClipId]);

  const applyTransitionToSelectedClip = useCallback((transition) => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) => Actions.applyTransitionToClip(prev, selectedClipId, Actions.normalizeLibraryItem(transition, "transition")));
  }, [pushUndo, selectedClipId]);

  const applyColorToSelectedClip = useCallback((colorItem) => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) => Actions.applyColorToClip(prev, selectedClipId, Actions.normalizeLibraryItem(colorItem, "color")));
  }, [pushUndo, selectedClipId]);

  const onDropPresetToClip = useCallback((trackId, clipId) => {
    if (!draggedPreset) return;

    const normalized = Actions.normalizeLibraryItem(
      draggedPreset,
      draggedPreset.kind || "preset"
    );

    pushUndo();
    setTracks((prev) => {
      if (normalized.kind === "effect") return Actions.applyEffectToClip(prev, clipId, normalized);
      if (normalized.kind === "transition") return Actions.applyTransitionToClip(prev, clipId, normalized);
      if (normalized.kind === "color") return Actions.applyColorToClip(prev, clipId, normalized);
      return Actions.applyPresetToClip(prev, clipId, normalized);
    });

    setDraggedPreset(null);
    setSelectedClipId(clipId);
  }, [draggedPreset, pushUndo]);

  const onDropMediaToTrack = useCallback((trackId, laneTime = 0) => {
    if (!draggedMedia) return;

    let createdClipId = null;

    pushUndo();
    setTracks((prev) => {
      const startTime = Math.max(0, Number(laneTime || 0));
      const durationValue = draggedMedia.duration || 4;
      const mediaType = draggedMedia.type;
      const droppedTrack = prev.find((t) => t.id === trackId);

      const makeBaseClip = (overrides = {}) => ({
        id: uid(),
        name: draggedMedia.name,
        start: startTime,
        length: durationValue,
        presets: [],
        effects: [],
        transitions: [],
        blendMode: "normal",
        sourceType: mediaType,
        assetId: draggedMedia.id,
        transform: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 },
        colorAdjustments: { exposure: 0, contrast: 0, saturation: 100, temperature: 0, tint: 0 },
        linkedGroupId: overrides.linkedGroupId || null,
        mediaRole: overrides.mediaRole || (mediaType === "audio" ? "audio" : "video"),
        ...overrides
      });

      // ---------------------------------------------------------
      // VIDEO FILES AUTO-SPLIT INTO VIDEO + AUDIO IF POSSIBLE
      // ---------------------------------------------------------
      if (mediaType === "video") {
        const videoTrackId =
          droppedTrack?.type === "video"
            ? droppedTrack.id
            : (prev.find((t) => t.type === "video") || {}).id;

        const audioTrackId =
          (prev.find((t) => t.type === "audio") || {}).id;

        const linkId = `link-${uid()}`;
        const videoClip = makeBaseClip({
          linkedGroupId: linkId,
          mediaRole: "video"
        });
        const audioClip = makeBaseClip({
          linkedGroupId: linkId,
          mediaRole: "audio",
          name: `${draggedMedia.name} (Audio)`
        });

        createdClipId = videoClip.id;

        return prev.map((track) => {
          if (track.id === videoTrackId) {
            return {
              ...track,
              clips: [...(track.clips || []), videoClip]
            };
          }

          if (audioTrackId && track.id === audioTrackId) {
            return {
              ...track,
              clips: [...(track.clips || []), audioClip]
            };
          }

          return track;
        });
      }

      // ---------------------------------------------------------
      // AUDIO FILES GO TO AUDIO TRACKS
      // ---------------------------------------------------------
      if (mediaType === "audio") {
        return prev.map((track) => {
          if (track.id !== trackId) return track;
          if (track.type !== "audio") return track;

          const newClip = makeBaseClip({
            mediaRole: "audio"
          });

          createdClipId = newClip.id;

          return {
            ...track,
            clips: [...(track.clips || []), newClip]
          };
        });
      }

      // ---------------------------------------------------------
      // IMAGES GO TO VIDEO TRACKS
      // ---------------------------------------------------------
      if (mediaType === "image") {
        return prev.map((track) => {
          if (track.id !== trackId) return track;
          if (track.type !== "video") return track;

          const newClip = makeBaseClip({
            mediaRole: "video"
          });

          createdClipId = newClip.id;

          return {
            ...track,
            clips: [...(track.clips || []), newClip]
          };
        });
      }

      return prev;
    });

    setDraggedMedia(null);
    if (createdClipId) setSelectedClipId(createdClipId);
  }, [draggedMedia, pushUndo]);

  const toggleClipSelection = useCallback((clipId) => {
    setSelectedClipIds((prev) => Step1.toggleClipSelection(prev, clipId));
    setSelectedClipId(clipId);
  }, []);

  const clearSelectedClip = useCallback(() => {
    setSelectedClipId(null);
    setSelectedClipIds([]);
  }, []);

  const updateSelectedClipProperty = useCallback((path, value) => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) => Actions.updateSelectedClipProperty(prev, selectedClipId, path, value));
  }, [pushUndo, selectedClipId]);

  const removePresetFromSelectedClip = useCallback((presetId) => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) => Actions.removePresetFromClip(prev, selectedClipId, presetId));
  }, [pushUndo, selectedClipId]);

  const removeEffectFromSelectedClip = useCallback((effectId) => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) => Actions.removeEffectFromClip(prev, selectedClipId, effectId));
  }, [pushUndo, selectedClipId]);

  const removeTransitionFromSelectedClip = useCallback((transitionId) => {
    if (!selectedClipId) return;
    pushUndo();
    setTracks((prev) => Actions.removeTransitionFromClip(prev, selectedClipId, transitionId));
  }, [pushUndo, selectedClipId]);

  const addMarkerAtPlayhead = useCallback(() => {
    setMarkers((prev) =>
      Step1.attachMarkerToTimeline(
        prev,
        Step1.createMarker({ time: currentTime, label: `Marker ${prev.length + 1}`, color: "yellow" })
      )
    );
  }, [currentTime]);

  const saveCurrentPreset = useCallback((name = "Custom Preset") => {
    const preset = Step1.saveUserPreset({
      name,
      category: "Custom",
      source: "User",
      settings: { selectedClipId, rippleMode, snapModes }
    });
    setSavedUserPresets((prev) => [...prev, preset]);
  }, [selectedClipId, rippleMode, snapModes]);

  const addCommentAtPlayhead = useCallback((text = "Note") => {
    setComments((prev) => [...prev, Live.addCommentAtTime({ comments: prev }, currentTime, text).comments.slice(-1)[0]]);
  }, [currentTime]);

  const saveVersion = useCallback(() => {
    setVersionHistory((prev) => [...prev, Live.snapshotVersion(snapshotState()).versionHistory.slice(-1)[0]]);
  }, [snapshotState]);

  const createBrandKit = useCallback(() => {
    setBrandKits((prev) => [...prev, Live.createBrandKitEntry({ brandKits: prev }, "Default Brand Kit").brandKits.slice(-1)[0]]);
  }, []);

  const autosaveProject = useCallback(() => {
    setAutosaves((prev) => [...prev, Stable.createAutosaveEntry(snapshotState())]);
  }, [snapshotState]);

  return {
    canvasRef,
    previewRef,
    sourceVideoRef,
    programVideoRef,
    projectName,
    activeTool,
    setActiveTool,
    activeSidebarTab,
    setActiveSidebarTab,
    effectSearch,
    setEffectSearch,
    presetSearch,
    setPresetSearch,
    transitionSearch,
    setTransitionSearch,
    colorSearch,
    setColorSearch,
    assets,
    setAssets,
    layers,
    selectedClipId,
    setSelectedClipId,
    selectedClipIds,
    selectedClip,
    selectedTrack,
    currentSourceAsset,
    sourceInPoint,
    sourceOutPoint,
    markSourceIn,
    markSourceOut,
    clearSourceIO,
    tracks,
    setTracks,
    currentTime,
    duration,
    zoomLevel,
    setZoomLevel,
    isPlaying,
    markers,
    snapModes,
    setSnapModes,
    rippleMode,
    setRippleMode,
    savedUserPresets,
    comments,
    versionHistory,
    brandKits,
    autosaves,
    performance,
    setPerformance,
    handleUploadMedia,
    addTrack,
    removeTrack,
    deleteSelectedClip,
    toggleTrackLock,
    toggleTrackMute,
    toggleTrackSolo,
    trimClipLeft,
    trimClipRight,
    unlinkSelectedClip,
    linkSelectedToLinkedGroup,
    insertSourceToTimeline,
    handlePlayPause,
    handlePause,
    handleRewind,
    handleFastForward,
    handleExport,
    stepTime,
    setPlayhead,
    onDragPresetStart,
    onDragMediaStart,
    onDropPresetToClip,
    onDropMediaToTrack,
    toggleClipSelection,
    clearSelectedClip,
    updateSelectedClipProperty,
    applyPresetToSelectedClip,
    applyEffectToSelectedClip,
    applyTransitionToSelectedClip,
    applyColorToSelectedClip,
    removePresetFromSelectedClip,
    removeEffectFromSelectedClip,
    removeTransitionFromSelectedClip,
    addMarkerAtPlayhead,
    saveCurrentPreset,
    addCommentAtPlayhead,
    saveVersion,
    createBrandKit,
    autosaveProject
  };
};
