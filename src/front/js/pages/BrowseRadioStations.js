import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/BrowseStations.css";

// Your station images
import LofiDreamsImg from "../../img/LofiDreams.png";
import JazzLoungeImg from "../../img/JazzLounge.png";
import TalkNationImg from "../../img/TalkNation.png";
import ElectricVibesImg from "../../img/ElectricVibes.png";
// ... other imports

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

  // 🎯 MINIMAL REAL CONTENT STRATEGY
  // Create one real station per major category to seed your platform
  const seedStations = [
    {
      id: "seed_lofi",
      name: "StreampireX LoFi",
      genre: "Lo-Fi",
      description: "Official StreampireX lo-fi station for study and focus",
      image: LofiDreamsImg,
      creator_name: "StreampireX",
      is_live: true,
      isOfficial: true,
      stream_url: "your-actual-lofi-stream-url"
    },
    {
      id: "seed_news",
      name: "StreampireX News",
      genre: "News",
      description: "Breaking news and tech updates",
      image: TalkNationImg,
      creator_name: "StreampireX",
      is_live: true,
      isOfficial: true,
      stream_url: "your-actual-news-stream-url"
    },
    {
      id: "seed_electronic",
      name: "StreampireX Electronic",
      genre: "Electronic",
      description: "Latest electronic and EDM hits",
      image: ElectricVibesImg,
      creator_name: "StreampireX",
      is_live: true,
      isOfficial: true,
      stream_url: "your-actual-electronic-stream-url"
    }
    // Add 1-2 more in your strongest categories
  ];

  // 🌐 SMART EXTERNAL FALLBACK STRATEGY
  // Only fetch external stations for genres where you have no content
  const getGenreFallback = async (genre) => {
    const genreMapping = {
      "Lo-Fi": "lofi",
      "Jazz": "jazz",
      "Electronic": "electronic",
      "Hip Hop": "hip-hop",
      "Rock": "rock",
      "Pop": "pop",
      "Classical": "classical",
      "Country": "country",
      "R&B": "rnb",
      "Reggae": "reggae"
    };

    try {
      const searchTerm = genreMapping[genre] || genre.toLowerCase();
      const response = await fetch(
        `https://de1.api.radio-browser.info/json/stations/search?tag=${searchTerm}&limit=6&hidebroken=true&has_geo_info=true&order=clickcount&reverse=true`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) throw new Error(`External API failed: ${response.status}`);

      const data = await response.json();
      return data.slice(0, 6).map(station => ({
        id: `external_${station.stationuuid}`,
        name: station.name,
        genre: genre,
        description: `${station.country || 'Global'} ${genre} station`,
        image: station.favicon || '/default-radio-icon.png',
        stream_url: station.url_resolved,
        creator_name: station.country || 'Global Radio',
        is_live: true,
        isExternal: true,
        followers_count: Math.floor(station.clickcount / 100) || 0
      }));
    } catch (error) {
      console.error(`Failed to get ${genre} fallback:`, error);
      return [];
    }
  };

  // 📡 FETCH YOUR REAL USER STATIONS
  const fetchUserStations = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/radio-stations`, {
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      let stations = Array.isArray(data) ? data : (data?.stations || []);

      const validStations = stations.map(station => ({
        id: station.id,
        name: station.name || 'Unnamed Station',
        genre: station.genre || station.genres?.[0] || 'Music',
        description: station.description || 'Community radio station',
        image: station.image || station.logo_url || '/default-station.png',
        creator_name: station.creator_name || 'Community Creator',
        is_live: station.is_live || false,
        isUserCreated: true,
        followers_count: station.followers_count || 0
      }));

      setUserStations(validStations);
      console.log(`✅ Loaded ${validStations.length} user stations`);

    } catch (error) {
      console.error('❌ User stations failed:', error);
      setError('Could not load community stations');
    }
  };

  // 🎯 MAIN LOADING STRATEGY
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      
      // Always try to load user stations first
      await fetchUserStations();
      
      // Get genre coverage
      const allRealStations = [...seedStations, ...userStations];
      const coveredGenres = new Set(allRealStations.map(s => s.genre));
      const uncoveredGenres = genres.filter(g => !coveredGenres.has(g));

      // Only fetch external for uncovered genres (limit to prevent overwhelming)
      if (uncoveredGenres.length > 0) {
        console.log(`🌐 Fetching fallback for uncovered genres: ${uncoveredGenres.slice(0, 8).join(', ')}`);
        
        const externalPromises = uncoveredGenres
          .slice(0, 8) // Limit to 8 genres to avoid API overload
          .map(genre => getGenreFallback(genre));
        
        try {
          const externalResults = await Promise.allSettled(externalPromises);
          const allExternal = externalResults
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value);
          
          setExternalStations(allExternal);
          console.log(`🌐 Loaded ${allExternal.length} external fallback stations`);
        } catch (error) {
          console.log('External fallback failed, continuing with seed only');
        }
      }

      setLoading(false);
    };

    loadContent();
  }, []);

  // 🎨 SMART CONTENT AGGREGATION
  const allAvailableStations = React.useMemo(() => {
    return [
      ...seedStations,           // Your minimal real content first
      ...userStations,           // User-created content  
      ...externalStations        // External fallback for missing genres
    ];
  }, [userStations, externalStations]);

  // 🔍 FILTERING WITH SMART FALLBACKS
  const getStationsForGenre = (genre) => {
    const genreStations = allAvailableStations.filter(s => s.genre === genre);
    
    // If no stations for this genre, show message with create button
    if (genreStations.length === 0) {
      return {
        stations: [],
        isEmpty: true,
        message: `No ${genre} stations yet. Be the first to create one!`
      };
    }
    
    return { stations: genreStations, isEmpty: false };
  };

  // 📱 SCROLL CONTROLS
  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });

  // 🎨 SECTION RENDERER WITH SMART EMPTY STATES
  const renderSection = (title, stationList, genre = null) => {
    return (
      <div className="podcast-section">
        <h2 className="section-title">{title}</h2>
        {stationList.length === 0 ? (
          <div className="empty-genre-state" style={{
            background: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px dashed #333'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎙️</div>
            <h4>No {genre || 'stations'} yet!</h4>
            <p>Be the first creator in this category</p>
            <button 
              onClick={() => navigate('/create-radio-station')}
              style={{
                background: '#00ffc8',
                color: '#000',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginTop: '10px',
                fontWeight: 'bold'
              }}
            >
              🚀 Create {genre || 'Station'}
            </button>
          </div>
        ) : (
          <div className="podcast-scroll-row">
            {stationList.map((station) => (
              <Link
                to={`/radio/station/${station.id}/${station.isOfficial || station.isUserCreated ? 'dynamic' : 'external'}`}
                key={station.id}
                className="podcast-card"
                style={{ position: 'relative' }}
              >
                {/* Official badge */}
                {station.isOfficial && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: '#00ffc8',
                    color: '#000',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    zIndex: 2
                  }}>
                    ✅ OFFICIAL
                  </div>
                )}

                {/* Live indicator */}
                {station.is_live && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#ff4757',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    zIndex: 2
                  }}>
                    🔴 LIVE
                  </div>
                )}

                {/* External indicator */}
                {station.isExternal && (
                  <div style={{
                    position: 'absolute',
                    bottom: '60px',
                    right: '8px',
                    background: '#666',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    zIndex: 2
                  }}>
                    🌐 GLOBAL
                  </div>
                )}

                <img
                  src={station.image}
                  alt={station.name}
                  className="podcast-img"
                  onError={(e) => e.target.src = '/default-station.png'}
                />
                <h3 className="podcast-title">{station.name}</h3>
                <span className="podcast-label">{station.genre}</span>
                <p className="podcast-desc">{station.description}</p>
                <p className="station-creator" style={{ fontSize: '12px', color: '#888' }}>
                  by {station.creator_name}
                </p>
                {station.followers_count > 0 && (
                  <p style={{ fontSize: '12px', color: '#00ffc8' }}>
                    👥 {station.followers_count}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">📡 Browse Radio Stations</h1>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem' }}>🔄</div>
          <p>Loading stations...</p>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          padding: '15px',
          borderRadius: '8px',
          margin: '15px 0',
          color: '#c33'
        }}>
          ⚠️ {error} - Showing available content
        </div>
      )}

      {!loading && (
        <>
          {/* Genre Navigation */}
          <div className="category-nav">
            <button onClick={scrollLeft} className="scroll-button">‹</button>
            <div className="categories-scroll" ref={scrollRef}>
              <div
                onClick={() => setSelectedGenre(null)}
                className={`category-pill ${!selectedGenre ? "active" : ""}`}
              >
                All Stations
              </div>
              {genres.map((genre, index) => {
                const genreStations = allAvailableStations.filter(s => s.genre === genre);
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedGenre(genre)}
                    className={`category-pill ${selectedGenre === genre ? "active" : ""}`}
                    style={{
                      opacity: genreStations.length === 0 ? 0.6 : 1,
                      position: 'relative'
                    }}
                  >
                    {genre}
                    {genreStations.length === 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: '#ff4757',
                        color: 'white',
                        fontSize: '8px',
                        padding: '1px 3px',
                        borderRadius: '50%'
                      }}>
                        !
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={scrollRight} className="scroll-button">›</button>
          </div>

          {/* Content Sections */}
          {selectedGenre ? (
            // Single genre view
            (() => {
              const result = getStationsForGenre(selectedGenre);
              return renderSection(`🎯 ${selectedGenre} Stations`, result.stations, selectedGenre);
            })()
          ) : (
            // All sections view
            <>
              {/* Always show your official stations first */}
              {renderSection("🏢 StreampireX Official", seedStations)}
              
              {/* Community stations if any exist */}
              {userStations.length > 0 && 
                renderSection("🎙️ Community Stations", userStations)
              }
              
              {/* External fallback content */}
              {externalStations.length > 0 && 
                renderSection("🌐 Discover Global Radio", externalStations.slice(0, 12))
              }

              {/* Call to action for empty platform */}
              {userStations.length === 0 && (
                <div style={{
                  background: '#1a1a1a',
                  padding: '3rem',
                  borderRadius: '12px',
                  textAlign: 'center',
                  margin: '2rem 0'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                  <h3>Ready to Start Broadcasting?</h3>
                  <p>StreampireX is just getting started. Be an early creator and help build the community!</p>
                  <button 
                    onClick={() => navigate('/create-radio-station')}
                    style={{
                      background: '#00ffc8',
                      color: '#000',
                      border: 'none',
                      padding: '15px 30px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginTop: '1rem'
                    }}
                  >
                    🎙️ Create Your Radio Station
                  </button>
                </div>
              )}
            </>
          )}

          {/* Platform stats */}
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#888',
            fontSize: '14px'
          }}>
            <p>
              {allAvailableStations.length} total stations • 
              {seedStations.length} official • 
              {userStations.length} community • 
              {externalStations.length} global
            </p>
            <p style={{ marginTop: '5px' }}>
              Platform is growing - be part of the early creator community! 🚀
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BrowseRadioStations;