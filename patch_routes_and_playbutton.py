#!/usr/bin/env python3
"""
Fix 1: Add missing /my-podcasts and /my-radio-stations routes to layout.js
Fix 2: Remove duplicate play button from RadioStationDetailPage.js

Run from: /workspaces/SpectraSphere
"""

import shutil
from datetime import datetime

ts = datetime.now().strftime("%Y%m%d_%H%M%S")

# ─────────────────────────────────────────────────────────────────────────────
# FIX 1: Add missing routes to layout.js
# ─────────────────────────────────────────────────────────────────────────────
LAYOUT_FILE = "src/front/js/layout.js"
shutil.copy2(LAYOUT_FILE, f"{LAYOUT_FILE}.bak.routes.{ts}")
print(f"✅ Backup: {LAYOUT_FILE}.bak.routes.{ts}")

with open(LAYOUT_FILE, "r") as f:
    layout = f.read()

# Insert /my-podcasts and /my-radio-stations right after the existing podcast/radio dashboard routes
OLD_ROUTES = '                                <Route path="/podcast-dashboard" element={<PodcastDashboard />} />\n                                <Route path="/radio-station-dashboard" element={<RadioStationDashboard />} />'

NEW_ROUTES = '''                                <Route path="/podcast-dashboard" element={<PodcastDashboard />} />
                                <Route path="/my-podcasts" element={<PodcastDashboard />} />
                                <Route path="/radio-station-dashboard" element={<RadioStationDashboard />} />
                                <Route path="/my-radio-stations" element={<RadioStationDashboard />} />'''

if OLD_ROUTES in layout:
    layout = layout.replace(OLD_ROUTES, NEW_ROUTES, 1)
    print("✅ Added /my-podcasts and /my-radio-stations routes")
else:
    print("⚠️  Route block not found — checking alternate format...")
    # Try without the extra spaces
    if '/podcast-dashboard" element={<PodcastDashboard' in layout and '/my-podcasts' not in layout:
        layout = layout.replace(
            'path="/podcast-dashboard" element={<PodcastDashboard />}',
            'path="/podcast-dashboard" element={<PodcastDashboard />} />\n                                <Route path="/my-podcasts" element={<PodcastDashboard',
            1
        )
        print("✅ Added /my-podcasts route (alternate method)")
    if '/radio-station-dashboard" element={<RadioStationDashboard' in layout and '/my-radio-stations' not in layout:
        layout = layout.replace(
            'path="/radio-station-dashboard" element={<RadioStationDashboard />}',
            'path="/radio-station-dashboard" element={<RadioStationDashboard />} />\n                                <Route path="/my-radio-stations" element={<RadioStationDashboard',
            1
        )
        print("✅ Added /my-radio-stations route (alternate method)")

with open(LAYOUT_FILE, "w") as f:
    f.write(layout)

print()

# ─────────────────────────────────────────────────────────────────────────────
# FIX 2: Remove duplicate renderPlayButton() from RadioStationDetailPage.js
# ─────────────────────────────────────────────────────────────────────────────
RADIO_FILE = "src/front/js/component/RadioStationDetailPage.js"
shutil.copy2(RADIO_FILE, f"{RADIO_FILE}.bak.playbutton.{ts}")
print(f"✅ Backup: {RADIO_FILE}.bak.playbutton.{ts}")

with open(RADIO_FILE, "r") as f:
    radio = f.read()

# Remove the entire station-controls div that contains the duplicate renderPlayButton()
# This is the bottom duplicate — the real controls are inside audio-player div above it
OLD_CONTROLS = """            <div className="station-controls">
              {renderPlayButton()}

              <button className="favorite-button">
                ❤️ Add to Favorites
              </button>
              <TipJar
                creatorId={station.user_id}
                creatorName={station.creator_name || station.name}
                contentType="radio"
                contentId={station.id}
                buttonStyle="inline"
              />
              {/* Development debug info */}
              {renderDebugInfo()}
            </div>"""

NEW_CONTROLS = """            <div className="station-controls">
              <button className="favorite-button">
                ❤️ Add to Favorites
              </button>
              <TipJar
                creatorId={station.user_id}
                creatorName={station.creator_name || station.name}
                contentType="radio"
                contentId={station.id}
                buttonStyle="inline"
              />
              {/* Development debug info */}
              {renderDebugInfo()}
            </div>"""

if OLD_CONTROLS in radio:
    radio = radio.replace(OLD_CONTROLS, NEW_CONTROLS, 1)
    print("✅ Removed duplicate play button from station-controls div")
else:
    print("⚠️  Duplicate play button block not found — may already be fixed or whitespace differs")

# Also fix the play-pause-btn so text stays inside — ensure it has overflow hidden and nowrap
OLD_PLAY_BTN = """                <button
                  className={`play-pause-btn ${isPlaying ? 'playing' : ''}`}
                  onClick={isPlaying ? handlePauseClick : handlePlay}
                  disabled={audioLoading || (audioError && !audioError.canRetry)}
                >
                  {audioLoading ? (
                    <div className="loading-spinner"></div>
                  ) : isPlaying ? (
                    '⏸️'
                  ) : (
                    '▶️'
                  )}
                  <span>{audioLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}</span>
                </button>"""

NEW_PLAY_BTN = """                <button
                  className={`play-pause-btn ${isPlaying ? 'playing' : ''}`}
                  onClick={isPlaying ? handlePauseClick : handlePlay}
                  disabled={audioLoading || (audioError && !audioError.canRetry)}
                  style={{ whiteSpace: 'nowrap', overflow: 'hidden', minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {audioLoading ? (
                    <><div className="loading-spinner"></div><span>Loading...</span></>
                  ) : isPlaying ? (
                    <><span>⏸️</span><span>Pause</span></>
                  ) : (
                    <><span>▶️</span><span>Play</span></>
                  )}
                </button>"""

if OLD_PLAY_BTN in radio:
    radio = radio.replace(OLD_PLAY_BTN, NEW_PLAY_BTN, 1)
    print("✅ Fixed play-pause button text overflow")
else:
    print("⚠️  Play-pause button block not found — skipping (button may already be clean)")

with open(RADIO_FILE, "w") as f:
    f.write(radio)

print()
print("🎉 Done!")
print("  Fix 1: /my-podcasts → PodcastDashboard, /my-radio-stations → RadioStationDashboard")
print("  Fix 2: Duplicate play button removed, button text stays inside oval")
print()
print("Next: restart frontend (npm run start / hot reload) to see changes")
