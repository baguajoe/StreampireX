// =============================================================================
// SellerDashboard.js — Unified Seller Dashboard
// =============================================================================
// Shows all active stores, stats, orders, earnings, quick links
// Redirects to /become-a-seller if not onboarded
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

const S = {
  page:    { minHeight:'100vh', background:'#06060f', color:'#e0e0e0', fontFamily:'JetBrains Mono, monospace', padding:'24px' },
  header:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  title:   { fontSize:22, fontWeight:700, color:'#00ffc8' },
  grid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16, marginBottom:24 },
  stat:    { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:10, padding:20, textAlign:'center' },
  statVal: { fontSize:28, fontWeight:700, color:'#00ffc8' },
  statLbl: { fontSize:11, color:'#888', marginTop:4 },
  section: { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:10, padding:20, marginBottom:16 },
  sTitle:  { fontSize:14, fontWeight:700, color:'#e0e0e0', marginBottom:16 },
  storeGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12 },
  storeCard:{ background:'#080810', border:'1px solid #1a1a2e', borderRadius:8, padding:16, textAlign:'center',
              cursor:'pointer', textDecoration:'none', color:'inherit' },
  storeIcon:{ fontSize:28, marginBottom:8 },
  storeName:{ fontSize:11, color:'#ccc', fontWeight:600 },
  storeLink:{ fontSize:10, color:'#00ffc8', marginTop:4 },
  btn:     (c='#00ffc8') => ({
    padding:'8px 20px', border:`1px solid ${c}`, borderRadius:6,
    background:`${c}12`, color:c, cursor:'pointer', fontSize:11,
    fontFamily:'JetBrains Mono, monospace', textDecoration:'none',
    display:'inline-block',
  }),
  badge:   (c) => ({ padding:'2px 8px', borderRadius:10, background:`${c}22`, color:c, fontSize:9, border:`1px solid ${c}44` }),
  orderRow:{ display:'flex', justifyContent:'space-between', alignItems:'center',
             padding:'10px 0', borderBottom:'1px solid #0d0d1a', fontSize:12 },
  stepCard:{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
             background:'rgba(255,102,0,0.06)', border:'1px solid rgba(255,102,0,0.2)',
             borderRadius:8, marginBottom:8 },
  stripeAlert:{ background:'rgba(99,91,255,0.08)', border:'1px solid #635bff44',
               borderRadius:8, padding:16, marginBottom:16, display:'flex',
               justifyContent:'space-between', alignItems:'center' },
};

const STATUS_COLORS = {
  pending:   '#FF6600',
  completed: '#00ffc8',
  shipped:   '#635bff',
  cancelled: '#ff4444',
};

// =============================================================================
// MC-4: StorefrontOrdersTab - inline component for SellerDashboard
// Lists creator's incoming StorefrontOrder rows + ship/refund actions.
// Note: backend /api/storefront/orders/by-creator endpoint pending (MC-5);
// currently fetches /orders/me as placeholder.
// =============================================================================
const StorefrontOrdersTab = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [oLoading, setOLoading] = useState(true);
  const [err, setErr] = useState("");
  const [shipModal, setShipModal] = useState(null);
  const [shipTracking, setShipTracking] = useState("");
  const [shipCarrier, setShipCarrier] = useState("");
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [actioning, setActioning] = useState(false);

  const fetchOrders = async () => {
    setOLoading(true);
    setErr("");
    try {
      const res = await fetch(`${BACKEND}/api/storefront/orders/me?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load orders (${res.status})`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setOLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleShip = async () => {
    if (!shipTracking.trim() || !shipCarrier.trim()) {
      setErr("Tracking number and carrier are required");
      return;
    }
    setActioning(true);
    try {
      const res = await fetch(`${BACKEND}/api/storefront/orders/${shipModal.orderId}/ship`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tracking_number: shipTracking, carrier: shipCarrier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ship failed");
      setShipModal(null); setShipTracking(""); setShipCarrier("");
      fetchOrders();
    } catch (e) { setErr(e.message); } finally { setActioning(false); }
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) { setErr("Refund reason required"); return; }
    setActioning(true);
    try {
      const res = await fetch(`${BACKEND}/api/storefront/orders/${refundModal.orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancellation_reason: refundReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");
      setRefundModal(null); setRefundReason("");
      fetchOrders();
    } catch (e) { setErr(e.message); } finally { setActioning(false); }
  };

  const inputStyle = { width:"100%", padding:"8px 10px", background:"#080810",
    border:"1px solid #1a1a2e", borderRadius:4, color:"#e0e0e0",
    fontFamily:"inherit", fontSize:12, boxSizing:"border-box", marginBottom:8 };

  if (oLoading) return <div style={S.section}>Loading orders...</div>;

  return (
    <div style={S.section}>
      <div style={S.sTitle}>📦 Storefront Orders (MC-4)</div>
      {err && <div style={{ background:"rgba(255,80,80,0.1)", border:"1px solid #ff5050", borderRadius:4, padding:"8px 12px", color:"#ff8080", fontSize:11, marginBottom:12 }}>{err}</div>}
      {orders.length === 0 ? (
        <div style={{ color:"#888", fontSize:12, padding:16, textAlign:"center" }}>
          No storefront orders yet. (Backend /orders/by-creator endpoint pending — MC-5.)
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {orders.map((o) => (
            <div key={o.id} style={{ background:"#080810", border:"1px solid #1a1a2e", borderRadius:6, padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#e0e0e0" }}>Order #{o.id}</div>
                  <div style={{ fontSize:10, color:"#888", marginTop:2 }}>
                    {o.fulfillment_type} · qty {o.quantity} · ${parseFloat(o.subtotal).toFixed(2)}
                  </div>
                </div>
                <div style={{ padding:"3px 10px", border:"1px solid #00ffc8", borderRadius:4, color:"#00ffc8", fontSize:10, fontWeight:700 }}>
                  {o.status}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                {o.status === "paid" && o.fulfillment_type === "creator_ship" && (
                  <button style={S.btn("#4a9eff")} onClick={() => setShipModal({ orderId: o.id })}>
                    🚚 Mark Shipped
                  </button>
                )}
                {(o.status === "paid" || o.status === "shipped" || o.status === "delivered") && (
                  <button style={S.btn("#FF6600")} onClick={() => setRefundModal({ orderId: o.id })}>
                    💸 Refund
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {shipModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:10, padding:24, width:400 }}>
            <div style={S.sTitle}>🚚 Mark Order #{shipModal.orderId} Shipped</div>
            <input style={inputStyle} placeholder="Carrier (e.g. USPS, UPS, FedEx)" value={shipCarrier} onChange={(e) => setShipCarrier(e.target.value)} />
            <input style={inputStyle} placeholder="Tracking number" value={shipTracking} onChange={(e) => setShipTracking(e.target.value)} />
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
              <button style={S.btn("#555")} onClick={() => { setShipModal(null); setShipTracking(""); setShipCarrier(""); }} disabled={actioning}>Cancel</button>
              <button style={S.btn("#4a9eff")} onClick={handleShip} disabled={actioning}>{actioning ? "Sending..." : "Confirm Ship"}</button>
            </div>
          </div>
        </div>
      )}

      {refundModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:10, padding:24, width:400 }}>
            <div style={S.sTitle}>💸 Refund Order #{refundModal.orderId}</div>
            <textarea style={{ ...inputStyle, minHeight:80, resize:"vertical" }} placeholder="Reason for refund (required)" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
              <button style={S.btn("#555")} onClick={() => { setRefundModal(null); setRefundReason(""); }} disabled={actioning}>Cancel</button>
              <button style={S.btn("#FF6600")} onClick={handleRefund} disabled={actioning}>{actioning ? "Processing..." : "Confirm Refund"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default function SellerDashboard() {
  const navigate   = useNavigate();
  const [data,     setData]    = useState(null);
  const [orders,   setOrders]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [tab,      setTab]     = useState('overview');

  const token = localStorage.getItem('token') || localStorage.getItem('jwt-token');

  useEffect(() => {
    fetchDashboard();
    fetchOrders();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res  = await fetch(`${BACKEND}/api/seller/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.onboarding_required) {
        navigate('/become-a-seller');
        return;
      }
      setData(json);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const res  = await fetch(`${BACKEND}/api/marketplace/seller/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setOrders(json.orders || []);
      }
    } catch (e) {}
  };

  const handleStripeConnect = async () => {
    const res  = await fetch(`${BACKEND}/api/seller/stripe-connect`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
  };

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#00ffc8' }}>Loading your dashboard…</div>
    </div>
  );

  if (!data) return null;

  const { profile, stats, store_types, next_steps } = data;

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>📊 Seller Dashboard</div>
          <div style={{ color:'#888', fontSize:12, marginTop:2 }}>
            {profile.display_name} · {store_types.length} active store{store_types.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link to="/become-a-seller" style={S.btn('#555')}>+ Add Store Type</Link>
          <Link to="/sales-dashboard" style={S.btn()}>📈 Analytics</Link>
        </div>
      </div>

      {/* Stripe alert */}
      {!profile.stripe_connected && (
        <div style={S.stripeAlert}>
          <div>
            <div style={{ color:'#635bff', fontWeight:700, fontSize:13 }}>💳 Connect Stripe to receive payouts</div>
            <div style={{ color:'#888', fontSize:11, marginTop:2 }}>You won't receive earnings until Stripe is connected</div>
          </div>
          <button style={S.btn('#635bff')} onClick={handleStripeConnect}>Connect Stripe →</button>
        </div>
      )}

      {/* Next steps */}
      {next_steps?.length > 0 && (
        <div style={{ marginBottom:16 }}>
          {next_steps.map((step, i) => (
            <div key={i} style={S.stepCard}>
              <span style={{ color:'#FF6600', fontSize:16 }}>⚠</span>
              <span style={{ fontSize:12, color:'#ccc', flex:1 }}>{step.label}</span>
              {step.action === 'stripe_connect' && (
                <button style={{ ...S.btn('#FF6600'), padding:'4px 12px', fontSize:10 }} onClick={handleStripeConnect}>
                  Connect
                </button>
              )}
              {step.action === 'edit_profile' && (
                <Link to="/settings" style={{ ...S.btn('#FF6600'), padding:'4px 12px', fontSize:10 }}>
                  Edit
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={S.grid}>
        <div style={S.stat}>
          <div style={S.statVal}>${(stats.total_sales || 0).toFixed(2)}</div>
          <div style={S.statLbl}>Total Earnings</div>
        </div>
        <div style={S.stat}>
          <div style={S.statVal}>{stats.total_orders || 0}</div>
          <div style={S.statLbl}>Total Orders</div>
        </div>
        <div style={S.stat}>
          <div style={S.statVal}>{stats.total_products || 0}</div>
          <div style={S.statLbl}>Products Listed</div>
        </div>
        <div style={S.stat}>
          <div style={S.statVal}>{stats.rating ? stats.rating.toFixed(1) : '—'}</div>
          <div style={S.statLbl}>Avg Rating ({stats.review_count || 0} reviews)</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16 }}>
        {['overview','orders','stores','storefront', 'profile'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'6px 16px', borderRadius:6, border:'1px solid',
            borderColor: tab===t ? '#00ffc8' : '#333',
            background: tab===t ? 'rgba(0,255,200,0.1)' : 'transparent',
            color: tab===t ? '#00ffc8' : '#888', cursor:'pointer',
            fontSize:11, fontFamily:'JetBrains Mono, monospace',
            textTransform:'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <>
          {/* Active stores */}
          <div style={S.section}>
            <div style={S.sTitle}>🏪 Your Active Stores</div>
            <div style={S.storeGrid}>
              {store_types.map(st => (
                <Link key={st.id} to={st.route} style={S.storeCard}>
                  <div style={S.storeIcon}>{st.icon}</div>
                  <div style={S.storeName}>{st.label}</div>
                  <div style={S.storeLink}>Manage →</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent orders */}
          <div style={S.section}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={S.sTitle}>📦 Recent Orders</div>
              <button style={{ ...S.btn('#555'), padding:'4px 12px', fontSize:10 }} onClick={() => setTab('orders')}>
                View All
              </button>
            </div>
            {orders.slice(0,5).map((order, i) => (
              <div key={i} style={S.orderRow}>
                <div>
                  <div style={{ fontSize:12, color:'#e0e0e0' }}>{order.product_name || 'Order #' + order.id}</div>
                  <div style={{ fontSize:10, color:'#666' }}>{order.buyer_name || 'Buyer'}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'#00ffc8', fontWeight:700 }}>${(order.amount || 0).toFixed(2)}</div>
                  <span style={S.badge(STATUS_COLORS[order.status] || '#888')}>{order.status || 'pending'}</span>
                </div>
              </div>
            ))}
            {!orders.length && <div style={{ color:'#555', fontSize:12 }}>No orders yet — share your store to get your first sale!</div>}
          </div>
        </>
      )}

      {/* ── Orders tab ── */}
      {tab === 'orders' && (
        <div style={S.section}>
          <div style={S.sTitle}>📦 All Orders</div>
          {orders.map((order, i) => (
            <div key={i} style={S.orderRow}>
              <div>
                <div style={{ fontSize:12, color:'#e0e0e0' }}>{order.product_name || 'Order #' + order.id}</div>
                <div style={{ fontSize:10, color:'#666' }}>{order.buyer_name} · {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</div>
                {order.tracking_number && (
                  <div style={{ fontSize:10, color:'#635bff' }}>📦 Tracking: {order.tracking_number} ({order.carrier})</div>
                )}
              </div>
              <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                <div style={{ color:'#00ffc8', fontWeight:700 }}>${(order.amount || 0).toFixed(2)}</div>
                <span style={S.badge(STATUS_COLORS[order.status] || '#888')}>{order.status || 'pending'}</span>
              </div>
            </div>
          ))}
          {!orders.length && <div style={{ color:'#555', fontSize:12 }}>No orders yet.</div>}
        </div>
      )}

      {/* ── Stores tab ── */}
      {tab === 'stores' && (
        <div style={S.section}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={S.sTitle}>🏪 Manage Your Stores</div>
            <Link to="/become-a-seller" style={S.btn()}>+ Add Store Type</Link>
          </div>
          {store_types.map(st => (
            <div key={st.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'12px 0', borderBottom:'1px solid #0d0d1a' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:22 }}>{st.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{st.label}</div>
                  <div style={{ fontSize:10, color:'#666' }}>📁 Accepts: {st.upload_types?.join(', ')}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Link to={st.route} style={S.btn()}>Manage →</Link>
                <Link to={st.browse} style={S.btn('#555')}>Browse</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Profile tab ── */}
            {/* MC-4: Storefront orders tab (StorefrontOrder shipping/refund management) */}
      {tab === 'storefront' && (
        <StorefrontOrdersTab token={localStorage.getItem('token')} />
      )}

      {tab === 'profile' && (
        <div style={S.section}>
          <div style={S.sTitle}>👤 Seller Profile</div>
          <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
            {profile.avatar_url && (
              <img src={profile.avatar_url} alt="avatar"
                style={{ width:80, height:80, borderRadius:'50%', border:'2px solid #00ffc8', objectFit:'cover' }}/>
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:700, color:'#00ffc8' }}>{profile.display_name}</div>
              <div style={{ color:'#888', fontSize:12, marginTop:4, lineHeight:1.6 }}>{profile.bio || 'No bio yet'}</div>
              <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
                {(profile.store_types || []).map(id => {
                  const icons = { beats:'🥁', stems:'🎵', plugins:'🔌', '3d_assets':'🧊', vfx:'🎬', digital:'💾', merch:'👕', physical:'🏪' };
                  return (
                    <span key={id} style={S.badge('#00ffc8')}>{icons[id] || '🛒'} {id}</span>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ marginTop:16 }}>
            <Link to="/settings" style={S.btn()}>Edit Profile →</Link>
          </div>
        </div>
      )}

    </div>
  );
}
