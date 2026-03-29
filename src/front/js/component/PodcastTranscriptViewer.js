// =============================================================================
// PodcastTranscriptViewer.js — Spotify-style scrolling transcript
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import { showToast } from "../utils/toast";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const token = () => localStorage.getItem("token") || sessionStorage.getItem("token");

function parseSRT(text) {
  const segments = [];
  const blocks = text.trim().split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeLine = lines.find(l => l.includes("-->"));
    if (!timeLine) continue;
    const [start, end] = timeLine.split("-->").map(t => {
      const [h, m, s] = t.trim().replace(",", ".").split(":");
      return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
    });
    const words = lines.slice(lines.indexOf(timeLine) + 1).join(" ").trim();
    if (words) segments.push({ start, end, text: words });
  }
  return segments;
}

function parsePlainText(text) {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).map((s, i) => ({ start: i * 5, end: (i + 1) * 5, text: s }));
}

function fmtTime(s) { return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }

export default function PodcastTranscriptViewer({ episodeId, transcript, currentTime, onSeek, isOwner }) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [localTranscript, setLocalTranscript] = useState(transcript || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const activeRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (localTranscript) {
      setSegments(localTranscript.includes("-->") ? parseSRT(localTranscript) : parsePlainText(localTranscript));
    } else if (episodeId) fetchTranscript();
  }, [episodeId, localTranscript]);

  useEffect(() => {
    if (autoScroll && activeRef.current) activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentTime, autoScroll]);

  const fetchTranscript = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/podcast/episode/${episodeId}/transcript`, { headers: { ...(token() && { Authorization: `Bearer ${token()}` }) } });
      if (r.ok) { const d = await r.json(); setLocalTranscript(d.transcript || d.transcription || ""); }
    } catch {}
    setLoading(false);
  };

  const generateTranscript = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`${BACKEND}/api/podcast-studio/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episodeId }),
      });
      if (r.ok) { const d = await r.json(); setLocalTranscript(d.transcript || d.transcription || ""); showToast.success("Transcript generated!"); }
      else showToast.error("Transcription failed");
    } catch { showToast.error("Network error"); }
    setGenerating(false);
  };

  const activeIdx = segments.findIndex(s => currentTime != null && currentTime >= s.start && currentTime < s.end);
  const filtered = searchQuery ? segments.filter(s => s.text.toLowerCase().includes(searchQuery.toLowerCase())) : segments;

  const highlight = (text) => {
    if (!searchQuery) return text;
    return text.split(new RegExp(`(${searchQuery})`, "gi")).map((p, i) =>
      p.toLowerCase() === searchQuery.toLowerCase() ? <mark key={i} style={{ background: "#ffaa0044", color: "#ffaa00" }}>{p}</mark> : p
    );
  };

  const S = {
    wrap: { fontFamily: "JetBrains Mono,monospace", fontSize: 11 },
    container: { maxHeight: 400, overflowY: "auto", padding: 4 },
    seg: (a) => ({ padding: "8px 10px", borderRadius: 4, marginBottom: 2, cursor: onSeek ? "pointer" : "default", background: a ? "#00ffc822" : "transparent", border: `1px solid ${a ? "#00ffc844" : "transparent"}`, transition: "background 0.2s" }),
    inp: { flex: 1, background: "#06060f", border: "1px solid #1a2a3a", borderRadius: 3, color: "#ccc", padding: "5px 8px", fontSize: 11, fontFamily: "inherit" },
    btn: (col = "#00ffc8") => ({ padding: "5px 10px", background: `${col}11`, border: `1px solid ${col}44`, borderRadius: 3, color: col, cursor: "pointer", fontSize: 9, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }),
  };

  if (loading) return <div style={{ padding: 20, color: "#5a7088", fontFamily: "JetBrains Mono,monospace" }}>Loading transcript...</div>;

  if (!localTranscript) return (
    <div style={{ padding: 20, textAlign: "center", color: "#5a7088", fontFamily: "JetBrains Mono,monospace" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
      <div style={{ marginBottom: 8 }}>No transcript for this episode</div>
      {isOwner && <button onClick={generateTranscript} disabled={generating} style={{ padding: "8px 18px", background: "#00ffc822", border: "1px solid #00ffc8", borderRadius: 4, color: "#00ffc8", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>{generating ? "Generating..." : "🤖 Generate AI Transcript"}</button>}
    </div>
  );

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
        <input style={S.inp} placeholder="Search transcript..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#5a7088", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} /> Auto-scroll
        </label>
        {isOwner && <button style={S.btn()} onClick={generateTranscript} disabled={generating}>{generating ? "..." : "↻ Re-generate"}</button>}
      </div>
      <div ref={containerRef} style={S.container}>
        {filtered.length === 0 && searchQuery && <div style={{ color: "#5a7088", fontSize: 10, textAlign: "center", padding: 20 }}>No results for "{searchQuery}"</div>}
        {filtered.map((seg, i) => {
          const isActive = !searchQuery && i === activeIdx;
          return (
            <div key={i} ref={isActive ? activeRef : null} style={S.seg(isActive)} onClick={() => onSeek?.(seg.start)}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                <span style={{ color: "#00ffc8", fontSize: 9, fontWeight: 700, marginRight: 8, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmtTime(seg.start)}</span>
                <span style={{ color: isActive ? "#fff" : "#8a9aaa", lineHeight: 1.7 }}>{highlight(seg.text)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 9, color: "#5a7088", marginTop: 6, textAlign: "right" }}>
        {segments.reduce((s, seg) => s + seg.text.split(" ").length, 0).toLocaleString()} words{searchQuery && ` · ${filtered.length} matches`}
      </div>
    </div>
  );
}
