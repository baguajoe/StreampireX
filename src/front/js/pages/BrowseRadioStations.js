import React, { useEffect, useState, useRef } from "react";
import "../../styles/BrowseStations.css";

// Existing imports
import LofiDreamsImg from "../../img/LofiDreams.png";
import JazzLoungeImg from "../../img/JazzLounge.png";
import TalkNationImg from "../../img/TalkNation.png";
import ElectricVibesImg from "../../img/ElectricVibes.png";
import ReggaeRootzImg from "../../img/ReggaeRootz.png";
import MorningClassicalImg from "../../img/MorningClassical.png";

// Top Stations imports
import PopPulseImg from "../../img/PopPulse.png";
import RockRumbleImg from "../../img/RockRumble.png";
import UrbanSoulImg from "../../img/UrbanSoul.png";
import ChillHopCafeImg from "../../img/ChillHopCafe.png";
import CosmicJazzImg from "../../img/CosmicJazz.png";
import LoFiTempleImg from "../../img/LofiTemple.png";

// Top Artists imports
import TheSynthLordsImg from "../../img/TheSynthLords.png";
import VelvetEchoImg from "../../img/VelvetEcho.png";
import DJNovaImg from "../../img/DJNova.png";
import TheGrooveMechanicsImg from "../../img/TheGrooveMechanics.png";
import IndigoRainImg from "../../img/IndigoRain.png";
import ZaraMoonlightImg from "../../img/ZaraMoonlight.png";

const BrowseRadioStations = () => {
  const scrollRef = useRef(null);

  const [genres] = useState([
    "Lo-Fi", "Jazz", "Reggae", "Electronic", "Talk Radio", "Rock", "Hip Hop",
    "Classical", "Indie", "Ambient", "Soul", "R&B", "Funk", "Country",
    "Latin", "Afrobeats", "K-Pop", "Pop", "House", "Techno", "Dubstep",
    "News", "Sports", "Spiritual"
  ]);

  const [allStations, setAllStations] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);

  useEffect(() => {
    // Combine all into one list
    const combinedStations = [
      // New Stations
      { name: "LoFi Dreams", genre: "Lo-Fi", description: "Relaxing lo-fi beats.", image: LofiDreamsImg },
      { name: "Jazz Lounge", genre: "Jazz", description: "Smooth & classy jazz.", image: JazzLoungeImg },
      { name: "Talk Nation", genre: "Talk Radio", description: "News and discussions.", image: TalkNationImg },
      { name: "Electric Vibes", genre: "Electronic", description: "Club and synth mixes.", image: ElectricVibesImg },
      { name: "Reggae Rootz", genre: "Reggae", description: "Island rhythms and roots.", image: ReggaeRootzImg },
      { name: "Morning Classical", genre: "Classical", description: "Uplifting orchestral works.", image: MorningClassicalImg },

      // Top Stations
      { name: "Pop Pulse", genre: "Pop", description: "Top charting hits.", image: PopPulseImg },
      { name: "Rock Rumble", genre: "Rock", description: "Hard-hitting rock classics.", image: RockRumbleImg },
      { name: "Urban Soul", genre: "Soul", description: "Silky vocals & slow grooves.", image: UrbanSoulImg },
      { name: "Chill Hop Cafe", genre: "Hip Hop", description: "Instrumental hip hop.", image: ChillHopCafeImg },
      { name: "Cosmic Jazz", genre: "Jazz", description: "Out-of-this-world improvisation.", image: CosmicJazzImg },
      { name: "LoFi Temple", genre: "Lo-Fi", description: "Zen and mellow beats.", image: LoFiTempleImg },

      // Top Artists
      { name: "The Synth Lords", genre: "Electronic", description: "Retro synthwave duos.", image: TheSynthLordsImg },
      { name: "Velvet Echo", genre: "Soul", description: "Smooth vocal powerhouse.", image: VelvetEchoImg },
      { name: "DJ Nova", genre: "House", description: "Galactic EDM grooves.", image: DJNovaImg },
      { name: "The Groove Mechanics", genre: "Funk", description: "Bass-heavy funkadelics.", image: TheGrooveMechanicsImg },
      { name: "Indigo Rain", genre: "Indie", description: "Dreamy alternative sounds.", image: IndigoRainImg },
      { name: "Zara Moonlight", genre: "Pop", description: "Chart-topping solo artist.", image: ZaraMoonlightImg }
    ];

    setAllStations(combinedStations);
  }, []);

  const scrollLeft = () => scrollRef.current.scrollLeft -= 200;
  const scrollRight = () => scrollRef.current.scrollLeft += 200;

  const renderSection = (title, filteredList) => (
    <div className="podcast-section">
      <h2 className="section-title">{title}</h2>
      <div className="podcast-scroll-row">
        {filteredList.map((station, index) => (
          <div key={index} className="podcast-card">
            <img src={station.image} alt={station.name} className="podcast-img" />
            <h3 className="podcast-title">{station.name}</h3>
            <span className="podcast-label">{station.genre}</span>
            <p className="podcast-desc">{station.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const filteredStations = selectedGenre
    ? allStations.filter(station => station.genre === selectedGenre)
    : allStations;

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">🎵 Radio Genres</h1>

      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          {genres.map((g, index) => (
            <div
              key={index}
              onClick={() => setSelectedGenre(g)}
              className={`category-pill ${selectedGenre === g ? "active" : ""}`}
            >
              {g}
            </div>
          ))}
        </div>
        <button onClick={scrollRight} className="scroll-button">›</button>
      </div>

      {selectedGenre ? (
        renderSection(`🎯 ${selectedGenre} Stations`, filteredStations)
      ) : (
        <>
          {renderSection("🆕 New This Week", allStations.slice(0, 6))}
          {renderSection("📻 Top Radio Stations", allStations.slice(6, 12))}
          {renderSection("🌟 Top Artists", allStations.slice(12))}
        </>
      )}
    </div>
  );
};

export default BrowseRadioStations;
