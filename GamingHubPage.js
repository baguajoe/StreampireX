// =============================================================================
// GamingHubPage.js — Gaming Hub Landing Page
// =============================================================================
// Route: /gaming
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const GAMES = [
  { id:'fortnite',    name:'Fortnite',         icon:'🎮', genre:'Battle Royale', players:0 },
  { id:'warzone',     name:'Warzone',           icon:'🔫', genre:'FPS',           players:0 },
  { id:'valorant',    name:'Valorant',          icon:'⚡', genre:'Tactical FPS',  players:0 },
  { id:'minecraft',   name:'Minecraft',         icon:'⛏️', genre:'Sandbox',       players:0 },
  { id:'fifa',        name:'EA Sports FC',      icon:'⚽', genre:'Sports',        players:0 },
  { id:'apex',        name:'Apex Legends',      icon:'🔥', genre:'Battle Royale', players:0 },
  { id:'lol',         name:'League of Legends', icon:'🏆', genre:'MOBA',          players:0 },
  { id:'rocketleague',name:'Rocket League',     icon:'🚀', genre:'Sports',        players:0 },
  { id:'cod',         name:'Call of Duty',      icon:'💣', genre:'FPS',           players:0 },
  { id:'chess',       name:'Chess',             icon:'♟️', genre:'Strategy',      players:0 },
  { id:'gta',         name:'GTA Online',        icon:'🚗', genre:'Open World',    players:0 },
  { id:'tekken',      name:'Tekken 8',          icon:'👊', genre:'Fighting',      players:0 },
];

const S = {
  page:    { minHeight:'100vh', background:'#06060f', color:'#e0e0e0', fontFamily:'Inter, sans-serif' },
  hero:    { background:'linear-gradient(135deg, #06060f 0%, #0a0a1a 50%, #060610 100%)',
             padding:'60px 32px 40px', textAlign:'center', borderBottom:'1px solid #1a1a2e' },
  heroTitle:{ fontSize:36, fontWeight:900, color:'#00ffc8', marginBottom:8 },
  heroSub: { color:'#888', fontSize:16, marginBottom:32 },
  heroGrid:{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' },
  heroBtn: (c='#00ffc8') => ({
    padding:'12px 28px', border:`1px solid ${c}`, borderRadius:8,
    background:`${c}18`, color:c, cursor:'pointer', fontSize:14,
    fontWeight:700, textDecoration:'none', display:'inline-block',
  }),
  body:    { padding:'32px' },
  section: { marginBottom:40 },
  sTitle:  { fontSize:18, fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8 },
  grid3:   { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:12 },
  grid2:   { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 },
  gameCard:{ background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:10, padding:16,
             cursor:'pointer', textAlign:'center', transition:'border-color 0.15s',
             textDecoration:'none', color:'inherit' },
  gameIcon:{ fontSize:32, marginBottom:8 },
  gameName:{ fontSize:12, fontWeight:700, color:'#e0e0e0' },
  gameGenre:{ fontSize:10, color:'#666', marginTop:2 },
  featureCard:{ background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:12, padding:24,
                textDecoration:'none', color:'inherit', display:'block' },
  featIcon:{ fontSize:32, marginBottom:12 },
  featTitle:{ fontSize:15, fontWeight:700, color:'#e0e0e0', marginBottom:6 },
  featDesc: { fontSize:12, color:'#888', lineHeight:1.6 },
  badge:   (c) => ({ padding:'2px 8px', borderRadius:10, background:`${c}18`, color:c, fontSize:10 }),
  statsRow:{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:32 },
  stat:    { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:10, padding:16,
             flex:'1 1 120px', textAlign:'center' },
  statV:   { fontSize:22, fontWeight:800, color:'#00ffc8' },
  statL:   { fontSize:10, color:'#888', marginTop:2 },
};

const FEATURES = [
  { icon:'💬', title:'Gamer Chatrooms',   desc:'Genre-based chat rooms. Find players for your game.',        route:'/gamers-chatroom',  color:'#00ffc8' },
  { icon:'🔍', title:'Squad Finder',      desc:'LFG board. Find teammates by game, rank, and playstyle.',   route:'/squad-finder',     color:'#00ffc8' },
  { icon:'🧑‍🤝‍🧑', title:'Team Room',    desc:'Private voice + video room for your team.',                  route:'/team-room/main',   color:'#FF6600' },
  { icon:'🏆', title:'Tournaments',       desc:'Create or join brackets. 1v1 to 32-player tournaments.',    route:'/tournaments',      color:'#FF6600' },
  { icon:'📊', title:'Leaderboards',      desc:'Global and per-game rankings. Climb the ladder.',           route:'/leaderboards',     color:'#635bff' },
  { icon:'👤', title:'Gamer Profile',     desc:'Your gaming card. Games, stats, clips, team history.',      route:'/edit-gamer-profile',color:'#635bff' },
];

export default function GamingHubPage() {
  const navigate  = useNavigate();
  const [stats,   setStats]   = useState({ players:0, teams:0, tournaments:0, chatrooms:0 });
  const [activeGame, setActiveGame] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/gaming/stats`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  return (
    <div style={S.page}>

      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroTitle}>🎮 Gaming Hub</div>
        <div style={S.heroSub}>Find squads, join tournaments, climb leaderboards</div>
        <div style={S.heroGrid}>
          <Link to="/squad-finder"    style={S.heroBtn()}>🔍 Find Squad</Link>
          <Link to="/tournaments"     style={S.heroBtn('#FF6600')}>🏆 Tournaments</Link>
          <Link to="/leaderboards"    style={S.heroBtn('#635bff')}>📊 Leaderboards</Link>
          <Link to="/gamers-chatroom" style={S.heroBtn('#888')}>💬 Chatrooms</Link>
        </div>
      </div>

      <div style={S.body}>

        {/* Stats */}
        <div style={S.statsRow}>
          {[
            ['🎮', stats.players || '—', 'Active Players'],
            ['👥', stats.teams   || '—', 'Teams'],
            ['🏆', stats.tournaments || '—', 'Tournaments'],
            ['💬', stats.chatrooms   || '—', 'Chatrooms'],
          ].map(([icon, val, label]) => (
            <div key={label} style={S.stat}>
              <div style={{ fontSize:20 }}>{icon}</div>
              <div style={S.statV}>{val}</div>
              <div style={S.statL}>{label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={S.section}>
          <div style={S.sTitle}>⚡ Features</div>
          <div style={S.grid2}>
            {FEATURES.map(f => (
              <Link key={f.route} to={f.route} style={S.featureCard}>
                <div style={S.featIcon}>{f.icon}</div>
                <div style={S.featTitle}>{f.title}</div>
                <div style={S.featDesc}>{f.desc}</div>
                <div style={{ marginTop:10 }}>
                  <span style={S.badge(f.color)}>Open →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Game Library */}
        <div style={S.section}>
          <div style={S.sTitle}>🎲 Browse by Game</div>
          <div style={S.grid3}>
            {GAMES.map(g => (
              <Link
                key={g.id}
                to={`/squad-finder?game=${g.id}`}
                style={{ ...S.gameCard, borderColor: activeGame===g.id ? '#00ffc8' : '#1a1a2e' }}
                onMouseEnter={() => setActiveGame(g.id)}
                onMouseLeave={() => setActiveGame(null)}
              >
                <div style={S.gameIcon}>{g.icon}</div>
                <div style={S.gameName}>{g.name}</div>
                <div style={S.gameGenre}>{g.genre}</div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
