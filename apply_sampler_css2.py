import shutil, os, re

ROOT   = '/workspaces/SpectraSphere'
COMP   = f'{ROOT}/src/front/js/component'
STYLES = f'{ROOT}/src/front/styles'

# ── 1. Copy all 4 CSS files ───────────────────────────────────────────────
for f in ['SPX60Tab.css', 'SPXEPSTab.css', 'SPXS950Tab.css', 'SPXS1000Tab.css']:
    src = f'{ROOT}/{f}'
    dst = f'{STYLES}/{f}'
    if os.path.exists(src):
        shutil.copy(src, dst)
        print(f'✓ {f}')
    else:
        print(f'✗ NOT FOUND in root: {f}')

# ── 2. Add keyboard strip + upper wrapper to SPXEPSTab.js ─────────────────
eps = f'{COMP}/SPXEPSTab.js'
with open(eps) as f:
    code = f.read()

# Add spxeps-upper wrapper and keyboard strip after pads-wrap opens
# The keyboard strip uses CSS ::before/::after + positioned keys
# We inject a simple piano key strip as a visual component

KEYBOARD_JSX = """
  // Piano key layout: C D E F G A B pattern for 2 octaves
  const WHITE_KEYS = 14; // 2 octaves of white keys
  const BLACK_POSITIONS = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13]; // black key indices

  const renderKeyboard = () => (
    <div className="spxeps-keyboard">
      {Array.from({ length: WHITE_KEYS }, (_, i) => (
        <div key={i} className="spxeps-key" onMouseDown={() => triggerPad(i % 16, 0.8)} />
      ))}
      {BlackPositions && BlackPositions.map((pos, i) => {
        const leftPct = (pos / WHITE_KEYS) * 100;
        return null; // handled via CSS
      })}
    </div>
  );
"""

# Wrap the existing pads section in spxeps-upper div and add keyboard below
OLD_WRAP = '      {view === \'pads\' && (\n        <div className="spxeps-pads-wrap">'
NEW_WRAP = '      {view === \'pads\' && (\n        <div className="spxeps-pads-wrap">\n          <div className="spxeps-upper">'

OLD_SETTINGS_CLOSE = '          )}\n        </div>\n      )}\n\n      {view === \'seq\''
NEW_SETTINGS_CLOSE = '''          )}
          </div>
          <div className="spxeps-keyboard">
            {Array.from({ length: 28 }, (_, i) => {
              const noteInOctave = i % 7;
              const isBlackAfter = [0, 1, 3, 4, 5].includes(noteInOctave);
              return (
                <div key={i} className="spxeps-key"
                  onMouseDown={() => triggerPad(i % 16, 0.8)} />
              );
            })}
          </div>
        </div>
      )}

      {view === 'seq\''''

if 'spxeps-upper' not in code:
    if OLD_WRAP in code:
        code = code.replace(OLD_WRAP, NEW_WRAP)
        print('✓ spxeps-upper wrapper added')
    else:
        print('- EPS upper wrap anchor not found — keyboard not added to JSX')

    if OLD_SETTINGS_CLOSE in code:
        code = code.replace(OLD_SETTINGS_CLOSE, NEW_SETTINGS_CLOSE)
        print('✓ keyboard strip added to SPXEPSTab')
    else:
        print('- EPS settings close anchor not found — skipping keyboard JSX')
else:
    print('- EPS keyboard already present')

with open(eps, 'w') as f:
    f.write(code)

# ── 3. Add spxs1000-pad-inner wrapper if missing ──────────────────────────
s1000 = f'{COMP}/SPXS1000Tab.js'
with open(s1000) as f:
    code = f.read()

if 'spxs1000-pad-inner' not in code:
    old = '''                      <span className="spxs1000-pad-num">{pi + 1}</span>
                      {pad.name ? <span className="spxs1000-pad-name">{pad.name}</span>
                                : <span className="spxs1000-pad-drop">DROP</span>}'''
    new = '''                      <div className="spxs1000-pad-inner">
                        <span className="spxs1000-pad-num">{pi + 1}</span>
                        {pad.name ? <span className="spxs1000-pad-name">{pad.name}</span>
                                  : <span className="spxs1000-pad-drop">DROP</span>}
                      </div>'''
    if old in code:
        code = code.replace(old, new)
        with open(s1000, 'w') as f:
            f.write(code)
        print('✓ spxs1000-pad-inner wrapper added')
    else:
        print('- s1000 pad inner anchor not matched (may already differ)')
else:
    print('- pad-inner already present')

print('\nRun: npm run build && git add -A && git commit -m "feat: hardware-accurate sampler CSS redesign" && git push')
