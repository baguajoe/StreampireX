import React, { useState, useRef, useCallback } from "react";

const ELEMENT_TYPES = [
  { key: "heading", label: "SCENE", placeholder: "INT./EXT. LOCATION — TIME" },
  { key: "action", label: "ACTION", placeholder: "Action description..." },
  { key: "character", label: "CHARACTER", placeholder: "CHARACTER NAME" },
  { key: "dialogue", label: "DIALOGUE", placeholder: "Dialogue..." },
  { key: "paren", label: "PAREN", placeholder: "(parenthetical)" },
  { key: "transition", label: "TRANSITION", placeholder: "CUT TO:" },
  { key: "note", label: "NOTE", placeholder: "Script note..." },
];

const FORMAT_LABELS = {
  screenplay: "SCREENPLAY",
  tv: "TV SCRIPT",
  stage: "STAGE PLAY",
  documentary: "DOCUMENTARY",
  comic: "COMIC BOOK SCRIPT",
  shortform: "SHORT FORM",
};

export default function SPXScriptEditor({ script, setScript, format }) {
  const [activeElType, setActiveElType] = useState("heading");
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const nextId = useRef(100);

  const insertElement = (type) => {
    setActiveElType(type);
    const el = ELEMENT_TYPES.find((e) => e.key === type);
    const newEl = {
      id: nextId.current++,
      type,
      text: el.placeholder,
    };
    setScript((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl],
    }));
    setEditingId(newEl.id);
    setEditText(el.placeholder);
  };

  const startEdit = (el) => {
    setEditingId(el.id);
    setEditText(el.text);
    setSelectedElementId(el.id);
  };

  const commitEdit = (id) => {
    setScript((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, text: editText } : el
      ),
    }));
    setEditingId(null);
  };

  const deleteElement = (id) => {
    setScript((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const moveElement = (id, dir) => {
    setScript((prev) => {
      const els = [...prev.elements];
      const idx = els.findIndex((e) => e.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= els.length) return prev;
      [els[idx], els[newIdx]] = [els[newIdx], els[idx]];
      return { ...prev, elements: els };
    });
  };

  const handleKeyDown = (e, id) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitEdit(id);
      // Auto-advance element type
      const typeOrder = { heading: "action", action: "character", character: "dialogue", dialogue: "character", paren: "dialogue", transition: "heading" };
      const nextType = typeOrder[activeElType] || "action";
      insertElement(nextType);
    }
    if (e.key === "Escape") {
      commitEdit(id);
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const typeOrder = ["heading", "action", "character", "dialogue", "paren", "transition", "note"];
      const idx = typeOrder.indexOf(activeElType);
      const nextType = e.shiftKey
        ? typeOrder[(idx - 1 + typeOrder.length) % typeOrder.length]
        : typeOrder[(idx + 1) % typeOrder.length];
      setActiveElType(nextType);
    }
    if (e.key === "Backspace" && editText === "") {
      e.preventDefault();
      deleteElement(id);
    }
  };

  const getElementClass = (type) => {
    const map = {
      heading: "spx-el-heading",
      action: "spx-el-action",
      character: "spx-el-character",
      dialogue: "spx-el-dialogue",
      paren: "spx-el-paren",
      transition: "spx-el-transition",
      note: "spx-el-note",
    };
    return map[type] || "spx-el-action";
  };

  const estimatedPages = Math.max(1, Math.ceil(script.elements.length / 8));
  const readTime = Math.ceil(estimatedPages * 1.2);

  return (
    <div className="spx-script-center">
      {/* TOOLBAR */}
      <div className="spx-script-toolbar">
        {ELEMENT_TYPES.map((el) => (
          <button
            key={el.key}
            className={`spx-el-btn ${activeElType === el.key ? "active" : ""}`}
            onClick={() => insertElement(el.key)}
            title={`Insert ${el.label} (Tab to cycle)`}
          >
            {el.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="spx-toolbar-meta">{FORMAT_LABELS[format] || "SCREENPLAY"}</span>
          <span className="spx-toolbar-sep">|</span>
          <span className="spx-toolbar-meta">Pg 1 of {estimatedPages}</span>
          <span className="spx-toolbar-sep">|</span>
          <span className="spx-toolbar-meta spx-toolbar-meta-teal">~{readTime} min read</span>
        </div>
      </div>

      {/* PAGE */}
      <div className="spx-script-scroll">
        <div className="spx-script-page">
          <div className="spx-page-num">1.</div>
          <div className="spx-page-title">{script.title}</div>

          {script.elements.map((el) => (
            <div
              key={el.id}
              className={`spx-script-element ${getElementClass(el.type)} ${selectedElementId === el.id ? "selected" : ""}`}
              onClick={() => startEdit(el)}
            >
              {editingId === el.id ? (
                <textarea
                  className={`spx-el-textarea ${getElementClass(el.type)}`}
                  value={editText}
                  autoFocus
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, el.id)}
                  onBlur={() => commitEdit(el.id)}
                  rows={Math.max(1, Math.ceil(editText.length / 60))}
                />
              ) : (
                <span>{el.text}</span>
              )}
              {selectedElementId === el.id && editingId !== el.id && (
                <div className="spx-el-controls">
                  <button className="spx-el-ctrl-btn" onClick={(e) => { e.stopPropagation(); moveElement(el.id, -1); }} title="Move up">↑</button>
                  <button className="spx-el-ctrl-btn" onClick={(e) => { e.stopPropagation(); moveElement(el.id, 1); }} title="Move down">↓</button>
                  <button className="spx-el-ctrl-btn danger" onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} title="Delete">✕</button>
                </div>
              )}
            </div>
          ))}

          <div className="spx-el-add-row">
            <button className="spx-el-add-btn" onClick={() => insertElement(activeElType)}>
              + Insert {ELEMENT_TYPES.find(e => e.key === activeElType)?.label || "Element"}
            </button>
            <span className="spx-el-add-hint">Tab to cycle • Enter to confirm • Backspace on empty to delete</span>
          </div>
        </div>
      </div>
    </div>
  );
}
