import shutil, os

CSS_SRC = '/workspaces/SpectraSphere/RecordingStudio_clean.css'
CSS_DST = '/workspaces/SpectraSphere/src/front/styles/RecordingStudio.css'
JS = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'

# Backup old CSS
shutil.copy(CSS_DST, CSS_DST + '.old_backup')
print(f'✓ backed up old CSS to RecordingStudio.css.old_backup')

# Copy clean CSS
shutil.copy(CSS_SRC, CSS_DST)
print(f'✓ new clean CSS applied ({os.path.getsize(CSS_DST)//1024}KB)')

# Now fix the tab bar in JS
with open(JS) as f: js = f.read()

# Find the start/end of tab buttons section
# We'll replace from first daw-view-tab button to closing </div> of tab container
# First find the opening of the tabs container
start_marker = '          <button\n            className={`daw-view-tab ${viewMode === "arrange"'
end_marker = '          <button className={`daw-view-tab ${viewMode === \'freesound\''

idx_start = js.find(start_marker)
idx_end = js.find(end_marker)

if idx_start < 0 or idx_end < 0:
    print(f'✗ markers not found: start={idx_start}, end={idx_end}')
    # Try to find approximate location
    print('Looking for arrange tab...')
    idx = js.find('viewMode === "arrange"')
    print(f'  arrange tab at char {idx}')
    print(repr(js[idx-50:idx+100]))
else:
    # Find the end of the freesound button
    idx_end_btn = js.find('</button>', idx_end)
    idx_end_btn += len('</button>')

    old_tabs = js[idx_start:idx_end_btn]

    new_tabs = '''          <button
            className={`daw-view-tab ${viewMode === "arrange" ? "active" : ""}`}
            onClick={() => setViewMode("arrange")}
          >⊞ Arrange</button>
          <button
            className={`daw-view-tab ${viewMode === "console" ? "active" : ""}`}
            onClick={() => setViewMode("console")}
          >🎚️ Console</button>
          <button
            className={`daw-view-tab ${viewMode === "pianoroll" ? "active" : ""}`}
            onClick={() => setViewMode("pianoroll")}
          >🎹 Piano Roll</button>
          <button
            className={`daw-view-tab ${viewMode === 'score' ? 'active' : ''}`}
            onClick={() => setViewMode('score')}
          >🎼 Score</button>
          {/* Mix dropdown */}
          {(() => {
            const mixModes = ['aimix','fx','multiband','mastering','speakersim','analog','vocal','keyfinder'];
            const mixActive = mixModes.includes(viewMode);
            const [mixOpen, setMixOpen] = window._mixOpen !== undefined ? [window._mixOpen, window._setMixOpen] : [false, ()=>{}];
            return (
              <div className="daw-mix-dropdown" style={{position:'relative'}}>
                <button
                  className={`daw-mix-dropdown-btn${mixActive ? ' active' : ''}`}
                  onClick={() => { window._mixOpen = !window._mixOpen; window._setMixOpen && window._setMixOpen(!window._mixOpen); }}
                >🎛️ Mix ▾</button>
              </div>
            );
          })()}'''

    # Actually use React state — simpler approach, just render a div with hover
    new_tabs = '''          <button
            className={`daw-view-tab ${viewMode === "arrange" ? "active" : ""}`}
            onClick={() => setViewMode("arrange")}
          >⊞ Arrange</button>
          <button
            className={`daw-view-tab ${viewMode === "console" ? "active" : ""}`}
            onClick={() => setViewMode("console")}
          >🎚️ Console</button>
          <button
            className={`daw-view-tab ${viewMode === "pianoroll" ? "active" : ""}`}
            onClick={() => setViewMode("pianoroll")}
          >🎹 Piano Roll</button>
          <button
            className={`daw-view-tab ${viewMode === 'score' ? 'active' : ''}`}
            onClick={() => setViewMode('score')}
          >🎼 Score</button>
          <MixDropdown viewMode={viewMode} setViewMode={setViewMode} />'''

    js = js[:idx_start] + new_tabs + js[idx_end_btn:]
    print(f'✓ tab bar replaced')

    # Now inject MixDropdown component before the RecordingStudio function
    mix_component = '''
// Mix dropdown tab component
function MixDropdown({ viewMode, setViewMode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const mixModes = ['aimix','fx','multiband','mastering','speakersim','analog','vocal','keyfinder'];
  const isActive = mixModes.includes(viewMode);
  const items = [
    { mode: 'aimix',      label: '🤖 AI Mix' },
    { mode: 'fx',         label: '🎛️ FX Chain' },
    { mode: 'multiband',  label: '📊 Multiband' },
    { mode: 'mastering',  label: '💿 Mastering' },
    { mode: 'speakersim', label: '🔊 Mix Translator' },
    { mode: 'analog',     label: '🎸 Analog Suite' },
    { mode: 'vocal',      label: '🎤 Vocal' },
    { mode: 'keyfinder',  label: '🎵 Key Finder' },
  ];
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const activeItem = items.find(i => i.mode === viewMode);
  return (
    <div ref={ref} className="daw-mix-dropdown">
      <button
        className={`daw-mix-dropdown-btn${isActive ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >{isActive && activeItem ? activeItem.label : '🎛️ Mix'} ▾</button>
      {open && (
        <div className="daw-mix-dropdown-menu">
          {items.map(({ mode, label }) => (
            <button
              key={mode}
              className={`daw-mix-dropdown-item${viewMode === mode ? ' active' : ''}`}
              onClick={() => { setViewMode(mode); setOpen(false); }}
            >{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

'''

    # Find insertion point — before export default or before the main function
    insert_marker = 'export default function RecordingStudio'
    if insert_marker not in js:
        insert_marker = 'function RecordingStudio'
    idx_insert = js.find(insert_marker)
    if idx_insert > 0:
        js = js[:idx_insert] + mix_component + js[idx_insert:]
        print('✓ MixDropdown component injected')
    else:
        print('✗ could not find insertion point for MixDropdown')

    with open(JS, 'w') as f: f.write(js)
    print('✓ JS saved')

print('\nRun: kill $(pgrep webpack) 2>/dev/null; sleep 2 && NODE_OPTIONS="--max-old-space-size=8192" npm run build && git add -A && git commit -m "feat: clean CSS rewrite + Mix dropdown tab" && git push')
