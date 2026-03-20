import React, { useEffect, useState } from "react";
import { BackendURL } from "../component/backendURL";

export default function AICreditLedger() {
  const token = localStorage.getItem("token");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [featureFilter, setFeatureFilter] = useState("");

  const loadRows = async () => {
    try {
      setLoading(true);
      setMsg("");
      const qs = new URLSearchParams();
      qs.set("per_page", "100");
      if (typeFilter) qs.set("type", typeFilter);
      if (featureFilter) qs.set("feature", featureFilter);

      const res = await fetch(`${BackendURL}/api/advanced-ai/credit-transactions?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load credit ledger");
      setRows(data.transactions || []);
    } catch (e) {
      console.error(e);
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [typeFilter, featureFilter]);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.head}>
          <div>
            <h1 style={S.title}>AI Credit Ledger</h1>
            <p style={S.sub}>Every purchase, deduction, refund, and grant tied to AI usage.</p>
          </div>
          <button onClick={loadRows} style={S.refreshBtn}>Refresh</button>
        </div>

        <div style={S.filters}>
          <select style={S.input} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="deduct">Deduct</option>
            <option value="refund">Refund</option>
            <option value="grant">Grant</option>
          </select>

          <select style={S.input} value={featureFilter} onChange={(e) => setFeatureFilter(e.target.value)}>
            <option value="">All Features</option>
            <option value="ai_video">AI Video</option>
            <option value="avatar_clip">Avatar Clip</option>
            <option value="hybrid_compose">Hybrid Compose</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {loading ? (
          <div style={S.empty}>Loading credit transactions...</div>
        ) : rows.length === 0 ? (
          <div style={S.empty}>No credit transactions yet.</div>
        ) : (
          <div style={S.cards}>
            {rows.map((r) => (
              <div key={r.id} style={S.card}>
                <div style={S.row}>
                  <div>
                    <div style={S.cardTitle}>{r.transaction_type} • {r.feature || "—"}</div>
                    <div style={S.meta}>{r.created_at || "—"}</div>
                  </div>
                  <div style={{
                    ...S.amount,
                    color: r.amount > 0 ? "#00ffc8" : r.amount < 0 ? "#ff9f9f" : "#dce7ee"
                  }}>
                    {r.amount > 0 ? `+${r.amount}` : r.amount}
                  </div>
                </div>

                <div style={S.info}><strong>Balance After:</strong> {r.balance_after ?? "—"}</div>
                <div style={S.info}><strong>Description:</strong> {r.description || "—"}</div>
                <div style={S.info}><strong>Reference:</strong> {r.reference_type || "—"} #{r.reference_id ?? "—"}</div>

                {r.metadata_json && Object.keys(r.metadata_json).length > 0 && (
                  <pre style={S.metaBox}>{JSON.stringify(r.metadata_json, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}

        {!!msg && <div style={S.msg}>{msg}</div>}
      </div>
    </div>
  );
}

const S = {
  page: { background: "#0b1118", minHeight: "100vh", padding: 24, color: "#eaf3f8" },
  wrap: { maxWidth: 1200, margin: "0 auto" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 },
  title: { margin: 0 },
  sub: { margin: "6px 0 0", color: "#86a0b1" },
  refreshBtn: { background: "#00ffc8", color: "#04211a", border: "none", borderRadius: 10, padding: "11px 14px", fontWeight: 800, cursor: "pointer" },
  filters: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  input: { padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.09)", background: "#0d141d", color: "#eaf3f8" },
  empty: { padding: 18, borderRadius: 14, background: "#111a24", border: "1px solid rgba(255,255,255,0.06)" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 },
  card: { background: "#111a24", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  cardTitle: { fontWeight: 800, textTransform: "capitalize" },
  meta: { color: "#8ba2b0", fontSize: "0.8rem", marginTop: 4 },
  amount: { fontWeight: 900, fontSize: "1rem" },
  info: { marginTop: 10, color: "#dce7ee", fontSize: "0.84rem" },
  metaBox: { marginTop: 10, background: "#0d141d", color: "#9ec4d6", padding: 12, borderRadius: 10, fontSize: "0.72rem", overflowX: "auto" },
  msg: { marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)" }
};
