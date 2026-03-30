// =============================================================================
// FilmEarningsDashboard.js — Film Creator Earnings Dashboard
// =============================================================================
// Route: /film-earnings
// Shows: ticket sales, screening revenue, views per film, festival results
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
});

const S = {
  page:   { minHeight:'100vh', background:'#06060f', color:'#e0e0e0', fontFamily:'Inter, sans-serif', padding:24 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  title:  { fontSize:22, fontWeight:800, color:'#00ffc8' },
  grid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:16, marginBottom:24 },
  stat:   { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:10, padding:20, textAlign:'center' },
  statV:  { fontSize:26, fontWeight:800, color:'#00ffc8' },
  statL:  { fontSize:11, color:'#888', marginTop:4 },
  card:   { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:10, padding:20, marginBottom:16 },
  sTitle: { fontSize:15, fontWeight:700, marginBottom:14 },
  row:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0',
            borderBottom:'1px solid #0d0d1a', fontSize:13 },
  badge:  (c) => ({ padding:'2px 8px', borderRadius:10, background:`${c}18`, color:c, fontSize:10 }),
  btn:    (c='#00ffc8') => ({
    padding:'6px 16px', border:`1px solid ${c}`, borderRadius:6,
    background:`${c}12`, color:c, cursor:'pointer', fontSize:11,
    fontFamily:'Inter, sans-serif', textDecoration:'none', display:'inline-block',
  }),
  tabs:   { display:'flex', gap:4, marginBottom:16 },
  tab:    (a) => ({
    padding:'6px 16px', borderRadius:6, border:'1px solid',
    borderColor: a ? '#00ffc8' : '#333',
    background: a ? 'rgba(0,255,200,0.1)' : 'transparent',
    color: a ? '#00ffc8' : '#888', cursor:'pointer', fontSize:12,
    fontFamily:'Inter, sans-serif',
  }),
};

export default function FilmEarningsDashboard() {
  const navigate = useNavigate();
  const [films,     setFilms]     = useState([]);
  const [screenings,setScreenings]= useState([]);
  const [earnings,  setEarnings]  = useState({ total:0, tickets:0, tips:0, festival:0 });
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [filmsRes, screeningsRes] = await Promise.all([
        fetch(`${BACKEND}/api/film/films/my`, { headers: getHeaders() }),
        fetch(`${BACKEND}/api/film/screenings/my`, { headers: getHeaders() }),
      ]);

      if (filmsRes.ok) {
        const d = await filmsRes.json();
        setFilms(d.films || d || []);
      }
      if (screeningsRes.ok) {
        const d = await screeningsRes.json();
        const screeningList = d.screenings || d || [];
        setScreenings(screeningList);

        // calc earnings from screenings
        const ticketTotal = screeningList.reduce((sum, s) =>
          sum + ((s.ticket_price || 0) * (s.attendee_count || 0)), 0
        );
        setEarnings(prev => ({ ...prev, tickets: ticketTotal, total: ticketTotal }));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const totalViews   = films.reduce((s, f) => s + (f.view_count || 0), 0);
  const totalFilms   = films.length;
  const publishedFilms = films.filter(f => f.status === 'published' || f.published).length;

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#00ffc8' }}>Loading earnings…</div>
    </div>
  );

  return (
    <div style={S.page}>

      <div style={S.header}>
        <div>
          <div style={S.title}>🎬 Film Earnings</div>
          <div style={{ color:'#888', fontSize:12, marginTop:2 }}>{totalFilms} films · {publishedFilms} published</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link to="/film-upload" style={S.btn()}>+ Upload Film</Link>
          <Link to="/screening-scheduler" style={S.btn('#FF6600')}>📅 Schedule Screening</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={S.grid}>
        <div style={S.stat}>
          <div style={S.statV}>${earnings.total.toFixed(2)}</div>
          <div style={S.statL}>Total Earnings</div>
        </div>
        <div style={S.stat}>
          <div style={S.statV}>${earnings.tickets.toFixed(2)}</div>
          <div style={S.statL}>Ticket Sales</div>
        </div>
        <div style={S.stat}>
          <div style={S.statV}>{totalViews.toLocaleString()}</div>
          <div style={S.statL}>Total Views</div>
        </div>
        <div style={S.stat}>
          <div style={S.statV}>{screenings.length}</div>
          <div style={S.statL}>Screenings Hosted</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {['overview','films','screenings','festival'].map(t => (
          <button key={t} style={S.tab(tab===t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <>
          <div style={S.card}>
            <div style={S.sTitle}>🎥 Your Films</div>
            {films.length === 0 && (
              <div style={{ color:'#555', fontSize:13 }}>
                No films yet. <Link to="/film-upload" style={{ color:'#00ffc8' }}>Upload your first film →</Link>
              </div>
            )}
            {films.slice(0,5).map((film, i) => (
              <div key={i} style={S.row}>
                <div>
                  <div style={{ fontWeight:600 }}>{film.title}</div>
                  <div style={{ color:'#888', fontSize:11 }}>{film.genre} · {film.view_count || 0} views</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={S.badge(film.published ? '#00ffc8' : '#888')}>
                    {film.published ? 'Published' : 'Draft'}
                  </span>
                  <Link to={`/film/${film.id}`} style={S.btn('#555')}>View</Link>
                </div>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.sTitle}>📅 Upcoming Screenings</div>
            {screenings.filter(s => new Date(s.scheduled_at) > new Date()).slice(0,3).map((s, i) => (
              <div key={i} style={S.row}>
                <div>
                  <div style={{ fontWeight:600 }}>{s.title}</div>
                  <div style={{ color:'#888', fontSize:11 }}>
                    {new Date(s.scheduled_at).toLocaleString()} · {s.attendee_count || 0} registered
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'#00ffc8', fontWeight:700 }}>
                    ${((s.ticket_price || 0) * (s.attendee_count || 0)).toFixed(2)}
                  </div>
                  <span style={S.badge('#635bff')}>
                    ${s.ticket_price || 0} / ticket
                  </span>
                </div>
              </div>
            ))}
            {!screenings.filter(s => new Date(s.scheduled_at) > new Date()).length && (
              <div style={{ color:'#555', fontSize:13 }}>
                No upcoming screenings. <Link to="/screening-scheduler" style={{ color:'#00ffc8' }}>Schedule one →</Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Films tab ── */}
      {tab === 'films' && (
        <div style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={S.sTitle}>🎥 All Films</div>
            <Link to="/film-upload" style={S.btn()}>+ Upload</Link>
          </div>
          {films.map((film, i) => (
            <div key={i} style={S.row}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600 }}>{film.title}</div>
                <div style={{ color:'#888', fontSize:11 }}>
                  {film.genre} · {film.duration_minutes || 0}min · {film.view_count || 0} views
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={S.badge(film.published ? '#00ffc8' : '#888')}>
                  {film.published ? 'Live' : 'Draft'}
                </span>
                <Link to={`/film/${film.id}`} style={S.btn('#555')}>Manage</Link>
                <button style={S.btn('#FF6600')}
                  onClick={() => navigate(`/screening-scheduler?film=${film.id}`)}>
                  📅 Screen
                </button>
              </div>
            </div>
          ))}
          {!films.length && (
            <div style={{ color:'#555', fontSize:13 }}>No films yet.</div>
          )}
        </div>
      )}

      {/* ── Screenings tab ── */}
      {tab === 'screenings' && (
        <div style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={S.sTitle}>📅 All Screenings</div>
            <Link to="/screening-scheduler" style={S.btn()}>+ Schedule</Link>
          </div>
          {screenings.map((s, i) => (
            <div key={i} style={S.row}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600 }}>{s.title}</div>
                <div style={{ color:'#888', fontSize:11 }}>
                  {new Date(s.scheduled_at).toLocaleString()} · {s.attendee_count || 0} attendees
                  {s.has_qa && ' · Q&A included'}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ color:'#00ffc8', fontWeight:700 }}>
                  ${((s.ticket_price||0)*(s.attendee_count||0)).toFixed(2)}
                </div>
                <div style={{ color:'#888', fontSize:10 }}>${s.ticket_price||0}/ticket</div>
              </div>
            </div>
          ))}
          {!screenings.length && (
            <div style={{ color:'#555', fontSize:13 }}>No screenings yet.</div>
          )}
        </div>
      )}

      {/* ── Festival tab ── */}
      {tab === 'festival' && (
        <div style={S.card}>
          <div style={S.sTitle}>🏆 Film Festival</div>
          <p style={{ color:'#888', fontSize:13, lineHeight:1.6, marginBottom:16 }}>
            Submit your films to the StreamPireX monthly film festival. Winners get featured on the platform and eligible for cash prizes.
          </p>
          <Link to="/film-festival" style={S.btn()}>View Festival →</Link>
        </div>
      )}

    </div>
  );
}
