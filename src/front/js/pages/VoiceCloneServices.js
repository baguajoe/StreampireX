// =============================================================================
// VoiceCloneServices.js — AI Voice Clone Services Hub
// =============================================================================
// Location: src/front/js/pages/VoiceCloneServices.js
// Route: /voice-services
//
// 6 Services:
//   1. Podcast Intros/Outros
//   2. Video Narration
//   3. Live Stream Alerts
//   4. Fan Shoutouts
//   5. Story/Reel Narration
//   6. Course/Tutorial Audio
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/VoiceCloneServices.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const VoiceCloneServices = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Voice status
  const [voiceStatus, setVoiceStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Voice usage tracking (which services have been used)
  const [voiceUsage, setVoiceUsage] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('spx_voice_usage') || '{}');
    } catch { return {}; }
  });

  // Active service tab
  const [activeService, setActiveService] = useState('podcast');

  // Shared state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resultAudio, setResultAudio] = useState(null);
  const [resultScript, setResultScript] = useState('');
  const audioRef = useRef(null);

  // ---- Podcast State ----
  const [podcastType, setPodcastType] = useState('intro');
  const [podcastStyle, setPodcastStyle] = useState('casual');
  const [showName, setShowName] = useState('');
  const [hostName, setHostName] = useState('');
  const [podcastTopic, setPodcastTopic] = useState('');
  const [podcastCustomScript, setPodcastCustomScript] = useState('');
  const [usePodcastCustom, setUsePodcastCustom] = useState(false);

  // ---- Narration State ----
  const [narrationScript, setNarrationScript] = useState('');
  const [narrationTitle, setNarrationTitle] = useState('');

  // ---- Stream Alert State ----
  const [alertType, setAlertType] = useState('tip');
  const [alertTone, setAlertTone] = useState('default');
  const [alertUsername, setAlertUsername] = useState('');
  const [alertAmount, setAlertAmount] = useState('');
  const [alertCustom, setAlertCustom] = useState('');
  const [useAlertCustom, setUseAlertCustom] = useState(false);
  const [pregeneratedAlerts, setPregeneratedAlerts] = useState(null);

  // ---- Shoutout State ----
  const [fanName, setFanName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [shoutoutMessage, setShoutoutMessage] = useState('');
  const [shoutoutType, setShoutoutType] = useState('greeting');

  // ---- Story Narration State ----
  const [storyScript, setStoryScript] = useState('');
  const [storyContentType, setStoryContentType] = useState('story');

  // ---- Course State ----
  const [courseScript, setCourseScript] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [courseName, setCourseName] = useState('');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Fetch voice status
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchVoiceStatus();
  }, [token]);

  const fetchVoiceStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/voice/status`, { headers });
      if (res.ok) {
        const data = await res.json();
        setVoiceStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch voice status:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResultAudio(null);
    setResultScript('');
    setError('');
    setSuccess('');
  };

  const markServiceUsed = (serviceId) => {
    setVoiceUsage(prev => {
      const updated = { ...prev, [serviceId]: { used: true, lastUsed: new Date().toISOString() } };
      localStorage.setItem('spx_voice_usage', JSON.stringify(updated));
      return updated;
    });
  };

  // =====================================================
  // API CALLS
  // =====================================================

  const generatePodcast = async () => {
    setGenerating(true);
    clearResults();
    try {
      const body = {
        show_name: showName || 'my podcast',
        host_name: hostName || 'your host',
        topic: podcastTopic || 'something amazing',
        style: podcastStyle,
      };
      if (usePodcastCustom && podcastCustomScript.trim()) {
        body.custom_script = podcastCustomScript;
      }
      const endpoint = podcastType === 'intro' ? '/api/voice/podcast/intro' : '/api/voice/podcast/outro';
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResultAudio(data.audio_url);
      setResultScript(data.script);
      setSuccess(data.message);
      markServiceUsed('podcast');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateNarration = async () => {
    setGenerating(true);
    clearResults();
    try {
      const res = await fetch(`${BACKEND_URL}/api/voice/narration`, {
        method: 'POST', headers,
        body: JSON.stringify({ script: narrationScript, title: narrationTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResultAudio(data.audio_url);
      setResultScript(data.script);
      setSuccess(data.message);
      markServiceUsed('narration');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateStreamAlert = async () => {
    setGenerating(true);
    clearResults();
    try {
      const body = {
        alert_type: alertType,
        tone: alertTone,
        username: alertUsername || 'StreamFan42',
        amount: alertAmount || '$5',
      };
      if (useAlertCustom && alertCustom.trim()) {
        body.custom_message = alertCustom;
      }
      const res = await fetch(`${BACKEND_URL}/api/voice/stream-alert`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResultAudio(data.audio_url);
      setResultScript(data.script);
      setSuccess(data.message);
      markServiceUsed('alerts');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const pregenerateAlerts = async () => {
    setGenerating(true);
    clearResults();
    try {
      const res = await fetch(`${BACKEND_URL}/api/voice/stream-alert/pregenerate`, {
        method: 'POST', headers,
        body: JSON.stringify({ tone: alertTone, test_username: alertUsername || 'StreamFan42', test_amount: alertAmount || '$5' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPregeneratedAlerts(data.alerts);
      setSuccess(data.message);
      markServiceUsed('alerts');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateShoutout = async () => {
    setGenerating(true);
    clearResults();
    try {
      const res = await fetch(`${BACKEND_URL}/api/voice/shoutout`, {
        method: 'POST', headers,
        body: JSON.stringify({
          fan_name: fanName || 'fan',
          creator_name: creatorName || 'me',
          message: shoutoutMessage,
          type: shoutoutType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResultAudio(data.audio_url);
      setResultScript(data.script);
      setSuccess(data.message);
      markServiceUsed('shoutouts');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateStoryNarration = async () => {
    setGenerating(true);
    clearResults();
    try {
      const res = await fetch(`${BACKEND_URL}/api/voice/story-narration`, {
        method: 'POST', headers,
        body: JSON.stringify({ script: storyScript, content_type: storyContentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResultAudio(data.audio_url);
      setResultScript(data.script);
      setSuccess(data.message);
      markServiceUsed('stories');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateCourseAudio = async () => {
    setGenerating(true);
    clearResults();
    try {
      const res = await fetch(`${BACKEND_URL}/api/voice/course/lesson`, {
        method: 'POST', headers,
        body: JSON.stringify({
          script: courseScript,
          title: lessonTitle || 'Lesson',
          course_name: courseName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (data.parts) {
        setResultAudio(data.parts[0]?.audio_url);
        setResultScript(`Part 1 & Part 2 generated (${data.total_duration}s total)`);
      } else {
        setResultAudio(data.audio_url);
        setResultScript(data.script);
      }
      setSuccess(data.message);
      markServiceUsed('courses');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // =====================================================
  // SERVICE DEFINITIONS
  // =====================================================

  const services = [
    { id: 'podcast', icon: '🎙️', label: 'Podcast', desc: 'Intros & Outros' },
    { id: 'narration', icon: '🎬', label: 'Narration', desc: 'Video Voiceover' },
    { id: 'alerts', icon: '🔴', label: 'Alerts', desc: 'Stream Alerts' },
    { id: 'shoutouts', icon: '🎤', label: 'Shoutouts', desc: 'Fan Messages' },
    { id: 'stories', icon: '📱', label: 'Stories', desc: 'Story/Reel VO' },
    { id: 'courses', icon: '📚', label: 'Courses', desc: 'Lesson Audio' },
  ];

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) {
    return (
      <div className="vcs-page">
        <div className="vcs-loading">
          <div className="vcs-spinner"></div>
          <p>Loading voice services...</p>
        </div>
      </div>
    );
  }

  const hasVoice = voiceStatus?.has_cloned_voice;

  return (
    <div className="vcs-page">
      {/* Header */}
      <div className="vcs-header">
        <h1>🎤 AI Voice Clone Services</h1>
        <p className="vcs-subtitle">
          Use your cloned voice across the entire platform — podcasts, videos, streams, and more.
        </p>
        {hasVoice && (
          <div className="vcs-voice-badge">
            <span className="vcs-voice-dot"></span>
            Voice Active: <strong>{voiceStatus.voice_name}</strong>
          </div>
        )}
      </div>

      {/* No Voice Warning */}
      {!hasVoice && (
        <div className="vcs-no-voice">
          <span className="vcs-no-voice-icon">🎤</span>
          <div>
            <h3>Clone Your Voice First</h3>
            <p>
              Record or upload a voice sample in the AI Radio DJ settings to enable all voice services.
            </p>
            <button className="vcs-go-clone-btn" onClick={() => navigate('/ai-radio-dj')}>
              Go to AI Radio DJ → Voice Tab
            </button>
          </div>
        </div>
      )}

      {/* Voice Usage Dashboard */}
      {hasVoice && (
        <div className="vcs-usage-dashboard">
          <h3 className="vcs-usage-title">Your Voice Is Active In</h3>
          <div className="vcs-usage-grid">
            {[
              { id: 'radio_dj', icon: '📻', label: 'Radio DJ', desc: '24/7 AI DJ talk breaks', alwaysActive: true },
              { id: 'podcast', icon: '🎙️', label: 'Podcast Intros', desc: 'Auto-generated intros & outros' },
              { id: 'narration', icon: '🎬', label: 'Video Narration', desc: 'Voiceover for videos' },
              { id: 'alerts', icon: '🔴', label: 'Stream Alerts', desc: 'Tips, subs & raid alerts' },
              { id: 'shoutouts', icon: '🎤', label: 'Fan Shoutouts', desc: 'Personalized messages' },
              { id: 'stories', icon: '📱', label: 'Story & Reel VO', desc: 'Short-form narration' },
              { id: 'courses', icon: '📚', label: 'Course Audio', desc: 'Lesson narration' },
            ].map(svc => {
              const isActive = svc.alwaysActive || voiceUsage[svc.id]?.used;
              return (
                <div
                  key={svc.id}
                  className={`vcs-usage-card ${isActive ? 'active' : 'inactive'}`}
                  onClick={() => {
                    if (!svc.alwaysActive) {
                      setActiveService(svc.id);
                      clearResults();
                      document.querySelector('.vcs-service-tabs')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <div className="vcs-usage-icon-row">
                    <span className="vcs-usage-icon">{svc.icon}</span>
                    <span className={`vcs-usage-status ${isActive ? 'on' : 'off'}`}>
                      {isActive ? '✅' : '⚪'}
                    </span>
                  </div>
                  <span className="vcs-usage-label">{svc.label}</span>
                  <span className="vcs-usage-desc">{svc.desc}</span>
                  {!isActive && (
                    <span className="vcs-usage-cta">Set up →</span>
                  )}
                  {isActive && !svc.alwaysActive && voiceUsage[svc.id]?.lastUsed && (
                    <span className="vcs-usage-last">
                      Last: {new Date(voiceUsage[svc.id].lastUsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="vcs-usage-summary">
            <span className="vcs-usage-count">
              {1 + Object.values(voiceUsage).filter(v => v.used).length} / 7 services active
            </span>
          </div>
        </div>
      )}

      {/* Service Tabs */}
      <div className="vcs-service-tabs">
        {services.map(s => (
          <button
            key={s.id}
            className={`vcs-service-tab ${activeService === s.id ? 'active' : ''}`}
            onClick={() => { setActiveService(s.id); clearResults(); }}
          >
            <span className="vcs-tab-icon">{s.icon}</span>
            <span className="vcs-tab-label">{s.label}</span>
            <span className="vcs-tab-desc">{s.desc}</span>
          </button>
        ))}
      </div>

      {/* Service Content */}
      <div className="vcs-content">

        {/* ======== PODCAST ======== */}
        {activeService === 'podcast' && (
          <div className="vcs-service-panel">
            <h2>🎙️ Podcast Intros & Outros</h2>
            <p className="vcs-panel-desc">
              Generate professional podcast intros and outros in your voice. Choose a template or write your own script.
            </p>

            <div className="vcs-toggle-row">
              <button className={`vcs-toggle-btn ${podcastType === 'intro' ? 'active' : ''}`}
                onClick={() => setPodcastType('intro')}>Intro</button>
              <button className={`vcs-toggle-btn ${podcastType === 'outro' ? 'active' : ''}`}
                onClick={() => setPodcastType('outro')}>Outro</button>
            </div>

            <div className="vcs-form-grid">
              <div className="vcs-field">
                <label>Show Name</label>
                <input type="text" value={showName} onChange={e => setShowName(e.target.value)}
                  placeholder="The Creator Show" maxLength={100} />
              </div>
              <div className="vcs-field">
                <label>Host Name</label>
                <input type="text" value={hostName} onChange={e => setHostName(e.target.value)}
                  placeholder="Your name" maxLength={50} />
              </div>
              {podcastType === 'intro' && (
                <div className="vcs-field full">
                  <label>Episode Topic</label>
                  <input type="text" value={podcastTopic} onChange={e => setPodcastTopic(e.target.value)}
                    placeholder="how to grow your audience in 2026" maxLength={200} />
                </div>
              )}
              <div className="vcs-field">
                <label>Style</label>
                <select value={podcastStyle} onChange={e => setPodcastStyle(e.target.value)}>
                  <option value="casual">😎 Casual</option>
                  <option value="professional">💼 Professional</option>
                  <option value="energetic">⚡ Energetic</option>
                  {podcastType === 'intro' && <option value="storytelling">📖 Storytelling</option>}
                  {podcastType === 'intro' && <option value="interview">🎤 Interview</option>}
                  {podcastType === 'outro' && <option value="call_to_action">📣 Call to Action</option>}
                </select>
              </div>
            </div>

            <div className="vcs-custom-toggle">
              <label>
                <input type="checkbox" checked={usePodcastCustom} onChange={e => setUsePodcastCustom(e.target.checked)} />
                Write custom script instead
              </label>
            </div>

            {usePodcastCustom && (
              <div className="vcs-field full">
                <textarea value={podcastCustomScript} onChange={e => setPodcastCustomScript(e.target.value)}
                  placeholder="Write your own intro/outro script..." rows={4} maxLength={2000} />
                <span className="vcs-char-count">{podcastCustomScript.length}/2000</span>
              </div>
            )}

            <button className="vcs-generate-btn" onClick={generatePodcast}
              disabled={generating || !hasVoice}>
              {generating ? '⏳ Generating...' : `🎙️ Generate ${podcastType === 'intro' ? 'Intro' : 'Outro'}`}
            </button>
          </div>
        )}

        {/* ======== NARRATION ======== */}
        {activeService === 'narration' && (
          <div className="vcs-service-panel">
            <h2>🎬 Video Narration / Voiceover</h2>
            <p className="vcs-panel-desc">
              Write a script and generate a voiceover track in your voice. Import the audio into the Video Editor.
            </p>

            <div className="vcs-field">
              <label>Title (optional)</label>
              <input type="text" value={narrationTitle} onChange={e => setNarrationTitle(e.target.value)}
                placeholder="Intro voiceover" maxLength={100} />
            </div>
            <div className="vcs-field full">
              <label>Narration Script</label>
              <textarea value={narrationScript} onChange={e => setNarrationScript(e.target.value)}
                placeholder="Write your voiceover script here. This will be read in your cloned voice..."
                rows={8} maxLength={5000} />
              <span className="vcs-char-count">{narrationScript.length}/5,000 (~{Math.round(narrationScript.length / 750)} min)</span>
            </div>

            <button className="vcs-generate-btn" onClick={generateNarration}
              disabled={generating || !hasVoice || !narrationScript.trim()}>
              {generating ? '⏳ Generating...' : '🎬 Generate Voiceover'}
            </button>
          </div>
        )}

        {/* ======== STREAM ALERTS ======== */}
        {activeService === 'alerts' && (
          <div className="vcs-service-panel">
            <h2>🔴 Live Stream Alerts</h2>
            <p className="vcs-panel-desc">
              When someone tips, subscribes, or raids, play an alert in YOUR voice instead of generic sounds.
            </p>

            <div className="vcs-form-grid">
              <div className="vcs-field">
                <label>Alert Type</label>
                <select value={alertType} onChange={e => setAlertType(e.target.value)}>
                  <option value="tip">💰 Tip</option>
                  <option value="subscribe">⭐ Subscribe</option>
                  <option value="follow">➕ Follow</option>
                  <option value="raid">🎯 Raid</option>
                  <option value="gift_sub">🎁 Gift Sub</option>
                </select>
              </div>
              <div className="vcs-field">
                <label>Tone</label>
                <select value={alertTone} onChange={e => setAlertTone(e.target.value)}>
                  <option value="default">🎵 Default</option>
                  <option value="hype">🔥 Hype</option>
                  <option value="chill">😌 Chill</option>
                </select>
              </div>
              <div className="vcs-field">
                <label>Username (test)</label>
                <input type="text" value={alertUsername} onChange={e => setAlertUsername(e.target.value)}
                  placeholder="StreamFan42" maxLength={30} />
              </div>
              <div className="vcs-field">
                <label>Amount (test)</label>
                <input type="text" value={alertAmount} onChange={e => setAlertAmount(e.target.value)}
                  placeholder="$5" maxLength={20} />
              </div>
            </div>

            <div className="vcs-custom-toggle">
              <label>
                <input type="checkbox" checked={useAlertCustom} onChange={e => setUseAlertCustom(e.target.checked)} />
                Write custom alert message
              </label>
            </div>

            {useAlertCustom && (
              <div className="vcs-field full">
                <textarea value={alertCustom} onChange={e => setAlertCustom(e.target.value)}
                  placeholder="Custom alert message..." rows={2} maxLength={500} />
              </div>
            )}

            <div className="vcs-btn-row">
              <button className="vcs-generate-btn" onClick={generateStreamAlert}
                disabled={generating || !hasVoice}>
                {generating ? '⏳ Generating...' : '🔴 Generate Alert'}
              </button>
              <button className="vcs-secondary-btn" onClick={pregenerateAlerts}
                disabled={generating || !hasVoice}>
                ⚡ Pre-Generate All 5 Alert Types
              </button>
            </div>

            {/* Pre-generated alerts grid */}
            {pregeneratedAlerts && (
              <div className="vcs-pregen-grid">
                <h4>Pre-Generated Alerts</h4>
                {Object.entries(pregeneratedAlerts).map(([type, alert]) => (
                  <div key={type} className="vcs-pregen-item">
                    <span className="vcs-pregen-type">
                      {type === 'tip' && '💰'}{type === 'subscribe' && '⭐'}{type === 'follow' && '➕'}
                      {type === 'raid' && '🎯'}{type === 'gift_sub' && '🎁'} {type.replace('_', ' ')}
                    </span>
                    {alert.audio_url && (
                      <audio controls src={alert.audio_url} className="vcs-pregen-audio" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======== SHOUTOUTS ======== */}
        {activeService === 'shoutouts' && (
          <div className="vcs-service-panel">
            <h2>🎤 Fan Shoutouts</h2>
            <p className="vcs-panel-desc">
              Generate personalized voice messages for fans. Perfect for paid shoutouts, birthday wishes, and thank you messages.
            </p>

            <div className="vcs-form-grid">
              <div className="vcs-field">
                <label>Fan's Name</label>
                <input type="text" value={fanName} onChange={e => setFanName(e.target.value)}
                  placeholder="Alex" maxLength={50} />
              </div>
              <div className="vcs-field">
                <label>Your Name (as creator)</label>
                <input type="text" value={creatorName} onChange={e => setCreatorName(e.target.value)}
                  placeholder="Your name" maxLength={50} />
              </div>
              <div className="vcs-field">
                <label>Shoutout Type</label>
                <select value={shoutoutType} onChange={e => setShoutoutType(e.target.value)}>
                  <option value="greeting">👋 Greeting</option>
                  <option value="birthday">🎂 Birthday</option>
                  <option value="thank_you">🙏 Thank You</option>
                  <option value="motivational">💪 Motivational</option>
                  <option value="custom">✏️ Custom</option>
                </select>
              </div>
            </div>

            <div className="vcs-field full">
              <label>Personal Message (optional)</label>
              <textarea value={shoutoutMessage} onChange={e => setShoutoutMessage(e.target.value)}
                placeholder="Add a personal touch to the shoutout..." rows={3} maxLength={500} />
            </div>

            <button className="vcs-generate-btn" onClick={generateShoutout}
              disabled={generating || !hasVoice}>
              {generating ? '⏳ Generating...' : '🎤 Generate Shoutout'}
            </button>
          </div>
        )}

        {/* ======== STORIES ======== */}
        {activeService === 'stories' && (
          <div className="vcs-service-panel">
            <h2>📱 Story & Reel Narration</h2>
            <p className="vcs-panel-desc">
              Add voiceover narration to your stories and reels in your own voice.
            </p>

            <div className="vcs-toggle-row">
              <button className={`vcs-toggle-btn ${storyContentType === 'story' ? 'active' : ''}`}
                onClick={() => setStoryContentType('story')}>📸 Story (60s)</button>
              <button className={`vcs-toggle-btn ${storyContentType === 'reel' ? 'active' : ''}`}
                onClick={() => setStoryContentType('reel')}>🎞️ Reel (3 min)</button>
            </div>

            <div className="vcs-field full">
              <label>Narration Script</label>
              <textarea value={storyScript} onChange={e => setStoryScript(e.target.value)}
                placeholder={storyContentType === 'story'
                  ? "Keep it short — max ~60 seconds of speech..."
                  : "Write your reel narration — up to ~3 minutes..."}
                rows={4}
                maxLength={storyContentType === 'story' ? 750 : 2250} />
              <span className="vcs-char-count">
                {storyScript.length}/{storyContentType === 'story' ? '750' : '2,250'}
                (~{Math.round(storyScript.length / 750 * 60)}s)
              </span>
            </div>

            <button className="vcs-generate-btn" onClick={generateStoryNarration}
              disabled={generating || !hasVoice || !storyScript.trim()}>
              {generating ? '⏳ Generating...' : `📱 Generate ${storyContentType === 'story' ? 'Story' : 'Reel'} Narration`}
            </button>
          </div>
        )}

        {/* ======== COURSES ======== */}
        {activeService === 'courses' && (
          <div className="vcs-service-panel">
            <h2>📚 Course & Tutorial Audio</h2>
            <p className="vcs-panel-desc">
              Generate lesson audio from text scripts. Sell courses with professional narration in your voice.
            </p>

            <div className="vcs-form-grid">
              <div className="vcs-field">
                <label>Course Name</label>
                <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)}
                  placeholder="My Online Course" maxLength={100} />
              </div>
              <div className="vcs-field">
                <label>Lesson Title</label>
                <input type="text" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)}
                  placeholder="Introduction to Beatmaking" maxLength={100} />
              </div>
            </div>

            <div className="vcs-field full">
              <label>Lesson Script</label>
              <textarea value={courseScript} onChange={e => setCourseScript(e.target.value)}
                placeholder="Write your lesson content here. This will be narrated in your voice. For long lessons, the audio will be split into parts automatically..."
                rows={10} maxLength={10000} />
              <span className="vcs-char-count">
                {courseScript.length}/10,000 (~{Math.round(courseScript.length / 750)} min)
              </span>
            </div>

            <button className="vcs-generate-btn" onClick={generateCourseAudio}
              disabled={generating || !hasVoice || !courseScript.trim()}>
              {generating ? '⏳ Generating...' : '📚 Generate Lesson Audio'}
            </button>
          </div>
        )}

        {/* ======== RESULT PLAYER ======== */}
        {(resultAudio || error || success) && (
          <div className="vcs-result">
            {error && <div className="vcs-error">❌ {error}</div>}
            {success && <div className="vcs-success">✅ {success}</div>}
            {resultAudio && (
              <div className="vcs-audio-result">
                <audio ref={audioRef} controls src={resultAudio} />
                <div className="vcs-result-actions">
                  <a href={resultAudio} download className="vcs-download-btn">
                    ⬇️ Download Audio
                  </a>
                  <button className="vcs-copy-btn" onClick={() => {
                    navigator.clipboard.writeText(resultAudio);
                    setSuccess('Audio URL copied!');
                  }}>
                    📋 Copy URL
                  </button>
                </div>
                {resultScript && (
                  <details className="vcs-script-details">
                    <summary>View Script</summary>
                    <p>{resultScript}</p>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCloneServices;