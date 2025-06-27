import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/RadioStationDetail.css"; // You'll need to create this CSS file

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
  const { id, type } = useParams(); // type will be 'static' for static stations
  const navigate = useNavigate();
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Static stations data (same as in BrowseRadioStations)
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

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Here you would integrate with your audio player
    console.log(isPlaying ? "Pausing" : "Playing", station?.name);
  };

  const handleBack = () => {
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
            src={station.image || station.cover_art_url} 
            alt={station.name} 
            className="station-detail-image" 
          />
          
          <div className="station-meta">
            <h1 className="station-name">{station.name}</h1>
            <p className="station-genre">{station.genre}</p>
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
            </div>

            <div className="station-controls">
              <button 
                onClick={handlePlayPause} 
                className={`play-button ${isPlaying ? 'playing' : ''}`}
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
              {station.description || "This station brings you the best music in the " + station.genre + " genre."}
            </p>
          </div>

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
                <strong>Genre:</strong> {station.genre}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadioStationDetail;