import React from "react";
import {
  EFFECT_LIBRARY,
  PRESET_LIBRARY,
  TRANSITION_LIBRARY,
  COLOR_LIBRARY,
  summarizeLibraries
} from "./presetCatalog";

const groupByCategory = (items = []) =>
  items.reduce((acc, item) => {
    const key = item.category || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

const renderGroupedList = (groups) =>
  Object.entries(groups).map(([category, items]) => (
    <div key={category} className="spx-effect-category">
      <div className="spx-effect-title">{category}</div>
      {items.map((item) => (
        <div key={item.id} className="spx-effect">
          <div className="spx-effect-name">{item.name}</div>
          <div className="spx-effect-source">{item.source}</div>
        </div>
      ))}
    </div>
  ));

const SPXEditorSidebar = ({ editor }) => {
  const {
    activeTool,
    setActiveTool,
    activeSidebarTab,
    setActiveSidebarTab,
    effectSearch,
    setEffectSearch,
    presetSearch,
    setPresetSearch,
    transitionSearch,
    setTransitionSearch,
    colorSearch,
    setColorSearch,
    assets,
    layers,
    handleUploadMedia
  } = editor;

  const counts = summarizeLibraries();

  const filteredEffects = EFFECT_LIBRARY.filter((item) =>
    item.name.toLowerCase().includes(effectSearch.toLowerCase())
  );

  const filteredPresets = PRESET_LIBRARY.filter((item) =>
    item.name.toLowerCase().includes(presetSearch.toLowerCase())
  );

  const filteredTransitions = TRANSITION_LIBRARY.filter((item) =>
    item.name.toLowerCase().includes(transitionSearch.toLowerCase())
  );

  const filteredColor = COLOR_LIBRARY.filter((item) =>
    item.name.toLowerCase().includes(colorSearch.toLowerCase())
  );

  const projectTab = (
    <>
      <div className="spx-panel">
        <div className="spx-section-title">Project Bin</div>

        <div className="spx-project-toolbar">
          <button className="spx-mini-action">New Bin</button>
          <button className="spx-mini-action">Search</button>
          <button className="spx-mini-action">Sort</button>
        </div>

        <input
          type="file"
          multiple
          onChange={handleUploadMedia}
          className="spx-file-input"
        />

        <div className="spx-media-bin">
          {assets.length === 0 ? (
            <div className="spx-empty">No project media yet</div>
          ) : (
            assets.map((asset) => (
              <div key={asset.id} className="spx-media-item">
                <div className="spx-media-thumb" />
                <div className="spx-media-meta">
                  <div className="spx-media-name">{asset.name}</div>
                  <div className="spx-media-type">{asset.type || "media"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="spx-panel">
        <div className="spx-section-title">Tools</div>
        <div className="spx-tool-grid">
          {[
            "select",
            "razor",
            "slip",
            "text",
            "shape",
            "pen",
            "hand",
            "zoom",
            "crop",
            "mask",
            "rotate",
            "scale"
          ].map((tool) => (
            <button
              key={tool}
              className={`spx-tool ${activeTool === tool ? "active" : ""}`}
              onClick={() => setActiveTool(tool)}
            >
              {tool}
            </button>
          ))}
        </div>
      </div>

      <div className="spx-panel">
        <div className="spx-section-title">Layers</div>
        <div className="spx-layer-list">
          {layers.map((layer) => (
            <div key={layer.id} className="spx-layer">
              <div className="spx-layer-left">
                <span className="spx-layer-dot" />
                <span className="spx-layer-name">{layer.name}</span>
              </div>
              <div className="spx-layer-controls">👁 🔒</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const mediaTab = (
    <div className="spx-panel">
      <div className="spx-section-title">Media Bin</div>
      <div className="spx-media-bin-grid">
        {assets.length === 0 ? (
          <div className="spx-empty">No imported media</div>
        ) : (
          assets.map((asset) => (
            <div key={asset.id} className="spx-media-card">
              <div className="spx-media-thumb large" />
              <div className="spx-media-name">{asset.name}</div>
              <div className="spx-media-type">{asset.type || "media"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const effectsTab = (
    <div className="spx-panel">
      <div className="spx-section-title">Effects Browser</div>
      <div className="spx-library-count">Loaded: {counts.effects}</div>
      <input
        className="spx-search"
        placeholder="Search effects..."
        value={effectSearch}
        onChange={(e) => setEffectSearch(e.target.value)}
      />
      <div className="spx-scroll-list">
        {renderGroupedList(groupByCategory(filteredEffects))}
      </div>
    </div>
  );

  const presetsTab = (
    <div className="spx-panel">
      <div className="spx-section-title">Preset Browser</div>
      <div className="spx-library-count">Loaded: {counts.presets}</div>
      <input
        className="spx-search"
        placeholder="Search presets..."
        value={presetSearch}
        onChange={(e) => setPresetSearch(e.target.value)}
      />
      <div className="spx-scroll-list">
        {renderGroupedList(groupByCategory(filteredPresets))}
      </div>
    </div>
  );

  const transitionsTab = (
    <div className="spx-panel">
      <div className="spx-section-title">Transitions</div>
      <div className="spx-library-count">Loaded: {counts.transitions}</div>
      <input
        className="spx-search"
        placeholder="Search transitions..."
        value={transitionSearch}
        onChange={(e) => setTransitionSearch(e.target.value)}
      />
      <div className="spx-scroll-list">
        {renderGroupedList(groupByCategory(filteredTransitions))}
      </div>
    </div>
  );

  const colorTab = (
    <div className="spx-panel">
      <div className="spx-section-title">Color / LUT Browser</div>
      <div className="spx-library-count">Loaded: {counts.color}</div>
      <input
        className="spx-search"
        placeholder="Search color presets..."
        value={colorSearch}
        onChange={(e) => setColorSearch(e.target.value)}
      />
      <div className="spx-scroll-list">
        {renderGroupedList(groupByCategory(filteredColor))}
      </div>
    </div>
  );

  return (
    <aside className="spx-editor-sidebar">
      <div className="spx-panel-title">SPX Editor</div>

      <div className="spx-tabs six-tabs">
        <button className={activeSidebarTab === "project" ? "active" : ""} onClick={() => setActiveSidebarTab("project")}>Project</button>
        <button className={activeSidebarTab === "media" ? "active" : ""} onClick={() => setActiveSidebarTab("media")}>Media</button>
        <button className={activeSidebarTab === "effects" ? "active" : ""} onClick={() => setActiveSidebarTab("effects")}>Effects</button>
        <button className={activeSidebarTab === "presets" ? "active" : ""} onClick={() => setActiveSidebarTab("presets")}>Presets</button>
        <button className={activeSidebarTab === "transitions" ? "active" : ""} onClick={() => setActiveSidebarTab("transitions")}>Transitions</button>
        <button className={activeSidebarTab === "color" ? "active" : ""} onClick={() => setActiveSidebarTab("color")}>Color</button>
      </div>

      {activeSidebarTab === "project" && projectTab}
      {activeSidebarTab === "media" && mediaTab}
      {activeSidebarTab === "effects" && effectsTab}
      {activeSidebarTab === "presets" && presetsTab}
      {activeSidebarTab === "transitions" && transitionsTab}
      {activeSidebarTab === "color" && colorTab}
    </aside>
  );
};

export default SPXEditorSidebar;
