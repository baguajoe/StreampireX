import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
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
  const { genre } = useParams();
  const scrollRef = useRef(null);

  const [genres] = useState([
    "Lo-Fi", "Jazz", "Reggae", "Electronic", "Talk Radio", "Rock", "Hip Hop",
    "Classical", "Indie", "Ambient", "Soul", "R&B", "Funk", "Country",
    "Latin", "Afrobeats", "K-Pop", "Pop", "House", "Techno", "Dubstep",
    "News", "Sports", "Spiritual"
  ]);

  const [newStations, setNewStations] = useState([]);
  const [topStations, setTopStations] = useState([]);
  const [topArtists, setTopArtists] = useState([]);

  useEffect(() => {
    setNewStations([
      { name: "LoFi Dreams", genre: "Lo-Fi", description: "Relaxing lo-fi beats.", image: LofiDreamsImg },
      { name: "Jazz Lounge", genre: "Jazz", description: "Smooth & classy jazz.", image: JazzLoungeImg },
      { name: "Talk Nation", genre: "Talk Radio", description: "News and discussions.", image: TalkNationImg },
      { name: "Electric Vibes", genre: "Electronic", description: "Club and synth mixes.", image: ElectricVibesImg },
      { name: "Reggae Rootz", genre: "Reggae", description: "Island rhythms and roots.", image: ReggaeRootzImg },
      { name: "Morning Classical", genre: "Classical", description: "Uplifting orchestral works.", image: MorningClassicalImg }
    ]);

    setTopStations([
      { name: "Pop Pulse", genre: "Pop", description: "Top charting hits.", image: PopPulseImg },
      { name: "Rock Rumble", genre: "Rock", description: "Hard-hitting rock classics.", image: RockRumbleImg },
      { name: "Urban Soul", genre: "Soul", description: "Silky vocals & slow grooves.", image: UrbanSoulImg },
      { name: "Chill Hop Cafe", genre: "Hip Hop", description: "Instrumental hip hop.", image: ChillHopCafeImg },
      { name: "Cosmic Jazz", genre: "Jazz", description: "Out-of-this-world improvisation.", image: CosmicJazzImg },
      { name: "LoFi Temple", genre: "Lo-Fi", description: "Zen and mellow beats.", image: LoFiTempleImg }
    ]);

    setTopArtists([
      { name: "The Synth Lords", genre: "Electronic", description: "Retro synthwave duos.", image: TheSynthLordsImg },
      { name: "Velvet Echo", genre: "Soul", description: "Smooth vocal powerhouse.", image: VelvetEchoImg },
      { name: "DJ Nova", genre: "House", description: "Galactic EDM grooves.", image: DJNovaImg },
      { name: "The Groove Mechanics", genre: "Funk", description: "Bass-heavy funkadelics.", image: TheGrooveMechanicsImg },
      { name: "Indigo Rain", genre: "Indie", description: "Dreamy alternative sounds.", image: IndigoRainImg },
      { name: "Zara Moonlight", genre: "Pop", description: "Chart-topping solo artist.", image: ZaraMoonlightImg }
    ]);
  }, []);

  const scrollLeft = () => scrollRef.current.scrollLeft -= 200;
  const scrollRight = () => scrollRef.current.scrollLeft += 200;

  const renderSection = (title, list) => (
    <div className="podcast-section">
      <h2 className="section-title">{title}</h2>
      <div className="podcast-scroll-row">
        {list.map((station, index) => (
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

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">🎵 Radio Categories</h1>

      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          {genres.map((g, index) => (
            <Link
              key={index}
              to={`/radio/genre/${encodeURIComponent(g)}`}
              className={`category-pill ${genre === g ? "active" : ""}`}
            >
              {g}
            </Link>
          ))}
        </div>
        <button onClick={scrollRight} className="scroll-button">›</button>
      </div>

      {renderSection("🆕 New This Week", newStations)}
      {renderSection("📻 Top Radio Stations", topStations)}
      {renderSection("🌟 Top Artists", topArtists)}
    </div>
  );
};

export default BrowseRadioStations;