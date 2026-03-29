// =============================================================================
// PodcastAnalyticsDashboard.js — Listener analytics (Spotify/Anchor style)
// Plays, retention, geography, device, episode performance, revenue
// =============================================================================

import React, { useState, useEffect, useRef } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const token = () => localStorage.getItem("token") || sessionStorage.getItem("token");

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#00ffc8", height = 40 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !data?.length) return;
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;
    const max = Math.max(...data, 1);
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Fill
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = color + "22";
    ctx.fill();
  }, [data, color]);
  return <canvas ref={canvasRef} width={200} height={height} style={{ width: "100%", height }} />;
}

// ── Retention bar chart ───────────────────────────────────────────────────────
function RetentionChart({ data }) {
  if (!data?.length) return <div style={{ color: "#5a7088", fontSize: 10 }}>No retention data yet</div>;
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", background: v / max > 0.7 ? "#00ffc8" : v / max > 0.4 ? "#ffaa00" : "#ff4444", height: `${(v / max) * 100}%`, borderRadius: "2px 2px 0 0", minHeight: 2 }} />
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "#00ffc8", sparkData }) {
  return (
    <div style={{ background: "#0a0a14", border: `1px solid ${color}33`, borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 9, color: "#5a7088", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#5a7088", fontSize: 9, marginTop: 2 }}>{sub}</div>}
      {sparkData && <div style={{ marginTop: 6 }}><Sparkline data={sparkData} color={color} height={30} /></div>}
    </div>
  );
}

// ── Episode performance table ─────────────────────────────────────────────────
function EpisodeTable({ episodes }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1a2a3a" }}>
            {["Episode", "Plays", "Avg Listen %", "Comments", "Downloads", "Revenue"].map(h => (
              <th key={h} style={{ padding: "6px 8px", color: "#5a7088", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {episodes.map((ep, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #0a1628" }}>
              <td style={{ padding: "8px 8px", color: "#ccc", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep.title}</td>
              <td style={{ padding: "8px 8px", color: "#00ffc8", fontWeight: 700 }}>{(ep.plays || 0).toLocaleString()}</td>
              <td style={{ padding: "8px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ flex: 1, height: 4, background: "#1a2a3a", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${ep.avg_listen_pct || 0}%`, background: (ep.avg_listen_pct || 0) > 70 ? "#00ffc8" : "#ffaa00", borderRadius: 2 }} />
                  </div>
                  <span style={{ color: "#ccc", width: 28 }}>{ep.avg_listen_pct || 0}%</span>
                </div>
              </td>
              <td style={{ padding: "8px 8px", color: "#ccc" }}>{ep.comments || 0}</td>
              <td style={{ padding: "8px 8px", color: "#ccc" }}>{ep.downloads || 0}</td>
              <td style={{ padding: "8px 8px", color: "#00ffc8" }}>${(ep.revenue || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Geography bar ─────────────────────────────────────────────────────────────
function GeoBar({ countries }) {
  if (!countries?.length) return <div style={{ color: "#5a7088", fontSize: 10 }}>No geography data yet</div>;
  const max = Math.max(...countries.map(c => c.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {countries.slice(0, 8).map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{c.flag}</span>
          <span style={{ color: "#ccc", width: 120, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.country}</span>
          <div style={{ flex: 1, height: 6, background: "#1a2a3a", borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${(c.count / max) * 100}%`, background: "#00ffc8", borderRadius: 3 }} />
          </div>
          <span style={{ color: "#5a7088", fontSize: 9, width: 40, textAlign: "right" }}>{c.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function PodcastAnalyticsDashboard({ podcastId }) {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [podcastId, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/podcast/${podcastId}/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (r.ok) setData(await r.json());
      else {
        // Fallback mock data for display
        setData({
          total_plays: 0, unique_listeners: 0, avg_listen_pct: 0,
          total_downloads: 0, total_revenue: 0, followers: 0,
          plays_trend: Array(30).fill(0), revenue_trend: Array(30).fill(0),
          retention: Array(20).fill(0), devices: [],
          countries: [], episodes: [], sources: []
        });
      }
    } catch {
      setData({
        total_plays: 0, unique_listeners: 0, avg_listen_pct: 0,
        total_downloads: 0, total_revenue: 0, followers: 0,
        plays_trend: [], revenue_trend: [], retention: [],
        devices: [], countries: [], episodes: [], sources: []
      });
    }
    setLoading(false);
  };

  const S = {
    wrap: { fontFamily: "JetBrains Mono,monospace", fontSize: 11 },
    sec: { background: "#0a0a14", border: "1px solid #1a2a3a", borderRadius: 8, padding: 14, marginBottom: 12 },
    sl: { fontSize: 9, color: "#5a7088", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
    periodBtn: (active) => ({ padding: "4px 10px", border: `1px solid ${active ? "#00ffc8" : "#1a2a3a"}`, borderRadius: 3, background: active ? "#00ffc822" : "transparent", color: active ? "#00ffc8" : "#5a7088", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }),
  };

  if (loading) return <div style={{ padding: 20, color: "#5a7088", fontFamily: "JetBrains Mono,monospace" }}>Loading analytics...</div>;

  return (
    <div style={S.wrap}>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[["7d","7 Days"],["30d","30 Days"],["90d","90 Days"],["1y","1 Year"],["all","All Time"]].map(([v,l]) => (
          <button key={v} style={S.periodBtn(period===v)} onClick={() => setPeriod(v)}>{l}</button>
        ))}
      </div>

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 }}>
        <StatCard label="Total Plays" value={(data?.total_plays||0).toLocaleString()} sub={`+${data?.plays_growth||0}% vs prev period`} color="#00ffc8" sparkData={data?.plays_trend} />
        <StatCard label="Unique Listeners" value={(data?.unique_listeners||0).toLocaleString()} color="#5ac8fa" sparkData={data?.listeners_trend} />
        <StatCard label="Avg Listen %" value={`${data?.avg_listen_pct||0}%`} sub="of episode duration" color={data?.avg_listen_pct>60?"#00ffc8":"#ffaa00"} />
        <StatCard label="Downloads" value={(data?.total_downloads||0).toLocaleString()} color="#FF6600" />
        <StatCard label="Revenue" value={`$${(data?.total_revenue||0).toFixed(2)}`} color="#00ffc8" sparkData={data?.revenue_trend} />
        <StatCard label="Followers" value={(data?.followers||0).toLocaleString()} sub={`+${data?.followers_growth||0} this period`} color="#ff44aa" />
      </div>

      {/* Plays over time */}
      <div style={S.sec}>
        <div style={S.sl}>Plays Over Time</div>
        <Sparkline data={data?.plays_trend||[]} color="#00ffc8" height={60} />
      </div>

      {/* Retention + Devices */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={S.sec}>
          <div style={S.sl}>Episode Retention</div>
          <RetentionChart data={data?.retention||[]} />
          <div style={{ fontSize: 9, color: "#5a7088", marginTop: 4 }}>Average % of episode heard at each point</div>
        </div>
        <div style={S.sec}>
          <div style={S.sl}>Top Listening Apps</div>
          {(data?.sources||[]).length === 0 ? (
            <div style={{ color: "#5a7088", fontSize: 10 }}>No app data yet</div>
          ) : (
            (data?.sources||[]).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                    <span style={{ color: "#ccc" }}>{s.name}</span>
                    <span style={{ color: "#00ffc8" }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "#1a2a3a", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, background: "#00ffc8", borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Geography */}
      <div style={S.sec}>
        <div style={S.sl}>Top Countries</div>
        <GeoBar countries={data?.countries||[]} />
      </div>

      {/* Episode performance */}
      <div style={S.sec}>
        <div style={S.sl}>Episode Performance</div>
        {(data?.episodes||[]).length === 0 ? (
          <div style={{ color: "#5a7088", fontSize: 10 }}>No episode data yet — publish episodes to see performance</div>
        ) : (
          <EpisodeTable episodes={data?.episodes||[]} />
        )}
      </div>
    </div>
  );
}
