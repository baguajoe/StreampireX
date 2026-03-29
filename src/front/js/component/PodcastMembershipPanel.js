// =============================================================================
// PodcastMembershipPanel.js — Patreon-style membership tiers for podcasts
// Creator sets tiers (Free/Supporter/Premium/VIP), listeners subscribe via Stripe
// =============================================================================

import React, { useState, useEffect } from "react";
import { showToast } from "../utils/toast";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const token = () => localStorage.getItem("token") || sessionStorage.getItem("token");

const DEFAULT_TIERS = [
  { id: "free",      name: "Free",      price: 0,     color: "#5a7088", icon: "🎧", perks: ["Access to all free episodes", "RSS feed access"] },
  { id: "supporter", name: "Supporter", price: 4.99,  color: "#00ffc8", icon: "⭐", perks: ["Ad-free episodes", "Early access (3 days)", "Supporter badge", "Monthly newsletter"] },
  { id: "premium",   name: "Premium",   price: 9.99,  color: "#FF6600", icon: "🔥", perks: ["Everything in Supporter", "Exclusive bonus episodes", "Behind-the-scenes content", "Discord access", "Direct message host"] },
  { id: "vip",       name: "VIP",       price: 24.99, color: "#ff44aa", icon: "👑", perks: ["Everything in Premium", "Monthly 1:1 call with host", "Name in episode credits", "Early show recordings", "Signed merchandise discount"] },
];

// ── Creator view: manage tiers ────────────────────────────────────────────────
function TierEditor({ tier, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tier.name);
  const [price, setPrice] = useState(tier.price);
  const [perks, setPerks] = useState(tier.perks.join("\n"));
  const [icon, setIcon] = useState(tier.icon);

  const save = () => {
    onSave({ ...tier, name, price: parseFloat(price), perks: perks.split("\n").filter(Boolean), icon });
    setEditing(false);
  };

  const S = {
    card: { border: `1px solid ${tier.color}44`, borderRadius: 8, padding: 12, background: "#0a0a14", marginBottom: 8 },
    btn: (col) => ({ padding: "4px 10px", border: `1px solid ${col}44`, borderRadius: 3, background: `${col}11`, color: col, cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono,monospace" }),
    inp: { background: "#06060f", border: "1px solid #1a2a3a", borderRadius: 3, color: "#ccc", padding: "4px 8px", fontSize: 11, fontFamily: "JetBrains Mono,monospace", width: "100%", boxSizing: "border-box" },
  };

  if (!editing) return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{tier.icon}</span>
        <span style={{ color: tier.color, fontWeight: 700, fontSize: 13 }}>{tier.name}</span>
        <span style={{ color: "#00ffc8", fontWeight: 700, marginLeft: "auto" }}>${tier.price}/mo</span>
        <button style={S.btn("#5a7088")} onClick={() => setEditing(true)}>Edit</button>
        {tier.id !== "free" && <button style={S.btn("#ff4444")} onClick={() => onDelete(tier.id)}>×</button>}
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, color: "#5a7088" }}>
        {tier.perks.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  );

  return (
    <div style={S.card}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        <div><div style={{ fontSize: 9, color: "#5a7088", marginBottom: 2 }}>Tier Name</div><input style={S.inp} value={name} onChange={e => setName(e.target.value)} /></div>
        <div><div style={{ fontSize: 9, color: "#5a7088", marginBottom: 2 }}>Monthly Price ($)</div><input style={S.inp} type="number" min={0} step={0.99} value={price} onChange={e => setPrice(e.target.value)} /></div>
      </div>
      <div style={{ marginBottom: 6 }}><div style={{ fontSize: 9, color: "#5a7088", marginBottom: 2 }}>Perks (one per line)</div><textarea style={{ ...S.inp, minHeight: 60, resize: "vertical" }} value={perks} onChange={e => setPerks(e.target.value)} /></div>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={S.btn("#00ffc8")} onClick={save}>✓ Save</button>
        <button style={S.btn("#5a7088")} onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}

// ── Listener view: subscribe to tier ─────────────────────────────────────────
function TierCard({ tier, currentTier, podcastId, onSubscribe }) {
  const [loading, setLoading] = useState(false);
  const isActive = currentTier === tier.id;

  const subscribe = async () => {
    if (tier.price === 0) { onSubscribe(tier); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/podcast/${podcastId}/membership/subscribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tier.id, price: tier.price }),
      });
      const d = await r.json();
      if (d.checkout_url) window.location.href = d.checkout_url;
      else if (d.success) { showToast.success(`Subscribed to ${tier.name}!`); onSubscribe(tier); }
      else showToast.error(d.error || "Subscription failed");
    } catch { showToast.error("Network error"); }
    setLoading(false);
  };

  return (
    <div style={{
      border: `2px solid ${isActive ? tier.color : tier.color + "44"}`,
      borderRadius: 10, padding: 16, background: isActive ? `${tier.color}11` : "#0a0a14",
      display: "flex", flexDirection: "column", gap: 8, position: "relative",
    }}>
      {isActive && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: tier.color, color: "#000", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 10 }}>CURRENT PLAN</div>}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28 }}>{tier.icon}</div>
        <div style={{ color: tier.color, fontWeight: 700, fontSize: 14 }}>{tier.name}</div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "4px 0" }}>
          {tier.price === 0 ? "Free" : `$${tier.price}`}
          {tier.price > 0 && <span style={{ fontSize: 11, color: "#5a7088", fontWeight: 400 }}>/month</span>}
        </div>
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, color: "#ccc", flex: 1 }}>
        {tier.perks.map((p, i) => <li key={i} style={{ marginBottom: 3 }}>✓ {p}</li>)}
      </ul>
      <button
        onClick={subscribe}
        disabled={isActive || loading}
        style={{
          padding: "8px 0", border: `1px solid ${tier.color}`, borderRadius: 4,
          background: isActive ? `${tier.color}33` : `${tier.color}22`, color: tier.color,
          cursor: isActive ? "default" : "pointer", fontWeight: 700, fontSize: 11,
          fontFamily: "JetBrains Mono,monospace", opacity: loading ? 0.6 : 1,
        }}>
        {loading ? "Processing..." : isActive ? "✓ Subscribed" : tier.price === 0 ? "Get Started Free" : `Subscribe — $${tier.price}/mo`}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PodcastMembershipPanel({ podcastId, isOwner, currentUserId }) {
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [currentTier, setCurrentTier] = useState("free");
  const [memberCount, setMemberCount] = useState({ free: 0, supporter: 0, premium: 0, vip: 0 });
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembershipData();
  }, [podcastId]);

  const fetchMembershipData = async () => {
    try {
      const r = await fetch(`${BACKEND}/api/podcast/${podcastId}/membership`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (r.ok) {
        const d = await r.json();
        if (d.tiers) setTiers(d.tiers);
        if (d.current_tier) setCurrentTier(d.current_tier);
        if (d.member_counts) setMemberCount(d.member_counts);
        if (d.monthly_revenue !== undefined) setMonthlyRevenue(d.monthly_revenue);
      }
    } catch {}
    setLoading(false);
  };

  const saveTiers = async (newTiers) => {
    setTiers(newTiers);
    try {
      await fetch(`${BACKEND}/api/podcast/${podcastId}/membership/tiers`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tiers: newTiers }),
      });
      showToast.success("Membership tiers saved");
    } catch { showToast.error("Failed to save tiers"); }
  };

  const updateTier = (updated) => saveTiers(tiers.map(t => t.id === updated.id ? updated : t));
  const deleteTier = (id) => saveTiers(tiers.filter(t => t.id !== id));
  const addTier = () => {
    const newTier = { id: `tier_${Date.now()}`, name: "New Tier", price: 14.99, color: "#aa44ff", icon: "💎", perks: ["Exclusive content"] };
    saveTiers([...tiers, newTier]);
  };

  const S = {
    wrap: { fontFamily: "JetBrains Mono,monospace", fontSize: 11 },
    header: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 },
    stat: { background: "#0a0a14", border: "1px solid #1a2a3a", borderRadius: 6, padding: 10, textAlign: "center" },
  };

  if (loading) return <div style={{ padding: 20, color: "#5a7088", fontFamily: "JetBrains Mono,monospace" }}>Loading membership...</div>;

  return (
    <div style={S.wrap}>
      {/* Owner analytics */}
      {isOwner && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "#5a7088", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Membership Overview</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
            {tiers.map(t => (
              <div key={t.id} style={S.stat}>
                <div style={{ fontSize: 18 }}>{t.icon}</div>
                <div style={{ color: t.color, fontWeight: 700, fontSize: 12 }}>{t.name}</div>
                <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>{memberCount[t.id] || 0}</div>
                <div style={{ color: "#5a7088", fontSize: 9 }}>members</div>
              </div>
            ))}
          </div>
          <div style={{ ...S.stat, background: "#00ffc811", border: "1px solid #00ffc8", marginBottom: 16 }}>
            <div style={{ color: "#00ffc8", fontWeight: 700, fontSize: 18 }}>${monthlyRevenue.toFixed(2)}/mo</div>
            <div style={{ color: "#5a7088", fontSize: 10 }}>Monthly Recurring Revenue</div>
          </div>
          <div style={{ fontSize: 9, color: "#5a7088", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Manage Tiers</div>
          {tiers.map(t => <TierEditor key={t.id} tier={t} onSave={updateTier} onDelete={deleteTier} />)}
          <button onClick={addTier} style={{ padding: "6px 14px", border: "1px solid #00ffc844", borderRadius: 4, background: "#00ffc811", color: "#00ffc8", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>
            + Add Tier
          </button>
        </div>
      )}

      {/* Listener view */}
      {!isOwner && (
        <>
          <div style={{ ...S.header, marginBottom: 12 }}>
            <span style={{ color: "#00ffc8", fontWeight: 700, fontSize: 13 }}>Support This Podcast</span>
          </div>
          <div style={S.grid}>
            {tiers.map(t => (
              <TierCard key={t.id} tier={t} currentTier={currentTier} podcastId={podcastId}
                onSubscribe={(tier) => setCurrentTier(tier.id)} />
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 9, color: "#5a7088", textAlign: "center" }}>
            Billed monthly. Cancel anytime. StreamPireX keeps 10% to power the platform.
          </div>
        </>
      )}
    </div>
  );
}
