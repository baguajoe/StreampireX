#!/usr/bin/env python3
"""
patch_cubase_sends_wire.py
──────────────────────────
Fixes visible issues from patch_cubase_final.py:
  1. Divider line invisible → brighter color
  2. Empty space below sends → .ch-upper auto-height with max
  3. Empty send slots do nothing → wire click to bus picker

Changes:
  A) CSS: .ch-upper height:auto / max-height:260px (scrolls only when full)
  B) CSS: divider color brighter (#4a6b8a from #2a3d5a)
  C) JSX: empty send slots get onClick handler that opens bus picker
  D) JSX: bus picker renders via new state `sendPickerState`
  E) State declaration: adds `const [sendPickerState, setSendPickerState] = useState(null);`
"""
import sys
import shutil
from pathlib import Path

JS_PATH = Path("src/front/js/pages/RecordingStudio.js")
CSS_PATH = Path("src/front/styles/RecordingStudio.css")

for p in (JS_PATH, CSS_PATH):
    if not p.exists():
        print(f"ERROR: {p} not found")
        sys.exit(1)

js_text = JS_PATH.read_text()
css_text = CSS_PATH.read_text()

js_backup = JS_PATH.with_suffix(JS_PATH.suffix + ".bak_sendswire")
css_backup = CSS_PATH.with_suffix(CSS_PATH.suffix + ".bak_sendswire")
shutil.copy(JS_PATH, js_backup)
shutil.copy(CSS_PATH, css_backup)
print(f"✓ Backups created\n")

# Pre-flight: ensure prior patch was applied
if 'className="ch-upper"' not in js_text:
    print("✗ ch-upper not in JSX. Run previous patches first.")
    sys.exit(1)
if '.ch-upper' not in css_text:
    print("✗ .ch-upper not in CSS. Run patch_cubase_final.py first.")
    sys.exit(1)
if 'sendPickerState' in js_text:
    print("✗ Already wired. Aborting.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════
# CSS FIXES
# ═════════════════════════════════════════════════════════════

# A + B: update .ch-upper rule
old_chupper = """.ch-upper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 260px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0a0f18;
  border-bottom: 1px solid #2a3d5a;  /* THE Cubase divider */
}"""

new_chupper = """.ch-upper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  max-height: 260px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0a0f18;
  border-bottom: 1px solid #4a6b8a;  /* Cubase divider — brighter so it's visible */
}"""

if old_chupper not in css_text:
    print("✗ .ch-upper rule from final patch not found")
    sys.exit(1)
css_text = css_text.replace(old_chupper, new_chupper)
print("✓ CSS: .ch-upper — auto height, brighter divider")

# Also: grid row for ch-upper should be auto, not 260px, or the row forces empty space
old_grid = """  grid-template-rows:
    auto      /* colorbar */
    auto      /* header */
    auto      /* routing */
    260px     /* ch-upper — scrolls */
    auto      /* ch-mid — fixed */
    auto      /* ch-lower — fixed, always visible */
  ;"""

new_grid = """  grid-template-rows:
    auto      /* colorbar */
    auto      /* header */
    auto      /* routing */
    auto      /* ch-upper — auto-sizes up to max 260px */
    auto      /* ch-mid — fixed */
    auto      /* ch-lower — fixed, always visible */
  ;"""

if old_grid not in css_text:
    print("⚠ Grid row template not found — non-fatal")
else:
    css_text = css_text.replace(old_grid, new_grid)
    print("✓ CSS: .daw-channel grid row for upper = auto")

# Wire send slot click state visual
append_css = """

/* Clickable empty send slots */
.daw-ch-send-slot.empty {
  cursor: pointer;
  transition: border-color .12s, background .12s;
}
.daw-ch-send-slot.empty:hover {
  border-color: var(--rs-teal);
  background: rgba(0,255,200,.05);
}

/* Send picker popup */
.daw-send-picker {
  position: fixed;
  z-index: 9999;
  background: var(--rs-bg2);
  border: 1px solid var(--rs-border);
  border-radius: 6px;
  box-shadow: 0 12px 32px rgba(0,0,0,.7);
  min-width: 180px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 0;
}
.daw-send-picker-title {
  color: var(--rs-text3);
  font-size: 9px;
  letter-spacing: 1.5px;
  padding: 8px 12px 4px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--rs-border2);
}
.daw-send-picker-item {
  cursor: pointer;
  font-size: 11px;
  padding: 6px 14px;
  color: var(--rs-text2);
  display: flex;
  align-items: center;
  gap: 8px;
}
.daw-send-picker-item:hover {
  background: var(--rs-surface);
  color: var(--rs-text);
}
.daw-send-picker-bus-color {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.daw-send-picker-empty {
  color: var(--rs-text3);
  font-size: 10px;
  padding: 10px 14px;
  text-align: center;
  font-style: italic;
}
"""
css_text += append_css
print("✓ CSS: send picker + hover styles appended")

CSS_PATH.write_text(css_text)
print(f"✓ CSS written\n")

# ═════════════════════════════════════════════════════════════
# JSX CHANGES
# ═════════════════════════════════════════════════════════════

# 1. Add state declaration near other useState calls
# Find the existing insertPickerState declaration and add sendPicker right after
old_state = '  const [insertPickerState, setInsertPickerState] = useState(null);'
new_state = '''  const [insertPickerState, setInsertPickerState] = useState(null);
  const [sendPickerState, setSendPickerState] = useState(null);'''

if old_state not in js_text:
    print("✗ insertPickerState declaration not found")
    sys.exit(1)
js_text = js_text.replace(old_state, new_state, 1)
print("✓ JSX: sendPickerState state added")

# 2. Wire empty send slots in block 1 to open picker
old_b1_empty = """                          {tracks.filter(b=>b.trackType==="bus").length === 0 && (
                            <>
                              <div className="daw-ch-send-slot empty"></div>
                              <div className="daw-ch-send-slot empty"></div>
                            </>
                          )}"""

new_b1_empty = """                          {(() => {
                            const usedBusIds = (t.sends||[]).map(s=>s.busId);
                            const availableBuses = tracks.filter(b=>b.trackType==="bus" && !usedBusIds.includes(b.id));
                            const emptyCount = Math.max(0, 2 - (t.sends||[]).length);
                            return Array.from({length: emptyCount}).map((_,si)=>(
                              <div key={"sendempty"+si} className="daw-ch-send-slot empty" title="Click to route to a bus"
                                onClick={e=>{e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setSendPickerState({trackIndex:i,x:rect.right+4,y:rect.top});}}></div>
                            ));
                          })()}"""

if old_b1_empty not in js_text:
    print("✗ Block 1 empty send slots (from prior patch) not found")
    sys.exit(1)
js_text = js_text.replace(old_b1_empty, new_b1_empty, 1)
print("✓ JSX: Block 1 send slots wired to picker")

# 3. Wire empty send slots in block 2 (master) — they don't route to sends, just show as static
#    Master doesn't send to buses, so leave them decorative but not broken
# Actually master CAN have sends (to hardware outs etc). But for simplicity, make them static.
# Skip wiring block 2 — they're visual only.

# 4. Render the send picker popup near the existing insert picker
# Find where insert picker renders and add send picker right after
old_picker_render = """        {/* INSERT PICKER */}
        {insertPickerState && ("""

new_picker_render = """        {/* SEND PICKER */}
        {sendPickerState && (() => {
          const t = tracks[sendPickerState.trackIndex];
          if (!t) return null;
          const usedBusIds = (t.sends||[]).map(s=>s.busId);
          const availableBuses = tracks.filter(b=>b.trackType==="bus" && !usedBusIds.includes(b.id));
          return (
            <div className="daw-send-picker" style={{left:Math.min(sendPickerState.x,window.innerWidth-200),top:Math.min(sendPickerState.y,window.innerHeight-320)}} onClick={e=>e.stopPropagation()}>
              <div className="daw-send-picker-title">Route Send To</div>
              {availableBuses.length === 0 ? (
                <div className="daw-send-picker-empty">No group tracks available.<br/>Right-click a channel →<br/>"Add Group Track"</div>
              ) : (
                availableBuses.map(bus => (
                  <div key={bus.id} className="daw-send-picker-item" onClick={()=>{
                    const newSends=[...(t.sends||[]),{busId:bus.id,level:1.0}];
                    updateTrack(sendPickerState.trackIndex,{sends:newSends});
                    setSendPickerState(null);
                    setStatus(`Send → ${bus.name}`);
                  }}>
                    <div className="daw-send-picker-bus-color" style={{background:bus.color||"#3b82f6"}}/>
                    <span>{bus.name}</span>
                  </div>
                ))
              )}
              <div className="rs-divider"/>
              <div className="rs-remove-item" onClick={()=>setSendPickerState(null)}>Cancel</div>
            </div>
          );
        })()}

        {/* INSERT PICKER */}
        {insertPickerState && ("""

if old_picker_render not in js_text:
    print("✗ Insert picker render anchor not found")
    sys.exit(1)
js_text = js_text.replace(old_picker_render, new_picker_render, 1)
print("✓ JSX: send picker popup rendered before insert picker")

# Dismiss send picker on outside click — already handled by React re-render + click outside pattern
# Close picker when clicking outside via window listener — add useEffect
# Simpler: add onClick to send picker's backdrop? No, it's a fixed popup, not overlay.
# Use the same pattern as context menu dismissal. For now, user clicks Cancel or picks an option.

JS_PATH.write_text(js_text)
print(f"✓ JSX written: {JS_PATH}")

print(f"\nNext:")
print(f"  npm run build 2>&1 | tail -3")
print(f"\nRevert:")
print(f"  cp {js_backup} {JS_PATH}")
print(f"  cp {css_backup} {CSS_PATH}")
