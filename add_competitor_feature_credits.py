"""
add_competitor_feature_credits.py
StreamPireX — Credit System Patch for All New Competitor Gap Features

Run this once to add the new feature keys to your existing AI_FEATURE_COSTS dict
and FEATURE_LABELS in the frontend hook.

WHAT THIS PATCHES:
  Backend:  src/api/ai_credits_routes.py   → AI_FEATURE_COSTS dict
  Frontend: src/front/js/component/hooks/useAICredits.js → FEATURE_LABELS
  Frontend: src/front/js/pages/AICreditsPanel.js → FEATURE_INFO

HOW TO RUN:
  python3 add_competitor_feature_credits.py

It does a surgical string-replace — safe to run multiple times (checks for existing keys).
"""

import os
import sys

REPO_ROOT = '/workspaces/SpectraSphere'

# ── 1. New feature costs to add to AI_FEATURE_COSTS ──────────────────────────
# Format: 'feature_key': credits_cost
# Only add what YOU get billed for (Replicate + ElevenLabs API calls).
# Local processing = 0 credits = free for users.

NEW_FEATURE_COSTS = """
    # ── Suno Gap Features (Replicate musicgen + ElevenLabs) ──────────────
    'text_to_song':              15,   # Replicate musicgen-stereo (user pays)
    'text_to_song_with_vocals':  25,   # musicgen + ElevenLabs TTS (user pays)
    'add_vocals_to_track':       20,   # ElevenLabs TTS + ffmpeg (user pays)
    'add_beat_to_vocals':        20,   # Replicate musicgen-melody (user pays)
    'hum_to_song':               20,   # Replicate musicgen-melody from hum (user pays)
    'song_extender':             15,   # Replicate musicgen per 30s pass (user pays)

    # ── LANDR / Loopcloud / Splice Gap Features ───────────────────────────
    'ai_stack_generator':        10,   # Claude API → layered sample suggestions
    'reference_mastering_ai':     5,   # librosa analysis is free; AI suggestion via Claude API

    # ── FREE local-processing features (0 credits) ────────────────────────
    'chord_track_detect':         0,   # local Web Audio chord detection
    'smart_backing_track':        0,   # local BPM/key matching, no API
    'chord_progression_gen':      0,   # deterministic music theory, no API
    'quick_capture':              0,   # local MediaRecorder, no API
    'session_version_control':    0,   # R2 storage only, no AI API
    'daw_collab_audio':           0,   # WebRTC, no AI API
    'amp_sim':                    0,   # Web Audio DSP, no API
    'voice_to_midi':              0,   # local YIN pitch detection, no API
    'voice_to_beat':              0,   # local onset detection, no API
    'reference_mastering_local':  0,   # librosa runs on server, open source
"""

# ── 2. Frontend FEATURE_LABELS additions ─────────────────────────────────────
NEW_FEATURE_LABELS = """
    // Suno gap features
    text_to_song:              '✨ AI Text to Song',
    text_to_song_with_vocals:  '✨ AI Text to Song + Vocals',
    add_vocals_to_track:       '🎤 Add Vocals to Beat',
    add_beat_to_vocals:        '🎸 Add Beat to Vocals',
    hum_to_song:               '🎙 Hum to Song',
    song_extender:             '🔮 AI Song Extender',

    // Competitor gap features
    ai_stack_generator:        '🎛 AI Stack Generator',
    reference_mastering_ai:    '📊 Reference Mastering AI',
    chord_track_detect:        '🎹 Chord Track (Free)',
    smart_backing_track:       '🎸 Smart Backing Track (Free)',
    chord_progression_gen:     '🎼 Chord Progression Generator (Free)',
    quick_capture:             '⚡ Quick Capture (Free)',
    session_version_control:   '💾 Session Version Control (Free)',
    daw_collab_audio:          '👥 DAW Collab (Free)',
    amp_sim:                   '🎸 Amp Simulator (Free)',
    voice_to_midi:             '🎵 Voice to MIDI (Free)',
    voice_to_beat:             '🥁 Voice to Beat (Free)',
"""

# ── 3. AICreditsPanel FEATURE_INFO additions ──────────────────────────────────
NEW_FEATURE_INFO = """
  text_to_song:              { name: 'AI Text to Song',          icon: '✨', cat: 'Music AI' },
  text_to_song_with_vocals:  { name: 'AI Song + Vocals',         icon: '✨', cat: 'Music AI' },
  add_vocals_to_track:       { name: 'Add Vocals to Beat',       icon: '🎤', cat: 'Music AI' },
  add_beat_to_vocals:        { name: 'Add Beat to Vocals',       icon: '🎸', cat: 'Music AI' },
  hum_to_song:               { name: 'Hum to Song',              icon: '🎙', cat: 'Music AI' },
  song_extender:             { name: 'AI Song Extender',         icon: '🔮', cat: 'Music AI' },
  ai_stack_generator:        { name: 'AI Stack Generator',       icon: '🎛', cat: 'Music AI' },
  reference_mastering_ai:    { name: 'Reference Mastering AI',   icon: '📊', cat: 'Mastering' },
"""

def patch_backend():
    """Add new costs to AI_FEATURE_COSTS in ai_credits_routes.py"""
    candidates = [
        f'{REPO_ROOT}/src/api/ai_credits_routes.py',
        f'{REPO_ROOT}/src/api/ai_video_credits_routes.py',
    ]
    target = None
    for c in candidates:
        if os.path.exists(c):
            target = c
            break

    if not target:
        print("❌ Could not find ai_credits_routes.py — check path")
        return False

    with open(target, 'r') as f:
        content = f.read()

    if 'text_to_song' in content:
        print(f"✅ Backend already has new feature costs in {target}")
        return True

    # Find the AI_FEATURE_COSTS dict and inject before the closing brace
    marker = "'vocal_tuner':             0,"
    if marker not in content:
        # Try alternate last entry
        marker = "'ai_beat_detection':       0,"

    if marker not in content:
        print(f"❌ Could not find insertion point in {target}")
        print("   Add these lines manually to AI_FEATURE_COSTS:")
        print(NEW_FEATURE_COSTS)
        return False

    patched = content.replace(
        marker,
        marker + "\n" + NEW_FEATURE_COSTS
    )

    with open(target, 'w') as f:
        f.write(patched)

    print(f"✅ Patched backend: {target}")
    return True


def patch_frontend_hook():
    """Add new FEATURE_LABELS to useAICredits.js"""
    target = f'{REPO_ROOT}/src/front/js/component/hooks/useAICredits.js'
    if not os.path.exists(target):
        print(f"❌ Not found: {target}")
        print("   Add these lines manually to FEATURE_LABELS:")
        print(NEW_FEATURE_LABELS)
        return False

    with open(target, 'r') as f:
        content = f.read()

    if 'text_to_song' in content:
        print(f"✅ Frontend hook already updated: {target}")
        return True

    # Find last entry in FEATURE_LABELS
    marker = "vocal_tuner:           '🎤 Vocal Tuner',"
    if marker not in content:
        marker = "ai_beat_detection:     '🥁 Beat Detection',"

    if marker not in content:
        print(f"❌ Could not find insertion point in FEATURE_LABELS")
        print("   Add these manually:")
        print(NEW_FEATURE_LABELS)
        return False

    patched = content.replace(
        marker,
        marker + "\n" + NEW_FEATURE_LABELS
    )

    with open(target, 'w') as f:
        f.write(patched)

    print(f"✅ Patched frontend hook: {target}")
    return True


def patch_credits_panel():
    """Add new FEATURE_INFO to AICreditsPanel.js"""
    target = f'{REPO_ROOT}/src/front/js/pages/AICreditsPanel.js'
    if not os.path.exists(target):
        print(f"❌ Not found: {target}")
        print("   Add these manually to FEATURE_INFO:")
        print(NEW_FEATURE_INFO)
        return False

    with open(target, 'r') as f:
        content = f.read()

    if 'text_to_song' in content:
        print(f"✅ AICreditsPanel already updated: {target}")
        return True

    marker = "ai_thumbnail_enhance:  { name"
    if marker not in content:
        print(f"❌ Could not find FEATURE_INFO insertion point in AICreditsPanel.js")
        print("   Add manually:")
        print(NEW_FEATURE_INFO)
        return False

    patched = content.replace(
        marker,
        NEW_FEATURE_INFO + "\n  " + marker
    )

    with open(target, 'w') as f:
        f.write(patched)

    print(f"✅ Patched AICreditsPanel: {target}")
    return True


def print_summary():
    print("""
╔══════════════════════════════════════════════════════════════════╗
║         CREDIT COST SUMMARY — NEW FEATURES                      ║
╠══════════════════════════════════════════════════════════════════╣
║  FEATURE                        CREDITS   WHO PAYS              ║
║  ─────────────────────────────────────────────────              ║
║  AI Text to Song (instrumental)   15      USER (Replicate)      ║
║  AI Text to Song + Vocals         25      USER (Repl+ElevenLabs)║
║  Add Vocals to Beat               20      USER (ElevenLabs)     ║
║  Add Beat to Vocals               20      USER (Replicate)      ║
║  Hum to Song                      20      USER (Replicate)      ║
║  AI Song Extender (per pass)      15      USER (Replicate)      ║
║  AI Stack Generator               10      USER (Claude API)     ║
║  Reference Mastering AI            5      USER (Claude API)     ║
║  ─────────────────────────────────────────────────              ║
║  Chord Track Detection             0      FREE (local)          ║
║  Smart Backing Track               0      FREE (local)          ║
║  Chord Progression Generator       0      FREE (local)          ║
║  Quick Capture Mode                0      FREE (MediaRecorder)  ║
║  Session Version Control           0      FREE (R2 storage)     ║
║  DAW Collab                        0      FREE (WebRTC)         ║
║  Amp Simulator                     0      FREE (Web Audio)      ║
║  Voice to MIDI                     0      FREE (YIN local)      ║
║  Voice to Beat                     0      FREE (local onset)    ║
╠══════════════════════════════════════════════════════════════════╣
║  YOU PAY NOTHING. USERS BUY CREDITS. CREDITS FUND API COSTS.    ║
╚══════════════════════════════════════════════════════════════════╝

Next steps:
  1. Add 'hum_to_song' route in app.js:
       <Route path="/hum-to-song" element={<HumToSong />} />

  2. Add 'hum_to_song' to sidebar under AI Music section

  3. The suno_gap_routes.py already handles /api/ai/add-beat
     which HumToSong.js calls — no new backend needed

  4. Run DB migration if you added any new credit tables (not needed here)

  5. Buy starter Replicate credits via Replicate.com billing
     — users pay you credits, you pay Replicate from that revenue
""")


if __name__ == '__main__':
    print("🔧 Patching credit system for new competitor gap features...\n")
    patch_backend()
    patch_frontend_hook()
    patch_credits_panel()
    print_summary()
