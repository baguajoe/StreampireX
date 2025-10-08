import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import LiveVideoPlayer from "../component/LiveVideoPlayer";
import ChatModal from "../component/ChatModal";
import PollComponent from "../component/PollComponent";
// import TipJar from "../component/TipJar";
import "../../styles/LiveShowPage.css";

const LiveShowPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // Check if mode=radio in URL
  const isRadioMode = mode === 'radio';
  
  const [streamData, setStreamData] = useState(null);
  const [radioStation, setRadioStation] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [user, setUser] = useState({});
  const [isLive, setIsLive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);

  useEffect(() => {
    if (isRadioMode) {
      // Fetch radio station data
      fetchRadioStation();
    } else {
      // Fetch regular live stream data
      fetchStreamData();
    }

    // Fetch current user
    fetchUserProfile();
  }, [id, isRadioMode]);

  // Fetch regular stream data
  const fetchStreamData = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/live-streams/${id}`);
      const data = await response.json();
      setStreamData(data);
    } catch (err) {
      console.error("Error loading stream:", err);
    }
  };

  // Fetch radio station data
  const fetchRadioStation = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio-stations/${id}`);
      const data = await response.json();
      setRadioStation(data);
      setIsLive(data.is_live || false);
      
      // Fetch current playing track
      fetchNowPlaying();
    } catch (err) {
      console.error("Error loading radio station:", err);
    }
  };

  // Fetch current playing track for radio
  const fetchNowPlaying = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio-stations/${id}/now-playing`);
      const data = await response.json();
      setCurrentTrack(data.current_track);
    } catch (err) {
      console.error("Error fetching now playing:", err);
    }
  };

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const profile = await response.json();
      setUser(profile);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // Start live broadcast (for radio DJs)
  const startBroadcast = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Notify backend that broadcast is starting
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/start-broadcast`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          station_id: id
        })
      });

      if (response.ok) {
        setIsLive(true);
        alert("🎙️ You're now live on air!");
        
        // TODO: Connect stream to WebRTC or streaming server
        // This is where you'd integrate with your streaming infrastructure
      } else {
        throw new Error("Failed to start broadcast");
      }
    } catch (error) {
      console.error("Failed to start broadcast:", error);
      alert("❌ Could not start broadcast. Please check microphone permissions.");
    }
  };

  // Stop live broadcast
  const stopBroadcast = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/stop-broadcast`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          station_id: id
        })
      });

      if (response.ok) {
        setIsLive(false);
        alert("📻 Broadcast ended");
      }
    } catch (error) {
      console.error("Failed to stop broadcast:", error);
    }
  };

  // Loading state
  if (!streamData && !radioStation) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading {isRadioMode ? 'Radio Station' : 'Live Show'}...</p>
      </div>
    );
  }

  // Radio Mode UI
  if (isRadioMode && radioStation) {
    return (
      <div className="live-show-page radio-mode">
        {/* Radio Station Header */}
        <div className="radio-header">
          <div className="radio-logo">
            {radioStation.logo_url ? (
              <img src={radioStation.logo_url} alt={radioStation.name} />
            ) : (
              <div className="default-logo">📻</div>
            )}
          </div>
          <div className="radio-info">
            <h1>📻 {radioStation.name}</h1>
            <p>{radioStation.description}</p>
            <div className="radio-meta">
              <span className="genre-badge">🎵 {radioStation.genre}</span>
              <span className="listener-count">👥 {radioStation.listener_count || 0} listeners</span>
              {isLive && <span className="live-badge">🔴 LIVE</span>}
            </div>
          </div>
        </div>

        <div className="video-and-chat">
          {/* Radio Player & Controls */}
          <div className="radio-studio">
            {/* Live Broadcast Controls (for station owner/DJ) */}
            {user.id === radioStation.user_id && (
              <div className="broadcast-controls">
                <h3>🎙️ DJ Controls</h3>
                {!isLive ? (
                  <button 
                    className="btn btn-danger btn-lg"
                    onClick={startBroadcast}
                  >
                    🎙️ Go Live
                  </button>
                ) : (
                  <button 
                    className="btn btn-secondary btn-lg"
                    onClick={stopBroadcast}
                  >
                    🛑 End Broadcast
                  </button>
                )}
                <div className="dj-status">
                  <p>{isLive ? '🔴 You are LIVE on air' : '⚫ Currently offline'}</p>
                </div>
              </div>
            )}

            {/* Now Playing Display */}
            <div className="now-playing-section">
              <h3>🎵 Now Playing</h3>
              {currentTrack ? (
                <div className="track-info">
                  <div className="track-artwork">
                    {currentTrack.artwork_url ? (
                      <img src={currentTrack.artwork_url} alt={currentTrack.title} />
                    ) : (
                      <div className="default-artwork">🎵</div>
                    )}
                  </div>
                  <div className="track-details">
                    <h4 className="track-title">{currentTrack.title}</h4>
                    <p className="track-artist">{currentTrack.artist}</p>
                    {currentTrack.album && <p className="track-album">Album: {currentTrack.album}</p>}
                  </div>
                </div>
              ) : (
                <div className="no-track">
                  <p>No track currently playing</p>
                </div>
              )}
            </div>

            {/* Radio Audio Player */}
            <div className="radio-player">
              <LiveVideoPlayer 
                streamUrl={radioStation.stream_url} 
                isAudioOnly={true}
                autoplay={true}
              />
            </div>

            {/* Station Schedule */}
            <div className="schedule-preview">
              <h4>📅 Upcoming Shows</h4>
              <p className="text-muted">Check the full schedule to see what's coming up!</p>
              <a 
                href={`/radio/${id}/schedule`} 
                className="btn btn-outline-primary btn-sm"
              >
                View Full Schedule
              </a>
            </div>
          </div>

          {/* Chat Sidebar */}
          {isChatOpen && (
            <div className="chat-container">
              <ChatModal
                recipientId={radioStation.user_id}
                recipientName={radioStation.name}
                currentUserId={user.id}
                onClose={() => setIsChatOpen(false)}
                enableTypingIndicator={true}
                enableThreads={false}
                autoScroll={true}
                enableMediaUpload={true}
                enableGroupChat={true}
                roomName={`radio_${id}`}
                title="Radio Chat"
              />
            </div>
          )}
        </div>

        {/* Station Stats */}
        <div className="radio-stats">
          <div className="stat-card">
            <span className="stat-label">👥 Total Listeners</span>
            <span className="stat-value">{radioStation.followers_count || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">🎵 Tracks Played</span>
            <span className="stat-value">{radioStation.total_plays || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">⏰ Broadcasting</span>
            <span className="stat-value">{radioStation.broadcast_hours || '24/7'}</span>
          </div>
        </div>

        {/* Social Links */}
        {radioStation.social_links && (
          <div className="social-links">
            <h4>Follow Us</h4>
            <div className="social-buttons">
              {radioStation.social_links.website && (
                <a href={radioStation.social_links.website} target="_blank" rel="noopener noreferrer">
                  🌐 Website
                </a>
              )}
              {radioStation.social_links.instagram && (
                <a href={radioStation.social_links.instagram} target="_blank" rel="noopener noreferrer">
                  📸 Instagram
                </a>
              )}
              {radioStation.social_links.twitter && (
                <a href={radioStation.social_links.twitter} target="_blank" rel="noopener noreferrer">
                  🐦 Twitter
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular Live Stream Mode
  return (
    <div className="live-show-page">
      <h1>{streamData.title}</h1>
      <p>{streamData.description}</p>

      <div className="video-and-chat">
        <LiveVideoPlayer streamUrl={streamData.stream_url} />

        {isChatOpen && (
          <ChatModal
            recipientId={streamData.creator_id}
            recipientName={streamData.creator_name}
            currentUserId={user.id}
            onClose={() => setIsChatOpen(false)}
            enableTypingIndicator={true}
            enableThreads={true}
            autoScroll={true}
            enableMediaUpload={true}
            enableGroupChat={true}
          />
        )}
      </div>

      <PollComponent streamId={id} />
      {/* <TipJar streamId={id} /> */}

      <div className="audience-stats">
        👥 Viewers: {streamData.viewer_count || 0}
      </div>
    </div>
  );
};

export default LiveShowPage;