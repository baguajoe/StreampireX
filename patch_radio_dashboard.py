#!/usr/bin/env python3
path = '/workspaces/SpectraSphere/src/front/js/pages/RadioStationDashboard.js'
with open(path) as f:
    content = f.read()

# 1. Add song log state after loading state
old_loading = '  const [loading, setLoading] = useState(true);'
new_loading = '''  const [loading, setLoading] = useState(true);
  const [songLog, setSongLog] = useState([]);
  const [songLogStation, setSongLogStation] = useState(null);
  const [showSongLog, setShowSongLog] = useState(false);
  const [songLogStationId, setSongLogStationId] = useState(null);
  const [songLogLoading, setSongLogLoading] = useState(false);'''

if old_loading in content:
    content = content.replace(old_loading, new_loading)
    print('✓ State added')
else:
    print('✗ State - not found')

# 2. Add fetchSongLog function before return
old_return = '  return (\n    <div className="radio-dashboard-container">'
new_return = '''  const fetchSongLog = async (stationId, stationName) => {
    setSongLogLoading(true);
    setSongLogStation(stationName);
    setSongLogStationId(stationId);
    setShowSongLog(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/${stationId}/song-log?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setSongLog(d.songs || []);
      }
    } catch(e) { setSongLog([]); }
    finally { setSongLogLoading(false); }
  };

  return (
    <div className="radio-dashboard-container">'''

if old_return in content:
    content = content.replace(old_return, new_return)
    print('✓ fetchSongLog added')
else:
    print('✗ return - not found')

# 3. Add Broadcast Studio featured card before stations section
old_stations = '      {/* Radio Stations List */}\n      {stations.length > 0 ? ('
new_stations = '''      {/* SPX Broadcast Studio Featured Card */}
      {stations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,255,200,0.08) 0%, rgba(255,102,0,0.05) 100%)',
          border: '1px solid rgba(0,255,200,0.18)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <div style={{ fontSize:'40px', lineHeight:1 }}>📺</div>
            <div>
              <div style={{ fontSize:'16px', fontWeight:900, color:'#fff', marginBottom:'4px', letterSpacing:'0.5px' }}>
                SPX Broadcast Studio
              </div>
              <div style={{ fontSize:'13px', color:'#8888aa', lineHeight:'1.6', maxWidth:'480px' }}>
                Go live with multi-host video · Station audio keeps broadcasting · Song log for BMI/ASCAP/SESAC
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <a href={`/radio-live-studio/${stations[0]?.id}`}
              style={{
                padding:'10px 22px', borderRadius:'6px', background:'#00ffc8',
                color:'#000', fontWeight:800, fontSize:'13px', textDecoration:'none',
                letterSpacing:'0.5px', whiteSpace:'nowrap', display:'inline-block'
              }}>
              🔴 Go Live
            </a>
            <a href="/my-radio-stations"
              style={{
                padding:'10px 18px', borderRadius:'6px',
                background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                color:'#dde0f0', fontWeight:600, fontSize:'13px', textDecoration:'none',
                whiteSpace:'nowrap', display:'inline-block'
              }}>
              My Stations
            </a>
          </div>
        </div>
      )}

      {/* Radio Stations List */}
      {stations.length > 0 ? ('''

if old_stations in content:
    content = content.replace(old_stations, new_stations)
    print('✓ Broadcast Studio card added')
else:
    print('✗ Broadcast card - not found')

# 4. Add Song Log button to each station card (before PRO Report)
old_pro = "                    <a href={`/api/radio/${station.id}/pro-export?pro=bmi&days=30`}"
new_pro = """                    <button
                      onClick={() => fetchSongLog(station.id, station.name)}
                      style={{marginLeft:6,padding:'6px 12px',background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.3)',color:'#a78bfa',borderRadius:4,fontSize:12,fontWeight:700,cursor:'pointer'}}
                    >📋 Song Log</button>
                    <a href={`/api/radio/${station.id}/pro-export?pro=bmi&days=30`}"""

if old_pro in content:
    content = content.replace(old_pro, new_pro)
    print('✓ Song Log button added')
else:
    print('✗ Song Log button - not found')

# 5. Add Song Log modal before final closing div
old_end = '    </div>\n  );\n};\n\nexport default RadioStationDashboard;'
song_log_modal = '''
      {/* Song Log Modal */}
      {showSongLog && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:'20px'
        }} onClick={() => setShowSongLog(false)}>
          <div style={{
            background:'#0a0a18', border:'1px solid rgba(0,255,200,0.15)',
            borderRadius:'12px', width:'100%', maxWidth:'720px',
            maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)',
              display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0
            }}>
              <div>
                <div style={{fontSize:'14px',fontWeight:800,color:'#dde0f0'}}>📋 Song Log — {songLogStation}</div>
                <div style={{fontSize:'11px',color:'#5a7088',marginTop:'2px'}}>Last 30 days · Use for BMI / ASCAP / SESAC PRO reporting</div>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <a href={`${process.env.REACT_APP_BACKEND_URL}/api/radio/${songLogStationId}/pro-export?pro=bmi&days=30`}
                  download
                  style={{padding:'6px 14px',borderRadius:'4px',background:'rgba(255,102,0,0.1)',border:'1px solid rgba(255,102,0,0.3)',color:'#FF6600',fontSize:11,fontWeight:700,textDecoration:'none'}}>
                  ⬇ Export CSV
                </a>
                <button onClick={() => setShowSongLog(false)}
                  style={{background:'transparent',border:'none',color:'#5a7088',fontSize:'20px',cursor:'pointer',lineHeight:1}}>✕</button>
              </div>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {songLogLoading ? (
                <div style={{padding:'40px',textAlign:'center',color:'#5a7088',fontSize:'14px'}}>Loading song log...</div>
              ) : songLog.length === 0 ? (
                <div style={{padding:'40px',textAlign:'center',color:'#5a7088'}}>
                  <div style={{fontSize:'36px',marginBottom:'12px'}}>🎵</div>
                  <div style={{fontSize:'14px',lineHeight:'1.6'}}>No songs logged yet.<br/>Songs are automatically logged when your station plays them.</div>
                </div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(255,255,255,0.03)',position:'sticky',top:0}}>
                      {['#','Title','Artist','Album','Duration','Played At'].map(h => (
                        <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:'10px',fontWeight:700,color:'#5a7088',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {songLog.map((s, i) => (
                      <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#3a5070'}}>{i+1}</td>
                        <td style={{padding:'10px 16px',fontSize:'13px',color:'#dde0f0',fontWeight:600}}>{s.title || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#8888aa'}}>{s.artist || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#5a7088'}}>{s.album || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#5a7088'}}>{s.duration || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'11px',color:'#3a5070'}}>{s.played_at ? new Date(s.played_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

'''

new_end = song_log_modal + '    </div>\n  );\n};\n\nexport default RadioStationDashboard;'

if old_end in content:
    content = content.replace(old_end, new_end)
    print('✓ Song log modal added')
else:
    print('✗ Modal - not found')

with open(path, 'w') as f:
    f.write(content)

print('\n✅ Done')
