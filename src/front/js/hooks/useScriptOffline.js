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
const AUTO_SAVE_INTERVAL = 3000; // 3 seconds

export function useScriptOffline(scriptId, script, setScript, comic, setComic) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error | offline
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

      // Queue for backend sync if offline
      if (isOffline) {
        queueForSync({ type: "script", scriptId, payload });
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

  const syncToBackend = useCallback(async (payload) => {
    if (!navigator.onLine || !scriptId) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/script/save-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // Will retry on next save
    }
  }, [scriptId]);

  const flushSyncQueue = useCallback(async () => {
    const queue = loadQueue();
    if (!queue.length) return;

    const failed = [];
    for (const item of queue) {
      try {
        await syncToBackend(item.payload);
      } catch (e) {
        failed.push(item);
      }
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
