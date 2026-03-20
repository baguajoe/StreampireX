import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TipJar from "../component/TipJar";
import UniversalSocialShare from "../component/UniversalSocialShare";
import "../../styles/PodcastDetailPage.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

const PodcastDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const podRes = await fetch(`${BACKEND}/api/podcasts/${id}`, {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) }
        });
        if (!podRes.ok) throw new Error("Podcast not found");
        const podData = await podRes.json();
        setPodcast(podData);
        const epRes = await fetch(`${BACKEND}/api/podcast/${id}/episodes`, {
          headers: { ...(token && { Authorization: `Bearer ${token}` }) }
        });
        if (epRes.ok) {
          const epData = await epRes.json();
          setEpisodes(Array.isArray(epData) ? epData : epData.episodes || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPodcast();
    return () => { audioRef.current?.pause(); };
  }, [id]);

  const getEpisodeUrl = (ep) => ep.file_url || ep.audio_url || ep.video_url || ep.stream_url || null;
  const isVideo = (ep) => ep.video_url || ep.type === "video";

  const togglePlay = useCallback((ep) => {
    const url = getEpisodeUrl(ep);
    if (!url) return;
    if (isVideo(ep)) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentVideoUrl(ep.video_url || url);
      setShowVideoPlayer(true);
      setCurrentPlaying(ep.id);
      setCurrentEpisode(ep);
      return;
    }
    if (currentPlaying === ep.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    audioRef.current?.pause();
    setShowVideoPlayer(false);
    const audio = new Audio(url);
    audio.play().catch(() => {});
    audioRef.current = audio;
    setCurrentPlaying(ep.id);
    setCurrentEpisode(ep);
    setIsPlaying(true);
    audio.onended = () => { setIsPlaying(false); setCurrentPlaying(null); };
  }, [currentPlaying, isPlaying]);

  const handleLike = async () => {
    const token = localStorage.getItem("token");
    if (token) await fetch(`${BACKEND}/api/podcast/${id}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setLiked(l => !l);
  };

  const fmtDuration = (d) => {
    if (!d) return "";
    if (typeof d === "string" && d.includes(":")) return d;
    return `${Math.floor(d/60)}:${String(d%60).padStart(2,"0")}`;
  };
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  if (loading) return (
    <div className="podcast-detail-container">
      <div className="loading-state"><div className="loading-icon">🎙️</div><p>Loading podcast...</p></div>
    </div>
  );
  if (error || !podcast) return (
    <div className="podcast-detail-container">
      <div className="error-state">
        <div className="error-icon">😕</div>
        <h2>Podcast not found</h2>
        <p>{error}</p>
        <button className="back-button" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </div>
  );

  const coverImg = podcast.cover_art_url || podcast.cover_image_url;

  return (
    <div className="podcast-detail-container">

      {/* ── Hero ── */}
      <div className="podcast-hero">
        <div className="podcast-hero-inner">
          {/* Back */}
          <div style={{ position: "absolute", top: 20, left: 32 }}>
            <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
          </div>

          {/* Cover */}
          <div className="podcast-cover-wrap">
            {coverImg ? (
              <img src={coverImg} alt={podcast.title} className="podcast-detail-image"
                onError={e => { e.target.style.display="none"; }}/>
            ) : (
              <div className="podcast-image-placeholder">
                <span className="placeholder-icon">🎙️</span>
                <span className="placeholder-text">{podcast.title?.substring(0,2).toUpperCase()||"PD"}</span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="podcast-meta" style={{ paddingTop: 28 }}>
            {podcast.category && <span className="podcast-category">{podcast.category}</span>}
            <h1 className="podcast-title">{podcast.title}</h1>
            {podcast.host_name && <p className="podcast-host">Hosted by <span>{podcast.host_name}</span></p>}
            {podcast.description && <p className="podcast-description">{podcast.description}</p>}

            <div className="podcast-stats">
              <span>🎧 <strong>{episodes.length}</strong> Episodes</span>
              {podcast.total_listens > 0 && <span>👂 <strong>{podcast.total_listens.toLocaleString()}</strong> Listens</span>}
              {podcast.created_at && <span>📅 Since {fmtDate(podcast.created_at)}</span>}
            </div>

            <div className="podcast-actions">
              <button className={`action-btn like-btn ${liked ? "liked" : ""}`} onClick={handleLike}>
                {liked ? "❤️ Liked" : "🤍 Like"}
              </button>
              <button className="action-btn share-btn" onClick={() => setShowShareModal(true)}>
                🚀 Share
              </button>
              <button className="action-btn subscribe-btn"
                onClick={async () => {
                  const token = localStorage.getItem("token");
                  if (!token) { navigate("/login"); return; }
                  await fetch(`${BACKEND}/api/podcast/${id}/subscribe`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                }}>
                ➕ Subscribe
              </button>
              <button className="action-btn record-btn" onClick={() => navigate("/podcast-studio")}>
                🎙️ Record Episode
              </button>
              <TipJar creatorId={podcast.user_id||podcast.creator_id}
                creatorName={podcast.host_name||podcast.creator_name||podcast.title}
                contentType="podcast" contentId={id} buttonStyle="inline"/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Now Playing Bar ── */}
      <div className={`pod-player-bar ${currentEpisode && isPlaying ? "visible" : ""}`}
        style={{ padding: "16px 32px", maxWidth: "100%" }}>
        <button className={`pod-play-btn ${isPlaying ? "playing" : ""}`}
          onClick={() => currentEpisode && togglePlay(currentEpisode)}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <div className="pod-now-playing-info">
          <div className="pod-now-title">▶ {currentEpisode?.title || "Now Playing"}</div>
          <div className="pod-now-meta">Tap to pause</div>
        </div>
        <button style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 18 }}
          onClick={() => { audioRef.current?.pause(); setIsPlaying(false); setCurrentEpisode(null); }}>✕</button>
      </div>

      {/* ── Video Player ── */}
      {showVideoPlayer && currentVideoUrl && (
        <div className="video-player-overlay" onClick={() => setShowVideoPlayer(false)}>
          <div className="video-player-container" onClick={e => e.stopPropagation()}>
            <button className="close-video-btn" onClick={() => setShowVideoPlayer(false)}>✕ Close</button>
            <video ref={videoRef} src={currentVideoUrl} controls autoPlay className="video-player"/>
          </div>
        </div>
      )}

      {/* ── Episodes ── */}
      <div className="podcast-detail-content">
        <div className="detail-section">
          <h2>Episodes</h2>
          {episodes.length === 0 ? (
            <div className="empty-episodes">
              <p>No episodes yet</p>
              <span>Check back later for new content</span>
            </div>
          ) : (
            <ul className="episode-list">
              {episodes.map((ep, idx) => {
                const url = getEpisodeUrl(ep);
                const vid = isVideo(ep);
                const playing = currentPlaying === ep.id && isPlaying;
                return (
                  <li key={ep.id} className={`episode-item ${playing ? "playing" : ""}`}
                    onClick={() => url && togglePlay(ep)}>

                    {/* Play button */}
                    <div className="episode-play-col">
                      <button className={`ep-play-btn ${playing ? "playing" : ""}`}
                        disabled={!url}
                        onClick={e => { e.stopPropagation(); url && togglePlay(ep); }}>
                        {playing ? "⏸" : vid ? "🎬" : "▶"}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="episode-info">
                      <div className="episode-header">
                        <span className="episode-number">#{idx + 1}</span>
                        <strong>{ep.title}</strong>
                        {vid && <span className="video-badge">🎬 Video</span>}
                      </div>
                      {ep.description && <p className="episode-description">{ep.description}</p>}
                      <div className="episode-meta">
                        {ep.duration && <span>⏱ {fmtDuration(ep.duration)}</span>}
                        {ep.uploaded_at && <span>📅 {fmtDate(ep.uploaded_at)}</span>}
                        {ep.listen_count > 0 && <span>🎧 {ep.listen_count} plays</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="episode-actions" onClick={e => e.stopPropagation()}>
                      {url ? (
                        <>
                          <button className={`play-button ${playing ? "playing" : ""}`} onClick={() => togglePlay(ep)}>
                            {playing ? "⏸ Pause" : vid ? "🎬 Watch" : "▶ Play"}
                          </button>
                          <a href={url} download className="play-button download">⬇ Download</a>
                        </>
                      ) : (
                        <button className="play-button disabled" disabled>🔇 No Media</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <UniversalSocialShare isOpen={showShareModal} onClose={() => setShowShareModal(false)}
        contentType="podcast"
        contentData={{ title: podcast.title, description: podcast.description, url: window.location.href,
          image: coverImg, host: podcast.host_name, episodeCount: episodes.length }} />
    </div>
  );
};

export default PodcastDetailPage;
