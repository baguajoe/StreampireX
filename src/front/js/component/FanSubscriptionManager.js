import React, { useState, useEffect } from 'react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

// ── Creator side: manage your tiers ──
export function FanTierManager({ creatorId }) {
  const [tiers, setTiers]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [fans, setFans]       = useState([]);
  const [form, setForm]       = useState({ name: 'Super Fan', price: 5, description: '', perks: '' });

  const fetchTiers = async () => {
    const res = await fetch(`${BACKEND}/api/fan-subs/tiers/${creatorId}`);
    const d   = await res.json();
    setTiers(Array.isArray(d) ? d : []);
  };

  const fetchFans = async () => {
    const res = await fetch(`${BACKEND}/api/fan-subs/my-fans`, { headers: hdrs() });
    const d   = await res.json();
    setFans(d.fans || []);
  };

  useEffect(() => { fetchTiers(); fetchFans(); }, [creatorId]);

  const createTier = async () => {
    const perks = form.perks.split('\n').filter(Boolean);
    await fetch(`${BACKEND}/api/fan-subs/tiers`, {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({ ...form, price: parseFloat(form.price), perks })
    });
    setShowForm(false);
    fetchTiers();
  };

  const deleteTier = async (id) => {
    await fetch(`${BACKEND}/api/fan-subs/tiers/${id}`, { method: 'DELETE', headers: hdrs() });
    fetchTiers();
  };

  const S = {
    card:  { background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 20, marginBottom: 12 },
    btn:   { background: 'linear-gradient(135deg,#00ffc8,#00a896)', border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, padding: '8px 18px', cursor: 'pointer', fontSize: '0.82rem' },
    input: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '9px 12px', fontSize: '0.85rem', marginBottom: 10, boxSizing: 'border-box' },
    label: { color: '#8b949e', fontSize: '0.75rem', marginBottom: 4, display: 'block' },
  };

  return (
    <div style={{ color: '#e6edf3' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#00ffc8' }}>💎 Fan Subscription Tiers</div>
          <div style={{ color: '#5a7088', fontSize: '0.8rem' }}>{fans.length} active fans</div>
        </div>
        <button style={S.btn} onClick={() => setShowForm(!showForm)}>+ New Tier</button>
      </div>

      {showForm && (
        <div style={{ ...S.card, border: '1px solid #00ffc840', marginBottom: 20 }}>
          <label style={S.label}>Tier Name</label>
          <input style={S.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Super Fan" />
          <label style={S.label}>Monthly Price ($)</label>
          <input style={S.input} type="number" min="1" max="100" value={form.price}
            onChange={e => setForm({...form, price: e.target.value})} />
          <label style={S.label}>Description</label>
          <input style={S.input} value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            placeholder="What do fans get?" />
          <label style={S.label}>Perks (one per line)</label>
          <textarea style={{...S.input, minHeight: 70, resize: 'vertical'}}
            value={form.perks} onChange={e => setForm({...form, perks: e.target.value})}
            placeholder={"Early access to new music\nExclusive behind-the-scenes\nMonthly shoutout"} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={S.btn} onClick={createTier}>Create Tier</button>
            <button style={{...S.btn, background:'#21262d', color:'#e6edf3'}} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {tiers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#5a7088' }}>
          No tiers yet. Create one to start earning from your fans.
        </div>
      ) : tiers.map(t => (
        <div key={t.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#e6edf3' }}>{t.name}</div>
              <div style={{ color: '#00ffc8', fontWeight: 800, fontSize: '1.1rem' }}>${t.price}/mo</div>
              {t.description && <div style={{ color: '#8b949e', fontSize: '0.82rem', marginTop: 4 }}>{t.description}</div>}
              {t.perks?.length > 0 && (
                <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', color: '#8b949e', fontSize: '0.8rem' }}>
                  {t.perks.map((p, i) => <li key={i}>✓ {p}</li>)}
                </ul>
              )}
            </div>
            <button onClick={() => deleteTier(t.id)}
              style={{ background: 'none', border: '1px solid rgba(229,57,53,0.3)', borderRadius: 6, color: '#e53935', fontSize: '0.72rem', padding: '4px 10px', cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {fans.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 12 }}>👥 Your Fans</div>
          {fans.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #21262d' }}>
              <img src={f.fan?.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${f.fan?.username}`}
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>@{f.fan?.username}</div>
                <div style={{ color: '#5a7088', fontSize: '0.75rem' }}>{f.tier?.name} · since {new Date(f.since).toLocaleDateString()}</div>
              </div>
              <div style={{ color: '#00ffc8', fontWeight: 700, fontSize: '0.85rem' }}>${f.tier?.price}/mo</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fan side: subscribe to a creator ──
export function FanSubscribeWidget({ creatorId, creatorName }) {
  const [tiers, setTiers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch(`${BACKEND}/api/fan-subs/tiers/${creatorId}`)
      .then(r => r.json()).then(d => { setTiers(Array.isArray(d) ? d : []); setLoading(false); });
  }, [creatorId]);

  const subscribe = async (tier) => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Please log in to subscribe');
    const res = await fetch(`${BACKEND}/api/fan-subs/subscribe`, {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({ tier_id: tier.id })
    });
    const d = await res.json();
    if (d.success) setSuccess(`Subscribed to ${tier.name}!`);
    else alert(d.error || 'Subscription failed');
  };

  if (loading) return null;
  if (tiers.length === 0) return null;

  return (
    <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 20 }}>
      <div style={{ fontWeight: 700, color: '#e6edf3', marginBottom: 16 }}>💎 Support {creatorName}</div>
      {success ? (
        <div style={{ color: '#00ffc8', textAlign: 'center', padding: 16 }}>✅ {success}</div>
      ) : tiers.map(t => (
        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #21262d' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#e6edf3' }}>{t.name}</div>
            {t.description && <div style={{ color: '#8b949e', fontSize: '0.78rem' }}>{t.description}</div>}
          </div>
          <button onClick={() => subscribe(t)}
            style={{ background: 'linear-gradient(135deg,#00ffc8,#00a896)', border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, padding: '7px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ${t.price}/mo
          </button>
        </div>
      ))}
    </div>
  );
}
