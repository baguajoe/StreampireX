/**
 * SPXCollabBar.js
 * Collaboration UI component for SPX Script
 * - Live presence avatars with color rings
 * - Comments panel (inline, threaded, resolvable)
 * - Share / invite modal
 * - Connection status indicator
 */

import React, { useState } from "react";

export default function SPXCollabBar({
  connected,
  collaborators,
  comments,
  onAddComment,
  onReplyToComment,
  onResolveComment,
  onDeleteComment,
  currentUserId,
  currentUserName,
  scriptTitle,
}) {
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("editor");
  const [copied, setCopied] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [filterResolved, setFilterResolved] = useState(false);

  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const visibleComments = filterResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  const copyShareLink = () => {
    const link = `${window.location.origin}/spx-script?share=${btoa(window.location.pathname)}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleInvite = () => {
    if (!shareEmail.trim()) return;
    // Wire to: POST /api/script/invite { email, role, scriptId }
    alert(`Invite sent to ${shareEmail} as ${shareRole} — wire to /api/script/invite`);
    setShareEmail("");
  };

  const submitReply = (commentId) => {
    if (!replyText.trim()) return;
    onReplyToComment(commentId, replyText);
    setReplyText("");
    setReplyingTo(null);
  };

  return (
    <>
      {/* COLLAB BAR — sits in topbar */}
      <div className="spx-collab-bar">
        {/* Connection dot */}
        <div className={`spx-collab-status ${connected ? "online" : "offline"}`} title={connected ? "Live" : "Reconnecting..."} />

        {/* Presence avatars */}
        <div className="spx-collab-avatars">
          {collaborators.slice(0, 5).map((c) => (
            <div
              key={c.userId}
              className="spx-collab-avatar"
              style={{ borderColor: c.color, background: hexToRgba(c.color, 0.15) }}
              title={c.userName}
            >
              {c.userName.slice(0, 2).toUpperCase()}
            </div>
          ))}
          {collaborators.length > 5 && (
            <div className="spx-collab-avatar-overflow">+{collaborators.length - 5}</div>
          )}
          {collaborators.length === 0 && (
            <span className="spx-collab-solo">Only you</span>
          )}
        </div>

        {/* Comments button */}
        <button
          className={`spx-collab-btn ${showComments ? "active" : ""}`}
          onClick={() => { setShowComments(!showComments); setShowShare(false); }}
          title="Comments"
        >
          ✎ {unresolvedCount > 0 && <span className="spx-collab-badge">{unresolvedCount}</span>}
        </button>

        {/* Share button */}
        <button
          className="spx-collab-btn accent"
          onClick={() => { setShowShare(!showShare); setShowComments(false); }}
          title="Share"
        >
          ↑ SHARE
        </button>
      </div>

      {/* COMMENTS PANEL */}
      {showComments && (
        <div className="spx-comments-panel">
          <div className="spx-comments-header">
            <span className="spx-comments-title">COMMENTS</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className={`spx-comments-filter ${filterResolved ? "active" : ""}`}
                onClick={() => setFilterResolved(!filterResolved)}
              >
                {filterResolved ? "All" : "Open only"}
              </button>
              <button className="spx-comments-close" onClick={() => setShowComments(false)}>✕</button>
            </div>
          </div>

          <div className="spx-comments-list">
            {visibleComments.length === 0 && (
              <div className="spx-comments-empty">
                No {filterResolved ? "" : "open "}comments yet.<br />
                <span style={{ fontSize: 11, color: "#5a5a7a" }}>Select text in the script and click Add Comment.</span>
              </div>
            )}
            {visibleComments.map((comment) => (
              <div key={comment.id} className={`spx-comment ${comment.resolved ? "resolved" : ""}`}>
                <div className="spx-comment-header">
                  <div
                    className="spx-comment-avatar"
                    style={{ borderColor: comment.color, background: hexToRgba(comment.color, 0.15) }}
                  >
                    {comment.userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="spx-comment-author">{comment.userName}</div>
                    <div className="spx-comment-time">{formatTime(comment.createdAt)}</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    {!comment.resolved && (
                      <button
                        className="spx-comment-action"
                        onClick={() => onResolveComment(comment.id)}
                        title="Resolve"
                      >✓</button>
                    )}
                    {(comment.userId === currentUserId || !comment.userId) && (
                      <button
                        className="spx-comment-action danger"
                        onClick={() => onDeleteComment(comment.id)}
                        title="Delete"
                      >✕</button>
                    )}
                  </div>
                </div>

                {comment.selectedText && (
                  <div className="spx-comment-quote">"{comment.selectedText}"</div>
                )}
                <div className="spx-comment-text">{comment.text}</div>

                {/* Replies */}
                {comment.replies?.map((reply) => (
                  <div key={reply.id} className="spx-comment-reply">
                    <div
                      className="spx-comment-avatar sm"
                      style={{ borderColor: reply.color, background: hexToRgba(reply.color, 0.15) }}
                    >
                      {reply.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="spx-comment-author" style={{ fontSize: 10 }}>{reply.userName}</div>
                      <div className="spx-comment-text" style={{ fontSize: 11 }}>{reply.text}</div>
                    </div>
                  </div>
                ))}

                {/* Reply input */}
                {!comment.resolved && (
                  replyingTo === comment.id ? (
                    <div className="spx-comment-reply-input">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitReply(comment.id);
                          if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); }
                        }}
                      />
                      <button onClick={() => submitReply(comment.id)}>Send</button>
                      <button onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="spx-comment-reply-btn"
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      Reply
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShare && (
        <div className="spx-share-modal">
          <div className="spx-share-header">
            <span className="spx-share-title">SHARE "{scriptTitle}"</span>
            <button className="spx-comments-close" onClick={() => setShowShare(false)}>✕</button>
          </div>

          <div className="spx-share-section">
            <label className="spx-share-label">Invite by email</label>
            <div className="spx-share-invite-row">
              <input
                type="email"
                className="spx-share-input"
                placeholder="collaborator@email.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <select
                className="spx-share-role"
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value)}
              >
                <option value="editor">Can edit</option>
                <option value="commenter">Can comment</option>
                <option value="viewer">Can view</option>
              </select>
              <button className="spx-share-invite-btn" onClick={handleInvite}>Invite</button>
            </div>
          </div>

          <div className="spx-share-section">
            <label className="spx-share-label">Share link</label>
            <div className="spx-share-link-row">
              <div className="spx-share-link-preview">
                {window.location.origin}/spx-script?share=...
              </div>
              <button className="spx-share-copy-btn" onClick={copyShareLink}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {collaborators.length > 0 && (
            <div className="spx-share-section">
              <label className="spx-share-label">Currently editing</label>
              <div className="spx-share-collaborators">
                {collaborators.map((c) => (
                  <div key={c.userId} className="spx-share-collab-row">
                    <div
                      className="spx-comment-avatar"
                      style={{ borderColor: c.color, background: hexToRgba(c.color, 0.15) }}
                    >
                      {c.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="spx-share-collab-name">{c.userName}</span>
                    <span className="spx-share-collab-status">Live</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
