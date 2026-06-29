/**
 * useScriptOffline.js
 * Offline-first persistence for SPX Script
 * - Auto-saves to localStorage on every change
 * - Queues changes made offline
 * - Syncs to backend when connection restored
 * - IndexedDB for larger scripts (>100KB)
 *
 * Usage:
 *   const { isOffline, lastSaved, saveStatus, forceSave, loadLocal } =
 *     useScriptOffline(scriptId, script, setScript);
 */

import { useState, useEffect, useRef, useCallback } from "react";

const LOCAL_KEY = (id) => `spx_script_${id}`;
const QUEUE_KEY = (id) => `spx_script_queue_${id}`;
const COMIC_KEY = (id) => `spx_comic_${id}`;
// Maps a client scriptId -> the backend draft's numeric PK, so repeat saves
// UPDATE the same row instead of inserting a new draft every autosave.
// Note: deliberately NOT prefixed `spx_script_` so listLocalScripts ignores it.
const DRAFTID_KEY = (id) => `spx_cloud_draftid_${id}`;
const AUTO_SAVE_INTERVAL = 3000; // 3 seconds

export function useScriptOffline(scriptId, script, setScript, comic, setComic) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // local layer: idle | saving | saved | error | offline
  // Cloud layer status — kept distinct so the indicator never claims a cloud
  // save that didn't happen. idle | syncing | synced | error | offline | unauthenticated
  const [cloudStatus, setCloudStatus] = useState("idle");
  const [cloudError, setCloudError] = useState(null);
  const [syncQueue, setSyncQueue] = useState([]);
  const autoSaveTimer = useRef(null);
  const isDirty = useRef(false);

  // ── Online/offline detection ────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      flushSyncQueue();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setSaveStatus("offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── Auto-save to localStorage every 3s when dirty ──────────────────────
  useEffect(() => {
    if (!script || !scriptId) return;
    isDirty.current = true;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (isDirty.current) {
        saveLocal();
        isDirty.current = false;
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearTimeout(autoSaveTimer.current);
  }, [script, scriptId]);

  useEffect(() => {
    if (!comic || !scriptId) return;
    saveLocalComic();
  }, [comic, scriptId]);

  // ── Load from localStorage on mount ────────────────────────────────────
  useEffect(() => {
    if (!scriptId || !setScript) return;
    // New script context — clear any stale cloud status until the next sync.
    setCloudStatus("idle");
    setCloudError(null);
    const local = loadLocal();
    if (local && local.elements?.length > 0) {
      // Only restore if local is newer than what's loaded
      const localTime = new Date(local.savedAt || 0).getTime();
      const scriptTime = new Date(script?.savedAt || 0).getTime();
      if (localTime > scriptTime) {
        setScript(local);
        setLastSaved(new Date(local.savedAt));
      }
    }
    // Also restore comic
    const localComic = loadLocalComic();
    if (localComic && setComic) {
      setComic(localComic);
    }
    // Load sync queue
    const queue = loadQueue();
    if (queue.length > 0) {
      setSyncQueue(queue);
      if (navigator.onLine) flushSyncQueue();
    }
  }, [scriptId]);

  // ── Save helpers ────────────────────────────────────────────────────────

  const saveLocal = useCallback(() => {
    if (!scriptId || !script) return;
    setSaveStatus("saving");
    try {
      const payload = { ...script, savedAt: new Date().toISOString(), scriptId };
      localStorage.setItem(LOCAL_KEY(scriptId), JSON.stringify(payload));
      setLastSaved(new Date());
      setSaveStatus(isOffline ? "offline" : "saved");

      // Queue for backend sync if offline; otherwise sync (which drives cloudStatus)
      if (isOffline) {
        queueForSync({ type: "script", scriptId, payload });
        setCloudStatus("offline");
      } else {
        syncToBackend(payload);
      }
    } catch (e) {
      // localStorage full — try IndexedDB
      saveToIndexedDB(LOCAL_KEY(scriptId), script);
      setSaveStatus("saved");
    }
  }, [scriptId, script, isOffline]);

  const saveLocalComic = useCallback(() => {
    if (!scriptId || !comic) return;
    try {
      localStorage.setItem(COMIC_KEY(scriptId), JSON.stringify({ ...comic, savedAt: new Date().toISOString() }));
    } catch (e) {
      saveToIndexedDB(COMIC_KEY(scriptId), comic);
    }
  }, [scriptId, comic]);

  const loadLocal = useCallback(() => {
    if (!scriptId) return null;
    try {
      const raw = localStorage.getItem(LOCAL_KEY(scriptId));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }, [scriptId]);

  const loadLocalComic = useCallback(() => {
    if (!scriptId) return null;
    try {
      const raw = localStorage.getItem(COMIC_KEY(scriptId));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }, [scriptId]);

  const loadQueue = useCallback(() => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY(scriptId));
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }, [scriptId]);

  const queueForSync = useCallback((item) => {
    const queue = loadQueue();
    queue.push({ ...item, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY(scriptId), JSON.stringify(queue));
    setSyncQueue(queue);
  }, [scriptId, loadQueue]);

  // ── Backend sync ────────────────────────────────────────────────────────

  // Returns { ok, ... } and drives cloudStatus/cloudError. Never throws.
  const syncToBackend = useCallback(async (payload) => {
    if (!scriptId) return { ok: false, reason: "no-script" };
    if (!navigator.onLine) {
      setCloudStatus("offline");
      return { ok: false, reason: "offline" };
    }
    const token = localStorage.getItem("token");
    if (!token) {
      // Not signed in — we can only save locally. Surface this honestly
      // rather than implying the work was backed up to the cloud.
      setCloudStatus("unauthenticated");
      setCloudError(null);
      return { ok: false, reason: "no-token" };
    }

    setCloudStatus("syncing");
    try {
      // Backend contract: { id?, title, format, content }. The full script
      // document goes under `content`; a missing `content` is what was 400ing.
      const body = {
        title: (payload.title || "Untitled Script").slice(0, 255),
        format: payload.format || "screenplay",
        content: payload,
      };
      const existingDraftId = localStorage.getItem(DRAFTID_KEY(scriptId));
      if (existingDraftId) body.id = Number(existingDraftId);

      const resp = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/script/save-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        // If the tracked draft was deleted server-side, drop the stale mapping
        // so the next save creates a fresh draft instead of 404ing forever.
        if (resp.status === 404 && existingDraftId) {
          localStorage.removeItem(DRAFTID_KEY(scriptId));
        }
        let msg = `HTTP ${resp.status}`;
        try { const j = await resp.json(); if (j && j.error) msg = j.error; } catch (_) {}
        setCloudStatus("error");
        setCloudError(msg);
        return { ok: false, reason: "http", status: resp.status, message: msg };
      }

      const data = await resp.json().catch(() => ({}));
      // Remember the backend PK so subsequent saves UPDATE this same draft.
      if (data && data.draft && data.draft.id != null) {
        localStorage.setItem(DRAFTID_KEY(scriptId), String(data.draft.id));
      }
      setCloudStatus("synced");
      setCloudError(null);
      return { ok: true, draft: data && data.draft };
    } catch (e) {
      setCloudStatus("error");
      setCloudError(e.message || "Network error");
      return { ok: false, reason: "network", message: e.message };
    }
  }, [scriptId]);

  const flushSyncQueue = useCallback(async () => {
    const queue = loadQueue();
    if (!queue.length) return;

    const failed = [];
    for (const item of queue) {
      const result = await syncToBackend(item.payload);
      if (!result || !result.ok) failed.push(item);
    }

    // Clear or keep failed items
    if (failed.length === 0) {
      localStorage.removeItem(QUEUE_KEY(scriptId));
      setSyncQueue([]);
    } else {
      localStorage.setItem(QUEUE_KEY(scriptId), JSON.stringify(failed));
      setSyncQueue(failed);
    }
  }, [loadQueue, syncToBackend, scriptId]);

  // ── Force save (manual) ─────────────────────────────────────────────────
  const forceSave = useCallback(() => {
    saveLocal();
    saveLocalComic();
  }, [saveLocal, saveLocalComic]);

  // ── Clear local data ─────────────────────────────────────────────────────
  const clearLocal = useCallback(() => {
    localStorage.removeItem(LOCAL_KEY(scriptId));
    localStorage.removeItem(COMIC_KEY(scriptId));
    localStorage.removeItem(QUEUE_KEY(scriptId));
    setSyncQueue([]);
    setLastSaved(null);
    setSaveStatus("idle");
  }, [scriptId]);

  // ── List all locally saved scripts ──────────────────────────────────────
  const listLocalScripts = useCallback(() => {
    const scripts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("spx_script_") && !key.includes("queue")) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          scripts.push({ scriptId: data.scriptId, title: data.title, savedAt: data.savedAt });
        } catch (e) {}
      }
    }
    return scripts.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }, []);

  return {
    isOffline,
    lastSaved,
    saveStatus,
    cloudStatus,
    cloudError,
    syncQueue,
    forceSave,
    clearLocal,
    loadLocal,
    loadLocalComic,
    listLocalScripts,
  };
}

// ── IndexedDB fallback for large scripts ───────────────────────────────────

function saveToIndexedDB(key, data) {
  const request = indexedDB.open("spx_script_db", 1);
  request.onupgradeneeded = (e) => {
    e.target.result.createObjectStore("scripts", { keyPath: "key" });
  };
  request.onsuccess = (e) => {
    const db = e.target.result;
    const tx = db.transaction("scripts", "readwrite");
    tx.objectStore("scripts").put({ key, data, savedAt: new Date().toISOString() });
  };
}

function loadFromIndexedDB(key) {
  return new Promise((resolve) => {
    const request = indexedDB.open("spx_script_db", 1);
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction("scripts", "readonly");
      const req = tx.objectStore("scripts").get(key);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}
