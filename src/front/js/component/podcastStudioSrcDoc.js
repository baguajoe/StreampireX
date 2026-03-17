// podcastStudioSrcDoc.js

const podcastStudioSrcDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      height: 100%;
      background: #050709;
      font-family: 'Inter', system-ui, sans-serif;
      color: #e0eaf0;
      overflow: hidden;
    }

    body {
      display: flex;
    }

    .root {
      width: 100%;
      height: 100%;
      background: #050709;
      border-radius: 14px;
      border: 1px solid #1e2330;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 18px;
      background: #07090f;
      border-bottom: 1px solid rgba(0, 255, 200, 0.08);
      flex-wrap: wrap;
      gap: 8px;
      flex-shrink: 0;
    }

    .logo {
      font-size: 13px;
      font-weight: 800;
      color: #00ffc8;
      letter-spacing: 2px;
    }

    .hr {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .rp {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      border: 2px solid #ff2d55;
      background: rgba(255, 45, 85, 0.12);
      color: #ff2d55;
      font-size: 11px;
      font-weight: 800;
    }

    .rd {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ff2d55;
      animation: bl 1s ease-in-out infinite;
    }

    @keyframes bl {
      0%, 100% { opacity: 1; }
      50% { opacity: .15; }
    }

    .tm {
      font-family: 'Courier New', monospace;
      font-size: 15px;
      color: #ff2d55;
      letter-spacing: 2px;
      min-width: 48px;
    }

    .inv {
      padding: 5px 12px;
      border-radius: 8px;
      border: 1px solid rgba(0, 180, 255, 0.3);
      background: rgba(0, 180, 255, 0.08);
      color: #00b4ff;
      font-size: 10px;
      font-weight: 700;
    }

    .main {
      display: grid;
      grid-template-columns: 1fr 200px;
      min-height: 0;
      flex: 1;
    }

    .va {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
      min-height: 0;
    }

    .tiles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      height: 260px;
      flex-shrink: 0;
    }

    .tile {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: #0d1117;
    }

    .tile.h {
      border-color: rgba(0, 255, 200, 0.2);
    }

    .tile.g {
      border-color: rgba(255, 102, 0, 0.2);
    }

    .tile::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.06) 2px,
        rgba(0, 0, 0, 0.06) 4px
      );
      pointer-events: none;
      z-index: 2;
    }

    @keyframes gT {
      0%, 100% {
        box-shadow: 0 0 0 2px rgba(0, 255, 200, 0.1);
      }
      50% {
        box-shadow: 0 0 0 3px rgba(0, 255, 200, 0.85), 0 0 22px rgba(0, 255, 200, 0.3);
      }
    }

    @keyframes gO {
      0%, 100% {
        box-shadow: 0 0 0 2px rgba(255, 102, 0, 0.1);
      }
      50% {
        box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.85), 0 0 22px rgba(255, 102, 0, 0.3);
      }
    }

    .tile.sh {
      animation: gT .5s ease-in-out infinite;
    }

    .tile.sg {
      animation: gO .5s ease-in-out infinite;
    }

    .timg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 8%;
      display: block;
      z-index: 0;
    }

    .tov {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        transparent 42%,
        rgba(0, 0, 0, 0.20) 62%,
        rgba(0, 0, 0, 0.82) 100%
      );
      z-index: 1;
    }

    .tile-ui {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 4;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 8px 8px;
      pointer-events: none;
    }

    .tl {
      position: static;
      padding: 0;
    }

    .tn {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
      background: rgba(0, 0, 0, 0.38);
      border: 1px solid rgba(255,255,255,0.08);
      padding: 4px 9px;
      border-radius: 999px;
      backdrop-filter: blur(2px);
    }

    .wf {
      position: static;
      height: 20px;
      padding: 0 8px;
      display: flex;
      align-items: flex-end;
      gap: 2px;
      background: rgba(0, 0, 0, 0.58);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 6px;
      overflow: hidden;
    }

    .wb {
      border-radius: 1px;
      width: 3px;
      transition: height .07s ease;
    }

    .chat {
      padding: 0 14px 8px;
      min-height: 0;
      overflow: hidden;
    }

    .cb {
      background: #0f1320;
      border-radius: 8px;
      padding: 8px 11px;
      margin-bottom: 5px;
      border-left: 2px solid #00ffc8;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity .25s ease, transform .25s ease;
    }

    .cb.show {
      opacity: 1;
      transform: translateY(0);
    }

    .cb.gb {
      border-left-color: #ff6600;
    }

    .cn {
      font-weight: 700;
      font-size: 10px;
      margin-bottom: 2px;
    }

    .cn.h {
      color: #00ffc8;
    }

    .cn.g {
      color: #ff6600;
    }

    .ct {
      color: #6a8090;
      line-height: 1.5;
      font-size: 10px;
    }

    .sbar {
      padding: 4px 14px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .sd {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #00ffc8;
      box-shadow: 0 0 6px #00ffc8;
      animation: bl 2s ease-in-out infinite;
    }

    .stxt {
      font-size: 10px;
      color: #4a6070;
    }

    .rp2 {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: auto;
      background: #0a0c12;
      border-left: 1px solid rgba(255, 255, 255, 0.04);
    }

    .rpl {
      font-size: 9px;
      font-weight: 700;
      color: #3a5060;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .vb {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 12px;
      border-radius: 9px;
      border: 1px solid rgba(0, 255, 200, 0.25);
      background: rgba(0, 255, 200, 0.07);
      color: #00ffc8;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      margin-bottom: 5px;
      transition: all .15s;
      text-align: left;
    }

    .vb:hover {
      background: rgba(0, 255, 200, 0.16);
      border-color: #00ffc8;
    }

    .vb.active {
      background: rgba(0, 255, 200, 0.16);
      border-color: #00ffc8;
    }

    .vb.sc {
      border-color: rgba(0, 180, 255, 0.25);
      background: rgba(0, 180, 255, 0.07);
      color: #00b4ff;
    }

    .vb.mr {
      border-color: rgba(167, 139, 250, 0.25);
      background: rgba(167, 139, 250, 0.07);
      color: #a78bfa;
    }

    .res {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .rb {
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #1e2330;
      background: transparent;
      color: #3a5060;
      font-size: 9px;
      font-weight: 700;
      cursor: pointer;
      transition: all .12s;
    }

    .rb.active {
      background: rgba(0, 255, 200, 0.1);
      border-color: rgba(0, 255, 200, 0.3);
      color: #00ffc8;
    }

    .lg {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }

    .lb2 {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 4px;
      border-radius: 8px;
      border: 1px solid #1e2330;
      background: rgba(255, 255, 255, 0.02);
      cursor: pointer;
      transition: all .12s;
    }

    .lb2:hover {
      border-color: rgba(0, 255, 200, 0.2);
    }

    .lb2.active {
      background: rgba(0, 255, 200, 0.1);
      border-color: #00ffc8;
    }

    .li {
      font-size: 13px;
    }

    .ln {
      font-size: 8px;
      font-weight: 700;
      color: #3a5060;
      text-align: center;
    }

    .lb2.active .ln {
      color: #00ffc8;
    }

    @media (max-width: 760px) {
      .main {
        grid-template-columns: 1fr;
      }

      .rp2 {
        display: none;
      }

      .tiles {
        grid-template-columns: 1fr;
        height: auto;
      }

      .tile {
        min-height: 220px;
      }
    }
  </style>
</head>

<body>
  <div class="root">
    <div class="hdr">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="logo">🎙 PODCAST STUDIO</span>
        <span style="font-size:11px;color:#4a6070;padding:4px 10px;border:1px solid #1e2330;border-radius:6px">Ep. 42 — The Creator Economy</span>
      </div>
      <div class="hr">
        <div class="rp"><span class="rd"></span>REC</div>
        <div class="tm" id="tm">0:00</div>
        <div class="inv">👥 Invite (1/3)</div>
      </div>
    </div>

    <div class="main">
      <div class="va">
        <div class="tiles">
          <div class="tile h" id="ht">
            <img class="timg" src="data:image/jpeg;base64,PASTE_YOUR_HOST_BASE64_HERE" alt="Host" />
            <div class="tov"></div>
            <div class="tile-ui">
              <div class="tl"><span class="tn">👑 Sophia (Host)</span></div>
              <div class="wf" id="hw"></div>
            </div>
          </div>

          <div class="tile g" id="gt">
            <img class="timg" src="data:image/jpeg;base64,PASTE_YOUR_GUEST_BASE64_HERE" alt="Guest" />
            <div class="tov"></div>
            <div class="tile-ui">
              <div class="tl"><span class="tn">🎙 Marcus (Guest)</span></div>
              <div class="wf" id="gw"></div>
            </div>
          </div>
        </div>

        <div class="chat" id="chat"></div>

        <div class="sbar">
          <div class="sd"></div>
          <span class="stxt" id="stxt">🎙 Recording — 2 participants connected</span>
        </div>
      </div>

      <div class="rp2">
        <div>
          <div class="rpl">Camera</div>
          <button class="vb active" onclick="this.classList.toggle('active');this.innerHTML=this.classList.contains('active')?'📹 Stop Camera':'📹 Start Camera'">📹 Stop Camera</button>
          <button class="vb sc" onclick="this.classList.toggle('active')">🖥 Share Screen</button>
          <button class="vb mr" onclick="this.classList.toggle('active');this.innerHTML=this.classList.contains('active')?'🪞 Mirror ON':'🪞 Mirror OFF'">🪞 Mirror ON</button>
        </div>

        <div>
          <div class="rpl">Resolution</div>
          <div class="res">
            <button class="rb" onclick="document.querySelectorAll('.rb').forEach(b=>b.classList.remove('active'));this.classList.add('active')">480p</button>
            <button class="rb active" onclick="document.querySelectorAll('.rb').forEach(b=>b.classList.remove('active'));this.classList.add('active')">720p</button>
            <button class="rb" onclick="document.querySelectorAll('.rb').forEach(b=>b.classList.remove('active'));this.classList.add('active')">1080p</button>
            <button class="rb" onclick="document.querySelectorAll('.rb').forEach(b=>b.classList.remove('active'));this.classList.add('active')">4K</button>
          </div>
        </div>

        <div>
          <div class="rpl">Layout</div>
          <div class="lg">
            <div class="lb2 active" onclick="document.querySelectorAll('.lb2').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><span class="li">🎙</span><span class="ln">Audio Only</span></div>
            <div class="lb2" onclick="document.querySelectorAll('.lb2').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><span class="li">📹</span><span class="ln">Camera</span></div>
            <div class="lb2" onclick="document.querySelectorAll('.lb2').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><span class="li">🖥</span><span class="ln">Screen</span></div>
            <div class="lb2" onclick="document.querySelectorAll('.lb2').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><span class="li">🎬</span><span class="ln">PiP</span></div>
            <div class="lb2" onclick="document.querySelectorAll('.lb2').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><span class="li">📐</span><span class="ln">Side/Side</span></div>
            <div class="lb2" onclick="document.querySelectorAll('.lb2').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><span class="li">⊞</span><span class="ln">All Cams</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const HC = ['#00ffc8', '#00e8b5'];
    const GC = ['#ff6600', '#ff7a1a'];
    let hS = true, gS = false, t = 0;

    function bw(id, colors, n) {
      const c = document.getElementById(id);
      if (!c) return [];
      c.innerHTML = '';
      return Array.from({ length: n }, () => {
        const b = document.createElement('div');
        b.className = 'wb';
        b.style.cssText = 'height:2px;background:' + colors[0];
        c.appendChild(b);
        return b;
      });
    }

    const hB = bw('hw', HC, 40);
    const gB = bw('gw', GC, 40);

    setInterval(() => {
      t++;
      const m = Math.floor(t / 60), s = t % 60;
      document.getElementById('tm').textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);

    setInterval(() => {
      [hB, gB].forEach((bars, i) => {
        const sp = i === 0 ? hS : gS;
        const col = i === 0 ? HC : GC;
        bars.forEach((b, j) => {
          if (sp) {
            const v = Date.now() / 160 + j * 0.4;
            b.style.height = Math.max(2, Math.abs(Math.sin(v) * 16 + Math.cos(v * 1.6) * 7 + Math.random() * 5)) + 'px';
            b.style.opacity = '0.9';
          } else {
            b.style.height = '2px';
            b.style.opacity = '0.18';
          }
          b.style.background = col[j % col.length];
        });
      });

      document.getElementById('ht').className = 'tile h' + (hS ? ' sh' : '');
      document.getElementById('gt').className = 'tile g' + (gS ? ' sg' : '');
    }, 80);

    const LINES = [
      { s: 'host', n: 'Sophia', t: "Welcome to StreamPireX Podcast Studio — all-in-one creator platform." },
      { s: 'guest', n: 'Marcus', t: "Recording directly inside the platform. No OBS, no Zoom needed." },
      { s: 'host', n: 'Sophia', t: "Record, edit, distribute — all in one place. One login." },
      { s: 'guest', n: 'Marcus', t: "90% revenue to creators. YouTube takes 55%. StreamPireX takes 10%." },
      { s: 'host', n: 'Sophia', t: "The platform works for you, not the other way around." },
      { s: 'guest', n: 'Marcus', t: "DJ Mixer, beat maker, AI mastering — replaces my entire stack." },
      { s: 'host', n: 'Sophia', t: "One platform. 15 tools. 90% for creators. StreamPireX." },
      { s: 'guest', n: 'Marcus', t: "I'm fully sold. This changes everything for independent creators." }
    ];

    let idx = 0;
    const chat = document.getElementById('chat');

    function next() {
      const line = LINES[idx++ % LINES.length];
      hS = line.s === 'host';
      gS = line.s === 'guest';
      document.getElementById('stxt').textContent = '🎙 ' + line.n + ' is speaking...';

      const all = chat.querySelectorAll('.cb');
      if (all.length >= 3) all[0].remove();

      const b = document.createElement('div');
      b.className = 'cb' + (line.s === 'guest' ? ' gb' : '');
      b.innerHTML =
        '<div class="cn ' + (line.s === 'host' ? 'h' : 'g') + '">' + line.n + '</div>' +
        '<div class="ct">' + line.t + '</div>';

      chat.appendChild(b);
      requestAnimationFrame(() => setTimeout(() => b.classList.add('show'), 20));

      setTimeout(() => {
        hS = false;
        gS = false;
        setTimeout(next, 400);
      }, 1500);
    }

    setTimeout(next, 800);
  </script>
</body>
</html>
`;

export default podcastStudioSrcDoc;