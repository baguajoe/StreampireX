"""
ai_credits_new_features_patch.py
StreamPireX — Credit System Patch for All New Features

INSTRUCTIONS:
  Open: src/api/ai_video_credits_routes.py (or wherever AI_FEATURE_COSTS lives)
  Find: AI_FEATURE_COSTS = { ... }
  Add the NEW PAID section below to the existing dict.
  Add the NEW FREE section to the free block (cost=0) if present.
  Add the NEW FEATURE_INFO entries to AICreditsPanel.js and useAICredits.js.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FULL AUDIT — Every feature built today
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPETITOR GAP FEATURES (19 files built earlier today):
─────────────────────────────────────────────────────────────────────────
ChordAwareSampleBrowser       → FREE  (local search + R2 reads, no paid API)
SessionVersionControl         → FREE  (R2 save/load JSON, no paid API)
QuickCaptureMode              → FREE  (MediaRecorder in browser, no API)
ChordTrack                    → FREE  (Web Audio analysis, local)
ReferenceMastering            → FREE  (librosa local, no external API)
SmartBackingTrack             → FREE  (local audio assembly, no API)
AmpSimPlugin                  → FREE  (Web Audio DSP, runs in browser)
ChordProgressionGenerator     → FREE  (local music theory, no API)
DAWCollabSession              → FREE  (WebRTC, Socket.IO — your infra)
CreatorSampleMarketplace      → FREE  (your own platform, Stripe handles $)
CreatorAcademy                → FREE  (your own content, no AI API)
CollabMarketplace             → FREE  (your own platform, Stripe handles $)
JamTrackLibrary               → FREE  (R2 audio files, no AI API)

AIStackGenerator              → PAID  (calls Claude API to build prompts + Replicate)
                                       Cost: 5 credits

SUNO GAP FEATURES (4 features built this session):
─────────────────────────────────────────────────────────────────────────
AITextToSong                  → PAID  (Replicate musicgen + optional ElevenLabs)
                                       Cost: 15 credits (instrumental)
                                             25 credits (with vocals)
                                       → Use 'text_to_song' and 'text_to_song_vocals'

AddVocalsToTrack              → PAID  (ElevenLabs TTS + ffmpeg mix)
                                       Cost: 20 credits
                                       → Use 'add_vocals_to_track'

AddBeatToVocals               → PAID  (Replicate musicgen-melody + ffmpeg)
                                       Cost: 20 credits
                                       → Use 'add_beat_to_vocals'

SongExtender                  → PAID  (Replicate musicgen per 30s chunk)
                                       Cost: 15 credits per extension pass
                                       → Use 'song_extender'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY:  18 FREE features  |  5 PAID features
YOU pay nothing. Users pay credits. Credits sold via Stripe.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# ══════════════════════════════════════════════════════════════════════════
# STEP 1 — Add these to AI_FEATURE_COSTS in ai_video_credits_routes.py
# ══════════════════════════════════════════════════════════════════════════

NEW_PAID_FEATURES = {
    # Suno gap features
    'text_to_song':            15,   # Replicate musicgen-stereo (instrumental)
    'text_to_song_vocals':     25,   # Replicate musicgen + ElevenLabs vocals
    'add_vocals_to_track':     20,   # ElevenLabs TTS + ffmpeg mix
    'add_beat_to_vocals':      20,   # Replicate musicgen-melody + ffmpeg
    'song_extender':           15,   # Replicate musicgen per 30s pass

    # Competitor gap — AI Stack Generator uses Claude API
    'ai_stack_generator':       5,   # Claude API prompt builder + Replicate
}

NEW_FREE_FEATURES = {
    # All competitor gap features — run locally or on your own infra
    'chord_sample_browser':     0,   # Local + R2 reads
    'session_version_control':  0,   # R2 JSON save/load
    'quick_capture':            0,   # Browser MediaRecorder
    'chord_track':              0,   # Web Audio local
    'reference_mastering':      0,   # librosa local
    'smart_backing_track':      0,   # Local audio assembly
    'amp_sim_plugin':           0,   # Web Audio DSP
    'chord_progression_gen':    0,   # Local music theory
    'daw_collab_session':       0,   # WebRTC / Socket.IO
    'creator_marketplace':      0,   # Your own platform
    'creator_academy':          0,   # Your own content
    'collab_marketplace':       0,   # Your own platform
    'jam_track_library':        0,   # R2 audio files
}

# ══════════════════════════════════════════════════════════════════════════
# STEP 2 — Add tier minimums for paid features
# Find: AI_FEATURE_MIN_TIER in ai_video_credits_routes.py
# Add these entries:
# ══════════════════════════════════════════════════════════════════════════

NEW_TIER_MINIMUMS = {
    'text_to_song':            'starter',
    'text_to_song_vocals':     'creator',
    'add_vocals_to_track':     'starter',
    'add_beat_to_vocals':      'starter',
    'song_extender':           'starter',
    'ai_stack_generator':      'starter',
}

# ══════════════════════════════════════════════════════════════════════════
# STEP 3 — Add to FEATURE_LABELS in useAICredits.js
# ══════════════════════════════════════════════════════════════════════════

NEW_FEATURE_LABELS_JS = """
    // Suno gap features
    text_to_song:              '✨ AI Text to Song',
    text_to_song_vocals:       '✨ AI Song with Vocals',
    add_vocals_to_track:       '🎤 Add Vocals to Beat',
    add_beat_to_vocals:        '🎸 Add Beat to Vocals',
    song_extender:             '🔮 Song Extender',
    ai_stack_generator:        '🤖 AI Stack Generator',

    // Free competitor gap features
    chord_sample_browser:      '🎵 Chord Sample Browser',
    session_version_control:   '💾 Session Version Control',
    quick_capture:             '⚡ Quick Capture',
    chord_track:               '🎼 Chord Track',
    reference_mastering:       '📊 Reference Mastering',
    smart_backing_track:       '🎹 Smart Backing Track',
    amp_sim_plugin:            '🎸 Amp Simulator',
    chord_progression_gen:     '🎵 Chord Progression Generator',
    daw_collab_session:        '👥 DAW Collab Session',
"""

# ══════════════════════════════════════════════════════════════════════════
# STEP 4 — Add to FEATURE_INFO in AICreditsPanel.js
# ══════════════════════════════════════════════════════════════════════════

NEW_FEATURE_INFO_JS = """
  // Suno gap — paid
  text_to_song:            { name: 'AI Text to Song',        icon: '✨', cat: 'Music AI' },
  text_to_song_vocals:     { name: 'AI Song with Vocals',    icon: '✨', cat: 'Music AI' },
  add_vocals_to_track:     { name: 'Add Vocals to Beat',     icon: '🎤', cat: 'Music AI' },
  add_beat_to_vocals:      { name: 'Add Beat to Vocals',     icon: '🎸', cat: 'Music AI' },
  song_extender:           { name: 'Song Extender',          icon: '🔮', cat: 'Music AI' },
  ai_stack_generator:      { name: 'AI Stack Generator',     icon: '🤖', cat: 'Music AI' },

  // Competitor gap — free
  chord_sample_browser:    { name: 'Chord Sample Browser',   icon: '🎵', cat: 'DAW Tools' },
  session_version_control: { name: 'Session Version Control',icon: '💾', cat: 'DAW Tools' },
  quick_capture:           { name: 'Quick Capture Mode',     icon: '⚡', cat: 'DAW Tools' },
  chord_track:             { name: 'Chord Track',            icon: '🎼', cat: 'DAW Tools' },
  reference_mastering:     { name: 'Reference Mastering',    icon: '📊', cat: 'Mastering' },
  smart_backing_track:     { name: 'Smart Backing Track',    icon: '🎹', cat: 'DAW Tools' },
  amp_sim_plugin:          { name: 'Amp Simulator',          icon: '🎸', cat: 'Plugins'  },
  chord_progression_gen:   { name: 'Chord Progression Gen',  icon: '🎵', cat: 'DAW Tools' },
  daw_collab_session:      { name: 'DAW Collab Session',     icon: '👥', cat: 'Collab'   },
"""

# ══════════════════════════════════════════════════════════════════════════
# STEP 5 — PricingPlans.js: add new credit costs to the "Uses Credits" column
# Find the credits list and add:
# ══════════════════════════════════════════════════════════════════════════

NEW_PRICING_PLANS_JSX = """
  <li className="feature included"><span className="icon">✨</span><span>AI Text to Song — <strong>15 cr</strong></span></li>
  <li className="feature included"><span className="icon">✨</span><span>AI Song + Vocals — <strong>25 cr</strong></span></li>
  <li className="feature included"><span className="icon">🎤</span><span>Add Vocals to Beat — <strong>20 cr</strong></span></li>
  <li className="feature included"><span className="icon">🎸</span><span>Add Beat to Vocals — <strong>20 cr</strong></span></li>
  <li className="feature included"><span className="icon">🔮</span><span>Song Extender — <strong>15 cr/pass</strong></span></li>
  <li className="feature included"><span className="icon">🤖</span><span>AI Stack Generator — <strong>5 cr</strong></span></li>
"""

# ══════════════════════════════════════════════════════════════════════════
# STEP 6 — Monthly credit allowances by tier (already in your system)
# These new paid features draw from the same monthly pool.
# No changes needed to tier credit amounts — they share the existing pool:
#   Free:    0 credits/month
#   Starter: 50 credits/month   (can do ~3 songs or ~2.5 vocal tracks)
#   Creator: 200 credits/month  (can do ~13 songs or mix of features)
#   Pro:     1000 credits/month (power users, DJ/producer tier)
# ══════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("AI Credits Patch — Summary")
    print(f"  New PAID features:  {len(NEW_PAID_FEATURES)}")
    print(f"  New FREE features:  {len(NEW_FREE_FEATURES)}")
    print()
    print("PAID (user pays credits, you pay Replicate/ElevenLabs from credit revenue):")
    for k, v in NEW_PAID_FEATURES.items():
        print(f"  {k:35} {v} credits")
    print()
    print("FREE (zero API cost to you or user):")
    for k in NEW_FREE_FEATURES:
        print(f"  {k:35} FREE")
