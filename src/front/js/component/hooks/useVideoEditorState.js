// src/front/js/component/hooks/useVideoEditorState.js
// =====================================================
// VIDEO EDITOR STATE MANAGEMENT HOOKS
// Full navbar functionality support
// =====================================================

import { useState, useCallback, useRef, useEffect } from 'react';

const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Get auth headers helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};


// =====================================================
// UNDO/REDO HOOK
// =====================================================

export const useUndoRedo = (initialState, maxHistory = 50) => {
  const [state, setStateInternal] = useState(initialState);
  const [history, setHistory] = useState([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoAction = useRef(false);

  const setState = useCallback((newState) => {
    // Don't add to history if this is an undo/redo action
    if (isUndoRedoAction.current) {
      setStateInternal(newState);
      return;
    }

    const actualNewState = typeof newState === 'function' ? newState(state) : newState;
    
    setHistory(prev => {
      // Remove any future states if we're in the middle of history
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(JSON.parse(JSON.stringify(actualNewState)));
      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, maxHistory - 1));
    setStateInternal(actualNewState);
  }, [state, historyIndex, maxHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setStateInternal(JSON.parse(JSON.stringify(history[newIndex])));
      setTimeout(() => { isUndoRedoAction.current = false; }, 0);
      return true;
    }
    return false;
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setStateInternal(JSON.parse(JSON.stringify(history[newIndex])));
      setTimeout(() => { isUndoRedoAction.current = false; }, 0);
      return true;
    }
    return false;
  }, [history, historyIndex]);

  const clearHistory = useCallback(() => {
    setHistory([state]);
    setHistoryIndex(0);
  }, [state]);

  const pushState = useCallback((newState) => {
    setState(newState);
  }, [setState]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    clearHistory,
    pushState,
    historyLength: history.length,
    historyIndex
  };
};


// =====================================================
// CLIPBOARD HOOK
// =====================================================

export const useClipboard = () => {
  const [clipboardData, setClipboardData] = useState(null);
  const [clipboardType, setClipboardType] = useState(null); // 'clip' | 'transition' | 'effect'

  const copy = useCallback((data, type = 'clip') => {
    // Deep clone to prevent mutations
    const clonedData = JSON.parse(JSON.stringify(data));
    setClipboardData(clonedData);
    setClipboardType(type);
    console.log(`📋 Copied ${type}:`, clonedData.title || clonedData.id);
    return clonedData;
  }, []);

  const cut = useCallback((data, type = 'clip') => {
    const clonedData = JSON.parse(JSON.stringify(data));
    clonedData._isCut = true; // Mark as cut for deletion after paste
    setClipboardData(clonedData);
    setClipboardType(type);
    console.log(`✂️ Cut ${type}:`, clonedData.title || clonedData.id);
    return clonedData;
  }, []);

  const paste = useCallback((offsetTime = 0) => {
    if (!clipboardData) return null;
    
    // Deep clone and create new ID
    const pastedData = JSON.parse(JSON.stringify(clipboardData));
    pastedData.id = Date.now() + Math.random();
    
    // Offset time if it's a clip
    if (clipboardType === 'clip' && offsetTime !== undefined) {
      pastedData.startTime = offsetTime;
    }
    
    const wasCut = pastedData._isCut;
    delete pastedData._isCut;
    
    // Clear clipboard if it was a cut
    if (wasCut) {
      setClipboardData(null);
      setClipboardType(null);
    }
    
    console.log(`📋 Pasted ${clipboardType}:`, pastedData.title || pastedData.id);
    return { data: pastedData, type: clipboardType, wasCut };
  }, [clipboardData, clipboardType]);

  const clear = useCallback(() => {
    setClipboardData(null);
    setClipboardType(null);
  }, []);

  return {
    copy,
    cut,
    paste,
    clear,
    hasData: clipboardData !== null,
    clipboardType,
    clipboardData
  };
};


// =====================================================
// MARKERS HOOK
// =====================================================

export const useMarkers = (projectId) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMarkers = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${backendURL}/api/video-editor/projects/${projectId}/markers`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        setMarkers(data.markers || []);
      }
    } catch (error) {
      console.error('Error loading markers:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const addMarker = useCallback(async (time, label = '', color = '#ff6b6b', comment = '') => {
    const newMarker = {
      id: Date.now(),
      time,
      label: label || `Marker at ${formatTime(time)}`,
      color,
      comment,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));

    if (projectId) {
      try {
        await fetch(
          `${backendURL}/api/video-editor/projects/${projectId}/markers`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(newMarker)
          }
        );
      } catch (error) {
        console.error('Error saving marker:', error);
      }
    }

    console.log(`🚩 Added marker at ${formatTime(time)}`);
    return newMarker;
  }, [projectId]);

  const deleteMarker = useCallback(async (markerId) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId));

    if (projectId) {
      try {
        await fetch(
          `${backendURL}/api/video-editor/projects/${projectId}/markers/${markerId}`,
          { method: 'DELETE', headers: getAuthHeaders() }
        );
      } catch (error) {
        console.error('Error deleting marker:', error);
      }
    }

    console.log(`🚩 Deleted marker ${markerId}`);
  }, [projectId]);

  const clearAllMarkers = useCallback(async () => {
    setMarkers([]);

    if (projectId) {
      try {
        await fetch(
          `${backendURL}/api/video-editor/projects/${projectId}/markers/clear`,
          { method: 'DELETE', headers: getAuthHeaders() }
        );
      } catch (error) {
        console.error('Error clearing markers:', error);
      }
    }

    console.log('🚩 Cleared all markers');
  }, [projectId]);

  const goToNextMarker = useCallback((currentTime) => {
    const nextMarker = markers.find(m => m.time > currentTime + 0.1);
    return nextMarker ? nextMarker.time : null;
  }, [markers]);

  const goToPreviousMarker = useCallback((currentTime) => {
    const prevMarkers = markers.filter(m => m.time < currentTime - 0.1);
    return prevMarkers.length > 0 ? prevMarkers[prevMarkers.length - 1].time : null;
  }, [markers]);

  const updateMarker = useCallback((markerId, updates) => {
    setMarkers(prev => prev.map(m => 
      m.id === markerId ? { ...m, ...updates } : m
    ));
  }, []);

  // Load markers when project changes
  useEffect(() => {
    if (projectId) {
      loadMarkers();
    }
  }, [projectId, loadMarkers]);

  return {
    markers,
    loading,
    loadMarkers,
    addMarker,
    deleteMarker,
    clearAllMarkers,
    goToNextMarker,
    goToPreviousMarker,
    updateMarker
  };
};


// =====================================================
// PROJECT MANAGER HOOK
// =====================================================

export const useProjectManager = () => {
  const [currentProject, setCurrentProject] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const autoSaveTimerRef = useRef(null);

  const createProject = useCallback(async (projectData = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${backendURL}/api/video-editor/projects`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: projectData.title || 'Untitled Project',
            description: projectData.description || '',
            resolution: projectData.resolution || { width: 1920, height: 1080 },
            frameRate: projectData.frameRate || 30,
            duration: projectData.duration || 300,
            timeline: projectData.timeline || { tracks: [] }
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setCurrentProject(data.project);
        console.log('✅ Created project:', data.project.title);
        return data.project;
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error creating project:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${backendURL}/api/video-editor/projects/${projectId}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        setCurrentProject(data.project);
        console.log('✅ Loaded project:', data.project.title);
        return data.project;
      } else {
        throw new Error(data.error || 'Failed to load project');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading project:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProject = useCallback(async (projectData) => {
    if (!currentProject?.id && !projectData?.id) {
      // No existing project, create new one
      return createProject(projectData);
    }

    setSaving(true);
    setError(null);
    try {
      const projectId = projectData?.id || currentProject.id;
      const response = await fetch(
        `${backendURL}/api/video-editor/projects/${projectId}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(projectData)
        }
      );
      const data = await response.json();
      if (data.success) {
        setCurrentProject(data.project);
        console.log('✅ Saved project at', data.saved_at);
        return data.project;
      } else {
        throw new Error(data.error || 'Failed to save project');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error saving project:', err);
      return null;
    } finally {
      setSaving(false);
    }
  }, [currentProject, createProject]);

  const saveProjectAs = useCallback(async (newTitle) => {
    if (!currentProject?.id) {
      return createProject({ title: newTitle });
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${backendURL}/api/video-editor/projects/${currentProject.id}/duplicate`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title: newTitle })
        }
      );
      const data = await response.json();
      if (data.success) {
        setCurrentProject(data.project);
        console.log('✅ Saved project as:', data.project.title);
        return data.project;
      } else {
        throw new Error(data.error || 'Failed to duplicate project');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error saving project as:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentProject, createProject]);

  const deleteProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${backendURL}/api/video-editor/projects/${projectId}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        if (currentProject?.id === projectId) {
          setCurrentProject(null);
        }
        console.log('✅ Deleted project:', projectId);
        return true;
      } else {
        throw new Error(data.error || 'Failed to delete project');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting project:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const loadRecentProjects = useCallback(async (limit = 10) => {
    try {
      const response = await fetch(
        `${backendURL}/api/video-editor/recent-projects?limit=${limit}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        setRecentProjects(data.projects);
        return data.projects;
      }
    } catch (err) {
      console.error('Error loading recent projects:', err);
    }
    return [];
  }, []);

  const getAllProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${backendURL}/api/video-editor/projects`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        return data.projects;
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
    return [];
  }, []);

  const enableAutoSave = useCallback((getTimelineData, intervalMs = 30000) => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setInterval(async () => {
      if (currentProject?.id) {
        try {
          const timeline = getTimelineData();
          await fetch(
            `${backendURL}/api/video-editor/projects/${currentProject.id}/autosave`,
            {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ timeline })
            }
          );
          console.log('💾 Auto-saved at', new Date().toLocaleTimeString());
        } catch (err) {
          console.error('Auto-save error:', err);
        }
      }
    }, intervalMs);

    console.log(`⏱️ Auto-save enabled (every ${intervalMs / 1000}s)`);
  }, [currentProject]);

  const disableAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      console.log('⏱️ Auto-save disabled');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    currentProject,
    setCurrentProject,
    recentProjects,
    loading,
    saving,
    error,
    createProject,
    loadProject,
    saveProject,
    saveProjectAs,
    deleteProject,
    loadRecentProjects,
    getAllProjects,
    enableAutoSave,
    disableAutoSave
  };
};


// =====================================================
// CLIP OPERATIONS HOOK
// =====================================================

export const useClipOperations = () => {
  const splitClip = useCallback((clip, splitTime) => {
    if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
      console.warn('Split time must be within clip bounds');
      return null;
    }

    const splitPoint = splitTime - clip.startTime;
    
    const firstClip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: Date.now(),
      duration: splitPoint,
      outPoint: (clip.inPoint || 0) + splitPoint
    };

    const secondClip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: Date.now() + 1,
      startTime: splitTime,
      duration: clip.duration - splitPoint,
      inPoint: (clip.inPoint || 0) + splitPoint
    };

    console.log(`✂️ Split clip "${clip.title}" at ${formatTime(splitTime)}`);
    return { firstClip, secondClip };
  }, []);

  const trimClip = useCallback((clip, inPoint, outPoint) => {
    const newDuration = outPoint - inPoint;
    
    return {
      ...clip,
      inPoint,
      outPoint,
      duration: newDuration
    };
  }, []);

  const changeSpeed = useCallback((clip, speed) => {
    if (speed <= 0 || speed > 10) {
      console.warn('Speed must be between 0.1 and 10');
      return clip;
    }

    const originalDuration = clip.originalDuration || clip.duration;
    const newDuration = originalDuration / speed;

    return {
      ...clip,
      speed,
      duration: newDuration,
      originalDuration
    };
  }, []);

  const reverseClip = useCallback((clip) => {
    return {
      ...clip,
      reversed: !clip.reversed
    };
  }, []);

  const duplicateClip = useCallback((clip, offset = 0) => {
    return {
      ...JSON.parse(JSON.stringify(clip)),
      id: Date.now(),
      startTime: clip.startTime + clip.duration + offset
    };
  }, []);

  return {
    splitClip,
    trimClip,
    changeSpeed,
    reverseClip,
    duplicateClip
  };
};


// =====================================================
// SELECTION HOOK
// =====================================================

export const useSelection = () => {
  const [selectedClips, setSelectedClips] = useState([]);
  const [selectedTransitions, setSelectedTransitions] = useState([]);

  const selectClip = useCallback((clip, addToSelection = false) => {
    if (addToSelection) {
      setSelectedClips(prev => {
        const exists = prev.some(c => c.id === clip.id);
        if (exists) {
          return prev.filter(c => c.id !== clip.id);
        }
        return [...prev, clip];
      });
    } else {
      setSelectedClips([clip]);
    }
    setSelectedTransitions([]);
  }, []);

  const selectTransition = useCallback((transition, addToSelection = false) => {
    if (addToSelection) {
      setSelectedTransitions(prev => {
        const exists = prev.some(t => t.id === transition.id);
        if (exists) {
          return prev.filter(t => t.id !== transition.id);
        }
        return [...prev, transition];
      });
    } else {
      setSelectedTransitions([transition]);
    }
    setSelectedClips([]);
  }, []);

  const selectAll = useCallback((tracks) => {
    const allClips = tracks.flatMap(track => track.clips);
    setSelectedClips(allClips);
    console.log(`📌 Selected ${allClips.length} clips`);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedClips([]);
    setSelectedTransitions([]);
    console.log('📌 Deselected all');
  }, []);

  const isClipSelected = useCallback((clipId) => {
    return selectedClips.some(c => c.id === clipId);
  }, [selectedClips]);

  const isTransitionSelected = useCallback((transitionId) => {
    return selectedTransitions.some(t => t.id === transitionId);
  }, [selectedTransitions]);

  return {
    selectedClips,
    selectedTransitions,
    selectClip,
    selectTransition,
    selectAll,
    deselectAll,
    isClipSelected,
    isTransitionSelected,
    hasSelection: selectedClips.length > 0 || selectedTransitions.length > 0
  };
};


// =====================================================
// KEYBOARD SHORTCUTS HOOK
// =====================================================

export const useKeyboardShortcuts = (handlers) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // File Operations
      if (ctrl && key === 'n' && !shift) {
        e.preventDefault();
        handlers.onNewProject?.();
      }
      if (ctrl && key === 'o' && !shift) {
        e.preventDefault();
        handlers.onOpenProject?.();
      }
      if (ctrl && key === 's' && !shift) {
        e.preventDefault();
        handlers.onSave?.();
      }
      if (ctrl && shift && key === 's') {
        e.preventDefault();
        handlers.onSaveAs?.();
      }
      if (ctrl && key === 'e') {
        e.preventDefault();
        handlers.onExport?.();
      }
      if (ctrl && key === 'i' && !shift) {
        e.preventDefault();
        handlers.onImport?.();
      }

      // Edit Operations
      if (ctrl && key === 'z' && !shift) {
        e.preventDefault();
        handlers.onUndo?.();
      }
      if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) {
        e.preventDefault();
        handlers.onRedo?.();
      }
      if (ctrl && key === 'x') {
        e.preventDefault();
        handlers.onCut?.();
      }
      if (ctrl && key === 'c') {
        e.preventDefault();
        handlers.onCopy?.();
      }
      if (ctrl && key === 'v') {
        e.preventDefault();
        handlers.onPaste?.();
      }
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        handlers.onDelete?.();
      }
      if (ctrl && key === 'a' && !shift) {
        e.preventDefault();
        handlers.onSelectAll?.();
      }
      if (ctrl && shift && key === 'a') {
        e.preventDefault();
        handlers.onDeselectAll?.();
      }

      // Playback
      if (key === ' ') {
        e.preventDefault();
        handlers.onPlayPause?.();
      }
      if (key === 'home') {
        e.preventDefault();
        handlers.onGoToStart?.();
      }
      if (key === 'end') {
        e.preventDefault();
        handlers.onGoToEnd?.();
      }
      if (key === 'arrowleft' && !shift) {
        e.preventDefault();
        handlers.onFrameBack?.();
      }
      if (key === 'arrowright' && !shift) {
        e.preventDefault();
        handlers.onFrameForward?.();
      }
      if (shift && key === 'arrowleft') {
        e.preventDefault();
        handlers.onJumpBack?.();
      }
      if (shift && key === 'arrowright') {
        e.preventDefault();
        handlers.onJumpForward?.();
      }

      // Markers
      if (key === 'm' && !ctrl && !shift) {
        e.preventDefault();
        handlers.onAddMarker?.();
      }
      if (shift && key === 'm' && !ctrl) {
        e.preventDefault();
        handlers.onNextMarker?.();
      }
      if (ctrl && shift && key === 'm') {
        e.preventDefault();
        handlers.onPrevMarker?.();
      }

      // Clip Operations
      if (ctrl && key === 'k') {
        e.preventDefault();
        handlers.onSplitClip?.();
      }
      if (key === 'q' && !ctrl) {
        e.preventDefault();
        handlers.onTrimIn?.();
      }
      if (key === 'w' && !ctrl) {
        e.preventDefault();
        handlers.onTrimOut?.();
      }
      if (ctrl && key === 'd') {
        e.preventDefault();
        handlers.onApplyTransition?.();
      }

      // View
      if (key === '=' || key === '+') {
        e.preventDefault();
        handlers.onZoomIn?.();
      }
      if (key === '-') {
        e.preventDefault();
        handlers.onZoomOut?.();
      }
      if (key === '\\') {
        e.preventDefault();
        handlers.onFitToWindow?.();
      }
      if (key === '`') {
        e.preventDefault();
        handlers.onFullScreen?.();
      }

      // Help
      if (ctrl && key === '/') {
        e.preventDefault();
        handlers.onShowShortcuts?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};


// =====================================================
// HELPER FUNCTIONS
// =====================================================

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};


// =====================================================
// EXPORT ALL
// =====================================================

export default {
  useUndoRedo,
  useClipboard,
  useMarkers,
  useProjectManager,
  useClipOperations,
  useSelection,
  useKeyboardShortcuts
};