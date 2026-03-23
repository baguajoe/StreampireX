import { useState, useRef, useCallback } from "react";
import { SPX_DEFAULT_TRACKS } from "../editor/SPXTimelineConfig";
import * as Step1 from "../editor/SPXStep1Features.js";
import * as Live from "../editor/SPXLiveWiring.js";
import * as Perf from "../editor/SPXPerformanceLayer.js";
import * as Stable from "../editor/SPXStabilityLayer.js";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useSPXEditorState = () => {
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const undoRedoRef = useRef(Stable.createUndoRedoStack());

  const [projectName] = useState("Professional Video Project");
  const [activeTool, setActiveTool] = useState("select");
  const [assets, setAssets] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedClipIds, setSelectedClipIds] = useState([]);
  const [draggedPreset, setDraggedPreset] = useState(null);

  const [tracks, setTracks] = useState([
    ...SPX_DEFAULT_TRACKS.map((t, i) => ({
      ...t,
      clips:
        i === 4 ? [{ id: uid(), name: "Main Footage", start: 0, length: 5, presets: [], blendMode: "normal" }] :
        i === 3 ? [{ id: uid(), name: "B-Roll", start: 2, length: 3, presets: [], blendMode: "normal" }] :
        i === 2 ? [{ id: uid(), name: "Title Overlay", start: 1, length: 2, presets: [], blendMode: "normal" }] :
        i === 5 ? [{ id: uid(), name: "Dialogue", start: 0, length: 5, presets: [], blendMode: "normal" }] :
        i === 6 ? [{ id: uid(), name: "Music", start: 1, length: 6, presets: [], blendMode: "normal" }] :
        []
    }))
  ]);

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

  const handleUploadMedia = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f, index) => ({
      id: `${Date.now()}-${index}`,
      name: f.name,
      type: f.type || "unknown",
      duration: 0,
      raw: f
    }));
    setAssets((prev) => [...prev, ...mapped]);
  }, []);

  const addTrack = useCallback((type = "video") => {
    pushUndo();
    setTracks((prev) => {
      const sameType = prev.filter((t) => t.type === type);
      const nextNum = sameType.length + 1;
      const id = `${type === "video" ? "v" : type === "audio" ? "a" : "t"}${nextNum}-${uid()}`;
      const name = `${type === "video" ? "V" : type === "audio" ? "A" : type[0].toUpperCase()}${nextNum}`;
      const newTrack = { id, name, type, clips: [] };
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
  }, [pushUndo]);

  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);
  const stepTime = useCallback((delta) => setCurrentTime((prev) => Math.max(0, prev + delta)), []);
  const setPlayhead = useCallback((time) => setCurrentTime(Math.max(0, time)), []);

  const onDragPresetStart = useCallback((preset) => setDraggedPreset(preset), []);

  const applyPresetToClip = useCallback((trackId, clipId, preset) => {
    pushUndo();
    setTracks((prev) =>
      prev.map((track) =>
        track.id !== trackId
          ? track
          : {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id !== clipId
                  ? clip
                  : { ...clip, presets: [...(clip.presets || []), preset] }
              )
            }
      )
    );
  }, [pushUndo]);

  const onDropPresetToClip = useCallback((trackId, clipId) => {
    if (!draggedPreset) return;
    applyPresetToClip(trackId, clipId, draggedPreset);
    setDraggedPreset(null);
  }, [draggedPreset, applyPresetToClip]);

  const toggleClipSelection = useCallback((clipId) => {
    setSelectedClipIds((prev) => Step1.toggleClipSelection(prev, clipId));
    setSelectedClipId(clipId);
  }, []);

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

  const undoAction = useCallback(() => {
    const current = snapshotState()
    const prev = undoRedoRef.current.undoState(current)
    setTracks(prev.tracks || [])
    setAssets(prev.assets || [])
    setSelectedClipId(prev.selectedClipId || null)
    setSelectedClipIds(prev.selectedClipIds || [])
    setCurrentTime(prev.currentTime || 0)
    setMarkers(prev.markers || [])
    setComments(prev.comments || [])
  }, [snapshotState]);

  const redoAction = useCallback(() => {
    const current = snapshotState()
    const next = undoRedoRef.current.redoState(current)
    setTracks(next.tracks || [])
    setAssets(next.assets || [])
    setSelectedClipId(next.selectedClipId || null)
    setSelectedClipIds(next.selectedClipIds || [])
    setCurrentTime(next.currentTime || 0)
    setMarkers(next.markers || [])
    setComments(next.comments || [])
  }, [snapshotState]);

  return {
    canvasRef,
    previewRef,
    projectName,
    activeTool,
    setActiveTool,
    assets,
    setAssets,
    selectedClipId,
    setSelectedClipId,
    selectedClipIds,
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
    togglePlay,
    stepTime,
    setPlayhead,
    onDragPresetStart,
    onDropPresetToClip,
    toggleClipSelection,
    addMarkerAtPlayhead,
    saveCurrentPreset,
    addCommentAtPlayhead,
    saveVersion,
    createBrandKit,
    autosaveProject,
    undoAction,
    redoAction,
    pushUndo
  };
};
