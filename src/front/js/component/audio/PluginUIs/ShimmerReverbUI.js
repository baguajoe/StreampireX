// ============================================================
// ShimmerReverbUI.js — Ethereal pitch-shifted reverb
// Hardware-styled reverb UI. Built on shared HardwareUI primitives.
// ============================================================
//
// Aesthetic: ethereal purple/magenta gradient with animated drifting
// shimmer particles overlay. Cursive flowing "SHIMMER" header.
//
// DSP keys (matching PLUGIN_DEFAULTS.shimmer):
//   { decay: 3.5, shimmer: 0.6, octave: 1, damping: 0.4, mix: 30 }
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import ButtonBank from "../HardwareUI/ButtonBank";
import useAnalyserValue from "../HardwareUI/useAnalyserValue";

const ACCENT = "#a040ff"; // purple/magenta
const DEFAULTS = {
  decay: 3.5,
  shimmer: 0.6,
  octave: 1,
  damping: 0.4,
  mix: 30,
};

// Animated drifting particles tied to shimmer intensity.
function ShimmerParticles({ intensity = 0.6 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = canvas.offsetWidth * 2);
    const H = (canvas.height = canvas.offsetHeight * 2);
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;

    // Init 12 particles
    const N = 12;
    particlesRef.current = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 2.5,
      vy: -(0.2 + Math.random() * 0.6),
      vx: (Math.random() - 0.5) * 0.2,
      hue: 270 + Math.random() * 60,
      phase: Math.random() * Math.PI * 2,
    }));

    const tick = () => {
      const I = intensityRef.current;
      ctx.clearRect(0, 0, W, H);
      const particles = particlesRef.current;
      const t = performance.now() * 0.001;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.vy * (0.5 + I * 1.5);
        p.x += p.vx;
        // Wrap to bottom when reaches top
        if (p.y < -10) {
          p.y = H + 5;
          p.x = Math.random() * W;
        }
        if (p.x < -10) p.x = W + 5;
        if (p.x > W + 10) p.x = -5;
        const alpha = (0.2 + I * 0.6) * (0.5 + 0.5 * Math.sin(t * 1.3 + p.phase));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`);
        grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
        // Bright core
        ctx.fillStyle = `hsla(${p.hue}, 100%, 90%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        borderRadius: 6,
        mixBlendMode: "screen",
      }}
    />
  );
}

export default function ShimmerReverbUI({ params, onChange, onClose, getInstance }) {
  const [s, setS] = useState({ ...DEFAULTS, ...(params || {}) });
  useEffect(() => {
    if (typeof onChange === "function") onChange(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  // Particle intensity = shimmer-knob × live output level. Particles only
  // animate when audio is flowing; shimmer knob still scales overall density.
  const liveOut = useAnalyserValue(() => getInstance && getInstance()?.meters?.analyserOut);
  const particleIntensity = Math.min(1, s.shimmer * (0.2 + liveOut * 1.5));

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 360,
        zIndex: 1000,
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 6,
          background:
            "linear-gradient(135deg, #2a0040 0%, #6020a0 50%, #a040ff 100%)",
          boxShadow: "0 6px 18px rgba(160,64,255,0.45)",
        }}
      >
        {/* Particles overlay (absolute) */}
        <ShimmerParticles intensity={particleIntensity} />

        <HardwarePanel
          skin="vintage-cream"
          accentColor={ACCENT}
          padding={14}
          screws={true}
        >
          {/* Translucent inner overlay so cream skin reads as ethereal */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 6,
              background:
                "linear-gradient(135deg, rgba(42,0,64,0.78) 0%, rgba(96,32,160,0.72) 50%, rgba(160,64,255,0.55) 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Content above overlay */}
          <div style={{ position: "relative", zIndex: 2 }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: `1px solid #ffffff44`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 400,
                    color: "#fff",
                    fontStyle: "italic",
                    letterSpacing: 2,
                    fontFamily: "'Georgia', 'Brush Script MT', cursive, serif",
                    textShadow:
                      "0 0 6px #ffffff66, 0 0 12px #a040ff99, 0 1px 0 rgba(0,0,0,0.4)",
                  }}
                >
                  Shimmer
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "#e8d4ff",
                    letterSpacing: 3,
                    marginTop: -2,
                  }}
                >
                  ETHEREAL VERB
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: `1px solid #ffffff66`,
                  borderRadius: "50%",
                  fontSize: 14,
                  cursor: "pointer",
                  width: 24,
                  height: 24,
                  lineHeight: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Octave selector */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 8,
                    color: "#e8d4ff",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  Pitch Shift
                </div>
                <ButtonBank
                  options={[
                    { value: 0, label: "0" },
                    { value: 1, label: "+1 OCT" },
                    { value: 2, label: "+2 OCT" },
                  ]}
                  value={s.octave}
                  onChange={set("octave")}
                  style="hardware"
                  size={26}
                  accentColor={ACCENT}
                />
              </div>
            </div>

            {/* Knob row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                marginBottom: 12,
                padding: 10,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(2px)",
              }}
            >
              <AnalogKnob
                value={s.decay}
                min={0.5}
                max={10}
                step={0.1}
                onChange={set("decay")}
                style="vintage"
                size={52}
                color="#3a0a5a"
                indicatorColor="#fff"
                accentColor={ACCENT}
                label="Decay"
                valueLabel={`${s.decay.toFixed(1)}s`}
              />
              <AnalogKnob
                value={s.shimmer}
                min={0}
                max={1}
                step={0.01}
                onChange={set("shimmer")}
                style="vintage"
                size={52}
                color="#5a1a8a"
                indicatorColor="#fff"
                accentColor={ACCENT}
                label="Shimmer"
                valueLabel={s.shimmer.toFixed(2)}
              />
              <AnalogKnob
                value={s.damping}
                min={0}
                max={1}
                step={0.01}
                onChange={set("damping")}
                style="vintage"
                size={52}
                color="#3a0a5a"
                indicatorColor="#fff"
                accentColor={ACCENT}
                label="Damping"
                valueLabel={s.damping.toFixed(2)}
              />
              <AnalogKnob
                value={s.mix}
                min={0}
                max={100}
                step={1}
                onChange={set("mix")}
                style="vintage"
                size={52}
                color="#5a1a8a"
                indicatorColor="#fff"
                accentColor={ACCENT}
                label="Mix"
                valueLabel={`${Math.round(s.mix)}%`}
              />
            </div>

            {/* Inspirational tag */}
            <div
              style={{
                textAlign: "center",
                fontSize: 9,
                color: "#e8d4ff",
                letterSpacing: 4,
                fontStyle: "italic",
                opacity: 0.75,
                paddingBottom: 4,
              }}
            >
              ✦ infinite skies ✦
            </div>
          </div>
        </HardwarePanel>
      </div>
    </div>
  );
}
