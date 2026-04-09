import shutil, os, re

ROOT   = '/workspaces/SpectraSphere'
COMP   = f'{ROOT}/src/front/js/component'
STYLES = f'{ROOT}/src/front/styles'

# ── 1. Copy component JS files from repo root ──────────────────────────────
for f in ['SPX60Tab.js', 'SPXEPSTab.js', 'SPXS950Tab.js']:
    src = f'{ROOT}/{f}'
    dst = f'{COMP}/{f}'
    if os.path.exists(src):
        shutil.copy(src, dst)
        print(f'✓ copied {f} → component/')
    else:
        print(f'✗ NOT FOUND in root: {f}')

# SPXS1000Tab and samplerMasterClock already copied earlier
for f in ['SPXS1000Tab.js', 'samplerMasterClock.js']:
    if os.path.exists(f'{COMP}/{f}'):
        print(f'✓ already present: {f}')
    else:
        src = f'{ROOT}/{f}'
        if os.path.exists(src):
            shutil.copy(src, f'{COMP}/{f}')
            print(f'✓ copied {f} → component/')
        else:
            print(f'✗ NOT FOUND: {f}')

# ── 2. Split combined CSS into 3 separate files ────────────────────────────
css_src = f'{ROOT}/SPXEPS_S950_S1000_Tab.css'
if os.path.exists(css_src):
    with open(css_src) as f:
        css = f.read()
    eps_match   = re.search(r'/\*.*?SPXEPSTab\.css.*?\*/(.*?)(?=/\*.*?SPXS950Tab)', css, re.S)
    s950_match  = re.search(r'/\*.*?SPXS950Tab\.css.*?\*/(.*?)(?=/\*.*?SPXS1000Tab)', css, re.S)
    s1000_match = re.search(r'/\*.*?SPXS1000Tab\.css.*?\*/(.*)', css, re.S)
    for name, match in [('SPXEPSTab.css', eps_match), ('SPXS950Tab.css', s950_match), ('SPXS1000Tab.css', s1000_match)]:
        if match:
            with open(f'{STYLES}/{name}', 'w') as f:
                f.write(match.group(1).strip() + '\n')
            print(f'✓ wrote {name}')
        else:
            print(f'✗ could not split {name}')
else:
    print(f'✗ SPXEPS_S950_S1000_Tab.css not in root — drag it in from downloads')

# ── 3. Copy SPX60Tab.css ───────────────────────────────────────────────────
css60 = f'{ROOT}/SPX60Tab.css'
if os.path.exists(css60):
    shutil.copy(css60, f'{STYLES}/SPX60Tab.css')
    print('✓ copied SPX60Tab.css → styles/')
else:
    print('✗ SPX60Tab.css not in root — drag it in from downloads')

# ── 4. Patch SamplerBeatMaker.js ──────────────────────────────────────────
sbm = f'{COMP}/SamplerBeatMaker.js'
with open(sbm) as f:
    code = f.read()

changed = False

# 4a. Imports
IMPORT_ANCHOR = "import SP1200Tab from './SP1200Tab';"
NEW_IMPORTS = """import SP1200Tab from './SP1200Tab';
import SPX60Tab        from './SPX60Tab';
import SPXEPSTab       from './SPXEPSTab';
import SPXS950Tab      from './SPXS950Tab';
import SPXS1000Tab     from './SPXS1000Tab';
import { useSamplerMasterClock } from './samplerMasterClock';"""

if 'SPX60Tab' not in code:
    if IMPORT_ANCHOR in code:
        code = code.replace(IMPORT_ANCHOR, NEW_IMPORTS)
        print('✓ imports added')
        changed = True
    else:
        print('✗ import anchor not found')
else:
    print('- imports already present')

# 4b. masterClock hook
HOOK_ANCHOR = "const [isPlaying, setIsPlaying] = useState(false);"
HOOK_INSERT  = """const [isPlaying, setIsPlaying] = useState(false);
  const masterClock = useSamplerMasterClock(bpm, isPlaying);"""

if 'masterClock' not in code:
    if HOOK_ANCHOR in code:
        code = code.replace(HOOK_ANCHOR, HOOK_INSERT)
        print('✓ masterClock hook added')
        changed = True
    else:
        print('✗ isPlaying anchor not found — add masterClock hook manually')
else:
    print('- masterClock already present')

# 4c. Tab list entries
TAB_ANCHOR = "{ id: 'triple',"
NEW_TABS = """{ id: 'spx60',   label: '🎛️ SPX-60',   title: 'SPX-60 — 12-bit 40kHz, Linn swing, 4-vel layers' },
          { id: 'spx-eps', label: '🎛️ SPX-EPS',  title: 'SPX-EPS — 13-bit 29kHz, DOC chip, lo-fi grit' },
          { id: 'spx950',  label: '🎛️ SPX-950',  title: 'SPX-950 — 12-bit 40kHz, R-2R ladder, West Coast warm' },
          { id: 'spx1000', label: '🎛️ SPX-1000', title: 'SPX-1000 — 16-bit 44.1kHz, linear PCM, clean' },
          { id: 'triple',"""

if "'spx60'" not in code:
    if TAB_ANCHOR in code:
        code = code.replace(TAB_ANCHOR, NEW_TABS, 1)
        print('✓ tab entries added')
        changed = True
    else:
        print('✗ tab list anchor not found')
else:
    print('- tab entries already present')

# 4d. Render blocks — insert after sp1200 closing block, before STEMS TAB comment
RENDER_ANCHOR = "        {/* ── STEMS TAB ── */"

NEW_RENDER = """        {activeTab === 'spx60' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <SPX60Tab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
              masterClock={masterClock}
              onSendToTriple={(padIdx, buffer, name) => { setActiveTab('triple'); }}
            />
          </div>
        )}
        {activeTab === 'spx-eps' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <SPXEPSTab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
              masterClock={masterClock}
              onSendToTriple={(padIdx, buffer, name) => { setActiveTab('triple'); }}
            />
          </div>
        )}
        {activeTab === 'spx950' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <SPXS950Tab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
              masterClock={masterClock}
              onSendToTriple={(padIdx, buffer, name) => { setActiveTab('triple'); }}
            />
          </div>
        )}
        {activeTab === 'spx1000' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <SPXS1000Tab
              onExport={onExport}
              onSendToArrange={onSendToArrange}
              isEmbedded={true}
              masterClock={masterClock}
              onSendToTriple={(padIdx, buffer, name) => { setActiveTab('triple'); }}
            />
          </div>
        )}
        {/* ── STEMS TAB ── */"""

if "activeTab === 'spx60'" not in code:
    if RENDER_ANCHOR in code:
        code = code.replace(RENDER_ANCHOR, NEW_RENDER, 1)
        print('✓ render blocks added')
        changed = True
    else:
        print('✗ STEMS TAB anchor not found')
else:
    print('- render blocks already present')

# ── 5. Write file ──────────────────────────────────────────────────────────
if changed:
    with open(sbm, 'w') as f:
        f.write(code)
    print('\n✓ SamplerBeatMaker.js saved')
else:
    print('\n- No changes needed')

print('\nRun: cd /workspaces/SpectraSphere && npm run build')
