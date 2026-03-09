// =============================================================================
// useAICredits.js — Universal AI Credits Hook
// =============================================================================
// Location: src/front/js/component/hooks/useAICredits.js
//
// Usage in any component:
//   const { credits, canUse, useFeature, checkFeature, loading } = useAICredits();
//
//   // Check before showing button
//   const { can_use, cost } = await checkFeature('voice_clone_tts');
//
//   // Deduct when user clicks
//   const { success, error, balance } = await useFeature('voice_clone_tts', { text: '...' });
//   if (!success) showUpgradeModal(error);
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const getHeaders = () => {
    const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

// Feature display names for UI
const FEATURE_LABELS = {
    ai_video_generation:   '🎬 AI Video Generation',
    voice_clone_create:    '🎤 Voice Clone',
    voice_clone_tts:       '🗣️ Voice Clone TTS',
    ai_radio_dj_tts:       '📻 AI Radio DJ',
    ai_podcast_intro:      '🎙️ Podcast Intro',
    ai_video_narration:    '🎞️ Video Narration',
    ai_content_generation: '✍️ AI Content',
    ai_auto_captions:      '💬 Auto Captions',
    ai_lyrics_generation:  '🎵 AI Lyrics',
    ai_image_generation:   '🖼️ AI Image',
    ai_thumbnail_enhance:  '📷 AI Thumbnail',
    stem_separation:       '🎵 Stem Separation',
    ai_mix_assistant:      '🎛️ AI Mix Assistant',
    silence_detection:     '🔇 Silence Detection',
    ai_thumbnail_extract:  '📷 Thumbnail Extract',
    key_finder:            '🔑 Key Finder',
    audio_to_midi:         '🎼 Audio → MIDI',
    pitch_correction:      '🎯 Pitch Correction',
    background_removal:    '🖼️ Background Removal',
    scene_detection:       '🎬 Scene Detection',
    audio_ducking:         '🔊 Audio Ducking',
    motion_tracking:       '📍 Motion Tracking',
    ai_beat_detection:     '🥁 Beat Detection',
    vocal_tuner:           '🎤 Vocal Tuner',

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

};

const useAICredits = () => {
    const [credits, setCredits] = useState(null);
    const [features, setFeatures] = useState({});
    const [tier, setTier] = useState('free');
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Fetch credit balance + feature map ──────────────────────────────
    const fetchCredits = useCallback(async () => {
        try {
            const res = await fetch(`${backendURL}/api/ai/credits`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch credits');
            const data = await res.json();

            setCredits(data.credits);
            setFeatures(data.features || {});
            setTier(data.tier);
            setPacks(data.packs || []);
            setError(null);
        } catch (e) {
            console.error('useAICredits fetch error:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCredits(); }, [fetchCredits]);

    // ── Check if user can use a feature (dry run) ───────────────────────
    const checkFeature = useCallback(async (feature) => {
        try {
            const res = await fetch(`${backendURL}/api/ai/credits/check`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ feature }),
            });
            return await res.json();
        } catch (e) {
            return { can_use: false, error: e.message };
        }
    }, []);

    // ── Use a feature (deduct credits) ──────────────────────────────────
    const useFeature = useCallback(async (feature, metadata = null) => {
        try {
            const res = await fetch(`${backendURL}/api/ai/credits/use`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ feature, metadata }),
            });
            const data = await res.json();

            if (data.success) {
                // Update local state
                setCredits(prev => prev ? { ...prev, balance: data.balance } : prev);
            }

            return data;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, []);

    // ── Refund credits (on failure) ─────────────────────────────────────
    const refundFeature = useCallback(async (feature) => {
        try {
            const res = await fetch(`${backendURL}/api/ai/credits/refund`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ feature }),
            });
            const data = await res.json();
            if (data.success) {
                setCredits(prev => prev ? { ...prev, balance: data.balance } : prev);
            }
            return data;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, []);

    // ── Purchase credit pack (redirect to Stripe) ───────────────────────
    const purchasePack = useCallback(async (packId) => {
        try {
            const res = await fetch(`${backendURL}/api/ai/credits/purchase`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ pack_id: packId }),
            });
            const data = await res.json();

            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            }
            return data;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, []);

    // ── Get usage history ───────────────────────────────────────────────
    const getUsageHistory = useCallback(async (options = {}) => {
        try {
            const params = new URLSearchParams();
            if (options.feature) params.set('feature', options.feature);
            if (options.days) params.set('days', options.days);
            if (options.page) params.set('page', options.page);

            const res = await fetch(
                `${backendURL}/api/ai/credits/usage?${params}`,
                { headers: getHeaders() }
            );
            return await res.json();
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, []);

    // ── Get storage usage ───────────────────────────────────────────────
    const getStorageUsage = useCallback(async () => {
        try {
            const res = await fetch(`${backendURL}/api/ai/credits/storage`, { headers: getHeaders() });
            return await res.json();
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, []);

    // ── Quick helpers ───────────────────────────────────────────────────

    const getFeatureCost = useCallback((feature) => {
        return features[feature]?.cost ?? 0;
    }, [features]);

    const isFeatureFree = useCallback((feature) => {
        return features[feature]?.free ?? false;
    }, [features]);

    const hasFeatureAccess = useCallback((feature) => {
        return features[feature]?.has_access ?? false;
    }, [features]);

    const canAfford = useCallback((feature) => {
        const cost = features[feature]?.cost ?? 0;
        if (cost === 0) return true;
        return (credits?.balance ?? 0) >= cost;
    }, [features, credits]);

    // Combined check — has tier + has balance
    const canUse = useCallback((feature) => {
        return hasFeatureAccess(feature) && canAfford(feature);
    }, [hasFeatureAccess, canAfford]);

    const getFeatureLabel = useCallback((feature) => {
        return FEATURE_LABELS[feature] || feature;
    }, []);

    const balance = credits?.balance ?? 0;

    return {
        // State
        credits,
        features,
        tier,
        packs,
        balance,
        loading,
        error,

        // Actions
        fetchCredits,
        checkFeature,
        useFeature,
        refundFeature,
        purchasePack,
        getUsageHistory,
        getStorageUsage,

        // Quick checks
        getFeatureCost,
        isFeatureFree,
        hasFeatureAccess,
        canAfford,
        canUse,
        getFeatureLabel,
    };
};

export default useAICredits;
