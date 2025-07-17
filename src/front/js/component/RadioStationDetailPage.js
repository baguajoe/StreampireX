import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/RadioStationDetail.css";

// Import the same static images for fallback
import LofiDreamsImg from "../../img/LofiDreams.png";
import JazzLoungeImg from "../../img/JazzLounge.png";
import TalkNationImg from "../../img/TalkNation.png";
import ElectricVibesImg from "../../img/ElectricVibes.png";
import ReggaeRootzImg from "../../img/ReggaeRootz.png";
import MorningClassicalImg from "../../img/MorningClassical.png";
import PopPulseImg from "../../img/PopPulse.png";
import RockRumbleImg from "../../img/RockRumble.png";
import UrbanSoulImg from "../../img/UrbanSoul.png";
import ChillHopCafeImg from "../../img/ChillHopCafe.png";
import CosmicJazzImg from "../../img/CosmicJazz.png";
import LoFiTempleImg from "../../img/LofiTemple.png";
import TheSynthLordsImg from "../../img/TheSynthLords.png";
import VelvetEchoImg from "../../img/VelvetEcho.png";
import DJNovaImg from "../../img/DJNova.png";
import TheGrooveMechanicsImg from "../../img/TheGrooveMechanics.png";
import IndigoRainImg from "../../img/IndigoRain.png";
import ZaraMoonlightImg from "../../img/ZaraMoonlight.png";

const RadioStationDetail = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();
  
  // State management - all React state, no DOM manipulation
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Refs for audio management
  const audioRef = useRef(null);
  const nowPlayingIntervalRef = useRef(null);

  // Static stations data
  const staticStations = {
    static1: { id: "static1", name: "LoFi Dreams", genre: "Lo-Fi", description: "Relaxing lo-fi beats to help you focus, study, or unwind. Perfect background music for any time of day.", image: LofiDreamsImg, listeners: "12.5K", rating: 4.8 },
    static2: { id: "static2", name: "Jazz Lounge", genre: "Jazz", description: "Smooth & classy jazz from the golden era to modern interpretations. Experience the sophisticated sounds of jazz legends.", image: JazzLoungeImg, listeners: "8.9K", rating: 4.9 },
    static3: { id: "static3", name: "Talk Nation", genre: "Talk Radio", description: "News, discussions, and thought-provoking conversations on current events, politics, and society.", image: TalkNationImg, listeners: "15.2K", rating: 4.6 },
    static4: { id: "static4", name: "Electric Vibes", genre: "Electronic", description: "High-energy electronic music perfect for workouts, parties, or when you need an energy boost.", image: ElectricVibesImg, listeners: "18.7K", rating: 4.7 },
    static5: { id: "static5", name: "Reggae Rootz", genre: "Reggae", description: "Authentic reggae rhythms and roots music that transport you to the islands. Feel the positive vibrations.", image: ReggaeRootzImg, listeners: "6.3K", rating: 4.8 },
    static6: { id: "static6", name: "Morning Classical", genre: "Classical", description: "Uplifting orchestral works perfect for starting your day. Beautiful classical compositions from renowned composers.", image: MorningClassicalImg, listeners: "4.1K", rating: 4.9 },
    static7: { id: "static7", name: "Pop Pulse", genre: "Pop", description: "The hottest pop hits and chart-toppers. Stay up to date with the latest mainstream music trends.", image: PopPulseImg, listeners: "25.8K", rating: 4.5 },
    static8: { id: "static8", name: "Rock Rumble", genre: "Rock", description: "Hard-hitting rock classics and modern rock anthems. Turn up the volume and feel the power of rock.", image: RockRumbleImg, listeners: "14.6K", rating: 4.8 },
    static9: { id: "static9", name: "Urban Soul", genre: "Soul", description: "Silky vocals and slow grooves that touch the soul. R&B and soul music at its finest.", image: UrbanSoulImg, listeners: "9.7K", rating: 4.7 },
    static10: { id: "static10", name: "Chill Hop Cafe", genre: "Hip Hop", description: "Instrumental hip hop beats perfect for studying, working, or relaxing. Laid-back vibes only.", image: ChillHopCafeImg, listeners: "11.4K", rating: 4.8 },
    static11: { id: "static11", name: "Cosmic Jazz", genre: "Jazz", description: "Out-of-this-world jazz improvisations and experimental sounds. Journey through space with cosmic jazz.", image: CosmicJazzImg, listeners: "5.8K", rating: 4.9 },
    static12: { id: "static12", name: "LoFi Temple", genre: "Lo-Fi", description: "Zen and mellow beats for meditation and mindfulness. Find your inner peace with these calming sounds.", image: LoFiTempleImg, listeners: "16.3K", rating: 4.9 },
    static13: { id: "static13", name: "The Synth Lords", genre: "Electronic", description: "Retro synthwave duos bringing back the 80s with modern production. Neon-soaked electronic soundscapes.", image: TheSynthLordsImg, listeners: "7.2K", rating: 4.6 },
    static14: { id: "static14", name: "Velvet Echo", genre: "Soul", description: "Smooth vocal powerhouse delivering emotional performances. Contemporary soul with classic influences.", image: VelvetEchoImg, listeners: "8.9K", rating: 4.8 },
    static15: { id: "static15", name: "DJ Nova", genre: "House", description: "Galactic EDM grooves and house music that will make you move. Dance floor anthems from across the universe.", image: DJNovaImg, listeners: "13.1K", rating: 4.7 },
    static16: { id: "static16", name: "The Groove Mechanics", genre: "Funk", description: "Bass-heavy funk that gets your body moving. Infectious grooves and rhythms that you can't resist.", image: TheGrooveMechanicsImg, listeners: "6.7K", rating: 4.8 },
    static17: { id: "static17", name: "Indigo Rain", genre: "Indie", description: "Dreamy alternative sounds and indie rock gems. Discover new artists and underground classics.", image: IndigoRainImg, listeners: "9.4K", rating: 4.7 },
    static18: { id: "static18", name: "Zara Moonlight", genre: "Pop", description: "Chart-topping solo artist with powerful vocals and catchy melodies. Pop perfection at its finest.", image: ZaraMoonlightImg, listeners: "19.8K", rating: 4.6 }
  };

  // Helper function to get backend URL
  const getBackendUrl = useCallback(() => {
    return process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
  }, []);

  // Fixed audio URL construction
  const getAudioUrl = useCallback(() => {
    if (!station) return null;

    // If station has a direct stream URL, use it
    if (station.stream_url) {
      return station.stream_url;
    }
    
    // For loop-enabled stations, use the loop audio URL
    if (station.is_loop_enabled && station.loop_audio_url) {
      const backendUrl = getBackendUrl();
      // The URL should be constructed as: backend_url + /static + file_path
      const cleanPath = station.loop_audio_url.startsWith('/') 
        ? station.loop_audio_url 
        : `/${station.loop_audio_url}`;
      return `${backendUrl}/static${cleanPath}`;
    }
    
    // Fallback to now playing metadata file URL
    if (station.now_playing_metadata?.file_url) {
      const backendUrl = getBackendUrl();
      const cleanPath = station.now_playing_metadata.file_url.startsWith('/') 
        ? station.now_playing_metadata.file_url 
        : `/${station.now_playing_metadata.file_url}`;
      return `${backendUrl}/static${cleanPath}`;
    }
    
    return null;
  }, [station, getBackendUrl]);

  // Fetch station details
  const fetchStationDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (type === 'static') {
        const staticStation = staticStations[id];
        if (staticStation) {
          setStation(staticStation);
        } else {
          setError("Station not found");
        }
        setLoading(false);
      } else {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/radio-stations/${id}`);

        if (!response.ok) {
          throw new Error(`Station not found (${response.status})`);
        }

        const data = await response.json();
        setStation(data);
        console.log("📻 Station data:", data);
        
        // Try to fetch now playing info with better error handling
        if (data.is_live) {
          await fetchNowPlaying();
          startNowPlayingUpdates();
        }
        
        setLoading(false);
      }
    } catch (err) {
      console.error("❌ Error loading station details:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [id, type, getBackendUrl]);

  // Improved now playing fetch with better error handling
  const fetchNowPlaying = useCallback(async () => {
    if (type === 'static') return;

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/radio/${id}/now-playing`);
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn("⚠️ Now playing endpoint returned non-JSON response");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setNowPlaying(data.now_playing);
        console.log("📻 Now playing updated:", data.now_playing);
      } else {
        console.warn(`⚠️ Now playing endpoint returned ${response.status}`);
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch now playing info:", err.message);
      // Don't throw error, just log warning since this is not critical
    }
  }, [id, type, getBackendUrl]);

  // Start periodic updates
  const startNowPlayingUpdates = useCallback(() => {
    if (nowPlayingIntervalRef.current) {
      clearInterval(nowPlayingIntervalRef.current);
    }
    
    nowPlayingIntervalRef.current = setInterval(() => {
      fetchNowPlaying();
    }, 30000);
  }, [fetchNowPlaying]);

  // Audio event handlers
  const handleLoadStart = useCallback(() => {
    console.log("📡 Starting to load stream...");
    setAudioLoading(true);
    setConnectionStatus('connecting');
  }, []);

  const handleCanPlay = useCallback(() => {
    console.log("✅ Stream ready to play");
    setAudioLoading(false);
    setAudioReady(true);
    setConnectionStatus('connected');
  }, []);

  const handlePlaying = useCallback(() => {
    console.log("🔊 Audio is playing");
    setIsPlaying(true);
    setAudioLoading(false);
    setAudioError(null);
    setConnectionStatus('connected');
  }, []);

  const handlePause = useCallback(() => {
    console.log("⏸️ Audio paused");
    setIsPlaying(false);
    setAudioLoading(false);
  }, []);

  const handleAudioError = useCallback((e) => {
    const audio = audioRef.current;
    console.error("❌ Audio error:", e);
    console.error("Error details:", audio?.error);
    
    let errorMessage = "Playback error occurred";
    if (audio?.error) {
      switch (audio.error.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = "Playback was aborted";
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = "Network error occurred";
          break;
        case 3: // MEDIA_ERR_DECODE
          errorMessage = "Audio decoding error";
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = "Audio format not supported";
          break;
        default:
          errorMessage = audio.error.message || "Unknown playback error";
      }
    }
    
    setAudioError(errorMessage);
    setIsPlaying(false);
    setAudioLoading(false);
    setConnectionStatus('error');
  }, []);

  const handleStalled = useCallback(() => {
    console.log("⚠️ Audio stalled");
    setAudioLoading(true);
  }, []);

  const handleWaiting = useCallback(() => {
    console.log("⏳ Audio buffering...");
    setAudioLoading(true);
  }, []);

  const handleEnded = useCallback(() => {
    console.log("🔄 Audio ended");
    
    // For loop-enabled stations, restart playback
    if (station?.is_loop_enabled) {
      console.log("🔄 Restarting loop...");
      setTimeout(() => {
        if (audioRef.current && isPlaying) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.error);
        }
      }, 100);
    } else {
      setIsPlaying(false);
    }
  }, [station, isPlaying]);

  // Improved audio element setup
  const setupAudioElement = useCallback(() => {
    const audioUrl = getAudioUrl();
    if (!audioUrl) return null;

    console.log("🎵 Setting up audio with URL:", audioUrl);

    const audio = new Audio();
    
    // Set audio properties for better compatibility
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    
    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleAudioError);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('ended', handleEnded);
    
    audio.src = audioUrl;
    return audio;
  }, [getAudioUrl, handleLoadStart, handleCanPlay, handlePlaying, handlePause, handleAudioError, handleStalled, handleWaiting, handleEnded]);

  // Improved play/pause handler
  const handlePlayPause = useCallback(async () => {
    if (type === 'static') {
      setIsPlaying(!isPlaying);
      console.log(isPlaying ? "⏸️ Pausing" : "▶️ Playing", station?.name);
      return;
    }

    const audioUrl = getAudioUrl();
    if (!station || !audioUrl) {
      setAudioError("No audio available for this station");
      return;
    }

    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        console.log("⏸️ Paused:", station.name);
        return;
      }

      setAudioError(null);
      setAudioLoading(true);
      
      // Clean up existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      console.log("🎵 Creating new audio stream:", audioUrl);
      
      // Setup new audio element
      const audio = setupAudioElement();
      if (!audio) {
        setAudioError("Failed to create audio element");
        setAudioLoading(false);
        return;
      }

      audioRef.current = audio;
      
      // Load and play with better error handling
      try {
        audio.load();
        
        // Wait a bit for the audio to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Timeout loading audio"));
          }, 10000);
          
          const onCanPlay = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = (e) => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(new Error("Failed to load audio"));
          };
          
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('error', onError);
        });
        
        await audio.play();
        console.log("▶️ Successfully started playing:", station.name);
      } catch (playError) {
        console.error("❌ Play error:", playError);
        setAudioError(`Cannot start playback: ${playError.message}`);
        setAudioLoading(false);
        setConnectionStatus('error');
      }
      
    } catch (error) {
      console.error("❌ Audio control error:", error);
      setAudioError(`Audio error: ${error.message}`);
      setAudioLoading(false);
      setConnectionStatus('error');
    }
  }, [type, isPlaying, station, getAudioUrl, setupAudioElement]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (nowPlayingIntervalRef.current) {
      clearInterval(nowPlayingIntervalRef.current);
    }
    navigate(-1);
  }, [navigate]);

  // Dismiss audio error
  const dismissAudioError = useCallback(() => {
    setAudioError(null);
  }, []);

  // Effects
  useEffect(() => {
    fetchStationDetails();
  }, [fetchStationDetails]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current);
      }
    };
  }, []);

  // Render helpers
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <span className="connection-status connecting">🔄 Connecting...</span>;
      case 'connected':
        return <span className="connection-status connected">🟢 Connected</span>;
      case 'error':
        return <span className="connection-status error">🔴 Connection Error</span>;
      default:
        return null;
    }
  };

  const renderPlayButton = () => {
    const isDisabled = (type !== 'static' && !station?.is_live) || audioLoading;
    
    let buttonText = '▶️ Play';
    if (audioLoading) {
      buttonText = '⏳ Loading...';
    } else if (isPlaying) {
      buttonText = '⏸️ Pause';
    }

    return (
      <button 
        onClick={handlePlayPause} 
        className={`play-button ${isPlaying ? 'playing' : ''} ${audioLoading ? 'loading' : ''}`}
        disabled={isDisabled}
      >
        {buttonText}
      </button>
    );
  };

  const renderNowPlaying = () => {
    if (type === 'static') {
      return (
        <div className="now-playing">
          <p>🎵 Currently streaming {station.genre} music</p>
          <p>🔴 Live broadcast</p>
        </div>
      );
    }

    if (!station?.is_live) return null;

    return (
      <div className="now-playing">
        {station.now_playing_metadata ? (
          <>
            <p><strong>🎵 {station.now_playing_metadata.title || 'Unknown Track'}</strong></p>
            <p>👤 {station.now_playing_metadata.artist || 'Unknown Artist'}</p>
            {station.now_playing_metadata.duration && (
              <p>⏱️ Duration: {station.now_playing_metadata.duration}</p>
            )}
            {station.is_loop_enabled && (
              <p>🔄 Looping enabled</p>
            )}
          </>
        ) : nowPlaying ? (
          <>
            <p><strong>🎵 {nowPlaying.title}</strong></p>
            <p>👤 {nowPlaying.artist}</p>
            {nowPlaying.duration && <p>⏱️ Duration: {nowPlaying.duration}</p>}
          </>
        ) : (
          <p>🎵 Currently streaming {station.genre || station.genres?.[0] || 'music'}</p>
        )}
        <p>🔴 Live broadcast</p>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="station-detail-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading station details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !station) {
    return (
      <div className="station-detail-error">
        <h2>❌ Station Not Found</h2>
        <p>Sorry, we couldn't find the radio station you're looking for.</p>
        <p className="error-details">{error}</p>
        <button onClick={handleBack} className="back-button">
          ← Go Back
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div className="station-detail-container">
      <div className="station-detail-header">
        <button onClick={handleBack} className="back-button">
          ← Back to Stations
        </button>
      </div>

      <div className="station-detail-content">
        <div className="station-info">
          <img 
            src={station.image || station.cover_image_url || station.logo_url} 
            alt={station.name} 
            className="station-detail-image"
            onError={(e) => {
              e.target.src = LofiDreamsImg; // Fallback image
            }}
          />
          
          <div className="station-meta">
            <h1 className="station-name">{station.name}</h1>
            <p className="station-genre">{station.genre || (station.genres && station.genres[0])}</p>
            <p className="station-description">{station.description}</p>
            
            <div className="station-stats">
              {station.listeners && (
                <span className="stat">
                  👥 {station.listeners} listeners
                </span>
              )}
              {station.rating && (
                <span className="stat">
                  ⭐ {station.rating}/5.0
                </span>
              )}
              {station.is_live && (
                <span className="stat live-indicator">
                  🔴 LIVE
                </span>
              )}
              {station.is_loop_enabled && (
                <span className="stat loop-indicator">
                  🔄 LOOP
                </span>
              )}
              {type !== 'static' && !station.is_live && (
                <span className="stat offline-indicator">
                  ⚫ OFFLINE
                </span>
              )}
              {connectionStatus !== 'disconnected' && renderConnectionStatus()}
            </div>

            {/* Audio status messages */}
            {audioError && (
              <div className="audio-error">
                ⚠️ {audioError}
                <button 
                  onClick={dismissAudioError} 
                  className="dismiss-error"
                >
                  ✕
                </button>
              </div>
            )}

            {audioLoading && (
              <div className="audio-loading">
                ⏳ Loading audio stream...
              </div>
            )}

            <div className="station-controls">
              {renderPlayButton()}
              
              <button className="favorite-button">
                ❤️ Add to Favorites
              </button>

              {/* Development debug info */}
              {process.env.NODE_ENV === 'development' && getAudioUrl() && (
                <div className="debug-info">
                  <p>Audio URL: {getAudioUrl()}</p>
                  <p>Loop enabled: {station.is_loop_enabled ? 'Yes' : 'No'}</p>
                  <p>Is live: {station.is_live ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Station details sections */}
        <div className="station-details">
          <div className="detail-section">
            <h3>About This Station</h3>
            <p>
              {station.description || `This station brings you the best music in the ${station.genre || station.genres?.[0] || 'various'} genre.`}
            </p>
          </div>

          {/* Now playing section */}
          {(type !== 'static' && station.is_live) || type === 'static' ? (
            <div className="detail-section">
              <h3>Now Playing</h3>
              {renderNowPlaying()}
            </div>
          ) : null}

          {/* Station info grid */}
          <div className="detail-section">
            <h3>Station Info</h3>
            <div className="station-info-grid">
              <div className="info-item">
                <strong>Genre:</strong> {station.genre || (station.genres && station.genres[0]) || 'Music'}
              </div>
              <div className="info-item">
                <strong>Type:</strong> {type === 'static' ? 'Featured Station' : 'Live Station'}
              </div>
              {station.listeners && (
                <div className="info-item">
                  <strong>Listeners:</strong> {station.listeners}
                </div>
              )}
              {station.rating && (
                <div className="info-item">
                  <strong>Rating:</strong> {station.rating}/5.0 ⭐
                </div>
              )}
              {station.creator_name && (
                <div className="info-item">
                  <strong>Created by:</strong> {station.creator_name}
                </div>
              )}
              {station.created_at && (
                <div className="info-item">
                  <strong>Created:</strong> {new Date(station.created_at).toLocaleDateString()}
                </div>
              )}
              {station.is_loop_enabled && station.loop_duration_minutes && (
                <div className="info-item">
                  <strong>Loop Duration:</strong> {station.loop_duration_minutes} minutes
                </div>
              )}
            </div>
          </div>

          {/* Additional features */}
          {type !== 'static' && station.submission_guidelines && (
            <div className="detail-section">
              <h3>Submission Guidelines</h3>
              <p>{station.submission_guidelines}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RadioStationDetail;