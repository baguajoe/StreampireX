import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/BrowseStations.css";

// Static images
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

const BrowseRadioStations = () => {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const [genres] = useState([
    "Lo-Fi", "Jazz", "Reggae", "Electronic", "Talk Radio", "Rock", "Hip Hop",
    "Classical", "Indie", "Ambient", "Soul", "R&B", "Funk", "Country",
    "Latin", "Afrobeats", "K-Pop", "Pop", "House", "Techno", "Dubstep",
    "News", "Sports", "Spiritual"
  ]);

  const [allStations, setAllStations] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiCallSuccessful, setApiCallSuccessful] = useState(false); // Track if API call was successful

  const featuredStations = [
    { id: "static1", name: "LoFi Dreams", genre: "Lo-Fi", description: "Relaxing lo-fi beats.", image: LofiDreamsImg },
    { id: "static2", name: "Jazz Lounge", genre: "Jazz", description: "Smooth & classy jazz.", image: JazzLoungeImg },
    { id: "static3", name: "Talk Nation", genre: "Talk Radio", description: "News and discussions.", image: TalkNationImg },
    { id: "static4", name: "Electric Vibes", genre: "Electronic", description: "Club and synth mixes.", image: ElectricVibesImg },
    { id: "static5", name: "Reggae Rootz", genre: "Reggae", description: "Island rhythms and roots.", image: ReggaeRootzImg },
    { id: "static6", name: "Morning Classical", genre: "Classical", description: "Uplifting orchestral works.", image: MorningClassicalImg },
    { id: "static7", name: "Pop Pulse", genre: "Pop", description: "Top charting hits.", image: PopPulseImg },
    { id: "static8", name: "Rock Rumble", genre: "Rock", description: "Hard-hitting rock classics.", image: RockRumbleImg },
    { id: "static9", name: "Urban Soul", genre: "Soul", description: "Silky vocals & slow grooves.", image: UrbanSoulImg },
    { id: "static10", name: "Chill Hop Cafe", genre: "Hip Hop", description: "Instrumental hip hop.", image: ChillHopCafeImg },
    { id: "static11", name: "Cosmic Jazz", genre: "Jazz", description: "Out-of-this-world improvisation.", image: CosmicJazzImg },
    { id: "static12", name: "LoFi Temple", genre: "Lo-Fi", description: "Zen and mellow beats.", image: LoFiTempleImg },
    { id: "static13", name: "The Synth Lords", genre: "Electronic", description: "Retro synthwave duos.", image: TheSynthLordsImg },
    { id: "static14", name: "Velvet Echo", genre: "Soul", description: "Smooth vocal powerhouse.", image: VelvetEchoImg },
    { id: "static15", name: "DJ Nova", genre: "House", description: "Galactic EDM grooves.", image: DJNovaImg },
    { id: "static16", name: "The Groove Mechanics", genre: "Funk", description: "Bass-heavy funkadelics.", image: TheGrooveMechanicsImg },
    { id: "static17", name: "Indigo Rain", genre: "Indie", description: "Dreamy alternative sounds.", image: IndigoRainImg },
    { id: "static18", name: "Zara Moonlight", genre: "Pop", description: "Chart-topping solo artist.", image: ZaraMoonlightImg }
  ];

  useEffect(() => {
    const fetchRadioStations = async () => {
      try {
        setLoading(true);
        setError(null);
        setApiCallSuccessful(false); // Reset success flag

        const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
        console.log("Fetching from:", `${backendUrl}/api/radio-stations`);
        
        const response = await fetch(`${backendUrl}/api/radio-stations`);
        console.log("Response status:", response.status, "OK:", response.ok);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Received data:", data);

        // Mark API call as successful since we got here without throwing
        setApiCallSuccessful(true);

        // Handle different response formats gracefully
        if (Array.isArray(data)) {
          setAllStations(data);
          console.log(`✅ Loaded ${data.length} stations from API`);
        } else if (data && Array.isArray(data.stations)) {
          setAllStations(data.stations);
          console.log(`✅ Loaded ${data.stations.length} stations from data.stations`);
        } else {
          // API returned data but not in expected format - still successful
          console.log("✅ API successful but unexpected format, using featured stations only");
          setAllStations([]);
        }

        // Always clear error on successful API call
        setError(null);

      } catch (err) {
        console.error("❌ API call failed:", err);
        setApiCallSuccessful(false);
        setError(err.message);
        setAllStations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRadioStations();
  }, []);

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollLeft -= 200;
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollLeft += 200;
  };

  const mergedStations = [...featuredStations, ...allStations];

  const filteredStations = selectedGenre
    ? mergedStations.filter(station => station.genre === selectedGenre)
    : mergedStations;

  const renderSection = (title, list) => {
    if (list.length === 0) {
      return (
        <div className="podcast-section">
          <h2 className="section-title">{title}</h2>
          <p className="no-stations">No radio stations found in this category.</p>
        </div>
      );
    }

    return (
      <div className="podcast-section">
        <h2 className="section-title">{title}</h2>
        <div className="podcast-scroll-row">
          {list.map((station) => {
            // Fix: Convert station.id to string before checking if it starts with "static"
            const stationId = String(station.id || '');
            const isStatic = stationId.startsWith("static");
            
            const linkPath = isStatic
              ? `/radio/station/${station.id}/static`
              : `/radio/station/${station.id}/dynamic`;

            return (
              <Link
                to={linkPath}
                key={station.id}
                className="podcast-card"
              >
                <img
                  src={station.image || station.cover_art_url || station.logo_url}
                  alt={station.name}
                  className="podcast-img"
                />
                <h3 className="podcast-title">{station.name}</h3>
                <span className="podcast-label">{station.genre}</span>
                <p className="podcast-desc">{station.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">📡 Browse Radio Stations</h1>

      {/* Only show error if API call actually failed AND there's an error */}
      {error && !apiCallSuccessful && (
        <div className="error-message" style={{
          background: "#fee",
          border: "1px solid #fcc",
          padding: "10px",
          borderRadius: "5px",
          margin: "10px 0",
          color: "#c33"
        }}>
          ⚠️ Could not load radio stations from server: {error}
        </div>
      )}
      
      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          {loading ? (
            <div className="loading-spinner">Loading genres...</div>
          ) : (
            genres.map((g, i) => (
              <div
                key={i}
                onClick={() => setSelectedGenre(g)}
                className={`category-pill ${selectedGenre === g ? "active" : ""}`}
              >
                {g}
              </div>
            ))
          )}
        </div>
        <button onClick={scrollRight} className="scroll-button">›</button>
      </div>

      {selectedGenre ? (
        renderSection(`🎯 ${selectedGenre} Stations`, filteredStations)
      ) : (
        <>
          {renderSection("🆕 Featured Stations", featuredStations.slice(0, 6))}
          {renderSection("📻 Top Radio Stations", featuredStations.slice(6, 12))}
          {renderSection("🌟 Popular Artists", featuredStations.slice(12))}
          {allStations.length > 0 && renderSection("🌐 Live Stations", allStations)}
        </>
      )}
    </div>
  );
};

export default BrowseRadioStations;