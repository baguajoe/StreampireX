/**
 * useScriptCollaboration.js
 * Real-time collaboration for SPX Script
 * - Live presence (who's in the doc)
 * - Inline comments with threads
 * - Operational transforms for concurrent edits (last-write-wins per element)
 * - WebSocket via your existing Railway backend
 *
 * Usage:
 *   const { collaborators, comments, addComment, resolveComment, broadcastEdit } =
 *     useScriptCollaboration(scriptId, userId, userName);
 */

import { useState, useEffect, useRef, useCallback } from "react";

const WS_BASE = process.env.REACT_APP_WS_URL || "";

export function useScriptCollaboration(scriptId, userId, userName) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [comments, setComments] = useState([]);
  const [pendingEdits, setPendingEdits] = useState([]);

  // User color — deterministic from userId
  const userColor = useRef(getUserColor(userId));

  const connect = useCallback(() => {
    if (!scriptId || !userId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE}/ws/script/${scriptId}?userId=${userId}&userName=${encodeURIComponent(userName)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      clearTimeout(reconnectTimer.current);
      ws.send(JSON.stringify({
        type: "join",
        userId,
        userName,
        color: userColor.current,
        scriptId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {
        console.warn("SPX Collab: bad message", e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [scriptId, userId, userName]);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case "presence":
        // Full presence list from server
        setCollaborators(msg.collaborators.filter((c) => c.userId !== userId));
        break;

      case "user_joined":
        setCollaborators((prev) => {
          if (prev.find((c) => c.userId === msg.userId)) return prev;
          return [...prev, { userId: msg.userId, userName: msg.userName, color: msg.color, cursor: null, activeElementId: null }];
        });
        break;

      case "user_left":
        setCollaborators((prev) => prev.filter((c) => c.userId !== msg.userId));
        break;

      case "cursor_move":
        setCollaborators((prev) =>
          prev.map((c) =>
            c.userId === msg.userId
              ? { ...c, activeElementId: msg.elementId, cursorOffset: msg.offset }
              : c
          )
        );
        break;

      case "element_edit":
        // Another user edited an element — apply to pending edits queue
        setPendingEdits((prev) => [...prev, msg]);
        break;

      case "comment_add":
        setComments((prev) => [...prev, msg.comment]);
        break;

      case "comment_resolve":
        setComments((prev) =>
          prev.map((c) => c.id === msg.commentId ? { ...c, resolved: true } : c)
        );
        break;

      case "comment_reply":
        setComments((prev) =>
          prev.map((c) =>
            c.id === msg.commentId
              ? { ...c, replies: [...(c.replies || []), msg.reply] }
              : c
          )
        );
        break;

      case "script_sync":
        // Full script state from server on join
        if (msg.elements) setPendingEdits([{ type: "full_sync", elements: msg.elements }]);
        if (msg.comments) setComments(msg.comments);
        break;

      default:
        break;
    }
  }, [userId]);

  // ── Send helpers ──────────────────────────────────────────────────────────

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify(msg)); } catch(e) {}
    }
  }, []);

  /** Broadcast an element edit to all collaborators */
  const broadcastEdit = useCallback((elementId, text, type) => {
    send({
      type: "element_edit",
      userId,
      scriptId,
      elementId,
      text,
      elementType: type,
      timestamp: Date.now(),
    });
  }, [send, userId, scriptId]);

  /** Broadcast cursor position */
  const broadcastCursor = useCallback((elementId, offset) => {
    send({ type: "cursor_move", userId, scriptId, elementId, offset });
  }, [send, userId, scriptId]);

  /** Add an inline comment on an element */
  const addComment = useCallback((elementId, text, selectedText = "") => {
    const comment = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      elementId,
      userId,
      userName,
      color: userColor.current,
      text,
      selectedText,
      resolved: false,
      replies: [],
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, comment]);
    send({ type: "comment_add", scriptId, comment });
    return comment.id;
  }, [send, userId, userName, scriptId]);

  /** Reply to a comment */
  const replyToComment = useCallback((commentId, text) => {
    const reply = {
      id: `r_${Date.now()}`,
      userId,
      userName,
      color: userColor.current,
      text,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c
      )
    );
    send({ type: "comment_reply", scriptId, commentId, reply });
  }, [send, userId, userName, scriptId]);

  /** Resolve a comment */
  const resolveComment = useCallback((commentId) => {
    setComments((prev) =>
      prev.map((c) => c.id === commentId ? { ...c, resolved: true } : c)
    );
    send({ type: "comment_resolve", scriptId, commentId, userId });
  }, [send, userId, scriptId]);

  /** Delete a comment */
  const deleteComment = useCallback((commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    send({ type: "comment_delete", scriptId, commentId, userId });
  }, [send, userId, scriptId]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) { try { wsRef.current.send(JSON.stringify({ type: "leave", userId, scriptId })); } catch(e) {} }
        wsRef.current.close();
      }
    };
  }, [connect, scriptId, userId]);

  // Ping every 30s to keep connection alive
  useEffect(() => {
    const interval = setInterval(() => {
      send({ type: "ping", userId, scriptId });
    }, 30000);
    return () => clearInterval(interval);
  }, [send, userId, scriptId]);

  return {
    connected,
    collaborators,
    comments,
    pendingEdits,
    setPendingEdits,
    broadcastEdit,
    broadcastCursor,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    userColor: userColor.current,
  };
}

// ── Color assignment ───────────────────────────────────────────────────────
const COLLAB_COLORS = [
  "#00ffc8", "#FF6600", "#ff4488", "#44aaff",
  "#ffcc00", "#aa44ff", "#44ffaa", "#ff8844",
];

function getUserColor(userId) {
  if (!userId) return COLLAB_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userId.toString().length; i++) {
    hash = userId.toString().charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}
