import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/BrowseProducersPage.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

const BrowseProducersPage = () => {
  const navigate = useNavigate();
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("top_sellers");

  useEffect(() => { fetchProducers(); }, [sortBy]);

  const fetchProducers = async () => {
    setLoading(true);
    try {
      // Fetch all active beats grouped by producer
      const res = await fetch(`${BACKEND}/api/beats?per_page=200&sort=${sortBy === "top_sellers" ? "best_selling" : "newest"}`);
      const data = await res.json();
      const beats = data.beats || [];

      // Group by producer
      const map = {};
      for (const b of beats) {
        if (!map[b.producer_id]) {
          map[b.producer_id] = {
            id: b.producer_id,
            name: b.producer_name || "Unknown",
            avatar: b.producer_avatar || null,
            beats: [],
            totalPlays: 0,
            totalSales: 0,
            genres: new Set(),
          };
        }
        const p = map[b.producer_id];
        p.beats.push(b);
        p.totalPlays += b.plays || 0;
        p.totalSales += b.total_sales || 0;
        if (b.genre) p.genres.add(b.genre);
      }

      let list = Object.values(map).map(p => ({
        ...p,
        genres: [...p.genres].slice(0, 3),
        beatCount: p.beats.length,
        lowestPrice: Math.min(...p.beats.filter(b => !b.is_free_download).map(b => b.base_price || 999)),
        topBeat: p.beats[0],
      }));

      // Sort
      if (sortBy === "top_sellers") list.sort((a, b) => b.totalSales - a.totalSales);
      else if (sortBy === "most_beats") list.sort((a, b) => b.beatCount - a.beatCount);
      else if (sortBy === "most_plays") list.sort((a, b) => b.totalPlays - a.totalPlays);
      else list.sort((a, b) => b.beatCount - a.beatCount); // newest fallback

      setProducers(list);
    } catch {}
    setLoading(false);
  };

  const filtered = producers.filter(p => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.genres.some(g => g.toLowerCase().includes(s));
  });

  return (
    <div className="bp-page">
      {/* Hero */}
      <section className="bp-hero">
        <h1>🎹 Browse Producers</h1>
        <p>Find producers and license beats for your next release</p>
      </section>

      {/* Search & filters */}
      <div className="bp-controls">
        <input
          className="bp-search"
          placeholder="Search producers by name or genre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="bp-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="top_sellers">Top Sellers</option>
          <option value="most_beats">Most Beats</option>
          <option value="most_plays">Most Plays</option>
        </select>
      </div>

      {/* Producer grid */}
      {loading ? (
        <div className="bp-loading"><div className="bp-spinner" /><p>Loading producers...</p></div>
      ) : filtered.length === 0 ? (
        <div className="bp-empty">
          <p>No producers found{search ? ` matching "${search}"` : ""}.</p>
          <Link to="/beats" className="bp-back-link">← Browse Beats Instead</Link>
        </div>
      ) : (
        <div className="bp-grid">
          {filtered.map(p => (
            <div key={p.id} className="bp-card" onClick={() => navigate(`/producer/${p.id}`)}>
              {/* Top beat artwork as bg */}
              <div className="bp-card-banner"
                style={{ backgroundImage: p.topBeat?.artwork_url ? `url(${p.topBeat.artwork_url})` : undefined }}>
                <div className="bp-card-banner-overlay" />
              </div>

              <div className="bp-card-body">
                <img src={p.avatar || "https://via.placeholder.com/64"} className="bp-card-avatar" alt="" />
                <h3 className="bp-card-name">{p.name}</h3>

                {/* Genre tags */}
                <div className="bp-card-genres">
                  {p.genres.map((g, i) => <span key={i} className="bp-genre-tag">{g}</span>)}
                </div>

                {/* Stats */}
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

                {/* Price range */}
                <div className="bp-card-footer">
                  <span className="bp-card-price">
                    {p.lowestPrice < 999 ? `From $${p.lowestPrice}` : "Free beats available"}
                  </span>
                  <span className="bp-card-cta">View Beats →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sell CTA */}
      <section className="bp-sell-cta">
        <h2>Are you a producer?</h2>
        <p>Set up your store and start selling beats in minutes. Keep 90% of every sale.</p>
        <Link to="/sell-beats" className="bp-sell-btn">Start Selling →</Link>
      </section>
    </div>
  );
};

export default BrowseProducersPage;