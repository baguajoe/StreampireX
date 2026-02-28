// =============================================================================
// PATCH 5 (FIXED) — Auto-analyze on sample load via useEffect
// =============================================================================
//
// PROBLEM WITH ORIGINAL PATCH 5:
//   analyzeOnLoad is defined in Patch 4 (after bounceToArrange)
//   but loadSample is defined EARLIER in the file
//   So loadSample can't call analyzeOnLoad — it doesn't exist yet
//
// SOLUTION:
//   Use a useEffect that watches pad buffers and auto-triggers analysis
//   when a new sample is loaded. No changes to loadSample needed.
//
// WHERE TO ADD:
//   Add this useEffect right after the Patch 4 callbacks
//   (after handleSampleEditorSend, before MIC / LINE-IN RECORDING section)
// =============================================================================


  // ── Auto-analyze when a pad gets a new buffer ──
  const prevBuffersRef = useRef(new Map()); // track which buffers we've already analyzed

  useEffect(() => {
    pads.forEach((pad, i) => {
      if (!pad.buffer) return;
      if (pad.buffer.duration < 1) return; // skip very short samples (hits, one-shots)

      // Check if this is a new buffer we haven't analyzed yet
      const prevBuffer = prevBuffersRef.current.get(i);
      if (prevBuffer === pad.buffer) return; // same buffer, skip

      // Mark as seen
      prevBuffersRef.current.set(i, pad.buffer);

      // Auto-analyze after a short delay (don't block UI)
      const timeoutId = setTimeout(async () => {
        try {
          const result = analyzeAudio(pad.buffer);

          if (result.bpm.bpm > 0) {
            setDetectedBpm(result.bpm.bpm);
            setBpmConfidence(result.bpm.confidence);
            setBpmCandidates(result.bpm.candidates);

            // Store detected BPM on the pad for time-stretch reference
            updatePad(i, { originalBpm: result.bpm.bpm });

            // Auto-sync to sequencer if enabled
            if (autoSyncBpm) {
              setBpm(result.bpm.bpm);
            }
          }

          if (result.key.confidence > 0.3) {
            setDetectedKey(result.key);
            setKeyConfidence(result.key.confidence);
            setKeyCandidates(result.key.allKeys);
          }
        } catch (err) {
          console.error('Auto-analysis failed:', err);
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    });
  }, [pads, autoSyncBpm, updatePad]);


// =============================================================================
// ALSO SIMPLIFY PATCH 4 — Remove analyzeOnLoad (no longer needed)
// =============================================================================
//
// In Patch 4, you can REMOVE these two functions since useEffect handles it:
//
//   const analyzeOnLoad = useCallback(...)   ← REMOVE
//
// And in handleSampleEditorSend, remove the analyzeOnLoad call:
//
// FIND:
//       analyzeOnLoad(sampleEditorPad, editedBuffer);
//
// REMOVE that line. The useEffect will auto-detect when the buffer changes.
//
// The simplified Patch 4 callbacks become:

  // =========================================================================
  // AUDIO ANALYSIS — BPM + Key Detection
  // =========================================================================

  const analyzePadSample = useCallback(async (padIndex) => {
    const pad = pads[padIndex];
    if (!pad?.buffer) return;
    setAnalyzing(true);
    try {
      const result = await new Promise(resolve => {
        setTimeout(() => resolve(analyzeAudio(pad.buffer)), 10);
      });
      if (result.bpm.bpm > 0) {
        setDetectedBpm(result.bpm.bpm);
        setBpmConfidence(result.bpm.confidence);
        setBpmCandidates(result.bpm.candidates);
        updatePad(padIndex, { originalBpm: result.bpm.bpm });
      }
      if (result.key.confidence > 0.3) {
        setDetectedKey(result.key);
        setKeyConfidence(result.key.confidence);
        setKeyCandidates(result.key.allKeys);
      }
    } catch (err) {
      console.error('Audio analysis failed:', err);
    }
    setAnalyzing(false);
  }, [pads, updatePad]);

  const syncBpmToProject = useCallback(() => {
    if (detectedBpm && onBpmSync) onBpmSync(detectedBpm);
  }, [detectedBpm, onBpmSync]);

  const syncKeyToProject = useCallback(() => {
    if (detectedKey && onKeySync) onKeySync(detectedKey.key, detectedKey.scale);
  }, [detectedKey, onKeySync]);

  // =========================================================================
  // SAMPLE EDITOR (SamplerInstrument integration)
  // =========================================================================

  const openSampleEditor = useCallback((padIndex) => {
    if (padIndex == null || !pads[padIndex]?.buffer) return;
    setSampleEditorPad(padIndex);
    setShowSampleEditor(true);
  }, [pads]);

  const handleSampleEditorSend = useCallback((editedBuffer, name) => {
    if (sampleEditorPad != null && editedBuffer) {
      setPads(prev => {
        const u = [...prev];
        u[sampleEditorPad] = {
          ...u[sampleEditorPad],
          buffer: editedBuffer,
          name: name || u[sampleEditorPad].name,
          trimEnd: editedBuffer.duration,
        };
        return u;
      });
      // No need to call analyzeOnLoad — the useEffect will auto-detect
    }
    setShowSampleEditor(false);
    setSampleEditorPad(null);
  }, [sampleEditorPad]);

  // ── Auto-analyze when a pad gets a new buffer ──
  const prevBuffersRef = useRef(new Map());

  useEffect(() => {
    pads.forEach((pad, i) => {
      if (!pad.buffer || pad.buffer.duration < 1) return;
      const prevBuffer = prevBuffersRef.current.get(i);
      if (prevBuffer === pad.buffer) return;
      prevBuffersRef.current.set(i, pad.buffer);

      setTimeout(async () => {
        try {
          const result = analyzeAudio(pad.buffer);
          if (result.bpm.bpm > 0) {
            setDetectedBpm(result.bpm.bpm);
            setBpmConfidence(result.bpm.confidence);
            setBpmCandidates(result.bpm.candidates);
            updatePad(i, { originalBpm: result.bpm.bpm });
            if (autoSyncBpm) setBpm(result.bpm.bpm);
          }
          if (result.key.confidence > 0.3) {
            setDetectedKey(result.key);
            setKeyConfidence(result.key.confidence);
            setKeyCandidates(result.key.allKeys);
          }
        } catch (err) {
          console.error('Auto-analysis failed:', err);
        }
      }, 200);
    });
  }, [pads, autoSyncBpm, updatePad]);


