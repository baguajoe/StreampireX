// src/front/js/pages/CreatorDashboard.js
// ═══════════════════════════════════════════════════════════════
//  StreamPireX — CREATOR COMMAND CENTER
//  Full-spectrum monitoring: earnings, content, audience,
//  beats, radio, podcasts, store, storage, fan memberships
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Link } from "react-router-dom";

// ── existing components kept ──────────────────────────────────
import ProductUploadForm from "../component/ProductUploadForm";
import StorageStatus from "../component/StorageStatus";
import BandwidthStatus from "../component/BandwidthStatus";
import { CreatorMembershipManager as FanTierManager } from '../pages/FanMembership';
import { EmbedCodeGenerator } from '../pages/EmbeddablePlayer';

// ── styles ────────────────────────────────────────────────────
import "../../styles/StorageStatus.css";
import "../../styles/BandwidthStatus.css";
import "../../styles/creatorDashboard.css";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, ArcElement, Filler
);

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
const B   = process.env.REACT_APP_BACKEND_URL || "";
const tok = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const hdrs = () => ({ Authorization: `Bearer ${tok()}` });
const fmt$ = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const fmtN = (n) => (n || 0).toLocaleString();

// ─────────────────────────────────────────────────────────────
//  DESIGN TOKENS  (dark cyber aesthetic — no class conflicts)
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#07090f",
  surface:   "#0d1117",
  border:    "rgba(255,255,255,0.06)",
  teal:      "#00ffc8",
  orange:    "#ff6600",
  violet:    "#7b61ff",
  sky:       "#00cfff",
  rose:      "#ff3b6b",
  amber:     "#fbbf24",
  pink:      "#f472b6",
  mint:      "#34d399",
  text:      "#e6edf3",
  muted:     "#8b949e",
  dim:       "#4a6080",
  card:      "linear-gradient(135deg,rgba(255,255,255,0.026) 0%,rgba(255,255,255,0.010) 100%)",
};

// ─────────────────────────────────────────────────────────────
//  SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

/** Glowing KPI tile */
const KPI = ({ icon, label, value, color = C.teal, change, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: C.card,
      border: `1px solid ${color}1a`,
      borderRadius: 16,
      padding: "20px 22px",
      position: "relative",
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      transition: "transform .18s,box-shadow .18s",
      userSelect: "none",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = "translateY(-3px)";
      e.currentTarget.style.boxShadow = `0 10px 36px ${color}1e`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    {/* ambient glow blob */}
    <div style={{
      position:"absolute", top:-24, right:-24, width:80, height:80,
      borderRadius:"50%", background:color, opacity:0.07, filter:"blur(22px)",
      pointerEvents:"none",
    }} />
    <div style={{ fontSize:22, marginBottom:8, color }}>{icon}</div>
    <div style={{ fontSize:"0.66rem", color:C.dim, letterSpacing:1.1, textTransform:"uppercase", marginBottom:4 }}>{label}</div>
    <div style={{ fontSize:"1.85rem", fontWeight:800, color:C.text, lineHeight:1 }}>{value ?? "—"}</div>
    {change !== undefined && (
      <div style={{ fontSize:"0.7rem", marginTop:6, color: change >= 0 ? C.teal : "#ff3b30" }}>
        {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs prior period
      </div>
    )}
  </div>
);

/** Section header with accent bar */
const SH = ({ title, action }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:3, height:20, background:`linear-gradient(180deg,${C.teal},${C.violet})`, borderRadius:2 }} />
      <span style={{ fontSize:"0.9rem", fontWeight:700, color:C.text, letterSpacing:.4 }}>{title}</span>
    </div>
    {action}
  </div>
);

/** Card wrapper */
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: "22px 24px",
    marginBottom: 18,
    ...style,
  }}>
    {children}
  </div>
);

/** Quick action pill-link */
const QA = ({ to, icon, label, color = C.teal }) => (
  <Link to={to} style={{
    display:"flex", flexDirection:"column", alignItems:"center", gap:8,
    padding:"15px 10px", borderRadius:13,
    background:`linear-gradient(135deg,${color}12,${color}06)`,
    border:`1px solid ${color}2a`,
    textDecoration:"none", color:C.muted, fontSize:"0.72rem", fontWeight:700,
    transition:"all .18s",
  }}
    onMouseEnter={e => { e.currentTarget.style.background=`linear-gradient(135deg,${color}22,${color}0e)`; e.currentTarget.style.transform="translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.background=`linear-gradient(135deg,${color}12,${color}06)`; e.currentTarget.style.transform="translateY(0)"; }}
  >
    <span style={{ fontSize:22 }}>{icon}</span>
    <span style={{ whiteSpace:"nowrap" }}>{label}</span>
  </Link>
);

/** Small badge */
const Badge = ({ label, color = C.teal }) => (
  <span style={{
    display:"inline-block", padding:"2px 8px", borderRadius:5,
    fontSize:"0.63rem", fontWeight:800, letterSpacing:.5,
    background:`${color}1e`, color,
  }}>{label}</span>
);

/** Ghost button */
const Btn = ({ children, onClick, disabled, color = C.teal, style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding:"7px 15px", borderRadius:8, border:`1px solid ${color}33`,
      background:"transparent", color, cursor:"pointer",
      fontFamily:"inherit", fontSize:"0.72rem", fontWeight:700,
      transition:"all .15s", opacity: disabled ? .5 : 1,
      ...style,
    }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.background = `${color}14`)}
    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
  >{children}</button>
);

/** Table heading / cell */
const TH = ({ children }) => (
  <th style={{
    padding:"9px 13px", textAlign:"left", fontSize:"0.64rem", fontWeight:800,
    color:C.dim, textTransform:"uppercase", letterSpacing:.9,
    borderBottom:`1px solid #1a2433`,
  }}>{children}</th>
);
const TD = ({ children, style = {} }) => (
  <td style={{ padding:"10px 13px", fontSize:"0.81rem", color:C.muted, borderBottom:"1px solid #0c1420", ...style }}>{children}</td>
);

// ─────────────────────────────────────────────────────────────
//  SHARED CHART OPTIONS
// ─────────────────────────────────────────────────────────────
const chartBase = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero:true, grid:{ color:"#151e2b" }, ticks:{ color:C.dim, font:{size:10} } },
    x: { grid:{ color:"#151e2b" }, ticks:{ color:C.dim, font:{size:10} } },
  },
};
const donutOpts = {
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{ position:"bottom", labels:{ color:C.muted, padding:12, font:{size:11} } } },
  cutout:"68%",
};

// ─────────────────────────────────────────────────────────────
//  ALL TABS
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id:"overview",    label:"Overview",     icon:"◈" },
  { id:"earnings",    label:"Earnings",     icon:"◎" },
  { id:"content",     label:"Content",      icon:"◧" },
  { id:"audience",    label:"Audience",     icon:"◉" },
  { id:"store",       label:"Store",        icon:"◫" },
  { id:"upload",      label:"Upload",       icon:"⬆" },
  { id:"fans",        label:"Fan Tiers",    icon:"★" },
  { id:"embed",       label:"Embed",        icon:"⊞" },
  { id:"activity",    label:"Activity",     icon:"◌" },
];

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const CreatorDashboard = () => {
  const [activeTab, setActiveTab]   = useState("overview");
  const [period,    setPeriod]      = useState("30d");
  const [loading,   setLoading]     = useState(true);
  const [syncing,   setSyncing]     = useState(false);

  // ── data state ──
  const [profile,       setProfile]       = useState({});
  const [earnings,      setEarnings]      = useState({});
  const [overview,      setOverview]      = useState({});
  const [revenueData,   setRevenueData]   = useState([]);
  const [playsData,     setPlaysData]     = useState([]);
  const [audienceData,  setAudienceData]  = useState([]);
  const [topContent,    setTopContent]    = useState([]);
  const [beatSales,     setBeatSales]     = useState([]);
  const [myProducts,    setMyProducts]    = useState([]);
  const [podcasts,      setPodcasts]      = useState([]);
  const [tracks,        setTracks]        = useState([]);
  const [radioStations, setRadioStations] = useState([]);
  const [recentActivity,setRecentActivity]= useState([]);
  const [contentBD,     setContentBD]     = useState({});
  const [monthlyGrowth, setMonthlyGrowth] = useState({ labels:[], engagement:[], plays:[], followers:[] });
  const [socialShares,  setSocialShares]  = useState({});
  const [activityBusy,  setActivityBusy] = useState(false);

  // ── fetch all ──────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!tok()) return;
    try {
      const eps = [
        `/api/profile`,
        `/api/analytics/overview?period=${period}`,
        `/api/earnings`,
        `/api/analytics/revenue?period=${period}`,
        `/api/analytics/plays?period=${period}`,
        `/api/analytics/audience?period=${period}`,
        `/api/analytics/top-content?period=${period}`,
        `/api/analytics/beat-sales?period=${period}`,
        `/api/marketplace/my-products`,
        `/api/podcast/dashboard`,
        `/api/music/tracks`,
        `/api/radio/my-stations`,
        `/api/recent-activity`,
        `/api/content-breakdown`,
        `/api/monthly-growth`,
        `/api/social-shares`,
      ];

      const res = await Promise.allSettled(
        eps.map(ep => fetch(`${B}${ep}`, { headers: hdrs() }).then(r => r.ok ? r.json() : null))
      );

      const [
        profileR, overviewR, earningsR, revR, playsR,
        audR, topR, beatR, prodR, podR,
        trackR, radioR, actR, contentR, growthR, sharesR
      ] = res.map(r => r.status === "fulfilled" ? r.value : null);

      if (profileR)  setProfile(profileR);
      if (overviewR) setOverview(overviewR);
      if (earningsR) setEarnings(earningsR);
      if (revR?.monthly)    setRevenueData(revR.monthly);
      if (playsR?.daily)    setPlaysData(playsR.daily);
      if (audR?.daily)      setAudienceData(audR.daily || []);
      if (topR?.tracks)     setTopContent(topR.tracks || []);
      if (beatR?.sales)     setBeatSales(beatR.sales || []);
      if (prodR?.products)  setMyProducts(prodR.products);
      if (podR)   setPodcasts(Array.isArray(podR) ? podR : podR.podcasts || []);
      if (trackR) setTracks(Array.isArray(trackR) ? trackR : trackR.tracks || []);
      if (radioR) setRadioStations(Array.isArray(radioR) ? radioR : radioR.stations || []);
      if (actR?.activities) setRecentActivity(actR.activities);

      if (contentR?.breakdown) {
        setContentBD({
          podcasts:      contentR.breakdown.podcasts?.count || 0,
          radioStations: contentR.breakdown.radio_stations?.count || 0,
          musicTracks:   contentR.breakdown.tracks?.count || 0,
          liveStreams:   contentR.breakdown.videos?.count || 0,
        });
      }
      if (growthR) {
        setMonthlyGrowth({
          labels:     growthR.labels || [],
          engagement: growthR.engagement || [],
          plays:      growthR.plays || [],
          followers:  growthR.followers || [],
        });
      }
      if (sharesR) setSocialShares(sharesR.platform_breakdown || sharesR);
    } catch(e) {
      console.error("Dashboard fetch:", e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // auto-refresh activity every 30s
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${B}/api/recent-activity`, { headers: hdrs() });
        if (r.ok) { const d = await r.json(); if (d.activities) setRecentActivity(d.activities); }
      } catch {}
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const refreshActivity = async () => {
    setActivityBusy(true);
    try {
      const r = await fetch(`${B}/api/recent-activity`, { headers: hdrs() });
      if (r.ok) { const d = await r.json(); if (d.activities) setRecentActivity(d.activities); }
    } catch {}
    setActivityBusy(false);
  };

  const onProductUploaded = () => {
    fetch(`${B}/api/marketplace/my-products`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => { if (d.products) setMyProducts(d.products); })
      .catch(() => {});
    refreshActivity();
  };

  // ── derived numbers ──────────────────────────────────────
  const productRev = myProducts.reduce((s, p) => s + ((p.sales_count||0) * (p.price||0) * 0.9), 0);
  const totalRev   =
    productRev +
    (earnings.content || 0) +
    (earnings.tips    || 0) +
    (earnings.ads     || 0) +
    (earnings.subscriptions || 0) +
    (earnings.donations     || 0);

  const totalSales = myProducts.reduce((s, p) => s + (p.sales_count || 0), 0);

  // ── chart datasets ───────────────────────────────────────
  const growthChart = {
    labels: monthlyGrowth.labels.length ? monthlyGrowth.labels : ["Jan","Feb","Mar","Apr","May","Jun"],
    datasets:[{
      label:"Engagement",
      data: monthlyGrowth.engagement.length ? monthlyGrowth.engagement : [0,0,0,0,0,0],
      borderColor:C.teal, backgroundColor:"rgba(0,255,200,0.07)",
      tension:.4, fill:true, pointRadius:3, pointBackgroundColor:C.teal,
    }],
  };

  const revChart = {
    labels: revenueData.map(d => d.month || d.date || ""),
    datasets:[{
      label:"Revenue",
      data: revenueData.map(d => d.revenue || 0),
      backgroundColor:"rgba(255,102,0,.72)", borderRadius:6,
    }],
  };

  const playsChart = {
    labels: playsData.map(d => d.date || ""),
    datasets:[{
      label:"Plays",
      data: playsData.map(d => d.plays || 0),
      borderColor:C.violet, backgroundColor:"rgba(123,97,255,.1)",
      tension:.4, fill:true, pointRadius:2,
    }],
  };

  const contentDonut = {
    labels:["Music","Podcasts","Radio","Videos","Products"],
    datasets:[{
      data:[
        contentBD.musicTracks || tracks.length || 0,
        contentBD.podcasts    || podcasts.length || 0,
        contentBD.radioStations || radioStations.length || 0,
        contentBD.liveStreams || 0,
        myProducts.length || 0,
      ],
      backgroundColor:[C.sky, C.rose, C.violet, C.mint, C.orange],
      borderWidth:0,
    }],
  };

  const sharesDonut = {
    labels:["Facebook","Twitter","Instagram","TikTok"],
    datasets:[{
      data:[
        socialShares.facebook || 0,
        socialShares.twitter  || 0,
        socialShares.instagram|| 0,
        socialShares.tiktok   || 0,
      ],
      backgroundColor:["#1877F2","#1DA1F2","#E4405F","#111"],
      borderWidth:0,
    }],
  };

  const audChart = {
    labels: audienceData.map(d => d.date || ""),
    datasets:[{
      label:"Followers",
      data: audienceData.map(d => d.followers || d.count || 0),
      borderColor:C.violet, backgroundColor:"rgba(123,97,255,.1)",
      tension:.4, fill:true, pointRadius:2,
    }],
  };

  const actIcon = t => ({ podcast:"🎙️",music:"🎵",radio:"📻",livestream:"📹",
    product:"🛍️",tip:"💰",follower:"👤",sale:"💵",beat:"🥁" }[t] || "◌");

  // ── inline styles ─────────────────────────────────────────
  const S = {
    topbar:{
      background:"rgba(7,9,15,.97)",
      backdropFilter:"blur(22px)",
      borderBottom:`1px solid rgba(0,255,200,.07)`,
      padding:"14px 28px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      flexWrap:"wrap", gap:10,
      position:"sticky", top:0, zIndex:200,
    },
    tabBtn: (a) => ({
      padding:"7px 14px", borderRadius:8, border:"none",
      cursor:"pointer", fontFamily:"inherit", fontSize:"0.73rem", fontWeight:700,
      letterSpacing:.5,
      background: a ? `linear-gradient(135deg,${C.teal},#00b89f)` : "transparent",
      color: a ? "#07090f" : C.dim,
      transition:"all .17s",
    }),
    perBtn: (a) => ({
      padding:"4px 11px", borderRadius:6, border:"none",
      cursor:"pointer", fontFamily:"inherit", fontSize:"0.7rem", fontWeight:700,
      background: a ? `${C.teal}22` : "transparent",
      color: a ? C.teal : C.dim,
      transition:"all .13s",
    }),
    body:{ padding:"26px 28px", maxWidth:1440, margin:"0 auto" },
  };

  // ── loading screen ────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight:"100vh", background:C.bg, display:"flex",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'JetBrains Mono',monospace",
    }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"2.4rem", color:C.teal, marginBottom:14,
          animation:"cdPulse 1.4s ease-in-out infinite" }}>◈</div>
        <div style={{ color:C.teal, fontSize:"0.8rem", letterSpacing:3 }}>LOADING COMMAND CENTER</div>
      </div>
      <style>{`@keyframes cdPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.muted,
      fontFamily:"'JetBrains Mono','Fira Code','Courier New',monospace" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box}
        @keyframes cdIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
        .cd-tab{animation:cdIn .22s ease}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0a1018}
        ::-webkit-scrollbar-thumb{background:#1a2533;border-radius:3px}
        .cd-tr:hover td{background:rgba(0,255,200,.018)!important}
        .cd-qa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(102px,1fr));gap:10px}
        .cd-kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px;margin-bottom:22px}
        .cd-2col{display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px;margin-bottom:18px}
        .cd-half{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        @media(max-width:900px){.cd-2col{grid-template-columns:1fr!important}.cd-half{grid-template-columns:1fr!important}}
      `}</style>

      {/* ═══════════════ TOP BAR ══════════════════ */}
      <div style={S.topbar}>

        {/* identity */}
        <div style={{ display:"flex", alignItems:"center", gap:13 }}>
          <img
            src={profile.profile_picture || "https://via.placeholder.com/42"}
            alt="avatar"
            style={{ width:42, height:42, borderRadius:11,
              border:`2px solid ${C.teal}44`, objectFit:"cover" }}
          />
          <div>
            <div style={{ fontSize:"0.92rem", fontWeight:800, color:C.text }}>
              {profile.display_name || profile.username || "Creator"}
            </div>
            <div style={{ fontSize:"0.63rem", color:C.teal, letterSpacing:1.6 }}>
              COMMAND CENTER · {fmtN(profile.followers)} FOLLOWERS
            </div>
          </div>
        </div>

        {/* tab buttons */}
        <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
          {TABS.map(t => (
            <button key={t.id} style={S.tabBtn(activeTab===t.id)} onClick={() => setActiveTab(t.id)}>
              <span style={{ marginRight:5, opacity:.75 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* period + sync */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", gap:2 }}>
            {["7d","30d","90d","1y"].map(p => (
              <button key={p} style={S.perBtn(period===p)} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <Btn onClick={() => { setSyncing(true); fetchAll(); }} disabled={syncing}>
            {syncing ? "⟳" : "↺"} SYNC
          </Btn>
        </div>
      </div>

      {/* ═══════════════ BODY ══════════════════════ */}
      <div style={S.body}>

        {/* ─────────────── OVERVIEW ─────────────── */}
        {activeTab === "overview" && (
          <div className="cd-tab">

            {/* hero earnings banner */}
            <Card style={{
              background:`linear-gradient(135deg,${C.teal}0a,${C.violet}0a)`,
              border:`1px solid ${C.teal}18`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:20, marginBottom:18,
            }}>
              <div>
                <div style={{ fontSize:"0.64rem", color:C.dim, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>
                  Total Platform Earnings
                </div>
                <div style={{ fontSize:"2.9rem", fontWeight:800, color:C.teal, lineHeight:1 }}>
                  {fmt$(totalRev)}
                </div>
                <div style={{ fontSize:"0.68rem", color:C.dim, marginTop:8, lineHeight:2 }}>
                  Products {fmt$(productRev)} · Tips {fmt$(earnings.tips)} · Ads {fmt$(earnings.ads)} · Subs {fmt$(earnings.subscriptions)} · Donations {fmt$(earnings.donations)}
                </div>
              </div>
              <div style={{ display:"flex", gap:32 }}>
                {[
                  { label:"Followers", val:fmtN(profile.followers), color:C.violet },
                  { label:"Following", val:fmtN(profile.following), color:C.sky },
                  { label:"Products",  val:fmtN(myProducts.length), color:C.orange },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:"1.7rem", fontWeight:800, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:"0.64rem", color:C.dim, letterSpacing:1, textTransform:"uppercase", marginTop:3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* KPI row */}
            <div className="cd-kpi-grid">
              <KPI icon="▶" label="Total Plays"     value={fmtN(overview.total_plays)}                        color={C.teal}   change={overview.plays_change} />
              <KPI icon="◎" label="Total Revenue"   value={fmt$(overview.total_revenue || totalRev)}          color={C.orange} change={overview.revenue_change} />
              <KPI icon="◉" label="Followers"        value={fmtN(profile.followers)}                          color={C.violet} />
              <KPI icon="♪" label="Music Tracks"    value={fmtN(tracks.length || contentBD.musicTracks)}      color={C.sky} />
              <KPI icon="🎙" label="Podcasts"        value={fmtN(podcasts.length || contentBD.podcasts)}       color={C.rose} />
              <KPI icon="⬡" label="Beat Sales"      value={fmtN(beatSales.length)}                            color={C.amber} />
              <KPI icon="◈" label="Radio Stations"  value={fmtN(radioStations.length || contentBD.radioStations)} color={C.violet} />
              <KPI icon="▣" label="Video Views"     value={fmtN(overview.video_views)}                        color={C.mint} />
            </div>

            {/* charts row */}
            <div className="cd-2col">
              <Card>
                <SH title="ENGAGEMENT TREND" />
                <div style={{ height:200 }}><Line data={growthChart} options={chartBase} /></div>
              </Card>
              <Card>
                <SH title="CONTENT MIX" />
                <div style={{ height:200 }}><Doughnut data={contentDonut} options={donutOpts} /></div>
              </Card>
              <Card>
                <SH title="SOCIAL SHARES" />
                <div style={{ height:200 }}><Doughnut data={sharesDonut} options={donutOpts} /></div>
              </Card>
            </div>

            {/* storage + bandwidth */}
            <Card>
              <SH title="STORAGE & BANDWIDTH" />
              <div className="cd-half">
                <StorageStatus />
                <BandwidthStatus />
              </div>
            </Card>

            {/* quick actions */}
            <Card>
              <SH title="QUICK ACTIONS" />
              <div className="cd-qa-grid">
                <QA to="/upload-music"       icon="🎵" label="Upload Music"    color={C.sky} />
                <QA to="/podcast-create"     icon="🎙️" label="New Podcast"    color={C.rose} />
                <QA to="/create-radio"       icon="📻" label="Create Radio"   color={C.violet} />
                <QA to="/upload-video"       icon="📹" label="Upload Video"   color={C.mint} />
                <QA to="/live-streams"       icon="🔴" label="Go Live"        color={C.orange} />
                <QA to="/sell-beats"         icon="🥁" label="Sell Beats"     color={C.amber} />
                <QA to="/recording-studio"   icon="🎚️" label="Studio"         color={C.teal} />
                <QA to="/ai-mastering"       icon="🤖" label="AI Master"      color={C.violet} />
                <QA to="/merch-store"        icon="👕" label="Merch Store"    color={C.pink} />
                <QA to="/marketplace"        icon="🛍️" label="Marketplace"   color={C.orange} />
                <QA to="/music-distribution" icon="🌍" label="Distribute"    color={C.sky} />
                <QA to="/collab-marketplace" icon="🤝" label="Collab Hub"    color={C.violet} />
              </div>
            </Card>
          </div>
        )}

        {/* ─────────────── EARNINGS ─────────────── */}
        {activeTab === "earnings" && (
          <div className="cd-tab">
            <div className="cd-kpi-grid">
              <KPI icon="🛍️" label="Product Sales"   value={fmt$(productRev)}              color={C.orange} />
              <KPI icon="💰" label="Tips"             value={fmt$(earnings.tips)}            color={C.teal} />
              <KPI icon="📣" label="Ad Revenue"       value={fmt$(earnings.ads)}             color={C.amber} />
              <KPI icon="⭐" label="Subscriptions"   value={fmt$(earnings.subscriptions)}   color={C.violet} />
              <KPI icon="🎁" label="Donations"        value={fmt$(earnings.donations)}       color={C.pink} />
              <KPI icon="🎵" label="Content Revenue"  value={fmt$(earnings.content)}         color={C.mint} />
            </div>

            <Card>
              <SH title="MONTHLY REVENUE" />
              <div style={{ height:260 }}>
                {revenueData.length
                  ? <Bar data={revChart} options={chartBase} />
                  : <div style={{ textAlign:"center", padding:80, color:C.dim }}>No revenue data for this period</div>}
              </div>
            </Card>

            {beatSales.length > 0 && (
              <Card>
                <SH title="BEAT SALES" />
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>
                      {["Beat","License","Buyer","Date","Amount","Your Cut (90%)"].map(h => <TH key={h}>{h}</TH>)}
                    </tr></thead>
                    <tbody>
                      {beatSales.slice(0,30).map((s,i) => (
                        <tr key={i} className="cd-tr">
                          <TD style={{ color:C.text, fontWeight:700 }}>{s.beat_title}</TD>
                          <TD><Badge label={s.license_type} color={C.teal} /></TD>
                          <TD style={{ color:C.muted }}>{s.buyer_name || "Anonymous"}</TD>
                          <TD style={{ color:C.dim }}>{new Date(s.purchased_at).toLocaleDateString()}</TD>
                          <TD style={{ color:C.orange }}>{fmt$(s.amount_paid)}</TD>
                          <TD style={{ color:C.teal, fontWeight:700 }}>{fmt$(s.producer_earnings)}</TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {myProducts.length > 0 && (
              <Card>
                <SH title="PRODUCT REVENUE"
                  action={<Link to="/dashboard/store" style={{ fontSize:"0.7rem", color:C.teal, textDecoration:"none" }}>View All →</Link>}
                />
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>
                      {["Product","Price","Sales","Revenue (90%)","Status"].map(h => <TH key={h}>{h}</TH>)}
                    </tr></thead>
                    <tbody>
                      {[...myProducts].sort((a,b)=>(b.sales_count||0)-(a.sales_count||0)).slice(0,10).map(p => (
                        <tr key={p.id} className="cd-tr">
                          <TD style={{ color:C.text, fontWeight:700 }}>{p.title}</TD>
                          <TD style={{ color:C.amber }}>{fmt$(p.price)}</TD>
                          <TD>{fmtN(p.sales_count)}</TD>
                          <TD style={{ color:C.teal, fontWeight:700 }}>{fmt$((p.sales_count||0)*(p.price||0)*.9)}</TD>
                          <TD><Badge label={p.is_active?"LIVE":"DRAFT"} color={p.is_active?C.teal:C.dim} /></TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─────────────── CONTENT ─────────────── */}
        {activeTab === "content" && (
          <div className="cd-tab">
            <div className="cd-kpi-grid">
              <KPI icon="🎵" label="Music Tracks"   value={fmtN(tracks.length)}         color={C.sky} />
              <KPI icon="🎙️" label="Podcasts"       value={fmtN(podcasts.length)}        color={C.rose} />
              <KPI icon="📻" label="Radio Stations" value={fmtN(radioStations.length)}   color={C.violet} />
              <KPI icon="🛍️" label="Products"       value={fmtN(myProducts.length)}      color={C.orange} />
            </div>

            {/* top content */}
            {topContent.length > 0 && (
              <Card>
                <SH title="TOP PERFORMING CONTENT" />
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>
                      {["#","Title","Type","Plays","Revenue","Likes"].map(h => <TH key={h}>{h}</TH>)}
                    </tr></thead>
                    <tbody>
                      {topContent.slice(0,20).map((c,i) => (
                        <tr key={i} className="cd-tr">
                          <TD style={{ color:C.dim }}>{i+1}</TD>
                          <TD style={{ color:C.text, fontWeight:700 }}>{c.title}</TD>
                          <TD><Badge label={c.type||"track"} color={C.violet} /></TD>
                          <TD style={{ color:C.teal }}>{fmtN(c.plays)}</TD>
                          <TD style={{ color:C.orange }}>{fmt$(c.revenue)}</TD>
                          <TD>{fmtN(c.likes)}</TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* music tracks */}
            {tracks.length > 0 && (
              <Card>
                <SH title="MUSIC TRACKS"
                  action={<Link to="/dashboard/music" style={{ fontSize:"0.7rem", color:C.sky, textDecoration:"none" }}>Manage →</Link>}
                />
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>{["Title","Genre","Plays","Likes","Status"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody>
                      {tracks.slice(0,10).map(t => (
                        <tr key={t.id} className="cd-tr">
                          <TD style={{ color:C.text, fontWeight:700 }}>{t.title}</TD>
                          <TD style={{ color:C.muted }}>{t.genre||"—"}</TD>
                          <TD style={{ color:C.teal }}>{fmtN(t.play_count||t.plays)}</TD>
                          <TD>{fmtN(t.likes_count||t.likes)}</TD>
                          <TD><Badge label={t.is_published?"LIVE":"DRAFT"} color={t.is_published?C.teal:C.dim} /></TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* podcasts */}
            {podcasts.length > 0 && (
              <Card>
                <SH title="PODCASTS"
                  action={<Link to="/dashboard/podcasts" style={{ fontSize:"0.7rem", color:C.rose, textDecoration:"none" }}>Manage →</Link>}
                />
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>{["Title","Episodes","Listeners","Revenue","Status"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody>
                      {podcasts.slice(0,8).map(p => (
                        <tr key={p.id} className="cd-tr">
                          <TD style={{ color:C.text, fontWeight:700 }}>{p.title}</TD>
                          <TD>{fmtN(p.episode_count||p.episodes?.length)}</TD>
                          <TD style={{ color:C.violet }}>{fmtN(p.total_listens)}</TD>
                          <TD style={{ color:C.orange }}>{fmt$(p.monthly_revenue)}</TD>
                          <TD><Badge label={(p.status||"draft").toUpperCase()} color={p.status==="published"?C.teal:C.dim} /></TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* radio */}
            {radioStations.length > 0 && (
              <Card>
                <SH title="RADIO STATIONS"
                  action={<Link to="/dashboard/radio" style={{ fontSize:"0.7rem", color:C.violet, textDecoration:"none" }}>Manage →</Link>}
                />
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>{["Station","Category","Listeners","Status"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody>
                      {radioStations.slice(0,8).map(r => (
                        <tr key={r.id} className="cd-tr">
                          <TD style={{ color:C.text, fontWeight:700 }}>{r.name}</TD>
                          <TD style={{ color:C.muted }}>{r.category||"—"}</TD>
                          <TD style={{ color:C.violet }}>{fmtN(r.listener_count)}</TD>
                          <TD><Badge label={r.is_live?"◉ LIVE":"◌ OFF"} color={r.is_live?C.teal:C.dim} /></TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─────────────── AUDIENCE ─────────────── */}
        {activeTab === "audience" && (
          <div className="cd-tab">
            <div className="cd-kpi-grid">
              <KPI icon="👥" label="Followers"    value={fmtN(profile.followers)}    color={C.violet} />
              <KPI icon="➡" label="Following"    value={fmtN(profile.following)}    color={C.sky} />
              <KPI icon="🎧" label="Total Plays"  value={fmtN(overview.total_plays)} color={C.teal} />
              <KPI icon="❤" label="Total Likes"  value={fmtN(overview.total_likes)} color={C.pink} />
            </div>

            <Card>
              <SH title="PLAYS OVER TIME" />
              <div style={{ height:260 }}>
                {playsData.length
                  ? <Line data={playsChart} options={chartBase} />
                  : <div style={{ textAlign:"center", padding:80, color:C.dim }}>No play data yet</div>}
              </div>
            </Card>

            <Card>
              <SH title="FOLLOWER GROWTH" />
              <div style={{ height:230 }}>
                {audienceData.length
                  ? <Line data={audChart} options={chartBase} />
                  : <div style={{ textAlign:"center", padding:80, color:C.dim }}>No audience data yet</div>}
              </div>
            </Card>

            <div className="cd-half">
              <Card>
                <SH title="SOCIAL SHARES" />
                <div style={{ height:220 }}><Doughnut data={sharesDonut} options={donutOpts} /></div>
              </Card>
              <Card>
                <SH title="CONTENT DISTRIBUTION" />
                <div style={{ height:220 }}><Doughnut data={contentDonut} options={donutOpts} /></div>
              </Card>
            </div>
          </div>
        )}

        {/* ─────────────── STORE ─────────────── */}
        {activeTab === "store" && (
          <div className="cd-tab">
            <div className="cd-kpi-grid">
              <KPI icon="📦" label="Total Products" value={fmtN(myProducts.length)} color={C.orange} />
              <KPI icon="💵" label="Total Sales"    value={fmtN(totalSales)}        color={C.teal} />
              <KPI icon="💰" label="Revenue (90%)"  value={fmt$(productRev)}        color={C.amber} />
              <KPI icon="🥁" label="Beat Sales"     value={fmtN(beatSales.length)}  color={C.violet} />
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginBottom:16 }}>
              <Btn onClick={() => setActiveTab("upload")} color={C.teal}>+ Upload Product</Btn>
              <Link to="/sell-beats" style={{ textDecoration:"none" }}>
                <Btn color={C.violet} style={{ cursor:"pointer" }}>+ Sell Beat</Btn>
              </Link>
            </div>

            {myProducts.length > 0 ? (
              <Card>
                <SH title="MY PRODUCTS" />
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr>
                      {["Product","Price","Sales","Revenue (90%)","Status","Actions"].map(h=><TH key={h}>{h}</TH>)}
                    </tr></thead>
                    <tbody>
                      {[...myProducts].sort((a,b)=>(b.sales_count||0)-(a.sales_count||0)).map(p => (
                        <tr key={p.id} className="cd-tr">
                          <TD style={{ color:C.text, fontWeight:700 }}>{p.title}</TD>
                          <TD style={{ color:C.amber }}>{fmt$(p.price)}</TD>
                          <TD>{fmtN(p.sales_count)}</TD>
                          <TD style={{ color:C.teal, fontWeight:700 }}>{fmt$((p.sales_count||0)*(p.price||0)*.9)}</TD>
                          <TD><Badge label={p.is_active?"LIVE":"DRAFT"} color={p.is_active?C.teal:C.dim} /></TD>
                          <TD>
                            <Btn style={{ marginRight:6, padding:"3px 9px", fontSize:"0.66rem" }}>✏️ Edit</Btn>
                            <Btn color={C.violet} style={{ padding:"3px 9px", fontSize:"0.66rem" }}>👁️ View</Btn>
                          </TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card style={{ textAlign:"center", padding:60 }}>
                <div style={{ fontSize:40, marginBottom:14 }}>🛍️</div>
                <div style={{ color:C.dim, marginBottom:20 }}>No products yet.</div>
                <Btn onClick={() => setActiveTab("upload")}>Upload First Product</Btn>
              </Card>
            )}
          </div>
        )}

        {/* ─────────────── UPLOAD ─────────────── */}
        {activeTab === "upload" && (
          <div className="cd-tab">
            <Card>
              <SH title="UPLOAD NEW PRODUCT" />
              <p style={{ color:C.dim, fontSize:"0.8rem", marginBottom:20 }}>
                Add to your marketplace and start earning. You keep 90%.
              </p>
              <ProductUploadForm onUpload={onProductUploaded} />
            </Card>
          </div>
        )}

        {/* ─────────────── FAN TIERS ─────────────── */}
        {activeTab === "fans" && (
          <div className="cd-tab">
            <Card>
              <SH title="FAN MEMBERSHIP TIERS"
                action={<Badge label="Patreon-style" color={C.amber} />}
              />
              <p style={{ color:C.dim, fontSize:"0.8rem", marginBottom:20 }}>
                Create up to 5 tiers. Fans pay monthly. Gated content unlocks per tier.
              </p>
              <FanTierManager />
            </Card>
          </div>
        )}

        {/* ─────────────── EMBED ─────────────── */}
        {activeTab === "embed" && (
          <div className="cd-tab">
            <Card>
              <SH title="EMBED CODE GENERATOR"
                action={<Badge label="Share anywhere" color={C.sky} />}
              />
              <p style={{ color:C.dim, fontSize:"0.8rem", marginBottom:20 }}>
                Get embeddable player code for any track, podcast, or radio station.
              </p>
              <EmbedCodeGenerator />
            </Card>
          </div>
        )}

        {/* ─────────────── ACTIVITY ─────────────── */}
        {activeTab === "activity" && (
          <div className="cd-tab">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:"0.92rem", fontWeight:700, color:C.text }}>Activity Log</div>
                <div style={{ fontSize:"0.68rem", color:C.dim, marginTop:3 }}>Auto-refreshes every 30 seconds</div>
              </div>
              <Btn onClick={refreshActivity} disabled={activityBusy}>
                {activityBusy ? "⟳" : "↺"} REFRESH
              </Btn>
            </div>

            <Card>
              {recentActivity.length > 0 ? recentActivity.map((a,i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:15,
                  padding:"13px 0",
                  borderBottom: i < recentActivity.length-1 ? "1px solid #0c1420" : "none",
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:10, flexShrink:0,
                    background:`${C.teal}0c`, display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:18,
                  }}>
                    {actIcon(a.type)}
                  </div>
                  <div style={{ flex:1, fontSize:"0.83rem", color:C.muted }}>{a.text}</div>
                  <div style={{ fontSize:"0.68rem", color:C.dim, whiteSpace:"nowrap" }}>{a.time}</div>
                </div>
              )) : (
                <div style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:36, marginBottom:12, color:C.dim }}>◌</div>
                  <div style={{ color:C.dim }}>No activity yet. Start creating!</div>
                </div>
              )}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default CreatorDashboard;