// =============================================================================
// useSamplerStorage.js — Cloud Storage Hook for SamplerBeatMaker
// =============================================================================
// Location: src/front/js/component/useSamplerStorage.js
//
// Provides: save, load, auto-save, share, fork, kit management
// Connects to: /api/sampler/* endpoints (sampler_storage_routes.py)
// =============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const authHeaders = (json = true) => {
  const h = { Authorization: `Bearer ${getToken()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const useSamplerStorage = ({ engine, onStatus }) => {
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('Untitled Beat');
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareInfo, setShareInfo] = useState(null);
  const [kits, setKits] = useState([]);
  const [showKitManager, setShowKitManager] = useState(false);
  const [dirty, setDirty] = useState(false);

  const autoSaveTimer = useRef(null);
  const lastSaveData = useRef(null);

  const status = useCallback((msg) => {
    if (onStatus) onStatus(msg);
  }, [onStatus]);

  // ── Gather current state from engine ──
  const gatherProjectData = useCallback(() => {
    if (!engine) return {};
    return {
      name: projectName,
      bpm: engine.bpm,
      swing: engine.swing,
      key: engine.key || 'C',
      scale: engine.scale || 'major',
      master_volume: engine.masterVol,
      step_count: engine.stepCount || 16,
      pads: engine.pads.map(p => ({
        name: p.name,
        sampleUrl: p.sampleUrl || null,
        sampleName: p.sampleName || null,
        volume: p.volume,
        pitch: p.pitch,
        pan: p.pan,
        muted: p.muted,
        soloed: p.soloed,
        playMode: p.playMode,
        programType: p.programType,
        rootNote: p.rootNote,
        color: p.color,
        attack: p.attack,
        decay: p.decay,
        sustain: p.sustain,
        release: p.release,
        filterOn: p.filterOn,
        filterType: p.filterType,
        filterFreq: p.filterFreq,
        filterQ: p.filterQ,
        reverbOn: p.reverbOn,
        reverbMix: p.reverbMix,
        delayOn: p.delayOn,
        delayTime: p.delayTime,
        delayFeedback: p.delayFeedback,
        delayMix: p.delayMix,
        trimStart: p.trimStart,
        trimEnd: p.trimEnd,
        timeStretch: p.timeStretch,
        stretchMode: p.stretchMode,
        originalBpm: p.originalBpm,
        roundRobin: p.roundRobin,
      })),
      patterns: engine.patterns.map(p => ({
        id: p.id,
        name: p.name,
        steps: p.steps,
        stepCount: p.stepCount,
      })),
      song_sequence: engine.songSeq || [],
      scenes: engine.scenes || [],
    };
  }, [engine, projectName]);

  // ═════════════════════════════════════════════════════
  // SAVE PROJECT
  // ═════════════════════════════════════════════════════

  const saveProject = useCallback(async () => {
    if (!getToken()) { status('⚠ Sign in to save'); return null; }
    setSaving(true);
    status('Saving...');

    try {
      const data = gatherProjectData();
      const method = projectId ? 'PUT' : 'POST';
      const url = projectId
        ? `${API}/api/sampler/projects/${projectId}`
        : `${API}/api/sampler/projects`;

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        setProjectId(json.project.id);
        setDirty(false);
        lastSaveData.current = JSON.stringify(data);
        status('✓ Saved');
        return json.project;
      } else {
        status(`✗ Save failed: ${json.error}`);
        return null;
      }
    } catch (e) {
      status(`✗ Save error: ${e.message}`);
      return null;
    } finally {
      setSaving(false);
    }
  }, [projectId, gatherProjectData, status]);

  // ═════════════════════════════════════════════════════
  // LOAD PROJECT
  // ═════════════════════════════════════════════════════

  const loadProject = useCallback(async (pid) => {
    if (!getToken()) { status('⚠ Sign in to load'); return; }
    setLoading(true);
    status('Loading...');

    try {
      const res = await fetch(`${API}/api/sampler/projects/${pid}`, {
        headers: authHeaders(),
      });
      const json = await res.json();

      if (json.success && json.project) {
        const p = json.project;
        setProjectId(p.id);
        setProjectName(p.name);

        // Apply to engine
        if (engine) {
          engine.setBpm(p.bpm || 120);
          engine.setSwing(p.swing || 0);
          engine.setMasterVol(p.master_volume || 0.8);

          // Restore pads
          if (p.pads?.length) {
            p.pads.forEach((padData, i) => {
              if (i < engine.pads.length && padData) {
                engine.updatePad(i, {
                  ...padData,
                  buffer: null, // buffers loaded separately from URLs
                });
                // Load sample from R2 URL
                if (padData.sampleUrl) {
                  loadSampleFromUrl(i, padData.sampleUrl, padData.sampleName);
                }
              }
            });
          }

          // Restore patterns
          if (p.patterns?.length) {
            engine.setPatterns(p.patterns);
          }

          // Restore song sequence
          if (p.song_sequence?.length) {
            engine.setSongSeq(p.song_sequence);
          }

          // Restore scenes
          if (p.scenes?.length) {
            engine.setScenes(p.scenes);
          }
        }

        setShareInfo(p.share_token ? {
          token: p.share_token,
          permissions: p.share_permissions,
          isPublic: p.is_public,
        } : null);

        setShowProjectList(false);
        setDirty(false);
        status(`✓ Loaded: ${p.name}`);
      } else {
        status('✗ Load failed');
      }
    } catch (e) {
      status(`✗ Load error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [engine, status]);

  // ── Load audio buffer from R2 URL into a pad ──
  const loadSampleFromUrl = useCallback(async (padIndex, url, name) => {
    if (!engine || !url) return;
    try {
      const ctx = engine.initCtx();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      engine.updatePad(padIndex, {
        buffer: audioBuffer,
        sampleUrl: url,
        sampleName: name || `Sample ${padIndex + 1}`,
        trimEnd: audioBuffer.duration,
      });
    } catch (e) {
      console.error(`Failed to load sample for pad ${padIndex}:`, e);
    }
  }, [engine]);

  // ═════════════════════════════════════════════════════
  // UPLOAD SAMPLE (per-pad audio → R2)
  // ═════════════════════════════════════════════════════

  const uploadSample = useCallback(async (padIndex, file) => {
    if (!projectId) {
      // Auto-create project first
      const proj = await saveProject();
      if (!proj) return null;
    }

    const pid = projectId;
    if (!pid) return null;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('pad_index', padIndex);

    try {
      const res = await fetch(`${API}/api/sampler/projects/${pid}/samples`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        status(`✓ Sample uploaded → Pad ${padIndex + 1}`);
        return json.sample_url;
      } else {
        status(`✗ Upload failed: ${json.error}`);
        return null;
      }
    } catch (e) {
      status(`✗ Upload error: ${e.message}`);
      return null;
    }
  }, [projectId, saveProject, status]);

  // ═════════════════════════════════════════════════════
  // BOUNCE (rendered beat → R2)
  // ═════════════════════════════════════════════════════

  const uploadBounce = useCallback(async (blob) => {
    if (!projectId) return null;
    const fd = new FormData();
    fd.append('file', blob, 'bounce.wav');

    try {
      const res = await fetch(`${API}/api/sampler/projects/${projectId}/bounce`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        status('✓ Bounce uploaded');
        return json.bounce_url;
      }
      return null;
    } catch (e) {
      console.error('Bounce upload error:', e);
      return null;
    }
  }, [projectId, status]);

  // ═════════════════════════════════════════════════════
  // PROJECT LIST
  // ═════════════════════════════════════════════════════

  const loadProjectList = useCallback(async () => {
    if (!getToken()) { status('⚠ Sign in first'); return; }
    try {
      const res = await fetch(`${API}/api/sampler/projects`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setProjects(json.projects || []);
        setShowProjectList(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, [status]);

  const deleteProject = useCallback(async (pid) => {
    if (!getToken()) return;
    try {
      await fetch(`${API}/api/sampler/projects/${pid}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setProjects(prev => prev.filter(p => p.id !== pid));
      if (projectId === pid) {
        setProjectId(null);
        setProjectName('Untitled Beat');
      }
      status('✓ Project deleted');
    } catch (e) {
      status('✗ Delete failed');
    }
  }, [projectId, status]);

  const newProject = useCallback(() => {
    setProjectId(null);
    setProjectName('Untitled Beat');
    setShareInfo(null);
    setDirty(false);
    status('New project');
  }, [status]);

  // ═════════════════════════════════════════════════════
  // SHARING
  // ═════════════════════════════════════════════════════

  const shareProject = useCallback(async (permissions = 'view', isPublic = false) => {
    if (!projectId) {
      const proj = await saveProject();
      if (!proj) return;
    }
    const pid = projectId;
    if (!pid) return;

    try {
      const res = await fetch(`${API}/api/sampler/projects/${pid}/share`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ permissions, is_public: isPublic }),
      });
      const json = await res.json();
      if (json.success) {
        setShareInfo({
          token: json.share_token,
          permissions: json.permissions,
          isPublic: json.is_public,
          url: `${window.location.origin}${json.share_url}`,
        });
        setShowSharePanel(true);
        status('✓ Share link generated');
      }
    } catch (e) {
      status('✗ Share failed');
    }
  }, [projectId, saveProject, status]);

  const forkProject = useCallback(async (pid) => {
    if (!getToken()) { status('⚠ Sign in to fork'); return; }
    try {
      const res = await fetch(`${API}/api/sampler/projects/${pid}/fork`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setProjectId(json.project.id);
        setProjectName(json.project.name);
        status(`✓ Forked! Now editing your copy`);
      }
    } catch (e) {
      status('✗ Fork failed');
    }
  }, [status]);

  // ═════════════════════════════════════════════════════
  // DRUM KIT MANAGEMENT
  // ═════════════════════════════════════════════════════

  const saveKit = useCallback(async (name, isPublic = false) => {
    if (!getToken() || !engine) return;
    try {
      const padData = engine.pads.map(p => ({
        name: p.name,
        sampleUrl: p.sampleUrl,
        sampleName: p.sampleName,
        volume: p.volume,
        pitch: p.pitch,
        pan: p.pan,
        playMode: p.playMode,
        color: p.color,
      }));

      const res = await fetch(`${API}/api/sampler/kits`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          pads: padData,
          genre: engine.genre || '',
          is_public: isPublic,
        }),
      });
      const json = await res.json();
      if (json.success) {
        status(`✓ Kit "${name}" saved`);
        return json.kit;
      }
    } catch (e) {
      status('✗ Kit save failed');
    }
    return null;
  }, [engine, status]);

  const loadKits = useCallback(async (includePublic = true) => {
    if (!getToken()) return;
    try {
      const res = await fetch(
        `${API}/api/sampler/kits?include_public=${includePublic}`,
        { headers: authHeaders() }
      );
      const json = await res.json();
      if (json.success) {
        setKits(json.kits || []);
        setShowKitManager(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadKit = useCallback(async (kitId) => {
    if (!getToken() || !engine) return;
    try {
      const res = await fetch(`${API}/api/sampler/kits/${kitId}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success && json.kit?.pads) {
        json.kit.pads.forEach((padData, i) => {
          if (i < engine.pads.length && padData) {
            engine.updatePad(i, { ...padData, buffer: null });
            if (padData.sampleUrl) {
              loadSampleFromUrl(i, padData.sampleUrl, padData.sampleName);
            }
          }
        });
        setShowKitManager(false);
        status(`✓ Kit "${json.kit.name}" loaded`);
      }
    } catch (e) {
      status('✗ Kit load failed');
    }
  }, [engine, loadSampleFromUrl, status]);

  const deleteKit = useCallback(async (kitId) => {
    if (!getToken()) return;
    try {
      await fetch(`${API}/api/sampler/kits/${kitId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setKits(prev => prev.filter(k => k.id !== kitId));
      status('✓ Kit deleted');
    } catch (e) {
      status('✗ Delete failed');
    }
  }, [status]);

  // ═════════════════════════════════════════════════════
  // AUTO-SAVE (debounced 5s after changes)
  // ═════════════════════════════════════════════════════

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  useEffect(() => {
    if (!dirty || !projectId || !getToken()) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const data = gatherProjectData();
      const dataStr = JSON.stringify(data);

      // Skip if nothing changed
      if (dataStr === lastSaveData.current) return;

      try {
        const res = await fetch(`${API}/api/sampler/projects/${projectId}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: dataStr,
        });
        const json = await res.json();
        if (json.success) {
          lastSaveData.current = dataStr;
          setDirty(false);
          // Silent auto-save, no status message
        }
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    }, 5000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [dirty, projectId, gatherProjectData]);

  // ═════════════════════════════════════════════════════
  // RETURN
  // ═════════════════════════════════════════════════════

  return {
    // State
    projectId,
    projectName, setProjectName,
    projects,
    saving, loading,
    showProjectList, setShowProjectList,
    showSharePanel, setShowSharePanel,
    shareInfo,
    kits,
    showKitManager, setShowKitManager,
    dirty,

    // Project CRUD
    saveProject,
    loadProject,
    loadProjectList,
    deleteProject,
    newProject,

    // Sample upload
    uploadSample,
    uploadBounce,
    loadSampleFromUrl,

    // Sharing
    shareProject,
    forkProject,

    // Kit management
    saveKit,
    loadKits,
    loadKit,
    deleteKit,

    // Auto-save
    markDirty,
  };
};

export default useSamplerStorage;