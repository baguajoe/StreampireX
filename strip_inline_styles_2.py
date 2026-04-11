import re

JS = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'
CSS = '/workspaces/SpectraSphere/src/front/styles/RecordingStudio.css'

with open(JS) as f: js = f.read()

replacements = [
    # Amp sim panel padding
    ("style={{padding:24}}", 'className="rs-amp-panel"',
     '.rs-amp-panel { padding:24px; }'),

    # Amp sim heading
    ("style={{color:'#e6edf3',fontWeight:800,fontSize:20,margin:'0 0 6px'}}",
     'className="rs-amp-heading"',
     '.rs-amp-heading { color:#e6edf3; font-weight:800; font-size:20px; margin:0 0 6px; }'),

    # Amp sim subtext
    ("style={{color:'#8b949e',fontSize:14,margin:'0 0 20px'}}",
     'className="rs-amp-subtext"',
     '.rs-amp-subtext { color:#8b949e; font-size:14px; margin:0 0 20px; }'),

    # Amp sim scale
    ("style={{transform:'scale(1.25)',transformOrigin:'top left',width:'80%'}}",
     'className="rs-amp-scale"',
     '.rs-amp-scale { transform:scale(1.25); transform-origin:top left; width:80%; }'),

    # Settings panel with max width
    ("style={{padding:24,maxWidth:560,display:'flex',flexDirection:'column',gap:20}}",
     'className="rs-settings-panel"',
     '.rs-settings-panel { padding:24px; max-width:560px; display:flex; flex-direction:column; gap:20px; }'),

    # Dark card
    ("style={{background:'#0d1117',border:'1px solid #21262d',borderRadius:12,padding:20}}",
     'className="rs-dark-card"',
     '.rs-dark-card { background:#0d1117; border:1px solid #21262d; border-radius:12px; padding:20px; }'),

    # Card header row
    ("style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}",
     'className="rs-card-header"',
     '.rs-card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }'),

    # Card title h4
    ("style={{color:'#e6edf3',fontWeight:800,margin:'0 0 4px'}}",
     'className="rs-card-title"',
     '.rs-card-title { color:#e6edf3; font-weight:800; margin:0 0 4px; }'),

    # Card subtitle p
    ("style={{color:'#8b949e',fontSize:12,margin:0}}",
     'className="rs-card-subtitle"',
     '.rs-card-subtitle { color:#8b949e; font-size:12px; margin:0; }'),

    # Toggle label
    ("style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}",
     'className="rs-toggle-label"',
     '.rs-toggle-label { display:flex; align-items:center; gap:6px; cursor:pointer; }'),

    # Param row
    ("style={{marginBottom:12}}",
     'className="rs-param-row"',
     '.rs-param-row { margin-bottom:12px; }'),

    # Param header
    ("style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#4e6a82',marginBottom:5}}",
     'className="rs-param-header"',
     '.rs-param-header { display:flex; justify-content:space-between; font-size:11px; color:#4e6a82; margin-bottom:5px; }'),

    # Orange range input
    ("style={{width:'100%',accentColor:'#ff6600'}}",
     'className="rs-range-orange"',
     '.rs-range-orange { width:100%; accent-color:#ff6600; }'),

    # Yellow range input
    ("style={{width:'100%',accentColor:'#ffd60a'}}",
     'className="rs-range-yellow"',
     '.rs-range-yellow { width:100%; accent-color:#ffd60a; }'),

    # Teal range input
    ("style={{width:'100%',accentColor:'#00ffc8'}}",
     'className="rs-range-teal"',
     '.rs-range-teal { width:100%; accent-color:#00ffc8; }'),

    # Signal chain grid
    ("style={{display:'flex',gap:12,flexWrap:'wrap'}}",
     'className="rs-chain-grid"',
     '.rs-chain-grid { display:flex; gap:12px; flex-wrap:wrap; }'),

    # Effect card
    ("style={{width:100,height:120,background:'#0d1117',border:'1px solid #21262d',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer'}}",
     'className="rs-effect-card"',
     '.rs-effect-card { width:100px; height:120px; background:#0d1117; border:1px solid #21262d; border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; }'),

    # Effect icon
    ("style={{fontSize:28}}",
     'className="rs-effect-icon"',
     '.rs-effect-icon { font-size:28px; }'),

    # Effect name
    ("style={{fontSize:10,fontWeight:700,color:'#8b949e'}}",
     'className="rs-effect-name"',
     '.rs-effect-name { font-size:10px; font-weight:700; color:#8b949e; }'),

    # Effect knob indicator
    ("style={{width:22,height:22,borderRadius:'50%',border:'2px solid #ff6600',background:'#161b22'}}",
     'className="rs-effect-knob"',
     '.rs-effect-knob { width:22px; height:22px; border-radius:50%; border:2px solid #ff6600; background:#161b22; }'),

    # Hint small
    ("style={{color:'#4e6a82',fontSize:11,marginTop:16}}",
     'className="rs-hint-sm"',
     '.rs-hint-sm { color:#4e6a82; font-size:11px; margin-top:16px; }'),

    # Console selector panel
    ("style={{padding:16}}",
     'className="rs-console-panel"',
     '.rs-console-panel { padding:16px; }'),

    # Console label teal mono
    ("style={{fontSize:11,color:'#00ffc8',fontFamily:'Share Tech Mono,monospace',letterSpacing:1,marginBottom:12}}",
     'className="rs-console-label"',
     '.rs-console-label { font-size:11px; color:#00ffc8; font-family:"Share Tech Mono",monospace; letter-spacing:1px; margin-bottom:12px; }'),

    # Console button row
    ("style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}",
     'className="rs-console-btn-row"',
     '.rs-console-btn-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }'),

    # Master bus label
    ("style={{fontSize:10,color:'#4e6a82',marginBottom:8}}",
     'className="rs-master-bus-label"',
     '.rs-master-bus-label { font-size:10px; color:#4e6a82; margin-bottom:8px; }'),

    # Console mono hint
    ("style={{fontSize:10,color:'#4e6a82',fontFamily:'Share Tech Mono,monospace'}}",
     'className="rs-console-hint"',
     '.rs-console-hint { font-size:10px; color:#4e6a82; font-family:"Share Tech Mono",monospace; }'),

    # Analog subview tab bar
    ("style={{display:'flex',background:'#0d1117',borderBottom:'1px solid #21262d',padding:'0 12px'}}",
     'className="rs-analog-tabs"',
     '.rs-analog-tabs { display:flex; background:#0d1117; border-bottom:1px solid #21262d; padding:0 12px; }'),

    # View containers with flex auto
    ("style={{ flex: 1, overflow: \"auto\", height: \"100%\" }}",
     'className="rs-view-auto"',
     '.rs-view-auto { flex:1; overflow:auto; height:100%; }'),

    # Plugin sidebar section header
    ("style={{ borderTop: \"2px solid #1a2a3a\", margin: \"6px 0 2px\", padding: \"4px 10px 2px\" }}",
     'className="rs-sidebar-section-header"',
     '.rs-sidebar-section-header { border-top:2px solid #1a2a3a; margin:6px 0 2px; padding:4px 10px 2px; }'),

    # Plugin sidebar section label
    ("style={{ fontSize: \"0.55rem\", color: \"#ff9800\", fontWeight: 700, letterSpacing: 1, textTransform: \"uppercase\" }}",
     'className="rs-sidebar-section-label"',
     '.rs-sidebar-section-label { font-size:0.55rem; color:#ff9800; font-weight:700; letter-spacing:1px; text-transform:uppercase; }'),

    # Plugin sidebar item label
    ("style={{ padding: \"5px 10px 2px\", fontSize: \"0.52rem\", color: \"#ff9800\", fontWeight: 700, textTransform: \"uppercase\", letterSpacing: 0.5 }}",
     'className="rs-sidebar-item-label"',
     '.rs-sidebar-item-label { padding:5px 10px 2px; font-size:0.52rem; color:#ff9800; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }'),

    # LIB badge
    ("style={{ fontSize: 8, background: \"#ff9800\", color: \"#000\", borderRadius: 2, padding: \"1px 3px\", fontWeight: 800 }}",
     'className="rs-lib-badge"',
     '.rs-lib-badge { font-size:8px; background:#ff9800; color:#000; border-radius:2px; padding:1px 3px; font-weight:800; }'),

    # Divider line
    ("style={{ borderTop: \"1px solid #0f1820\", margin: \"4px 0\" }}",
     'className="rs-divider"',
     '.rs-divider { border-top:1px solid #0f1820; margin:4px 0; }'),

    # Delete/remove item style
    ("style={{ padding: \"4px 14px\", fontSize: \"0.65rem\", color: \"#e53935\", cursor: \"pointer\" }}",
     'className="rs-remove-item"',
     '.rs-remove-item { padding:4px 14px; font-size:0.65rem; color:#e53935; cursor:pointer; }'),

    # Send button margin
    ("style={{ marginTop: 10 }}",
     'className="rs-send-btn"',
     '.rs-send-btn { margin-top:10px; }'),

    # Position relative wrapper
    ("style={{ position: \"relative\" }}",
     'className="rs-relative"',
     '.rs-relative { position:relative; }'),

    # Master vol readout orange
    ("style={{ color: '#ff8a3d' }}",
     'className="rs-orange"',
     '.rs-orange { color:#ff8a3d; }'),

    # Transport label bold
    ("style={{ fontSize: \"0.7rem\", fontWeight: 800 }}",
     'className="rs-transport-label"',
     '.rs-transport-label { font-size:0.7rem; font-weight:800; }'),

    # Flex row with margin
    ("style={{ display:'flex', alignItems:'center', gap:4, marginLeft:8,",
     'className="rs-flex-row-ml"',  # skip — multiline
     ''),

    # Harmonic param header
    ("style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#4e6a82',marginBottom:5}}",
     'className="rs-param-header"',
     ''),  # already defined above

    # Synth/drum/instr view auto
    ("style={{ flex: 1, overflow: \"auto\", height: \"100%\" }}",
     'className="rs-view-auto"',
     ''),  # already defined
]

changed = 0
css_additions = []

for old_style, new_class, css in replacements:
    if not old_style or not new_class or 'skip' in new_class:
        continue
    count = js.count(old_style)
    if count > 0:
        js = js.replace(old_style, new_class)
        if css:
            css_additions.append(css)
        changed += count
        print(f'✓ {new_class[:50]} ({count}x)')

with open(JS, 'w') as f: f.write(js)
print(f'\n✓ {changed} replacements made')

# Append CSS
with open(CSS, 'a') as f:
    f.write('\n\n/* ── RecordingStudio inline style extractions pass 2 ── */\n')
    for css in css_additions:
        if css:
            f.write(css + '\n')

print('✓ CSS added')

import subprocess
result = subprocess.run(['grep', '-c', 'style={{', JS], capture_output=True, text=True)
print(f'Remaining: {result.stdout.strip()} (target: ~40 truly dynamic)')
print('\nRun: kill $(pgrep webpack) 2>/dev/null; sleep 2 && NODE_OPTIONS="--max-old-space-size=8192" npm run build && git add -A && git commit -m "refactor: strip inline styles pass 2" && git push')
