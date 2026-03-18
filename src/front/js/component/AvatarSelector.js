import React from "react";

const AVATARS = [
  { id: "ava_neo_m1",  name: "Neo Mentor",     tier: "starter", style: "Business",  gender: "Male",    thumb: "🧑🏽‍💼" },
  { id: "ava_neo_f1",  name: "Nova Coach",     tier: "starter", style: "Business",  gender: "Female",  thumb: "👩🏽‍💼" },
  { id: "ava_edu_n1",  name: "Echo Teacher",   tier: "starter", style: "Educator",  gender: "Neutral", thumb: "🧑🏿‍🏫" },
  { id: "ava_host_m2", name: "Atlas Host",     tier: "creator", style: "Presenter", gender: "Male",    thumb: "🧔🏻" },
  { id: "ava_host_f2", name: "Lyra Host",      tier: "creator", style: "Presenter", gender: "Female",  thumb: "👩🏻" },
  { id: "ava_fit_m1",  name: "Pulse Trainer",  tier: "creator", style: "Fitness",   gender: "Male",    thumb: "🏋🏽‍♂️" },
  { id: "ava_fit_f1",  name: "Zen Coach",      tier: "creator", style: "Fitness",   gender: "Female",  thumb: "🧘🏽‍♀️" },
  { id: "ava_tech_n1", name: "Byte Guide",     tier: "creator", style: "Tech",      gender: "Neutral", thumb: "🧑🏾‍💻" },
  { id: "ava_corp_m1", name: "Summit Exec",    tier: "pro",     style: "Corporate", gender: "Male",    thumb: "🕴🏽" },
  { id: "ava_corp_f1", name: "Sage Director",  tier: "pro",     style: "Corporate", gender: "Female",  thumb: "👩🏾‍💼" },
  { id: "ava_stage_m1",name: "Stage Speaker",  tier: "pro",     style: "Stage",     gender: "Male",    thumb: "🎤" },
  { id: "ava_stage_f1",name: "Spotlight Pro",  tier: "pro",     style: "Stage",     gender: "Female",  thumb: "🎙️" },
];

const tierRank = { free: 0, starter: 1, creator: 2, pro: 3, studio: 4, enterprise: 5 };

export default function AvatarSelector({ tier = "starter", value, onChange }) {
  const currentRank = tierRank[tier] ?? 0;
  const visible = AVATARS.filter(a => (tierRank[a.tier] ?? 0) <= currentRank);

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <h4 style={S.title}>Avatar Choices</h4>
        <span style={S.sub}>{visible.length} available on {tier}</span>
      </div>

      <div style={S.grid}>
        {visible.map((avatar) => {
          const active = value?.id === avatar.id;
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onChange?.(avatar)}
              style={{
                ...S.card,
                ...(active ? S.cardActive : {})
              }}
            >
              <div style={S.emoji}>{avatar.thumb}</div>
              <div style={S.name}>{avatar.name}</div>
              <div style={S.meta}>{avatar.style} • {avatar.gender}</div>
              <div style={S.badge}>{avatar.tier}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const S = {
  wrap: { marginTop: 18, marginBottom: 20 },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12, flexWrap: "wrap" },
  title: { margin: 0, color: "#e8f0f4", fontSize: "0.95rem" },
  sub: { color: "#7a93a3", fontSize: "0.78rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 },
  card: {
    background: "#111822",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    color: "#dbe6ec"
  },
  cardActive: {
    border: "1px solid #00ffc8",
    boxShadow: "0 0 0 1px rgba(0,255,200,0.18) inset",
    background: "rgba(0,255,200,0.06)"
  },
  emoji: { fontSize: "1.9rem", marginBottom: 8 },
  name: { fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 },
  meta: { fontSize: "0.72rem", color: "#7a93a3", marginBottom: 8 },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    color: "#bcd0db",
    fontSize: "0.68rem",
    textTransform: "uppercase"
  }
};
