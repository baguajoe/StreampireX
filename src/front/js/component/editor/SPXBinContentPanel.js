import React, { useMemo, useState } from "react";
import { resolveFolderItems, buildIndexedItems } from "./SPXAdvancedBins";

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

const SPXBinContentPanel = ({ activeNodeId, onDragPresetStart, assets = [] }) => {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [minRating, setMinRating] = useState("0");

  const items = useMemo(() => {
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

  return (
    <div className="spx-panel spx-bin-content-panel">
      <div className="spx-section-title">{titleMap[activeNodeId] || "Bin Contents"}</div>

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

      <div className="spx-library-count">Items: {items.length}</div>

      <div className="spx-scroll-list">
        {items.length ? items.map((item) => (
          <div
            key={item.id || item.name}
            className="spx-effect spx-effect-draggable"
            draggable
            onDragStart={() => onDragPresetStart && onDragPresetStart(item)}
          >
            <div className="spx-effect-name">{item.name || item.id}</div>
            <div className="spx-effect-source">{item.source || item.category || ""}</div>
            <div className="spx-effect-tags">{(item.tags || []).slice(0, 3).join(" • ")}</div>
            <div className="spx-effect-rating">{renderStars(item.rating || 0)}</div>
          </div>
        )) : (
          <div className="spx-empty">No items in this folder yet</div>
        )}
      </div>
    </div>
  );
};

export default SPXBinContentPanel;
