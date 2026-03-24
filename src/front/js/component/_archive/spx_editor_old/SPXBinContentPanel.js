import React, { useMemo, useState } from "react";
import { resolveFolderItems } from "./SPXAdvancedBins";

const renderStars = (count = 0) => "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));

const matchesTag = (item, tag) => {
  if (!tag) return true;
  const tags = item.tags || [];
  return tags.some((t) => String(t).toLowerCase().includes(tag.toLowerCase()));
};

const matchesSearch = (item, query) => {
  if (!query) return true;
  const hay = [
    item.name || "",
    item.id || "",
    item.category || "",
    item.source || "",
    ...(item.tags || [])
  ].join(" ").toLowerCase();
  return hay.includes(query.toLowerCase());
};

const titleMap = {
  project_media: "Project / Media",
  project_sequences: "Project / Sequences",
  project_titles: "Project / Titles",
  project_adjustments: "Project / Adjustment Layers",
  effects_video: "Effects / Video FX",
  effects_audio: "Effects / Audio FX",
  effects_transitions: "Effects / Transitions",
  effects_generators: "Effects / Generators",
  presets_motion: "Presets / Motion",
  presets_color: "Presets / Color",
  presets_text: "Presets / Text",
  presets_audio: "Presets / Audio",
  presets_export: "Presets / Export",
  assets_templates: "Assets / Templates",
  assets_luts: "Assets / LUTs",
  assets_overlays: "Assets / Overlays",
  assets_lowerthirds: "Assets / Lower Thirds",
  assets_logos: "Assets / Logos",
  nodes_compositing: "Nodes / Compositing",
  nodes_color: "Nodes / Color Pipelines",
  nodes_keying: "Nodes / Keying",
  nodes_stylized: "Nodes / Stylized",
  nodes_social: "Nodes / Social Templates",
  smart_favorites: "Smart Folder / Favorites",
  smart_cinematic: "Smart Folder / Cinematic",
  smart_social: "Smart Folder / Social",
  smart_glitch: "Smart Folder / Glitch / Stylized",
  smart_audio: "Smart Folder / Audio Essentials"
};

const SPXBinContentPanel = ({ activeNodeId, onDragPresetStart, onDragMediaStart, handleUploadMedia, assets = [] }) => {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [minRating, setMinRating] = useState("0");

  const items = useMemo(() => {
    if (activeNodeId === "project_media") {
      return assets
        .map((item) => ({
          ...item,
          rating: 0,
          tags: ["Media", item.type || "unknown"]
        }))
        .filter((item) => matchesSearch(item, query))
        .filter((item) => matchesTag(item, tagFilter));
    }

    const resolved = resolveFolderItems(activeNodeId, assets);
    return resolved
      .map((item) => ({
        ...item,
        rating: item.rating || 0,
        tags: item.tags || [item.category || "General", item.source || "SPX"]
      }))
      .filter((item) => matchesSearch(item, query))
      .filter((item) => matchesTag(item, tagFilter))
      .filter((item) => (item.rating || 0) >= Number(minRating || 0));
  }, [activeNodeId, assets, query, tagFilter, minRating]);

  return (
    <div className="spx-panel spx-bin-content-panel">
      <div className="spx-bin-content-header">
        <div className="spx-section-title">{titleMap[activeNodeId] || "Bin Contents"}</div>
        <div className="spx-library-count">Items: {items.length}</div>
      </div>

      {activeNodeId === "project_media" && (
        <div className="spx-bin-toolbar">
          <input
            className="spx-search"
            placeholder="Search media..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="spx-header-btn spx-upload-label">
            Import Media
            <input type="file" multiple hidden onChange={handleUploadMedia} />
          </label>
          <input
            className="spx-search"
            placeholder="Filter by tag..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
        </div>
      )}

      {activeNodeId !== "project_media" && (
        <div className="spx-bin-toolbar">
          <input
            className="spx-search"
            placeholder="Search this folder..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input
            className="spx-search"
            placeholder="Filter by tag..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
          <select
            className="spx-workspace-select"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
          >
            <option value="0">All ratings</option>
            <option value="1">1★+</option>
            <option value="2">2★+</option>
            <option value="3">3★+</option>
            <option value="4">4★+</option>
            <option value="5">5★ only</option>
          </select>
        </div>
      )}

      <div className="spx-bin-content-list">
        {items.length ? items.map((item) => (
          <div
            key={item.id || item.name}
            className="spx-effect spx-effect-draggable"
            draggable
            onDragStart={() => {
              if (activeNodeId === "project_media") {
                onDragMediaStart && onDragMediaStart(item);
              } else {
                onDragPresetStart && onDragPresetStart(item);
              }
            }}
          >
            <div className="spx-effect-name">{item.name || item.id}</div>
            <div className="spx-effect-source">
              {activeNodeId === "project_media" ? (item.type || item.mimeType || "media") : (item.source || item.category || "")}
            </div>
            <div className="spx-effect-tags">{(item.tags || []).slice(0, 3).join(" • ")}</div>
            {activeNodeId !== "project_media" && (
              <div className="spx-effect-rating">{renderStars(item.rating || 0)}</div>
            )}
          </div>
        )) : (
          <div className="spx-empty">{activeNodeId === "project_media" ? "Import media to begin" : "No items in this folder yet"}</div>
        )}
      </div>
    </div>
  );
};

export default SPXBinContentPanel;
