// =============================================================================
// Teleprompter.js — Scrolling Script Overlay
// =============================================================================
// Location: src/front/js/component/Teleprompter.js
// Usage: <Teleprompter isRecording={bool} onClose={fn} />
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";

const Teleprompter = ({ isRecording, onClose }) => {
  const [script, setScript] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // px per second
  const [fontSize, setFontSize] = useState(32);
  const [mirror, setMirror] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [progress, setProgress] = useState(0);

  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const scrollPosRef = useRef(0);

  // Auto-play when recording starts
  useEffect(() => {
    if (isRecording && script && !isPlaying) setIsPlaying(true);
  }, [isRecording]);

  // Scroll animation loop
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const tick = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      scrollPosRef.current += speed * delta * 60;
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollPosRef.current;
        const max = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
        setProgress(max > 0 ? (scrollPosRef.current / max) * 100 : 0);
        if (scrollPosRef.current >= max) {
          setIsPlaying(false);
          return;
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); lastTimeRef.current = null; };
  }, [isPlaying, speed]);

  const handleLoadScript = () => {
    if (!script.trim()) return;
    scrollPosRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setProgress(0);
    setShowInput(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    scrollPosRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setProgress(0);
    lastTimeRef.current = null;
  };

  const lines = script.split("\n").filter((l) => l.trim());

  return (
    <div style={S.overlay}>
      {/* Controls bar */}
      <div style={S.bar}>
        <div style={S.barLeft}>
          <span style={S.barTitle}>📜 Teleprompter</span>
          {isRecording && <span style={S.recBadge}>● REC</span>}
        </div>

        {!showInput && (
          <div style={S.barControls}>
            {/* Play/Pause */}
            <button style={{ ...S.ctrl, ...(isPlaying ? S.ctrlActive : {}) }} onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button style={S.ctrl} onClick={handleReset}>⏮ Reset</button>

            {/* Speed */}
            <div style={S.ctrlGroup}>
              <span style={S.ctrlLabel}>Speed</span>
              <button style={S.ctrlSmall} onClick={() => setSpeed((s) => Math.max(0.5, s - 0.5))}>−</button>
              <span style={S.ctrlValue}>{speed.toFixed(1)}</span>
              <button style={S.ctrlSmall} onClick={() => setSpeed((s) => Math.min(8, s + 0.5))}>+</button>
            </div>

            {/* Font size */}
            <div style={S.ctrlGroup}>
              <span style={S.ctrlLabel}>Size</span>
              <button style={S.ctrlSmall} onClick={() => setFontSize((f) => Math.max(18, f - 2))}>−</button>
              <span style={S.ctrlValue}>{fontSize}</span>
              <button style={S.ctrlSmall} onClick={() => setFontSize((f) => Math.min(72, f + 2))}>+</button>
            </div>

            {/* Mirror */}
            <button style={{ ...S.ctrl, ...(mirror ? S.ctrlActive : {}) }} onClick={() => setMirror(!mirror)}>
              🪞 Mirror
            </button>

            {/* Edit */}
            <button style={S.ctrl} onClick={() => { setShowInput(true); setIsPlaying(false); }}>✏️ Edit</button>
          </div>
        )}

        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Progress bar */}
      {!showInput && (
        <div style={S.progressBar}>
          <div style={{ ...S.progressFill, width: `${progress}%` }} />
        </div>
      )}

      {showInput ? (
        /* Script input */
        <div style={S.inputArea}>
          <h3 style={S.inputTitle}>Enter Your Script</h3>
          <p style={S.inputHint}>Paste your script below. Each paragraph becomes a section. Use blank lines to add pauses.</p>
          <textarea
            style={S.textarea}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Type or paste your script here...&#10;&#10;Each paragraph will scroll smoothly.&#10;&#10;Use blank lines for natural pauses."
            rows={12}
          />
          <div style={S.inputActions}>
            <span style={S.wordCount}>{script.split(/\s+/).filter(Boolean).length} words · ~{Math.ceil(script.split(/\s+/).filter(Boolean).length / 130)} min read</span>
            <button style={{ ...S.loadBtn, ...(!script.trim() ? S.loadBtnDisabled : {}) }} onClick={handleLoadScript} disabled={!script.trim()}>
              Load Script →
            </button>
          </div>
        </div>
      ) : (
        /* Teleprompter display */
        <div style={{ ...S.display, transform: mirror ? "scaleX(-1)" : "none" }}>
          {/* Fade top */}
          <div style={S.fadeTop} />

          {/* Reading line */}
          <div style={S.readingLine} />

          {/* Scrolling text */}
          <div ref={scrollRef} style={S.scrollArea}>
            <div style={S.textPad} />
            {lines.map((line, i) => (
              <p key={i} style={{ ...S.line, fontSize: `${fontSize}px` }}>
                {line}
              </p>
            ))}
            <div style={S.textPad} />
          </div>

          {/* Fade bottom */}
          <div style={S.fadeBottom} />
        </div>
      )}
    </div>
  );
};

const S = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.97)", zIndex: 2000, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" },
  bar: { display: "flex", alignItems: "center", gap: "16px", padding: "12px 20px", background: "rgba(10,16,24,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, flexWrap: "wrap" },
  barLeft: { display: "flex", alignItems: "center", gap: "12px" },
  barTitle: { color: "#00ffc8", fontWeight: "800", fontSize: "0.92rem", fontFamily: "monospace" },
  recBadge: { background: "rgba(255,68,68,0.15)", color: "#ff4444", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "800", animation: "blink 1s infinite" },
  barControls: { display: "flex", alignItems: "center", gap: "10px", flex: 1, flexWrap: "wrap" },
  ctrl: { padding: "7px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#8090a0", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer" },
  ctrlActive: { background: "rgba(0,255,200,0.1)", borderColor: "rgba(0,255,200,0.28)", color: "#00ffc8" },
  ctrlGroup: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" },
  ctrlLabel: { color: "#4a6070", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase" },
  ctrlSmall: { background: "none", border: "none", color: "#8090a0", fontSize: "1rem", cursor: "pointer", padding: "0 4px", lineHeight: 1 },
  ctrlValue: { color: "#e0eaf0", fontSize: "0.84rem", fontWeight: "700", minWidth: "28px", textAlign: "center" },
  closeBtn: { marginLeft: "auto", background: "none", border: "none", color: "#4a6070", fontSize: "1.2rem", cursor: "pointer", padding: "4px 8px" },
  progressBar: { height: "3px", background: "rgba(255,255,255,0.04)", flexShrink: 0 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #00ffc8, #00d9aa)", transition: "width 0.1s linear" },
  inputArea: { flex: 1, display: "flex", flexDirection: "column", padding: "40px 20%", gap: "16px", overflowY: "auto" },
  inputTitle: { color: "#e0eaf0", fontSize: "1.4rem", fontWeight: "800", margin: 0 },
  inputHint: { color: "#4a6070", fontSize: "0.88rem", margin: 0 },
  textarea: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px", color: "#e0eaf0", fontSize: "1rem", lineHeight: 1.7, resize: "vertical", outline: "none", fontFamily: "inherit" },
  inputActions: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  wordCount: { color: "#4a6070", fontSize: "0.8rem" },
  loadBtn: { padding: "13px 28px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "12px", color: "#041014", fontWeight: "800", fontSize: "0.95rem", cursor: "pointer" },
  loadBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  display: { flex: 1, position: "relative", overflow: "hidden" },
  fadeTop: { position: "absolute", top: 0, left: 0, right: 0, height: "140px", background: "linear-gradient(to bottom, rgba(0,0,0,0.97), transparent)", zIndex: 2, pointerEvents: "none" },
  fadeBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "140px", background: "linear-gradient(to top, rgba(0,0,0,0.97), transparent)", zIndex: 2, pointerEvents: "none" },
  readingLine: { position: "absolute", top: "50%", left: "8%", right: "8%", height: "2px", background: "rgba(0,255,200,0.25)", zIndex: 3, pointerEvents: "none", boxShadow: "0 0 20px rgba(0,255,200,0.15)" },
  scrollArea: { width: "100%", height: "100%", overflowY: "scroll", scrollbarWidth: "none", msOverflowStyle: "none" },
  textPad: { height: "50vh" },
  line: { color: "#ffffff", lineHeight: 1.7, textAlign: "center", padding: "0 15%", margin: "0 0 0.6em", fontWeight: "600", letterSpacing: "0.02em" },
};

export default Teleprompter;