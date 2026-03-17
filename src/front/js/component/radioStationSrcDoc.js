const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Radio Station Detail — StreamPireX</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif}

.station-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: #0d1117 !important;
  min-height: 100vh;
  color: #ffffff;
}
.station-detail-header { margin-bottom: 2rem; }
.back-button {
  background: linear-gradient(135deg, #1f2937, #374151);
  color: #00ffc8;
  border: 1px solid #00ffc8;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 255, 200, 0.2);
}
.back-button:hover { background: #00ffc8; color: #0d1117; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 255, 200, 0.4); }
.station-detail-content { background: #161b22; border-radius: 20px; padding: 2rem; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); border: 1px solid #30363d; }
.station-info { display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 3rem; flex-wrap: wrap; }
.station-image-container { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.station-detail-image { width: 300px; height: 300px; border-radius: 20px; object-fit: cover; border: 4px solid #00ffc8; box-shadow: 0 8px 25px rgba(0, 255, 200, 0.2); transition: transform 0.3s ease; }
.station-detail-image:hover { transform: scale(1.02); }
.station-logo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #00ffc8; box-shadow: 0 4px 15px rgba(0, 255, 200, 0.3); transition: transform 0.3s ease; background: #1f2937; }
.station-logo:hover { transform: scale(1.05); }
.station-logo-placeholder { width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #1f2937, #374151); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid #30363d; color: #9ca3af; }
.station-meta { flex: 1; min-width: 300px; }
.station-name { font-size: 2.5rem; font-weight: bold; color: #00ffc8; margin: 0 0 0.5rem 0; text-shadow: 0 2px 10px rgba(0, 255, 200, 0.3); }
.station-genre { font-size: 1.2rem; color: #FF6600; font-weight: 500; margin: 0 0 1rem 0; text-transform: uppercase; letter-spacing: 1px; }
.station-description { font-size: 1rem; color: #d1d5db; line-height: 1.6; margin: 0 0 1.5rem 0; }
.station-stats { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
.stat { background: #1f2937; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; border: 1px solid #30363d; display: inline-flex; align-items: center; gap: 5px; color: #d1d5db; }
.live-indicator { background: linear-gradient(135deg, #dc3545, #c82333) !important; color: white !important; border: none !important; animation: pulse 2s infinite; }
.loop-indicator { background: linear-gradient(135deg, #FF6600, #ff8533) !important; color: white !important; border: none !important; }
.offline-indicator { background: linear-gradient(135deg, #374151, #4b5563) !important; color: #9ca3af !important; border: none !important; }
.connection-status { padding: 8px 15px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 5px; }
.connection-status.connecting { background: #422006; color: #fbbf24; border: 1px solid #78350f; }
.connection-status.connected { background: #064e3b; color: #00ffc8; border: 1px solid #065f46; }
.connection-status.error { background: #450a0a; color: #fca5a5; border: 1px solid #7f1d1d; }
.audio-player { background: #1f2937; padding: 1.5rem; border-radius: 15px; margin: 1.5rem 0; border: 1px solid #30363d; }
.player-controls { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
.play-pause-btn { background: linear-gradient(135deg, #00ffc8, #00d4a8); color: #0d1117; border: none; padding: 15px 30px; border-radius: 30px; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 255, 200, 0.3); display: flex; align-items: center; gap: 8px; }
.play-pause-btn:hover:not(:disabled) { background: linear-gradient(135deg, #00e6b3, #00c49a); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 255, 200, 0.4); }
.play-pause-btn.playing { background: linear-gradient(135deg, #FF6600, #ff8533); }
.volume-control { display: flex; align-items: center; gap: 10px; color: #d1d5db; }
.volume-slider { -webkit-appearance: none; width: 100px; height: 6px; border-radius: 3px; background: #374151; outline: none; }
.volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #00ffc8; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 255, 200, 0.4); }
.now-playing { background: #1f2937 !important; padding: 1.5rem; border-radius: 15px; border-left: 5px solid #00ffc8; border: 1px solid #30363d; }
.now-playing h3 { color: #00ffc8 !important; margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: bold; }
.now-playing p, .now-playing span, .now-playing div { margin: 0.5rem 0; color: #ffffff !important; }
.track-title { font-size: 1.1rem; font-weight: bold; color: #ffffff !important; margin-bottom: 0.25rem; }
.track-artist { color: #d1d5db !important; }
.track-album { color: #9ca3af !important; font-size: 0.9rem; }
.owner-controls, .listener-controls { display: flex; gap: 15px; flex-wrap: wrap; align-items: center; }
.broadcast-btn, .listen-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 15px 30px !important; min-width: 200px; text-decoration: none; transition: all 0.3s ease; cursor: pointer; }
.broadcast-btn { background: linear-gradient(135deg, #dc3545, #c82333); color: white; border: none; border-radius: 30px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); }
.broadcast-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4); }
.listen-btn { background: linear-gradient(135deg, #00ffc8, #00d4a8); color: #0d1117; border: none; border-radius: 30px; box-shadow: 0 4px 15px rgba(0, 255, 200, 0.3); }
.listen-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 255, 200, 0.4); }
.broadcast-btn .icon, .listen-btn .icon { font-size: 1.5rem; }
.broadcast-btn .text, .listen-btn .text { font-size: 1.1rem; font-weight: bold; }
.broadcast-btn .subtext, .listen-btn .subtext { font-size: 0.8rem; opacity: 0.9; font-weight: normal; }
.schedule-btn { background: linear-gradient(135deg, #FF6600, #ff8533); color: white; box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3); padding: 10px 20px; text-decoration: none; border-radius: 25px; font-weight: bold; transition: all 0.3s ease; cursor: pointer; border: none; }
.edit-btn { background: linear-gradient(135deg, #374151, #4b5563); color: #d1d5db; box-shadow: 0 4px 15px rgba(55,65,81,0.3); border: 1px solid #4b5563; padding: 10px 20px; border-radius: 25px; font-weight: bold; transition: all 0.3s ease; cursor: pointer; }
.play-button { background: linear-gradient(135deg, #00ffc8, #00d4a8); color: #0d1117; border: none; padding: 12px 28px; border-radius: 30px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 255, 200, 0.3); min-width: 100px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.play-button.playing { background: linear-gradient(135deg, #FF6600, #ff8533); color: white; animation: pulse 2s infinite; }
.favorite-button { background: linear-gradient(135deg, #dc3545, #c82333); color: white; border: none; padding: 15px 25px; border-radius: 30px; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); }
.station-details { margin-top: 3rem; }
.detail-section { margin-bottom: 2rem; padding: 1.5rem; background: #1f2937; border-radius: 15px; border: 1px solid #30363d; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); }
.detail-section h3 { font-size: 1.3rem; font-weight: bold; color: #00ffc8; margin: 0 0 1rem 0; }
.detail-section p { color: #d1d5db; line-height: 1.6; margin: 0; }
.station-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
.info-item { background: #0d1117; padding: 1rem; border-radius: 10px; border: 1px solid #30363d; color: #d1d5db; }
.info-item strong { color: #00ffc8; display: block; margin-bottom: 0.25rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
.station-detail-loading { display: flex; justify-content: center; align-items: center; min-height: 50vh; background: #0d1117; color: #d1d5db; }
.spinner { width: 50px; height: 50px; border: 5px solid #30363d; border-top: 5px solid #00ffc8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
.station-detail-error { text-align: center; padding: 3rem; background: #161b22; border-radius: 20px; border: 1px solid #30363d; color: #d1d5db; }
.station-detail-error h2 { color: #fca5a5; margin-bottom: 1rem; }
.station-action-buttons { margin: 20px 0; }
.station-controls { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
.play-button-container { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.no-audio-message { color: #fca5a5; font-size: 14px; margin: 0; text-align: center; font-weight: 500; }
.audio-error { background: linear-gradient(135deg, #450a0a, #7f1d1d); color: #fca5a5; padding: 15px; border-radius: 10px; margin-bottom: 1rem; border: 1px solid #991b1b; }
.retry-btn { background: #FF6600; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: bold; }
.audio-loading { background: linear-gradient(135deg, #422006, #78350f); color: #fbbf24; padding: 15px; border-radius: 10px; margin-bottom: 1rem; text-align: center; border: 1px solid #92400e; }
.error-details { color: #9ca3af; margin-bottom: 2rem; }

/* NEW ADDITIONS */
.listener-ticker { display: flex; align-items: center; gap: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 12px 18px; margin-bottom: 1.5rem; }
.ticker-dot { width: 10px; height: 10px; border-radius: 50%; background: #00ffc8; box-shadow: 0 0 10px #00ffc8; animation: tickerPulse 1.2s ease-in-out infinite; flex-shrink: 0; }
@keyframes tickerPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.85)} }
.ticker-count { font-size: 28px; font-weight: 900; color: #00ffc8; font-family: 'Courier New', monospace; min-width: 60px; }
.ticker-label { font-size: 12px; color: #6b7280; letter-spacing: 0.5px; }
.ticker-peak { margin-left: auto; font-size: 12px; color: #6b7280; }
.ticker-peak span { color: #ffa726; font-weight: 700; }
.audio-meters-wrap { display: flex; align-items: flex-end; gap: 3px; height: 48px; padding: 6px 10px; background: #0d1117; border-radius: 8px; border: 1px solid #30363d; flex-shrink: 0; }
.meter-bar { width: 7px; border-radius: 2px; transition: height 0.06s ease; flex-shrink: 0; }
.detail-panels-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-top: 2rem; }
@media(max-width:900px){.detail-panels-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.detail-panels-grid{grid-template-columns:1fr}}
.panel { background: #161b22; border: 1px solid #30363d; border-radius: 15px; overflow: hidden; }
.panel-hd { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #30363d; background: #0d1117; }
.panel-title { font-size: 13px; font-weight: 800; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; }
.panel-body { padding: 14px 18px; }
.song-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #0d1117; }
.song-row:last-child { border-bottom: none; }
.song-num { font-size: 11px; color: #374151; font-family: 'Courier New', monospace; min-width: 20px; }
.song-art { width: 36px; height: 36px; border-radius: 6px; background: #1f2937; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.song-info { flex: 1; min-width: 0; }
.song-title { font-size: 13px; font-weight: 600; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-artist { font-size: 11px; color: #6b7280; }
.song-time { font-size: 11px; color: #374151; font-family: 'Courier New', monospace; flex-shrink: 0; }
.song-row.now .song-title { color: #00ffc8; }
.song-row.now { background: rgba(0,255,200,0.04); border-radius: 8px; padding: 10px 8px; margin: 0 -8px; }
.chat-body { height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 14px 18px; scrollbar-width: thin; scrollbar-color: #30363d transparent; }
.chat-msg { display: flex; gap: 10px; align-items: flex-start; }
.chat-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.chat-user { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
.chat-text { font-size: 12px; color: #9ca3af; line-height: 1.4; }
.chat-input-row { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid #30363d; }
.chat-input { flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 10px; color: #d1d5db; font-size: 13px; padding: 10px 14px; outline: none; transition: border-color 0.2s; }
.chat-input:focus { border-color: #00ffc8; }
.chat-send { padding: 10px 16px; border-radius: 10px; border: none; background: #00ffc8; color: #0d1117; font-size: 12px; font-weight: 800; cursor: pointer; }
.share-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.share-btn { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 12px; border: 1px solid #30363d; background: #0d1117; color: #9ca3af; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
.share-btn:hover { border-color: rgba(0,255,200,0.4); color: #00ffc8; background: rgba(0,255,200,0.05); }
.share-btn.primary { border-color: rgba(0,255,200,0.4); background: rgba(0,255,200,0.08); color: #00ffc8; }
.embed-box { background: #0d1117; border: 1px solid #30363d; border-radius: 10px; padding: 12px 14px; font-size: 11px; color: #6b7280; font-family: 'Courier New', monospace; word-break: break-all; line-height: 1.6; cursor: pointer; transition: border-color 0.2s; }
.embed-box:hover { border-color: #00ffc8; }
.embed-lbl { font-size: 11px; color: #6b7280; margin-bottom: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
.copy-hint { font-size: 11px; color: #374151; margin-top: 6px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

@keyframes pulse {
  0% { box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3); transform: scale(1); }
  50% { box-shadow: 0 6px 25px rgba(255, 102, 0, 0.6); transform: scale(1.02); }
  100% { box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3); transform: scale(1); }
}
@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

@media (max-width: 768px) {
  .station-detail-container { padding: 1rem; }
  .station-info { flex-direction: column; text-align: center; }
  .station-detail-image { width: 250px; height: 250px; }
  .station-name { font-size: 2rem; }
  .station-controls { justify-content: center; }
  .station-info-grid { grid-template-columns: 1fr; }
  .owner-controls, .listener-controls { flex-direction: column; width: 100%; }
  .broadcast-btn, .listen-btn, .schedule-btn, .edit-btn { width: 100%; }
  .player-controls { flex-direction: column; align-items: stretch; }
  .volume-control { justify-content: center; }
}
@media (max-width: 480px) {
  .station-detail-image { width: 200px; height: 200px; }
  .station-logo { width: 80px; height: 80px; }
  .station-name { font-size: 1.5rem; }
  .play-button, .favorite-button { padding: 12px 20px; font-size: 14px; }
  .detail-section { padding: 1rem; }
}

</style>
</head>
<body>
<div class="station-detail-container">
  <div class="station-detail-header">
    <button class="back-button">← Back to Stations</button>
  </div>

  <div class="station-detail-content">

    <!-- HERO -->
    <div class="station-info">
      <div class="station-image-container">
        <div style="width:300px;height:300px;border-radius:20px;border:4px solid #00ffc8;background:linear-gradient(135deg,#0d2020,#0a1220);display:flex;align-items:center;justify-content:center;font-size:90px;box-shadow:0 8px 25px rgba(0,255,200,.2)">🎙</div>
        <div class="station-logo-placeholder">
          <div style="font-size:2rem">📻</div>
          <div style="font-size:11px;margin-top:4px;color:#6b7280">Station Logo</div>
        </div>
      </div>

      <div class="station-meta">
        <h1 class="station-name">Lo-Fi Dreams</h1>
        <p class="station-genre">Lo-Fi / Chill</p>
        <p class="station-description">Relaxing lo-fi beats to help you focus, study, or unwind. Perfect background music for any time of day. Powered by StreamPireX — 90% revenue to creators.</p>

        <div class="station-stats">
          <span class="stat">👥 1,247 listeners</span>
          <span class="stat">⭐ 4.8/5.0</span>
          <span class="stat live-indicator">🔴 LIVE</span>
          <span class="stat loop-indicator">🔄 LOOP</span>
          <span class="stat">320kbps</span>
        </div>

        <!-- LISTENER TICKER + METERS -->
        <div class="listener-ticker">
          <div class="ticker-dot"></div>
          <div>
            <div class="ticker-count" id="listenerCount">1,247</div>
            <div class="ticker-label">LISTENING NOW</div>
          </div>
          <div class="audio-meters-wrap" id="meters"></div>
          <div class="ticker-peak">Peak today <span>4,891</span></div>
        </div>

        <span class="connection-status connected" style="margin-bottom:1rem;display:inline-flex">◉ Connected · 320kbps</span>

        <!-- OWNER CONTROLS -->
        <div class="station-action-buttons">
          <div class="owner-controls">
            <button class="broadcast-btn">
              <span class="icon">📡</span>
              <span class="text">Go Live</span>
              <span class="subtext">Start Broadcasting</span>
            </button>
            <button class="listen-btn">
              <span class="icon">🎧</span>
              <span class="text">Listen Live</span>
              <span class="subtext">Join the stream</span>
            </button>
            <button class="schedule-btn">📅 Schedule</button>
            <button class="edit-btn">✏️ Edit Station</button>
          </div>
        </div>

        <!-- PLAY + FAVORITE -->
        <div class="station-controls" style="margin-top:1rem">
          <div class="play-button-container">
            <button class="play-button playing" id="playBtn" onclick="togglePlay()">⏸️ <span class="text">Pause</span></button>
          </div>
          <button class="favorite-button">❤️ Add to Favorites</button>
        </div>
      </div>
    </div>

    <!-- AUDIO PLAYER -->
    <div class="audio-player">
      <div class="player-controls">
        <button class="play-pause-btn playing" onclick="togglePlay()">⏸️ Pause</button>
        <div class="volume-control">
          <span>🔊</span>
          <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="0.85">
          <span>85%</span>
        </div>
        <span class="connection-status connected">◉ Connected</span>
      </div>
      <div class="now-playing" style="margin-top:1rem">
        <h3>🎵 Now Playing</h3>
        <div class="track-info">
          <div class="track-title">Midnight Frequencies</div>
          <div class="track-artist">DJ Nova feat. Aria Banks</div>
          <div class="track-album">StreamPireX Radio Vol. 1</div>
        </div>
      </div>
    </div>

    <!-- 3-COL PANEL GRID -->
    <div class="detail-panels-grid">

      <!-- SONG HISTORY -->
      <div class="panel">
        <div class="panel-hd">
          <span class="panel-title">🎵 Song History</span>
          <span style="font-size:11px;color:#6b7280;cursor:pointer">Queue →</span>
        </div>
        <div class="panel-body" style="padding:10px 14px">
          <div class="song-row now">
            <span class="song-num">▶</span>
            <div class="song-art">🎵</div>
            <div class="song-info"><div class="song-title">Midnight Frequencies</div><div class="song-artist">DJ Nova feat. Aria Banks</div></div>
            <span class="song-time">Now</span>
          </div>
          <div class="song-row">
            <span class="song-num">2</span>
            <div class="song-art">🎷</div>
            <div class="song-info"><div class="song-title">City Rain</div><div class="song-artist">Mellow Keys</div></div>
            <span class="song-time">3:21</span>
          </div>
          <div class="song-row">
            <span class="song-num">3</span>
            <div class="song-art">🎹</div>
            <div class="song-info"><div class="song-title">Late Night Study</div><div class="song-artist">Café Beats</div></div>
            <span class="song-time">4:07</span>
          </div>
          <div class="song-row">
            <span class="song-num">4</span>
            <div class="song-art">🌙</div>
            <div class="song-info"><div class="song-title">Slow Burn</div><div class="song-artist">Indigo Rain</div></div>
            <span class="song-time">5:12</span>
          </div>
          <div class="song-row">
            <span class="song-num">5</span>
            <div class="song-art">☕</div>
            <div class="song-info"><div class="song-title">Morning Pages</div><div class="song-artist">Zara Moonlight</div></div>
            <span class="song-time">3:55</span>
          </div>
        </div>
      </div>

      <!-- LIVE CHAT -->
      <div class="panel">
        <div class="panel-hd">
          <span class="panel-title">💬 Live Chat</span>
          <span style="font-size:12px;color:#00ffc8;font-weight:700" id="chatCount">1,247 online</span>
        </div>
        <div class="chat-body" id="chatBody"></div>
        <div class="chat-input-row">
          <input class="chat-input" id="chatIn" placeholder="Say something…" onkeydown="if(event.key==='Enter')sendChat()">
          <button class="chat-send" onclick="sendChat()">Send</button>
        </div>
      </div>

      <!-- SHARE + INFO -->
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="panel">
          <div class="panel-hd"><span class="panel-title">🔗 Share & Embed</span></div>
          <div class="panel-body">
            <div class="share-grid">
              <button class="share-btn primary" onclick="copyLink()">📋 Copy Link</button>
              <button class="share-btn">𝕏 Twitter</button>
              <button class="share-btn">📘 Facebook</button>
              <button class="share-btn">📸 Instagram</button>
            </div>
            <div class="embed-lbl">EMBED CODE</div>
            <div class="embed-box" onclick="copyEmbed()">
              &lt;iframe src="https://streampirex.com/embed/radio/lofi-dreams" width="400" height="120" frameborder="0"&gt;&lt;/iframe&gt;
            </div>
            <div class="copy-hint" id="copyHint">Click to copy embed code</div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-hd"><span class="panel-title">📊 Station Info</span></div>
          <div class="panel-body">
            <div class="info-grid">
              <div class="info-item"><strong>Genre</strong><span>Lo-Fi / Chill</span></div>
              <div class="info-item"><strong>Bitrate</strong><span>320 kbps</span></div>
              <div class="info-item"><strong>Format</strong><span>MP3 / AAC</span></div>
              <div class="info-item"><strong>Created by</strong><span>DJ Nova</span></div>
              <div class="info-item"><strong>Since</strong><span>Jan 12, 2025</span></div>
              <div class="info-item"><strong>Rating</strong><span>⭐ 4.8 / 5.0</span></div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- STATION DETAILS -->
    <div class="station-details">
      <div class="detail-section">
        <h3>Station Info</h3>
        <div class="station-info-grid">
          <div class="info-item"><strong>Genre</strong>Lo-Fi / Chill</div>
          <div class="info-item"><strong>Type</strong>Live Station</div>
          <div class="info-item"><strong>Listeners</strong>1,247</div>
          <div class="info-item"><strong>Rating</strong>4.8 / 5.0 ⭐</div>
          <div class="info-item"><strong>Created by</strong>DJ Nova</div>
          <div class="info-item"><strong>Loop Duration</strong>60 minutes</div>
        </div>
      </div>
      <div class="detail-section">
        <h3>About This Station</h3>
        <p>Relaxing lo-fi beats to help you focus, study, or unwind. Perfect background music for any time of day. StreamPireX brings you the best creator stations with 90% revenue share for artists.</p>
      </div>
    </div>

  </div>
</div>

<script>
// METERS
const mWrap = document.getElementById('meters');
const mBars = Array.from({length:20}, () => {
  const b = document.createElement('div');
  b.className = 'meter-bar';
  b.style.cssText = 'height:4px;width:7px;border-radius:2px;';
  mWrap.appendChild(b); return b;
});
let playing = true;
function animMeters() {
  mBars.forEach((b, i) => {
    if (playing) {
      const t = Date.now()/120 + i*0.45;
      const h = Math.max(3, Math.abs(Math.sin(t)*18 + Math.cos(t*1.7)*9 + Math.random()*5));
      const pct = h/32;
      b.style.height = Math.round(h)+'px';
      b.style.background = pct>.8?'#ff3366':pct>.6?'#ffcc00':'#00ffc8';
      b.style.opacity = 0.7 + Math.random()*0.3;
    } else {
      b.style.height='3px'; b.style.background='#374151'; b.style.opacity='0.4';
    }
  });
  requestAnimationFrame(animMeters);
}
animMeters();

function togglePlay() {
  playing = !playing;
  document.querySelectorAll('.play-pause-btn, .play-button').forEach(b => {
    b.className = b.className.replace(' playing','') + (playing?' playing':'');
    if (b.classList.contains('play-pause-btn')) b.textContent = playing?'⏸️ Pause':'▶️ Play';
  });
}

// LISTENER TICKER
let cnt = 1247;
setInterval(() => {
  cnt += Math.round(Math.random()*8-3);
  if (cnt<1200) cnt=1200;
  document.getElementById('listenerCount').textContent = cnt.toLocaleString();
  document.getElementById('chatCount').textContent = cnt.toLocaleString()+' online';
}, 3000);

// CHAT
const MSGS = [
  {u:'MikeBeatZ',c:'#00ffc8',m:'this drop is 🔥🔥'},
  {u:'LoFiLover',c:'#a78bfa',m:'perfect study vibes fr'},
  {u:'AriaFan99',c:'#ff6b35',m:"Aria's voice is everything 😭"},
  {u:'TrapKing',c:'#ffd700',m:'need that tracklist asap'},
  {u:'ChillVibes',c:'#00aaff',m:'been listening for 2hrs 🎧'},
  {u:'NightOwl',c:'#ff4466',m:'streaming from Berlin 🇩🇪'},
  {u:'SoulSearcher',c:'#00ff88',m:'this is the one 🙏'},
  {u:'BeatDropFan',c:'#ffa726',m:'who produced this?'},
];
let ci=0;
const chatBody = document.getElementById('chatBody');
function addMsg(u,c,m) {
  const d=document.createElement('div'); d.className='chat-msg';
  d.innerHTML=\`<div class="chat-avatar" style="background:\${c}22;color:\${c}">\${u[0]}</div><div><div class="chat-user" style="color:\${c}">\${u}</div><div class="chat-text">\${m}</div></div>\`;
  chatBody.appendChild(d); chatBody.scrollTop=chatBody.scrollHeight;
  if(chatBody.children.length>30) chatBody.children[0].remove();
}
MSGS.forEach(m=>addMsg(m.u,m.c,m.m));
setInterval(()=>{const m=MSGS[ci++%MSGS.length];addMsg(m.u,m.c,m.m);},3500);
function sendChat(){const v=document.getElementById('chatIn').value.trim();if(!v)return;addMsg('You','#e0eaf0',v);document.getElementById('chatIn').value='';}

function copyLink(){navigator.clipboard?.writeText('https://streampirex.com/radio/lofi-dreams').catch(()=>{});event.target.textContent='✓ Copied!';setTimeout(()=>event.target.textContent='📋 Copy Link',2000);}
function copyEmbed(){navigator.clipboard?.writeText('<iframe src="https://streampirex.com/embed/radio/lofi-dreams" width="400" height="120" frameborder="0"></iframe>').catch(()=>{});document.getElementById('copyHint').textContent='✓ Copied!';document.getElementById('copyHint').style.color='#00ffc8';setTimeout(()=>{document.getElementById('copyHint').textContent='Click to copy embed code';document.getElementById('copyHint').style.color='';},2000);}
</script>
</body></html>`;
export default html;
