// =============================================================================
// RecordingStudio.js — Part 3/4
// Save/Load · Mixdown · Freeze · Piano roll · AI handlers · Menu actions
// =============================================================================

  // ── Autosave ──
  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => { if (!saving) { saveProject(); setStatus("✓ Auto-saved"); } }, 60000);
    return () => clearInterval(interval);
  }, [projectId, saving]);

  // ── Save ──
  const saveProject = async () => {
    setSaving(true); setStatus("Saving...");
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const td = tracks.map(t => ({ name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo, effects: t.effects, color: t.color, trackType: t.trackType, instrument: t.instrument, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })), audio_url: typeof t.audio_url === "string" && !t.audio_url.startsWith("blob:") ? t.audio_url : null }));
      const method = projectId ? "PUT" : "POST";
      const url = projectId ? `${bu}/api/studio/projects/${projectId}` : `${bu}/api/studio/projects`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify({ name: projectName, bpm, time_signature: `${timeSignature[0]}/${timeSignature[1]}`, tracks: td, master_volume: masterVolume, master_pan: masterPan, piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale, automation, cycle_start: cycleStart, cycle_end: cycleEnd, cycle_enabled: cycleEnabled }) });
      const data = await res.json();
      if (data?.success) { setProjectId(data.project.id); setStatus("✓ Saved"); }
      else setStatus("✗ Save failed");
    } catch (e) { setStatus("✗ Save failed"); }
    finally { setSaving(false); }
  };

  const loadProject = async (pid) => {
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/studio/projects/${pid}`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      if (data?.success) {
        const p = data.project;
        setProjectId(p.id); setProjectName(p.name); setBpm(p.bpm); setMasterVolume(p.master_volume || 0.8); setMasterPan(p.master_pan || 0);
        if (p.time_signature) { const ts = p.time_signature.split("/").map(Number); if (ts.length === 2) setTimeSignature(ts); }
        if (p.piano_roll_notes) setPianoRollNotes(p.piano_roll_notes);
        if (p.piano_roll_key) setPianoRollKey(p.piano_roll_key);
        if (p.piano_roll_scale) setPianoRollScale(p.piano_roll_scale);
        if (p.automation) setAutomation(p.automation);
        if (p.cycle_start != null) setCycleStart(p.cycle_start);
        if (p.cycle_end != null) setCycleEnd(p.cycle_end);
        if (p.cycle_enabled != null) setCycleEnabled(p.cycle_enabled);
        const trackCount = Math.min(Math.max(p.tracks?.length || 1, 1), maxTracks);
        const loaded = Array.from({ length: trackCount }, (_, i) => ({ ...DEFAULT_TRACK(i), ...(p.tracks[i] || {}), audioBuffer: null, effects: p.tracks[i]?.effects || DEFAULT_EFFECTS(), regions: p.tracks[i]?.regions || [] }));
        setTracks(loaded); setSelectedTrackIndex(0);
        for (let i = 0; i < loaded.length; i++) if (loaded[i].audio_url) await loadAudioBuffer(loaded[i].audio_url, i);
        setShowProjectList(false); setStatus(`Loaded: ${p.name}`);
      }
    } catch (e) { setStatus("✗ Load failed"); }
  };

  const loadProjectList = async () => {
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/studio/projects`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      if (data?.success) { setProjects(data.projects || []); setShowProjectList(true); }
    } catch (e) { console.error(e); }
  };

  const newProject = () => {
    stopEverything(); setProjectId(null); setProjectName("Untitled Project"); setBpm(120); setMasterVolume(0.8); setMasterPan(0);
    setActiveEffectsTrack(null); setTimeSignature([4, 4]); setTracks(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));
    setSelectedTrackIndex(0); setPianoRollNotes([]); setPianoRollKey("C"); setPianoRollScale("major");
    setEditingRegion(null); setStatus("New project"); setViewMode("arrange");
  };

  // ── Mixdown ──
  const mixDownProject = async () => {
    if (!tracks.some(t => t.audioBuffer)) { setStatus("⚠ No audio to bounce"); return; }
    setMixingDown(true); setStatus("⏳ Bouncing to WAV...");
    try {
      const sr = 44100, maxDur = Math.max(...tracks.map(t => t.audioBuffer?.duration ?? 0), 0.5);
      const offCtx = new OfflineAudioContext(2, Math.ceil(sr * (maxDur + 1)), sr);
      const master = offCtx.createGain(); master.gain.value = masterVolume ?? 1; master.connect(offCtx.destination);
      tracks.forEach(t => {
        if (!t.audioBuffer || t.muted) return;
        if (tracks.some(x => x.solo) && !t.solo) return;
        const src = offCtx.createBufferSource(); src.buffer = t.audioBuffer;
        const g = offCtx.createGain(); g.gain.value = t.volume ?? 0.8;
        const pan = offCtx.createStereoPanner(); pan.pan.value = t.pan ?? 0;
        let last = src; const fxLocal = t.effects ?? {};
        if (fxLocal.eq?.enabled) { const lo = offCtx.createBiquadFilter(); lo.type = "lowshelf"; lo.frequency.value = 200; lo.gain.value = fxLocal.eq.lowGain ?? 0; const mi = offCtx.createBiquadFilter(); mi.type = "peaking"; mi.frequency.value = 1000; mi.Q.value = 1; mi.gain.value = fxLocal.eq.midGain ?? 0; const hi = offCtx.createBiquadFilter(); hi.type = "highshelf"; hi.frequency.value = 8000; hi.gain.value = fxLocal.eq.highGain ?? 0; last.connect(lo); lo.connect(mi); mi.connect(hi); last = hi; }
        if (fxLocal.compressor?.enabled) { const c = offCtx.createDynamicsCompressor(); c.threshold.value = fxLocal.compressor.threshold ?? -24; c.ratio.value = fxLocal.compressor.ratio ?? 4; c.attack.value = (fxLocal.compressor.attack ?? 10) / 1000; c.release.value = (fxLocal.compressor.release ?? 100) / 1000; last.connect(c); last = c; }
        last.connect(g); g.connect(pan); pan.connect(master); src.start(t.startTime ?? 0);
      });
      const buf = await offCtx.startRendering();
      const nc = buf.numberOfChannels, len = buf.length * nc * 2, ab = new ArrayBuffer(44 + len), view = new DataView(ab);
      const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      ws(0, "RIFF"); view.setUint32(4, 36 + len, true); ws(8, "WAVE"); ws(12, "fmt ");
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, nc, true);
      view.setUint32(24, sr, true); view.setUint32(28, sr * nc * 2, true); view.setUint16(32, nc * 2, true);
      view.setUint16(34, 16, true); ws(36, "data"); view.setUint32(40, len, true);
      let off = 44; for (let i = 0; i < buf.length; i++) for (let ch = 0; ch < nc; ch++) { const s = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i])); view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2; }
      const blob = new Blob([ab], { type: "audio/wav" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${(projectName ?? "project").replace(/\s+/g, "_")}_mix.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 8000);
      setStatus(`✓ Bounced: ${a.download}`);
    } catch (e) { setStatus(`✗ Bounce failed: ${e.message}`); }
    setMixingDown(false);
  };

  // ── Freeze ──
  const freezeTrack = async (ti) => {
    const t = tracks[ti]; if (!t?.audioBuffer) { setStatus(`⚠ Track ${ti + 1} has no audio`); return; }
    if (t.frozen) { setStatus(`Track ${ti + 1} already frozen`); return; }
    setStatus(`⏳ Freezing Track ${ti + 1}...`);
    try {
      const sr = audioCtxRef.current?.sampleRate || 48000;
      const offCtx = new OfflineAudioContext(2, Math.ceil(sr * (t.audioBuffer.duration + 0.5)), sr);
      const src = offCtx.createBufferSource(); src.buffer = t.audioBuffer;
      const g = offCtx.createGain(); g.gain.value = t.volume ?? 0.8;
      const pan = offCtx.createStereoPanner(); pan.pan.value = t.pan ?? 0;
      src.connect(g); g.connect(pan); pan.connect(offCtx.destination); src.start(0);
      const rendered = await offCtx.startRendering();
      updateTrack(ti, { audioBuffer: rendered, frozenBuffer: t.audioBuffer, frozenEffects: JSON.parse(JSON.stringify(t.effects)), frozen: true, name: (t.name ?? `Track ${ti + 1}`) + "  ❄" });
      setStatus(`✓ Track ${ti + 1} frozen`);
    } catch (e) { setStatus(`✗ Freeze failed: ${e.message}`); }
  };

  const unfreezeTrack = (ti) => {
    const t = tracks[ti]; if (!t?.frozen || !t?.frozenBuffer) { setStatus(`Track ${ti + 1} is not frozen`); return; }
    updateTrack(ti, { audioBuffer: t.frozenBuffer, frozenBuffer: null, effects: t.frozenEffects ?? t.effects, frozen: false, name: (t.name ?? "").replace("  ❄", "") });
    setStatus(`✓ Track ${ti + 1} unfrozen`);
  };

  // ── Piano roll ──
  const handlePianoRollExport = useCallback((renderedBuffer, blob) => {
    let t = tracks.findIndex(t => !t.audioBuffer);
    if (t === -1 && tracks.length < maxTracks) { t = tracks.length; setTracks(prev => [...prev, DEFAULT_TRACK(prev.length)]); }
    if (t === -1) { setStatus("⚠ No empty tracks."); return; }
    if (renderedBuffer) { const audioUrl = URL.createObjectURL(blob); updateTrack(t, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: "Piano Roll Export" }); createRegionFromImport(t, renderedBuffer, "Piano Roll Export", audioUrl); setStatus(`✓ Piano Roll → Track ${t + 1}`); setViewMode("arrange"); }
  }, [tracks, maxTracks, updateTrack]);

  const handleBeatExport = useCallback((renderedBuffer, blob) => {
    let t = tracks.findIndex(t => !t.audioBuffer);
    if (t === -1 && tracks.length < maxTracks) { t = tracks.length; setTracks(prev => [...prev, DEFAULT_TRACK(prev.length)]); }
    if (t === -1) { setStatus("⚠ No empty tracks."); return; }
    if (renderedBuffer) { const audioUrl = URL.createObjectURL(blob); updateTrack(t, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: "Beat Export" }); createRegionFromImport(t, renderedBuffer, "Beat Export", audioUrl); setStatus(`✓ Beat → Track ${t + 1}`); setViewMode("arrange"); }
  }, [tracks, maxTracks, updateTrack]);

  const handlePianoRollNotesChange = useCallback((notes) => setPianoRollNotes(notes), []);
  const handleChordInsert = useCallback((chordNotes) => { if (chordNotes?.length) { setPianoRollNotes(prev => [...prev, ...chordNotes]); setStatus(`✓ ${chordNotes.length} chord notes inserted`); } }, []);
  const handleChordKeyChange = useCallback((key, scale) => { setPianoRollKey(key); setPianoRollScale(scale); }, []);

  const exportMidiFile = useCallback(() => {
    if (!pianoRollNotes?.length) { setStatus("⚠ No piano roll notes"); return; }
    try {
      const bytes = midiFromNotes({ notes: pianoRollNotes, bpm, ppq: 480 });
      const blob = new Blob([bytes], { type: "audio/midi" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${projectName.replace(/\s+/g, "_") || "project"}_pianoroll.mid`; a.click();
      URL.revokeObjectURL(url); setStatus("✓ MIDI exported");
    } catch (e) { setStatus("✗ MIDI export failed"); }
  }, [pianoRollNotes, bpm, projectName]);

  const savePianoRollToRegion = useCallback(() => {
    if (!editingRegion) return;
    const { trackIndex, regionId } = editingRegion;
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, regions: (t.regions || []).map(r => {
        if (r.id !== regionId) return r;
        const relativeNotes = pianoRollNotes.map(n => ({ ...n, startBeat: n.startBeat - r.startBeat }));
        const maxEnd = Math.max(...relativeNotes.map(n => n.startBeat + n.duration), 0);
        return { ...r, notes: relativeNotes, duration: Math.max(maxEnd, r.duration) };
      }) };
    }));
    setEditingRegion(null); setStatus("✓ Piano Roll edits saved");
  }, [editingRegion, pianoRollNotes]);

  useEffect(() => { if (viewMode !== "pianoroll" && editingRegion) savePianoRollToRegion(); }, [viewMode, editingRegion, savePianoRollToRegion]);

  const onOpenPianoRoll = useCallback((trackIdx, regionId) => {
    const track = tracks[trackIdx]; const region = (track?.regions || []).find(r => r.id === regionId); if (!region) return;
    setEditingRegion({ trackIndex: trackIdx, regionId });
    setPianoRollNotes(region.notes.map(n => ({ ...n, startBeat: n.startBeat + region.startBeat })));
    setViewMode("pianoroll");
  }, [tracks]);

  const handleTimelineDoubleClick = useCallback((e, trackIndex) => {
    const track = tracks[trackIndex];
    if (track.trackType === "midi" || track.trackType === "instrument") {
      const newRegion = createMidiRegion(playheadBeat, timeSignature[0], `MIDI ${trackIndex + 1}`);
      setTracks(prev => { const next = [...prev]; next[trackIndex] = { ...next[trackIndex], regions: [...(next[trackIndex].regions || []), newRegion] }; return next; });
    }
  }, [tracks, playheadBeat, timeSignature]);

  // ── AI handlers ──
  const handleAIApplyVolume   = useCallback((trackIndex, value) => { updateTrack(trackIndex, { volume: value }); if (trackGainsRef.current[trackIndex]) trackGainsRef.current[trackIndex].gain.value = value; setStatus(`AI: Track ${trackIndex + 1} vol → ${Math.round(value * 100)}%`); }, [updateTrack]);
  const handleAIApplyPan      = useCallback((trackIndex, value) => { updateTrack(trackIndex, { pan: value }); if (trackPansRef.current[trackIndex]) trackPansRef.current[trackIndex].pan.value = value; setStatus(`AI: Track ${trackIndex + 1} pan`); }, [updateTrack]);
  const handleAIApplyEQ       = useCallback((trackIndex, eqSuggestion) => { const updates = {}; if (eqSuggestion.frequency < 400) updates.lowGain = eqSuggestion.gain_db; else if (eqSuggestion.frequency < 3000) { updates.midGain = eqSuggestion.gain_db; updates.midFreq = eqSuggestion.frequency; } else updates.highGain = eqSuggestion.gain_db; setTracks(prev => prev.map((t, i) => i !== trackIndex ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updates, enabled: true } } })); setStatus(`AI: Track ${trackIndex + 1} EQ adjusted`); }, []);
  const handleAIApplyCompression = useCallback((trackIndex, comp) => { setTracks(prev => prev.map((t, i) => i !== trackIndex ? t : { ...t, effects: { ...t.effects, compressor: { threshold: comp.suggested_threshold || -20, ratio: comp.suggested_ratio || 4, attack: (comp.suggested_attack_ms || 10) / 1000, release: (comp.suggested_release_ms || 100) / 1000, enabled: true } } })); setStatus(`AI: Track ${trackIndex + 1} compressor applied`); }, []);
  const handleAIBeatApply     = useCallback((patternData) => { setStatus(`✓ AI Beat: ${patternData.genre} @ ${patternData.bpm} BPM`); }, []);

  const handleApplyVocalFx = useCallback((fxSettings) => {
    const idx = tracks.findIndex(t => t.armed); const targetIdx = idx !== -1 ? idx : selectedTrackIndex;
    setTracks(prev => prev.map((t, i) => { if (i !== targetIdx) return t; return { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...(fxSettings.eq || {}), enabled: fxSettings.eq?.enabled ?? t.effects.eq.enabled }, compressor: { ...t.effects.compressor, ...(fxSettings.compressor || {}), enabled: fxSettings.compressor?.enabled ?? t.effects.compressor.enabled }, reverb: { ...t.effects.reverb, ...(fxSettings.reverb || {}), enabled: fxSettings.reverb?.enabled ?? t.effects.reverb.enabled }, gate: { ...t.effects.gate, ...(fxSettings.gate || {}), enabled: fxSettings.gate?.enabled ?? t.effects.gate.enabled }, deesser: { ...t.effects.deesser, ...(fxSettings.deesser || {}), enabled: fxSettings.deesser?.enabled ?? t.effects.deesser.enabled }, limiter: { ...t.effects.limiter, ...(fxSettings.limiter || {}), enabled: fxSettings.limiter?.enabled ?? t.effects.limiter.enabled }, filter: { ...t.effects.filter, ...(fxSettings.filter || {}), enabled: fxSettings.filter?.enabled ?? t.effects.filter.enabled }, distortion: { ...t.effects.distortion, ...(fxSettings.distortion || {}), enabled: fxSettings.distortion?.enabled ?? t.effects.distortion.enabled }, chorus: { ...t.effects.chorus, ...(fxSettings.chorus || {}), enabled: fxSettings.chorus?.enabled ?? t.effects.chorus.enabled } } }; }));
    setActiveEffectsTrack(targetIdx); setStatus(`✓ Vocal FX applied to Track ${targetIdx + 1}`);
  }, [tracks, selectedTrackIndex]);

  const handleApplyMicProfile = useCallback((micProfile) => {
    const idx = tracks.findIndex(t => t.armed); const targetIdx = idx !== -1 ? idx : selectedTrackIndex;
    if (!micProfile?.eqCurve) return;
    setTracks(prev => prev.map((t, i) => { if (i !== targetIdx) return t; return { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...micProfile.eqCurve, enabled: true }, filter: micProfile.rolloff ? { ...t.effects.filter, type: "highpass", frequency: micProfile.rolloff, Q: 0.707, enabled: true } : t.effects.filter } }; }));
    setStatus(`✓ Mic profile "${micProfile.name}" applied to Track ${targetIdx + 1}`);
  }, [tracks, selectedTrackIndex]);

  const handleConsoleMicModel = useCallback((trackIndex, modelKey) => {
    setTrackMicModels(prev => ({ ...prev, [trackIndex]: modelKey }));
    if (modelKey === "none" || !MIC_MODELS[modelKey]?.eqCurve) { setStatus(`Mic model cleared — Track ${trackIndex + 1}`); return; }
    const mic = MIC_MODELS[modelKey];
    handleApplyMicProfile({ name: mic.name, eqCurve: mic.eqCurve, rolloff: mic.rolloff });
    setStatus(`🎙 ${mic.name} applied to Track ${trackIndex + 1}`);
  }, [handleApplyMicProfile]);

  const landBufferOnTrack = useCallback((audioBuffer, trackName) => {
    const foundIdx = tracks.findIndex(t => !t.audioBuffer);
    const targetIdx = (foundIdx === -1 && tracks.length < maxTracks) ? tracks.length : foundIdx;
    if (foundIdx === -1 && tracks.length < maxTracks) setTracks(prev => [...prev, DEFAULT_TRACK(targetIdx)]);
    if (targetIdx === -1) { setStatus("⚠ No empty tracks"); return; }
    const blob = new Blob([audioBuffer], { type: "audio/wav" }); const audioUrl = URL.createObjectURL(blob);
    updateTrack(targetIdx, { audioBuffer, audio_url: audioUrl, name: trackName });
    createRegionFromImport(targetIdx, audioBuffer, trackName, audioUrl);
    setStatus(`✓ "${trackName}" → Track ${targetIdx + 1}`); setViewMode("arrange");
  }, [tracks, maxTracks, updateTrack, createRegionFromImport]);

  // ── Arranger callbacks ──
  const handleArrangerPlay   = useCallback(() => { if (!isPlaying) startPlayback(); }, [isPlaying]);
  const handleArrangerStop   = useCallback(() => { if (isPlaying) stopPlayback(); }, [isPlaying]);
  const handleArrangerRecord = useCallback(() => { isRecording ? stopRecording() : startRecording(); }, [isRecording]);
  const handleBpmChange      = useCallback((newBpm) => setBpm(newBpm), []);
  const handleTimeSignatureChange = useCallback((top, bottom) => setTimeSignature([top, bottom]), []);
  const handleToggleFx       = useCallback((trackIndex) => setActiveEffectsTrack(prev => prev === trackIndex ? null : trackIndex), []);
  const handleBrowseSounds   = useCallback((trackIndex) => { setSelectedTrackIndex(trackIndex); updateTrack(trackIndex, { armed: true }); setTracks(prev => prev.map((t, i) => ({ ...t, armed: i === trackIndex }))); setViewMode("sounds"); setStatus(`Browse sounds for Track ${trackIndex + 1}`); }, [updateTrack]);

  // ── Split screen drag ──
  const handleSplitMouseDown = useCallback((e) => {
    e.preventDefault(); splitDragRef.current = true;
    const container = splitContainerRef.current; if (!container) return;
    const onMove = (me) => { if (!splitDragRef.current) return; const rect = container.getBoundingClientRect(); const pct = Math.max(20, Math.min(80, ((me.clientY - rect.top) / rect.height) * 100)); setSplitTopH(Math.round(pct)); };
    const onUp = () => { splitDragRef.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, []);

  // ── Flex pitch ──
  const openFlexPitch = useCallback((ti) => {
    const t = tracks[ti]; if (!t?.audioBuffer) { setStatus(`⚠ Track ${ti + 1} has no audio`); return; }
    setFlexPitchBuffer(t.audioBuffer); setFlexPitchTrack(ti); setShowFlexPitch(true);
  }, [tracks]);

  const handleFlexPitchExport = useCallback((correctedBuffer) => {
    if (flexPitchTrack === null) return;
    updateTrack(flexPitchTrack, { audioBuffer: correctedBuffer });
    setStatus(`✓ Pitch corrections applied to Track ${flexPitchTrack + 1}`);
    setShowFlexPitch(false);
  }, [flexPitchTrack, updateTrack]);

  // ── Automation playback ──
  const applyAutomation = useCallback(() => {
    if (!audioCtxRef.current || !isPlaying) { autoRafRef.current = null; return; }
    const now = audioCtxRef.current.currentTime;
    const projectTime = playOffsetRef.current / bpm * 60 + (now - playStartRef.current);
    tracks.forEach((t, i) => {
      const tId = t.id ?? i; if (!autoRead[tId]) return;
      const tAuto = automation[tId] ?? {}; const paramK = autoParams[tId] ?? "volume";
      const param = AUTO_PARAMS.find(p => p.key === paramK); if (!param) return;
      const pts = (tAuto[paramK] ?? []).sort((a, b) => a.time - b.time); if (pts.length === 0) return;
      const val = getValueAtTime(pts, projectTime, param);
      const nodes = trackNodesRef.current.get(tId); if (!nodes) return;
      switch (paramK) {
        case "volume": nodes.fader?.gain.setTargetAtTime(val, now, 0.02); break;
        case "pan":    nodes.panNode?.pan.setTargetAtTime(Math.max(-1, Math.min(1, val)), now, 0.02); break;
        case "mute":   nodes.preGain?.gain.setTargetAtTime(val > 0.5 ? 0 : 1, now, 0.01); break;
      }
    });
    autoRafRef.current = requestAnimationFrame(applyAutomation);
  }, [isPlaying, tracks, automation, autoRead, autoParams, bpm]);

  useEffect(() => {
    if (isPlaying) { if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current); autoRafRef.current = requestAnimationFrame(applyAutomation); }
    else { if (autoRafRef.current) { cancelAnimationFrame(autoRafRef.current); autoRafRef.current = null; } }
    return () => { if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current); };
  }, [isPlaying, applyAutomation]);

  // ── Menu handler ──
  const handleMenuAction = async (action) => {
    const sel = clamp(selectedTrackIndex, 0, Math.max(0, tracks.length - 1));
    const toggleArmSelected  = () => { setTracks(p => p.map((t, idx) => ({ ...t, armed: idx === sel ? !t.armed : false }))); setSelectedTrackIndex(sel); setStatus(`Track ${sel + 1} ${tracks[sel]?.armed ? "disarmed" : "armed"}`); };
    const toggleMuteSelected = () => { const wasMuted = !!tracks[sel]?.muted; updateTrack(sel, { muted: !wasMuted }); if (trackGainsRef.current[sel]) trackGainsRef.current[sel].gain.value = !wasMuted ? 0 : tracks[sel].volume; setStatus(`Track ${sel + 1} ${!wasMuted ? "muted" : "unmuted"}`); };
    const toggleSoloSelected = () => { updateTrack(sel, { solo: !tracks[sel]?.solo }); setStatus(`Track ${sel + 1} solo`); };
    const toggleFxPanel      = () => { setActiveEffectsTrack(prev => prev === sel ? null : sel); };
    switch (action) {
      case "file:new": newProject(); break;
      case "file:open": loadProjectList(); break;
      case "file:save": saveProject(); break;
      case "file:openLocal": { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".spx,.json"; inp.onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const text = await f.text(); const data = JSON.parse(text); if (data.format !== "streampirex-daw") { setStatus("Not a valid StreamPireX project"); return; } stopEverything(); setProjectId(null); setProjectName(data.name || "Imported Project"); setBpm(data.bpm || 120); setMasterVolume(data.master_volume || 0.8); if (data.time_signature) { const ts = data.time_signature.split("/").map(Number); if (ts.length === 2) setTimeSignature(ts); } if (data.piano_roll_notes) setPianoRollNotes(data.piano_roll_notes); const trackCount = Math.min(Math.max(data.tracks?.length || 1, 1), maxTracks); const loaded = Array.from({ length: trackCount }, (_, i) => ({ ...DEFAULT_TRACK(i), ...(data.tracks[i] || {}), audioBuffer: null, effects: data.tracks[i]?.effects || DEFAULT_EFFECTS(), regions: data.tracks[i]?.regions || [] })); setTracks(loaded); setSelectedTrackIndex(0); setStatus("Opened: " + (data.name || "project")); } catch (err) { setStatus("Failed to open: " + err.message); } }; inp.click(); break; }
      case "file:saveAs": { const saveData = { name: projectName, bpm, time_signature: timeSignature[0] + "/" + timeSignature[1], master_volume: masterVolume, tracks: tracks.map(t => ({ name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo, effects: t.effects, color: t.color, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })), audio_url: typeof t.audio_url === "string" && !t.audio_url.startsWith("blob:") ? t.audio_url : null })), piano_roll_notes: pianoRollNotes, created_at: new Date().toISOString(), format: "streampirex-daw", version: "1.0" }; setSaveAsData(JSON.stringify(saveData, null, 2)); setShowSaveAsModal(true); break; }
      case "file:saveDesktop": { const dlData = { name: projectName, bpm, time_signature: `${timeSignature[0]}/${timeSignature[1]}`, master_volume: masterVolume, tracks: tracks.map(t => ({ name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo, effects: t.effects, color: t.color, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })) })), piano_roll_notes: pianoRollNotes, created_at: new Date().toISOString(), format: "streampirex-daw", version: "1.0" }; const dlBlob = new Blob([JSON.stringify(dlData, null, 2)], { type: "application/json" }); const dlUrl = URL.createObjectURL(dlBlob); const dlA = document.createElement("a"); dlA.href = dlUrl; dlA.download = `${projectName.replace(/\s+/g, "_")}.spx`; document.body.appendChild(dlA); dlA.click(); document.body.removeChild(dlA); URL.revokeObjectURL(dlUrl); setStatus(`Downloaded: ${projectName}.spx`); break; }
      case "file:importAudio": setViewMode("arrange"); handleImport(sel); break;
      case "file:importMidi": case "midi:import": setViewMode("pianoroll"); break;
      case "midi:controller": setMidiEnabled(m => !m); break;
      case "plugins:wam": window.open("/wam-plugin-store", "_blank"); break;
      case "file:exportMidi": case "midi:export": exportMidiFile(); break;
      case "view:arrange": setViewMode("arrange"); break;
      case "view:console": setViewMode("console"); break;
      case "view:beatmaker": case "view:drumkits": case "view:kits": case "view:sampler": setViewMode("beatmaker"); break;
      case "view:pianoroll": case "view:midi": setViewMode("pianoroll"); break;
      case "view:piano": setViewMode("piano"); break;
      case "view:sounds": setViewMode("sounds"); break;
      case "view:keyfinder": setViewMode("keyfinder"); break;
      case "view:aibeat": setViewMode("aibeat"); break;
      case "view:micsim": setShowMicSimModal(true); break;
      case "view:aimix": setViewMode("aimix"); break;
      case "view:chords": setViewMode("chords"); break;
      case "view:vocal": setShowVocalModal(true); break;
      case "view:takelanes": setViewMode("takelanes"); break;
      case "view:plugins": setViewMode("plugins"); break;
      case "view:plugin-store": setViewMode("plugin-store"); break;
      case "view:multiband": setViewMode("multiband"); break;
      case "view:voicemidi": setViewMode("voicemidi"); break;
      case "view:toggleFx": toggleFxPanel(); break;
      case "transport:playPause": isPlaying ? stopPlayback() : startPlayback(); break;
      case "transport:stop": stopEverything(); break;
      case "transport:record": isRecording ? stopRecording() : startRecording(); break;
      case "transport:rewind": rewind(); break;
      case "transport:tapTempo": tapTempo(); break;
      case "track:add": addTrack(); break;
      case "track:remove": removeTrack(sel); break;
      case "track:arm": toggleArmSelected(); break;
      case "track:mute": toggleMuteSelected(); break;
      case "track:solo": toggleSoloSelected(); break;
      case "track:clear": clearTrack(sel); break;
      case "track:duplicate": { if (!tracks[sel]) break; const dup = { ...tracks[sel], id: Date.now(), name: (tracks[sel].name ?? `Track ${sel + 1}`) + " copy" }; setTracks(t => [...t, dup]); setStatus(`Track ${sel + 1} duplicated`); break; }
      case "track:color": { const pal = ["#34c759","#ff9500","#007aff","#af52de","#ff3b30","#5ac8fa","#ff2d55","#ffcc00","#ff6b35","#00ffc8"]; const next = pal[(pal.indexOf(tracks[sel]?.color ?? pal[0]) + 1) % pal.length]; updateTrack(sel, { color: next }); break; }
      case "track:rename": { const n = window.prompt("Rename track:", tracks[sel]?.name ?? `Track ${sel + 1}`); if (n?.trim()) updateTrack(sel, { name: n.trim() }); break; }
      case "transport:metronome": metronomeOn ? stopMetronome() : startMetronome(audioCtxRef?.current); setMetronomeOn(m => !m); break;
      case "transport:cycle": setCycleEnabled(e => !e); setStatus(`Cycle ${cycleEnabled ? "OFF" : "ON"}`); break;
      case "transport:countIn": setCountIn(c => !c); break;
      case "transport:setBpm": { const b = window.prompt("Set BPM:", String(bpm ?? 120)); if (b && !isNaN(parseInt(b))) setBpm(Math.max(20, Math.min(300, parseInt(b)))); break; }
      case "transport:timeSignature": { const ts = window.prompt("Time signature:", `${timeSignature[0]}/${timeSignature[1]}`); if (ts) { const [top, bot] = ts.split("/").map(Number); if (top > 0 && bot > 0) setTimeSignature([top, bot]); } break; }
      case "transport:goToEnd": { const mx = Math.max(...tracks.map(t => t.audioBuffer?.duration ?? 0), 0); playOffsetRef.current = mx; setCurrentTime(mx); break; }
      case "midi:hardware": setMidiEnabled(m => !m); break;
      case "midi:humanize": { const h = (pianoRollNotes ?? []).map(n => ({ ...n, startBeat: +(n.startBeat + (Math.random() - 0.5) * 0.04).toFixed(4), velocity: +Math.max(0.05, Math.min(1, (n.velocity ?? 0.8) + (Math.random() - 0.5) * 0.15)).toFixed(3) })); setPianoRollNotes(h); setStatus(`✓ Humanized ${h.length} notes`); break; }
      case "midi:quantize": { setPianoRollNotes(p => p.map(n => ({ ...n, startBeat: Math.round(n.startBeat / 0.25) * 0.25 }))); setStatus("✓ Quantized to 1/16"); break; }
      case "midi:transpose": { const s = window.prompt("Semitones (+/-)", "0"); if (s !== null && !isNaN(parseInt(s))) { const n = parseInt(s); setPianoRollNotes(p => p.map(note => ({ ...note, note: Math.max(0, Math.min(127, (note.note ?? 60) + n)) }))); setStatus(`✓ Transposed ${n > 0 ? "+" : ""}${n} semitones`); } break; }
      case "midi:velocity": { const pct = window.prompt("Scale velocity %", "100"); if (pct && !isNaN(parseFloat(pct))) { const sc = parseFloat(pct) / 100; setPianoRollNotes(p => p.map(n => ({ ...n, velocity: +Math.max(0.05, Math.min(1, (n.velocity ?? 0.8) * sc)).toFixed(3) }))); setStatus(`✓ Velocity ×${pct}%`); } break; }
      case "midi:clearAll": if (window.confirm("Clear all piano roll notes?")) setPianoRollNotes([]); break;
      case "audio:settings": setShowAudioSettings(true); break;
      case "view:sampleLibrary": setShowSampleLibrary(s => !s); break;
      case "view:pluginRack": setShowPluginRack(s => !s); break;
      case "view:midiMapping": setShowMidiMapping(s => !s); break;
      case "view:onboarding": setShowOnboarding(true); break;
      case "file:projectSettings": { const nm = window.prompt("Project name:", projectName ?? "Untitled"); if (nm?.trim()) setProjectName(nm.trim()); const b = window.prompt("BPM:", String(bpm ?? 120)); if (b && !isNaN(parseInt(b))) setBpm(Math.max(20, Math.min(300, parseInt(b)))); break; }
      default: setStatus(`ℹ ${action}`);
    }
  };
