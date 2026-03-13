// =============================================================================
// FanMembership.js — Creator Fan Membership System (Patreon-style)
// =============================================================================
// Location: src/front/js/pages/FanMembership.js
// Routes:
//   /fan-membership         → Fan view: subscribe to a creator
//   /creator/membership     → Creator view: manage tiers + subscribers
//
// Features:
//  - Creator creates up to 5 membership tiers (name, price, benefits, badge color)
//  - Fans subscribe via Stripe (recurring monthly)
//  - Gated content: mark posts/videos/tracks as "members only"
//  - Subscriber count + monthly revenue display
//  - Tier-gated shoutout requests (uses existing voice clone)
//  - Fan dashboard: active memberships, cancel anytime
//
// Model already exists: CreatorMembershipTier in models.py
// UserSubscription model already exists (for radio/creator subs)
//
// Backend routes needed: see bottom of file
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const BADGE_COLORS = ['#00ffc8', '#ff6b35', '#7b61ff', '#fbbf24', '#f472b6'];
const TIER_ICONS  = ['☕', '⭐', '🎯', '👑', '💎'];

// =============================================================================
// CREATOR MANAGEMENT VIEW
// =============================================================================
export const CreatorMembershipManager = () => {
  const [tiers, setTiers]             = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [revenue, setRevenue]         = useState({ monthly: 0, total: 0, active_subs: 0 });
  const [editingTier, setEditingTier] = useState(null); // null | 'new' | tier object
  const [saving, setSaving]           = useState(false);
  const [status, setStatus]           = useState('');
  const [activeTab, setActiveTab]     = useState('tiers');

  const [form, setForm] = useState({
    name: '', price_monthly: 4.99, benefits: '', color: BADGE_COLORS[0],
  });

  const loadData = useCallback(async () => {
    try {
      const [tiersRes, subsRes, revRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/creator/membership/tiers`, { headers: getHeaders() }),
        fetch(`${BACKEND_URL}/api/creator/membership/subscribers`, { headers: getHeaders() }),
        fetch(`${BACKEND_URL}/api/creator/membership/revenue`, { headers: getHeaders() }),
      ]);
      if (tiersRes.ok) setTiers(await tiersRes.json());
      if (subsRes.ok) setSubscribers(await subsRes.json());
      if (revRes.ok) setRevenue(await revRes.json());
    } catch (e) { setStatus('⚠ Failed to load data'); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveTier = async () => {
    if (!form.name.trim() || form.price_monthly <= 0) {
      setStatus('⚠ Name and price required');
      return;
    }
    setSaving(true);
    try {
      const url    = editingTier?.id ? `${BACKEND_URL}/api/creator/membership/tiers/${editingTier.id}` : `${BACKEND_URL}/api/creator/membership/tiers`;
      const method = editingTier?.id ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus('✅ Tier saved');
      setEditingTier(null);
      loadData();
    } catch (e) { setStatus(`⚠ ${e.message}`); }
    finally { setSaving(false); }
  };

  const deleteTier = async (tierId) => {
    if (!window.confirm('Delete this tier? Existing subscribers will be unaffected until their period ends.')) return;
    await fetch(`${BACKEND_URL}/api/creator/membership/tiers/${tierId}`, { method: 'DELETE', headers: getHeaders() });
    loadData();
  };

  const S = {
    page:   { minHeight:'100vh', background:'#0d1117', color:'#c9d1d9', fontFamily:'JetBrains Mono, Inter, monospace', padding:'24px 32px', maxWidth:900, margin:'0 auto' },
    card:   { background:'#161b22', border:'1px solid #30363d', borderRadius:8, padding:20, marginBottom:16 },
    label:  { display:'block', fontSize:'0.72rem', color:'#8b949e', marginBottom:4, fontWeight:600 },
    input:  { width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'8px 12px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
    textarea:{ width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#c9d1d9', padding:'8px 12px', fontSize:'0.85rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box', minHeight:80, resize:'vertical' },
    btnTeal:{ background:'#00ffc8', color:'#000', border:'none', borderRadius:6, padding:'8px 18px', fontWeight:700, cursor:'pointer', fontSize:'0.85rem' },
    btnGray:{ background:'#21262d', color:'#c9d1d9', border:'1px solid #30363d', borderRadius:6, padding:'8px 16px', fontWeight:600, cursor:'pointer', fontSize:'0.82rem' },
    btnRed: { background:'transparent', color:'#ff3b30', border:'1px solid #ff3b30', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:'0.72rem' },
    metric: { background:'#161b22', border:'1px solid #30363d', borderRadius:8, padding:'16px 20px', textAlign:'center' },
    tab:    (active) => ({ padding:'8px 18px', borderRadius:6, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.82rem', fontWeight:600, background: active ? '#00ffc8' : '#21262d', color: active ? '#000' : '#c9d1d9' }),
  };

  return (
    <div style={S.page}>
      <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#e6edf3', marginBottom:20 }}>🌟 Fan Membership</div>

      {/* Revenue metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
        <div style={S.metric}>
          <div style={{ fontSize:'1.6rem', fontWeight:700, color:'#00ffc8' }}>${revenue.monthly?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize:'0.72rem', color:'#5a7088' }}>Monthly Revenue</div>
        </div>
        <div style={S.metric}>
          <div style={{ fontSize:'1.6rem', fontWeight:700, color:'#7b61ff' }}>{revenue.active_subs || 0}</div>
          <div style={{ fontSize:'0.72rem', color:'#5a7088' }}>Active Members</div>
        </div>
        <div style={S.metric}>
          <div style={{ fontSize:'1.6rem', fontWeight:700, color:'#fbbf24' }}>${revenue.total?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize:'0.72rem', color:'#5a7088' }}>Total Earned</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <button style={S.tab(activeTab === 'tiers')} onClick={() => setActiveTab('tiers')}>Membership Tiers</button>
        <button style={S.tab(activeTab === 'subs')} onClick={() => setActiveTab('subs')}>Subscribers ({subscribers.length})</button>
      </div>

      {/* TIERS TAB */}
      {activeTab === 'tiers' && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:'0.82rem', color:'#5a7088' }}>Create up to 5 tiers</div>
            {tiers.length < 5 && (
              <button style={S.btnTeal} onClick={() => { setEditingTier('new'); setForm({ name:'', price_monthly:4.99, benefits:'', color: BADGE_COLORS[tiers.length] }); }}>
                + New Tier
              </button>
            )}
          </div>

          {tiers.length === 0 && editingTier !== 'new' && (
            <div style={{ ...S.card, textAlign:'center', padding:'40px 20px', color:'#5a7088' }}>
              No membership tiers yet. Create one to start earning from fans.
            </div>
          )}

          {tiers.map((tier, i) => (
            <div key={tier.id} style={{ ...S.card, borderLeft:`4px solid ${tier.color || BADGE_COLORS[i]}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:'1.2rem' }}>{TIER_ICONS[i]}</span>
                    <span style={{ fontWeight:700, color:'#e6edf3', fontSize:'1rem' }}>{tier.name}</span>
                    <span style={{ background: `${tier.color || BADGE_COLORS[i]}20`, color: tier.color || BADGE_COLORS[i], borderRadius:4, padding:'2px 8px', fontSize:'0.72rem', fontWeight:700 }}>
                      ${tier.price_monthly}/mo
                    </span>
                  </div>
                  <div style={{ fontSize:'0.78rem', color:'#8b949e', marginTop:6, whiteSpace:'pre-line' }}>
                    {(tier.benefits || []).join('\n')}
                  </div>
                  <div style={{ fontSize:'0.68rem', color:'#5a7088', marginTop:6 }}>
                    {tier.subscriber_count || 0} active members · ${((tier.price_monthly || 0) * 0.9 * (tier.subscriber_count || 0)).toFixed(2)}/mo after fees
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button style={S.btnGray} onClick={() => { setEditingTier(tier); setForm({ name: tier.name, price_monthly: tier.price_monthly, benefits: (tier.benefits || []).join('\n'), color: tier.color || BADGE_COLORS[i] }); }}>Edit</button>
                  <button style={S.btnRed} onClick={() => deleteTier(tier.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}

          {/* Tier editor */}
          {editingTier && (
            <div style={{ ...S.card, border:'1px solid #00ffc8' }}>
              <div style={{ fontWeight:700, color:'#00ffc8', marginBottom:14 }}>
                {editingTier === 'new' ? '+ New Tier' : `✏️ Edit: ${editingTier.name}`}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={S.label}>Tier Name</label>
                  <input style={S.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Super Fan" />
                </div>
                <div>
                  <label style={S.label}>Monthly Price (USD)</label>
                  <input type="number" style={S.input} min={0.99} step={0.01} value={form.price_monthly}
                    onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))} />
                  <div style={{ fontSize:'0.65rem', color:'#5a7088', marginTop:3 }}>You earn ${(form.price_monthly * 0.9).toFixed(2)}/mo per member</div>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Benefits (one per line)</label>
                <textarea style={S.textarea}
                  value={form.benefits}
                  onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))}
                  placeholder={'Early access to new tracks\nExclusive behind-the-scenes videos\nMonthly shoutout'} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={S.label}>Tier Color</label>
                <div style={{ display:'flex', gap:8 }}>
                  {BADGE_COLORS.map(c => (
                    <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border: form.color === c ? '3px solid #fff' : '3px solid transparent', transition:'border 0.1s' }} />
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button style={S.btnTeal} onClick={saveTier} disabled={saving}>{saving ? '...' : 'Save Tier'}</button>
                <button style={S.btnGray} onClick={() => setEditingTier(null)}>Cancel</button>
                {status && <span style={{ color: status.startsWith('⚠') ? '#ff9500' : '#00ffc8', fontSize:'0.8rem', alignSelf:'center' }}>{status}</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* SUBSCRIBERS TAB */}
      {activeTab === 'subs' && (
        <div style={S.card}>
          {subscribers.length === 0
            ? <div style={{ textAlign:'center', padding:'32px 0', color:'#5a7088' }}>No subscribers yet.</div>
            : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #30363d', color:'#8b949e' }}>
                    <th style={{ textAlign:'left', padding:'8px 0' }}>Fan</th>
                    <th style={{ textAlign:'left', padding:'8px 0' }}>Tier</th>
                    <th style={{ textAlign:'left', padding:'8px 0' }}>Since</th>
                    <th style={{ textAlign:'right', padding:'8px 0' }}>$/mo</th>
                    <th style={{ textAlign:'right', padding:'8px 0' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #21262d' }}>
                      <td style={{ padding:'10px 0', color:'#e6edf3' }}>{sub.username}</td>
                      <td style={{ padding:'10px 0' }}>
                        <span style={{ background:'rgba(0,255,200,0.1)', color:'#00ffc8', borderRadius:4, padding:'2px 8px', fontSize:'0.7rem' }}>{sub.tier_name}</span>
                      </td>
                      <td style={{ padding:'10px 0', color:'#5a7088' }}>{new Date(sub.created_at).toLocaleDateString()}</td>
                      <td style={{ padding:'10px 0', textAlign:'right', color:'#00ffc8' }}>${sub.price?.toFixed(2)}</td>
                      <td style={{ padding:'10px 0', textAlign:'right' }}>
                        <span style={{ color: sub.status === 'active' ? '#00ffc8' : '#ff3b30', fontSize:'0.72rem' }}>{sub.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}
    </div>
  );
};

// =============================================================================
// FAN VIEW — Subscribe to a creator
// =============================================================================
export const FanMembershipPage = ({ embeddedCreatorId } = {}) => {
  const params = useParams();
  const creatorId = embeddedCreatorId || params.creatorId;
  const navigate = useNavigate();
  const [tiers, setTiers]           = useState([]);
  const [creator, setCreator]       = useState(null);
  const [myMembership, setMyMembership] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [status, setStatus]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [tiersRes, creatorRes, myRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/fan/membership/${creatorId}/tiers`),
          fetch(`${BACKEND_URL}/api/profile/${creatorId}`),
          getToken() ? fetch(`${BACKEND_URL}/api/fan/membership/${creatorId}/my`, { headers: getHeaders() }) : Promise.resolve(null),
        ]);
        if (tiersRes.ok) setTiers(await tiersRes.json());
        if (creatorRes.ok) setCreator(await creatorRes.json());
        if (myRes?.ok) setMyMembership(await myRes.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [creatorId]);

  const subscribe = async (tierId) => {
    if (!getToken()) { navigate('/login'); return; }
    setSubscribing(tierId);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/fan/membership/subscribe`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ creator_id: creatorId, tier_id: tierId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e) { setStatus(`⚠ ${e.message}`); }
    finally { setSubscribing(null); }
  };

  const cancelMembership = async () => {
    if (!window.confirm('Cancel your membership?')) return;
    const res = await fetch(`${BACKEND_URL}/api/fan/membership/cancel`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ creator_id: creatorId }) });
    if (res.ok) { setMyMembership(null); setStatus('Membership cancelled'); }
  };

  const S = {
    page:  { minHeight:'100vh', background:'#0d1117', color:'#c9d1d9', fontFamily:'JetBrains Mono, Inter, monospace', padding:'40px 32px', maxWidth:800, margin:'0 auto' },
    card:  { background:'#161b22', border:'1px solid #30363d', borderRadius:12, padding:24, marginBottom:16 },
    btnTeal: { background:'#00ffc8', color:'#000', border:'none', borderRadius:6, padding:'10px 22px', fontWeight:700, cursor:'pointer', fontSize:'0.9rem', width:'100%', marginTop:12 },
    btnGray: { background:'#21262d', color:'#c9d1d9', border:'1px solid #30363d', borderRadius:6, padding:'8px 16px', fontWeight:600, cursor:'pointer', fontSize:'0.82rem' },
  };

  if (loading) return <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>Loading...</div>;

  return (
    <div style={S.page}>
      {/* Creator header */}
      {creator && (
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <img src={creator.profile_picture || '/default-avatar.png'} alt="" style={{ width:80, height:80, borderRadius:'50%', border:'3px solid #00ffc8', objectFit:'cover' }} />
          <div style={{ fontSize:'1.4rem', fontWeight:700, color:'#e6edf3', marginTop:10 }}>{creator.display_name || creator.username}</div>
          <div style={{ color:'#5a7088', marginTop:4 }}>Support {creator.display_name || creator.username} with a monthly membership</div>
        </div>
      )}

      {/* Active membership banner */}
      {myMembership && (
        <div style={{ ...S.card, border:'1px solid #00ffc8', background:'rgba(0,255,200,0.05)', textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#00ffc8', marginBottom:4 }}>
            ✅ You're a {myMembership.tier_name} member!
          </div>
          <div style={{ fontSize:'0.78rem', color:'#8b949e', marginBottom:10 }}>
            Renews {new Date(myMembership.renews_at).toLocaleDateString()} · ${myMembership.price}/month
          </div>
          <button style={S.btnGray} onClick={cancelMembership}>Cancel Membership</button>
        </div>
      )}

      {status && <div style={{ color:'#ff9500', textAlign:'center', marginBottom:16, fontSize:'0.85rem' }}>{status}</div>}

      {/* Tiers */}
      {tiers.length === 0
        ? <div style={{ textAlign:'center', color:'#5a7088', padding:'40px 0' }}>This creator hasn't set up memberships yet.</div>
        : tiers.map((tier, i) => {
          const isMyTier = myMembership?.tier_id === tier.id;
          return (
            <div key={tier.id} style={{ ...S.card, borderLeft:`4px solid ${tier.color || BADGE_COLORS[i]}`, opacity: myMembership && !isMyTier ? 0.6 : 1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:'1.3rem' }}>{TIER_ICONS[i]}</span>
                    <span style={{ fontSize:'1.1rem', fontWeight:700, color:'#e6edf3' }}>{tier.name}</span>
                  </div>
                  <div style={{ fontSize:'1.4rem', fontWeight:700, color: tier.color || BADGE_COLORS[i], marginTop:4 }}>
                    ${tier.price_monthly}<span style={{ fontSize:'0.8rem', color:'#8b949e' }}>/month</span>
                  </div>
                </div>
                <div style={{ fontSize:'0.72rem', color:'#5a7088' }}>
                  {tier.subscriber_count || 0} members
                </div>
              </div>
              <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:'0.82rem', color:'#c9d1d9', lineHeight:1.8 }}>
                {(tier.benefits || []).map((b, bi) => <li key={bi}>✅ {b}</li>)}
              </ul>
              <button
                style={{ ...S.btnTeal, opacity: subscribing === tier.id ? 0.7 : 1 }}
                onClick={() => !isMyTier && subscribe(tier.id)}
                disabled={subscribing === tier.id || isMyTier}
              >
                {isMyTier ? '✅ Current Tier' : subscribing === tier.id ? '...' : `Join for $${tier.price_monthly}/mo`}
              </button>
            </div>
          );
        })
      }
    </div>
  );
};

export default FanMembershipPage;

// =============================================================================
// BACKEND: src/api/fan_membership_routes.py
// =============================================================================
/*
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, User, CreatorMembershipTier, UserSubscription
import stripe, os
from datetime import datetime, timedelta

fan_membership_bp = Blueprint('fan_membership', __name__)
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# ── Creator: list their tiers ──
@fan_membership_bp.route('/api/creator/membership/tiers', methods=['GET'])
@jwt_required()
def get_my_tiers():
    user_id = get_jwt_identity()
    tiers = CreatorMembershipTier.query.filter_by(creator_id=user_id).all()
    result = []
    for t in tiers:
        sub_count = UserSubscription.query.filter_by(
            creator_id=user_id, tier_id=t.id, status='active'
        ).count()
        d = t.serialize()
        d['subscriber_count'] = sub_count
        result.append(d)
    return jsonify(result), 200

# ── Creator: create tier ──
@fan_membership_bp.route('/api/creator/membership/tiers', methods=['POST'])
@jwt_required()
def create_tier():
    user_id = get_jwt_identity()
    data = request.get_json()
    if CreatorMembershipTier.query.filter_by(creator_id=user_id).count() >= 5:
        return jsonify({'error': 'Max 5 tiers allowed'}), 400
    tier = CreatorMembershipTier(
        creator_id=user_id,
        name=data['name'],
        price_monthly=data['price_monthly'],
        price_yearly=data.get('price_yearly', data['price_monthly'] * 10),
        benefits=';'.join(data.get('benefits', '').split('\n')),
        color=data.get('color', '#00ffc8'),
    )
    # Create Stripe Price for recurring billing
    product = stripe.Product.create(name=f"{data['name']} - Fan Membership")
    price = stripe.Price.create(
        product=product.id,
        unit_amount=int(data['price_monthly'] * 100),
        currency='usd',
        recurring={'interval': 'month'},
    )
    tier.stripe_price_id = price.id
    db.session.add(tier); db.session.commit()
    return jsonify(tier.serialize()), 201

# ── Creator: edit tier ──
@fan_membership_bp.route('/api/creator/membership/tiers/<int:tier_id>', methods=['PUT'])
@jwt_required()
def update_tier(tier_id):
    user_id = get_jwt_identity()
    tier = CreatorMembershipTier.query.filter_by(id=tier_id, creator_id=user_id).first_or_404()
    data = request.get_json()
    if 'name' in data: tier.name = data['name']
    if 'benefits' in data: tier.benefits = ';'.join(data['benefits'].split('\n'))
    if 'color' in data: tier.color = data['color']
    db.session.commit()
    return jsonify(tier.serialize()), 200

# ── Creator: delete tier ──
@fan_membership_bp.route('/api/creator/membership/tiers/<int:tier_id>', methods=['DELETE'])
@jwt_required()
def delete_tier(tier_id):
    user_id = get_jwt_identity()
    tier = CreatorMembershipTier.query.filter_by(id=tier_id, creator_id=user_id).first_or_404()
    db.session.delete(tier); db.session.commit()
    return jsonify({'message': 'Deleted'}), 200

# ── Creator: subscribers list ──
@fan_membership_bp.route('/api/creator/membership/subscribers', methods=['GET'])
@jwt_required()
def get_subscribers():
    user_id = get_jwt_identity()
    subs = UserSubscription.query.filter_by(creator_id=user_id).all()
    result = []
    for s in subs:
        fan = User.query.get(s.subscriber_id)
        tier = CreatorMembershipTier.query.get(s.tier_id)
        result.append({
            'id': s.id, 'username': fan.username if fan else 'Unknown',
            'tier_name': tier.name if tier else 'Unknown',
            'price': tier.price_monthly if tier else 0,
            'status': s.status,
            'created_at': s.created_at.isoformat() if hasattr(s, 'created_at') else None,
        })
    return jsonify(result), 200

# ── Creator: revenue summary ──
@fan_membership_bp.route('/api/creator/membership/revenue', methods=['GET'])
@jwt_required()
def get_membership_revenue():
    user_id = get_jwt_identity()
    active_subs = UserSubscription.query.filter_by(creator_id=user_id, status='active').all()
    monthly = sum(
        (CreatorMembershipTier.query.get(s.tier_id).price_monthly * 0.9)
        for s in active_subs
        if CreatorMembershipTier.query.get(s.tier_id)
    )
    return jsonify({'monthly': round(monthly, 2), 'active_subs': len(active_subs), 'total': round(monthly, 2)}), 200

# ── Fan: list creator's public tiers ──
@fan_membership_bp.route('/api/fan/membership/<int:creator_id>/tiers', methods=['GET'])
def get_creator_tiers(creator_id):
    tiers = CreatorMembershipTier.query.filter_by(creator_id=creator_id).all()
    result = []
    for i, t in enumerate(tiers):
        d = t.serialize()
        d['subscriber_count'] = UserSubscription.query.filter_by(creator_id=creator_id, tier_id=t.id, status='active').count()
        result.append(d)
    return jsonify(result), 200

# ── Fan: check own membership ──
@fan_membership_bp.route('/api/fan/membership/<int:creator_id>/my', methods=['GET'])
@jwt_required()
def get_my_membership(creator_id):
    user_id = get_jwt_identity()
    sub = UserSubscription.query.filter_by(subscriber_id=user_id, creator_id=creator_id, status='active').first()
    if not sub: return jsonify(None), 200
    tier = CreatorMembershipTier.query.get(sub.tier_id)
    return jsonify({
        'tier_id': sub.tier_id,
        'tier_name': tier.name if tier else 'Unknown',
        'price': tier.price_monthly if tier else 0,
        'renews_at': (sub.created_at + timedelta(days=30)).isoformat() if hasattr(sub, 'created_at') else None,
        'status': sub.status,
    }), 200

# ── Fan: subscribe ──
@fan_membership_bp.route('/api/fan/membership/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_creator():
    user_id = get_jwt_identity()
    data = request.get_json()
    tier = CreatorMembershipTier.query.get_or_404(data['tier_id'])
    fan = User.query.get(user_id)

    if not tier.stripe_price_id:
        return jsonify({'error': 'Tier not configured for payments'}), 400

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{'price': tier.stripe_price_id, 'quantity': 1}],
        mode='subscription',
        success_url=f"{os.getenv('FRONTEND_URL')}/fan/membership/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{os.getenv('FRONTEND_URL')}/creator/{data['creator_id']}",
        metadata={
            'user_id': str(user_id),
            'creator_id': str(data['creator_id']),
            'tier_id': str(tier.id),
        }
    )
    return jsonify({'checkout_url': session.url}), 200

# ── Fan: cancel ──
@fan_membership_bp.route('/api/fan/membership/cancel', methods=['POST'])
@jwt_required()
def cancel_membership():
    user_id = get_jwt_identity()
    data = request.get_json()
    sub = UserSubscription.query.filter_by(
        subscriber_id=user_id, creator_id=data['creator_id'], status='active'
    ).first()
    if not sub: return jsonify({'error': 'No active membership'}), 404
    sub.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Cancelled'}), 200
*/