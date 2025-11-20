import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/BrowseStations.css";

// Station images
import LofiDreamsImg from "../../img/LofiDreams.png";
import JazzLoungeImg from "../../img/JazzLounge.png";
import TalkNationImg from "../../img/TalkNation.png";
import ElectricVibesImg from "../../img/ElectricVibes.png";

const BrowseRadioStations = () => {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const [genres] = useState([
    "Lo-Fi", "Jazz", "Reggae", "Electronic", "Talk Radio", "Rock", "Hip Hop",
    "Classical", "Indie", "Ambient", "Soul", "R&B", "Funk", "Country",
    "Latin", "Afrobeats", "K-Pop", "Pop", "House", "Techno", "Dubstep",
    "News", "Sports", "Spiritual"
  ]);

  const [userStations, setUserStations] = useState([]);
  const [externalStations, setExternalStations] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Built-in seed stations
  const seedStations = [
    {
      id: "seed_lofi",
      name: "StreampireX LoFi",
      genre: "Lo-Fi",
      description: "Official StreampireX lo-fi station",
      image: LofiDreamsImg,
      creator_name: "StreampireX",
      is_live: true,
      isOfficial: true
    },
    {
      id: "seed_news",
      name: "StreampireX News",
      genre: "News",
      description: "Breaking news & updates",
      image: TalkNationImg,
      creator_name: "StreampireX",
      is_live: true,
      isOfficial: true
    },
    {
      id: "seed_electronic",
      name: "StreampireX Electronic",
      genre: "Electronic",
      description: "Official EDM & electronic stream",
      image: ElectricVibesImg,
      creator_name: "StreampireX",
      is_live: true,
      isOfficial: true
    }
  ];

  const fetchUserStations = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${backendUrl}/api/radio-stations`);

      if (!res.ok) throw new Error("Failed to load stations");

      const data = await res.json();
      const stations = Array.isArray(data) ? data : data?.stations || [];

      const formatted = stations.map((s) => ({
        id: s.id,
        name: s.name || "Unnamed Station",
        genre: s.genre || s.genres?.[0] || "Music",
        description: s.description || "Community radio",
        image: s.image || "/default-station.png",
        creator_name: s.creator_name || "Community Creator",
        is_live: s.is_live || false,
        followers_count: s.followers_count || 0,
        isUserCreated: true
      }));

      setUserStations(formatted);
    } catch (err) {
      setError("Unable to load user stations");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchUserStations();
      setLoading(false);
    };

    load();
  }, []);

  // ALL STATIONS (official + user + external)
  const allStations = useMemo(
    () => [...seedStations, ...userStations, ...externalStations],
    [userStations, externalStations]
  );

  const filterByGenre = (genre) => {
    return allStations.filter((s) => s.genre === genre);
  };

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" });

  // Render radio section
  const renderSection = (title, stations, genre = null) => {
    return (
      <div className="radio-section">
        <h2 className="radio-section-title">{title}</h2>

        {stations.length === 0 ? (
          <div className="radio-empty">
            <h4>No {genre || "stations"} available.</h4>
            <button
              className="radio-create-btn"
              onClick={() => navigate("/create-radio-station")}
            >
              Create Station
            </button>
          </div>
        ) : (
          <div className="radio-grid">
            {stations.map((station) => (
              <Link
                key={station.id}
                to={`/radio/station/${station.id}`}
                className="radio-card"
              >
                {station.isOfficial && <span className="radio-badge official">OFFICIAL</span>}
                {station.is_live && <span className="radio-badge live">LIVE</span>}

                <img
                  src={station.image}
                  onError={(e) => (e.target.src = "/default-station.png")}
                  alt={station.name}
                />

                <h3>{station.name}</h3>
                <span className="radio-genre">{station.genre}</span>
                <p className="radio-desc">{station.description}</p>
                <p className="radio-creator">by {station.creator_name}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="radio-wrapper">
      <h1 className="radio-title">📡 Browse Radio Stations</h1>

      {/* GENRE NAVIGATION */}
      <div className="radio-nav">
        <button className="radio-scroll-btn" onClick={scrollLeft}>‹</button>

        <div className="radio-nav-scroll" ref={scrollRef}>
          <div
            className={`radio-pill ${!selectedGenre ? "active" : ""}`}
            onClick={() => setSelectedGenre(null)}
          >
            All Stations
          </div>

          {genres.map((genre, idx) => (
            <div
              key={idx}
              className={`radio-pill ${selectedGenre === genre ? "active" : ""}`}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </div>
          ))}
        </div>

        <button className="radio-scroll-btn" onClick={scrollRight}>›</button>
      </div>

      {/* PAGE CONTENT */}
      {loading ? (
        <div className="radio-loading">Loading…</div>
      ) : selectedGenre ? (
        renderSection(`${selectedGenre} Stations`, filterByGenre(selectedGenre), selectedGenre)
      ) : (
        <>
          {renderSection("⭐ Official Stations", seedStations)}
          {userStations.length > 0 && renderSection("🎙 Community Stations", userStations)}
          {externalStations.length > 0 &&
            renderSection("🌍 Global Stations", externalStations.slice(0, 12))}
        </>
      )}
    </div>
  );
};

export default BrowseRadioStations;
