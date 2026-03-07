// =============================================================================
// VideoSeriesBuilder.js — Course / Series Builder for StreamPireX
// =============================================================================
// Location: src/front/js/pages/VideoSeriesBuilder.js
// Route: /video-series/new  and  /video-series/:id/edit
//
// Features:
//  - Create a named series (course, documentary series, tutorial playlist)
//  - Drag-and-drop episode ordering
//  - Per-episode: title, description, preview thumbnail, free/paid, price
//  - Series-level pricing: FREE, ONE-TIME purchase, SUBSCRIPTION gated
//  - Publish / Draft state
//  - Embeds into CreatorDashboard under a "Series" tab
//  - Stripe checkout for series purchase
//  - Fans see locked episodes with unlock prompt
//
// Backend routes needed: see bottom of file
// =============================================================================

import React, { useState, useCallback, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const ACCESS_TYPES = [
  { id: 'free',         label: '🆓 Free',          desc: 'Anyone can watch' },
  { id: 'paid_once',   label: '💳 One-Time Buy',   desc: 'Pay once, access forever' },
  { id: 'fan_sub',     label: '🌟 Fan Members',    desc: 'Requires fan membership' },
  { id: 'platform_sub',label: '👑 Paid Plan Only', desc: 'Starter+ subscribers only' },
];

const SERIES_CATEGORIES = [
  'Tutorial / How-To', 'Music Production', 'Beat Making', 'Music Theory',
  'Mixing & Mastering', 'Podcast Series', 'Vlog', 'Documentary',
  'Film / Short Series', 'Comedy', 'Gaming', 'Fitness', 'Cooking', 'Other',
];

// ── Drag state for episode reordering ──
let dragSrcIdx = null;

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const VideoSeriesBuilder = ({ existingSeries = null, onSaved }) => {
  const [series, setSeries] = useState(existingSeries || {
    title: '',
    description: '',
    category: 'Tutorial / How-To',
    thumbnail_url: '',
    access_type: 'free',
    price: 0,
    is_published: false,
    episodes: [],
  });

  const [saving, setSaving]         = useState(false);
  const [status, setStatus]         = useState('');
  const [activeEp, setActiveEp]     = useState(null); // index of episode being edited
  const [showPreview, setShowPreview] = useState(false);
  const thumbInputRef               = useRef(null);
  const epThumbInputRef             = useRef(null);

  const updateSeries = (changes) => setSeries(prev => ({ ...prev, ...changes }));

  // ── Episodes ──
  const addEpisode = () => {
    const ep = {
      id: `ep_${Date.now()}`,
      episode_number: series.episodes.length + 1,
      title: `Episode ${series.episodes.length + 1}`,
      description: '',
      video_url: '',
      thumbnail_url: '',
      duration_seconds: 0,
      is_free_preview: series.episodes.length === 0, // first ep is free preview
      is_published: false,
    };
    setSeries(prev => ({ ...prev, episodes: [...prev.episodes, ep] }));
    setActiveEp(series.episodes.length);
  };

  const updateEpisode = (idx, changes) => {
    setSeries(prev => ({
      ...prev,
      episodes: prev.episodes.map((ep, i) => i === idx ? { ...ep, ...changes } : ep),
    }));
  };

  const removeEpisode = (idx) => {
    setSeries(prev => ({
      ...prev,
      episodes: prev.episodes.filter((_, i) => i !== idx)
        .map((ep, i) => ({ ...ep, episode_number: i + 1 })),
    }));
    if (activeEp === idx) setActiveEp(null);
  };

  // ── Drag reorder ──
  const onDragStart = (idx) => { dragSrcIdx = idx; };
  const onDragOver  = (e)   => { e.preventDefault(); };
  const onDrop      = (idx) => {
    if (dragSrcIdx === null || dragSrcIdx === idx) return;
    const eps = [...series.episodes];
    const [moved] = eps.splice(dragSrcIdx, 1);
    eps.splice(idx, 0, moved);
    const renumbered = eps.map((ep, i) => ({ ...ep, episode_number: i + 1 }));
    setSeries(prev => ({ ...prev, episodes: renumbered }));
    dragSrcIdx = null;
  };

  // ── Upload thumbnail ──
  const uploadThumbnail = async (file, forEpisodeIdx = null) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'thumbnail');
    try {
      const res = await fetch(`${BACKEND_URL}/api/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        if (forEpisodeIdx !== null) updateEpisode(forEpisodeIdx, { thumbnail_url: data.url });
        else updateSeries({ thumbnail_url: data.url });
      }
    } catch (e) {
      setStatus('⚠ Upload failed');
    }
  };

  // ── Save series ──
  const saveSeries = async (publish = false) => {
    if (!series.title.trim()) { setStatus('⚠ Series title is required'); return; }
    if (series.episodes.length === 0) { setStatus('⚠ Add at least one episode'); return; }

    setSaving(true);
    const payload = { ...series, is_published: publish };

    try {
      const url    = series.id ? `${BACKEND_URL}/api/series/${series.id}` : `${BACKEND_URL}/api/series`;
      const method = series.id ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setSeries(prev => ({ ...prev, id: data.id || prev.id, is_published: publish }));
      setStatus(publish ? '✅ Series published!' : '✅ Draft saved');
      onSaved?.(data);
    } catch (e) {
      setStatus(`⚠ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Format duration ──
  const fmtDuration = (s) => {
    if (!s) return '–';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const totalDuration = series.episodes.reduce((acc, ep) => acc + (ep.duration_seconds || 0), 0);
  const accessLabel   = ACCESS_TYPES.find(a => a.id === series.access_type)?.label || 'Free';

  // ── Styles ──
  const S = {
    page:     { minHeight:'100vh', background:'#0d1117', color:'#c9d1d9', fontFamily:'JetBrains Mono, Inter, monospace', padding:'24px 32px', maxWidth:1100, margin:'0 auto' },
    header:   { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
    title:    { fontSize:'1.4rem', fontWeight:700, color:'#e6edf3' },
    card:     { background:'#161b22', border:'1px solid #30363d', borderRadius:8, padding:20, marginBottom:16 },
    label:    { display:'block', fontSize:'0.72rem', color:'#8b949e', marginBottom:4, fontWeight:600 },
    input:    { width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'8px 12px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
    textarea: { width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'8px 12px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box', minHeight:80, resize:'vertical' },
    select:   { background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'8px 12px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none' },
    btnTeal:  { background:'#00ffc8', color:'#000', border:'none', borderRadius:6, padding:'8px 18px', fontWeight:700, cursor:'pointer', fontSize:'0.85rem' },
    btnGray:  { background:'#21262d', color:'#c9d1d9', border:'1px solid #30363d', borderRadius:6, padding:'8px 18px', fontWeight:600, cursor:'pointer', fontSize:'0.85rem' },
    btnRed:   { background:'transparent', color:'#ff3b30', border:'1px solid #ff3b30', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:'0.72rem' },
    row:      { display:'flex', gap:16, alignItems:'flex-start' },
    epRow:    { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#21262d', borderRadius:6, marginBottom:6, cursor:'grab', border:'1px solid transparent', transition:'border 0.15s' },
    grid2:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
    status:   { color: status.startsWith('⚠') ? '#ff9500' : '#00ffc8', fontSize:'0.8rem', marginLeft:12 },
    badge:    { borderRadius:4, padding:'2px 8px', fontSize:'0.65rem', fontWeight:700 },
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>📺 {series.id ? 'Edit' : 'New'} Video Series</div>
          <div style={{ fontSize:'0.75rem', color:'#5a7088', marginTop:2 }}>
            {series.episodes.length} episodes · {Math.round(totalDuration / 60)} min total · {accessLabel}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={S.status}>{status}</span>
          <button style={S.btnGray} onClick={() => saveSeries(false)} disabled={saving}>
            {saving ? '...' : '💾 Save Draft'}
          </button>
          <button style={S.btnTeal} onClick={() => saveSeries(true)} disabled={saving}>
            {saving ? '...' : series.is_published ? '🔄 Update' : '🚀 Publish'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20 }}>
        {/* LEFT — Series details */}
        <div>
          {/* Basic info */}
          <div style={S.card}>
            <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:14 }}>Series Info</div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>Series Title *</label>
              <input style={S.input} value={series.title} onChange={e => updateSeries({ title: e.target.value })} placeholder="e.g. Beginner Beat Making Masterclass" />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>Description</label>
              <textarea style={S.textarea} value={series.description} onChange={e => updateSeries({ description: e.target.value })} placeholder="What will viewers learn or experience?" />
            </div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Category</label>
                <select style={{ ...S.select, width:'100%' }} value={series.category} onChange={e => updateSeries({ category: e.target.value })}>
                  {SERIES_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Cover Thumbnail</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {series.thumbnail_url && <img src={series.thumbnail_url} alt="" style={{ width:40, height:28, objectFit:'cover', borderRadius:4 }} />}
                  <button style={S.btnGray} onClick={() => thumbInputRef.current?.click()}>📷 Upload</button>
                  <input ref={thumbInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => e.target.files[0] && uploadThumbnail(e.target.files[0])} />
                </div>
              </div>
            </div>
          </div>

          {/* Access & Pricing */}
          <div style={S.card}>
            <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:14 }}>Access & Pricing</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:16 }}>
              {ACCESS_TYPES.map(a => (
                <div key={a.id}
                  onClick={() => updateSeries({ access_type: a.id })}
                  style={{
                    padding:'10px 12px', borderRadius:6, cursor:'pointer', textAlign:'center',
                    background: series.access_type === a.id ? 'rgba(0,255,200,0.1)' : '#21262d',
                    border: `2px solid ${series.access_type === a.id ? '#00ffc8' : '#30363d'}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize:'0.9rem', marginBottom:4 }}>{a.label.split(' ')[0]}</div>
                  <div style={{ fontSize:'0.72rem', fontWeight:700, color: series.access_type === a.id ? '#00ffc8' : '#c9d1d9' }}>{a.label.slice(a.label.indexOf(' ') + 1)}</div>
                  <div style={{ fontSize:'0.6rem', color:'#5a7088', marginTop:2 }}>{a.desc}</div>
                </div>
              ))}
            </div>
            {series.access_type === 'paid_once' && (
              <div style={{ maxWidth:200 }}>
                <label style={S.label}>Series Price (USD)</label>
                <input type="number" style={S.input} min={0.99} step={0.01} value={series.price}
                  onChange={e => updateSeries({ price: parseFloat(e.target.value) || 0 })}
                  placeholder="9.99" />
                <div style={{ fontSize:'0.65rem', color:'#5a7088', marginTop:4 }}>
                  You earn ${((series.price || 0) * 0.9).toFixed(2)} (90%) per purchase
                </div>
              </div>
            )}
          </div>

          {/* Episodes */}
          <div style={S.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontWeight:700, color:'#e6edf3' }}>Episodes ({series.episodes.length})</div>
              <button style={S.btnTeal} onClick={addEpisode}>+ Add Episode</button>
            </div>

            {series.episodes.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#5a7088' }}>
                No episodes yet. Click "+ Add Episode" to get started.
              </div>
            )}

            {series.episodes.map((ep, idx) => (
              <div key={ep.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(idx)}
                style={{ ...S.epRow, border: activeEp === idx ? '1px solid #00ffc8' : '1px solid transparent' }}
                onClick={() => setActiveEp(activeEp === idx ? null : idx)}
              >
                {/* Drag handle */}
                <span style={{ color:'#5a7088', cursor:'grab', userSelect:'none' }}>⠿</span>
                {/* Episode number */}
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#30363d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, flexShrink:0 }}>
                  {ep.episode_number}
                </div>
                {/* Thumbnail */}
                {ep.thumbnail_url
                  ? <img src={ep.thumbnail_url} alt="" style={{ width:48, height:32, objectFit:'cover', borderRadius:4, flexShrink:0 }} />
                  : <div style={{ width:48, height:32, background:'#30363d', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:'#5a7088', flexShrink:0 }}>🎬</div>
                }
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, color:'#e6edf3', fontSize:'0.82rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ep.title}</div>
                  <div style={{ fontSize:'0.65rem', color:'#5a7088' }}>
                    {fmtDuration(ep.duration_seconds)}
                    {ep.is_free_preview && <span style={{ ...S.badge, background:'rgba(0,255,200,0.15)', color:'#00ffc8', marginLeft:6 }}>FREE PREVIEW</span>}
                    {!ep.is_published && <span style={{ ...S.badge, background:'rgba(255,153,0,0.15)', color:'#ff9500', marginLeft:6 }}>DRAFT</span>}
                  </div>
                </div>
                <button style={S.btnRed} onClick={e => { e.stopPropagation(); removeEpisode(idx); }}>✕</button>
              </div>
            ))}

            {/* Episode editor */}
            {activeEp !== null && series.episodes[activeEp] && (
              <div style={{ marginTop:16, padding:16, background:'#0d1117', borderRadius:8, border:'1px solid #00ffc8' }}>
                <div style={{ fontWeight:700, color:'#00ffc8', marginBottom:12, fontSize:'0.82rem' }}>
                  ✏️ Editing Episode {series.episodes[activeEp].episode_number}
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={S.label}>Episode Title</label>
                  <input style={S.input} value={series.episodes[activeEp].title}
                    onChange={e => updateEpisode(activeEp, { title: e.target.value })} />
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={S.label}>Description</label>
                  <textarea style={{ ...S.textarea, minHeight:60 }} value={series.episodes[activeEp].description}
                    onChange={e => updateEpisode(activeEp, { description: e.target.value })} />
                </div>
                <div style={S.grid2}>
                  <div>
                    <label style={S.label}>Video URL (R2 / Cloudinary)</label>
                    <input style={S.input} value={series.episodes[activeEp].video_url}
                      onChange={e => updateEpisode(activeEp, { video_url: e.target.value })}
                      placeholder="https://..." />
                  </div>
                  <div>
                    <label style={S.label}>Duration (seconds)</label>
                    <input type="number" style={S.input} value={series.episodes[activeEp].duration_seconds}
                      onChange={e => updateEpisode(activeEp, { duration_seconds: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:16, marginTop:10 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.78rem' }}>
                    <input type="checkbox" checked={series.episodes[activeEp].is_free_preview}
                      onChange={e => updateEpisode(activeEp, { is_free_preview: e.target.checked })} />
                    Free Preview (visible without purchase)
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.78rem' }}>
                    <input type="checkbox" checked={series.episodes[activeEp].is_published}
                      onChange={e => updateEpisode(activeEp, { is_published: e.target.checked })} />
                    Published
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Preview card */}
        <div>
          <div style={{ ...S.card, position:'sticky', top:20 }}>
            <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:12 }}>Preview Card</div>
            <div style={{ background:'#21262d', borderRadius:8, overflow:'hidden' }}>
              {series.thumbnail_url
                ? <img src={series.thumbnail_url} alt="" style={{ width:'100%', height:160, objectFit:'cover' }} />
                : <div style={{ width:'100%', height:160, background:'#30363d', display:'flex', alignItems:'center', justifyContent:'center', color:'#5a7088', fontSize:'2rem' }}>📺</div>
              }
              <div style={{ padding:'12px 14px' }}>
                <div style={{ fontWeight:700, color:'#e6edf3', marginBottom:4 }}>{series.title || 'Series Title'}</div>
                <div style={{ fontSize:'0.72rem', color:'#8b949e', marginBottom:8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                  {series.description || 'Series description...'}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'#5a7088' }}>
                  <span>{series.episodes.length} episodes</span>
                  <span>{Math.round(totalDuration / 60)} min</span>
                </div>
                <div style={{ marginTop:10 }}>
                  {series.access_type === 'free' && (
                    <div style={{ ...S.badge, background:'rgba(0,255,200,0.15)', color:'#00ffc8', display:'inline-block' }}>FREE</div>
                  )}
                  {series.access_type === 'paid_once' && (
                    <div style={{ ...S.badge, background:'rgba(255,153,0,0.15)', color:'#ff9500', display:'inline-block', fontSize:'0.8rem' }}>
                      ${series.price}
                    </div>
                  )}
                  {series.access_type === 'fan_sub' && (
                    <div style={{ ...S.badge, background:'rgba(123,97,255,0.2)', color:'#7b61ff', display:'inline-block' }}>FAN MEMBERS</div>
                  )}
                  {series.access_type === 'platform_sub' && (
                    <div style={{ ...S.badge, background:'rgba(255,59,48,0.15)', color:'#ff3b30', display:'inline-block' }}>PAID PLAN</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop:14, fontSize:'0.72rem', color:'#5a7088' }}>
              <div style={{ marginBottom:4 }}>Category: <span style={{ color:'#c9d1d9' }}>{series.category}</span></div>
              {series.access_type === 'paid_once' && (
                <div style={{ marginBottom:4 }}>
                  Your earnings: <span style={{ color:'#00ffc8' }}>${((series.price || 0) * 0.9).toFixed(2)}</span> per sale
                </div>
              )}
              <div>Status: <span style={{ color: series.is_published ? '#00ffc8' : '#ff9500' }}>{series.is_published ? '✅ Published' : '⏳ Draft'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSeriesBuilder;

// =============================================================================
// BACKEND ROUTES (add to src/api/series_routes.py)
// =============================================================================
/*
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, User
import json, uuid
from datetime import datetime

series_bp = Blueprint('series', __name__)

class VideoSeries(db.Model):
    __tablename__ = 'video_series'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    thumbnail_url = db.Column(db.String(500))
    access_type = db.Column(db.String(50), default='free')  # free|paid_once|fan_sub|platform_sub
    price = db.Column(db.Float, default=0)
    is_published = db.Column(db.Boolean, default=False)
    episodes_json = db.Column(db.Text, default='[]')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def serialize(self):
        return {
            'id': self.id, 'creator_id': self.creator_id, 'title': self.title,
            'description': self.description, 'category': self.category,
            'thumbnail_url': self.thumbnail_url, 'access_type': self.access_type,
            'price': self.price, 'is_published': self.is_published,
            'episodes': json.loads(self.episodes_json or '[]'),
            'created_at': self.created_at.isoformat(),
        }

@series_bp.route('/api/series', methods=['GET'])
@jwt_required()
def get_my_series():
    user_id = get_jwt_identity()
    series = VideoSeries.query.filter_by(creator_id=user_id).order_by(VideoSeries.updated_at.desc()).all()
    return jsonify([s.serialize() for s in series]), 200

@series_bp.route('/api/series', methods=['POST'])
@jwt_required()
def create_series():
    user_id = get_jwt_identity()
    data = request.get_json()
    s = VideoSeries(
        creator_id=user_id, title=data['title'],
        description=data.get('description', ''), category=data.get('category', ''),
        thumbnail_url=data.get('thumbnail_url', ''),
        access_type=data.get('access_type', 'free'), price=data.get('price', 0),
        is_published=data.get('is_published', False),
        episodes_json=json.dumps(data.get('episodes', [])),
    )
    db.session.add(s); db.session.commit()
    return jsonify(s.serialize()), 201

@series_bp.route('/api/series/<series_id>', methods=['PUT'])
@jwt_required()
def update_series(series_id):
    user_id = get_jwt_identity()
    s = VideoSeries.query.filter_by(id=series_id, creator_id=user_id).first_or_404()
    data = request.get_json()
    for field in ['title', 'description', 'category', 'thumbnail_url', 'access_type', 'price', 'is_published']:
        if field in data: setattr(s, field, data[field])
    if 'episodes' in data: s.episodes_json = json.dumps(data['episodes'])
    db.session.commit()
    return jsonify(s.serialize()), 200

@series_bp.route('/api/series/public/<creator_id>', methods=['GET'])
def get_creator_series(creator_id):
    series = VideoSeries.query.filter_by(creator_id=creator_id, is_published=True).all()
    return jsonify([s.serialize() for s in series]), 200
*/