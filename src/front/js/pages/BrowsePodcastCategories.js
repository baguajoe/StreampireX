import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/CategoriesBar.css";

// Your podcast images
import podcast1 from "../../img/podcast1.png";
import podcast2 from "../../img/podcast2.png";
import podcast3 from "../../img/podcast3.png";
import podcast4 from "../../img/podcast4.png";
import podcast5 from "../../img/podcast5.png";
import podcast6 from "../../img/podcast6.png";

const BrowsePodcastCategories = () => {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const [categories] = useState([
    "True Crime & Investigation",
    "Comedy & Entertainment",
    "Technology & Innovation",
    "Health & Wellness",
    "Business & Finance",
    "Education & Learning",
    "Sports & Recreation",
    "Arts & Culture",
    "News & Politics",
    "Society & Philosophy",
    "Science & Nature",
    "History & Biography"
  ]);

  const [userPodcasts, setUserPodcasts] = useState([]);
  const [externalPodcasts, setExternalPodcasts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Category mapping function to convert API categories to display categories
  const getCategoryDisplayName = (apiCategory) => {
    const categoryMap = {
      'film-tv-reviews': 'Arts & Culture',
      'health-wellness': 'Health & Wellness',
      'education-learning': 'Education & Learning',
      'tabletop-board-games': 'Sports & Recreation',
      'celebrity-gossip-reality-tv': 'Comedy & Entertainment',
      'comedy-stand-up': 'Comedy & Entertainment',
      'technology': 'Technology & Innovation',
      'business': 'Business & Finance',
      'true-crime': 'True Crime & Investigation',
      'news': 'News & Politics',
      'science': 'Science & Nature',
      'history': 'History & Biography'
    };

    return categoryMap[apiCategory] || 'Society & Philosophy';
  };

  // 🎯 SEED PODCASTS - Your minimal real content (1-2 per major category)
  const seedPodcasts = [
    {
      id: "seed_tech",
      title: "StreampireX Tech Talk",
      description: "Latest in streaming technology and creator tools",
      category: "Technology & Innovation",
      image: podcast1,
      creator_name: "StreampireX",
      episode_count: 5,
      isOfficial: true,
      duration: "25-30 min",
      status: "active"
    },
    {
      id: "seed_business",
      title: "Creator Economy Insights",
      description: "Building sustainable creator businesses",
      category: "Business & Finance",
      image: podcast2,
      creator_name: "StreampireX",
      episode_count: 3,
      isOfficial: true,
      duration: "35-40 min",
      status: "active"
    },
    {
      id: "seed_entertainment",
      title: "StreampireX Comedy Hour",
      description: "Laughs and entertainment from our community",
      category: "Comedy & Entertainment",
      image: podcast4,
      creator_name: "StreampireX",
      episode_count: 8,
      isOfficial: true,
      duration: "20-25 min",
      status: "active"
    }
  ];

  // 📡 FETCH USER-CREATED PODCASTS
  const fetchUserPodcasts = async (attempt = 1) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/podcasts/browse`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle different API response formats
      let podcasts = [];
      if (Array.isArray(data)) {
        podcasts = data;
      } else if (data?.podcasts && Array.isArray(data.podcasts)) {
        podcasts = data.podcasts;
      } else if (data?.data && Array.isArray(data.data)) {
        podcasts = data.data;
      }

      // Transform and validate podcast data
      const validPodcasts = podcasts
        .filter(podcast => podcast && podcast.id && podcast.title)
        .map(podcast => ({
          id: podcast.id,
          title: podcast.title || 'Untitled Podcast',
          description: podcast.description || 'A great podcast on StreampireX',
          category: getCategoryDisplayName(podcast.category),
          image: podcast.cover_art_url || podcast.image || podcast.cover_image || podcast.thumbnail_url || '/default-podcast.png',
          creator_name: podcast.creator_name || podcast.host || 'Community Creator',
          episode_count: podcast.episode_count || podcast.episodes?.length || 0,
          isUserCreated: true,
          duration: podcast.average_duration || 'Varies',
          status: podcast.status || 'active',
          created_at: podcast.created_at,
          plays: podcast.total_plays || podcast.play_count || 0
        }));

      setUserPodcasts(validPodcasts);
      console.log(`✅ Loaded ${validPodcasts.length} user podcasts`);
      return validPodcasts;

    } catch (error) {
      console.error(`❌ User podcasts API attempt ${attempt} failed:`, error.message);

      if (attempt < 3) {
        console.log(`🔄 Retrying in 2s... (${attempt}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchUserPodcasts(attempt + 1);
      }

      throw error;
    }
  };

  // 🌐 FETCH EXTERNAL PODCAST FALLBACK (using podcast APIs)
  const fetchExternalPodcasts = async () => {
    try {
      // You can use PodcastIndex API, Spotify Web API, or other podcast APIs
      // For demo, I'll show the structure you'd use
      const genres = ['technology', 'comedy', 'business', 'health', 'education'];
      const externalData = [];

      // Example: If you had podcast API access
      // const response = await fetch('https://api.podcastindex.org/api/1.0/search/byterm?q=technology&max=6');

      // For now, we'll create some fallback structure
      const fallbackPodcasts = [
        {
          id: 'ext_tech_1',
          title: 'Global Tech Trends',
          description: 'Technology insights from around the world',
          category: 'Technology & Innovation',
          image: podcast1,
          creator_name: 'Tech Global',
          episode_count: 150,
          isExternal: true,
          duration: '30-45 min'
        },
        {
          id: 'ext_comedy_1',
          title: 'International Comedy',
          description: 'Comedy from comedians worldwide',
          category: 'Comedy & Entertainment',
          image: podcast4,
          creator_name: 'Global Comedy Network',
          episode_count: 200,
          isExternal: true,
          duration: '25-30 min'
        }
      ];

      setExternalPodcasts(fallbackPodcasts);
      console.log(`🌐 Loaded ${fallbackPodcasts.length} external podcasts`);
      return fallbackPodcasts;

    } catch (error) {
      console.error('🌐 External podcasts failed:', error.message);
      return [];
    }
  };

  // 🚀 MAIN DATA LOADING
  useEffect(() => {
    const loadAllPodcasts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to load user podcasts first
        await fetchUserPodcasts();

        // Load external podcasts as fallback (non-blocking)
        fetchExternalPodcasts().catch(err => {
          console.log('External podcasts failed but continuing...', err.message);
        });

      } catch (userPodcastError) {
        console.error('❌ Failed to load user podcasts:', userPodcastError.message);
        setError('Unable to load community podcasts. Showing featured content only.');

        // Still try external as fallback
        await fetchExternalPodcasts();
      } finally {
        setLoading(false);
      }
    };

    loadAllPodcasts();
  }, []);

  // 🎯 SMART CONTENT AGGREGATION
  const allAvailablePodcasts = React.useMemo(() => {
    return [
      ...seedPodcasts,                    // Your official podcasts first
      ...userPodcasts,                    // Community podcasts
      ...externalPodcasts                 // External fallback
    ];
  }, [userPodcasts, externalPodcasts]);

  // 🔍 FILTERING LOGIC
  const filteredPodcasts = React.useMemo(() => {
    if (!selectedCategory) return allAvailablePodcasts;

    return allAvailablePodcasts.filter(podcast =>
      podcast.category === selectedCategory
    );
  }, [selectedCategory, allAvailablePodcasts]);

  // Group podcasts by category for organized display
  const podcastsByCategory = React.useMemo(() => {
    const grouped = {};

    allAvailablePodcasts.forEach(podcast => {
      const category = podcast.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(podcast);
    });

    return grouped;
  }, [allAvailablePodcasts]);

  // 📱 SCROLL CONTROLS
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // 🎨 SECTION RENDERER
  const renderSection = (title, podcastList, showEmpty = true) => {
    if (!showEmpty && podcastList.length === 0) return null;

    return (
      <div className="podcast-section">
        <h2 className="section-title">{title}</h2>
        {podcastList.length === 0 ? (
          <div className="empty-podcast-state" style={{
            background: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px dashed #333'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎙️</div>
            <h4>No podcasts in this category yet!</h4>
            <p>Be the first to create a podcast here</p>
            <button
              onClick={() => navigate('/create-podcast')}
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
              🚀 Create Podcast
            </button>
          </div>
        ) : (
          <div className="podcast-scroll-row">
            {podcastList.map((podcast) => (
              <Link
                to={`/podcast/${podcast.id}`}
                key={podcast.id}
                className="podcast-card"
                style={{ position: 'relative' }}
              >
                {/* Official badge */}
                {podcast.isOfficial && (
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

                {/* Active status indicator */}
                {podcast.status === 'active' && podcast.episode_count > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#4CAF50',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    zIndex: 2
                  }}>
                    🟢 ACTIVE
                  </div>
                )}

                {/* External indicator */}
                {podcast.isExternal && (
                  <div style={{
                    position: 'absolute',
                    bottom: '80px',
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
                  src={podcast.image}
                  alt={podcast.title}
                  className="podcast-img"
                  onError={(e) => {
                    e.target.src = '/default-podcast.png';
                  }}
                />
                <h3 className="podcast-title">{podcast.title}</h3>
                <span className="podcast-label">{podcast.category}</span>
                <p className="podcast-desc">{podcast.description}</p>

                {/* Creator and episode info */}
                <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                  <p>by {podcast.creator_name}</p>
                  <p>{podcast.episode_count} episodes • {podcast.duration}</p>
                  {podcast.plays > 0 && (
                    <p style={{ color: '#00ffc8' }}>🎧 {podcast.plays} plays</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 🔄 RETRY HANDLER
  const handleRetry = () => {
    setError(null);
    setLoading(true);

    const loadAllPodcasts = async () => {
      try {
        await fetchUserPodcasts();
        await fetchExternalPodcasts();
      } catch (error) {
        setError('Failed to load podcasts after retry.');
      } finally {
        setLoading(false);
      }
    };

    loadAllPodcasts();
  };

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">🎧 Browse Podcasts</h1>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
          <p>Loading podcasts...</p>
        </div>
      )}

      {/* Error State with Retry */}
      {error && !loading && (
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          padding: '15px',
          borderRadius: '8px',
          margin: '15px 0',
          color: '#c33',
          textAlign: 'center'
        }}>
          <p>⚠️ {error}</p>
          <button
            onClick={handleRetry}
            style={{
              background: '#00ffc8',
              color: '#000',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            🔄 Retry Loading
          </button>
        </div>
      )}

      {/* Category Navigation */}
      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          <div
            onClick={() => setSelectedCategory(null)}
            className={`category-pill ${!selectedCategory ? "active" : ""}`}
          >
            All Podcasts
          </div>
          {categories.map((category, index) => {
            const categoryPodcasts = allAvailablePodcasts.filter(p => p.category === category);
            return (
              <div
                key={index}
                onClick={() => setSelectedCategory(category)}
                className={`category-pill ${selectedCategory === category ? "active" : ""}`}
                style={{
                  opacity: categoryPodcasts.length === 0 ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                {category}
                {categoryPodcasts.length === 0 && (
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
      {!loading && (
        <>
          {selectedCategory ? (
            // Filtered view - show only selected category
            renderSection(`🎯 ${selectedCategory}`, filteredPodcasts)
          ) : (
            // All sections view - show podcasts organized by categories
            <>
              {renderSection("🏢 StreampireX Originals", seedPodcasts)}

              {/* Render each category with its podcasts */}
              {categories.map(category => {
                const categoryPodcasts = userPodcasts.filter(podcast => podcast.category === category);
                if (categoryPodcasts.length > 0) {
                  return renderSection(`📂 ${category}`, categoryPodcasts, false);
                }
                return null;
              })}

              {externalPodcasts.length > 0 && (
                renderSection("🌐 Featured Global Podcasts", externalPodcasts)
              )}

              {/* Empty state for new platforms */}
              {userPodcasts.length === 0 && externalPodcasts.length === 0 && !loading && (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  background: '#1a1a1a',
                  borderRadius: '12px',
                  margin: '2rem 0'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙️</div>
                  <h3>Ready to Start Your Podcast?</h3>
                  <p>StreampireX is the perfect platform for podcasters. Create your show and reach new audiences!</p>
                  <button
                    onClick={() => navigate('/create-podcast')}
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
                    🚀 Create Your Podcast
                  </button>
                </div>
              )}
            </>
          )}

          {/* Platform Stats */}
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#888',
            fontSize: '14px'
          }}>
            <p>
              {allAvailablePodcasts.length} total podcasts •
              {seedPodcasts.length} originals •
              {userPodcasts.length} community •
              {externalPodcasts.length} featured
            </p>
            <p style={{ marginTop: '5px' }}>
              Join the growing community of podcasters on StreampireX! 🎧
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BrowsePodcastCategories;