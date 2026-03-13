import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/BrowseProducersPage.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

const placeholderProducers = [
  {
    id: "p1",
    name: "Nova Keys",
    avatar: "https://via.placeholder.com/100x100.png?text=NK",
    banner: "https://via.placeholder.com/800x300.png?text=Nova+Keys",
    beatCount: 128,
    totalPlays: 58240,
    totalSales: 412,
    genres: ["Trap", "Melodic", "Dark"],
    lowestPrice: 29,
    verified: true,
    featured: true,
    location: "Atlanta, GA",
    bio: "Melodic trap producer with cinematic textures and hard 808 bounce.",
    topBeat: {
      title: "Midnight Vows",
      artwork_url: "https://via.placeholder.com/400x250.png?text=Midnight+Vows"
    }
  },
  {
    id: "p2",
    name: "Wave Theory",
    avatar: "https://via.placeholder.com/100x100.png?text=WT",
    banner: "https://via.placeholder.com/800x300.png?text=Wave+Theory",
    beatCount: 94,
    totalPlays: 40120,
    totalSales: 276,
    genres: ["R&B", "Soul", "Afrobeat"],
    lowestPrice: 35,
    verified: true,
    featured: true,
    location: "Los Angeles, CA",
    bio: "Smooth R&B and crossover Afrobeat production for artists building records.",
    topBeat: {
      title: "Late Signals",
      artwork_url: "https://via.placeholder.com/400x250.png?text=Late+Signals"
    }
  },
  {
    id: "p3",
    name: "808 Bishop",
    avatar: "https://via.placeholder.com/100x100.png?text=8B",
    banner: "https://via.placeholder.com/800x300.png?text=808+Bishop",
    beatCount: 203,
    totalPlays: 89210,
    totalSales: 521,
    genres: ["Drill", "Trap", "Street"],
    lowestPrice: 25,
    verified: false,
    featured: true,
    location: "Chicago, IL",
    bio: "Heavy drums, dark piano loops, and aggressive bounce for drill and trap records.",
    topBeat: {
      title: "No Sleep District",
      artwork_url: "https://via.placeholder.com/400x250.png?text=No+Sleep+District"
    }
  },
  {
    id: "p4",
    name: "Skyline Audio",
    avatar: "https://via.placeholder.com/100x100.png?text=SA",
    banner: "https://via.placeholder.com/800x300.png?text=Skyline+Audio",
    beatCount: 76,
    totalPlays: 25800,
    totalSales: 188,
    genres: ["Pop", "Dance", "House"],
    lowestPrice: 39,
    verified: false,
    featured: false,
    location: "Miami, FL",
    bio: "Clean pop production, dance grooves, and radio-ready arrangements.",
    topBeat: {
      title: "Neon Escape",
      artwork_url: "https://via.placeholder.com/400x250.png?text=Neon+Escape"
    }
  },
  {
    id: "p5",
    name: "Soul Harbor",
    avatar: "https://via.placeholder.com/100x100.png?text=SH",
    banner: "https://via.placeholder.com/800x300.png?text=Soul+Harbor",
    beatCount: 62,
    totalPlays: 19450,
    totalSales: 121,
    genres: ["Lo-Fi", "Boom Bap", "Jazz"],
    lowestPrice: 20,
    verified: false,
    featured: false,
    location: "Brooklyn, NY",
    bio: "Warm boom bap, dusty drums, and soulful sample-inspired production.",
    topBeat: {
      title: "Corner Stories",
      artwork_url: "https://via.placeholder.com/400x250.png?text=Corner+Stories"
    }
  },
  {
    id: "p6",
    name: "Aether Gold",
    avatar: "https://via.placeholder.com/100x100.png?text=AG",
    banner: "https://via.placeholder.com/800x300.png?text=Aether+Gold",
    beatCount: 111,
    totalPlays: 33990,
    totalSales: 233,
    genres: ["Cinematic", "Ambient", "Hip Hop"],
    lowestPrice: 45,
    verified: true,
    featured: false,
    location: "Seattle, WA",
    bio: "Epic cinematic textures and emotional hip hop production for standout records.",
    topBeat: {
      title: "Gold Horizon",
      artwork_url: "https://via.placeholder.com/400x250.png?text=Gold+Horizon"
    }
  }
];

const categories = [
  { key: "all", label: "All Producers" },
  { key: "Trap", label: "Trap" },
  { key: "Drill", label: "Drill" },
  { key: "R&B", label: "R&B" },
  { key: "Pop", label: "Pop" },
  { key: "Afrobeat", label: "Afrobeat" },
  { key: "Boom Bap", label: "Boom Bap" },
  { key: "Lo-Fi", label: "Lo-Fi" },
  { key: "Cinematic", label: "Cinematic" }
];

const BrowseProducersPage = () => {
  const navigate = useNavigate();

  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("top_sellers");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetchProducers();
  }, [sortBy]);

  const fetchProducers = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `${BACKEND}/api/beats?per_page=200&sort=${
          sortBy === "top_sellers" ? "best_selling" : "newest"
        }`
      );

      const data = await res.json();
      const beats = data?.beats || [];

      if (!beats.length) {
        setProducers(placeholderProducers);
        setLoading(false);
        return;
      }

      const map = {};

      for (const b of beats) {
        if (!map[b.producer_id]) {
          map[b.producer_id] = {
            id: b.producer_id,
            name: b.producer_name || "Unknown Producer",
            avatar: b.producer_avatar || "https://via.placeholder.com/100x100.png?text=P",
            banner: b.artwork_url || "https://via.placeholder.com/800x300.png?text=Producer+Banner",
            beats: [],
            totalPlays: 0,
            totalSales: 0,
            genres: new Set(),
            verified: !!b.producer_verified,
            featured: false,
            location: b.producer_location || "Worldwide",
            bio: b.producer_bio || "Independent producer creating high-quality beats for artists.",
          };
        }

        const p = map[b.producer_id];
        p.beats.push(b);
        p.totalPlays += Number(b.plays || 0);
        p.totalSales += Number(b.total_sales || 0);
        if (b.genre) p.genres.add(b.genre);
      }

      let list = Object.values(map).map((p) => {
        const paidBeats = p.beats.filter((b) => !b.is_free_download);
        const lowestPrice = paidBeats.length
          ? Math.min(...paidBeats.map((b) => Number(b.base_price || 999)))
          : 0;

        return {
          ...p,
          genres: [...p.genres].slice(0, 4),
          beatCount: p.beats.length,
          lowestPrice,
          topBeat: p.beats[0] || null,
        };
      });

      if (sortBy === "top_sellers") {
        list.sort((a, b) => b.totalSales - a.totalSales);
      } else if (sortBy === "most_beats") {
        list.sort((a, b) => b.beatCount - a.beatCount);
      } else if (sortBy === "most_plays") {
        list.sort((a, b) => b.totalPlays - a.totalPlays);
      } else {
        list.sort((a, b) => b.beatCount - a.beatCount);
      }

      const withFeatured = list.map((p, index) => ({
        ...p,
        featured: index < 3
      }));

      setProducers(withFeatured.length ? withFeatured : placeholderProducers);
    } catch (err) {
      setProducers(placeholderProducers);
    }

    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = [...producers];

    if (activeCategory !== "all") {
      list = list.filter((p) => p.genres?.includes(activeCategory));
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((p) => {
        return (
          p.name?.toLowerCase().includes(s) ||
          p.bio?.toLowerCase().includes(s) ||
          p.location?.toLowerCase().includes(s) ||
          p.genres?.some((g) => g.toLowerCase().includes(s))
        );
      });
    }

    return list;
  }, [producers, search, activeCategory]);

  const featuredProducers = producers.filter((p) => p.featured).slice(0, 3);

  const totalProducerCount = producers.length;
  const totalBeatCount = producers.reduce((sum, p) => sum + (p.beatCount || 0), 0);
  const totalPlayCount = producers.reduce((sum, p) => sum + (p.totalPlays || 0), 0);

  return (
    <div className="bp-page">
      {/* HERO */}
      <section className="bp-hero">
        <div className="bp-hero-content">
          <span className="bp-kicker">Discover Talent</span>
          <h1>Browse Producers & Find Your Sound</h1>
          <p>
            Explore producer stores, compare styles, discover trending genres,
            and license beats for your next single, EP, or album.
          </p>

          <div className="bp-hero-actions">
            <Link to="/beats" className="bp-btn bp-btn-primary">
              Browse Beats
            </Link>
            <Link to="/sell-beats" className="bp-btn bp-btn-secondary">
              Start Selling
            </Link>
          </div>

          <div className="bp-stat-strip">
            <div className="bp-stat-box">
              <strong>{totalProducerCount || 250}+</strong>
              <span>Producers</span>
            </div>
            <div className="bp-stat-box">
              <strong>{totalBeatCount.toLocaleString() || "10,000+"}</strong>
              <span>Beats Listed</span>
            </div>
            <div className="bp-stat-box">
              <strong>{totalPlayCount.toLocaleString() || "1.2M+"}</strong>
              <span>Total Plays</span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY PILLS */}
      <section className="bp-category-section">
        <div className="bp-section-head">
          <h2>Popular Categories</h2>
          <p>Jump straight into the styles artists are looking for right now.</p>
        </div>

        <div className="bp-category-pills">
          {categories.map((cat) => (
            <button
              key={cat.key}
              className={`bp-category-pill ${activeCategory === cat.key ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCERS */}
      {!loading && featuredProducers.length > 0 && (
        <section className="bp-featured-section">
          <div className="bp-section-head">
            <h2>Featured Producers</h2>
            <p>Top creators gaining attention across the marketplace.</p>
          </div>

          <div className="bp-featured-grid">
            {featuredProducers.map((p) => (
              <div
                key={p.id}
                className="bp-featured-card"
                onClick={() => navigate(`/producer/${p.id}`)}
              >
                <div
                  className="bp-featured-banner"
                  style={{
                    backgroundImage: `url(${p.banner || p.topBeat?.artwork_url || "https://via.placeholder.com/800x300.png?text=Producer"})`
                  }}
                >
                  <div className="bp-featured-overlay" />
                  <span className="bp-featured-badge">Featured</span>
                </div>

                <div className="bp-featured-body">
                  <img
                    src={p.avatar || "https://via.placeholder.com/100x100.png?text=P"}
                    alt={p.name}
                    className="bp-featured-avatar"
                  />

                  <div className="bp-featured-meta">
                    <h3>
                      {p.name} {p.verified && <span className="bp-verified">✔</span>}
                    </h3>
                    <p>{p.location || "Worldwide"}</p>
                  </div>

                  <p className="bp-featured-bio">{p.bio}</p>

                  <div className="bp-featured-tags">
                    {p.genres?.map((g, i) => (
                      <span key={i} className="bp-genre-tag">
                        {g}
                      </span>
                    ))}
                  </div>

                  <div className="bp-featured-stats">
                    <span>{p.beatCount} beats</span>
                    <span>{p.totalPlays.toLocaleString()} plays</span>
                    <span>{p.totalSales} sales</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTROLS */}
      <section className="bp-controls-wrap">
        <div className="bp-section-head">
          <h2>Explore All Producers</h2>
          <p>Search by producer name, sound, genre, or vibe.</p>
        </div>

        <div className="bp-controls">
          <input
            className="bp-search"
            placeholder="Search producers by name, genre, vibe, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="bp-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="top_sellers">Top Sellers</option>
            <option value="most_beats">Most Beats</option>
            <option value="most_plays">Most Plays</option>
          </select>
        </div>

        <div className="bp-trending-tags">
          <span>Trending:</span>
          {["Trap", "R&B", "Drill", "Afrobeat", "Lo-Fi", "Pop"].map((tag) => (
            <button
              key={tag}
              className="bp-trending-tag"
              onClick={() => setActiveCategory(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* GRID */}
      {loading ? (
        <div className="bp-loading">
          <div className="bp-spinner" />
          <p>Loading producers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bp-empty">
          <p>No producers found{search ? ` matching "${search}"` : ""}.</p>
          <Link to="/beats" className="bp-back-link">
            ← Browse Beats Instead
          </Link>
        </div>
      ) : (
        <section className="bp-results-section">
          <div className="bp-results-head">
            <h3>{filtered.length} producers found</h3>
            <p>
              {activeCategory === "all"
                ? "Showing all styles"
                : `Filtered by ${activeCategory}`}
            </p>
          </div>

          <div className="bp-grid">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bp-card"
                onClick={() => navigate(`/producer/${p.id}`)}
              >
                <div
                  className="bp-card-banner"
                  style={{
                    backgroundImage: `url(${p.banner || p.topBeat?.artwork_url || "https://via.placeholder.com/800x300.png?text=Producer"})`
                  }}
                >
                  <div className="bp-card-banner-overlay" />
                  {p.verified && <span className="bp-card-badge">Verified</span>}
                </div>

                <div className="bp-card-body">
                  <img
                    src={p.avatar || "https://via.placeholder.com/64"}
                    className="bp-card-avatar"
                    alt={p.name}
                  />

                  <h3 className="bp-card-name">
                    {p.name} {p.verified && <span className="bp-verified">✔</span>}
                  </h3>

                  <p className="bp-card-location">{p.location || "Worldwide"}</p>

                  <p className="bp-card-bio">
                    {p.bio || "Independent producer offering high-quality beats for artists."}
                  </p>

                  <div className="bp-card-genres">
                    {p.genres?.map((g, i) => (
                      <span key={i} className="bp-genre-tag">
                        {g}
                      </span>
                    ))}
                  </div>

                  <div className="bp-card-stats">
                    <div className="bp-card-stat">
                      <span className="bp-cs-num">{p.beatCount}</span>
                      <span className="bp-cs-lbl">Beats</span>
                    </div>
                    <div className="bp-card-stat">
                      <span className="bp-cs-num">{p.totalPlays.toLocaleString()}</span>
                      <span className="bp-cs-lbl">Plays</span>
                    </div>
                    <div className="bp-card-stat">
                      <span className="bp-cs-num">{p.totalSales}</span>
                      <span className="bp-cs-lbl">Sales</span>
                    </div>
                  </div>

                  <div className="bp-card-footer">
                    <div className="bp-price-block">
                      <span className="bp-card-price-label">Starting at</span>
                      <span className="bp-card-price">
                        {p.lowestPrice > 0 ? `$${p.lowestPrice}` : "Free"}
                      </span>
                    </div>

                    <span className="bp-card-cta">View Store →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SELL CTA */}
      <section className="bp-sell-cta">
        <div className="bp-sell-inner">
          <h2>Are you a producer?</h2>
          <p>
            Build your own storefront, upload beats, manage licenses, and grow
            your fanbase from one place.
          </p>
          <div className="bp-sell-actions">
            <Link to="/sell-beats" className="bp-sell-btn">
              Start Selling →
            </Link>
            <Link to="/pricing" className="bp-outline-btn">
              View Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BrowseProducersPage;