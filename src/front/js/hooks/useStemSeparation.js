// useStemSeparation.js — Universal stem separation hook
// Drop-in replacement for all 5 tools that currently hit Railway
// Real-time ONNX on user's machine, cloud fallback if needed
//
// Usage:
//   const { separate, status, progress, ready, isRealtime } = useStemSeparation();
//   const stems = await separate(audioBuffer);  // { vocals, drums, bass, other }

import { useState, useEffect, useRef, useCallback } from 'react';
import { SPXStemEngine } from '../engine/SPXStemEngine';

export function useStemSeparation({ autoInit = true } = {}) {
  const [status, setStatus]     = useState('');
  const [progress, setProgress] = useState(0);
  const [ready, setReady]       = useState(false);
  const [separating, setSeparating] = useState(false);
  const [error, setError]       = useState('');
  const [isRealtime, setIsRealtime] = useState(SPXStemEngine.isRealtimeAvailable());
  const engineRef = useRef(null);

  useEffect(() => {
    if (!autoInit) return;
    const engine = SPXStemEngine.getInstance();
    engineRef.current = engine;

    const onStatus = (msg, prog) => {
      setStatus(msg);
      setProgress(prog || 0);
    };

    engine.init(onStatus)
      .then(() => { setReady(true); setIsRealtime(true); })
      .catch(() => {
        // ONNX failed — cloud fallback still works
        setReady(true);
        setIsRealtime(false);
        setStatus('Real-time unavailable — using cloud separation');
      });

    return () => {};
  }, [autoInit]);

  const separate = useCallback(async (audioBuffer, opts = {}) => {
    if (!audioBuffer) { setError('No audio buffer provided'); return null; }
    setError('');
    setSeparating(true);
    setProgress(0);

    const engine = engineRef.current || SPXStemEngine.getInstance();
    const onStatus = (msg, prog) => { setStatus(msg); setProgress(prog || 0); };

    try {
      const stems = await engine.separate(audioBuffer, onStatus);
      setSeparating(false);
      return stems;
    } catch(e) {
      setError(e.message);
      setSeparating(false);
      return null;
    }
  }, []);

  return { separate, status, progress, ready, separating, error, isRealtime };
}

export default useStemSeparation;
