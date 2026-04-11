import re

JS = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'
CSS = '/workspaces/SpectraSphere/src/front/styles/RecordingStudio.css'

with open(JS) as f: js = f.read()

# ── Static inline style replacements ─────────────────────────────────────────
# Format: (old_inline, new_className, css_to_add)

replacements = [
    # Audio settings modal overlay
    (
        "style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}",
        'className="rs-modal-overlay"',
        '.rs-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:1000; display:flex; align-items:center; justify-content:center; }'
    ),
    # Audio settings modal panel
    (
        "style={{width:'90%',maxWidth:900,maxHeight:'90vh',overflow:'auto',background:'#161b22',borderRadius:12,border:'1px solid #30363d',boxShadow:'0 24px 64px rgba(0,0,0,0.6)'}}",
        'className="rs-modal-panel"',
        '.rs-modal-panel { width:90%; max-width:900px; max-height:90vh; overflow:auto; background:#161b22; border-radius:12px; border:1px solid #30363d; box-shadow:0 24px 64px rgba(0,0,0,0.6); }'
    ),
    # Plugin modal
    (
        "style={{position:'fixed',top:60,right:20,zIndex:900,width:'min(900px,60vw)',maxHeight:'80vh',overflowY:'auto'}}",
        'className="rs-plugin-modal"',
        '.rs-plugin-modal { position:fixed; top:60px; right:20px; z-index:900; width:min(900px,60vw); max-height:80vh; overflow-y:auto; }'
    ),
    # Close button in modal
    (
        "style={{position:'absolute',top:8,right:12,background:'none',border:'none',color:'#fff',fontSize:'18px',cursor:'pointer',zIndex:10}}",
        'className="rs-modal-close"',
        '.rs-modal-close { position:absolute; top:8px; right:12px; background:none; border:none; color:#fff; font-size:18px; cursor:pointer; z-index:10; }'
    ),
    # WAM plugin badge
    (
        'style={{display:"flex",alignItems:"center",gap:6,padding:"2px 8px",background:"rgba(124,58,237,0.08)",borderRadius:6,border:"1px solid rgba(124,58,237,0.2)"}}',
        'className="rs-wam-badge"',
        '.rs-wam-badge { display:flex; align-items:center; gap:6px; padding:2px 8px; background:rgba(124,58,237,0.08); border-radius:6px; border:1px solid rgba(124,58,237,0.2); }'
    ),
    # WAM badge text
    (
        'style={{fontSize:10,color:"#a78bfa",fontWeight:700}}',
        'className="rs-wam-text"',
        '.rs-wam-text { font-size:10px; color:#a78bfa; font-weight:700; }'
    ),
    # Mic model name
    (
        'style={{ fontWeight: 700 }}',
        'className="rs-mic-name"',
        '.rs-mic-name { font-weight:700; }'
    ),
    # Mic model desc
    (
        'style={{ fontSize: "0.65rem", opacity: 0.75 }}',
        'className="rs-mic-desc"',
        '.rs-mic-desc { font-size:0.65rem; opacity:0.75; }'
    ),
    # Settings section spacer
    (
        "style={{marginBottom:16}}",
        'className="rs-settings-section"',
        '.rs-settings-section { margin-bottom:16px; }'
    ),
    # Settings label
    (
        "style={{color:'#6e7681',fontSize:11,display:'block',marginBottom:6}}",
        'className="rs-settings-label"',
        '.rs-settings-label { color:#6e7681; font-size:11px; display:block; margin-bottom:6px; }'
    ),
    # Settings row flex
    (
        "style={{display:'flex',gap:6}}",
        'className="rs-settings-row"',
        '.rs-settings-row { display:flex; gap:6px; }'
    ),
    # Latency stats box
    (
        "style={{marginBottom:16,padding:'10px 14px',background:'#080c12',borderRadius:8,border:'1px solid #1c2128'}}",
        'className="rs-latency-box"',
        '.rs-latency-box { margin-bottom:16px; padding:10px 14px; background:#080c12; border-radius:8px; border:1px solid #1c2128; }'
    ),
    # Stats row
    (
        "style={{display:'flex',justifyContent:'space-between',marginBottom:6}}",
        'className="rs-stat-row"',
        '.rs-stat-row { display:flex; justify-content:space-between; margin-bottom:6px; }'
    ),
    # Stats row last
    (
        "style={{display:'flex',justifyContent:'space-between'}}",
        'className="rs-stat-row-last"',
        '.rs-stat-row-last { display:flex; justify-content:space-between; }'
    ),
    # Stats label
    (
        "style={{color:'#6e7681',fontSize:11}}",
        'className="rs-stat-label"',
        '.rs-stat-label { color:#6e7681; font-size:11px; }'
    ),
    # Stats value teal
    (
        "style={{color:'#00ffc8',fontWeight:700,fontSize:12}}",
        'className="rs-stat-val-teal"',
        '.rs-stat-val-teal { color:#00ffc8; font-weight:700; font-size:12px; }'
    ),
    # Stats value normal
    (
        "style={{color:'#cdd9e5',fontSize:11}}",
        'className="rs-stat-val"',
        '.rs-stat-val { color:#cdd9e5; font-size:11px; }'
    ),
    # Hint text
    (
        "style={{color:'#484f58',fontSize:10,marginTop:4}}",
        'className="rs-hint"',
        '.rs-hint { color:#484f58; font-size:10px; margin-top:4px; }'
    ),
    (
        "style={{color:'#484f58',fontSize:10,textAlign:'center'}}",
        'className="rs-hint-center"',
        '.rs-hint-center { color:#484f58; font-size:10px; text-align:center; }'
    ),
    # Audio settings title
    (
        "style={{color:'#e6edf3',fontWeight:800,fontSize:14,letterSpacing:'0.1em'}}",
        'className="rs-settings-title"',
        '.rs-settings-title { color:#e6edf3; font-weight:800; font-size:14px; letter-spacing:0.1em; }'
    ),
    # Close button simple
    (
        "style={{background:'none',border:'none',color:'#6e7681',cursor:'pointer',fontSize:16}}",
        'className="rs-close-btn"',
        '.rs-close-btn { background:none; border:none; color:#6e7681; cursor:pointer; font-size:16px; }'
    ),
    # Piano view container
    (
        "style={{flex:1,width:'100%',height:'100%',display:'flex',flexDirection:'column'}}",
        'className="rs-view-full"',
        '.rs-view-full { flex:1; width:100%; height:100%; display:flex; flex-direction:column; }'
    ),
    # Vocal/aimix view
    (
        "style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',overflow:'auto'}}",
        'className="rs-view-scroll"',
        '.rs-view-scroll { display:flex; flex-direction:column; width:100%; height:100%; overflow:auto; }'
    ),
    # Bottom toolbar
    (
        "style={{padding:'12px 16px',borderTop:'1px solid #30363d',display:'flex',alignItems:'center',gap:12}}",
        'className="rs-bottom-toolbar"',
        '.rs-bottom-toolbar { padding:12px 16px; border-top:1px solid #30363d; display:flex; align-items:center; gap:12px; }'
    ),
    # Teal action button
    (
        "style={{background:'rgba(0,255,200,0.1)',color:'#00ffc8',border:'1px solid rgba(0,255,200,0.3)',borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:'0.85rem',fontWeight:600}}",
        'className="rs-action-btn-teal"',
        '.rs-action-btn-teal { background:rgba(0,255,200,0.1); color:#00ffc8; border:1px solid rgba(0,255,200,0.3); border-radius:8px; padding:8px 16px; cursor:pointer; font-size:0.85rem; font-weight:600; }'
    ),
    # Small muted text
    (
        "style={{fontSize:'0.78rem',color:'#8b949e'}}",
        'className="rs-muted-text"',
        '.rs-muted-text { font-size:0.78rem; color:#8b949e; }'
    ),
    # Flex overflow auto containers
    (
        "style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}",
        'className="rs-flex-hidden"',
        '.rs-flex-hidden { flex:1; min-height:0; overflow:hidden; }'
    ),
    (
        "style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#06090f' }}",
        'className="rs-flex-scroll-dark"',
        '.rs-flex-scroll-dark { flex:1; min-height:0; overflow-y:auto; background:#06090f; }'
    ),
    (
        "style={{flex:1,minHeight:0,overflowY:'auto',background:'#06060f'}}",
        'className="rs-flex-scroll-darker"',
        '.rs-flex-scroll-darker { flex:1; min-height:0; overflow-y:auto; background:#06060f; }'
    ),
    # Analog subview container
    (
        "style={{transform:'scale(1.2)',transformOrigin:'top left',width:'83.33%',minHeight:'100%'}}",
        'className="rs-analog-scale"',
        '.rs-analog-scale { transform:scale(1.2); transform-origin:top left; width:83.33%; min-height:100%; }'
    ),
    # Daw console height 100%
    (
        "style={{ height: '100%', overflow: 'auto' }}",
        'className="rs-console-scroll"',
        '.rs-console-scroll { height:100%; overflow:auto; }'
    ),
    # Insert slot empty text
    (
        'style={{ fontSize: "0.55rem", color: "#5a7088" }}',
        'className="rs-insert-empty-text"',
        '.rs-insert-empty-text { font-size:0.55rem; color:#5a7088; }'
    ),
    # Master name in channel
    (
        'style={{ fontWeight: 700, fontSize: "0.62rem", color: "#ddeeff" }}',
        'className="rs-master-label"',
        '.rs-master-label { font-weight:700; font-size:0.62rem; color:#ddeeff; }'
    ),
]

changed = 0
css_additions = []

for old_style, new_class, css in replacements:
    if old_style in js:
        js = js.replace(old_style, new_class)
        css_additions.append(css)
        changed += 1
        print(f'✓ {new_class[:40]}')
    else:
        # Try without spaces variations
        pass

with open(JS, 'w') as f: f.write(js)
print(f'\n✓ {changed} inline styles replaced')

# Append new CSS classes
with open(CSS, 'a') as f:
    f.write('\n\n/* ── RecordingStudio inline style extractions ── */\n')
    for css in css_additions:
        f.write(css + '\n')

print('✓ CSS classes added')
print(f'\nRemaining inline styles:')
import subprocess
result = subprocess.run(['grep', '-c', 'style={{', JS], capture_output=True, text=True)
print(f'  {result.stdout.strip()} (down from 148)')
print('\nRun: npm run build && git add -A && git commit -m "refactor: strip inline styles from RecordingStudio" && git push')
