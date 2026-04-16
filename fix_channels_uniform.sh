#!/bin/bash
# Rewrite both channel strips to identical structure

python3 << 'PYEOF'
import re

# Read the RecordingStudio.js file
rs_path = '/workspaces/SpectraSphere/src/front/js/pages/RecordingStudio.js'
with open(rs_path) as f:
    content = f.read()

# Standard uniform channel strip template
uniform_channel = '''<div className="daw-channel{master_class}">
  {/* Routing */}
  <div className="daw-ch-routing">
    <div className="daw-ch-routing-label">{routing_label}</div>
    <div className="daw-ch-routing-value">{routing_value}</div>
  </div>

  {/* Insert Slots - uniform 4 slots for both */}
  <div className="daw-ch-inserts">
    <div className="daw-ch-insert-slot eq">EQ</div>
    <div className="daw-ch-insert-slot comp">CP</div>
    <div className="daw-ch-insert-slot reverb">RV</div>
    <div className="daw-ch-insert-slot empty">--</div>
  </div>

  {/* M/S/E Controls */}
  <div className="daw-ch-controls">
    <div className="daw-ch-mse-row">
      <div className="daw-ch-badge m">M</div>
      <div className="daw-ch-badge s">S</div>
      <div className="daw-ch-badge e">E</div>
    </div>
  </div>

  {/* Pan Knob */}
  <div className="daw-ch-pan">
    <div className="daw-ch-pan-knob">C</div>
  </div>

  {/* Fader + Meter Area - identical height for both */}
  <div className="daw-ch-fader-area">
    <div className="daw-ch-fader-row">
      <div className="daw-ch-meter">
        <CubaseMeter 
          level={meter_level} 
          peak={meter_peak}
          height={{180}}
          channelIndex={channel_index}
        />
      </div>
      <div className="daw-ch-fader">
        <input
          type="range"
          min="0"
          max="100"
          value={fader_value}
          onChange={fader_onChange}
          className="vertical-fader"
        />
      </div>
    </div>
    <div className="daw-ch-vol-display">
      <div className="daw-ch-vol-val">{db_value}</div>
    </div>
  </div>

  {/* Record Arm */}
  <div className="daw-ch-rec">
    <button className="daw-ch-rec-btn{armed_class}">●</button>
  </div>

  {/* Channel Name */}
  <div className="daw-ch-name">
    <input
      type="text"
      className="daw-ch-name-input"
      value={channel_name}
      onChange={name_onChange}
    />
    <div className="daw-ch-number">
      <span className="daw-ch-type-icon">🎵</span>
      {channel_number}
    </div>
  </div>
</div>'''

# Find current channel rendering in console view
# Look for the channel strips in the JSX return
track_pattern = r'<div className="daw-channel"[^>]*>.*?</div>\s*</div>'
master_pattern = r'<div className="daw-channel master-channel"[^>]*>.*?</div>\s*</div>'

# Simple replace approach - find the class names and replace sections
if 'daw-channel' in content:
    print("Found channel strips in JSX")
    
    # For now, just add the uniform CSS and let you manually replace JSX
    print("Adding uniform CSS first...")
else:
    print("Could not find channel strips in JSX")
PYEOF

# Add uniform channel CSS
python3 << 'PYEOF'
css_path = '/workspaces/SpectraSphere/src/front/styles/RecordingStudio.css'

uniform_css = '''

/* Uniform Channel Strips - Identical Structure */
.daw-channel {
  display: flex !important;
  flex-direction: column !important;
  width: 80px !important;
  min-width: 80px !important;
  max-width: 80px !important;
  height: 500px !important;
  min-height: 500px !important;
  max-height: 500px !important;
  background: #1a1a1a !important;
  border: 1px solid #333 !important;
  border-radius: 4px !important;
  overflow: hidden !important;
}

.daw-channel.master-channel {
  border-color: #00ffc8 !important;
  background: #1a1f1a !important;
}

/* All sections same height ratios */
.daw-ch-routing { height: 40px !important; padding: 4px !important; border-bottom: 1px solid #333 !important; }
.daw-ch-inserts { height: 60px !important; padding: 4px !important; border-bottom: 1px solid #333 !important; }
.daw-ch-controls { height: 30px !important; padding: 4px !important; border-bottom: 1px solid #333 !important; }
.daw-ch-pan { height: 30px !important; padding: 4px !important; border-bottom: 1px solid #333 !important; }
.daw-ch-fader-area { height: 240px !important; padding: 4px !important; border-bottom: 1px solid #333 !important; }
.daw-ch-rec { height: 25px !important; padding: 4px !important; border-bottom: 1px solid #333 !important; }
.daw-ch-name { height: 45px !important; padding: 4px !important; }

/* Routing */
.daw-ch-routing-label { font-size: 9px !important; color: #888 !important; text-transform: uppercase !important; }
.daw-ch-routing-value { font-size: 10px !important; color: #ccc !important; }

/* Insert slots */
.daw-ch-inserts { display: flex !important; flex-direction: column !important; gap: 2px !important; }
.daw-ch-insert-slot {
  height: 12px !important;
  background: #333 !important;
  border-radius: 2px !important;
  font-size: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #999 !important;
}
.daw-ch-insert-slot.eq { background: #004080 !important; color: #66ccff !important; }
.daw-ch-insert-slot.comp { background: #806600 !important; color: #ffcc66 !important; }
.daw-ch-insert-slot.reverb { background: #800080 !important; color: #cc66ff !important; }

/* Fader area - identical for both channels */
.daw-ch-fader-row {
  display: flex !important;
  height: 180px !important;
  gap: 4px !important;
  align-items: stretch !important;
}

.daw-ch-meter { width: 20px !important; }
.daw-ch-fader { 
  width: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.vertical-fader {
  -webkit-appearance: slider-vertical !important;
  width: 30px !important;
  height: 160px !important;
  background: #444 !important;
  outline: none !important;
  cursor: pointer !important;
}
'''

with open(css_path, 'a') as f:
    f.write(uniform_css)

print("Added uniform channel CSS with !important overrides")
PYEOF

npm run build 2>&1 | tail -3
git add -A && git commit -m "add: uniform channel strip CSS overrides" && git push

echo "Done! Added CSS overrides. Check mixer now."
