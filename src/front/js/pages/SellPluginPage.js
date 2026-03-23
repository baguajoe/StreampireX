import React, { useState } from "react";
import "../../styles/PluginStore.css";
import { BACKEND_URL } from "../store/flux";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const SellPluginPage = () => {
  const [form, setForm] = useState({
    name: "",
    short_description: "",
    description: "",
    plugin_type: "audio",
    category: "",
    format_type: "VST3",
    version: "1.0.0",
    os_support: "Windows, macOS",
    host_support: "",
    tags: "",
    price: "49.99",
    sale_price: "",
    cover_image_url: "",
    preview_url: "",
    file_url: "",
    demo_video_url: "",
    thumbnail_url: ""
  });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price || 0),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean)
      };
      const res = await fetch(`${BACKEND_URL}/api/plugins`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to create plugin");
        return;
      }
      setStatus(`✅ Plugin created: ${data.name}`);
    } catch (e) {
      setStatus("Failed to create plugin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="plugin-store-page">
      <div className="plugin-hero">
        <h1>Sell a Plugin</h1>
        <p>List audio plugins, video plugins, preset packs, LUT packs, transitions, and creator tools in the StreamPireX marketplace.</p>
      </div>

      <form className="plugin-section plugin-form" onSubmit={submit}>
        <div>
          <label className="plugin-label">Plugin Name</label>
          <input className="plugin-input" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>

        <div>
          <label className="plugin-label">Type</label>
          <select className="plugin-select" value={form.plugin_type} onChange={e => set("plugin_type", e.target.value)}>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
          </select>
        </div>

        <div>
          <label className="plugin-label">Category</label>
          <input className="plugin-input" value={form.category} onChange={e => set("category", e.target.value)} placeholder="Reverb, Synth, Compressor, LUT Pack, Transition Pack, Motion Graphics..." />
        </div>

        <div>
          <label className="plugin-label">Format</label>
          <select className="plugin-select" value={form.format_type} onChange={e => set("format_type", e.target.value)}>
            {form.plugin_type === "audio" ? (
              <>
                <option value="VST3">VST3</option>
                <option value="AU">AU</option>
                <option value="AAX">AAX</option>
                <option value="WAM">WAM</option>
                <option value="Kontakt">Kontakt</option>
                <option value="Preset Pack">Preset Pack</option>
              </>
            ) : (
              <>
                <option value="Premiere Pro">Premiere Pro</option>
                <option value="After Effects">After Effects</option>
                <option value="DaVinci Resolve">DaVinci Resolve</option>
                <option value="Final Cut Pro">Final Cut Pro</option>
                <option value="LUT Pack">LUT Pack</option>
                <option value="Transition Pack">Transition Pack</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="plugin-label">Version</label>
          <input className="plugin-input" value={form.version} onChange={e => set("version", e.target.value)} />
        </div>

        <div>
          <label className="plugin-label">Price</label>
          <input className="plugin-input" value={form.price} onChange={e => set("price", e.target.value)} />
        </div>

        <div>
          <label className="plugin-label">Sale Price</label>
          <input className="plugin-input" value={form.sale_price} onChange={e => set("sale_price", e.target.value)} />
        </div>

        <div>
          <label className="plugin-label">OS Support</label>
          <input className="plugin-input" value={form.os_support} onChange={e => set("os_support", e.target.value)} />
        </div>

        <div className="full">
          <label className="plugin-label">Host Support</label>
          <input className="plugin-input" value={form.host_support} onChange={e => set("host_support", e.target.value)} placeholder="Ableton, FL Studio, Logic, Premiere, Resolve..." />
        </div>

        <div className="full">
          <label className="plugin-label">Short Description</label>
          <input className="plugin-input" value={form.short_description} onChange={e => set("short_description", e.target.value)} />
        </div>

        <div className="full">
          <label className="plugin-label">Description</label>
          <textarea className="plugin-textarea" value={form.description} onChange={e => set("description", e.target.value)} />
        </div>

        <div className="full">
          <label className="plugin-label">Tags</label>
          <input className="plugin-input" value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="reverb, cinematic, vocals, transitions, luts" />
        </div>

        <div className="full">
          <label className="plugin-label">Cover Image URL</label>
          <input className="plugin-input" value={form.cover_image_url} onChange={e => set("cover_image_url", e.target.value)} />
        </div>

        <div className="full">
          <label className="plugin-label">Preview URL</label>
          <input className="plugin-input" value={form.preview_url} onChange={e => set("preview_url", e.target.value)} />
        </div>

        <div className="full">
          <label className="plugin-label">File URL</label>
          <input className="plugin-input" value={form.file_url} onChange={e => set("file_url", e.target.value)} />
        </div>

        <div className="full">
          <label className="plugin-label">Demo Video URL</label>
          <input className="plugin-input" value={form.demo_video_url} onChange={e => set("demo_video_url", e.target.value)} />
        </div>

        <div className="full" style={{ display: "flex", gap: 12 }}>
          <button className="plugin-btn plugin-btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create Plugin Listing"}
          </button>
        </div>

        {status && <div className="full" style={{ color: status.startsWith("✅") ? "#00ffc8" : "#fca5a5" }}>{status}</div>}
      </form>
    </div>
  );
};

export default SellPluginPage;
