// =============================================================================
// RealAnalyticsDashboard.js — Live Creator Analytics
// =============================================================================
// Location: src/front/js/pages/RealAnalyticsDashboard.js
// Route: /analytics  (replace existing ArtistDashboard analytics tab)
//
// Replaces all the hardcoded/mocked analytics with real data from:
//   - /api/analytics/plays         → per-track play counts, daily breakdown
//   - /api/analytics/revenue       → real earnings from routes.py (already real)
//   - /api/analytics/audience      → followers gained over time
//   - /api/analytics/content       → top performing content
//   - /api/analytics/beat-sales    → beat store purchases
//   - /api/analytics/geography     → top countries (from stream plays)
//
// Charts: recharts (already in your dependencies)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}` });

const TEAL     = '#00ffc8';
const ORANGE   = '#FF6600';
const PURPLE   = '#7b61ff';
const YELLOW   = '#fbbf24';
const PIE_COLORS = [TEAL, ORANGE, PURPLE, YELLOW, '#f472b6', '#60a5fa'];

const fmtCurrency = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const fmtNumber   = (n) => (n || 0).toLocaleString();

// =============================================================================
// MAIN DASHBOARD
// =============================================================================
const RealAnalyticsDashboard = () => {
  const [period, setPeriod]         = useState('30d'); // 7d | 30d | 90d | 1y
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('overview');
  const [error, setError]           = useState('');

  // Data state
  const [overview, setOverview]     = useState(null);
  const [playsData, setPlaysData]   = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [topContent, setTopContent] = useState([]);
  const [beatSales, setBeatSales]   = useState([]);
  const [audienceData, setAudienceData] = useState([]);
  const [geoData, setGeoData]       = useState([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoints = [
        `/api/analytics/overview?period=${period}`,
        `/api/analytics/plays?period=${period}`,
        `/api/analytics/revenue?period=${period}`,
        `/api/analytics/top-content?period=${period}`,
        `/api/analytics/beat-sales?period=${period}`,
        `/api/analytics/audience?period=${period}`,
        `/api/analytics/geography?period=${period}`,
        `/api/earnings`,
      ];

      const results = await Promise.allSettled(
        endpoints.map(ep => fetch(`${BACKEND_URL}${ep}`, { headers: getHeaders() }).then(r => r.ok ? r.json() : null))
      );

      const [overviewRes, playsRes, revRes, topRes, beatRes, audRes, geoRes, earningsRes] = results.map(r => r.status === 'fulfilled' ? r.value : null);

      if (overviewRes) setOverview(overviewRes);
      if (playsRes?.daily)    setPlaysData(playsRes.daily);
      if (revRes?.monthly)    setRevenueData(revRes.monthly);
      if (topRes?.tracks)     setTopContent(topRes.tracks || []);
      if (beatRes?.sales)     setBeatSales(beatRes.sales || []);
      if (audRes?.daily)      setAudienceData(audRes.daily || []);
      if (geoRes?.countries)  setGeoData(geoRes.countries || []);
      if (earningsRes)        setRevenueBreakdown(earningsRes);
    } catch (e) {
      setError('Failed to load analytics');
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Styles ──
  const S = {
    page:   { minHeight:'100vh', background:'#0d1117', color:'#c9d1d9', fontFamily:'JetBrains Mono, Inter, monospace', padding:'24px 32px' },
    card:   { background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:20, marginBottom:16 },
    metric: { background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:'18px 20px' },
    label:  { fontSize:'0.7rem', color:'#8b949e', fontWeight:600, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 },
    value:  { fontSize:'1.8rem', fontWeight:700, color:'#e6edf3', lineHeight:1 },
    change: (v) => ({ fontSize:'0.72rem', marginTop:5, color: v >= 0 ? '#00ffc8' : '#ff3b30' }),
    tab:    (a) => ({ padding:'7px 16px', borderRadius:5, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', fontWeight:600, background: a ? '#00ffc8' : '#21262d', color: a ? '#000' : '#c9d1d9' }),
    period: (a) => ({ padding:'4px 12px', borderRadius:4, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.72rem', background: a ? '#30363d' : 'transparent', color: a ? '#c9d1d9' : '#5a7088' }),
    th:     { textAlign:'left', padding:'8px 12px', fontSize:'0.68rem', color:'#8b949e', fontWeight:600, borderBottom:'1px solid #30363d' },
    td:     { padding:'10px 12px', fontSize:'0.8rem', borderBottom:'1px solid #21262d' },
  };

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'#1c2333', border:'1px solid #30363d', borderRadius:6, padding:'8px 12px', fontSize:'0.75rem' }}>
        <div style={{ color:'#8b949e', marginBottom:4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' && p.value < 1000 && p.name?.includes('$') ? fmtCurrency(p.value) : fmtNumber(p.value)}</strong></div>
        ))}
      </div>
    );
  };

  const PERIODS = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: '1y', label: '1 Year' },
  ];

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'2rem', marginBottom:12 }}>📊</div>
        <div style={{ color:'#5a7088' }}>Loading analytics...</div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#e6edf3' }}>📊 Analytics</div>
        <div style={{ display:'flex', gap:3, background:'#161b22', borderRadius:6, padding:3 }}>
          {PERIODS.map(p => (
            <button key={p.id} style={S.period(period === p.id)} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ color:'#ff9500', marginBottom:12 }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {['overview', 'plays', 'revenue', 'content', 'beats', 'audience'].map(t => (
          <button key={t} style={S.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
            {{ overview:'Overview', plays:'Plays', revenue:'Revenue', content:'Top Content', beats:'Beat Sales', audience:'Audience' }[t]}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <>
          {/* Key metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:'Total Plays', value: fmtNumber(overview?.total_plays), change: overview?.plays_change, icon:'🎧' },
              { label:'Total Revenue', value: fmtCurrency(overview?.total_revenue || revenueBreakdown?.total), change: overview?.revenue_change, icon:'💰' },
              { label:'Followers', value: fmtNumber(overview?.followers), change: overview?.followers_change, icon:'👥' },
              { label:'Beat Sales', value: fmtNumber(overview?.beat_sales), change: overview?.beat_sales_change, icon:'🎵' },
            ].map((m, i) => (
              <div key={i} style={S.metric}>
                <div style={{ fontSize:'1.3rem', marginBottom:6 }}>{m.icon}</div>
                <div style={S.label}>{m.label}</div>
                <div style={S.value}>{m.value ?? '–'}</div>
                {m.change !== undefined && (
                  <div style={S.change(m.change)}>{m.change >= 0 ? '↑' : '↓'} {Math.abs(m.change || 0)}% vs prev period</div>
                )}
              </div>
            ))}
          </div>

          {/* Revenue breakdown pie */}
          {revenueBreakdown && (
            <div style={{ ...S.card, display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <div>
                <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:16 }}>Revenue Breakdown</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name:'Beat Sales', value: parseFloat(revenueBreakdown.products || 0) },
                        { name:'Tips', value: parseFloat(revenueBreakdown.tips || 0) },
                        { name:'Memberships', value: parseFloat(revenueBreakdown.subscriptions || 0) },
                        { name:'Ad Revenue', value: parseFloat(revenueBreakdown.ads || 0) },
                        { name:'Donations', value: parseFloat(revenueBreakdown.donations || 0) },
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" outerRadius={80}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent*100).toFixed(0)}%` : ''}
                    >
                      {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={{ background:'#1c2333', border:'1px solid #30363d', fontSize:'0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:12 }}>This Period</div>
                {[
                  { label:'Beat & Product Sales', val: revenueBreakdown.products, color: TEAL },
                  { label:'Fan Tips', val: revenueBreakdown.tips, color: ORANGE },
                  { label:'Fan Memberships', val: revenueBreakdown.subscriptions, color: PURPLE },
                  { label:'Ad Revenue', val: revenueBreakdown.ads, color: YELLOW },
                  { label:'Donations', val: revenueBreakdown.donations, color: '#f472b6' },
                ].map((r, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #21262d' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:r.color }} />
                      <span style={{ fontSize:'0.8rem' }}>{r.label}</span>
                    </div>
                    <span style={{ fontWeight:700, color: r.color }}>{fmtCurrency(r.val)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontWeight:700, borderTop:'1px solid #30363d', marginTop:4 }}>
                  <span>Total Earned</span>
                  <span style={{ color: TEAL, fontSize:'1.1rem' }}>{fmtCurrency(revenueBreakdown.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Plays over time */}
          {playsData.length > 0 && (
            <div style={S.card}>
              <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:16 }}>Plays Over Time</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={playsData}>
                  <defs>
                    <linearGradient id="playsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="date" tick={{ fontSize:11, fill:'#5a7088' }} tickLine={false} />
                  <YAxis tick={{ fontSize:11, fill:'#5a7088' }} tickLine={false} axisLine={false} />
                  <Tooltip content={customTooltip} />
                  <Area type="monotone" dataKey="plays" name="Plays" stroke={TEAL} fill="url(#playsGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── PLAYS ── */}
      {activeTab === 'plays' && (
        <div style={S.card}>
          <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:16 }}>Daily Plays</div>
          {playsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={playsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="date" tick={{ fontSize:11, fill:'#5a7088' }} />
                <YAxis tick={{ fontSize:11, fill:'#5a7088' }} axisLine={false} tickLine={false} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="plays" name="Plays" fill={TEAL} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign:'center', padding:40, color:'#5a7088' }}>No play data yet</div>}
        </div>
      )}

      {/* ── REVENUE ── */}
      {activeTab === 'revenue' && (
        <>
          <div style={S.card}>
            <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:16 }}>Monthly Revenue</div>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:'#5a7088' }} />
                  <YAxis tick={{ fontSize:11, fill:'#5a7088' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={customTooltip} />
                  <Bar dataKey="revenue" name="Revenue $" fill={ORANGE} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign:'center', padding:40, color:'#5a7088' }}>No revenue data yet</div>}
          </div>
          {/* Revenue table */}
          {revenueBreakdown && (
            <div style={S.card}>
              <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:12 }}>Revenue Sources</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Source','This Period','This Month','All Time'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {[
                    { src:'Beat & Product Sales', period: revenueBreakdown.products, month: revenueBreakdown.products, all: revenueBreakdown.products },
                    { src:'Fan Tips', period: revenueBreakdown.tips, month: revenueBreakdown.tips, all: revenueBreakdown.tips },
                    { src:'Fan Memberships', period: revenueBreakdown.subscriptions, month: revenueBreakdown.subscriptions, all: revenueBreakdown.subscriptions },
                    { src:'Ad Revenue', period: revenueBreakdown.ads, month: revenueBreakdown.ads, all: revenueBreakdown.ads },
                    { src:'Donations', period: revenueBreakdown.donations, month: revenueBreakdown.donations, all: revenueBreakdown.donations },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.src}</td>
                      <td style={{ ...S.td, color: TEAL, fontWeight:600 }}>{fmtCurrency(r.period)}</td>
                      <td style={{ ...S.td, color:'#c9d1d9' }}>{fmtCurrency(r.month)}</td>
                      <td style={{ ...S.td, color:'#c9d1d9' }}>{fmtCurrency(r.all)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop:`2px solid #30363d` }}>
                    <td style={{ ...S.td, fontWeight:700, color:'#e6edf3' }}>Total</td>
                    <td style={{ ...S.td, color: TEAL, fontWeight:700, fontSize:'1rem' }}>{fmtCurrency(revenueBreakdown.total)}</td>
                    <td style={{ ...S.td, color: TEAL, fontWeight:700 }}>{fmtCurrency(revenueBreakdown.this_month)}</td>
                    <td style={{ ...S.td, color: TEAL, fontWeight:700 }}>{fmtCurrency(revenueBreakdown.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TOP CONTENT ── */}
      {activeTab === 'content' && (
        <div style={S.card}>
          <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:16 }}>Top Performing Content</div>
          {topContent.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#5a7088' }}>No content data yet. Upload tracks to see analytics.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['#','Title','Type','Plays','Revenue','Likes'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {topContent.slice(0,20).map((t, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, color:'#5a7088', width:30 }}>{i+1}</td>
                    <td style={{ ...S.td, color:'#e6edf3', fontWeight:600 }}>{t.title}</td>
                    <td style={{ ...S.td }}><span style={{ background:'#21262d', borderRadius:4, padding:'1px 8px', fontSize:'0.68rem' }}>{t.type || 'track'}</span></td>
                    <td style={{ ...S.td, color: TEAL }}>{fmtNumber(t.plays)}</td>
                    <td style={{ ...S.td, color: ORANGE }}>{fmtCurrency(t.revenue)}</td>
                    <td style={{ ...S.td }}>{fmtNumber(t.likes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── BEAT SALES ── */}
      {activeTab === 'beats' && (
        <div style={S.card}>
          <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:16 }}>Beat Sales History</div>
          {beatSales.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#5a7088' }}>No beat sales yet. List your beats in the Beat Store.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Beat','License','Buyer','Date','Amount','Your Cut'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {beatSales.map((s, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, color:'#e6edf3', fontWeight:600 }}>{s.beat_title}</td>
                    <td style={{ ...S.td }}><span style={{ background:'rgba(0,255,200,0.1)', color: TEAL, borderRadius:4, padding:'1px 8px', fontSize:'0.68rem' }}>{s.license_type}</span></td>
                    <td style={{ ...S.td, color:'#8b949e' }}>{s.buyer_name || 'Anonymous'}</td>
                    <td style={{ ...S.td, color:'#5a7088' }}>{new Date(s.purchased_at).toLocaleDateString()}</td>
                    <td style={{ ...S.td, color: ORANGE }}>{fmtCurrency(s.amount_paid)}</td>
                    <td style={{ ...S.td, color: TEAL, fontWeight:700 }}>{fmtCurrency(s.producer_earnings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── AUDIENCE ── */}
      {activeTab === 'audience' && (
        <>
          <div style={S.card}>
            <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:16 }}>Follower Growth</div>
            {audienceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={audienceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="date" tick={{ fontSize:11, fill:'#5a7088' }} />
                  <YAxis tick={{ fontSize:11, fill:'#5a7088' }} axisLine={false} tickLine={false} />
                  <Tooltip content={customTooltip} />
                  <Line type="monotone" dataKey="followers" name="Followers" stroke={PURPLE} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="new_followers" name="New Followers" stroke={TEAL} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign:'center', padding:40, color:'#5a7088' }}>No audience data yet</div>}
          </div>

          {/* Geography */}
          {geoData.length > 0 && (
            <div style={S.card}>
              <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:16 }}>Top Countries</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={geoData.slice(0,6)} cx="50%" cy="50%" outerRadius={80} dataKey="plays" nameKey="country" label={({ country, percent }) => percent > 0.05 ? country : ''}>
                      {geoData.slice(0,6).map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtNumber(v)} contentStyle={{ background:'#1c2333', border:'1px solid #30363d', fontSize:'0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div>
                  {geoData.slice(0,8).map((c, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #21262d', fontSize:'0.8rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {c.flag} {c.country}
                      </div>
                      <span style={{ color: TEAL }}>{fmtNumber(c.plays)} plays</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RealAnalyticsDashboard;