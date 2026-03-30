// =============================================================================
// LeaderboardPage.js — Gaming Leaderboards
// =============================================================================
// Route: /leaderboards
// Features: Global + per-game rankings, weekly/monthly/all-time filters
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const GAMES = ['All Games','Fortnite','Warzone','Valorant','Apex Legends','FIFA',
               'Rocket League','Call of Duty','League of Legends','Chess'];
const PERIODS = ['all-time','monthly','weekly'];

const S = {
  page:    { minHeight:'100vh', background:'#06060f', color:'#e0e0e0', fontFamily:'Inter, sans-serif', padding:24 },
  header:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  title:   { fontSize:22, fontWeight:800, color:'#00ffc8' },
  filters: { display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 },
  filter:  (a) => ({ padding:'6px 14px', borderRadius:20, border:'1px solid',
             borderColor:a?'#00ffc8':'#333', background:a?'rgba(0,255,200,0.1)':'transparent',
             color:a?'#00ffc8':'#888', cursor:'pointer', fontSize:12, fontFamily:'Inter, sans-serif' }),
  table:   { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:12, overflow:'hidden' },
  thead:   { background:'#080810', display:'grid', gridTemplateColumns:'60px 1fr 120px 100px 100px',
             padding:'10px 16px', fontSize:11, color:'#888', borderBottom:'1px solid #1a1a2e' },
  trow:    (rank) => ({
    display:'grid', gridTemplateColumns:'60px 1fr 120px 100px 100px',
    padding:'12px 16px', borderBottom:'1px solid #0d0d1a', alignItems:'center',
    background: rank <= 3 ? `rgba(0,255,200,${0.03 + (4-rank)*0.02})` : 'transparent',
  }),
  rank:    (r) => ({
    fontWeight:900, fontSize:r<=3?18:14,
    color: r===1?'#FFD700':r===2?'#C0C0C0':r===3?'#CD7F32':'#888',
  }),
  avatar:  { width:32, height:32, borderRadius:'50%', background:'#1a1a2e',
             display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginRight:10 },
  name:    { fontWeight:600, fontSize:13 },
  game:    { fontSize:11, color:'#888' },
  score:   { color:'#00ffc8', fontWeight:700, fontSize:14 },
  wins:    { color:'#FF6600', fontSize:13 },
  btn:     (c='#555') => ({ padding:'6px 16px', border:`1px solid ${c}`, borderRadius:6,
             background:`${c}12`, color:c, cursor:'pointer', fontSize:11,
             fontFamily:'Inter, sans-serif', textDecoration:'none', display:'inline-block' }),
  podium:  { display:'flex', justifyContent:'center', gap:16, marginBottom:32, alignItems:'flex-end' },
  podCard: (rank) => ({
    background:'#0d0d1a', border:`1px solid ${rank===1?'#FFD700':rank===2?'#C0C0C0':'#CD7F32'}`,
    borderRadius:12, padding:16, textAlign:'center', width:140,
    height: rank===1?180:rank===2?160:140,
    display:'flex', flexDirection:'column', justifyContent:'flex-end',
  }),
};

const MOCK_LEADERS = Array.from({ length: 20 }, (_, i) => ({
  id: i+1, rank: i+1,
  username: `Player${String.fromCharCode(65 + (i % 26))}${i+1}`,
  avatar: null,
  game: GAMES[1 + (i % (GAMES.length-1))],
  score: Math.round(10000 - i * 420 + Math.random() * 200),
  wins: Math.round(80 - i * 3.5),
  tournaments: Math.round(15 - i * 0.6),
}));

export default function LeaderboardPage() {
  const [game,    setGame]    = useState('All Games');
  const [period,  setPeriod]  = useState('all-time');
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myRank,  setMyRank]  = useState(null);

  const fetchLeaders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (game !== 'All Games') params.set('game', game);
      const res = await fetch(`${BACKEND}/api/gaming/leaderboard?${params}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLeaders(data.leaders || []);
        setMyRank(data.my_rank || null);
      } else {
        setLeaders(MOCK_LEADERS.filter(l => game === 'All Games' || l.game === game));
      }
    } catch (e) {
      setLeaders(MOCK_LEADERS.filter(l => game === 'All Games' || l.game === game));
    }
    setLoading(false);
  }, [game, period]);

  useEffect(() => { fetchLeaders(); }, [fetchLeaders]);

  const top3 = leaders.slice(0, 3);

  return (
    <div style={S.page}>

      <div style={S.header}>
        <div>
          <div style={S.title}>📊 Leaderboards</div>
          <div style={{ color:'#888', fontSize:12, marginTop:2 }}>
            {myRank ? `Your rank: #${myRank}` : 'Compete to earn your rank'}
          </div>
        </div>
        <Link to="/gaming" style={S.btn()}>← Gaming Hub</Link>
      </div>

      {/* Filters */}
      <div style={S.filters}>
        {GAMES.map(g => (
          <button key={g} style={S.filter(game===g)} onClick={() => setGame(g)}>{g}</button>
        ))}
      </div>
      <div style={{ ...S.filters, marginBottom:24 }}>
        {PERIODS.map(p => (
          <button key={p} style={S.filter(period===p)} onClick={() => setPeriod(p)}>
            {p === 'all-time' ? '🏆 All Time' : p === 'monthly' ? '📅 Monthly' : '⚡ Weekly'}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {top3.length >= 3 && (
        <div style={S.podium}>
          {[top3[1], top3[0], top3[2]].map((p, i) => {
            const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const medal = rank===1?'🥇':rank===2?'🥈':'🥉';
            return (
              <div key={p.id} style={S.podCard(rank)}>
                <div style={{ fontSize:24, marginBottom:4 }}>{medal}</div>
                <div style={{ fontSize:24, marginBottom:4 }}>{p.avatar || '👤'}</div>
                <div style={{ fontWeight:700, fontSize:12, color:'#e0e0e0' }}>{p.username}</div>
                <div style={{ color:'#00ffc8', fontWeight:800, fontSize:14 }}>{p.score.toLocaleString()}</div>
                <div style={{ color:'#888', fontSize:10 }}>{p.wins} wins</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      {loading ? (
        <div style={{ color:'#888', textAlign:'center', padding:40 }}>Loading…</div>
      ) : (
        <div style={S.table}>
          <div style={S.thead}>
            <div>Rank</div>
            <div>Player</div>
            <div>Game</div>
            <div>Score</div>
            <div>Wins</div>
          </div>
          {leaders.map((p) => (
            <div key={p.id} style={S.trow(p.rank)}>
              <div style={S.rank(p.rank)}>
                {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
              </div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <div style={S.avatar}>{p.avatar || '👤'}</div>
                <div>
                  <div style={S.name}>{p.username}</div>
                  <div style={S.game}>{p.tournaments || 0} tournaments</div>
                </div>
              </div>
              <div style={{ color:'#888', fontSize:12 }}>{p.game}</div>
              <div style={S.score}>{p.score.toLocaleString()}</div>
              <div style={S.wins}>{p.wins}</div>
            </div>
          ))}
          {!leaders.length && (
            <div style={{ padding:32, textAlign:'center', color:'#555' }}>
              No rankings yet for {game} ({period}). Be the first!
            </div>
          )}
        </div>
      )}

    </div>
  );
}
