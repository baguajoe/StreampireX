// =============================================================================
// PodcastEpisodeComments.js — Timestamped comments like YouTube + Spotify
// Listeners comment at specific timestamps, host can pin/reply
// =============================================================================

import React, { useState, useEffect } from "react";
import { showToast } from "../utils/toast";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const token = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const userId = () => {
  try { return JSON.parse(atob(token()?.split(".")[1] || ""))?.sub; } catch { return null; }
};

function fmtTime(s) {
  if (!s && s !== 0) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function fmtAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function Comment({ comment, episodeId, isOwner, onJumpTo, onPin, onDelete, onReply, depth = 0 }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const isMe = userId() === String(comment.user_id);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    await onReply(comment.id, replyText);
    setReplyText("");
    setShowReply(false);
  };

  const likeComment = async () => {
    setLiked(v => !v);
    setLikes(v => liked ? v - 1 : v + 1);
    await fetch(`${BACKEND}/api/podcast/episode/${episodeId}/comments/${comment.id}/like`, {
      method: "POST", headers: { Authorization: `Bearer ${token()}` }
    }).catch(() => {});
  };

  const S = {
    wrap: { marginLeft: depth * 20, marginBottom: 10, padding: "10px 12px", background: comment.is_pinned ? "#00ffc811" : "#0a0a14", border: `1px solid ${comment.is_pinned ? "#00ffc844" : "#1a2a3a"}`, borderRadius: 6 },
    avatar: { width: 28, height: 28, borderRadius: "50%", background: "#1a2a3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#00ffc8", flexShrink: 0 },
    ts: { cursor: "pointer", color: "#00ffc8", fontSize: 10, fontWeight: 700, background: "#00ffc822", padding: "1px 6px", borderRadius: 3, border: "1px solid #00ffc844" },
    btn: (col = "#5a7088") => ({ background: "none", border: "none", color: col, cursor: "pointer", fontSize: 10, padding: "2px 6px", fontFamily: "JetBrains Mono,monospace" }),
    inp: { flex: 1, background: "#06060f", border: "1px solid #1a2a3a", borderRadius: 3, color: "#ccc", padding: "5px 8px", fontSize: 11, fontFamily: "JetBrains Mono,monospace" },
  };

  return (
    <div style={S.wrap}>
      {comment.is_pinned && <div style={{ fontSize: 9, color: "#00ffc8", marginBottom: 4 }}>📌 Pinned by host</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={S.avatar}>{(comment.username || "?")[0].toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ color: comment.is_host ? "#FF6600" : "#ccc", fontWeight: 700, fontSize: 11 }}>
              {comment.username || "Listener"} {comment.is_host && "🎙 Host"}
            </span>
            {comment.timestamp_sec != null && (
              <span style={S.ts} onClick={() => onJumpTo?.(comment.timestamp_sec)}>
                ▶ {fmtTime(comment.timestamp_sec)}
              </span>
            )}
            <span style={{ color: "#5a7088", fontSize: 9, marginLeft: "auto" }}>{fmtAgo(comment.created_at)}</span>
          </div>
          <div style={{ color: "#ccc", fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>{comment.text}</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button style={S.btn(liked ? "#00ffc8" : "#5a7088")} onClick={likeComment}>
              {liked ? "❤️" : "🤍"} {likes}
            </button>
            {token() && <button style={S.btn()} onClick={() => setShowReply(v => !v)}>↩ Reply</button>}
            {isOwner && !comment.is_pinned && <button style={S.btn("#ffaa00")} onClick={() => onPin(comment.id)}>📌 Pin</button>}
            {isOwner && comment.is_pinned && <button style={S.btn("#5a7088")} onClick={() => onPin(comment.id)}>Unpin</button>}
            {(isMe || isOwner) && <button style={S.btn("#ff4444")} onClick={() => onDelete(comment.id)}>Delete</button>}
          </div>
          {showReply && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input style={S.inp} placeholder={`Reply to ${comment.username}...`} value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === "Enter" && submitReply()} />
              <button onClick={submitReply} style={{ padding: "5px 10px", background: "#00ffc822", border: "1px solid #00ffc8", borderRadius: 3, color: "#00ffc8", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>Post</button>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.map(r => (
        <Comment key={r.id} comment={r} episodeId={episodeId} isOwner={isOwner} onJumpTo={onJumpTo} onPin={onPin} onDelete={onDelete} onReply={onReply} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function PodcastEpisodeComments({ episodeId, isOwner, currentTime, onJumpTo }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [atTimestamp, setAtTimestamp] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | top
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => { fetchComments(); }, [episodeId, sortBy]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/podcast/episode/${episodeId}/comments?sort=${sortBy}`, {
        headers: { ...(token() && { Authorization: `Bearer ${token()}` }) }
      });
      if (r.ok) {
        const d = await r.json();
        setComments(d.comments || []);
        setCount(d.total || 0);
      }
    } catch {}
    setLoading(false);
  };

  const submitComment = async () => {
    if (!text.trim()) return;
    if (!token()) { showToast.error("Log in to comment"); return; }
    try {
      const r = await fetch(`${BACKEND}/api/podcast/episode/${episodeId}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), timestamp_sec: atTimestamp ? Math.floor(currentTime || 0) : null }),
      });
      if (r.ok) {
        setText(""); setAtTimestamp(false);
        fetchComments();
        showToast.success("Comment posted!");
      } else showToast.error("Failed to post comment");
    } catch { showToast.error("Network error"); }
  };

  const replyToComment = async (commentId, replyText) => {
    if (!token()) return;
    await fetch(`${BACKEND}/api/podcast/episode/${episodeId}/comments/${commentId}/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: replyText }),
    }).catch(() => {});
    fetchComments();
  };

  const pinComment = async (commentId) => {
    await fetch(`${BACKEND}/api/podcast/episode/${episodeId}/comments/${commentId}/pin`, {
      method: "POST", headers: { Authorization: `Bearer ${token()}` }
    }).catch(() => {});
    fetchComments();
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    await fetch(`${BACKEND}/api/podcast/episode/${episodeId}/comments/${commentId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` }
    }).catch(() => {});
    fetchComments();
  };

  const S = {
    wrap: { fontFamily: "JetBrains Mono,monospace", fontSize: 11 },
    inp: { flex: 1, background: "#06060f", border: "1px solid #1a2a3a", borderRadius: 3, color: "#ccc", padding: "8px 10px", fontSize: 11, fontFamily: "JetBrains Mono,monospace" },
    btn: (col = "#00ffc8") => ({ padding: "6px 12px", border: `1px solid ${col}44`, borderRadius: 3, background: `${col}11`, color: col, cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit" }),
    sortBtn: (active) => ({ padding: "3px 8px", border: `1px solid ${active ? "#00ffc8" : "#1a2a3a"}`, borderRadius: 3, background: active ? "#00ffc822" : "transparent", color: active ? "#00ffc8" : "#5a7088", cursor: "pointer", fontSize: 9, fontFamily: "inherit" }),
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 700, color: "#ccc" }}>💬 {count} Comments</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["newest","Newest"],["oldest","Oldest"],["top","Top"]].map(([v,l]) => (
            <button key={v} style={S.sortBtn(sortBy===v)} onClick={() => setSortBy(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Comment form */}
      {token() ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input style={S.inp} placeholder="Leave a comment..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment()} />
            <button style={S.btn()} onClick={submitComment}>Post</button>
          </div>
          {currentTime != null && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 10, color: "#5a7088" }}>
              <input type="checkbox" checked={atTimestamp} onChange={e => setAtTimestamp(e.target.checked)} />
              Comment at current timestamp ({fmtTime(currentTime)})
            </label>
          )}
        </div>
      ) : (
        <div style={{ padding: 10, background: "#0a0a14", border: "1px solid #1a2a3a", borderRadius: 6, fontSize: 10, color: "#5a7088", marginBottom: 12 }}>
          <a href="/login" style={{ color: "#00ffc8" }}>Log in</a> to leave a comment
        </div>
      )}

      {/* Comments */}
      {loading ? (
        <div style={{ color: "#5a7088", fontSize: 10 }}>Loading comments...</div>
      ) : comments.length === 0 ? (
        <div style={{ color: "#5a7088", fontSize: 10, textAlign: "center", padding: 20 }}>
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        comments.map(c => (
          <Comment key={c.id} comment={c} episodeId={episodeId} isOwner={isOwner}
            onJumpTo={onJumpTo} onPin={pinComment} onDelete={deleteComment} onReply={replyToComment} />
        ))
      )}
    </div>
  );
}
