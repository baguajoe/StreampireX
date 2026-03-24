import React, { useRef } from "react";
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

const BrowserGroup = ({ title, items, kind, onApply, onDragStart }) => (
  <div className="spx-effect-category" key={title}>
    <div className="spx-effect-title">{title}</div>
    {items.map((item) => (
      <button
        key={item.id}
        className="spx-effect"
        draggable
        onDragStart={() => onDragStart({ ...item, kind })}
        onClick={() => onApply({ ...item, kind })}
        type="button"
        title={`Apply ${item.name}`}
      >
        <div className="spx-effect-name">{item.name}</div>
        <div className="spx-effect-source">{item.source}</div>
      </button>
    ))}
  </div>
);

const ImportBlock = ({ inputRef, handleUploadMedia, onExternalDrop, compact = false }) => (
  <div
    className={`spx-import-block ${compact ? "is-compact" : ""}`}
    onDragOver={(e) => {
      e.preventDefault();
      e.currentTarget.classList.add("is-dragover");
    }}
    onDragLeave={(e) => {
      e.currentTarget.classList.remove("is-dragover");
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.currentTarget.classList.remove("is-dragover");
      onExternalDrop(e);
    }}
  >
    <input
      ref={inputRef}
      type="file"
      multiple
      onChange={handleUploadMedia}
      className="spx-hidden-file-input"
    />

    <button
      className="spx-import-btn"
      type="button"
      onClick={() => inputRef.current?.click()}
    >
      ⤴ Import Media
    </button>

    <div className="spx-import-help">
      Drag files here from your desktop, or click Import Media
    </div>
  </div>
);

const SPXEditorSidebar = ({ editor }) => {
  const inputRef = useRef(null);

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
    selectedClip,
    handleUploadMedia,
    onDragMediaStart,
    onDragPresetStart,
    applyEffectToSelectedClip,
    applyPresetToSelectedClip,
    applyTransitionToSelectedClip,
    applyColorToSelectedClip
  } = editor;

  const counts = summarizeLibraries();

  const onExternalDrop = (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    handleUploadMedia({ target: { files } });
  };

  const filteredEffects = EFFECT_LIBRARY.filter((item) =>
    item.name.toLowerCase().includes(effectSearch.toLowerCase())
  );

  const filteredPresets = PRESET_LIBRARY.filter((item) =>
    item.name.toLowerCase().includes(presetSearch.toLowerCase())
  );

  const forcedTransitions = [
    { id: "cross-dissolve", name: "Cross Dissolve", category: "Dissolve", source: "SPX" },
    { id: "dip-black", name: "Dip to Black", category: "Dissolve", source: "SPX" },
    { id: "dip-white", name: "Dip to White", category: "Dissolve", source: "SPX" },
    { id: "constant-power", name: "Constant Power", category: "Audio", source: "SPX" }
  ];

  const filteredTransitions = [...forcedTransitions, ...TRANSITION_LIBRARY].filter((item, idx, arr) =>
    arr.findIndex((x) => x.name === item.name) === idx &&
    item.name.toLowerCase().includes(transitionSearch.toLowerCase())
  );

  const filteredColor = COLOR_LIBRARY.filter((item) =>
    item.name.toLowerCase().includes(colorSearch.toLowerCase())
  );

  const assetCards = assets.length ? assets.map((asset) => (
    <div
      key={asset.id}
      className="spx-media-item"
      draggable
      onDragStart={() => onDragMediaStart(asset)}
      title="Drag to timeline"
    >
      <div className="spx-media-thumb" />
      <div className="spx-media-meta">
        <div className="spx-media-name">{asset.name}</div>
        <div className="spx-media-type">{asset.type || "media"}</div>
      </div>
    </div>
  )) : <div className="spx-empty">No imported media</div>;

  return (
    <aside className="spx-editor-sidebar">
      <div className="spx-panel-title">SPX EDITOR</div>

      <div className="spx-tabs six-tabs">
        <button className={activeSidebarTab === "project" ? "active" : ""} onClick={() => setActiveSidebarTab("project")} type="button">Project</button>
        <button className={activeSidebarTab === "media" ? "active" : ""} onClick={() => setActiveSidebarTab("media")} type="button">Media</button>
        <button className={activeSidebarTab === "effects" ? "active" : ""} onClick={() => setActiveSidebarTab("effects")} type="button">Effects</button>
        <button className={activeSidebarTab === "presets" ? "active" : ""} onClick={() => setActiveSidebarTab("presets")} type="button">Presets</button>
        <button className={activeSidebarTab === "transitions" ? "active" : ""} onClick={() => setActiveSidebarTab("transitions")} type="button">Transitions</button>
        <button className={activeSidebarTab === "color" ? "active" : ""} onClick={() => setActiveSidebarTab("color")} type="button">Color</button>
      </div>

      {activeSidebarTab === "project" && (
        <>
          <div className="spx-panel">
            <div className="spx-section-title">Project Bin</div>
            <ImportBlock
              inputRef={inputRef}
              handleUploadMedia={handleUploadMedia}
              onExternalDrop={onExternalDrop}
            />
            <div className="spx-media-bin">{assetCards}</div>
          </div>

          <div className="spx-panel">
            <div className="spx-section-title">Tools</div>
            <div className="spx-tool-grid">
              {["select","scissors","slip","text","shape","pen","hand","zoom","crop","mask"].map((tool) => (
                <button
                  key={tool}
                  className={`spx-tool ${activeTool === tool ? "active" : ""}`}
                  onClick={() => setActiveTool(tool)}
                  type="button"
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
                  <div className="spx-layer-controls">{layer.type}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeSidebarTab === "media" && (
        <div className="spx-panel">
          <div className="spx-section-title">Media Bin</div>
          <ImportBlock
            inputRef={inputRef}
            handleUploadMedia={handleUploadMedia}
            onExternalDrop={onExternalDrop}
            compact={true}
          />
          <div className="spx-media-bin-grid">{assetCards}</div>
        </div>
      )}

      {activeSidebarTab === "effects" && (
        <div className="spx-panel">
          <div className="spx-section-title">Effects Browser</div>
          <div className="spx-library-count">Loaded: {counts.effects}</div>
          <div className="spx-selection-hint">
            {selectedClip ? `Selected clip: ${selectedClip.name}` : "Select a clip to apply effects"}
          </div>
          <input className="spx-search" placeholder="Search effects..." value={effectSearch} onChange={(e) => setEffectSearch(e.target.value)} />
          <div className="spx-scroll-list">
            {Object.entries(groupByCategory(filteredEffects)).map(([category, items]) => (
              <BrowserGroup key={category} title={category} items={items} kind="effect" onApply={applyEffectToSelectedClip} onDragStart={onDragPresetStart} />
            ))}
          </div>
        </div>
      )}

      {activeSidebarTab === "presets" && (
        <div className="spx-panel">
          <div className="spx-section-title">Preset Browser</div>
          <div className="spx-library-count">Loaded: {counts.presets}</div>
          <div className="spx-selection-hint">
            {selectedClip ? `Selected clip: ${selectedClip.name}` : "Select a clip to apply presets"}
          </div>
          <input className="spx-search" placeholder="Search presets..." value={presetSearch} onChange={(e) => setPresetSearch(e.target.value)} />
          <div className="spx-scroll-list">
            {Object.entries(groupByCategory(filteredPresets)).map(([category, items]) => (
              <BrowserGroup key={category} title={category} items={items} kind="preset" onApply={applyPresetToSelectedClip} onDragStart={onDragPresetStart} />
            ))}
          </div>
        </div>
      )}

      {activeSidebarTab === "transitions" && (
        <div className="spx-panel">
          <div className="spx-section-title">Transitions</div>
          <div className="spx-library-count">Loaded: {filteredTransitions.length}</div>
          <div className="spx-selection-hint">
            {selectedClip ? `Selected clip: ${selectedClip.name}` : "Select a clip first"}
          </div>
          <input className="spx-search" placeholder="Search transitions..." value={transitionSearch} onChange={(e) => setTransitionSearch(e.target.value)} />
          <div className="spx-scroll-list">
            {Object.entries(groupByCategory(filteredTransitions)).map(([category, items]) => (
              <BrowserGroup key={category} title={category} items={items} kind="transition" onApply={applyTransitionToSelectedClip} onDragStart={onDragPresetStart} />
            ))}
          </div>
        </div>
      )}

      {activeSidebarTab === "color" && (
        <div className="spx-panel">
          <div className="spx-section-title">Color / LUT Browser</div>
          <div className="spx-library-count">Loaded: {counts.color}</div>
          <div className="spx-selection-hint">
            {selectedClip ? `Selected clip: ${selectedClip.name}` : "Select a clip to apply color presets"}
          </div>
          <input className="spx-search" placeholder="Search color presets..." value={colorSearch} onChange={(e) => setColorSearch(e.target.value)} />
          <div className="spx-scroll-list">
            {Object.entries(groupByCategory(filteredColor)).map(([category, items]) => (
              <BrowserGroup key={category} title={category} items={items} kind="color" onApply={applyColorToSelectedClip} onDragStart={onDragPresetStart} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};

export default SPXEditorSidebar;
