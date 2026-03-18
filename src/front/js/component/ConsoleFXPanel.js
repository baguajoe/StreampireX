import React, { useEffect, useRef, useMemo } from "react";

// =============================================================================
// ConsoleFXPanel.js — StreamPireX Pro Analog Rack / Channel Strip
// =============================================================================

const C = {
  bg: "#0a1018",
  bg2: "#0f1824",
  panel: "#111b29",
  panel2: "#162233",
  line: "#1f2c3d",
  line2: "#28384d",
  txt: "#6f849d",
  txt2: "#9bb2c9",
  white: "#ddeeff",
  cyan: "#5ac8fa",
  green: "#4caf50",
  red: "#e53935",
  yellow: "#fbc02d",
  orange: "#ff9800",
  teal: "#00bcd4",
  purple: "#af52de",
};

const W = 256;
const H = 120;

const setupCanvas = (canvas, w, h) => {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  return ctx;
};

const f2x = (f, w) =>
  ((Math.log10(Math.max(20, f)) - Math.log10(20)) /
    (Math.log10(20000) - Math.log10(20))) *
  w;

const g2y = (g, h) => h / 2 - (g / 24) * h;

const P = ({ label, children, value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
    <label
      style={{
        fontSize: "0.6rem",
        color: C.txt,
        width: 56,
        minWidth: 56,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        fontWeight: 800,
      }}
    >
      {label}
    </label>
    <div style={{ flex: 1 }}>{children}</div>
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.58rem",
        color: C.txt2,
        width: 62,
        minWidth: 62,
        textAlign: "right",
      }}
    >
      {value}
    </span>
  </div>
);

const Slider = ({ min, max, step, value, onChange, color = C.cyan, label = "", fmt }) => {
  const dragging = React.useRef(false);
  const startY = React.useRef(0);
  const startVal = React.useRef(value);
  const size = 42;
  const r = size / 2;
  const cx = r;
  const cy = r;
  const norm = (v) => (v - min) / (max - min);
  const angle = -135 + norm(value) * 270;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcR = r - 4;
  const pointerR = r - 6;
  const px = cx + Math.sin(toRad(angle)) * pointerR;
  const py = cy - Math.cos(toRad(angle)) * pointerR;
  const startAngle = -135;
  const arcStart = {
    x: cx + Math.sin(toRad(startAngle)) * arcR,
    y: cy - Math.cos(toRad(startAngle)) * arcR,
  };
  const arcEnd = {
    x: cx + Math.sin(toRad(angle)) * arcR,
    y: cy - Math.cos(toRad(angle)) * arcR,
  };
  const largeArc = angle - startAngle > 180 ? 1 : 0;

  const handleMouseDown = React.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      startY.current = e.clientY;
      startVal.current = value;

      const onMove = (e2) => {
        if (!dragging.current) return;
        const dy = startY.current - e2.clientY;
        const newVal = Math.min(max, Math.max(min, startVal.current + (dy * (max - min)) / 150));
        onChange(parseFloat((Math.round(newVal / step) * step).toFixed(4)));
      };

      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [value, min, max, step, onChange]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onMouseDown={handleMouseDown}
        style={{ cursor: "ns-resize", userSelect: "none", display: "block" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={arcR}
          fill="none"
          stroke="#1a2838"
          strokeWidth={2.5}
          strokeDasharray={`${arcR * Math.PI * 1.5} ${arcR * Math.PI * 0.5}`}
          transform={`rotate(-225 ${cx} ${cy})`}
        />
        {norm(value) > 0.001 && (
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
        <circle cx={cx} cy={cy} r={2.5} fill="#0a1018" stroke="#2a3848" strokeWidth={1} />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </svg>
      {fmt && (
        <span style={{ color, fontSize: "0.58rem", fontFamily: "monospace", fontWeight: 700 }}>
          {fmt(value)}
        </span>
      )}
      {label && <span style={{ color: C.txt, fontSize: "0.55rem", textAlign: "center" }}>{label}</span>}
    </div>
  );
};

const Sel = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: "100%",
      padding: "4px 6px",
      background: "#0f1820",
      border: "1px solid #1a2838",
      borderRadius: 6,
      color: C.white,
      fontSize: "0.65rem",
      fontFamily: "inherit",
      outline: "none",
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

// =============================================================================
// GRAPHS
// =============================================================================

const EQGraph = ({ eq, width = W, height = H }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = setupCanvas(ref.current, width, height);
    if (!ctx) return;
    const p = 6;
    const pw = width - p * 2;
    const ph = height - p * 2;

    ctx.strokeStyle = "rgba(90,200,250,0.06)";
    ctx.lineWidth = 0.5;
    [50, 100, 500, 1000, 5000, 10000].forEach((f) => {
      const x = p + f2x(f, pw);
      ctx.beginPath();
      ctx.moveTo(x, p);
      ctx.lineTo(x, p + ph);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(90,200,250,0.12)";
    ctx.beginPath();
    ctx.moveTo(p, p + ph / 2);
    ctx.lineTo(p + pw, p + ph / 2);
    ctx.stroke();

    const bands = [
      { freq: 320, gain: eq.lowGain || 0, bw: 2.5, color: C.cyan },
      { freq: eq.midFreq || 1000, gain: eq.midGain || 0, bw: 1.5, color: C.green },
      { freq: 3200, gain: eq.highGain || 0, bw: 2.5, color: C.orange },
    ];

    ctx.beginPath();
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2;
    for (let px = 0; px <= pw; px++) {
      const freq = Math.pow(10, (px / pw) * (Math.log10(20000) - Math.log10(20)) + Math.log10(20));
      let g = 0;
      bands.forEach((b) => {
        g += b.gain * Math.exp(-0.5 * Math.pow(Math.log2(freq / b.freq) / (b.bw / 2), 2));
      });
      const x = p + px;
      const y = p + g2y(g, ph);
      px === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.lineTo(p + pw, p + ph / 2);
    ctx.lineTo(p, p + ph / 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(90,200,250,0.05)";
    ctx.fill();

    bands.forEach((b) => {
      const x = p + f2x(b.freq, pw);
      const y = p + g2y(b.gain, ph);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.fillStyle = C.txt;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";
    [["20", 20], ["100", 100], ["1k", 1000], ["10k", 10000]].forEach(([l, f]) => {
      ctx.fillText(l, p + f2x(f, pw), height - 1);
    });
  }, [eq, width, height]);

  return <canvas ref={ref} style={{ width, height, borderRadius: 6, display: "block" }} />;
};

const CompGraph = ({ comp, width = W, height = H }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = setupCanvas(ref.current, width, height);
    if (!ctx) return;
    const p = 16;
    const pw = width - p * 2;
    const ph = height - p * 2;
    const thresh = comp.threshold ?? -24;
    const ratio = comp.ratio ?? 4;

    ctx.strokeStyle = "rgba(90,200,250,0.06)";
    ctx.lineWidth = 0.5;
    for (let db = -48; db <= 0; db += 12) {
      const n = (db + 48) / 48;
      ctx.beginPath();
      ctx.moveTo(p + n * pw, p);
      ctx.lineTo(p + n * pw, p + ph);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p, p + ph - n * ph);
      ctx.lineTo(p + pw, p + ph - n * ph);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(90,200,250,0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(p, p + ph);
    ctx.lineTo(p + pw, p);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= pw; i++) {
      const inDb = (i / pw) * 48 - 48;
      const outDb = inDb <= thresh ? inDb : thresh + (inDb - thresh) / ratio;
      const x = p + i;
      const y = p + ph - ((outDb + 48) / 48) * ph;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    const tx = p + ((thresh + 48) / 48) * pw;
    ctx.strokeStyle = C.yellow;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(tx, p);
    ctx.lineTo(tx, p + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    const grDb = Math.min(0, thresh) * (1 - 1 / ratio);
    const grH = Math.abs(grDb / 24) * ph;
    ctx.fillStyle = "rgba(229,57,53,0.3)";
    ctx.fillRect(width - 10, p, 6, grH);
    ctx.fillStyle = C.red;
    ctx.fillRect(width - 10, p, 6, 2);

    ctx.fillStyle = C.txt;
    ctx.font = "7px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";
    ctx.fillText("IN", p + pw / 2, height - 2);
    ctx.save();
    ctx.translate(6, p + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("OUT", 0, 0);
    ctx.restore();
    ctx.fillStyle = C.yellow;
    ctx.fillText(`${thresh}dB`, tx, p - 3);
    ctx.fillStyle = C.teal;
    ctx.textAlign = "right";
    ctx.fillText(`${ratio}:1`, width - 14, p + ph - 4);
  }, [comp, width, height]);

  return <canvas ref={ref} style={{ width, height, borderRadius: 6, display: "block" }} />;
};

const ReverbGraph = ({ reverb, width = W, height = 80 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = setupCanvas(ref.current, width, height);
    if (!ctx) return;
    const p = 8;
    const pw = width - p * 2;
    const ph = height - p * 2;
    const decay = reverb.decay || 2;
    const mix = reverb.mix || 0.2;

    ctx.strokeStyle = "rgba(90,200,250,0.06)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p, p + ph);
    ctx.lineTo(p + pw, p + ph);
    ctx.stroke();

    ctx.strokeStyle = C.purple;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const x = p + (i / 8) * pw * 0.15;
      const h2 = ph * mix * (1 - i * 0.1) * (0.7 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.moveTo(x, p + ph);
      ctx.lineTo(x, p + ph - h2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = C.purple;
    ctx.lineWidth = 2;
    const startX = p + pw * 0.15;
    for (let i = 0; i <= pw * 0.85; i++) {
      const t = i / (pw * 0.85);
      const amp = mix * Math.exp(-3 * t / Math.max(0.1, decay / 5));
      const noise = (Math.random() - 0.5) * amp * 0.3;
      const x = startX + i;
      const y = p + ph - (amp + noise) * ph;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.lineTo(p + pw, p + ph);
    ctx.lineTo(startX, p + ph);
    ctx.closePath();
    ctx.fillStyle = "rgba(175,82,222,0.08)";
    ctx.fill();

    ctx.fillStyle = C.txt;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.fillText("ER", p + pw * 0.07, p + 8);
    ctx.fillText(`${decay.toFixed(1)}s`, p + pw * 0.6, p + 8);
  }, [reverb, width, height]);

  return <canvas ref={ref} style={{ width, height, borderRadius: 6, display: "block" }} />;
};

const DelayGraph = ({ delay, width = W, height = 80 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = setupCanvas(ref.current, width, height);
    if (!ctx) return;
    const p = 8;
    const pw = width - p * 2;
    const ph = height - p * 2;
    const time = delay.time || 0.3;
    const fb = delay.feedback || 0.3;
    const mix = delay.mix || 0.2;
    const maxTime = 3;

    ctx.strokeStyle = "rgba(90,200,250,0.06)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p, p + ph);
    ctx.lineTo(p + pw, p + ph);
    ctx.stroke();

    ctx.fillStyle = C.white;
    ctx.fillRect(p + 2, p + ph * (1 - 0.9), 4, ph * 0.9);

    let amp = mix;
    for (let tap = 1; tap <= 8; tap++) {
      const t = time * tap;
      if (t > maxTime) break;
      const x = p + (t / maxTime) * pw;
      const barH = ph * amp;
      ctx.fillStyle = `rgba(255,152,0,${0.3 + amp * 0.7})`;
      ctx.fillRect(x, p + ph - barH, 4, barH);
      amp *= fb;
      if (amp < 0.01) break;
    }

    ctx.fillStyle = C.txt;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.fillText("DRY", p + 1, p + 8);
    ctx.fillStyle = C.orange;
    ctx.fillText(`${(time * 1000).toFixed(0)}ms`, p + (time / maxTime) * pw, p + 8);
  }, [delay, width, height]);

  return <canvas ref={ref} style={{ width, height, borderRadius: 6, display: "block" }} />;
};

const FilterGraph = ({ filter, width = W, height = H }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = setupCanvas(ref.current, width, height);
    if (!ctx) return;
    const p = 6;
    const pw = width - p * 2;
    const ph = height - p * 2;
    const freq = filter.frequency || 1000;
    const Q = filter.Q || 1;
    const type = filter.type || "lowpass";

    ctx.strokeStyle = "rgba(90,200,250,0.06)";
    ctx.lineWidth = 0.5;
    [100, 1000, 10000].forEach((f) => {
      const x = p + f2x(f, pw);
      ctx.beginPath();
      ctx.moveTo(x, p);
      ctx.lineTo(x, p + ph);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(90,200,250,0.12)";
    ctx.beginPath();
    ctx.moveTo(p, p + ph / 2);
    ctx.lineTo(p + pw, p + ph / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = C.purple;
    ctx.lineWidth = 2;
    for (let px = 0; px <= pw; px++) {
      const f = Math.pow(10, (px / pw) * (Math.log10(20000) - Math.log10(20)) + Math.log10(20));
      const ratio = f / freq;
      let response = 0;

      if (type === "lowpass") {
        response = -10 * Math.log10(1 + Math.pow(ratio, 4) * Math.pow(Q, -2));
        if (ratio > 0.7 && ratio < 1.3) response += Q * 2 * Math.exp(-Math.pow((ratio - 1) * 4, 2));
      } else if (type === "highpass") {
        response = -10 * Math.log10(1 + Math.pow(1 / ratio, 4) * Math.pow(Q, -2));
        if (ratio > 0.7 && ratio < 1.3) response += Q * 2 * Math.exp(-Math.pow((ratio - 1) * 4, 2));
      } else if (type === "bandpass") {
        const bw = 1 / Q;
        response = -10 * Math.log10(1 + Math.pow((ratio - 1 / ratio) / bw, 2));
      } else if (type === "notch") {
        const bw = 1 / Q;
        const notch = Math.pow((ratio - 1 / ratio) / bw, 2);
        response = 10 * Math.log10(notch / (1 + notch));
      }

      response = Math.max(-24, Math.min(12, response));
      const x = p + px;
      const y = p + g2y(response, ph);
      px === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.lineTo(p + pw, p + ph / 2);
    ctx.lineTo(p, p + ph / 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(175,82,222,0.06)";
    ctx.fill();

    const fx = p + f2x(freq, pw);
    ctx.strokeStyle = C.purple;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(fx, p);
    ctx.lineTo(fx, p + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = C.purple;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";
    const fLabel = freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${freq}`;
    ctx.fillText(fLabel, fx, p - 1);
  }, [filter, width, height]);

  return <canvas ref={ref} style={{ width, height, borderRadius: 6, display: "block" }} />;
};

const DistGraph = ({ distortion, width = W, height = 80 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = setupCanvas(ref.current, width, height);
    if (!ctx) return;
    const p = 12;
    const pw = width - p * 2;
    const ph = height - p * 2;
    const amt = distortion.amount || 0;

    ctx.strokeStyle = "rgba(90,200,250,0.06)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p + pw / 2, p);
    ctx.lineTo(p + pw / 2, p + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p, p + ph / 2);
    ctx.lineTo(p + pw, p + ph / 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(90,200,250,0.12)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p, p + ph);
    ctx.lineTo(p + pw, p);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 2;
    for (let i = 0; i <= pw; i++) {
      const x = (i / pw) * 2 - 1;
      const k = amt * 0.5;
      const shaped = k > 0 ? ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)) : x;
      const y = p + ph / 2 - (shaped * ph) / 2.5;
      i === 0 ? ctx.moveTo(p + i, y) : ctx.lineTo(p + i, y);
    }
    ctx.stroke();

    ctx.fillStyle = C.txt;
    ctx.font = "7px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";
    ctx.fillText("IN", p + pw / 2, height - 1);
    ctx.save();
    ctx.translate(5, p + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("OUT", 0, 0);
    ctx.restore();
  }, [distortion, width, height]);

  return <canvas ref={ref} style={{ width, height, borderRadius: 6, display: "block" }} />;
};

const TapeGraph = ({ tape, width = W, height = 82 }) => {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = setupCanvas(ref.current, width, height);
    if (!ctx) return;

    const p = 10;
    const pw = width - p * 2;
    const ph = height - p * 2;
    const drive = tape.drive ?? 0.3;
    const warmth = tape.warmth ?? 0.5;

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p, p + ph / 2);
    ctx.lineTo(p + pw, p + ph / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p + pw / 2, p);
    ctx.lineTo(p + pw / 2, p + ph);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = C.yellow;
    ctx.lineWidth = 2.2;
    for (let i = 0; i <= pw; i++) {
      const x = (i / pw) * 2 - 1;
      const k = 1 + drive * 8;
      const sat = Math.tanh(x * k) * (0.92 - warmth * 0.12);
      const y = p + ph / 2 - sat * (ph / 2.2);
      i === 0 ? ctx.moveTo(p + i, y) : ctx.lineTo(p + i, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(251,192,45,0.25)";
    for (let i = 0; i <= pw; i++) {
      const x = p + i;
      const flutter = Math.sin(i / 8) * (warmth * 2.2);
      const y = p + ph * 0.78 + flutter;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = C.txt;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.fillText("TAPE", p + 2, p + 8);
    ctx.fillStyle = C.yellow;
    ctx.fillText(`DRV ${Math.round(drive * 100)}%`, width - 78, p + 8);
    ctx.fillText(`WRM ${Math.round(warmth * 100)}%`, width - 78, p + 18);
  }, [tape, width, height]);

  return <canvas ref={ref} style={{ width, height, borderRadius: 6, display: "block" }} />;
};

// =============================================================================
// UI HELPERS
// =============================================================================

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  fontSize: "0.8rem",
  fontWeight: 800,
  color: C.white,
  letterSpacing: 0.2,
};

const cardStyle = {
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  background: `linear-gradient(180deg, ${C.panel2}, ${C.panel})`,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  padding: "8px 10px",
};

const miniBadge = (label, value, color = C.cyan) => (
  <div
    style={{
      minWidth: 78,
      padding: "6px 8px",
      borderRadius: 8,
      border: `1px solid ${C.line2}`,
      background: "#0d1520",
    }}
  >
    <div style={{ color: C.txt, fontSize: "0.52rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
      {label}
    </div>
    <div style={{ color, fontSize: "0.68rem", fontWeight: 800, marginTop: 2 }}>{value}</div>
  </div>
);

const AnalogRackSummary = ({ fx = {} }) => {
  const active = useMemo(() => {
    const items = [];
    if (fx.tapeSaturation?.enabled) items.push("Tape");
    if (fx.exciter?.enabled) items.push("Exciter");
    if (fx.distortion?.enabled) items.push("Drive");
    if (fx.filter?.enabled) items.push("Filter");
    if (fx.compressor?.enabled) items.push("Comp");
    if (fx.eq?.enabled) items.push("EQ");
    return items;
  }, [fx]);

  return (
    <div
      style={{
        ...cardStyle,
        marginBottom: 10,
        background: "linear-gradient(180deg, #182434, #101925)",
        border: "1px solid #2b3e56",
      }}
    >
      <div style={{ ...sectionHeaderStyle, marginBottom: 10 }}>
        <span style={{ color: C.yellow }}>◉</span>
        Analog Rack
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {miniBadge("Drive", `${Math.round((fx.tapeSaturation?.drive ?? 0) * 100)}%`, C.yellow)}
        {miniBadge("Warmth", `${Math.round((fx.tapeSaturation?.warmth ?? 0) * 100)}%`, C.orange)}
        {miniBadge("Exciter", `${Math.round(fx.exciter?.amount ?? 0)}`, C.orange)}
        {miniBadge("Output", `${fx.gainUtility?.gain ?? 0}dB`, C.white)}
      </div>

      <TapeGraph tape={fx.tapeSaturation || {}} />

      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {active.length ? (
          active.map((a) => (
            <span
              key={a}
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(251,192,45,0.08)",
                border: "1px solid rgba(251,192,45,0.18)",
                color: "#ffe18a",
                fontSize: "0.58rem",
                fontWeight: 800,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {a}
            </span>
          ))
        ) : (
          <span style={{ color: C.txt, fontSize: "0.62rem" }}>No analog stages active yet</span>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN
// =============================================================================

const ConsoleFXPanel = ({ track, trackIndex, updateEffect, onClose, openFxKey }) => {
  if (!track) return null;

  const fx = track.effects || {};
  const u = (fxKey, param, val) => updateEffect(trackIndex, fxKey, param, val);

  const blockStyle = (enabled, key) => ({
    ...cardStyle,
    display: openFxKey && openFxKey !== key ? "none" : "block",
    opacity: enabled ? 1 : 0.48,
    marginBottom: 10,
  });

  const toggleStyle = (enabled, color) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: enabled ? color : C.txt,
    padding: 0,
    transition: "color 0.15s",
  });

  const panelStyle = {
    overflowY: "auto",
    maxHeight: "78vh",
    minWidth: 338,
    background: "linear-gradient(180deg, #0c131d, #090f17)",
    color: C.white,
    borderRadius: 12,
  };

  const headerBarStyle = {
    position: "sticky",
    top: 0,
    zIndex: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderBottom: `1px solid ${C.line}`,
    background: "linear-gradient(180deg, #121c29, #0d1520)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
  };

  return (
    <div className="daw-fx-panel" style={panelStyle}>
      <div className="daw-fx-header" style={headerBarStyle}>
        <div>
          <div style={{ fontSize: "0.84rem", fontWeight: 900, color: C.white }}>
            FX — {track.name || `Track ${trackIndex + 1}`}
          </div>
          <div style={{ color: C.txt, fontSize: "0.62rem", marginTop: 2 }}>
            Channel strip / analog rack
          </div>
        </div>
        <button
          className="daw-fx-close"
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: `1px solid ${C.line2}`,
            background: "#0d1520",
            color: C.white,
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: 10 }}>
        <AnalogRackSummary fx={fx} />

        {/* EQ */}
        <div style={blockStyle(fx.eq?.enabled, "eq")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.eq?.enabled, C.cyan)} onClick={() => u("eq", "enabled", !fx.eq?.enabled)}>
              {fx.eq?.enabled ? "●" : "○"}
            </button>
            EQ
          </div>
          <EQGraph eq={fx.eq || {}} />
          {fx.eq?.enabled && (
            <div style={{ marginTop: 6 }}>
              <P label="Low" value={`${fx.eq.lowGain || 0}dB`}>
                <Slider min={-12} max={12} step={0.5} value={fx.eq.lowGain || 0} onChange={(v) => u("eq", "lowGain", v)} />
              </P>
              <P label="Mid" value={`${fx.eq.midGain || 0}dB`}>
                <Slider min={-12} max={12} step={0.5} value={fx.eq.midGain || 0} onChange={(v) => u("eq", "midGain", v)} color={C.green} />
              </P>
              <P label="Mid Hz" value={fx.eq.midFreq || 1000}>
                <Slider min={200} max={8000} step={10} value={fx.eq.midFreq || 1000} onChange={(v) => u("eq", "midFreq", v)} color={C.green} />
              </P>
              <P label="High" value={`${fx.eq.highGain || 0}dB`}>
                <Slider min={-12} max={12} step={0.5} value={fx.eq.highGain || 0} onChange={(v) => u("eq", "highGain", v)} color={C.orange} />
              </P>
            </div>
          )}
        </div>

        {/* Compressor */}
        <div style={blockStyle(fx.compressor?.enabled, "compressor")}>
          <div style={sectionHeaderStyle}>
            <button
              style={toggleStyle(fx.compressor?.enabled, C.teal)}
              onClick={() => u("compressor", "enabled", !fx.compressor?.enabled)}
            >
              {fx.compressor?.enabled ? "●" : "○"}
            </button>
            Compressor
          </div>
          <CompGraph comp={fx.compressor || {}} />
          {fx.compressor?.enabled && (
            <div style={{ marginTop: 6 }}>
              <P label="Thresh" value={`${fx.compressor.threshold}dB`}>
                <Slider min={-60} max={0} step={1} value={fx.compressor.threshold} onChange={(v) => u("compressor", "threshold", v)} color={C.yellow} />
              </P>
              <P label="Ratio" value={`${fx.compressor.ratio}:1`}>
                <Slider min={1} max={20} step={0.5} value={fx.compressor.ratio} onChange={(v) => u("compressor", "ratio", v)} color={C.teal} />
              </P>
              <P label="Attack" value={`${(fx.compressor.attack * 1000).toFixed(0)}ms`}>
                <Slider min={0.001} max={0.1} step={0.001} value={fx.compressor.attack} onChange={(v) => u("compressor", "attack", v)} color={C.teal} />
              </P>
              <P label="Release" value={`${(fx.compressor.release * 1000).toFixed(0)}ms`}>
                <Slider min={0.01} max={1} step={0.01} value={fx.compressor.release} onChange={(v) => u("compressor", "release", v)} color={C.teal} />
              </P>
            </div>
          )}
        </div>

        {/* Reverb */}
        <div style={blockStyle(fx.reverb?.enabled, "reverb")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.reverb?.enabled, C.purple)} onClick={() => u("reverb", "enabled", !fx.reverb?.enabled)}>
              {fx.reverb?.enabled ? "●" : "○"}
            </button>
            Reverb
          </div>
          <ReverbGraph reverb={fx.reverb || {}} />
          {fx.reverb?.enabled && (
            <div style={{ marginTop: 6 }}>
              <P label="Mix" value={`${Math.round((fx.reverb.mix || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.reverb.mix || 0} onChange={(v) => u("reverb", "mix", v)} color={C.purple} />
              </P>
              <P label="Decay" value={`${fx.reverb.decay || 2}s`}>
                <Slider min={0.1} max={10} step={0.1} value={fx.reverb.decay || 2} onChange={(v) => u("reverb", "decay", v)} color={C.purple} />
              </P>
            </div>
          )}
        </div>

        {/* Delay */}
        <div style={blockStyle(fx.delay?.enabled, "delay")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.delay?.enabled, C.orange)} onClick={() => u("delay", "enabled", !fx.delay?.enabled)}>
              {fx.delay?.enabled ? "●" : "○"}
            </button>
            Delay
          </div>
          <DelayGraph delay={fx.delay || {}} />
          {fx.delay?.enabled && (
            <div style={{ marginTop: 6 }}>
              <P label="Time" value={`${((fx.delay.time || 0.3) * 1000).toFixed(0)}ms`}>
                <Slider min={0.01} max={2} step={0.01} value={fx.delay.time || 0.3} onChange={(v) => u("delay", "time", v)} color={C.orange} />
              </P>
              <P label="Feedbk" value={`${Math.round((fx.delay.feedback || 0) * 100)}%`}>
                <Slider min={0} max={0.9} step={0.01} value={fx.delay.feedback || 0} onChange={(v) => u("delay", "feedback", v)} color={C.orange} />
              </P>
              <P label="Mix" value={`${Math.round((fx.delay.mix || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.delay.mix || 0} onChange={(v) => u("delay", "mix", v)} color={C.orange} />
              </P>
            </div>
          )}
        </div>

        {/* Filter */}
        <div style={blockStyle(fx.filter?.enabled, "filter")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.filter?.enabled, C.purple)} onClick={() => u("filter", "enabled", !fx.filter?.enabled)}>
              {fx.filter?.enabled ? "●" : "○"}
            </button>
            Filter
          </div>
          <FilterGraph filter={fx.filter || {}} />
          {fx.filter?.enabled && (
            <div style={{ marginTop: 6 }}>
              <P label="Type" value="">
                <Sel
                  value={fx.filter.type || "lowpass"}
                  onChange={(v) => u("filter", "type", v)}
                  options={[
                    { value: "lowpass", label: "Lowpass" },
                    { value: "highpass", label: "Highpass" },
                    { value: "bandpass", label: "Bandpass" },
                    { value: "notch", label: "Notch" },
                  ]}
                />
              </P>
              <P label="Freq" value={`${fx.filter.frequency || 1000}Hz`}>
                <Slider min={20} max={20000} step={1} value={fx.filter.frequency || 1000} onChange={(v) => u("filter", "frequency", v)} color={C.purple} />
              </P>
              <P label="Q" value={fx.filter.Q || 1}>
                <Slider min={0.1} max={20} step={0.1} value={fx.filter.Q || 1} onChange={(v) => u("filter", "Q", v)} color={C.purple} />
              </P>
            </div>
          )}
        </div>

        {/* Distortion */}
        <div style={blockStyle(fx.distortion?.enabled, "distortion")}>
          <div style={sectionHeaderStyle}>
            <button
              style={toggleStyle(fx.distortion?.enabled, C.red)}
              onClick={() => u("distortion", "enabled", !fx.distortion?.enabled)}
            >
              {fx.distortion?.enabled ? "●" : "○"}
            </button>
            Distortion
          </div>
          <DistGraph distortion={fx.distortion || {}} />
          {fx.distortion?.enabled && (
            <div style={{ marginTop: 6 }}>
              <P label="Amount" value={fx.distortion.amount || 0}>
                <Slider min={0} max={100} step={1} value={fx.distortion.amount || 0} onChange={(v) => u("distortion", "amount", v)} color={C.red} />
              </P>
            </div>
          )}
        </div>

        {/* Limiter */}
        <div style={blockStyle(fx.limiter?.enabled, "limiter")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.limiter?.enabled, C.red)} onClick={() => u("limiter", "enabled", !fx.limiter?.enabled)}>
              {fx.limiter?.enabled ? "●" : "○"}
            </button>
            Limiter
          </div>
          {fx.limiter?.enabled && (
            <div>
              <P label="Thresh" value={`${fx.limiter.threshold}dB`}>
                <Slider min={-30} max={0} step={0.5} value={fx.limiter.threshold} onChange={(v) => u("limiter", "threshold", v)} color={C.red} />
              </P>
              <P label="Knee" value={`${fx.limiter.knee}`}>
                <Slider min={0} max={40} step={1} value={fx.limiter.knee} onChange={(v) => u("limiter", "knee", v)} color={C.red} />
              </P>
              <P label="Release" value={`${(fx.limiter.release * 1000).toFixed(0)}ms`}>
                <Slider min={0.01} max={0.5} step={0.01} value={fx.limiter.release} onChange={(v) => u("limiter", "release", v)} color={C.red} />
              </P>
            </div>
          )}
        </div>

        {/* Gate */}
        <div style={blockStyle(fx.gate?.enabled, "gate")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.gate?.enabled, C.yellow)} onClick={() => u("gate", "enabled", !fx.gate?.enabled)}>
              {fx.gate?.enabled ? "●" : "○"}
            </button>
            Gate
          </div>
          {fx.gate?.enabled && (
            <div>
              <P label="Thresh" value={`${fx.gate.threshold}dB`}>
                <Slider min={-80} max={0} step={1} value={fx.gate.threshold} onChange={(v) => u("gate", "threshold", v)} color={C.yellow} />
              </P>
              <P label="Attack" value={`${(fx.gate.attack * 1000).toFixed(1)}ms`}>
                <Slider min={0.001} max={0.05} step={0.001} value={fx.gate.attack} onChange={(v) => u("gate", "attack", v)} color={C.yellow} />
              </P>
              <P label="Release" value={`${(fx.gate.release * 1000).toFixed(0)}ms`}>
                <Slider min={0.01} max={0.5} step={0.01} value={fx.gate.release} onChange={(v) => u("gate", "release", v)} color={C.yellow} />
              </P>
            </div>
          )}
        </div>

        {/* De-Esser */}
        <div style={blockStyle(fx.deesser?.enabled, "deesser")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.deesser?.enabled, C.teal)} onClick={() => u("deesser", "enabled", !fx.deesser?.enabled)}>
              {fx.deesser?.enabled ? "●" : "○"}
            </button>
            De-Esser
          </div>
          {fx.deesser?.enabled && (
            <div>
              <P label="Freq" value={`${fx.deesser.frequency}Hz`}>
                <Slider min={2000} max={12000} step={100} value={fx.deesser.frequency} onChange={(v) => u("deesser", "frequency", v)} color={C.teal} />
              </P>
              <P label="Thresh" value={`${fx.deesser.threshold}dB`}>
                <Slider min={-40} max={0} step={1} value={fx.deesser.threshold} onChange={(v) => u("deesser", "threshold", v)} color={C.teal} />
              </P>
            </div>
          )}
        </div>

        {/* Chorus */}
        <div style={blockStyle(fx.chorus?.enabled, "chorus")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.chorus?.enabled, C.cyan)} onClick={() => u("chorus", "enabled", !fx.chorus?.enabled)}>
              {fx.chorus?.enabled ? "●" : "○"}
            </button>
            Chorus
          </div>
          {fx.chorus?.enabled && (
            <div>
              <P label="Rate" value={`${fx.chorus.rate}Hz`}>
                <Slider min={0.1} max={10} step={0.1} value={fx.chorus.rate} onChange={(v) => u("chorus", "rate", v)} color={C.cyan} />
              </P>
              <P label="Depth" value={`${(fx.chorus.depth * 1000).toFixed(1)}ms`}>
                <Slider min={0.0005} max={0.01} step={0.0005} value={fx.chorus.depth} onChange={(v) => u("chorus", "depth", v)} color={C.cyan} />
              </P>
              <P label="Mix" value={`${Math.round((fx.chorus.mix || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.chorus.mix || 0} onChange={(v) => u("chorus", "mix", v)} color={C.cyan} />
              </P>
            </div>
          )}
        </div>

        {/* Flanger */}
        <div style={blockStyle(fx.flanger?.enabled, "flanger")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.flanger?.enabled, C.green)} onClick={() => u("flanger", "enabled", !fx.flanger?.enabled)}>
              {fx.flanger?.enabled ? "●" : "○"}
            </button>
            Flanger
          </div>
          {fx.flanger?.enabled && (
            <div>
              <P label="Rate" value={`${fx.flanger.rate}Hz`}>
                <Slider min={0.05} max={5} step={0.05} value={fx.flanger.rate} onChange={(v) => u("flanger", "rate", v)} color={C.green} />
              </P>
              <P label="Depth" value={`${(fx.flanger.depth * 1000).toFixed(1)}ms`}>
                <Slider min={0.001} max={0.01} step={0.001} value={fx.flanger.depth} onChange={(v) => u("flanger", "depth", v)} color={C.green} />
              </P>
              <P label="Feedbk" value={`${Math.round(fx.flanger.feedback * 100)}%`}>
                <Slider min={0} max={0.95} step={0.01} value={fx.flanger.feedback} onChange={(v) => u("flanger", "feedback", v)} color={C.green} />
              </P>
              <P label="Mix" value={`${Math.round((fx.flanger.mix || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.flanger.mix || 0} onChange={(v) => u("flanger", "mix", v)} color={C.green} />
              </P>
            </div>
          )}
        </div>

        {/* Phaser */}
        <div style={blockStyle(fx.phaser?.enabled, "phaser")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.phaser?.enabled, C.purple)} onClick={() => u("phaser", "enabled", !fx.phaser?.enabled)}>
              {fx.phaser?.enabled ? "●" : "○"}
            </button>
            Phaser
          </div>
          {fx.phaser?.enabled && (
            <div>
              <P label="Rate" value={`${fx.phaser.rate}Hz`}>
                <Slider min={0.1} max={10} step={0.1} value={fx.phaser.rate} onChange={(v) => u("phaser", "rate", v)} color={C.purple} />
              </P>
              <P label="Freq" value={`${fx.phaser.baseFreq}Hz`}>
                <Slider min={100} max={5000} step={10} value={fx.phaser.baseFreq} onChange={(v) => u("phaser", "baseFreq", v)} color={C.purple} />
              </P>
              <P label="Q" value={fx.phaser.Q}>
                <Slider min={0.5} max={20} step={0.5} value={fx.phaser.Q} onChange={(v) => u("phaser", "Q", v)} color={C.purple} />
              </P>
              <P label="Stages" value={fx.phaser.stages}>
                <Slider min={2} max={12} step={2} value={fx.phaser.stages} onChange={(v) => u("phaser", "stages", v)} color={C.purple} />
              </P>
              <P label="Mix" value={`${Math.round((fx.phaser.mix || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.phaser.mix || 0} onChange={(v) => u("phaser", "mix", v)} color={C.purple} />
              </P>
            </div>
          )}
        </div>

        {/* Tremolo */}
        <div style={blockStyle(fx.tremolo?.enabled, "tremolo")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.tremolo?.enabled, C.orange)} onClick={() => u("tremolo", "enabled", !fx.tremolo?.enabled)}>
              {fx.tremolo?.enabled ? "●" : "○"}
            </button>
            Tremolo
          </div>
          {fx.tremolo?.enabled && (
            <div>
              <P label="Rate" value={`${fx.tremolo.rate}Hz`}>
                <Slider min={0.5} max={20} step={0.5} value={fx.tremolo.rate} onChange={(v) => u("tremolo", "rate", v)} color={C.orange} />
              </P>
              <P label="Depth" value={`${Math.round(fx.tremolo.depth * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.tremolo.depth} onChange={(v) => u("tremolo", "depth", v)} color={C.orange} />
              </P>
            </div>
          )}
        </div>

        {/* Bit Crusher */}
        <div style={blockStyle(fx.bitcrusher?.enabled, "bitcrusher")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.bitcrusher?.enabled, C.red)} onClick={() => u("bitcrusher", "enabled", !fx.bitcrusher?.enabled)}>
              {fx.bitcrusher?.enabled ? "●" : "○"}
            </button>
            Bit Crusher
          </div>
          {fx.bitcrusher?.enabled && (
            <div>
              <P label="Bits" value={fx.bitcrusher.bits}>
                <Slider min={1} max={16} step={1} value={fx.bitcrusher.bits} onChange={(v) => u("bitcrusher", "bits", v)} color={C.red} />
              </P>
              <P label="SR Red" value={`÷${fx.bitcrusher.sampleRateReduce}`}>
                <Slider min={1} max={32} step={1} value={fx.bitcrusher.sampleRateReduce} onChange={(v) => u("bitcrusher", "sampleRateReduce", v)} color={C.red} />
              </P>
            </div>
          )}
        </div>

        {/* Exciter */}
        <div style={blockStyle(fx.exciter?.enabled, "exciter")}>
          <div style={sectionHeaderStyle}>
            <button style={toggleStyle(fx.exciter?.enabled, C.orange)} onClick={() => u("exciter", "enabled", !fx.exciter?.enabled)}>
              {fx.exciter?.enabled ? "●" : "○"}
            </button>
            Exciter
          </div>
          {fx.exciter?.enabled && (
            <div>
              <P label="Amount" value={fx.exciter.amount}>
                <Slider min={0} max={100} step={1} value={fx.exciter.amount} onChange={(v) => u("exciter", "amount", v)} color={C.orange} />
              </P>
              <P label="Freq" value={`${fx.exciter.frequency}Hz`}>
                <Slider min={1000} max={10000} step={100} value={fx.exciter.frequency} onChange={(v) => u("exciter", "frequency", v)} color={C.orange} />
              </P>
              <P label="Mix" value={`${Math.round((fx.exciter.mix || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.exciter.mix || 0} onChange={(v) => u("exciter", "mix", v)} color={C.orange} />
              </P>
            </div>
          )}
        </div>

        {/* Tape Saturation */}
        <div style={blockStyle(fx.tapeSaturation?.enabled, "tapeSaturation")}>
          <div style={sectionHeaderStyle}>
            <button
              style={toggleStyle(fx.tapeSaturation?.enabled, C.yellow)}
              onClick={() => u("tapeSaturation", "enabled", !fx.tapeSaturation?.enabled)}
            >
              {fx.tapeSaturation?.enabled ? "●" : "○"}
            </button>
            Tape Saturation
          </div>
          <TapeGraph tape={fx.tapeSaturation || {}} />
          {fx.tapeSaturation?.enabled && (
            <div style={{ marginTop: 6 }}>
              <P label="Drive" value={`${Math.round((fx.tapeSaturation.drive || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.tapeSaturation.drive || 0} onChange={(v) => u("tapeSaturation", "drive", v)} color={C.yellow} />
              </P>
              <P label="Warmth" value={`${Math.round((fx.tapeSaturation.warmth || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.tapeSaturation.warmth || 0} onChange={(v) => u("tapeSaturation", "warmth", v)} color={C.orange} />
              </P>
            </div>
          )}
        </div>

        {/* Stereo Widener */}
        <div style={blockStyle(fx.stereoWidener?.enabled, "stereoWidener")}>
          <div style={sectionHeaderStyle}>
            <button
              style={toggleStyle(fx.stereoWidener?.enabled, C.cyan)}
              onClick={() => u("stereoWidener", "enabled", !fx.stereoWidener?.enabled)}
            >
              {fx.stereoWidener?.enabled ? "●" : "○"}
            </button>
            Stereo Widener
          </div>
          {fx.stereoWidener?.enabled && (
            <div>
              <P label="Width" value={`${Math.round((fx.stereoWidener.width || 0) * 100)}%`}>
                <Slider min={0} max={1} step={0.01} value={fx.stereoWidener.width || 0} onChange={(v) => u("stereoWidener", "width", v)} color={C.cyan} />
              </P>
            </div>
          )}
        </div>

        {/* Gain Utility */}
        <div style={blockStyle(fx.gainUtility?.enabled, "gainUtility")}>
          <div style={sectionHeaderStyle}>
            <button
              style={toggleStyle(fx.gainUtility?.enabled, C.white)}
              onClick={() => u("gainUtility", "enabled", !fx.gainUtility?.enabled)}
            >
              {fx.gainUtility?.enabled ? "●" : "○"}
            </button>
            Gain Utility
          </div>
          {fx.gainUtility?.enabled && (
            <div>
              <P label="Gain" value={`${fx.gainUtility.gain}dB`}>
                <Slider min={-24} max={24} step={0.5} value={fx.gainUtility.gain} onChange={(v) => u("gainUtility", "gain", v)} color={C.white} />
              </P>
              <P label="Phase" value={fx.gainUtility.phaseInvert ? "INV" : "NRM"}>
                <button
                  onClick={() => u("gainUtility", "phaseInvert", !fx.gainUtility.phaseInvert)}
                  style={{
                    padding: "4px 10px",
                    background: fx.gainUtility.phaseInvert ? "rgba(229,57,53,0.3)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${fx.gainUtility.phaseInvert ? C.red : "#1a2838"}`,
                    borderRadius: 6,
                    color: fx.gainUtility.phaseInvert ? C.red : C.txt,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ⌀ Invert
                </button>
              </P>
              <P label="Mono" value={fx.gainUtility.monoSum ? "ON" : "OFF"}>
                <button
                  onClick={() => u("gainUtility", "monoSum", !fx.gainUtility.monoSum)}
                  style={{
                    padding: "4px 10px",
                    background: fx.gainUtility.monoSum ? "rgba(90,200,250,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${fx.gainUtility.monoSum ? C.cyan : "#1a2838"}`,
                    borderRadius: 6,
                    color: fx.gainUtility.monoSum ? C.cyan : C.txt,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  MONO
                </button>
              </P>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsoleFXPanel;
