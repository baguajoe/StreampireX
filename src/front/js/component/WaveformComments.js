// =============================================================================
// WaveformComments.js — SoundCloud-Style Timed Comments
// =============================================================================
// Location: src/front/js/component/WaveformComments.js
//
// Features:
//  - Click waveform at any point to leave a timestamped comment
//  - Comments appear as colored dots on the waveform at their timestamp
//  - Hover dot → see comment preview
//  - Comments scroll alongside audio playback
//  - Reply threads (one level deep)
//  - Like / delete own comments
//  - Used on: track pages, beat store pages, podcast pages
//
// Usage:
//   <WaveformComments
//     audioUrl="https://..."
//     contentId={trackId}
//     contentType="track"  // "track" | "beat" | "podcast"
//     currentUser={user}
//   />
//
// Backend routes needed: see bottom of this file
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const COMMENT_COLORS = [
  '#00ffc8', '#ff6b35', '#7b61ff', '#fbbf24', '#f472b6',
  '#60a5fa', '#34d399', '#fb923c', '#a78bfa', '#e879f9',
];

const getUserColor = (userId) => COMMENT_COLORS[(userId || 0) % COMMENT_COLORS.length];

const formatTime = (s) => {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const WaveformComments = ({ audioUrl, contentId, contentType = 'track', currentUser }) => {
  const [comments, setComments]     = useState([]);
  const [duration, setDuration]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [pendingTimestamp, setPendingTimestamp] = useState(null);
  const [activeComment, setActiveComment] = useState(null);
  const [loading, setLoading]       = useState(true);

  const audioRef    = useRef(null);
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);

  // ── Load comments ──
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/comments/${contentType}/${contentId}`);
      if (res.ok) setComments(await res.json());
    } catch (e) {}
    setLoading(false);
  }, [contentId, contentType]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // ── Decode audio → waveform data ──
  useEffect(() => {
    if (!audioUrl) return;
    const decode = async () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const resp = await fetch(audioUrl);
        const buf  = await ctx.decodeAudioData(await resp.arrayBuffer());
        const data = buf.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(data.length / samples);
        const wf = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(data[i * blockSize + j]);
          }
          wf.push(sum / blockSize);
        }
        const max = Math.max(...wf);
        setWaveformData(wf.map(v => v / max));
        ctx.close();
      } catch (e) {
        // Fallback: random waveform if decode fails
        setWaveformData(Array.from({ length: 200 }, () => 0.2 + Math.random() * 0.8));
      }
    };
    decode();
  }, [audioUrl]);

  // ── Draw waveform ──
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const progress = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Waveform bars
    const barW = W / waveformData.length;
    waveformData.forEach((amp, i) => {
      const x = i * barW;
      const h = Math.max(2, amp * (H * 0.7));
      const y = (H - h) / 2;
      const isPlayed = (i / waveformData.length) <= progress;
      ctx.fillStyle = isPlayed ? '#00ffc8' : '#21262d';
      ctx.fillRect(x, y, barW - 1, h);
    });

    // Playhead
    if (progress > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(progress * W - 1, 0, 2, H);
    }

    // Comment markers
    comments.forEach(c => {
      if (!duration) return;
      const cx = (c.timestamp / duration) * W;
      const isActive = activeComment === c.id;
      const isHovered = hoveredComment === c.id;

      ctx.beginPath();
      ctx.arc(cx, H - 8, isActive || isHovered ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = getUserColor(c.user_id);
      ctx.fill();

      if (isActive || isHovered) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  }, [waveformData, currentTime, duration, comments, activeComment, hoveredComment]);

  useEffect(() => { drawWaveform(); }, [drawWaveform]);

  // ── Audio event handlers ──
  const onAudioTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);

    // Check if any comment is at current time (±0.5s)
    const match = comments.find(c => Math.abs(c.timestamp - audio.currentTime) < 0.5);
    if (match) setActiveComment(match.id);
  };

  const onAudioLoaded = () => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration);
  };

  // ── Click waveform ──
  const onWaveformClick = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const x      = e.clientX - rect.left;
    const ratio  = x / rect.width;
    const ts     = ratio * duration;

    // Seek audio
    if (audioRef.current) audioRef.current.currentTime = ts;
    setCurrentTime(ts);
    setPendingTimestamp(ts);
    setNewCommentText('');
  };

  // ── Check for hovered comment ──
  const onWaveformMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const W    = canvas.width;

    let found = null;
    comments.forEach(c => {
      const cx = (c.timestamp / duration) * W;
      if (Math.abs(cx - (x * W / rect.width)) < 10) found = c.id;
    });
    setHoveredComment(found);
  };

  // ── Submit comment ──
  const submitComment = async () => {
    if (!newCommentText.trim() || pendingTimestamp === null) return;
    if (!getToken()) { alert('Sign in to comment'); return; }

    const payload = {
      content_id: contentId,
      content_type: contentType,
      text: newCommentText.trim(),
      timestamp: pendingTimestamp,
      parent_id: replyingTo,
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/comments`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newC = await res.json();
        setComments(prev => [...prev, newC]);
        setNewCommentText('');
        setPendingTimestamp(null);
        setReplyingTo(null);
      }
    } catch (e) {}
  };

  const deleteComment = async (commentId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/comments/${commentId}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) {}
  };

  const likeComment = async (commentId) => {
    try {
      await fetch(`${BACKEND_URL}/api/comments/${commentId}/like`, { method: 'POST', headers: getHeaders() });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c));
    } catch (e) {}
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  // ── Top-level and reply comments ──
  const topComments = comments.filter(c => !c.parent_id).sort((a, b) => a.timestamp - b.timestamp);
  const getReplies = (id) => comments.filter(c => c.parent_id === id);

  const S = {
    wrap:    { background:'#161b22', border:'1px solid #30363d', borderRadius:10, overflow:'hidden', fontFamily:'JetBrains Mono, Inter, monospace', color:'#c9d1d9' },
    player:  { padding:'12px 16px', background:'#0d1117', display:'flex', alignItems:'center', gap:10 },
    playBtn: { width:36, height:36, borderRadius:'50%', background:'#00ffc8', border:'none', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
    time:    { fontSize:'0.75rem', color:'#5a7088', minWidth:40 },
    canvas:  { width:'100%', height:80, cursor:'crosshair', display:'block' },
    input:   { flex:1, background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'8px 12px', fontSize:'0.82rem', fontFamily:'inherit', outline:'none' },
    btnTeal: { background:'#00ffc8', color:'#000', border:'none', borderRadius:5, padding:'7px 14px', fontWeight:700, cursor:'pointer', fontSize:'0.78rem', flexShrink:0 },
    btnGray: { background:'none', color:'#5a7088', border:'none', cursor:'pointer', fontSize:'0.72rem', padding:'2px 6px' },
    cmt:     { padding:'10px 16px', borderBottom:'1px solid #21262d', display:'flex', gap:10, alignItems:'flex-start' },
    avatar:  (color) => ({ width:28, height:28, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, color:'#000', flexShrink:0 }),
    ts:      { background:'#21262d', borderRadius:4, padding:'1px 6px', fontSize:'0.65rem', color:'#00ffc8', cursor:'pointer' },
  };

  return (
    <div style={S.wrap}>
      {/* Hidden audio */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={onAudioTimeUpdate}
        onLoadedMetadata={onAudioLoaded}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Waveform + player controls */}
      <div style={S.player}>
        <button style={S.playBtn} onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
        <span style={S.time}>{formatTime(currentTime)}</span>
        <div style={{ flex:1, position:'relative' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={80}
            style={S.canvas}
            onClick={onWaveformClick}
            onMouseMove={onWaveformMouseMove}
            onMouseLeave={() => setHoveredComment(null)}
          />
          {/* Hovered comment tooltip */}
          {hoveredComment && (() => {
            const c = comments.find(x => x.id === hoveredComment);
            if (!c) return null;
            const leftPct = duration ? (c.timestamp / duration) * 100 : 0;
            return (
              <div style={{ position:'absolute', bottom:'100%', left:`${leftPct}%`, transform:'translateX(-50%)', background:'#161b22', border:`1px solid ${getUserColor(c.user_id)}`, borderRadius:6, padding:'5px 10px', fontSize:'0.72rem', whiteSpace:'nowrap', pointerEvents:'none', zIndex:10 }}>
                <span style={{ color: getUserColor(c.user_id), fontWeight:700 }}>{c.username}</span>
                {' at '}<span style={{ color:'#00ffc8' }}>{formatTime(c.timestamp)}</span>
                <div style={{ color:'#c9d1d9', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis' }}>{c.text}</div>
              </div>
            );
          })()}
        </div>
        <span style={S.time}>{formatTime(duration)}</span>
      </div>

      {/* Comment input */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid #30363d', display:'flex', gap:8, alignItems:'center', background:'#161b22' }}>
        {pendingTimestamp !== null ? (
          <>
            <span style={{ ...S.ts, flexShrink:0 }}>@ {formatTime(pendingTimestamp)}</span>
            <input
              style={S.input}
              placeholder="Add a comment..."
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              autoFocus
            />
            <button style={S.btnTeal} onClick={submitComment}>Post</button>
            <button style={S.btnGray} onClick={() => setPendingTimestamp(null)}>✕</button>
          </>
        ) : (
          <span style={{ color:'#5a7088', fontSize:'0.78rem' }}>
            💬 Click the waveform to leave a comment at that moment
          </span>
        )}
      </div>

      {/* Comments list */}
      <div style={{ maxHeight:300, overflowY:'auto' }}>
        {loading && <div style={{ textAlign:'center', padding:20, color:'#5a7088' }}>Loading comments...</div>}
        {!loading && topComments.length === 0 && (
          <div style={{ textAlign:'center', padding:24, color:'#5a7088', fontSize:'0.82rem' }}>
            No comments yet. Be the first!
          </div>
        )}
        {topComments.map(c => (
          <React.Fragment key={c.id}>
            <div style={{ ...S.cmt, background: activeComment === c.id ? 'rgba(0,255,200,0.05)' : 'transparent' }}>
              <div style={S.avatar(getUserColor(c.user_id))}>{c.username?.[0]?.toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
                  <span style={{ fontWeight:700, color:'#e6edf3', fontSize:'0.82rem' }}>{c.username}</span>
                  <span style={S.ts} onClick={() => { if (audioRef.current) { audioRef.current.currentTime = c.timestamp; setCurrentTime(c.timestamp); } }}>
                    {formatTime(c.timestamp)}
                  </span>
                </div>
                <div style={{ fontSize:'0.82rem', color:'#c9d1d9', lineHeight:1.5 }}>{c.text}</div>
                <div style={{ display:'flex', gap:4, marginTop:5 }}>
                  <button style={S.btnGray} onClick={() => likeComment(c.id)}>❤️ {c.likes || 0}</button>
                  <button style={S.btnGray} onClick={() => { setReplyingTo(c.id); setPendingTimestamp(c.timestamp); setNewCommentText(''); }}>Reply</button>
                  {currentUser?.id === c.user_id && <button style={{ ...S.btnGray, color:'#ff3b30' }} onClick={() => deleteComment(c.id)}>Delete</button>}
                </div>
                {/* Replies */}
                {getReplies(c.id).map(r => (
                  <div key={r.id} style={{ display:'flex', gap:8, marginTop:8, paddingLeft:8, borderLeft:`2px solid ${getUserColor(r.user_id)}` }}>
                    <div style={{ ...S.avatar(getUserColor(r.user_id)), width:22, height:22, fontSize:'0.6rem' }}>{r.username?.[0]?.toUpperCase()}</div>
                    <div>
                      <span style={{ fontWeight:700, color:'#e6edf3', fontSize:'0.75rem' }}>{r.username}</span>
                      <div style={{ fontSize:'0.78rem', color:'#c9d1d9', marginTop:2 }}>{r.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WaveformComments;

// =============================================================================
// BACKEND ROUTES — Add to existing routes or new file src/api/comment_routes.py
// =============================================================================
/*
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from .models import db, User, Comment
from datetime import datetime

comment_bp = Blueprint('comments', __name__)

@comment_bp.route('/api/comments/<content_type>/<int:content_id>', methods=['GET'])
def get_comments(content_type, content_id):
    comments = Comment.query.filter_by(
        content_type=content_type, content_id=content_id
    ).order_by(Comment.timestamp.asc()).all()
    result = []
    for c in comments:
        user = User.query.get(c.user_id)
        d = c.serialize()
        d['username'] = user.username if user else 'Unknown'
        d['avatar'] = user.profile_picture if user else None
        result.append(d)
    return jsonify(result), 200

@comment_bp.route('/api/comments', methods=['POST'])
@jwt_required()
def post_comment():
    user_id = get_jwt_identity()
    data = request.get_json()
    c = Comment(
        user_id=user_id,
        content_id=data['content_id'],
        content_type=data['content_type'],
        text=data['text'],
        timestamp=data.get('timestamp', 0),
        parent_id=data.get('parent_id'),
        created_at=datetime.utcnow(),
    )
    db.session.add(c); db.session.commit()
    user = User.query.get(user_id)
    result = c.serialize()
    result['username'] = user.username
    return jsonify(result), 201

@comment_bp.route('/api/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = get_jwt_identity()
    c = Comment.query.filter_by(id=comment_id, user_id=user_id).first_or_404()
    db.session.delete(c); db.session.commit()
    return jsonify({'deleted': True}), 200

@comment_bp.route('/api/comments/<int:comment_id>/like', methods=['POST'])
@jwt_required()
def like_comment(comment_id):
    c = Comment.query.get_or_404(comment_id)
    c.likes = (c.likes or 0) + 1
    db.session.commit()
    return jsonify({'likes': c.likes}), 200

# Add to Comment model (models.py) — these columns may be missing:
# parent_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=True)
# likes = db.Column(db.Integer, default=0)
# Add to Comment.serialize():
# 'parent_id': self.parent_id, 'likes': self.likes or 0
*/