import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/PluginStore.css";
import { BACKEND_URL } from "../store/flux";

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

const VIDEO_FX_CATEGORIES = [
  "LUT Pack",
  "Transition Pack",
  "Motion Graphics",
  "Title Animations",
  "Overlays",
  "After Effects Templates",
  "Premiere Presets",
  "Resolve FX",
  "OBS Graphics",
  "StreamPireX FX"
];

export const PluginStorePage = () => {
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState([]);
  const [search, setSearch] = useState("");
  const [pluginType, setPluginType] = useState("");
  const [category, setCategory] = useState("");
  const [formatType, setFormatType] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (pluginType) params.set("plugin_type", pluginType);
      if (category) params.set("category", category);
      if (formatType) params.set("format_type", formatType);
      if (sort) params.set("sort", sort);

      const res = await fetch(`${BACKEND_URL}/api/plugins?${params.toString()}`);
      const data = await res.json();
      setPlugins(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch plugins", e);
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlugins(); }, [search, pluginType, category, formatType, sort]);

  const filteredPlugins = useMemo(() => {
    let list = [...plugins];
    if (quickFilter === "video-fx") {
      list = list.filter(p =>
        p.plugin_type === "video" ||
        VIDEO_FX_CATEGORIES.includes(p.category) ||
        ["Premiere Pro","After Effects","DaVinci Resolve","Final Cut Pro","OBS","LUT Pack","Transition Pack"].includes(p.format_type)
      );
    }
    if (quickFilter === "audio-devices") {
      list = list.filter(p =>
        p.plugin_type === "audio" ||
        ["VST3","AU","AAX","WAM","Kontakt","Preset Pack"].includes(p.format_type)
      );
    }
    if (quickFilter === "browser-fx") {
      list = list.filter(p => p.format_type === "WAM" || p.host_support === "StreamPireX Web Studio");
    }
    return list;
  }, [plugins, quickFilter]);

  const categories = useMemo(() => [...new Set(plugins.map(p => p.category).filter(Boolean))], [plugins]);
  const formats = useMemo(() => [...new Set(plugins.map(p => p.format_type).filter(Boolean))], [plugins]);

  return (
    <div className="plugin-store-page">
      <div className="plugin-hero">
        <h1>Plugin Store</h1>
        <p>
          Sell and discover VST3, AU, AAX, WAM, video plugins, preset packs, LUTs,
          transition packs, DAW tools, and creator effects inside StreamPireX.
        </p>
      </div>

      <div className="plugin-quickfilters">
        <button className={`plugin-qf ${quickFilter === "all" ? "active" : ""}`} onClick={() => setQuickFilter("all")}>All Plugins</button>
        <button className={`plugin-qf ${quickFilter === "audio-devices" ? "active" : ""}`} onClick={() => setQuickFilter("audio-devices")}>Audio Plugins</button>
        <button className={`plugin-qf ${quickFilter === "video-fx" ? "active" : ""}`} onClick={() => setQuickFilter("video-fx")}>Video FX</button>
        <button className={`plugin-qf ${quickFilter === "browser-fx" ? "active" : ""}`} onClick={() => setQuickFilter("browser-fx")}>WAM / Browser FX</button>
      </div>

      <div className="plugin-toolbar">
        <input className="plugin-input" placeholder="Search plugins, formats, tags, creators..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="plugin-select" value={pluginType} onChange={e => setPluginType(e.target.value)}>
          <option value="">All Types</option>
          <option value="audio">Audio Plugins</option>
          <option value="video">Video Plugins</option>
        </select>
        <select className="plugin-select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="plugin-select" value={formatType} onChange={e => setFormatType(e.target.value)}>
          <option value="">All Formats</option>
          {formats.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="plugin-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="featured">Featured</option>
          <option value="popular">Popular</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {loading ? (
        <div className="plugin-section">Loading plugins...</div>
      ) : (
        <div className="plugin-grid">
          {filteredPlugins.map((plugin) => (
            <div key={plugin.id} className="plugin-card">
              <div className="plugin-thumb">
                {plugin.plugin_type === "video"
                  ? (["LUT Pack","Transition Pack","Motion Graphics","Title Animations","Overlays","After Effects Templates","Premiere Presets","Resolve FX","OBS Graphics","StreamPireX FX"].includes(plugin.category) ? "✨" : "🎬")
                  : (plugin.format_type === "WAM" ? "🌐" : "🎛️")}
              </div>
              <div className="plugin-body">
                <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{plugin.name}</div>
                <div style={{ color: "#8b949e", marginTop: 6 }}>
                  by {plugin.creator_name || "Creator"}
                </div>

                <div className="plugin-meta">
                  {plugin.plugin_type && <span className="plugin-badge">{plugin.plugin_type}</span>}
                  {plugin.category && <span className={`plugin-badge ${plugin.plugin_type === "video" ? "plugin-badge-video" : ""}`}>{plugin.category}</span>}
                  {plugin.format_type && <span className="plugin-badge">{plugin.format_type}</span>}
                </div>

                <div style={{ color: "#9fb0c3", minHeight: 42 }}>
                  {plugin.short_description || plugin.description?.slice(0, 100) || "Professional creator tool"}
                </div>

                <div style={{ marginTop: 14 }} className="plugin-price">
                  {plugin.is_free ? "Free" : fmt(plugin.effective_price ?? plugin.price)}
                </div>

                <div className="plugin-actions">
                  <button className="plugin-btn plugin-btn-secondary" onClick={() => navigate(`/plugins/${plugin.id}`)}>
                    View
                  </button>
                  <button className="plugin-btn plugin-btn-primary" onClick={() => navigate(`/plugins/${plugin.id}`)}>
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PluginStorePage;
