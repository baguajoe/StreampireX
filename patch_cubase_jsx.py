#!/usr/bin/env python3
"""
patch_cubase_jsx.py
───────────────────
Line-range surgical restructure of all 4 mixer channel blocks into Cubase sections.

Verified line map from grep (before any patch):
  Block 1 (split-track):    inserts=2731, controls=2745, pan=2751, sends=2754, fader=2771, automation=2784, name=2788
  Block 2 (split-master):   inserts=2806, controls=2812, pan=2817, sends=2820, fader=2823, automation=2836, name=2840
  Block 3 (console-track):  inserts=2898, controls=2914, pan=2920,              fader=2923, automation=2951, name=2955
  Block 4 (console-master): inserts=2973, controls=2980, pan=2986,              fader=2989, automation=3003, name=3007

Strategy for each block:
  1. Find the opening <div className="daw-ch-inserts"> line
  2. Insert <div className="ch-upper"> BEFORE it
  3. For blocks with sends: move the sends block from below pan/above fader to after inserts closing </div>
  4. Close </div> for ch-upper after inserts (or after sends if moved)
  5. Insert <div className="ch-mid"> before controls
  6. Close </div> for ch-mid after pan closing (before fader-area)
  7. Insert <div className="ch-lower"> before fader-area
  8. Close </div> for ch-lower after name closing

Since line numbers shift as we edit, we work BOTTOM-UP (block 4 first, then 3, 2, 1)
so earlier blocks' line numbers stay valid.

Within a block, we also work bottom-up: lower wrapper first, then mid, then upper.
"""
import sys
import shutil
import re
from pathlib import Path

PATH = Path("src/front/js/pages/RecordingStudio.js")
if not PATH.exists():
    print(f"ERROR: {PATH} not found")
    sys.exit(1)

text = PATH.read_text()
backup = PATH.with_suffix(PATH.suffix + ".bak_cubase_jsx")
shutil.copy(PATH, backup)
print(f"✓ Backup: {backup}")

# Pre-flight
if 'className="ch-upper"' in text:
    print("✗ Already wrapped. Revert first.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════
# Approach: Regex-based replacement of entire channel blocks.
# For each block, match the full block with re.DOTALL and replace
# with the restructured version.
# ═════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────
# BLOCK 3 (console-track) — no sends — do this FIRST since blocks 3&4 are in console view
# Structure: inserts, controls, pan, fader-area, automation, name
# ─────────────────────────────────────────────────────────────
# Unique identifier for block 3: it's in the viewMode === "console" block, has MicModelSelector

# Pattern: from <div className="daw-ch-inserts"> to </div> closing .daw-ch-name
# Block 3 inserts opens around line 2898 with 20-space indent

# Use unique full-line anchor: `<MicModelSelector trackIndex={i}` appears ONLY in block 3's routing
# So we search from that point forward to find the block structure.

# Actually simpler: for each block, find unique marker then replace a precise chunk.

# ═════════════════════════════════════════════════════════════
# BLOCK 4 — console-master (innermost/last block) — DO FIRST (bottom up)
# ═════════════════════════════════════════════════════════════
print("\n━━━ BLOCK 4: console-master ━━━")

# Block 4 unique anchors:
# - Opens with: master-channel" + (selectedTrack === -1 ? " selected" : "")} onClick={() => { console.log
# - Has MASTER label at end
# - Has stray <div className="daw-ch-pan" style={{padding:"4px 0"}}> at line 2977

block4_pattern = re.compile(
    r'(              <div className=\{"daw-channel master-channel" \+ \(selectedTrack === -1 \? " selected" : ""\)\} onClick=\{\(\) => \{ console\.log\("Master clicked! Current selectedTrack:", selectedTrack\); setSelectedTrack\(-1\); \}\}>\n)'
    r'(.*?)'  # middle content
    r'(              </div>\n            </div>\n          </div>\n        \)\})',  # closing
    re.DOTALL
)

b4_matches = list(block4_pattern.finditer(text))
print(f"  Block 4 matches found: {len(b4_matches)}")

if len(b4_matches) != 1:
    # Try second master-channel occurrence (first is in splitScreen block)
    print(f"  Found {len(b4_matches)} master-channel blocks — need to identify which is console view")
    # The console view block 4 is the LAST master-channel in the file
    # Split view's master-channel is block 2

# Fallback — let's use line-based approach instead. More reliable.
print("\n  → Switching to line-range approach for reliability\n")

# ═════════════════════════════════════════════════════════════
# LINE-RANGE APPROACH
# Re-read fresh, work by line numbers, bottom-up
# ═════════════════════════════════════════════════════════════

lines = text.split('\n')
# line numbers in file are 1-indexed, list is 0-indexed
# Add offset tracking for edits (since inserts shift line numbers)

def find_line_starting(needle, start_line=0, end_line=None):
    """Find 0-indexed line where needle appears. start_line/end_line are 0-indexed."""
    if end_line is None:
        end_line = len(lines)
    for i in range(start_line, end_line):
        if needle in lines[i]:
            return i
    return -1

# Verify known line positions (1-indexed → subtract 1 for list index)
# Block 4 inserts at line 2973 (1-indexed) = index 2972
idx_b4_inserts_open = find_line_starting('<div className="daw-ch-inserts">', 2960, 2980)
print(f"  Block 4 inserts opens at line index {idx_b4_inserts_open} (line {idx_b4_inserts_open+1})")

if idx_b4_inserts_open != 2972:  # 2973 - 1
    print(f"  ⚠ Expected line 2973 (index 2972), got {idx_b4_inserts_open+1}")
    # Don't fail — line numbers may have drifted slightly, proceed with found value

# This approach is getting complex. Let me take a completely different tack:
# Extract each channel block to a temp file, show user what will change,
# and let them apply the wrappers by editing the extracted block text.

print("\n━━━ SWITCHING STRATEGY ━━━")
print("Line-range approach also fragile due to tight indentation requirements.")
print("Generating explicit find-and-replace blocks with long unique anchors instead.\n")

# ═════════════════════════════════════════════════════════════
# FINAL APPROACH: Long unique multi-line anchors
# Each block has a unique opening line for its parent .daw-channel, and a
# unique closing context. Use 3+ lines of context for uniqueness.
# ═════════════════════════════════════════════════════════════

changes_applied = 0

# ─── BLOCK 1 (split-track, 22-space indent inside splitScreen>daw-console-scroll>map) ───
# Unique: "daw-channel"+(i===selectedTrack?" selected":"")+(t.armed?" armed":"") inside splitScreen block
# The splitScreen version has specific indent (22 spaces for .daw-channel opening div)
# The viewMode==="console" version has 18-space indent

# Actually looking at the grep:
# Line 2719 (block 1): 22-space indent
# Line 2888 (block 3): 18-space indent
# So indent differs. Can use indent to disambiguate.

# Block 1 wrappers — work BOTTOM-UP within the block:

# B1: close ch-lower after name closing, close ch-mid after pan, open ch-lower before fader
# B1: close ch-upper after inserts closing, move sends, open ch-upper before inserts

# SENDS for block 1 — exact multi-line block (12-space indent items inside)
b1_sends = """                        <div className="daw-ch-sends">
                          <div className="daw-ch-sends-label">SENDS</div>
                          {tracks.filter(b=>b.trackType==="bus").map(bus=>(
                            <div key={bus.id} className="daw-ch-send-row">
                              <span className="daw-ch-send-name">{bus.name}</span>
                              <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                                <input type="range" className="daw-ch-send-level" min={0} max={1} step={0.01}
                                  defaultValue={(t.sends||[]).find(s=>s.busId===bus.id)?.level||0}
                                  onClick={e=>e.stopPropagation()}
                                  onChange={e=>{const v=parseFloat(e.target.value);const newSends=[...(t.sends||[]).filter(s=>s.busId!==bus.id),{busId:bus.id,level:v}];updateTrack(i,{sends:newSends});}}/>
                                <span style={{color:"#4e6a82",fontSize:8,minWidth:24,textAlign:"right"}}>
                                  {Math.round(((t.sends||[]).find(s=>s.busId===bus.id)?.level||0)*100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>"""

if b1_sends not in text:
    print("✗ Block 1 sends exact match failed")
    sys.exit(1)

# Step B1.1: Remove sends from mid-area
text = text.replace(b1_sends, "__B1_SENDS_REMOVED__", 1)
print("  B1 step 1: sends marked for removal")

# Step B1.2: Find pan closing + sends placeholder + fader area
# Current state after removal:
#   ...pan closing </div>
#   __B1_SENDS_REMOVED__
#   <div className="daw-ch-fader-area">
b1_midseam = """                        </div>
__B1_SENDS_REMOVED__
                        <div className="daw-ch-fader-area">"""

if b1_midseam not in text:
    print("✗ Block 1 mid-seam not found after removal")
    sys.exit(1)

# Replace mid-seam: close ch-mid, open ch-lower
b1_midseam_new = """                        </div>
                        </div>
                        <div className="ch-lower">
                        <div className="daw-ch-fader-area">"""

text = text.replace(b1_midseam, b1_midseam_new, 1)
print("  B1 step 2: ch-mid close + ch-lower open inserted")

# Step B1.3: find block 1 controls opening, insert ch-mid open before it, close ch-upper + insert sends before it
b1_controls_open = """                        <div className="daw-ch-controls">"""
# This appears in blocks 1&2 — need to distinguish. Block 1 precedes specific pan block.
# Unique block-1 preceding context: inserts closing specific to block 1 (has setInsertPickerState trackIndex i)

b1_inserts_close_to_controls = """                          ))}
                        </div>
                        <div className="daw-ch-controls">"""

# This pattern appears in BOTH block 1 and block 2 (split-master also has controls after inserts)
# Use preceding inserts-specific content as disambiguator.

# Block 1 ends inserts with empty-slot callback `setInsertPickerState({ trackIndex: i,`
# Block 2 ends inserts with empty-slot callback `setInsertPickerState({ trackIndex: -1,`
b1_specific_inserts_end = """                          {Array.from({length: Math.max(0, 6 - ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled).length)}).map((_, si) => (
                            <div key={"empty"+si} className="daw-ch-insert-slot empty"
                              onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                            </div>
                          ))}
                        </div>
                        <div className="daw-ch-controls">"""

if b1_specific_inserts_end not in text:
    print("✗ Block 1 inserts→controls transition not found")
    sys.exit(1)

# Replace: close inserts, append sends, close ch-upper, open ch-mid, open controls
b1_inserts_to_controls_new = """                          {Array.from({length: Math.max(0, 6 - ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled).length)}).map((_, si) => (
                            <div key={"empty"+si} className="daw-ch-insert-slot empty"
                              onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                            </div>
                          ))}
                        </div>
""" + b1_sends + """
                        </div>
                        <div className="ch-mid">
                        <div className="daw-ch-controls">"""

text = text.replace(b1_specific_inserts_end, b1_inserts_to_controls_new, 1)
print("  B1 step 3: sends moved after inserts, ch-upper closed, ch-mid opened")

# Step B1.4: Open ch-upper before block 1 inserts opening
b1_inserts_opening = """                        <div className="daw-ch-inserts">
                          <div className="daw-ch-inserts-label">INSERTS</div>"""

# This appears in all 4 blocks. Disambiguate by succeeding line:
# Block 1's next line is unique: `{ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled).map(fx => (`
# Actually blocks 1 and 2 both have similar. Block 1 uses `t.effects`, block 2 uses effects differently? No, same.
# 
# CRITICAL: blocks 1 and 2 are DIFFERENT occurrences. Block 1 = track (uses `t` and `i`), Block 2 = master (no t, fixed strings).
# Block 2's inserts: `{Array.from({length:6}).map((_,si)=>(` with single space formatting (line 2806)
# Block 1's inserts: `{ALL_FX_EXTENDED.filter(fx =>` map then empty slots

# Use block 1's inserts opening PLUS first content line (which calls ALL_FX_EXTENDED)
b1_inserts_opening_full = """                        <div className="daw-ch-inserts">
                          <div className="daw-ch-inserts-label">INSERTS</div>
                          {ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled).map(fx => ("""

if b1_inserts_opening_full not in text:
    print("✗ Block 1 inserts opening unique anchor not found")
    sys.exit(1)

b1_inserts_opening_new = """                        <div className="ch-upper">
                        <div className="daw-ch-inserts">
                          <div className="daw-ch-inserts-label">INSERTS</div>
                          {ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled).map(fx => ("""

text = text.replace(b1_inserts_opening_full, b1_inserts_opening_new, 1)
print("  B1 step 4: ch-upper opened before inserts")

# Step B1.5: Close ch-lower after name block
# Block 1 name closes at: <div className="daw-ch-name daw-ch-name-bottom"> ... </div> followed by </div> (closing .daw-channel)
b1_name_close = """                        <div className="daw-ch-name daw-ch-name-bottom">
                          <input className="daw-ch-name-input" value={t.name || `Track ${i+1}`} onChange={e => updateTrack(i, {name: e.target.value})} onClick={e => e.stopPropagation()} style={{color: t.color || "#cdd9e5"}}/>
                        </div>
                      </div>"""

if b1_name_close not in text:
    print("✗ Block 1 name closing anchor not found")
    sys.exit(1)

b1_name_close_new = """                        <div className="daw-ch-name daw-ch-name-bottom">
                          <input className="daw-ch-name-input" value={t.name || `Track ${i+1}`} onChange={e => updateTrack(i, {name: e.target.value})} onClick={e => e.stopPropagation()} style={{color: t.color || "#cdd9e5"}}/>
                        </div>
                        </div>
                      </div>"""

text = text.replace(b1_name_close, b1_name_close_new, 1)
print("  B1 step 5: ch-lower closed after name")
changes_applied += 1
print("  ✓ BLOCK 1 COMPLETE\n")

# ═════════════════════════════════════════════════════════════
# BLOCK 2 — split-master (no `t`, uses fixed master state)
# ═════════════════════════════════════════════════════════════
print("━━━ BLOCK 2: split-master ━━━")

# Block 2 sends — for master channel. Looking at grep line 2820
# Need to read block 2's structure. Its sends section at line 2820 is simpler:
#   <div className="daw-ch-sends">
#     <div className="daw-ch-sends-label">SENDS</div>
#   </div>
# Just a label, no iteration over buses.

b2_sends = """                    <div className="daw-ch-sends">
                      <div className="daw-ch-sends-label">SENDS</div>
                    </div>"""

if b2_sends not in text:
    print("✗ Block 2 sends anchor not found")
    sys.exit(1)

# Step B2.1: Remove block 2 sends from mid
text = text.replace(b2_sends, "__B2_SENDS_REMOVED__", 1)
print("  B2 step 1: sends marked for removal")

# Block 2 mid-seam after removal
b2_midseam = """                    </div>
__B2_SENDS_REMOVED__
                    <div className="daw-ch-fader-area">"""

if b2_midseam not in text:
    print("✗ Block 2 mid-seam not found")
    sys.exit(1)

b2_midseam_new = """                    </div>
                    </div>
                    <div className="ch-lower">
                    <div className="daw-ch-fader-area">"""

text = text.replace(b2_midseam, b2_midseam_new, 1)
print("  B2 step 2: ch-mid close + ch-lower open")

# Block 2 inserts→controls transition — uses trackIndex:-1 (master)
b2_specific_inserts_end = """                      {Array.from({length:6}).map((_,si)=>(
                        <div key={"ms"+si} className="daw-ch-insert-slot empty" onClick={e=>{e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setInsertPickerState({trackIndex:-1,x:rect.right+4,y:rect.top});}}></div>
                      ))}
                    </div>
                    <div className="daw-ch-controls">"""

if b2_specific_inserts_end not in text:
    print("✗ Block 2 inserts→controls anchor not found")
    sys.exit(1)

b2_inserts_to_controls_new = """                      {Array.from({length:6}).map((_,si)=>(
                        <div key={"ms"+si} className="daw-ch-insert-slot empty" onClick={e=>{e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setInsertPickerState({trackIndex:-1,x:rect.right+4,y:rect.top});}}></div>
                      ))}
                    </div>
""" + b2_sends + """
                    </div>
                    <div className="ch-mid">
                    <div className="daw-ch-controls">"""

text = text.replace(b2_specific_inserts_end, b2_inserts_to_controls_new, 1)
print("  B2 step 3: sends moved, ch-upper closed, ch-mid opened")

# Block 2 inserts opening with unique context
b2_inserts_opening_full = """                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {Array.from({length:6}).map((_,si)=>("""

if b2_inserts_opening_full not in text:
    print("✗ Block 2 inserts opening anchor not found")
    sys.exit(1)

b2_inserts_opening_new = """                    <div className="ch-upper">
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {Array.from({length:6}).map((_,si)=>("""

text = text.replace(b2_inserts_opening_full, b2_inserts_opening_new, 1)
print("  B2 step 4: ch-upper opened")

# Block 2 name closing — master-channel name section, split view version
b2_name_close = """                    <div className="daw-ch-name daw-ch-name-bottom">
                      <span className="daw-ch-track-label rs-orange">MASTER</span>
                    </div>
                  </div>"""

if b2_name_close not in text:
    print("✗ Block 2 name closing anchor not found")
    sys.exit(1)

b2_name_close_new = """                    <div className="daw-ch-name daw-ch-name-bottom">
                      <span className="daw-ch-track-label rs-orange">MASTER</span>
                    </div>
                    </div>
                  </div>"""

text = text.replace(b2_name_close, b2_name_close_new, 1)
print("  B2 step 5: ch-lower closed")
changes_applied += 1
print("  ✓ BLOCK 2 COMPLETE\n")

# ═════════════════════════════════════════════════════════════
# BLOCK 3 — console-track (NO sends)
# ═════════════════════════════════════════════════════════════
print("━━━ BLOCK 3: console-track ━━━")

# Block 3 has NO sends. Just wrap inserts alone in ch-upper, controls+pan in ch-mid, rest in ch-lower.

# Block 3 inserts→controls transition — inside viewMode==="console", has MicModelSelector above
# Unique: loaded.length < 8 pattern + `+ Insert` text
b3_inserts_end = """                      {loaded.length < 8 && (
                        <div className="daw-ch-insert-slot empty"
                          onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                          + Insert
                        </div>
                      )}
                    </div>
                    <div className="daw-ch-controls">"""

if b3_inserts_end not in text:
    print("✗ Block 3 inserts→controls anchor not found")
    sys.exit(1)

b3_inserts_end_new = """                      {loaded.length < 8 && (
                        <div className="daw-ch-insert-slot empty"
                          onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                          + Insert
                        </div>
                      )}
                    </div>
                    </div>
                    <div className="ch-mid">
                    <div className="daw-ch-controls">"""

text = text.replace(b3_inserts_end, b3_inserts_end_new, 1)
print("  B3 step 1: ch-upper closed, ch-mid opened")

# Block 3 pan → fader transition (ends ch-mid, opens ch-lower)
# Block 3 pan uses PanKnob, block 1 also has PanKnob. Use surrounding fader-area context.
# The specific sequence in block 3: pan </div> then <div className="daw-ch-fader-area">
# But block 1 also has that pattern. However block 1 already has sends between them (wait no, we moved sends up).
# After block 1 is patched, block 1 has ch-mid close + ch-lower open between pan and fader.
# Block 3 still has the raw `</div>\n                    <div className="daw-ch-fader-area">` in 18-space indent.

# Block 3 has 18-space indent. Block 1 had 22-space indent. So `                    <div className="daw-ch-fader-area">` (18 sp) is block 3 specific.

b3_pan_to_fader = """                    <div className="daw-ch-pan">
                      <PanKnob value={t.pan} onChange={v => updateTrack(i, { pan: v })} size={32}/>
                    </div>
                    <div className="daw-ch-fader-area">"""

if b3_pan_to_fader not in text:
    print("✗ Block 3 pan→fader anchor not found")
    sys.exit(1)

b3_pan_to_fader_new = """                    <div className="daw-ch-pan">
                      <PanKnob value={t.pan} onChange={v => updateTrack(i, { pan: v })} size={32}/>
                    </div>
                    </div>
                    <div className="ch-lower">
                    <div className="daw-ch-fader-area">"""

text = text.replace(b3_pan_to_fader, b3_pan_to_fader_new, 1)
print("  B3 step 2: ch-mid closed, ch-lower opened")

# Block 3 inserts opening — has loaded.map, unique to block 3
b3_inserts_opening = """                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {loaded.map(fx => ("""

if b3_inserts_opening not in text:
    print("✗ Block 3 inserts opening not found")
    sys.exit(1)

b3_inserts_opening_new = """                    <div className="ch-upper">
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {loaded.map(fx => ("""

text = text.replace(b3_inserts_opening, b3_inserts_opening_new, 1)
print("  B3 step 3: ch-upper opened")

# Block 3 name closing — console-track has console-select dropdown inside name
b3_name_close = """                    <div className="daw-ch-name">
                      <input className="daw-ch-name-input" value={t.name} onChange={e => updateTrack(i, { name: e.target.value })} onClick={e => e.stopPropagation()}/>
                      <select className="daw-ch-console-select" value={trackConsoleChar[t.id] || "none"} onChange={e => setTrackConsoleChar(prev => ({ ...prev, [t.id]: e.target.value }))} onClick={e => e.stopPropagation()}>
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>"""

if b3_name_close not in text:
    print("✗ Block 3 name closing anchor not found")
    sys.exit(1)

b3_name_close_new = """                    <div className="daw-ch-name">
                      <input className="daw-ch-name-input" value={t.name} onChange={e => updateTrack(i, { name: e.target.value })} onClick={e => e.stopPropagation()}/>
                      <select className="daw-ch-console-select" value={trackConsoleChar[t.id] || "none"} onChange={e => setTrackConsoleChar(prev => ({ ...prev, [t.id]: e.target.value }))} onClick={e => e.stopPropagation()}>
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                      </select>
                    </div>
                    </div>
                  </div>"""

text = text.replace(b3_name_close, b3_name_close_new, 1)
print("  B3 step 4: ch-lower closed")
changes_applied += 1
print("  ✓ BLOCK 3 COMPLETE\n")

# ═════════════════════════════════════════════════════════════
# BLOCK 4 — console-master (NO sends)
# ═════════════════════════════════════════════════════════════
print("━━━ BLOCK 4: console-master ━━━")

# Block 4 inserts opening — console-master, unique inserts content
# Has `+ Insert` link and uses trackIndex:-1
b4_inserts_opening = """                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">INSERTS</div>
                  <div className="daw-ch-insert-slot empty" onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: -1, x: rect.right + 4, y: rect.top }); }}>+ Insert</div>
                </div>"""

if b4_inserts_opening not in text:
    print("✗ Block 4 inserts opening anchor not found")
    sys.exit(1)

# Block 4 has a stray duplicate pan div after inserts (line 2977 from grep)
# Looking at file content: after inserts there's a pan, then controls, then pan (duplicate!), then fader
# We need to handle this carefully.

# Let me match a larger chunk of block 4 to understand
# The original (line 2973-2990 range) has inserts → first-pan → controls → second-pan → fader
# This is actually a bug in the existing code but we preserve it.

# Let's just wrap around existing structure:
# OPEN ch-upper before inserts, CLOSE ch-upper after inserts
# OPEN ch-mid before the FIRST pan, CLOSE ch-mid... where?
# Problem: with duplicate pan, structure is weird.

# Looking at grep again:
# 2973: <div className="daw-ch-inserts">
# 2977:                 <div className="daw-ch-pan" style={{padding:"4px 0"}}>  ← STRAY
# 2980:                <div className="daw-ch-controls">
# 2986:                <div className="daw-ch-pan">   ← REAL
# 2989:                <div className="daw-ch-fader-area">

# So for block 4, ch-mid should contain: stray-pan, controls, real-pan (?)
# Or we just ignore the stray and put controls+real-pan in ch-mid
# 
# Simplest: treat the boundary as inserts-close → everything until fader-area as ch-mid

# Step B4.1: after inserts close </div>, insert ch-upper close + ch-mid open
b4_inserts_to_stray_pan = """                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">INSERTS</div>
                  <div className="daw-ch-insert-slot empty" onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: -1, x: rect.right + 4, y: rect.top }); }}>+ Insert</div>
                </div>
                                <div className="daw-ch-pan" style={{padding:"4px 0"}}>"""

if b4_inserts_to_stray_pan not in text:
    print("✗ Block 4 inserts→stray-pan anchor not found")
    sys.exit(1)

b4_inserts_to_stray_pan_new = """                <div className="ch-upper">
                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">INSERTS</div>
                  <div className="daw-ch-insert-slot empty" onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: -1, x: rect.right + 4, y: rect.top }); }}>+ Insert</div>
                </div>
                </div>
                <div className="ch-mid">
                                <div className="daw-ch-pan" style={{padding:"4px 0"}}>"""

text = text.replace(b4_inserts_to_stray_pan, b4_inserts_to_stray_pan_new, 1)
print("  B4 step 1: ch-upper wrapped inserts, ch-mid opened before stray pan")

# Step B4.2: close ch-mid before fader, open ch-lower
# Block 4 real-pan → fader transition (different from block 3 — uses masterPan)
b4_pan_to_fader = """                <div className="daw-ch-pan">
                  <PanKnob value={masterPan} onChange={v => setMasterPan(v)} size={32}/>
                </div>
                <div className="daw-ch-fader-area">"""

if b4_pan_to_fader not in text:
    print("✗ Block 4 pan→fader anchor not found")
    sys.exit(1)

b4_pan_to_fader_new = """                <div className="daw-ch-pan">
                  <PanKnob value={masterPan} onChange={v => setMasterPan(v)} size={32}/>
                </div>
                </div>
                <div className="ch-lower">
                <div className="daw-ch-fader-area">"""

text = text.replace(b4_pan_to_fader, b4_pan_to_fader_new, 1)
print("  B4 step 2: ch-mid closed, ch-lower opened")

# Step B4.3: close ch-lower after name
b4_name_close = """                <div className="daw-ch-name">
                  <span className="rs-master-label">MASTER</span>
                  <select className="daw-ch-console-select" value={masterConsoleChar} onChange={e => setMasterConsoleChar(e.target.value)}>
                    {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                  </select>
                </div>
              </div>"""

if b4_name_close not in text:
    print("✗ Block 4 name closing anchor not found")
    sys.exit(1)

b4_name_close_new = """                <div className="daw-ch-name">
                  <span className="rs-master-label">MASTER</span>
                  <select className="daw-ch-console-select" value={masterConsoleChar} onChange={e => setMasterConsoleChar(e.target.value)}>
                    {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                  </select>
                </div>
                </div>
              </div>"""

text = text.replace(b4_name_close, b4_name_close_new, 1)
print("  B4 step 3: ch-lower closed")
changes_applied += 1
print("  ✓ BLOCK 4 COMPLETE\n")

# ═════════════════════════════════════════════════════════════
# VERIFICATION
# ═════════════════════════════════════════════════════════════
if "__B1_SENDS_REMOVED__" in text or "__B2_SENDS_REMOVED__" in text:
    print("✗ Sendsplaceholder still in file — abort")
    sys.exit(1)

final_ch_upper = text.count('className="ch-upper"')
final_ch_mid = text.count('className="ch-mid"')
final_ch_lower = text.count('className="ch-lower"')

print("━━━ VERIFICATION ━━━")
print(f"  ch-upper wrappers: {final_ch_upper} (expect 4)")
print(f"  ch-mid wrappers:   {final_ch_mid} (expect 4)")
print(f"  ch-lower wrappers: {final_ch_lower} (expect 4)")
print(f"  blocks patched:    {changes_applied} (expect 4)")

if final_ch_upper != 4 or final_ch_mid != 4 or final_ch_lower != 4:
    print("\n✗ Verification failed — not writing")
    sys.exit(1)

# Final sends count — should still be 2 (preserved, just moved)
final_sends = text.count('className="daw-ch-sends"')
if final_sends != 2:
    print(f"\n✗ Sends count changed: was 2, now {final_sends}")
    sys.exit(1)

PATH.write_text(text)
print(f"\n✓ Written: {PATH}")
print(f"  Size: {len(text)} bytes (was {len(shutil.os.path.getsize.__self__.open(backup).read()) if False else '~original'})")
print(f"\nNext:")
print(f"  npm run build 2>&1 | tail -3")
print(f"\nRevert:")
print(f"  cp {backup} {PATH}")
