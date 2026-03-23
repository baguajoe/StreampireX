import React, { useMemo, useState } from "react";

const groupByCategory = (items = []) =>
  items.reduce((acc, item) => {
    const key = item.category || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

const SPXPresetBrowser = ({ presets = [], title = "Preset Browser" }) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return presets.filter((p) =>
      (p.name || "").toLowerCase().includes(query.toLowerCase())
    );
  }, [presets, query]);

  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  return (
    <div className="spx-panel spx-preset-browser">
      <div className="spx-section-title">{title}</div>

      <input
        className="spx-search"
        placeholder={`Search ${title.toLowerCase()}...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="spx-library-count">Loaded: {filtered.length}</div>

      <div className="spx-scroll-list">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="spx-effect-category">
            <div className="spx-effect-title">{category}</div>
            {items.map((item) => (
              <div key={item.id || item.name} className="spx-effect">
                <div className="spx-effect-name">{item.name}</div>
                {item.source ? <div className="spx-effect-source">{item.source}</div> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SPXPresetBrowser;
