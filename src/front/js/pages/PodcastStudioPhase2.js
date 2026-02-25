// =============================================================================
// PHASE 2: PODCAST STUDIO ADVANCED FEATURES
// =============================================================================
// Location: src/front/js/pages/PodcastStudioPhase2.js (merge into PodcastStudio)
//
// UPGRADES:
//   6. Video Recording (local 1080p/4K per participant)
//   7. Magic Clips (AI-generated short clips for social)
//   8. Studio Branding (logos, colors, intros/outros)
//   9. Async Recording (record on your own time)
//   10. Teleprompter Overlay
//
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';


// =============================================================================
// 6. VIDEO RECORDING ENGINE
// =============================================================================
// Records local video per participant alongside audio
// Uses MediaRecorder for video (H.264/VP9) + WAV engine for audio

class VideoRecordingEngine {
    constructor(stream, options = {}) {
        this.stream = stream;
        this.resolution = options.resolution || '1080p'; // 720p, 1080p, 4k
        this.videoCodec = options.codec || 'video/webm;codecs=vp9';
        this.videoBitrate = this._getBitrate(options.resolution);
        this.mediaRecorder = null;
        this.chunks = [];
        this.isRecording = false;
        this.onDataAvailable = options.onDataAvailable || null;
    }

    _getBitrate(resolution) {
        const bitrates = {
            '720p': 2500000,    // 2.5 Mbps
            '1080p': 5000000,   // 5 Mbps
            '1440p': 8000000,   // 8 Mbps
            '4k': 15000000      // 15 Mbps
        };
        return bitrates[resolution] || bitrates['1080p'];
    }

    _getConstraints() {
        const resolutions = {
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '1440p': { width: 2560, height: 1440 },
            '4k': { width: 3840, height: 2160 }
        };
        return resolutions[this.resolution] || resolutions['1080p'];
    }

    async start() {
        // Check codec support
        const codecs = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=h264,opus',
            'video/mp4;codecs=h264,aac'
        ];

        let selectedCodec = codecs.find(c => MediaRecorder.isTypeSupported(c));
        if (!selectedCodec) {
            selectedCodec = 'video/webm'; // Let browser decide
        }

        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: selectedCodec,
            videoBitsPerSecond: this.videoBitrate
        });

        this.chunks = [];

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.chunks.push(e.data);
                // Progressive upload for video too
                if (this.onDataAvailable) {
                    this.onDataAvailable(e.data);
                }
            }
        };

        // Request data every 10 seconds for progressive upload
        this.mediaRecorder.start(10000);
        this.isRecording = true;
    }

    stop() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
                this.isRecording = false;
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }
}

// Video quality selector component
const VideoQualitySelector = ({ value, onChange, tier = 'pro' }) => {
    const qualities = [
        { id: '720p', label: '720p HD', available: true },
        { id: '1080p', label: '1080p Full HD', available: true, recommended: true },
        { id: '1440p', label: '1440p QHD', available: tier === 'pro' || tier === 'premium' },
        { id: '4k', label: '4K Ultra HD', available: tier === 'premium' }
    ];

    return (
        <div className="video-quality-selector">
            <label>Video Quality</label>
            <div className="quality-pills">
                {qualities.map(q => (
                    <button
                        key={q.id}
                        className={`quality-pill ${value === q.id ? 'active' : ''} ${!q.available ? 'locked' : ''}`}
                        onClick={() => q.available && onChange(q.id)}
                        disabled={!q.available}
                    >
                        {q.label}
                        {!q.available && <span className="lock-icon">🔒</span>}
                        {q.recommended && <span className="rec-badge">★</span>}
                    </button>
                ))}
            </div>
        </div>
    );
};


// =============================================================================
// 7. MAGIC CLIPS — AI-Generated Short Clips for Social Media
// =============================================================================
// Analyzes recording to find the most engaging/viral moments
// Generates vertical video clips with captions for TikTok/Reels/Shorts

const MagicClips = ({ episodeId, audioUrl, videoUrl, transcript, words, onClipCreated }) => {
    const [clips, setClips] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedClip, setSelectedClip] = useState(null);
    const [captionStyle, setCaptionStyle] = useState('bold'); // bold, minimal, colorful, karaoke
    const [aspectRatio, setAspectRatio] = useState('9:16'); // 9:16, 1:1, 16:9
    const [exportProgress, setExportProgress] = useState(null);
    const token = sessionStorage.getItem('token');

    const generateClips = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/podcast-studio/magic-clips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    episode_id: episodeId,
                    audio_url: audioUrl,
                    video_url: videoUrl,
                    transcript: transcript,
                    max_clips: 5,
                    target_duration: 60 // seconds
                })
            });
            const data = await res.json();
            setClips(data.clips || []);
        } catch (err) {
            console.error('Magic clips error:', err);
        }
        setIsGenerating(false);
    };

    const exportClip = async (clip) => {
        setExportProgress({ clipId: clip.id, progress: 0 });
        try {
            const res = await fetch('/api/podcast-studio/export-clip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    episode_id: episodeId,
                    clip: clip,
                    caption_style: captionStyle,
                    aspect_ratio: aspectRatio,
                    audio_url: audioUrl,
                    video_url: videoUrl
                })
            });
            const data = await res.json();
            setExportProgress(null);
            if (data.clip_url) {
                onClipCreated?.(data);
            }
        } catch (err) {
            setExportProgress(null);
            console.error('Export error:', err);
        }
    };

    return (
        <div className="magic-clips">
            <div className="magic-clips-header">
                <h3>✨ Magic Clips</h3>
                <p>AI finds the most engaging moments and creates social-ready clips</p>
            </div>

            {clips.length === 0 && !isGenerating && (
                <div className="magic-clips-empty">
                    <button className="btn-generate-clips" onClick={generateClips}>
                        🪄 Generate Magic Clips
                    </button>
                    <p>AI analyzes your episode for viral-worthy moments</p>
                </div>
            )}

            {isGenerating && (
                <div className="magic-clips-loading">
                    <div className="loading-spinner" />
                    <p>Finding the best moments...</p>
                    <div className="loading-steps">
                        <span className="step active">🎧 Analyzing audio energy</span>
                        <span className="step">📝 Scanning transcript for hooks</span>
                        <span className="step">🎯 Scoring engagement potential</span>
                        <span className="step">✂️ Creating clip boundaries</span>
                    </div>
                </div>
            )}

            {clips.length > 0 && (
                <>
                    {/* Clip format controls */}
                    <div className="clips-format-bar">
                        <div className="aspect-ratio-selector">
                            <label>Format</label>
                            <div className="ratio-pills">
                                {[
                                    { id: '9:16', label: 'Vertical', icon: '📱', desc: 'TikTok/Reels' },
                                    { id: '1:1', label: 'Square', icon: '⬜', desc: 'Instagram' },
                                    { id: '16:9', label: 'Wide', icon: '🖥', desc: 'YouTube' }
                                ].map(r => (
                                    <button
                                        key={r.id}
                                        className={`ratio-pill ${aspectRatio === r.id ? 'active' : ''}`}
                                        onClick={() => setAspectRatio(r.id)}
                                    >
                                        <span className="ratio-icon">{r.icon}</span>
                                        <span className="ratio-label">{r.label}</span>
                                        <span className="ratio-desc">{r.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="caption-style-selector">
                            <label>Caption Style</label>
                            <div className="caption-pills">
                                {[
                                    { id: 'bold', label: 'Bold', preview: 'THE FUTURE' },
                                    { id: 'minimal', label: 'Minimal', preview: 'the future' },
                                    { id: 'colorful', label: 'Colorful', preview: 'The Future' },
                                    { id: 'karaoke', label: 'Karaoke', preview: 'The FUTURE' }
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        className={`caption-pill ${captionStyle === s.id ? 'active' : ''}`}
                                        onClick={() => setCaptionStyle(s.id)}
                                    >
                                        <span className={`caption-preview style-${s.id}`}>
                                            {s.preview}
                                        </span>
                                        <span className="caption-label">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Clips list */}
                    <div className="clips-grid">
                        {clips.map((clip, i) => (
                            <div
                                key={clip.id || i}
                                className={`clip-card ${selectedClip?.id === clip.id ? 'selected' : ''}`}
                                onClick={() => setSelectedClip(clip)}
                            >
                                <div className="clip-card-header">
                                    <span className="clip-number">Clip {i + 1}</span>
                                    <span className="clip-score" title="Engagement score">
                                        🔥 {clip.score || Math.round(clip.engagement_score * 100)}%
                                    </span>
                                </div>

                                <div className="clip-preview-text">
                                    "{clip.preview_text || clip.transcript_snippet}"
                                </div>

                                <div className="clip-meta">
                                    <span className="clip-time">
                                        {formatTime(clip.start)} — {formatTime(clip.end)}
                                    </span>
                                    <span className="clip-duration">
                                        {Math.round(clip.end - clip.start)}s
                                    </span>
                                </div>

                                <div className="clip-tags">
                                    {clip.reason && (
                                        <span className="clip-reason-tag">{clip.reason}</span>
                                    )}
                                    {clip.has_hook && (
                                        <span className="clip-tag hook">🎣 Strong hook</span>
                                    )}
                                    {clip.has_emotion && (
                                        <span className="clip-tag emotion">😊 Emotional</span>
                                    )}
                                    {clip.has_insight && (
                                        <span className="clip-tag insight">💡 Insightful</span>
                                    )}
                                </div>

                                <div className="clip-actions">
                                    <button
                                        className="btn-export-clip"
                                        onClick={(e) => { e.stopPropagation(); exportClip(clip); }}
                                        disabled={exportProgress?.clipId === clip.id}
                                    >
                                        {exportProgress?.clipId === clip.id
                                            ? `Exporting ${exportProgress.progress}%`
                                            : '📤 Export Clip'}
                                    </button>
                                    <button
                                        className="btn-edit-clip"
                                        onClick={(e) => { e.stopPropagation(); setSelectedClip(clip); }}
                                    >
                                        ✏️ Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Clip editor modal */}
                    {selectedClip && (
                        <div className="clip-editor-overlay" onClick={() => setSelectedClip(null)}>
                            <div className="clip-editor" onClick={e => e.stopPropagation()}>
                                <div className="clip-editor-header">
                                    <h4>Edit Clip</h4>
                                    <button className="btn-close" onClick={() => setSelectedClip(null)}>×</button>
                                </div>

                                <div className="clip-editor-body">
                                    {/* Waveform with draggable start/end markers */}
                                    <div className="clip-waveform-editor">
                                        <div className="waveform-placeholder">
                                            [Waveform with draggable boundaries]
                                        </div>
                                        <div className="clip-time-adjust">
                                            <div className="time-field">
                                                <label>Start</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={selectedClip.start}
                                                    onChange={e => setSelectedClip({
                                                        ...selectedClip,
                                                        start: parseFloat(e.target.value)
                                                    })}
                                                />
                                            </div>
                                            <div className="time-field">
                                                <label>End</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={selectedClip.end}
                                                    onChange={e => setSelectedClip({
                                                        ...selectedClip,
                                                        end: parseFloat(e.target.value)
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Caption text (editable) */}
                                    <div className="clip-caption-edit">
                                        <label>Caption Text</label>
                                        <textarea
                                            value={selectedClip.preview_text || selectedClip.transcript_snippet}
                                            onChange={e => setSelectedClip({
                                                ...selectedClip,
                                                preview_text: e.target.value
                                            })}
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="clip-editor-footer">
                                    <button className="btn-cancel" onClick={() => setSelectedClip(null)}>
                                        Cancel
                                    </button>
                                    <button className="btn-export-clip" onClick={() => exportClip(selectedClip)}>
                                        📤 Export This Clip
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Export all */}
                    <div className="clips-export-all">
                        <button
                            className="btn-export-all"
                            onClick={() => clips.forEach(c => exportClip(c))}
                        >
                            📦 Export All Clips ({clips.length})
                        </button>
                        <button className="btn-regenerate" onClick={generateClips}>
                            🔄 Regenerate
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};


// =============================================================================
// 8. STUDIO BRANDING
// =============================================================================
// Save brand assets (logo, colors, intro/outro audio) that auto-apply
// to every recording session

const StudioBranding = ({ brandSettings, onUpdate }) => {
    const [logo, setLogo] = useState(brandSettings?.logo_url || null);
    const [primaryColor, setPrimaryColor] = useState(brandSettings?.primary_color || '#00ffc8');
    const [secondaryColor, setSecondaryColor] = useState(brandSettings?.secondary_color || '#FF6600');
    const [introAudio, setIntroAudio] = useState(brandSettings?.intro_audio_url || null);
    const [outroAudio, setOutroAudio] = useState(brandSettings?.outro_audio_url || null);
    const [backgroundImage, setBackgroundImage] = useState(brandSettings?.background_url || null);
    const [showName, setShowName] = useState(brandSettings?.show_name || '');
    const [watermarkPosition, setWatermarkPosition] = useState(brandSettings?.watermark_position || 'bottom-right');
    const token = sessionStorage.getItem('token');

    const handleFileUpload = async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        try {
            const res = await fetch('/api/podcast-studio/upload-brand-asset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            return data.url;
        } catch (err) {
            console.error('Upload error:', err);
            return null;
        }
    };

    const saveBranding = async () => {
        const settings = {
            logo_url: logo,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            intro_audio_url: introAudio,
            outro_audio_url: outroAudio,
            background_url: backgroundImage,
            show_name: showName,
            watermark_position: watermarkPosition
        };

        try {
            await fetch('/api/podcast-studio/save-branding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });
            onUpdate?.(settings);
        } catch (err) {
            console.error('Save branding error:', err);
        }
    };

    return (
        <div className="studio-branding">
            <div className="branding-header">
                <h3>🎨 Studio Branding</h3>
                <p>Set once, apply to every session automatically</p>
            </div>

            <div className="branding-grid">
                {/* Logo Upload */}
                <div className="brand-section">
                    <label>Show Logo</label>
                    <div className="brand-upload-area">
                        {logo ? (
                            <div className="brand-preview">
                                <img src={logo} alt="Logo" className="logo-preview" />
                                <button className="btn-remove" onClick={() => setLogo(null)}>×</button>
                            </div>
                        ) : (
                            <label className="upload-drop-zone">
                                <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={async (e) => {
                                        const url = await handleFileUpload(e.target.files[0], 'logo');
                                        if (url) setLogo(url);
                                    }}
                                />
                                <span>📷 Upload Logo</span>
                                <small>PNG or SVG, max 2MB</small>
                            </label>
                        )}
                    </div>
                </div>

                {/* Colors */}
                <div className="brand-section">
                    <label>Brand Colors</label>
                    <div className="color-pickers">
                        <div className="color-field">
                            <span>Primary</span>
                            <input
                                type="color"
                                value={primaryColor}
                                onChange={e => setPrimaryColor(e.target.value)}
                            />
                            <span className="color-hex">{primaryColor}</span>
                        </div>
                        <div className="color-field">
                            <span>Secondary</span>
                            <input
                                type="color"
                                value={secondaryColor}
                                onChange={e => setSecondaryColor(e.target.value)}
                            />
                            <span className="color-hex">{secondaryColor}</span>
                        </div>
                    </div>
                </div>

                {/* Intro/Outro Audio */}
                <div className="brand-section">
                    <label>Intro Music</label>
                    <div className="brand-audio-upload">
                        {introAudio ? (
                            <div className="audio-preview">
                                <audio src={introAudio} controls className="brand-audio-player" />
                                <button className="btn-remove" onClick={() => setIntroAudio(null)}>×</button>
                            </div>
                        ) : (
                            <label className="upload-drop-zone small">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    hidden
                                    onChange={async (e) => {
                                        const url = await handleFileUpload(e.target.files[0], 'intro');
                                        if (url) setIntroAudio(url);
                                    }}
                                />
                                <span>🎵 Upload Intro</span>
                            </label>
                        )}
                    </div>
                </div>

                <div className="brand-section">
                    <label>Outro Music</label>
                    <div className="brand-audio-upload">
                        {outroAudio ? (
                            <div className="audio-preview">
                                <audio src={outroAudio} controls className="brand-audio-player" />
                                <button className="btn-remove" onClick={() => setOutroAudio(null)}>×</button>
                            </div>
                        ) : (
                            <label className="upload-drop-zone small">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    hidden
                                    onChange={async (e) => {
                                        const url = await handleFileUpload(e.target.files[0], 'outro');
                                        if (url) setOutroAudio(url);
                                    }}
                                />
                                <span>🎵 Upload Outro</span>
                            </label>
                        )}
                    </div>
                </div>

                {/* Show Name */}
                <div className="brand-section full-width">
                    <label>Show Name</label>
                    <input
                        type="text"
                        value={showName}
                        onChange={e => setShowName(e.target.value)}
                        placeholder="My Awesome Podcast"
                        className="brand-text-input"
                    />
                </div>

                {/* Watermark Position */}
                <div className="brand-section">
                    <label>Logo Position (Video)</label>
                    <div className="watermark-positions">
                        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                            <button
                                key={pos}
                                className={`pos-btn ${watermarkPosition === pos ? 'active' : ''}`}
                                onClick={() => setWatermarkPosition(pos)}
                            >
                                <div className={`pos-preview ${pos}`}>
                                    <div className="pos-dot" />
                                </div>
                                <span>{pos.replace('-', ' ')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="branding-preview">
                <div
                    className="preview-card"
                    style={{
                        borderColor: primaryColor,
                        background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)`
                    }}
                >
                    {logo && <img src={logo} alt="Logo" className="preview-logo" />}
                    <span className="preview-show-name" style={{ color: primaryColor }}>
                        {showName || 'Your Show Name'}
                    </span>
                    <span className="preview-episode">Episode 42 — Preview</span>
                </div>
            </div>

            <button className="btn-save-branding" onClick={saveBranding}>
                💾 Save Branding
            </button>
        </div>
    );
};


// =============================================================================
// 9. ASYNC RECORDING
// =============================================================================
// Host sends a recording link — guest records on their own time
// Guest doesn't need to be online at the same time as host

const AsyncRecording = ({ onCreateLink, existingLinks = [] }) => {
    const [guestName, setGuestName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [maxDuration, setMaxDuration] = useState(300); // 5 min default
    const [deadline, setDeadline] = useState('');
    const [links, setLinks] = useState(existingLinks);
    const [isCreating, setIsCreating] = useState(false);
    const token = sessionStorage.getItem('token');

    const createAsyncLink = async () => {
        setIsCreating(true);
        try {
            const res = await fetch('/api/podcast-studio/create-async-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    guest_name: guestName,
                    prompt: prompt,
                    max_duration_seconds: maxDuration,
                    deadline: deadline || null
                })
            });
            const data = await res.json();
            setLinks(prev => [...prev, data]);
            setGuestName('');
            setPrompt('');
            onCreateLink?.(data);
        } catch (err) {
            console.error('Create async link error:', err);
        }
        setIsCreating(false);
    };

    const copyLink = (url) => {
        navigator.clipboard.writeText(url);
    };

    return (
        <div className="async-recording">
            <div className="async-header">
                <h3>📩 Async Recording</h3>
                <p>Send a link — your guest records whenever they want</p>
            </div>

            <div className="async-create">
                <div className="async-field">
                    <label>Guest Name</label>
                    <input
                        type="text"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="Sarah Johnson"
                    />
                </div>

                <div className="async-field">
                    <label>Recording Prompt (shown to guest)</label>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Please share your thoughts on AI in education. Speak naturally for 3-5 minutes."
                        rows={3}
                    />
                </div>

                <div className="async-row">
                    <div className="async-field">
                        <label>Max Duration</label>
                        <select value={maxDuration} onChange={e => setMaxDuration(Number(e.target.value))}>
                            <option value={60}>1 minute</option>
                            <option value={120}>2 minutes</option>
                            <option value={300}>5 minutes</option>
                            <option value={600}>10 minutes</option>
                            <option value={1800}>30 minutes</option>
                            <option value={3600}>1 hour</option>
                        </select>
                    </div>

                    <div className="async-field">
                        <label>Deadline (optional)</label>
                        <input
                            type="datetime-local"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    className="btn-create-link"
                    onClick={createAsyncLink}
                    disabled={!guestName || isCreating}
                >
                    {isCreating ? 'Creating...' : '🔗 Create Recording Link'}
                </button>
            </div>

            {/* Existing async links */}
            {links.length > 0 && (
                <div className="async-links">
                    <h4>Sent Recording Links</h4>
                    {links.map((link, i) => (
                        <div key={link.id || i} className="async-link-card">
                            <div className="link-info">
                                <span className="link-guest">{link.guest_name}</span>
                                <span className={`link-status status-${link.status || 'pending'}`}>
                                    {link.status === 'completed' ? '✅ Recorded' :
                                        link.status === 'viewed' ? '👁 Viewed' : '⏳ Pending'}
                                </span>
                            </div>
                            <div className="link-actions">
                                <button
                                    className="btn-copy-link"
                                    onClick={() => copyLink(link.url)}
                                >
                                    📋 Copy Link
                                </button>
                                {link.status === 'completed' && (
                                    <button className="btn-download-recording">
                                        ⬇️ Download
                                    </button>
                                )}
                            </div>
                            {link.deadline && (
                                <span className="link-deadline">
                                    Due: {new Date(link.deadline).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Async Recording Guest Page (standalone page at /podcast-async/:linkId)
const AsyncGuestRecordPage = () => {
    const [linkData, setLinkData] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [duration, setDuration] = useState(0);
    const recorderRef = useRef(null);
    const timerRef = useRef(null);

    // Get link ID from URL
    const linkId = window.location.pathname.split('/').pop();

    useEffect(() => {
        // Fetch link details
        fetch(`/api/podcast-studio/async-link/${linkId}`)
            .then(r => r.json())
            .then(data => setLinkData(data))
            .catch(err => console.error(err));
    }, [linkId]);

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { sampleRate: 48000, channelCount: 1 }
        });

        // Import WAV engine from Phase 1
        const { WAVRecordingEngine } = await import('./PodcastStudioPhase1');
        recorderRef.current = new WAVRecordingEngine(stream, {
            sampleRate: 48000,
            bitDepth: 24
        });

        await recorderRef.current.start();
        setIsRecording(true);
        setDuration(0);

        timerRef.current = setInterval(() => {
            setDuration(prev => {
                const next = prev + 1;
                // Auto-stop at max duration
                if (linkData?.max_duration_seconds && next >= linkData.max_duration_seconds) {
                    stopRecording();
                }
                return next;
            });
        }, 1000);
    };

    const stopRecording = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (recorderRef.current) {
            const blob = recorderRef.current.stop();
            setRecordedBlob(blob);
        }
        setIsRecording(false);
    };

    const uploadRecording = async () => {
        if (!recordedBlob) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append('audio', recordedBlob, 'async_recording.wav');
        formData.append('link_id', linkId);
        formData.append('duration', duration);

        try {
            const res = await fetch('/api/podcast-studio/upload-async-recording', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                setUploadComplete(true);
            }
        } catch (err) {
            console.error('Upload error:', err);
        }
        setIsUploading(false);
    };

    if (!linkData) {
        return <div className="async-guest-loading">Loading...</div>;
    }

    if (uploadComplete) {
        return (
            <div className="async-guest-complete">
                <div className="complete-icon">✅</div>
                <h2>Recording Submitted!</h2>
                <p>Thank you, {linkData.guest_name}. Your recording has been sent to the host.</p>
            </div>
        );
    }

    return (
        <div className="async-guest-page">
            <div className="async-guest-header">
                <h2>🎙 Record for {linkData.host_name}'s Podcast</h2>
                {linkData.show_name && (
                    <p className="show-name">{linkData.show_name}</p>
                )}
            </div>

            {linkData.prompt && (
                <div className="async-prompt">
                    <h3>Recording Prompt</h3>
                    <p>{linkData.prompt}</p>
                </div>
            )}

            <div className="async-recorder">
                <div className="recorder-timer">
                    {formatTime(duration)}
                    {linkData.max_duration_seconds && (
                        <span className="max-duration">
                            / {formatTime(linkData.max_duration_seconds)}
                        </span>
                    )}
                </div>

                {!isRecording && !recordedBlob && (
                    <button className="btn-start-record" onClick={startRecording}>
                        🔴 Start Recording
                    </button>
                )}

                {isRecording && (
                    <button className="btn-stop-record" onClick={stopRecording}>
                        ⏹ Stop Recording
                    </button>
                )}

                {recordedBlob && !isRecording && (
                    <div className="recorder-review">
                        <audio
                            src={URL.createObjectURL(recordedBlob)}
                            controls
                            className="review-player"
                        />
                        <div className="review-actions">
                            <button className="btn-re-record" onClick={() => {
                                setRecordedBlob(null);
                                setDuration(0);
                            }}>
                                🔄 Re-record
                            </button>
                            <button
                                className="btn-submit-recording"
                                onClick={uploadRecording}
                                disabled={isUploading}
                            >
                                {isUploading ? 'Uploading...' : '📤 Submit Recording'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// =============================================================================
// 10. TELEPROMPTER
// =============================================================================
// Scrolling script overlay during recording

const Teleprompter = ({ isVisible, onClose }) => {
    const [script, setScript] = useState('');
    const [isScrolling, setIsScrolling] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(2); // 1-5
    const [fontSize, setFontSize] = useState(28);
    const [opacity, setOpacity] = useState(0.9);
    const [mirrorMode, setMirrorMode] = useState(false);
    const scrollRef = useRef(null);
    const animRef = useRef(null);

    const startScroll = () => {
        setIsScrolling(true);
        const scrollElement = scrollRef.current;
        if (!scrollElement) return;

        const pixelsPerFrame = scrollSpeed * 0.5;

        const scroll = () => {
            scrollElement.scrollTop += pixelsPerFrame;

            // Stop when we reach the end
            if (scrollElement.scrollTop >= scrollElement.scrollHeight - scrollElement.clientHeight) {
                setIsScrolling(false);
                return;
            }

            animRef.current = requestAnimationFrame(scroll);
        };
        animRef.current = requestAnimationFrame(scroll);
    };

    const stopScroll = () => {
        setIsScrolling(false);
        if (animRef.current) cancelAnimationFrame(animRef.current);
    };

    const resetScroll = () => {
        stopScroll();
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    };

    useEffect(() => {
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div className="teleprompter-overlay" style={{ opacity }}>
            <div className="teleprompter-controls">
                <div className="tp-control-group">
                    <button
                        className={`tp-btn ${isScrolling ? 'active' : ''}`}
                        onClick={isScrolling ? stopScroll : startScroll}
                    >
                        {isScrolling ? '⏸ Pause' : '▶ Scroll'}
                    </button>
                    <button className="tp-btn" onClick={resetScroll}>⏮ Reset</button>
                </div>

                <div className="tp-control-group">
                    <label>Speed</label>
                    <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        value={scrollSpeed}
                        onChange={e => setScrollSpeed(Number(e.target.value))}
                    />
                    <span>{scrollSpeed}x</span>
                </div>

                <div className="tp-control-group">
                    <label>Size</label>
                    <input
                        type="range"
                        min="18"
                        max="48"
                        value={fontSize}
                        onChange={e => setFontSize(Number(e.target.value))}
                    />
                    <span>{fontSize}px</span>
                </div>

                <div className="tp-control-group">
                    <label>Opacity</label>
                    <input
                        type="range"
                        min="0.3"
                        max="1"
                        step="0.1"
                        value={opacity}
                        onChange={e => setOpacity(Number(e.target.value))}
                    />
                </div>

                <button
                    className={`tp-btn ${mirrorMode ? 'active' : ''}`}
                    onClick={() => setMirrorMode(!mirrorMode)}
                    title="Mirror mode (for external monitors)"
                >
                    🪞
                </button>

                <button className="tp-btn close" onClick={onClose}>×</button>
            </div>

            {!script ? (
                <div className="teleprompter-input">
                    <textarea
                        placeholder="Paste your script here..."
                        onChange={e => setScript(e.target.value)}
                        rows={15}
                        className="tp-textarea"
                    />
                    <button
                        className="btn-load-script"
                        onClick={() => {}} // Script is already set via onChange
                        disabled={!script}
                    >
                        Load Script
                    </button>
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="teleprompter-content"
                    style={{
                        fontSize: `${fontSize}px`,
                        transform: mirrorMode ? 'scaleX(-1)' : 'none'
                    }}
                >
                    {/* Top fade gradient */}
                    <div className="tp-fade-top" />

                    <div className="tp-text">
                        {script.split('\n').map((line, i) => (
                            <p key={i} className="tp-line">{line || '\u00A0'}</p>
                        ))}
                    </div>

                    {/* Center reading line */}
                    <div className="tp-reading-line" />

                    {/* Bottom fade gradient */}
                    <div className="tp-fade-bottom" />
                </div>
            )}
        </div>
    );
};


// =============================================================================
// HELPER: Format seconds to MM:SS
// =============================================================================
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}


// =============================================================================
// EXPORT ALL PHASE 2 COMPONENTS
// =============================================================================

export {
    VideoRecordingEngine,
    VideoQualitySelector,
    MagicClips,
    StudioBranding,
    AsyncRecording,
    AsyncGuestRecordPage,
    Teleprompter
};