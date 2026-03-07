// =============================================================================
// CollabRequests.js — Collaboration Request System
// =============================================================================
// Location: src/front/js/pages/CollabRequests.js
//
// Routes:
//   /collaborate          → Browse creators open to collab + send requests
//   /collaborate/inbox    → Manage incoming requests
//
// Features:
//  - Post "open to collab" listing (project type, budget, description)
//  - Browse other creators' listings with filters
//  - Send collab requests with message + budget offer
//  - Accept / decline / counter incoming requests
//  - Status tracking: pending → accepted / declined / countered
//  - Notification badge on inbox
//  - Links to Messaging once accepted
//  - Backend model + routes included as comments at bottom
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const PROJECT_TYPES = [
  'Beat Production', 'Featured Verse', 'Hook/Chorus', 'Mix & Master',
  'Music Video', 'Podcast Episode', 'Live Performance', 'Songwriting',
  'Photography/Art', 'Social Media Content', 'Other'
];

const GENRES = [
  'Hip-Hop', 'R&B', 'Trap', 'Pop', 'Afrobeats', 'Drill', 'Electronic',
  'House', 'Gospel', 'Jazz', 'Lo-Fi', 'Reggaeton', 'Dancehall', 'Other'
];

// ─────────────────────────────────────────────────────────────────────────────
// BROWSE & SEND REQUESTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const CollabBrowsePage = ({ currentUser }) => {
  const [listings, setListings]     = useState([]);
  const [myListing, setMyListing]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ type: '', genre: '', budget_min: '', paid_only: false });
  const [showListingForm, setShowListingForm] = useState(false);
  const [sendingTo, setSendingTo]   = useState(null); // userId
  const [status, setStatus]         = useState('');

  const [listingForm, setListingForm] = useState({
    project_type: 'Beat Production',
    genre: 'Hip-Hop',
    description: '',
    budget_min: 0,
    budget_max: 0,
    is_paid: false,
    skills_needed: '',
    deadline: '',
  });

  const [requestForm, setRequestForm] = useState({
    message: '',
    budget_offer: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.genre) params.set('genre', filters.genre);
    if (filters.budget_min) params.set('budget_min', filters.budget_min);
    if (filters.paid_only) params.set('paid_only', '1');
    try {
      const [listRes, myRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/collab/listings?${params}`, { headers: getHeaders() }),
        fetch(`${BACKEND_URL}/api/collab/my-listing`, { headers: getHeaders() }),
      ]);
      if (listRes.ok) setListings(await listRes.json());
      if (myRes.ok) { const d = await myRes.json(); setMyListing(d.listing || null); }
    } catch (e) {}
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const saveListing = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/collab/listing`, {
        method: myListing ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(listingForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus('✅ Listing saved!');
      setShowListingForm(false);
      load();
    } catch (e) { setStatus(`⚠ ${e.message}`); }
  };

  const deleteListing = async () => {
    if (!window.confirm('Remove your listing?')) return;
    await fetch(`${BACKEND_URL}/api/collab/listing`, { method: 'DELETE', headers: getHeaders() });
    setMyListing(null);
    setStatus('Listing removed');
    load();
  };

  const sendRequest = async (toUserId) => {
    if (!requestForm.message.trim()) { setStatus('⚠ Add a message'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/collab/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ to_user_id: toUserId, ...requestForm }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus('✅ Request sent!');
      setSendingTo(null);
      setRequestForm({ message: '', budget_offer: '' });
    } catch (e) { setStatus(`⚠ ${e.message}`); }
  };

  const S = {
    page:   { minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: 'JetBrains Mono, Inter, sans-serif', padding: '24px 32px', maxWidth: 960, margin: '0 auto' },
    card:   { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 18, marginBottom: 12 },
    label:  { display: 'block', fontSize: '0.72rem', color: '#8b949e', marginBottom: 4, fontWeight: 600 },
    input:  { width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 6, color: '#c9d1d9', padding: '8px 12px', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    select: { background: '#21262d', border: '1px solid #30363d', borderRadius: 6, color: '#c9d1d9', padding: '8px 10px', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none' },
    btnTeal:{ background: '#00ffc8', color: '#000', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.83rem' },
    btnGray:{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: '0.8rem' },
    btnRed: { background: 'rgba(255,59,48,0.15)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: '0.8rem' },
    tag:    { background: 'rgba(0,255,200,0.1)', color: '#00ffc8', borderRadius: 4, padding: '2px 8px', fontSize: '0.68rem' },
    grid2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e6edf3' }}>🤝 Find Collaborators</div>
          <div style={{ fontSize: '0.75rem', color: '#5a7088', marginTop: 2 }}>
            Connect with artists, producers, and creators
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/collaborate/inbox" style={{ ...S.btnGray, textDecoration: 'none', display: 'inline-block' }}>
            📬 Inbox
          </a>
          <button style={S.btnTeal} onClick={() => {
            if (myListing) setListingForm({ ...myListing });
            setShowListingForm(v => !v);
          }}>
            {myListing ? '✏️ Edit My Listing' : '+ Post Listing'}
          </button>
        </div>
      </div>

      {status && (
        <div style={{ color: status.startsWith('⚠') ? '#ff9500' : '#00ffc8', marginBottom: 12, fontSize: '0.82rem' }}>
          {status}
        </div>
      )}

      {/* My listing banner */}
      {myListing && (
        <div style={{ ...S.card, border: '1px solid #00ffc8', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ color: '#00ffc8', fontWeight: 700, fontSize: '0.8rem' }}>YOUR LISTING</span>
              <div style={{ fontWeight: 700, color: '#e6edf3', marginTop: 2 }}>{myListing.project_type} • {myListing.genre}</div>
              <div style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: 2 }}>{myListing.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={S.btnGray} onClick={() => { setListingForm(myListing); setShowListingForm(true); }}>Edit</button>
              <button style={S.btnRed} onClick={deleteListing}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit listing form */}
      {showListingForm && (
        <div style={{ ...S.card, border: '1px solid #00ffc8', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#00ffc8', marginBottom: 16 }}>
            {myListing ? 'Edit Your Listing' : 'Post Collab Listing'}
          </div>
          <div style={{ ...S.grid2, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Project Type</label>
              <select style={{ ...S.select, width: '100%' }} value={listingForm.project_type}
                onChange={e => setListingForm(f => ({ ...f, project_type: e.target.value }))}>
                {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Genre</label>
              <select style={{ ...S.select, width: '100%' }} value={listingForm.genre}
                onChange={e => setListingForm(f => ({ ...f, genre: e.target.value }))}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
              placeholder="Describe what you're working on and what you need..."
              value={listingForm.description}
              onChange={e => setListingForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div style={{ ...S.grid2, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Skills Needed</label>
              <input style={S.input} placeholder="e.g. 808 bass, trap drums, hook writing"
                value={listingForm.skills_needed}
                onChange={e => setListingForm(f => ({ ...f, skills_needed: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Deadline (optional)</label>
              <input type="date" style={S.input} value={listingForm.deadline}
                onChange={e => setListingForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div style={{ ...S.grid2, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Budget Range ($)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" style={{ ...S.input, width: '50%' }} placeholder="Min"
                  value={listingForm.budget_min}
                  onChange={e => setListingForm(f => ({ ...f, budget_min: parseFloat(e.target.value) || 0 }))} />
                <input type="number" style={{ ...S.input, width: '50%' }} placeholder="Max"
                  value={listingForm.budget_max}
                  onChange={e => setListingForm(f => ({ ...f, budget_max: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.83rem', color: '#c9d1d9' }}>
                <input type="checkbox" checked={listingForm.is_paid}
                  onChange={e => setListingForm(f => ({ ...f, is_paid: e.target.checked }))} />
                Paid opportunity
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnTeal} onClick={saveListing}>
              {myListing ? '✓ Update Listing' : '🚀 Post Listing'}
            </button>
            <button style={S.btnGray} onClick={() => setShowListingForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <select style={S.select} value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select style={S.select} value={filters.genre} onChange={e => setFilters(f => ({ ...f, genre: e.target.value }))}>
          <option value="">All Genres</option>
          {GENRES.map(g => <option key={g}>{g}</option>)}
        </select>
        <input style={{ ...S.input, width: 110 }} placeholder="Min budget $"
          value={filters.budget_min}
          onChange={e => setFilters(f => ({ ...f, budget_min: e.target.value }))} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#c9d1d9', cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.paid_only}
            onChange={e => setFilters(f => ({ ...f, paid_only: e.target.checked }))} />
          Paid only
        </label>
      </div>

      {/* Listings */}
      {loading && <div style={{ color: '#5a7088', textAlign: 'center', padding: 40 }}>Loading...</div>}

      {!loading && listings.length === 0 && (
        <div style={{ color: '#5a7088', textAlign: 'center', padding: 40 }}>
          No listings match your filters. Be the first to post!
        </div>
      )}

      {listings.map(listing => (
        <div key={listing.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 12, flex: 1 }}>
              {/* Avatar */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#21262d', border: '2px solid #30363d', flexShrink: 0, overflow: 'hidden' }}>
                {listing.avatar ? <img src={listing.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ffc8', fontWeight: 700 }}>
                    {listing.username?.[0]?.toUpperCase()}
                  </div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#e6edf3' }}>{listing.username}</span>
                  <span style={S.tag}>{listing.project_type}</span>
                  <span style={{ ...S.tag, background: 'rgba(123,97,255,0.15)', color: '#7b61ff' }}>{listing.genre}</span>
                  {listing.is_paid && <span style={{ ...S.tag, background: 'rgba(0,255,200,0.15)' }}>💰 Paid</span>}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#c9d1d9', marginTop: 6, lineHeight: 1.5 }}>
                  {listing.description}
                </div>
                {listing.skills_needed && (
                  <div style={{ fontSize: '0.72rem', color: '#8b949e', marginTop: 6 }}>
                    🎯 Looking for: {listing.skills_needed}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.72rem', color: '#5a7088' }}>
                  {listing.budget_max > 0 && (
                    <span>💵 ${listing.budget_min}–${listing.budget_max}</span>
                  )}
                  {listing.deadline && <span>📅 {listing.deadline}</span>}
                  <span>🕐 {listing.time_ago}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            {listing.user_id !== currentUser?.id && (
              <div>
                {sendingTo === listing.user_id ? (
                  <div style={{ minWidth: 260, background: '#21262d', borderRadius: 8, padding: 14, border: '1px solid #30363d' }}>
                    <div style={{ fontSize: '0.72rem', color: '#8b949e', marginBottom: 6, fontWeight: 600 }}>
                      Send Request to {listing.username}
                    </div>
                    <textarea
                      style={{ ...S.input, minHeight: 70, marginBottom: 8, resize: 'none' }}
                      placeholder="Introduce yourself and describe your proposal..."
                      value={requestForm.message}
                      onChange={e => setRequestForm(f => ({ ...f, message: e.target.value }))}
                    />
                    <input type="number" style={{ ...S.input, marginBottom: 8 }}
                      placeholder="Budget offer (optional $)"
                      value={requestForm.budget_offer}
                      onChange={e => setRequestForm(f => ({ ...f, budget_offer: e.target.value }))} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ ...S.btnTeal, flex: 1 }} onClick={() => sendRequest(listing.user_id)}>
                        Send
                      </button>
                      <button style={S.btnGray} onClick={() => setSendingTo(null)}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button style={S.btnTeal} onClick={() => setSendingTo(listing.user_id)}>
                    🤝 Request Collab
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INBOX PAGE — manage incoming requests
// ─────────────────────────────────────────────────────────────────────────────
export const CollabInbox = ({ currentUser }) => {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [tab, setTab]           = useState('incoming');
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inRes, outRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/collab/requests/incoming`, { headers: getHeaders() }),
        fetch(`${BACKEND_URL}/api/collab/requests/outgoing`, { headers: getHeaders() }),
      ]);
      if (inRes.ok) setIncoming(await inRes.json());
      if (outRes.ok) setOutgoing(await outRes.json());
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (requestId, action, message = '') => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/collab/request/${requestId}/respond`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action, message }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus(`✅ Request ${action}ed`);
      load();
    } catch (e) { setStatus(`⚠ ${e.message}`); }
  };

  const S = {
    page:   { minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: 'JetBrains Mono, Inter, sans-serif', padding: '24px 32px', maxWidth: 820, margin: '0 auto' },
    card:   { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 18, marginBottom: 12 },
    tab:    (active) => ({ padding: '8px 18px', borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, background: active ? '#161b22' : 'transparent', color: active ? '#00ffc8' : '#8b949e', borderBottom: active ? '2px solid #00ffc8' : '2px solid transparent' }),
    badge:  (color) => ({ background: color, color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: '0.65rem', fontWeight: 700 }),
    btnTeal:{ background: '#00ffc8', color: '#000', border: 'none', borderRadius: 5, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' },
    btnGray:{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 5, padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem' },
    btnRed: { background: 'rgba(255,59,48,0.15)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 5, padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem' },
  };

  const STATUS_COLORS = { pending: '#ff9500', accepted: '#34d399', declined: '#ff3b30', countered: '#7b61ff' };

  const RequestCard = ({ req, isIncoming }) => (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, color: '#e6edf3' }}>
              {isIncoming ? req.from_username : req.to_username}
            </span>
            <span style={S.badge(STATUS_COLORS[req.status] || '#5a7088')}>
              {req.status.toUpperCase()}
            </span>
          </div>
          {req.project_type && (
            <div style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: 4 }}>
              📋 {req.project_type} • {req.genre}
            </div>
          )}
          <div style={{ fontSize: '0.83rem', color: '#c9d1d9', lineHeight: 1.5 }}>
            {req.message}
          </div>
          {req.budget_offer > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#00ffc8', marginTop: 4 }}>
              💵 Budget offered: ${req.budget_offer}
            </div>
          )}
          <div style={{ fontSize: '0.68rem', color: '#5a7088', marginTop: 6 }}>{req.time_ago}</div>
        </div>

        {isIncoming && req.status === 'pending' && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            <button style={S.btnTeal} onClick={() => respond(req.id, 'accept')}>✓ Accept</button>
            <button style={S.btnGray} onClick={() => {
              const msg = window.prompt('Counter-offer message (optional):');
              respond(req.id, 'counter', msg || '');
            }}>↺ Counter</button>
            <button style={S.btnRed} onClick={() => respond(req.id, 'decline')}>✕ Decline</button>
          </div>
        )}

        {req.status === 'accepted' && (
          <a href={`/messages?user=${isIncoming ? req.from_user_id : req.to_user_id}`}
            style={{ ...S.btnTeal, textDecoration: 'none', display: 'inline-block', marginLeft: 12 }}>
            💬 Message
          </a>
        )}
      </div>
    </div>
  );

  const pendingCount = incoming.filter(r => r.status === 'pending').length;

  return (
    <div style={S.page}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e6edf3', marginBottom: 16 }}>
        📬 Collab Inbox
      </div>

      {status && (
        <div style={{ color: status.startsWith('⚠') ? '#ff9500' : '#00ffc8', marginBottom: 12, fontSize: '0.82rem' }}>
          {status}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #30363d', marginBottom: 20 }}>
        <button style={S.tab(tab === 'incoming')} onClick={() => setTab('incoming')}>
          Incoming {pendingCount > 0 && <span style={{ ...S.badge('#ff3b30'), marginLeft: 6 }}>{pendingCount}</span>}
        </button>
        <button style={S.tab(tab === 'outgoing')} onClick={() => setTab('outgoing')}>
          Sent ({outgoing.length})
        </button>
      </div>

      {loading && <div style={{ color: '#5a7088', textAlign: 'center', padding: 40 }}>Loading...</div>}

      {!loading && tab === 'incoming' && (
        incoming.length === 0
          ? <div style={{ color: '#5a7088', textAlign: 'center', padding: 40 }}>No requests yet. Post a listing to get discovered.</div>
          : incoming.map(r => <RequestCard key={r.id} req={r} isIncoming />)
      )}

      {!loading && tab === 'outgoing' && (
        outgoing.length === 0
          ? <div style={{ color: '#5a7088', textAlign: 'center', padding: 40 }}>You haven't sent any requests yet.</div>
          : outgoing.map(r => <RequestCard key={r.id} req={r} isIncoming={false} />)
      )}
    </div>
  );
};

export default CollabBrowsePage;

// =============================================================================
// BACKEND — copy to src/api/collab_request_routes.py
// =============================================================================
/*
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from src.api.models import db, User

collab_bp = Blueprint('collab', __name__)

# ── Models (add to models.py) ──────────────────────────────────────────────
#
# class CollabListing(db.Model):
#     __tablename__ = 'collab_listings'
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     project_type = db.Column(db.String(100), nullable=False)
#     genre = db.Column(db.String(100))
#     description = db.Column(db.Text)
#     skills_needed = db.Column(db.String(255))
#     budget_min = db.Column(db.Float, default=0)
#     budget_max = db.Column(db.Float, default=0)
#     is_paid = db.Column(db.Boolean, default=False)
#     deadline = db.Column(db.String(20), nullable=True)
#     is_active = db.Column(db.Boolean, default=True)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     user = db.relationship('User', backref='collab_listing')
#
# class CollabRequest(db.Model):
#     __tablename__ = 'collab_requests'
#     id = db.Column(db.Integer, primary_key=True)
#     from_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     to_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     message = db.Column(db.Text, nullable=False)
#     budget_offer = db.Column(db.Float, default=0)
#     status = db.Column(db.String(20), default='pending')  # pending/accepted/declined/countered
#     response_message = db.Column(db.Text, nullable=True)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
#     from_user = db.relationship('User', foreign_keys=[from_user_id], backref='sent_collab_requests')
#     to_user = db.relationship('User', foreign_keys=[to_user_id], backref='received_collab_requests')

def time_ago(dt):
    diff = datetime.utcnow() - dt
    s = diff.total_seconds()
    if s < 3600: return f"{int(s/60)}m ago"
    if s < 86400: return f"{int(s/3600)}h ago"
    return f"{int(s/86400)}d ago"

# LISTINGS ────────────────────────────────────────────────────────────────────

@collab_bp.route('/api/collab/listings', methods=['GET'])
@jwt_required()
def browse_listings():
    from src.api.models import CollabListing
    user_id = get_jwt_identity()
    q = CollabListing.query.filter_by(is_active=True).filter(CollabListing.user_id != user_id)
    if request.args.get('type'): q = q.filter_by(project_type=request.args['type'])
    if request.args.get('genre'): q = q.filter_by(genre=request.args['genre'])
    if request.args.get('paid_only'): q = q.filter_by(is_paid=True)
    listings = q.order_by(CollabListing.created_at.desc()).limit(50).all()
    result = []
    for l in listings:
        u = User.query.get(l.user_id)
        result.append({
            'id': l.id, 'user_id': l.user_id,
            'username': u.username if u else 'Unknown',
            'avatar': getattr(u, 'profile_picture', None),
            'project_type': l.project_type, 'genre': l.genre,
            'description': l.description, 'skills_needed': l.skills_needed,
            'budget_min': l.budget_min, 'budget_max': l.budget_max,
            'is_paid': l.is_paid, 'deadline': l.deadline,
            'time_ago': time_ago(l.created_at),
        })
    return jsonify(result), 200

@collab_bp.route('/api/collab/my-listing', methods=['GET'])
@jwt_required()
def my_listing():
    from src.api.models import CollabListing
    user_id = get_jwt_identity()
    l = CollabListing.query.filter_by(user_id=user_id, is_active=True).first()
    return jsonify({'listing': l.serialize() if l else None}), 200

@collab_bp.route('/api/collab/listing', methods=['POST'])
@jwt_required()
def create_listing():
    from src.api.models import CollabListing
    user_id = get_jwt_identity()
    data = request.get_json()
    existing = CollabListing.query.filter_by(user_id=user_id, is_active=True).first()
    if existing:
        return jsonify({'error': 'You already have an active listing. Edit it instead.'}), 400
    listing = CollabListing(user_id=user_id, **{k: data[k] for k in
        ['project_type','genre','description','skills_needed','budget_min','budget_max','is_paid','deadline'] if k in data})
    db.session.add(listing); db.session.commit()
    return jsonify({'message': 'Listing created', 'id': listing.id}), 201

@collab_bp.route('/api/collab/listing', methods=['PUT'])
@jwt_required()
def update_listing():
    from src.api.models import CollabListing
    user_id = get_jwt_identity()
    data = request.get_json()
    l = CollabListing.query.filter_by(user_id=user_id, is_active=True).first()
    if not l: return jsonify({'error': 'Listing not found'}), 404
    for k in ['project_type','genre','description','skills_needed','budget_min','budget_max','is_paid','deadline']:
        if k in data: setattr(l, k, data[k])
    db.session.commit()
    return jsonify({'message': 'Updated'}), 200

@collab_bp.route('/api/collab/listing', methods=['DELETE'])
@jwt_required()
def delete_listing():
    from src.api.models import CollabListing
    user_id = get_jwt_identity()
    l = CollabListing.query.filter_by(user_id=user_id, is_active=True).first()
    if l: l.is_active = False; db.session.commit()
    return jsonify({'message': 'Removed'}), 200

# REQUESTS ────────────────────────────────────────────────────────────────────

@collab_bp.route('/api/collab/request', methods=['POST'])
@jwt_required()
def send_request():
    from src.api.models import CollabRequest
    user_id = get_jwt_identity()
    data = request.get_json()
    to_id = data.get('to_user_id')
    if not to_id or to_id == user_id:
        return jsonify({'error': 'Invalid recipient'}), 400
    existing = CollabRequest.query.filter_by(from_user_id=user_id, to_user_id=to_id, status='pending').first()
    if existing: return jsonify({'error': 'You already have a pending request to this person'}), 400
    req = CollabRequest(from_user_id=user_id, to_user_id=to_id,
                        message=data['message'], budget_offer=data.get('budget_offer', 0))
    db.session.add(req); db.session.commit()
    return jsonify({'message': 'Request sent', 'id': req.id}), 201

@collab_bp.route('/api/collab/requests/incoming', methods=['GET'])
@jwt_required()
def incoming_requests():
    from src.api.models import CollabRequest
    user_id = get_jwt_identity()
    reqs = CollabRequest.query.filter_by(to_user_id=user_id).order_by(CollabRequest.created_at.desc()).all()
    result = []
    for r in reqs:
        fu = User.query.get(r.from_user_id)
        result.append({'id': r.id, 'from_user_id': r.from_user_id,
                        'from_username': fu.username if fu else 'Unknown',
                        'message': r.message, 'budget_offer': r.budget_offer,
                        'status': r.status, 'time_ago': time_ago(r.created_at)})
    return jsonify(result), 200

@collab_bp.route('/api/collab/requests/outgoing', methods=['GET'])
@jwt_required()
def outgoing_requests():
    from src.api.models import CollabRequest
    user_id = get_jwt_identity()
    reqs = CollabRequest.query.filter_by(from_user_id=user_id).order_by(CollabRequest.created_at.desc()).all()
    result = []
    for r in reqs:
        tu = User.query.get(r.to_user_id)
        result.append({'id': r.id, 'to_user_id': r.to_user_id,
                        'to_username': tu.username if tu else 'Unknown',
                        'message': r.message, 'budget_offer': r.budget_offer,
                        'status': r.status, 'time_ago': time_ago(r.created_at)})
    return jsonify(result), 200

@collab_bp.route('/api/collab/request/<int:req_id>/respond', methods=['POST'])
@jwt_required()
def respond_to_request(req_id):
    from src.api.models import CollabRequest
    user_id = get_jwt_identity()
    data = request.get_json()
    req = CollabRequest.query.filter_by(id=req_id, to_user_id=user_id).first()
    if not req: return jsonify({'error': 'Request not found'}), 404
    action = data.get('action')  # accept / decline / counter
    if action not in ('accept', 'decline', 'counter'):
        return jsonify({'error': 'Invalid action'}), 400
    req.status = action + 'ed' if action != 'counter' else 'countered'
    req.response_message = data.get('message', '')
    req.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': f'Request {req.status}'}), 200

# Register in app.py:
# from .collab_request_routes import collab_bp
# app.register_blueprint(collab_bp)
#
# Add to layout.js:
# <Route path="/collaborate" element={<CollabBrowsePage currentUser={user} />} />
# <Route path="/collaborate/inbox" element={<CollabInbox currentUser={user} />} />
#
# Migration:
# flask db migrate -m "add collab_listings and collab_requests tables"
# flask db upgrade
*/