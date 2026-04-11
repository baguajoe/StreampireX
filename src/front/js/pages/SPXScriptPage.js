import React, { useState, useRef, useEffect } from "react";
import SPXScriptEditor from "../components/spx-script/SPXScriptEditor";
import SPXComicEditor from "../components/spx-script/SPXComicEditor";
import SPXComicGenerator from "../components/spx-script/SPXComicGenerator";
import SPXScriptNav from "../components/spx-script/SPXScriptNav";
import SPXScriptRightPanel from "../components/spx-script/SPXScriptRightPanel";
import SPXCollabBar from "../components/spx-script/SPXCollabBar";
import SPXOfflineIndicator from "../components/spx-script/SPXOfflineIndicator";
import { useScriptCollaboration } from "../hooks/useScriptCollaboration";
import { useScriptOffline } from "../hooks/useScriptOffline";
import SPXWorldNav from "../components/spx-script/SPXWorldNav";
import SPXBiblePanel from "../components/spx-script/SPXBiblePanel";
import SPXWorldCenter from "../components/spx-script/SPXWorldCenter";
import { downloadFDX, downloadFountain, readFDXFile, readFountainFile } from "../utils/fdxUtils";
import "../../styles/spx-script.css";

const FORMATS = [
  { value: "screenplay", label: "Screenplay" },
  { value: "tv", label: "TV Script" },
  { value: "stage", label: "Stage Play" },
  { value: "documentary", label: "Documentary" },
  { value: "comic", label: "Comic Book Script" },
  { value: "shortform", label: "Short Form / Ad" },
];

const DEFAULT_SCRIPT = {
  scriptId: "default_001",
  title: "UNTITLED PROJECT",
  format: "screenplay",
  savedAt: null,
  elements: [
    { id: 1, type: "heading", text: "FADE IN:" },
    { id: 2, type: "heading", text: "INT. RECORDING STUDIO — NIGHT" },
    { id: 3, type: "action", text: "A dimly lit studio. Mixing boards glow. MARCUS (28, sharp eyes, headphones around his neck) stares at a waveform frozen on his screen. The cursor blinks." },
    { id: 4, type: "character", text: "MARCUS" },
    { id: 5, type: "dialogue", text: "Sixteen bars. That's all I need. Sixteen bars and this whole thing makes sense." },
    { id: 6, type: "action", text: "He reaches for the mouse. Stops. Pulls back. Looks at the ceiling." },
    { id: 7, type: "character", text: "LAYLA" },
    { id: 8, type: "paren", text: "(from the doorway)" },
    { id: 9, type: "dialogue", text: "You've been saying that for three days." },
    { id: 10, type: "action", text: "LAYLA (26, producer, coffee in hand) leans against the doorframe. She's used to this." },
    { id: 11, type: "character", text: "MARCUS" },
    { id: 12, type: "dialogue", text: "Three days is nothing. Quincy Jones took three weeks on Thriller." },
    { id: 13, type: "character", text: "LAYLA" },
    { id: 14, type: "paren", text: "(dry)" },
    { id: 15, type: "dialogue", text: "You're not Quincy Jones." },
    { id: 16, type: "action", text: "Beat. Marcus turns back to the board." },
    { id: 17, type: "character", text: "MARCUS" },
    { id: 18, type: "dialogue", text: "Not yet." },
    { id: 19, type: "transition", text: "CUT TO:" },
    { id: 20, type: "heading", text: "EXT. DOWNTOWN STREET — NIGHT" },
    { id: 21, type: "action", text: "Rain. Neon reflects off wet asphalt. Marcus walks fast, hood up, earbuds in." },
  ],
  characters: [
    { name: "MARCUS", color: "#00ffc8", lines: 14 },
    { name: "LAYLA", color: "#FF6600", lines: 9 },
    { name: "DEAN", color: "#8888ff", lines: 5 },
  ],
  locations: [
    { name: "INT. STUDIO", count: 4 },
    { name: "EXT. STREET", count: 2 },
    { name: "INT. OFFICE", count: 2 },
    { name: "INT. CLUB", count: 1 },
  ],
};

const DEFAULT_COMIC = {
  title: "UNTITLED COMIC",
  issues: [{
    id: 1, number: 1,
    pages: [{
      id: 1, layout: "grid-3c",
      panels: [
        { id: 1, description: "Wide establishing shot. The city at dusk.", character: "CAPTION", balloonType: "Caption", dialogue: "The city never sleeps. Neither do its mistakes.", generatedImage: null },
        { id: 2, description: "Close-up on NOVA's face. Eyes scanning.", character: "NOVA", balloonType: "Speech", dialogue: "There. Third window from the left.", generatedImage: null },
        { id: 3, description: "ROOK pulls up beside her. Hands in pockets.", character: "ROOK", balloonType: "Speech", dialogue: "Three exits and zero backup.", generatedImage: null },
        { id: 4, description: "Wide shot. Building. One lit window on 9th floor.", character: "", balloonType: "None", dialogue: "", generatedImage: null },
        { id: 5, description: "Nova's hand moves toward her jacket.", character: "NOVA", balloonType: "Speech", dialogue: "Then we improvise.", generatedImage: null },
      ],
    }],
  }],
};

const DEFAULT_WORLD_DATA = {
  characters: [],
  locations: [],
  factions: [],
  lore: [],
};

function getCurrentUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return { id: "guest_" + Date.now(), name: "Guest" };
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.sub || payload.id, name: payload.name || payload.email || "Writer" };
  } catch (e) {
    return { id: "guest_" + Math.random().toString(36).slice(2), name: "Guest" };
  }
}

export default function SPXScriptPage() {
  const currentUser = useRef(getCurrentUser());
  const fileInputRef = useRef(null);
  const [importError, setImportError] = useState("");
  const [importType, setImportType] = useState("fdx");

  const [mainTab, setMainTab] = useState("script");
  const [format, setFormat] = useState("screenplay");
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [comic, setComic] = useState(DEFAULT_COMIC);
  const [credits, setCredits] = useState(120);
  const [rpTab, setRpTab] = useState("breakdown");
  const [selectedPanelId, setSelectedPanelId] = useState(1);
  const [selectedPageId, setSelectedPageId] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState([
    { id: 1, name: "v1 — First Draft", date: "2025-05-01" },
    { id: 2, name: "v2 — Revised", date: "2025-05-10" },
    { id: 3, name: "v3 — Final Draft", date: "2025-05-20", active: true },
  ]);
  const [generatedPanels, setGeneratedPanels] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [scriptMode, setScriptMode] = useState("script"); // "script" | "world"
  const [worldData, setWorldData] = useState(DEFAULT_WORLD_DATA);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [mapPins, setMapPins] = useState([]);

  const closeAllMenus = () => { setShowExportMenu(false); setShowImportMenu(false); setShowDrafts(false); };

  // Offline
  const { isOffline, lastSaved, saveStatus, syncQueue, forceSave, clearLocal, loadLocal, listLocalScripts } =
    useScriptOffline(script.scriptId, script, setScript, comic, setComic);

  // Collaboration
  const { connected, collaborators, comments, pendingEdits, setPendingEdits,
    broadcastEdit, broadcastCursor, addComment, replyToComment, resolveComment, deleteComment } =
    useScriptCollaboration(script.scriptId, currentUser.current.id, currentUser.current.name);

  // Apply remote edits
  useEffect(() => {
    if (!pendingEdits.length) return;
    pendingEdits.forEach((edit) => {
      if (edit.type === "element_edit") {
        setScript((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === edit.elementId ? { ...el, text: edit.text, type: edit.elementType || el.type } : el
          ),
        }));
      } else if (edit.type === "full_sync" && edit.elements) {
        setScript((prev) => ({ ...prev, elements: edit.elements }));
      }
    });
    setPendingEdits([]);
  }, [pendingEdits]);

  const handleFormatChange = (val) => {
    setFormat(val);
    if (val === "comic") setMainTab("comic");
  };

  // Export
  const handleExport = (type) => {
    setShowExportMenu(false);
    if (type === "fdx") downloadFDX(script.title, script.elements);
    else if (type === "fountain") downloadFountain(script.title, script.elements);
    else if (type === "pdf") window.print();
    else if (type === "txt") {
      const lines = script.elements.map((el) => {
        switch (el.type) {
          case "heading": return `\n${el.text.toUpperCase()}\n`;
          case "character": return `\n                    ${el.text.toUpperCase()}`;
          case "dialogue": return `          ${el.text}`;
          case "paren": return `               ${el.text}`;
          case "transition": return `\n                                        ${el.text}\n`;
          default: return `\n${el.text}\n`;
        }
      });
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${script.title.replace(/\s+/g, "_")}.txt`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Import
  const handleImportClick = (type) => {
    setImportType(type); setShowImportMenu(false); setImportError("");
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "fdx" ? ".fdx,.xml" : ".fountain,.txt";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    try {
      const result = importType === "fdx" ? await readFDXFile(file) : await readFountainFile(file);
      if (result?.elements?.length > 0) {
        setScript({ ...DEFAULT_SCRIPT, ...result, scriptId: `imported_${Date.now()}`, savedAt: null });
        setDrafts((prev) => [
          ...prev.map((d) => ({ ...d, active: false })),
          { id: Date.now(), name: `Imported — ${file.name}`, date: new Date().toISOString().slice(0, 10), active: true },
        ]);
      }
    } catch (err) { setImportError(err.message || "Import failed"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="spx-script-app" onClick={() => { if (showExportMenu || showImportMenu || showDrafts) closeAllMenus(); }}>
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} />

      {/* TOPBAR */}
      <div className="spx-script-topbar" onClick={(e) => e.stopPropagation()}>
        <div className="spx-script-logo">SPX <span className="spx-script-logo-accent">SCRIPT</span></div>
        <div className="spx-script-vsep" />

        {["script", "comic", "gen"].map((tab) => (
          <button key={tab} className={`spx-script-main-tab ${mainTab === tab ? "active" : ""}`} onClick={() => setMainTab(tab)}>
            {tab === "script" ? "SCRIPT" : tab === "comic" ? "COMIC BOOK" : "AI GENERATOR"}
          </button>
        ))}

        <div className="spx-script-vsep" />
        <span className="spx-script-fmt-label">Format</span>
        <select className="spx-script-fmt-sel" value={format} onChange={(e) => handleFormatChange(e.target.value)}>
          {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <div className="spx-script-spacer" />

        <SPXOfflineIndicator isOffline={isOffline} saveStatus={saveStatus} lastSaved={lastSaved}
          syncQueue={syncQueue} forceSave={forceSave} clearLocal={clearLocal}
          listLocalScripts={listLocalScripts} onLoadLocalScript={() => { const l = loadLocal(); if (l) setScript(l); }} />

        <div className="spx-script-credits-badge">⬡ {credits} Credits</div>
        <div className="spx-script-vsep" />
        <button
          className={`spx-script-main-tab ${scriptMode === "script" ? "active" : ""}`}
          onClick={() => setScriptMode("script")}
          title="Script writing mode"
        >
          ✏️ SCRIPT
        </button>
        <button
          className={`spx-script-main-tab ${scriptMode === "world" ? "active" : ""}`}
          style={{ color: scriptMode === "world" ? "#FF6600" : undefined, borderBottomColor: scriptMode === "world" ? "#FF6600" : undefined }}
          onClick={() => setScriptMode("world")}
          title="World building mode"
        >
          🌍 WORLD
        </button>

        <SPXCollabBar connected={connected} collaborators={collaborators} comments={comments}
          onAddComment={addComment} onReplyToComment={replyToComment}
          onResolveComment={resolveComment} onDeleteComment={deleteComment}
          currentUserId={currentUser.current.id} currentUserName={currentUser.current.name}
          scriptTitle={script.title} />

        {/* Drafts */}
        <div style={{ position: "relative" }}>
          <button className="spx-script-topbtn" onClick={() => {
            if(window.confirm('Start a new script? Unsaved changes will be lost.')) {
              setScript({...DEFAULT_SCRIPT, title: 'UNTITLED', elements: [], scriptId: 'new_' + Date.now(), savedAt: null});
              setComic({...DEFAULT_COMIC});
              closeAllMenus();
            }
          }}>NEW</button>
          <button className="spx-script-topbtn" onClick={() => { setShowDrafts(!showDrafts); setShowExportMenu(false); setShowImportMenu(false); }}>DRAFTS</button>
          {showDrafts && (
            <div className="spx-script-drafts-dropdown">
              {drafts.map((d) => (
                <div key={d.id} className={`spx-script-draft-item ${d.active ? "active" : ""}`}>
                  <span>{d.name}</span><span className="spx-script-draft-date">{d.date}</span>
                </div>
              ))}
              <button className="spx-script-draft-new" onClick={() => {
                const name = prompt("Draft name?");
                if (name) { setDrafts((prev) => [...prev.map(d => ({ ...d, active: false })), { id: Date.now(), name, date: new Date().toISOString().slice(0, 10), active: true }]); setShowDrafts(false); }
              }}>+ New Draft</button>
            </div>
          )}
        </div>

        {/* Import */}
        <div style={{ position: "relative" }}>
          <button className="spx-script-topbtn" onClick={() => { setShowImportMenu(!showImportMenu); setShowExportMenu(false); setShowDrafts(false); }}>IMPORT</button>
          {showImportMenu && (
            <div className="spx-script-drafts-dropdown">
              <div className="spx-script-draft-item" onClick={() => handleImportClick("fdx")}><span>Final Draft (.fdx)</span></div>
              <div className="spx-script-draft-item" onClick={() => handleImportClick("fountain")}><span>Fountain (.fountain)</span></div>
            </div>
          )}
        </div>

        {/* Export */}
        <div style={{ position: "relative" }}>
          <button className="spx-script-topbtn accent" onClick={() => { setShowExportMenu(!showExportMenu); setShowImportMenu(false); setShowDrafts(false); }}>EXPORT</button>
          {showExportMenu && (
            <div className="spx-script-drafts-dropdown" style={{ right: 0, minWidth: 180 }}>
              <div className="spx-script-draft-item" onClick={() => handleExport("fdx")}><span>Final Draft (.fdx)</span></div>
              <div className="spx-script-draft-item" onClick={() => handleExport("fountain")}><span>Fountain (.fountain)</span></div>
              <div className="spx-script-draft-item" onClick={() => handleExport("pdf")}><span>PDF</span></div>
              <div className="spx-script-draft-item" onClick={() => handleExport("txt")}><span>Plain Text (.txt)</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Import error banner */}
      {importError && (
        <div style={{ background: "rgba(255,60,60,0.1)", borderBottom: "1px solid rgba(255,60,60,0.3)", padding: "6px 16px", fontSize: 12, color: "#ff8888", display: "flex", justifyContent: "space-between" }}>
          <span>Import error: {importError}</span>
          <button onClick={() => setImportError("")} style={{ background: "none", border: "none", color: "#ff8888", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Who's editing banner */}
      {collaborators.length > 0 && (
        <div className="spx-collab-who-banner">
          {collaborators.map((c) => (
            <span key={c.userId} className="spx-collab-who-chip" style={{ borderColor: c.color, color: c.color }}>{c.userName} is editing</span>
          ))}
        </div>
      )}

      {/* WORKSPACE */}
      <div className="spx-script-workspace">
        {mainTab !== "gen" && scriptMode === "script" && (
          <SPXScriptNav mainTab={mainTab} script={script} comic={comic}
            selectedIssueId={selectedIssueId} selectedPageId={selectedPageId}
            onSelectPage={setSelectedPageId} onSelectIssue={setSelectedIssueId} drafts={drafts} />
        )}
        {scriptMode === "world" && (
          <SPXWorldNav
            worldData={worldData}
            setWorldData={setWorldData}
            selectedEntry={selectedEntry}
            setSelectedEntry={setSelectedEntry}
            onSelectEntry={(entry) => { setSelectedEntry(entry); }}
          />
        )}

        {mainTab === "script" && scriptMode === "script" && (
          <SPXScriptEditor script={script} setScript={setScript} format={format}
            broadcastEdit={broadcastEdit} broadcastCursor={broadcastCursor}
            collaborators={collaborators} onAddComment={addComment} />
        )}
        {mainTab === "comic" && scriptMode === "script" && (
          <SPXComicEditor comic={comic} setComic={setComic}
            selectedIssueId={selectedIssueId} selectedPageId={selectedPageId}
            setSelectedPageId={setSelectedPageId} selectedPanelId={selectedPanelId}
            setSelectedPanelId={setSelectedPanelId} />
        )}
        {scriptMode === "world" && mainTab !== "gen" && (
          <SPXWorldCenter
            worldData={worldData}
            mapPins={mapPins}
            setMapPins={setMapPins}
            selectedEntry={selectedEntry}
            onSelectEntry={(entry) => setSelectedEntry(entry)}
          />
        )}
        {mainTab === "gen" && (
          <SPXComicGenerator credits={credits} setCredits={setCredits}
            generatedPanels={generatedPanels} setGeneratedPanels={setGeneratedPanels}
            generating={generating} setGenerating={setGenerating}
            comic={comic} setComic={setComic}
            selectedIssueId={selectedIssueId} selectedPageId={selectedPageId}
            selectedPanelId={selectedPanelId} />
        )}

        {mainTab !== "gen" && scriptMode === "script" && (
          <SPXScriptRightPanel mainTab={mainTab} rpTab={rpTab} setRpTab={setRpTab}
            script={script} comic={comic} setComic={setComic}
            selectedIssueId={selectedIssueId} selectedPageId={selectedPageId}
            selectedPanelId={selectedPanelId} />
        )}
        {scriptMode === "world" && (
          <SPXBiblePanel
            selectedEntry={selectedEntry}
            worldData={worldData}
            setWorldData={setWorldData}
            onOpenCanvas={() => window.open('/spx-canvas', '_blank')}
            on3DModel={() => window.open('/spx-3d-mesh', '_blank')}
          />
        )}
      </div>
    </div>
  );
}
