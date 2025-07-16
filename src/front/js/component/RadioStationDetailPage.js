import React, { useEffect, useState, useRef } from "react";
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
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [audioError, setAudioError] = useState(null);
  
  // Audio player ref
  const audioRef = useRef(null);

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

  useEffect(() => {
    const fetchStationDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (type === 'static') {
          // Handle static stations
          const staticStation = staticStations[id];
          if (staticStation) {
            setStation(staticStation);
          } else {
            setError("Station not found");
          }
          setLoading(false);
        } else {
          // Handle dynamic stations from backend
          const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
          const response = await fetch(`${backendUrl}/api/radio-stations/${id}`);

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const data = await response.json();
          setStation(data);
          
          // ✅ NEW: Fetch now playing info for dynamic stations
          if (data.is_live) {
            fetchNowPlaying();
          }
          
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading station details:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchStationDetails();
  }, [id, type]);

  // ✅ NEW: Fetch now playing information
  const fetchNowPlaying = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/radio/${id}/now-playing`);
      
      if (response.ok) {
        const data = await response.json();
        setNowPlaying(data.now_playing);
        console.log("📻 Now playing:", data.now_playing);
      }
    } catch (err) {
      console.error("Error fetching now playing:", err);
    }
  };

  // ✅ NEW: Real audio player functionality
  const handlePlayPause = async () => {
    if (type === 'static') {
      // For static stations, just toggle UI state (no real audio)
      setIsPlaying(!isPlaying);
      console.log(isPlaying ? "Pausing" : "Playing", station?.name);
      return;
    }

    // For dynamic stations, handle real audio streaming
    if (!station) return;

    try {
      if (isPlaying) {
        // Pause the audio
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        console.log("⏸️ Paused:", station.name);
      } else {
        // Start playing the audio
        setAudioError(null);
        
        if (!audioRef.current) {
          // Create new audio element
          const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
          const streamUrl = `${backendUrl}/api/radio/${id}/stream`;
          
          console.log("🎵 Attempting to play from:", streamUrl);
          
          const audio = new Audio(streamUrl);
          audioRef.current = audio;
          
          // Audio event listeners
          audio.addEventListener('loadstart', () => {
            console.log("📡 Starting to load stream...");
          });
          
          audio.addEventListener('canplay', () => {
            console.log("✅ Stream ready to play");
            setIsPlaying(true);
          });
          
          audio.addEventListener('playing', () => {
            console.log("🔊 Audio is playing");
            setIsPlaying(true);
          });
          
          audio.addEventListener('pause', () => {
            console.log("⏸️ Audio paused");
            setIsPlaying(false);
          });
          
          audio.addEventListener('error', (e) => {
            console.error("❌ Audio error:", e);
            console.error("Error details:", audio.error);
            setAudioError(`Playback error: ${audio.error?.message || 'Unknown error'}`);
            setIsPlaying(false);
          });
          
          audio.addEventListener('stalled', () => {
            console.log("⚠️ Audio stalled");
          });
          
          audio.addEventListener('waiting', () => {
            console.log("⏳ Audio buffering...");
          });
        }
        
        // Play the audio
        try {
          await audioRef.current.play();
          console.log("▶️ Playing:", station.name);
        } catch (playError) {
          console.error("❌ Play error:", playError);
          setAudioError(`Cannot play audio: ${playError.message}`);
        }
      }
    } catch (error) {
      console.error("❌ Audio control error:", error);
      setAudioError(`Audio error: ${error.message}`);
    }
  };

  // ✅ Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleBack = () => {
    // Stop audio when leaving the page
    if (audioRef.current) {
      audioRef.current.pause();
    }
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="station-detail-loading">
        <div className="loading-spinner">Loading station details...</div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="station-detail-error">
        <h2>Station Not Found</h2>
        <p>Sorry, we couldn't find the radio station you're looking for.</p>
        <button onClick={handleBack} className="back-button">
          ← Go Back
        </button>
      </div>
    );
  }

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
            </div>

            {/* ✅ NEW: Show audio errors */}
            {audioError && (
              <div className="audio-error" style={{
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                padding: '10px',
                borderRadius: '5px',
                margin: '10px 0',
                color: '#c33'
              }}>
                ⚠️ {audioError}
              </div>
            )}

            <div className="station-controls">
              <button 
                onClick={handlePlayPause} 
                className={`play-button ${isPlaying ? 'playing' : ''}`}
                disabled={type !== 'static' && !station.is_live}
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
              
              <button className="favorite-button">
                ❤️ Add to Favorites
              </button>
            </div>
          </div>
        </div>

        {/* Additional station details */}
        <div className="station-details">
          <div className="detail-section">
            <h3>About This Station</h3>
            <p>
              {station.description || "This station brings you the best music in the " + (station.genre || 'various') + " genre."}
            </p>
          </div>

          {/* ✅ NEW: Show now playing for live stations */}
          {type !== 'static' && station.is_live && (
            <div className="detail-section">
              <h3>Now Playing</h3>
              <div className="now-playing">
                {nowPlaying ? (
                  <>
                    <p>🎵 <strong>{nowPlaying.title}</strong></p>
                    <p>👤 {nowPlaying.artist}</p>
                    {nowPlaying.duration && <p>⏱️ Duration: {nowPlaying.duration}</p>}
                  </>
                ) : (
                  <p>🎵 Currently streaming {station.genre || 'music'}</p>
                )}
                <p>🔴 Live broadcast</p>
              </div>
            </div>
          )}

          {type === 'static' && (
            <div className="detail-section">
              <h3>Now Playing</h3>
              <div className="now-playing">
                <p>🎵 Currently streaming {station.genre} music</p>
                <p>🔴 Live broadcast</p>
              </div>
            </div>
          )}

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadioStationDetail;