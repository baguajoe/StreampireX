// =============================================================================
// TournamentPage.js — Tournament System
// =============================================================================
// Route: /tournaments
// Features: Browse/create/join tournaments, bracket viewer, results
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ ...getHeaders(), 'Content-Type': 'application/json' });

const GAMES = ['Fortnite','Warzone','Valorant','Apex Legends','FIFA','Rocket League',
               'Call of Duty','League of Legends','Tekken 8','Chess','Minecraft','GTA Online','Other'];
const FORMATS = ['Single Elimination','Double Elimination','Round Robin','Swiss'];
const SIZES   = [4, 8, 16, 32];

const S = {
  page:    { minHeight:'100vh', background:'#06060f', color:'#e0e0e0', fontFamily:'Inter, sans-serif', padding:24 },
  header:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  title:   { fontSize:22, fontWeight:800, color:'#00ffc8' },
  tabs:    { display:'flex', gap:4, marginBottom:20 },
  tab:     (a) => ({ padding:'8px 20px', borderRadius:6, border:'1px solid',
             borderColor:a?'#00ffc8':'#333', background:a?'rgba(0,255,200,0.1)':'transparent',
             color:a?'#00ffc8':'#888', cursor:'pointer', fontSize:13, fontFamily:'Inter, sans-serif' }),
  grid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 },
  card:    { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:12, padding:20 },
  cardTitle:{ fontSize:15, fontWeight:700, marginBottom:6 },
  cardMeta: { color:'#888', fontSize:12, marginBottom:12 },
  badge:   (c) => ({ padding:'3px 10px', borderRadius:10, background:`${c}18`, color:c, fontSize:10, border:`1px solid ${c}33` }),
  btn:     (c='#00ffc8') => ({ padding:'8px 20px', border:`1px solid ${c}`, borderRadius:6,
             background:`${c}12`, color:c, cursor:'pointer', fontSize:12, fontFamily:'Inter, sans-serif' }),
  form:    { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:12, padding:24, marginBottom:24 },
  input:   { width:'100%', background:'#080810', border:'1px solid #333', borderRadius:6,
             color:'#e0e0e0', padding:'10px 12px', fontSize:13, fontFamily:'Inter, sans-serif',
             boxSizing:'border-box', marginBottom:12 },
  label:   { fontSize:11, color:'#888', marginBottom:4, display:'block' },
  row:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  bracket: { overflowX:'auto', padding:16 },
  roundCol:{ display:'flex', flexDirection:'column', gap:16, minWidth:180, marginRight:32 },
  matchBox:{ background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:8, padding:12,
             marginBottom:8, fontSize:12 },
  matchPlayer:{ padding:'4px 0', borderBottom:'1px solid #111', color:'#aaa' },
  winner:  { color:'#00ffc8', fontWeight:700 },
  status:  { color:'#FF6600', fontSize:11, marginTop:8 },
};

const STATUS_COLORS = { open:'#00ffc8', active:'#FF6600', completed:'#888', cancelled:'#ff4444' };

// ── Mock bracket generator ────────────────────────────────────────────────────
function generateBracket(participants, format) {
  const rounds = [];
  let current  = [...participants];

  while (current.length > 1) {
    const matches = [];
    for (let i = 0; i < current.length; i += 2) {
      matches.push({
        player1: current[i]   || 'TBD',
        player2: current[i+1] || 'TBD',
        winner:  null,
      });
    }
    rounds.push(matches);
    current = matches.map(m => m.winner || 'TBD');
  }
  return rounds;
}

export default function TournamentPage() {
  const navigate   = useNavigate();
  const [tab,      setTab]      = useState('browse');
  const [tourneys, setTourneys] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState('');
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    name: '', game: 'Fortnite', format: 'Single Elimination',
    size: 8, description: '', prize: '', starts_at: '',
    is_public: true, entry_fee: 0,
  });

  const token = getToken();

  const fetchTourneys = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND}/api/gaming/tournaments`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTourneys(data.tournaments || data || []);
      } else {
        // mock data for demo
        setTourneys([
          { id:1, name:'Weekly Fortnite Cup', game:'Fortnite', format:'Single Elimination',
            size:16, participants:9, status:'open', prize:'$50 Gift Card', starts_at:'2026-04-05T18:00:00Z',
            creator_name:'StreamPireX' },
          { id:2, name:'Valorant 1v1 Ladder', game:'Valorant', format:'Round Robin',
            size:8, participants:8, status:'active', prize:'',  starts_at:'2026-04-01T20:00:00Z',
            creator_name:'ValorantPro99' },
          { id:3, name:'Chess Championship', game:'Chess', format:'Swiss',
            size:32, participants:24, status:'open', prize:'$25',  starts_at:'2026-04-10T15:00:00Z',
            creator_name:'ChessKing' },
        ]);
      }
    } catch (e) {
      setTourneys([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTourneys(); }, [fetchTourneys]);

  const handleCreate = async () => {
    if (!token) { navigate('/login'); return; }
    if (!form.name.trim()) { setStatus('Enter a tournament name'); return; }
    setStatus('Creating…');
    try {
      const res  = await fetch(`${BACKEND}/api/gaming/tournaments`, {
        method: 'POST',
        headers: getJSONHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('✅ Tournament created!');
        setTab('browse');
        fetchTourneys();
      } else {
        const d = await res.json();
        setStatus(d.error || 'Failed to create');
      }
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
  };

  const handleJoin = async (id) => {
    if (!token) { navigate('/login'); return; }
    try {
      const res  = await fetch(`${BACKEND}/api/gaming/tournaments/${id}/join`, {
        method: 'POST', headers: getJSONHeaders()
      });
      const d    = await res.json();
      if (res.ok) { setStatus('✅ Joined!'); fetchTourneys(); }
      else setStatus(d.error || 'Could not join');
    } catch (e) { setStatus('Error: ' + e.message); }
  };

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // bracket view
  const mockParticipants = selected
    ? Array.from({ length: selected.participants || selected.size }, (_, i) => `Player ${i+1}`)
    : [];
  const bracket = selected ? generateBracket(mockParticipants, selected.format) : [];

  return (
    <div style={S.page}>

      <div style={S.header}>
        <div>
          <div style={S.title}>🏆 Tournaments</div>
          <div style={{ color:'#888', fontSize:12, marginTop:2 }}>Compete, win, climb the ranks</div>
        </div>
        <Link to="/gaming" style={S.btn('#555')}>← Gaming Hub</Link>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {['browse','create','my-tournaments'].map(t => (
          <button key={t} style={S.tab(tab===t)} onClick={() => { setTab(t); setSelected(null); }}>
            {t === 'browse' ? '🔍 Browse' : t === 'create' ? '+ Create' : '👤 Mine'}
          </button>
        ))}
      </div>

      {status && <div style={S.status}>{status}</div>}

      {/* ── Bracket view ── */}
      {selected && (
        <div style={{ ...S.card, marginBottom:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700 }}>{selected.name}</div>
              <div style={{ color:'#888', fontSize:12 }}>{selected.game} · {selected.format} · {selected.participants}/{selected.size} players</div>
            </div>
            <button style={S.btn('#555')} onClick={() => setSelected(null)}>✕ Close</button>
          </div>
          <div style={S.bracket}>
            <div style={{ display:'flex', gap:0 }}>
              {bracket.map((round, ri) => (
                <div key={ri} style={S.roundCol}>
                  <div style={{ fontSize:11, color:'#888', marginBottom:8 }}>
                    {ri === bracket.length - 1 ? '🏆 Final' : `Round ${ri + 1}`}
                  </div>
                  {round.map((match, mi) => (
                    <div key={mi} style={S.matchBox}>
                      <div style={{ ...S.matchPlayer, color: match.winner === match.player1 ? '#00ffc8' : '#aaa' }}>
                        {match.winner === match.player1 ? '✓ ' : ''}{match.player1}
                      </div>
                      <div style={{ ...S.matchPlayer, color: match.winner === match.player2 ? '#00ffc8' : '#aaa', border:'none' }}>
                        {match.winner === match.player2 ? '✓ ' : ''}{match.player2}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Browse ── */}
      {tab === 'browse' && !selected && (
        loading ? <div style={{ color:'#888' }}>Loading…</div> : (
          <div style={S.grid}>
            {tourneys.map(t => (
              <div key={t.id} style={S.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div style={S.cardTitle}>{t.name}</div>
                  <span style={S.badge(STATUS_COLORS[t.status] || '#888')}>{t.status}</span>
                </div>
                <div style={S.cardMeta}>
                  🎮 {t.game} · {t.format}<br/>
                  👥 {t.participants}/{t.size} players<br/>
                  {t.starts_at && `📅 ${new Date(t.starts_at).toLocaleString()}`}
                  {t.prize && <><br/>🏆 Prize: {t.prize}</>}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={S.btn()} onClick={() => setSelected(t)}>View Bracket</button>
                  {t.status === 'open' && (
                    <button style={S.btn('#FF6600')} onClick={() => handleJoin(t.id)}>Join</button>
                  )}
                </div>
              </div>
            ))}
            {!tourneys.length && (
              <div style={{ color:'#555', gridColumn:'1/-1' }}>
                No tournaments yet. <button style={{ ...S.btn(), border:'none', background:'none', padding:0 }}
                  onClick={() => setTab('create')}>Create the first one →</button>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Create ── */}
      {tab === 'create' && (
        <div style={S.form}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Create Tournament</div>

          <label style={S.label}>Tournament Name *</label>
          <input style={S.input} placeholder="Weekly Fortnite Cup" value={form.name}
            onChange={e => update('name', e.target.value)} />

          <div style={S.row}>
            <div>
              <label style={S.label}>Game</label>
              <select style={S.input} value={form.game} onChange={e => update('game', e.target.value)}>
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Format</label>
              <select style={S.input} value={form.format} onChange={e => update('format', e.target.value)}>
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>Max Players</label>
              <select style={S.input} value={form.size} onChange={e => update('size', parseInt(e.target.value))}>
                {SIZES.map(s => <option key={s} value={s}>{s} players</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Entry Fee ($0 = free)</label>
              <input style={S.input} type="number" min="0" step="0.01" value={form.entry_fee}
                onChange={e => update('entry_fee', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <label style={S.label}>Start Date & Time</label>
          <input style={S.input} type="datetime-local" value={form.starts_at}
            onChange={e => update('starts_at', e.target.value)} />

          <label style={S.label}>Prize (optional)</label>
          <input style={S.input} placeholder="$50 gift card, bragging rights, etc." value={form.prize}
            onChange={e => update('prize', e.target.value)} />

          <label style={S.label}>Description</label>
          <textarea style={{ ...S.input, minHeight:80, resize:'vertical' }}
            placeholder="Rules, format details, contact info…"
            value={form.description} onChange={e => update('description', e.target.value)} />

          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button style={S.btn()} onClick={handleCreate}>Create Tournament</button>
            <button style={S.btn('#555')} onClick={() => setTab('browse')}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── My Tournaments ── */}
      {tab === 'my-tournaments' && (
        <div>
          {!token ? (
            <div style={{ color:'#555' }}>
              <Link to="/login" style={{ color:'#00ffc8' }}>Sign in</Link> to see your tournaments
            </div>
          ) : (
            <div style={S.grid}>
              {tourneys.filter(t => t.creator_name === 'You' || t.joined).map(t => (
                <div key={t.id} style={S.card}>
                  <div style={S.cardTitle}>{t.name}</div>
                  <div style={S.cardMeta}>{t.game} · {t.status}</div>
                  <button style={S.btn()} onClick={() => setSelected(t)}>View Bracket</button>
                </div>
              ))}
              {!tourneys.filter(t => t.creator_name === 'You' || t.joined).length && (
                <div style={{ color:'#555' }}>No tournaments yet.</div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
