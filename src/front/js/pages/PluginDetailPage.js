import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../../styles/PluginStore.css";
import { BACKEND_URL } from "../store/flux";

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const PluginDetailPage = () => {
  const { pluginId } = useParams();
  const [plugin, setPlugin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/plugins/${pluginId}`);
        const data = await res.json();
        setPlugin(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pluginId]);

  const buyNow = async () => {
    try {
      setPurchasing(true);
      setStatus("");
      const res = await fetch(`${BACKEND_URL}/api/plugins/${pluginId}/checkout`, {
        method: "POST",
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Checkout failed");
        return;
      }
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e) {
      setStatus("Checkout failed");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) return <div className="plugin-store-page"><div className="plugin-section">Loading plugin...</div></div>;
  if (!plugin?.id) return <div className="plugin-store-page"><div className="plugin-section">Plugin not found.</div></div>;

  return (
    <div className="plugin-store-page">
      <div className="plugin-hero">
        <h1>{plugin.name}</h1>
        <p>{plugin.short_description || plugin.description || "Creator plugin listing"}</p>
      </div>

      <div className="plugin-grid" style={{ gridTemplateColumns: "1.2fr .8fr" }}>
        <div className="plugin-section">
          <div className="plugin-thumb" style={{ borderRadius: 16, marginBottom: 18 }}>
            {plugin.plugin_type === "video" ? "✨" : "🎛️"}
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>About this plugin</div>
          <div style={{ color: "#9fb0c3", lineHeight: 1.6 }}>{plugin.description}</div>
        </div>

        <div className="plugin-section">
          <div className="plugin-price">{plugin.is_free ? "Free" : fmt(plugin.effective_price ?? plugin.price)}</div>
          <div className="plugin-meta" style={{ marginTop: 14 }}>
            {plugin.plugin_type && <span className="plugin-badge">{plugin.plugin_type}</span>}
            {plugin.category && <span className="plugin-badge">{plugin.category}</span>}
            {plugin.format_type && <span className="plugin-badge">{plugin.format_type}</span>}
            {plugin.version && <span className="plugin-badge">v{plugin.version}</span>}
          </div>

          <div style={{ color: "#8b949e", marginTop: 16 }}>OS: {plugin.os_support || "Not specified"}</div>
          <div style={{ color: "#8b949e", marginTop: 8 }}>Hosts: {plugin.host_support || "Not specified"}</div>\n          <div style={{ color: "#8b949e", marginTop: 8 }}>Format: {plugin.format_type || "Not specified"}</div>\n          <div style={{ color: "#8b949e", marginTop: 8 }}>Product Type: {plugin.category || "Not specified"}</div>
          <div style={{ color: "#8b949e", marginTop: 8 }}>Creator: {plugin.creator_name || "Creator"}</div>

          <div className="plugin-actions" style={{ marginTop: 18 }}>
            <button className="plugin-btn plugin-btn-primary" onClick={buyNow} disabled={purchasing}>
              {purchasing ? "Processing..." : "Buy Plugin"}
            </button>
          </div>

          {status && <div style={{ color: "#fca5a5", marginTop: 12 }}>{status}</div>}
        </div>
      </div>
    </div>
  );
};

export default PluginDetailPage;
