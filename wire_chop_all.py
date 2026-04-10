import re, os

ROOT = '/workspaces/SpectraSphere'
COMP = f'{ROOT}/src/front/js/component'

# ── DSP export map per tab ────────────────────────────────────────────────────
# Each tab has applyDSP internally — we export it so SamplerBeatMaker can pass
# it into ChopView as previewDsp

DSP_EXPORTS = {
    'SPX60Tab.js':   'applyDSP',
    'SPXS950Tab.js': 'applyDSP',
    'SPXS1000Tab.js':'applyDSP',
    'SPXEPSTab.js':  'applyDSP',
    'SPX10Tab.js':   'applyDSP',
}

for fname, fn in DSP_EXPORTS.items():
    path = f'{COMP}/{fname}'
    if not os.path.exists(path):
        print(f'✗ {fname} not found'); continue
    with open(path) as f: code = f.read()
    export_line = f'export {{ {fn} as dspChain }};'
    if 'dspChain' not in code:
        code = code.rstrip() + f'\n\n{export_line}\n'
        with open(path, 'w') as f: f.write(code)
        print(f'✓ exported dspChain from {fname}')
    else:
        print(f'- {fname} already exports dspChain')

# ── Add ✂️ chop button to each hardware tab settings panel ───────────────────
CHOP_BTN_MAP = {
    'SPX60Tab.js': (
        '<button className="spx60-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>',
        '<button className="spx60-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>\n                {pads[selectedPad]?.processedBuffer && onChopRequest && (\n                  <button className="spx60-action-btn" onClick={() => onChopRequest(pads[selectedPad].processedBuffer, updatePad, setPads)}>✂️ CHOP</button>\n                )}'
    ),
    'SPXS950Tab.js': (
        '<button className="spxs950-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>',
        '<button className="spxs950-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>\n                {pads[selectedPad]?.processedBuffer && onChopRequest && (\n                  <button className="spxs950-action-btn" onClick={() => onChopRequest(pads[selectedPad].processedBuffer, updatePad, setPads)}>✂️ CHOP</button>\n                )}'
    ),
    'SPXS1000Tab.js': (
        '<button className="spxs1000-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>',
        '<button className="spxs1000-action-btn" onClick={() => fileSelect(selectedPad)}>📂 LOAD</button>\n                {pads[selectedPad]?.processedBuffer && onChopRequest && (\n                  <button className="spxs1000-action-btn" onClick={() => onChopRequest(pads[selectedPad].processedBuffer, updatePad, setPads)}>✂️ CHOP</button>\n                )}'
    ),
    'SPXEPSTab.js': (
        '<button className="spxeps-action-btn" onClick={() => fileSelect(selectedZone)}>📂 LOAD SAMPLE</button>',
        '<button className="spxeps-action-btn" onClick={() => fileSelect(selectedZone)}>📂 LOAD SAMPLE</button>\n              {zones[selectedZone]?.processedBuffer && onChopRequest && (\n                <button className="spxeps-action-btn" onClick={() => onChopRequest(zones[selectedZone].processedBuffer, (zi, data) => updateZone(zi, Object.keys(data)[0], Object.values(data)[0]), setZones)}>✂️ CHOP</button>\n              )}'
    ),
    'SPX10Tab.js': (
        '<button className="spx10-action-btn" onClick={() => fileSelect(selectedZone)}>📂 LOAD SAMPLE</button>',
        '<button className="spx10-action-btn" onClick={() => fileSelect(selectedZone)}>📂 LOAD SAMPLE</button>\n              {zones[selectedZone]?.processedBuffer && onChopRequest && (\n                <button className="spx10-action-btn" onClick={() => onChopRequest(zones[selectedZone].processedBuffer, (zi, data) => updateZone(zi, Object.keys(data)[0], Object.values(data)[0]), setZones)}>✂️ CHOP</button>\n              )}'
    ),
}

for fname, (old, new) in CHOP_BTN_MAP.items():
    path = f'{COMP}/{fname}'
    if not os.path.exists(path):
        print(f'✗ {fname} not found'); continue
    with open(path) as f: code = f.read()
    if '✂️ CHOP' not in code:
        if old in code:
            code = code.replace(old, new, 1)
            with open(path, 'w') as f: f.write(code)
            print(f'✓ ✂️ CHOP button added to {fname}')
        else:
            print(f'✗ anchor not found in {fname}')
    else:
        print(f'- {fname} already has chop button')

# ── Patch SamplerBeatMaker.js ─────────────────────────────────────────────────
sbm = f'{COMP}/SamplerBeatMaker.js'
with open(sbm) as f: code = f.read()
changed = False

# 1. Add hwChopState
if 'hwChopState' not in code:
    anchor = "const [showChop, setShowChop] = useState(false);"
    insert = "const [showChop, setShowChop] = useState(false);\n  const [hwChopState, setHwChopState] = useState(null); // { buffer, dspFn, pads, setPads }"
    if anchor in code:
        code = code.replace(anchor, insert)
        print('✓ hwChopState added')
        changed = True

# 2. Add onChopRequest handler
if 'onChopRequest' not in code:
    anchor = "const openChop = useCallback"
    insert = """const onChopRequest = useCallback((buffer, updatePadFn, setPadsFn, dspFn) => {
    setHwChopState({ buffer, updatePadFn, setPadsFn, dspFn: dspFn || null });
  }, []);

  const openChop = useCallback"""
    if anchor in code:
        code = code.replace(anchor, insert)
        print('✓ onChopRequest handler added')
        changed = True

# 3. Add hwChop ChopView render before closing sampler-content-wrapper
HW_CHOP_RENDER = """
      {/* ── HW SAMPLER CHOP ── */}
      {hwChopState && (
        <ChopView engine={{
          pads: Array.from({length:16},(_,i)=>({idx:i,name:'',buffer:null})),
          chopIdx: 0,
          chopPts: [], setChopPts: () => {},
          chopMode: 'transient', setChopMode: () => {},
          chopSens: 30, setChopSens: () => {},
          chopSlices: [], setChopSlices: () => {},
          zeroCrossSnap: true, setZeroCrossSnap: () => {},
          activeSlice: -1, setActiveSlice: () => {},
          bpm, masterVol: 1, initCtx, masterRef, activeSrc,
          previewDsp: hwChopState.dspFn,
          updatePad: hwChopState.updatePadFn,
          setShowChop: (v) => { if (!v) setHwChopState(null); },
          showChop: true,
          hwBuffer: hwChopState.buffer,
        }} />
      )}"""

if 'hwChopState &&' not in code:
    anchor = "      {/* PAD SETTINGS */"
    if anchor in code:
        code = code.replace(anchor, HW_CHOP_RENDER + '\n\n      {/* PAD SETTINGS */', 1)
        print('✓ hwChop ChopView render added')
        changed = True
    else:
        print('✗ PAD SETTINGS anchor not found')

# 4. Pass onChopRequest + dspChain to each hardware tab
HW_TABS = [
    ('SPX60Tab',   'spx60',   'SPX60Tab.js'),
    ('SPXS950Tab', 'spx950',  'SPXS950Tab.js'),
    ('SPXS1000Tab','spx1000', 'SPXS1000Tab.js'),
    ('SPXEPSTab',  'spx-eps', 'SPXEPSTab.js'),
    ('SPX10Tab',   'spx10',   'SPX10Tab.js'),
]

# Add dspChain imports
import_anchor = "import SPX60Tab        from './SPX60Tab';"
if 'dspChain as spx60Dsp' not in code:
    new_imports = """import SPX60Tab, { dspChain as spx60Dsp }   from './SPX60Tab';
import SPXS950Tab, { dspChain as spx950Dsp }  from './SPXS950Tab';
import SPXS1000Tab, { dspChain as spx1000Dsp } from './SPXS1000Tab';
import SPXEPSTab, { dspChain as spxEpsDsp }   from './SPXEPSTab';
import SPX10Tab, { dspChain as spx10Dsp }     from './SPX10Tab';"""
    old_imports = """import SPX60Tab        from './SPX60Tab';
import SPXEPSTab       from './SPXEPSTab';
import SPXS950Tab      from './SPXS950Tab';
import SPXS1000Tab     from './SPXS1000Tab';"""
    if old_imports in code:
        code = code.replace(old_imports, new_imports)
        print('✓ dspChain imports added')
        changed = True
    else:
        # Try individual replacements
        for old_i, new_i in [
            ("import SPX60Tab        from './SPX60Tab';",   "import SPX60Tab, { dspChain as spx60Dsp }   from './SPX60Tab';"),
            ("import SPXEPSTab       from './SPXEPSTab';",  "import SPXEPSTab, { dspChain as spxEpsDsp }  from './SPXEPSTab';"),
            ("import SPXS950Tab      from './SPXS950Tab';", "import SPXS950Tab, { dspChain as spx950Dsp } from './SPXS950Tab';"),
            ("import SPXS1000Tab     from './SPXS1000Tab';","import SPXS1000Tab, { dspChain as spx1000Dsp } from './SPXS1000Tab';"),
            ("import SPX10Tab        from './SPX10Tab';",   "import SPX10Tab, { dspChain as spx10Dsp }    from './SPX10Tab';"),
        ]:
            if old_i in code:
                code = code.replace(old_i, new_i)
                print(f'✓ updated import: {old_i[:40]}...')
                changed = True

# Pass onChopRequest to each tab render
DSP_MAP = {
    'spx60':   'spx60Dsp',
    'spx-eps': 'spxEpsDsp',
    'spx950':  'spx950Dsp',
    'spx1000': 'spx1000Dsp',
    'spx10':   'spx10Dsp',
}

for tab_id, dsp_var in DSP_MAP.items():
    # Find the tab's onSendToTriple prop and add onChopRequest after it
    old_prop = f"onSendToTriple={{(padIdx, buffer, name) => {{ setActiveTab('triple'); }}}}"
    new_prop = f"onSendToTriple={{(padIdx, buffer, name) => {{ setActiveTab('triple'); }}}}\n              onChopRequest={{(buf, upFn, setFn) => onChopRequest(buf, upFn, setFn, {dsp_var})}}"
    # Only patch the specific tab block
    tab_pattern = f"activeTab === '{tab_id}'"
    if tab_pattern in code:
        # Find the block and check if onChopRequest already there
        idx = code.find(tab_pattern)
        block_end = code.find(')}', idx + len(tab_pattern) + 200)
        block = code[idx:block_end+2]
        if 'onChopRequest' not in block and old_prop in block:
            new_block = block.replace(old_prop, new_prop, 1)
            code = code[:idx] + new_block + code[block_end+2:]
            print(f'✓ onChopRequest wired to {tab_id}')
            changed = True
        elif 'onChopRequest' in block:
            print(f'- {tab_id} already has onChopRequest')
        else:
            print(f'✗ prop anchor not found in {tab_id} block')

# ── Patch ChopView to use hwBuffer + previewDsp ───────────────────────────────
cv = f'{COMP}/ChopView.js'
with open(cv) as f: cv_code = f.read()
cv_changed = False

# Use hwBuffer if provided instead of pads[chopIdx].buffer
if 'hwBuffer' not in cv_code:
    old_buf = "const buffer = engine.pads?.[engine.chopIdx]?.buffer ?? engine.pads?.[engine.chopIdx]?.processedBuffer;"
    new_buf = "const buffer = engine.hwBuffer ?? engine.pads?.[engine.chopIdx]?.buffer ?? engine.pads?.[engine.chopIdx]?.processedBuffer;"
    if old_buf in cv_code:
        cv_code = cv_code.replace(old_buf, new_buf)
        print('✓ ChopView hwBuffer support added')
        cv_changed = True
    else:
        # Try simpler pattern
        old_buf2 = "engine.pads?.[engine.chopIdx]?.buffer"
        if old_buf2 in cv_code:
            cv_code = cv_code.replace(old_buf2, "engine.hwBuffer ?? engine.pads?.[engine.chopIdx]?.buffer", 1)
            print('✓ ChopView hwBuffer support added (alt pattern)')
            cv_changed = True
        else:
            print('✗ ChopView buffer pattern not found')

# Apply previewDsp to slice preview
if 'previewDsp' not in cv_code:
    # Find where src.buffer is set in playSlice and apply DSP
    old_play = "src.buffer = sliceBuffer;"
    new_play = "src.buffer = (engine.previewDsp && ctx) ? engine.previewDsp(ctx, sliceBuffer) : sliceBuffer;"
    if old_play in cv_code:
        cv_code = cv_code.replace(old_play, new_play)
        print('✓ ChopView previewDsp applied to preview')
        cv_changed = True
    else:
        print('✗ ChopView src.buffer pattern not found — check manually')

if cv_changed:
    with open(cv, 'w') as f: f.write(cv_code)

# ── Patch SynthCreator + DrumDesigner for onBounceToChop ─────────────────────
for gen_file, export_btn, old_btn in [
    ('SynthCreator.js',  'onBounceToChop',
     "toast('✓ WAV exported');"),
    ('DrumDesigner.js',  'onBounceToChop',
     "toast('✓ WAV exported');"),
]:
    path = f'{COMP}/{gen_file}'
    if not os.path.exists(path):
        print(f'✗ {gen_file} not found'); continue
    with open(path) as f: gc = f.read()
    if 'onBounceToChop' not in gc:
        # After successful render, call onBounceToChop with the rendered buffer
        old = "toast('✓ WAV exported');"
        new = "toast('✓ WAV exported');\n      if (onBounceToChop) onBounceToChop(rendered);"
        if old in gc:
            gc = gc.replace(old, new, 1)
            with open(path, 'w') as f: f.write(gc)
            print(f'✓ onBounceToChop wired in {gen_file}')
            changed = True
        else:
            print(f'✗ toast anchor not found in {gen_file}')
    else:
        print(f'- {gen_file} already has onBounceToChop')

# ── Pass onBounceToChop to SynthCreator + DrumDesigner in SamplerBeatMaker ───
for tab_id, comp_name in [('synth', 'SynthCreator'), ('drumdesign', 'DrumDesigner'), ('instrument', 'InstrumentBuilder')]:
    anchor = f"activeTab === '{tab_id}'"
    if anchor in code:
        idx = code.find(anchor)
        block_end = code.find(')}', idx + 100)
        block = code[idx:block_end+2]
        if 'onBounceToChop' not in block:
            # Find closing /> or last prop
            close = block.rfind('/>')
            if close > 0:
                new_block = block[:close] + f'\n              onBounceToChop={{(buf) => onChopRequest(buf, updatePad, setPads, null)}}\n            />' + block[close+2:]
                code = code[:idx] + new_block + code[block_end+2:]
                print(f'✓ onBounceToChop wired to {tab_id}')
                changed = True
        else:
            print(f'- {tab_id} already has onBounceToChop')

# ── Save SamplerBeatMaker ─────────────────────────────────────────────────────
if changed:
    with open(sbm, 'w') as f: f.write(code)
    print('✓ SamplerBeatMaker.js saved')
else:
    print('- No SamplerBeatMaker changes needed')

print('\nRun: npm run build && git add -A && git commit -m "feat: chop in all 8 samplers + generators + DSP preview" && git push')
