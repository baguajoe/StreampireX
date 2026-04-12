// =============================================================================
// BecomeASeller.js — Seller Onboarding Flow
// =============================================================================
// Route: /become-a-seller
// 3 steps: 1) Choose store types  2) Profile setup  3) Connect Stripe
// =============================================================================

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

const STORE_TYPES = [
  { id:'beats',     icon:'🥁', label:'Beat Producer',         desc:'Sell beats with licensing tiers (Basic, Premium, Exclusive)',         upload:'MP3, WAV, ZIP' },
  { id:'stems',     icon:'🎵', label:'Stem Seller',            desc:'Sell stem packs and isolated tracks to producers',                    upload:'WAV, ZIP' },
  { id:'plugins',   icon:'🔌', label:'Plugin Developer',       desc:'Sell VST, WAM, VFX plugins, Blender addons, presets, LUTs',          upload:'ZIP, DLL, JS' },
  { id:'3d_assets', icon:'🧊', label:'3D Asset Creator',       desc:'Sell 3D models, rigs, textures, HDRI (GLB, OBJ, FBX, Blend)',        upload:'GLB, OBJ, ZIP' },
  { id:'vfx',       icon:'🎬', label:'VFX / Motion Creator',   desc:'Sell After Effects templates, motion graphics, LUTs, transitions',   upload:'ZIP, AEP, CUBE' },
  { id:'digital',   icon:'💾', label:'Digital Creator',        desc:'Sell any downloadable: sample packs, presets, PDFs, art files',      upload:'Any file type' },
  { id:'merch',     icon:'👕', label:'Merch Creator',          desc:'Design and sell print-on-demand merch. We handle printing + shipping.', upload:'PNG, JPG, SVG' },
  { id:'physical',  icon:'🏪', label:'Physical Seller',        desc:'Sell physical items you ship yourself. Like Etsy.',                  upload:'JPG, PNG (product photos)' },
];

const S = {
  page:     { minHeight:'100vh', background:'#06060f', color:'#e0e0e0', fontFamily:'JetBrains Mono, monospace', padding:'40px 20px' },
  container:{ maxWidth:'100%', margin:0 },
  header:   { textAlign:'center', marginBottom:40 },
  title:    { fontSize:28, fontWeight:700, color:'#00ffc8', marginBottom:8 },
  subtitle: { color:'#888', fontSize:14 },
  steps:    { display:'flex', justifyContent:'center', gap:8, marginBottom:40 },
  step:     (active, done) => ({
    display:'flex', alignItems:'center', gap:6, padding:'6px 16px',
    borderRadius:20, border:`1px solid ${done ? '#00ffc8' : active ? '#00ffc8' : '#333'}`,
    background: done ? 'rgba(0,255,200,0.1)' : active ? 'rgba(0,255,200,0.06)' : 'transparent',
    color: done ? '#00ffc8' : active ? '#00ffc8' : '#555', fontSize:12,
  }),
  card:     { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:12, padding:24, marginBottom:16 },
  grid:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  typeCard: (sel) => ({
    background: sel ? 'rgba(0,255,200,0.08)' : '#080810',
    border: `2px solid ${sel ? '#00ffc8' : '#1a1a2e'}`,
    borderRadius:10, padding:16, cursor:'pointer',
    transition:'all 0.15s',
  }),
  typeIcon: { fontSize:28, marginBottom:8 },
  typeLabel:{ fontWeight:700, fontSize:13, color:'#e0e0e0', marginBottom:4 },
  typeDesc: { fontSize:10, color:'#666', lineHeight:1.5 },
  typeUpload:{ fontSize:9, color:'#00ffc8', marginTop:6 },
  check:    { float:'right', fontSize:16, color:'#00ffc8' },
  input:    { width:'100%', background:'#0a0a14', border:'1px solid #333', borderRadius:6,
              color:'#e0e0e0', padding:'10px 12px', fontSize:13, fontFamily:'JetBrains Mono, monospace',
              boxSizing:'border-box', marginBottom:12 },
  textarea: { width:'100%', background:'#0a0a14', border:'1px solid #333', borderRadius:6,
              color:'#e0e0e0', padding:'10px 12px', fontSize:13, fontFamily:'JetBrains Mono, monospace',
              boxSizing:'border-box', marginBottom:12, minHeight:100, resize:'vertical' },
  label:    { fontSize:11, color:'#888', marginBottom:4, display:'block' },
  btn:      (c='#00ffc8') => ({
    padding:'12px 32px', border:`1px solid ${c}`, borderRadius:6,
    background:`${c}18`, color:c, cursor:'pointer', fontSize:14,
    fontFamily:'JetBrains Mono, monospace', fontWeight:700,
  }),
  btnRow:   { display:'flex', justifyContent:'space-between', marginTop:24, gap:12 },
  status:   { color:'#FF6600', fontSize:12, marginTop:8, textAlign:'center' },
  stripeCard:{ background:'#0a0a14', border:'1px solid #635bff44', borderRadius:10, padding:24, textAlign:'center' },
  stripeTitle:{ fontSize:18, fontWeight:700, color:'#635bff', marginBottom:8 },
  successCard:{ background:'rgba(0,255,200,0.06)', border:'1px solid #00ffc8', borderRadius:12,
               padding:32, textAlign:'center' },
};

export default function BecomeASeller() {
  const { store } = useContext(Context);
  const navigate  = useNavigate();
  const [step,         setStep]         = useState(1);
  const [selected,     setSelected]     = useState([]);
  const [displayName,  setDisplayName]  = useState('');
  const [bio,          setBio]          = useState('');
  const [avatarUrl,    setAvatarUrl]    = useState('');
  const [bannerUrl,    setBannerUrl]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [status,       setStatus]       = useState('');
  const [stripeStatus, setStripeStatus] = useState(false);
  const [done,         setDone]         = useState(false);

  const token = localStorage.getItem('token') || localStorage.getItem('jwt-token');

  // check if already onboarded
  useEffect(() => {
    const check = async () => {
      const res = await fetch(`${BACKEND}/api/seller/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.onboarding_complete) {
        navigate('/seller-dashboard');
      }
    };
    if (token) check();
  }, []);

  const toggleType = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleStep1 = () => {
    if (!selected.length) { setStatus('Select at least one store type'); return; }
    setStatus('');
    setStep(2);
  };

  const handleStep2 = async () => {
    if (!displayName.trim()) { setStatus('Enter a display name'); return; }
    setLoading(true);
    setStatus('Creating seller profile…');
    try {
      const res = await fetch(`${BACKEND}/api/seller/onboard`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_types:  selected,
          display_name: displayName,
          bio,
          avatar_url:   avatarUrl,
          banner_url:   bannerUrl,
        })
      });
      const data = await res.json();
      if (!res.ok) { setStatus(data.error || 'Failed'); setLoading(false); return; }
      setStatus('');
      setStep(3);
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  };

  const handleStripeConnect = async () => {
    setLoading(true);
    setStatus('Connecting to Stripe…');
    try {
      const res  = await fetch(`${BACKEND}/api/seller/stripe-connect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatus(data.error || 'Stripe connect failed');
      }
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  };

  const handleSkipStripe = () => {
    setDone(true);
  };

  const handleFinish = () => {
    navigate('/seller-dashboard');
  };

  if (done) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.successCard}>
            <div style={{ fontSize:48, marginBottom:16 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:700, color:'#00ffc8', marginBottom:8 }}>You're a Seller!</div>
            <div style={{ color:'#888', fontSize:14, marginBottom:24 }}>
              Your store is live. Connect Stripe anytime from your Seller Dashboard to start receiving payouts.
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              {selected.map(id => {
                const t = STORE_TYPES.find(s => s.id === id);
                return t ? (
                  <div key={id} style={{ background:'rgba(0,255,200,0.08)', border:'1px solid #00ffc844',
                    borderRadius:8, padding:'8px 16px', fontSize:12, color:'#00ffc8' }}>
                    {t.icon} {t.label}
                  </div>
                ) : null;
              })}
            </div>
            <div style={{ marginTop:24 }}>
              <button style={S.btn()} onClick={handleFinish}>Go to Seller Dashboard →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.title}>🛍️ Become a Seller</div>
          <div style={S.subtitle}>Set up your store and start earning. Keep 90% of every sale.</div>
        </div>

        {/* Step indicators */}
        <div style={S.steps}>
          {[
            { n:1, label:'Choose Stores' },
            { n:2, label:'Your Profile'  },
            { n:3, label:'Get Paid'      },
          ].map(({ n, label }) => (
            <div key={n} style={S.step(step === n, step > n)}>
              <span>{step > n ? '✓' : n}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* ── STEP 1: Choose store types ── */}
        {step === 1 && (
          <div style={S.card}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>What will you sell?</div>
            <div style={{ color:'#888', fontSize:12, marginBottom:20 }}>Select all that apply. You can add more later.</div>
            <div style={S.grid}>
              {STORE_TYPES.map(t => (
                <div key={t.id} style={S.typeCard(selected.includes(t.id))} onClick={() => toggleType(t.id)}>
                  {selected.includes(t.id) && <span style={S.check}>✓</span>}
                  <div style={S.typeIcon}>{t.icon}</div>
                  <div style={S.typeLabel}>{t.label}</div>
                  <div style={S.typeDesc}>{t.desc}</div>
                  <div style={S.typeUpload}>📁 {t.upload}</div>
                </div>
              ))}
            </div>
            {status && <div style={S.status}>{status}</div>}
            <div style={{ ...S.btnRow, justifyContent:'flex-end' }}>
              <button style={S.btn()} onClick={handleStep1}>
                Continue ({selected.length} selected) →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Profile setup ── */}
        {step === 2 && (
          <div style={S.card}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Set up your seller profile</div>

            <label style={S.label}>Display Name *</label>
            <input
              style={S.input}
              placeholder="Your store name or artist name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />

            <label style={S.label}>Bio</label>
            <textarea
              style={S.textarea}
              placeholder="Tell buyers about yourself and what you sell…"
              value={bio}
              onChange={e => setBio(e.target.value)}
            />

            <label style={S.label}>Profile Photo URL (optional)</label>
            <input
              style={S.input}
              placeholder="https://..."
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
            />

            <label style={S.label}>Banner Image URL (optional)</label>
            <input
              style={S.input}
              placeholder="https://..."
              value={bannerUrl}
              onChange={e => setBannerUrl(e.target.value)}
            />

            {status && <div style={S.status}>{status}</div>}
            <div style={S.btnRow}>
              <button style={S.btn('#555')} onClick={() => setStep(1)}>← Back</button>
              <button style={S.btn()} onClick={handleStep2} disabled={loading}>
                {loading ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Stripe Connect ── */}
        {step === 3 && (
          <div style={S.card}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Connect Stripe to receive payouts</div>

            <div style={S.stripeCard}>
              <div style={S.stripeTitle}>💳 Stripe Connect</div>
              <div style={{ color:'#888', fontSize:13, marginBottom:20, lineHeight:1.6 }}>
                StreamPireX uses Stripe to send you your earnings directly.<br/>
                You keep <strong style={{ color:'#00ffc8' }}>90%</strong> of every sale. Payouts go straight to your bank account.
              </div>
              <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                <button style={S.btn('#635bff')} onClick={handleStripeConnect} disabled={loading}>
                  {loading ? 'Connecting…' : '🔗 Connect Stripe'}
                </button>
                <button style={S.btn('#555')} onClick={handleSkipStripe}>
                  Skip for now
                </button>
              </div>
              <div style={{ color:'#555', fontSize:10, marginTop:12 }}>
                You can connect Stripe anytime from your Seller Dashboard
              </div>
            </div>

            {status && <div style={S.status}>{status}</div>}
            <div style={{ ...S.btnRow, justifyContent:'flex-start', marginTop:16 }}>
              <button style={S.btn('#555')} onClick={() => setStep(2)}>← Back</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
