import shutil, os

ROOT   = '/workspaces/SpectraSphere'
STYLES = f'{ROOT}/src/front/styles'
COMP   = f'{ROOT}/src/front/js/component'

# ── 1. Copy all 4 new CSS files from repo root ────────────────────────────
for f in ['SPX60Tab.css', 'SPXEPSTab.css', 'SPXS950Tab.css', 'SPXS1000Tab.css']:
    src = f'{ROOT}/{f}'
    dst = f'{STYLES}/{f}'
    if os.path.exists(src):
        shutil.copy(src, dst)
        print(f'✓ {f}')
    else:
        print(f'✗ NOT FOUND: {f}')

# ── 2. Fix SPXS1000Tab.js — wrap pad inner content in .spxs1000-pad-inner ──
s1000 = f'{COMP}/SPXS1000Tab.js'
with open(s1000) as f:
    code = f.read()

old_pad_inner = '''                    <div key={pi}
                      className={`spxs1000-pad${pad.processedBuffer ? ' loaded' : ''}${activeSteps.includes(pi) ? ' firing' : ''}${selectedPad === pi ? ' selected' : ''}${pad.muted ? ' muted' : ''}`}
                      onMouseDown={() => { setSelectedPad(pi); triggerPad(pi, 0.9); }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadSample(pi, f); }}
                      onDoubleClick={() => fileSelect(pi)}>
                      <span className="spxs1000-pad-num">{pi + 1}</span>
                      {pad.name ? <span className="spxs1000-pad-name">{pad.name}</span>
                                : <span className="spxs1000-pad-drop">DROP</span>}
                    </div>'''

new_pad_inner = '''                    <div key={pi}
                      className={`spxs1000-pad${pad.processedBuffer ? ' loaded' : ''}${activeSteps.includes(pi) ? ' firing' : ''}${selectedPad === pi ? ' selected' : ''}${pad.muted ? ' muted' : ''}`}
                      onMouseDown={() => { setSelectedPad(pi); triggerPad(pi, 0.9); }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadSample(pi, f); }}
                      onDoubleClick={() => fileSelect(pi)}>
                      <div className="spxs1000-pad-inner">
                        <span className="spxs1000-pad-num">{pi + 1}</span>
                        {pad.name ? <span className="spxs1000-pad-name">{pad.name}</span>
                                  : <span className="spxs1000-pad-drop">DROP</span>}
                      </div>
                    </div>'''

if 'spxs1000-pad-inner' not in code:
    if old_pad_inner in code:
        code = code.replace(old_pad_inner, new_pad_inner)
        with open(s1000, 'w') as f:
            f.write(code)
        print('✓ SPXS1000Tab pad-inner wrapper added')
    else:
        print('- SPXS1000Tab pad structure not matched — skipping (CSS still works without it)')
else:
    print('- pad-inner already present')

print('\nRun: npm run build && git add -A && git commit -m "feat: distinct sampler CSS layouts" && git push')
