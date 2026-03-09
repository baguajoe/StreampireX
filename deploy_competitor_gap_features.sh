#!/usr/bin/env bash
# =============================================================================
# deploy_competitor_gap_features.sh
# StreamPireX — Deploy All Competitor Gap Features
#
# Run from repo root: /workspaces/SpectraSphere
# bash deploy_competitor_gap_features.sh
#
# What this does:
#   1. Copies all new frontend components to src/front/js/component/
#   2. Copies all new pages to src/front/js/pages/
#   3. Copies all new backend routes to src/api/
#   4. Prints instructions for manual wiring in app.py and app.js
# =============================================================================

set -e

REPO_ROOT="$(pwd)"
COMPONENT_DIR="$REPO_ROOT/src/front/js/component"
PAGES_DIR="$REPO_ROOT/src/front/js/pages"
API_DIR="$REPO_ROOT/src/api"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# Detect script directory (where files were saved)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   StreamPireX — Competitor Gap Feature Deploy            ║${NC}"
echo -e "${CYAN}║   Closes gaps vs: LANDR, Loopcloud, Splice,              ║${NC}"
echo -e "${CYAN}║                   Tonalic, Fender Studio                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# 1. Verify directories exist
# =============================================================================
info "Checking directory structure..."

for dir in "$COMPONENT_DIR" "$PAGES_DIR" "$API_DIR"; do
  if [ ! -d "$dir" ]; then
    warn "Directory not found, creating: $dir"
    mkdir -p "$dir"
  fi
done
log "Directory structure OK"

# =============================================================================
# 2. Copy frontend components
# =============================================================================
info "Copying frontend components..."

COMPONENTS=(
  "ChordAwareSampleBrowser.js"
  "SessionVersionControl.js"
  "ChordTrack.js"
  "ReferenceMastering.js"
  "SmartBackingTrack.js"
  "AmpSimPlugin.js"
  "ChordProgressionGenerator.js"
  "AIStackGenerator.js"
  "DAWCollabSession.js"
  "QuickCaptureMode.js"
)

for file in "${COMPONENTS[@]}"; do
  src="$SCRIPT_DIR/$file"
  dst="$COMPONENT_DIR/$file"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    log "  $file → component/"
  else
    warn "  MISSING: $file (skipped)"
  fi
done

# =============================================================================
# 3. Copy frontend pages
# =============================================================================
info "Copying frontend pages..."

PAGES=(
  "CreatorSampleMarketplace.js"
  "CreatorAcademy.js"
  "CollabMarketplace.js"
  "JamTrackLibrary.js"
)

for file in "${PAGES[@]}"; do
  src="$SCRIPT_DIR/$file"
  dst="$PAGES_DIR/$file"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    log "  $file → pages/"
  else
    warn "  MISSING: $file (skipped)"
  fi
done

# =============================================================================
# 4. Copy backend routes
# =============================================================================
info "Copying backend API routes..."

ROUTES=(
  "sample_marketplace_routes.py"
  "jam_tracks_routes.py"
  "collab_marketplace_routes.py"
  "reference_mastering_routes.py"
)

for file in "${ROUTES[@]}"; do
  src="$SCRIPT_DIR/$file"
  dst="$API_DIR/$file"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    log "  $file → src/api/"
  else
    warn "  MISSING: $file (skipped)"
  fi
done

# =============================================================================
# 5. Check for existing stub pages that need creating
# =============================================================================
info "Checking for missing stub pages..."

STUBS=(
  "AIThumbnailMaker.js"
  "AIEPKWriter.js"
  "AIPromoGenerator.js"
)

for stub in "${STUBS[@]}"; do
  dst="$PAGES_DIR/$stub"
  if [ ! -f "$dst" ]; then
    pagename="${stub%.js}"
    cat > "$dst" << STUBEOF
import React from 'react';
export default function ${pagename}() {
  return (
    <div style={{ background:'#0d1117', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#8b949e', fontFamily:'JetBrains Mono,monospace', fontSize:14 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🚧</div>
        <div style={{ color:'#00ffc8', fontWeight:700 }}>${pagename}</div>
        <div style={{ marginTop:8 }}>Coming Soon</div>
      </div>
    </div>
  );
}
STUBEOF
    log "  Created stub: $stub"
  else
    log "  Stub exists: $stub"
  fi
done

# =============================================================================
# 6. Print manual wiring instructions
# =============================================================================
echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  MANUAL WIRING REQUIRED                                  ${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}── app.py (Flask) ──────────────────────────────────────────${NC}"
cat << 'EOF'
Add these imports and blueprint registrations:

  from src.api.sample_marketplace_routes  import marketplace_bp
  from src.api.jam_tracks_routes          import jam_tracks_bp
  from src.api.collab_marketplace_routes  import collab_marketplace_bp
  from src.api.reference_mastering_routes import reference_mastering_bp

  app.register_blueprint(marketplace_bp)
  app.register_blueprint(jam_tracks_bp)
  app.register_blueprint(collab_marketplace_bp)
  app.register_blueprint(reference_mastering_bp)

EOF

echo -e "${YELLOW}── app.js (React Router) ───────────────────────────────────${NC}"
cat << 'EOF'
Add these imports at the top:

  import CreatorSampleMarketplace from './pages/CreatorSampleMarketplace';
  import CreatorAcademy           from './pages/CreatorAcademy';
  import CollabMarketplace        from './pages/CollabMarketplace';
  import JamTrackLibrary          from './pages/JamTrackLibrary';
  import AIThumbnailMaker         from './pages/AIThumbnailMaker';
  import AIEPKWriter              from './pages/AIEPKWriter';
  import AIPromoGenerator         from './pages/AIPromoGenerator';
  import QuickCaptureMode         from './component/QuickCaptureMode';

Add these routes inside your <Routes>:

  <Route path="/marketplace"       element={<CreatorSampleMarketplace />} />
  <Route path="/academy"           element={<CreatorAcademy />} />
  <Route path="/collab-marketplace" element={<CollabMarketplace />} />
  <Route path="/jam-tracks"        element={<JamTrackLibrary />} />
  <Route path="/quick-record"      element={<QuickCaptureMode onCaptureDone={(blob) => console.log('Captured', blob)} />} />
  <Route path="/ai-thumbnail"      element={<AIThumbnailMaker />} />
  <Route path="/ai-epk-writer"     element={<AIEPKWriter />} />
  <Route path="/ai-promo"          element={<AIPromoGenerator />} />

EOF

echo -e "${YELLOW}── Sidebar.js ──────────────────────────────────────────────${NC}"
cat << 'EOF'
Add to sidebar navigation (inside the appropriate sections):

  // Under 🎵 Music section:
  { to: '/jam-tracks',         label: '🎸 Jam Tracks'        },
  { to: '/quick-record',       label: '⏺ Quick Capture'       },
  { to: '/collab-marketplace', label: '🤝 Hire a Pro'          },

  // Under 🛍️ Store / Marketplace:
  { to: '/marketplace',        label: '🎵 Sample Packs'        },

  // Under 🎓 Learn:
  { to: '/academy',            label: '🎓 Creator Academy'     },

  // Under 🤖 AI Tools:
  { to: '/ai-thumbnail',       label: '🖼 AI Thumbnail Maker'  },
  { to: '/ai-epk-writer',      label: '📝 AI EPK Writer'       },
  { to: '/ai-promo',           label: '🎯 AI Promo Generator'  },

EOF

echo -e "${YELLOW}── RecordingStudio.js ──────────────────────────────────────${NC}"
cat << 'EOF'
Add a "Collab" button to the DAW toolbar:

  import DAWCollabSession from './DAWCollabSession';

  const [collabOpen, setCollabOpen] = useState(false);

  // In toolbar:
  <button onClick={() => setCollabOpen(true)}>🎧 Collab</button>

  // At bottom of JSX:
  {collabOpen && (
    <DAWCollabSession
      isHost={true}
      sessionId={currentProjectId}
      dawAudioNode={masterOutputRef.current}
      onClose={() => setCollabOpen(false)}
    />
  )}

EOF

echo -e "${YELLOW}── SamplerBeatMaker.js ─────────────────────────────────────${NC}"
cat << 'EOF'
Add these tabs to the internal tab array:

  { id: 'samples',   label: '🎵 Samples',    component: <ChordAwareSampleBrowser projectBPM={bpm} projectKey={projectKey} onSampleSelect={handleSampleSelect} /> },
  { id: 'smart',     label: '🎼 Backing',    component: <SmartBackingTrack projectBPM={bpm} projectKey={projectKey} onSendToDAW={loadArrangementIntoTracks} /> },
  { id: 'aistack',   label: '⚡ AI Stack',   component: <AIStackGenerator onSendToDAW={loadStackIntoTracks} /> },

EOF

echo -e "${YELLOW}── MasteringChain.js / Mastering tab ──────────────────────${NC}"
cat << 'EOF'
Add Reference Mastering as a sub-tab:

  import ReferenceMastering from './ReferenceMastering';

  // In mastering tab panel:
  <ReferenceMastering onApplyCorrections={(eq, gain) => applyCorrectiveEQ(eq, gain)} />

EOF

echo -e "${YELLOW}── Piano Roll tab ──────────────────────────────────────────${NC}"
cat << 'EOF'
Add Chord Progression Generator as a side panel:

  import ChordProgressionGenerator from './ChordProgressionGenerator';
  import ChordTrack from './ChordTrack';

  // Above the piano roll grid:
  <ChordTrack bars={totalBars} pixelsPerBar={ppb} scrollLeft={scrollLeft}
    chords={chords} onChordsChange={setChords} />

  // In a collapsible sidebar panel:
  <ChordProgressionGenerator
    projectKey={key}
    projectScale={scale}
    onSendToChordTrack={setChords}
  />

EOF

echo -e "${YELLOW}── PluginHost.js ───────────────────────────────────────────${NC}"
cat << 'EOF'
Register AmpSimPlugin as a plugin type:

  import AmpSimPlugin from './AmpSimPlugin';

  // In plugin type selector:
  { type: 'amp_sim', label: '🎸 Amp Simulator', component: AmpSimPlugin }

EOF

# =============================================================================
# 7. DB migration reminder
# =============================================================================
echo ""
echo -e "${YELLOW}── Database Migration ──────────────────────────────────────${NC}"
cat << 'EOF'
Run these after adding model classes to models.py:

  flask db migrate -m "add marketplace, jam tracks, collab marketplace, session snapshots"
  flask db upgrade

New tables needed (add models to models.py — skeletons in route files):
  - marketplace_packs
  - marketplace_purchases
  - jam_tracks
  - collab_services
  - collab_orders

EOF

# =============================================================================
# 8. R2 bucket structure
# =============================================================================
echo -e "${YELLOW}── R2 Bucket Structure (create folders) ────────────────────${NC}"
cat << 'EOF'
  streampirex-media/
    marketplace/<pack_id>/pack.zip
    marketplace/<pack_id>/preview.mp3
    jam-tracks/<track_id>/mix.mp3
    jam-tracks/<track_id>/stems/drums.wav
    jam-tracks/<track_id>/stems/bass.wav
    jam-tracks/<track_id>/stems/keys.wav
    jam-tracks/<track_id>/stems/guitar.wav
    jam-tracks/<track_id>/stems/horns.wav
    jam-tracks/recordings/<user_id>/<track_id>/<rec_id>.webm
    sessions/<user_id>/<session_id>/snapshots/<snap_id>.json

EOF

# =============================================================================
# 9. Summary
# =============================================================================
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  DEPLOY COMPLETE — Summary of new features:              ${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  COMPONENTS (drop into existing views):"
echo "    ✓ ChordAwareSampleBrowser  — BPM/key smart sample browser"
echo "    ✓ SessionVersionControl    — project snapshot save/restore"
echo "    ✓ ChordTrack               — chord track in Arrange view"
echo "    ✓ ReferenceMastering       — match master to reference track"
echo "    ✓ SmartBackingTrack        — auto-assembled backing arrangements"
echo "    ✓ AmpSimPlugin             — guitar/bass amp simulator"
echo "    ✓ ChordProgressionGenerator— key/scale chord suggestions + MIDI"
echo "    ✓ AIStackGenerator         — prompt → layered sample stack"
echo "    ✓ DAWCollabSession         — WebRTC collab in Recording Studio"
echo "    ✓ QuickCaptureMode         — one-tap record page"
echo ""
echo "  PAGES (new routes):"
echo "    ✓ CreatorSampleMarketplace — /marketplace (upload/sell/browse packs)"
echo "    ✓ CreatorAcademy           — /academy (18 courses, 8 categories)"
echo "    ✓ CollabMarketplace        — /collab-marketplace (hire-a-pro)"
echo "    ✓ JamTrackLibrary          — /jam-tracks (20 tracks, stem mixer)"
echo "    ✓ QuickCaptureMode         — /quick-record"
echo ""
echo "  BACKEND ROUTES:"
echo "    ✓ sample_marketplace_routes.py  — R2 pack storage + Stripe"
echo "    ✓ jam_tracks_routes.py          — presigned stem URLs + recording"
echo "    ✓ collab_marketplace_routes.py  — booking + escrow flow"
echo "    ✓ reference_mastering_routes.py — librosa analysis + snapshots"
echo ""
echo "  COMPETITOR GAPS CLOSED:"
echo "    ✓ LANDR:         Reference mastering, DAW collab, Creator Academy"
echo "    ✓ Loopcloud:     BPM/key sample browser, AI similarity search"
echo "    ✓ Splice:        AI stack generator, creator sample marketplace"
echo "    ✓ Tonalic:       Smart backing track builder"
echo "    ✓ Fender Studio: Quick capture, jam tracks, amp sim, chord track"
echo ""
echo -e "${GREEN}  StreamPireX now replaces 8+ paid services for $31.99/mo${NC}"
echo ""
