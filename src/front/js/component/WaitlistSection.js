import React, { useState } from "react";

const WaitlistSection = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(null);

  const handleJoin = async () => {
    if (!email) return;
    setStatus("sending");
    try {
      const res = await fetch(`https://web-production-a9a2f.up.railway.app/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source: "landing_page" }),
      });
      const data = await res.json();
      setStatus((res.ok || data.message) ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "inline-block", background: "#FF6600", color: "#fff", padding: "6px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", marginBottom: "20px", letterSpacing: "1px" }}>
        🚀 LAUNCHING NEXT MONTH
      </div>
      <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: "800", color: "#e6edf3", margin: "0 0 16px", lineHeight: 1.2 }}>
        Be First. Get <span style={{ color: "#00ffc8" }}>Early Access.</span>
      </h2>
      <p style={{ color: "#8b949e", fontSize: "18px", margin: "0 0 40px", lineHeight: 1.6 }}>
        Join creators waiting to distribute music, record, stream, and monetize — all in one place. Early members get exclusive pricing.
      </p>

      {status === "success" ? (
        <div style={{ background: "#161b22", border: "1px solid #00ffc8", borderRadius: "12px", padding: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
          <h3 style={{ color: "#00ffc8", margin: "0 0 8px" }}>You're on the list!</h3>
          <p style={{ color: "#8b949e", margin: 0 }}>We'll email you the moment we go live — with an exclusive early supporter offer.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px", margin: "0 auto" }}>
          <input
            placeholder="Your name (optional)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ padding: "14px 18px", background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", color: "#e6edf3", fontSize: "15px", outline: "none" }}
          />
          <div style={{ display: "flex", gap: "12px" }}>
            <input
              placeholder="Your email address *"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              style={{ flex: 1, padding: "14px 18px", background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", color: "#e6edf3", fontSize: "15px", outline: "none" }}
            />
            <button onClick={handleJoin} disabled={status === "sending" || !email}
              style={{ padding: "14px 24px", background: "#00ffc8", color: "#0d1117", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "15px", cursor: email ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
              {status === "sending" ? "..." : "Join Now →"}
            </button>
          </div>
          {status === "error" && <p style={{ color: "#f85149", margin: 0, fontSize: "14px" }}>Something went wrong. Please try again.</p>}
          <p style={{ color: "#5a7088", fontSize: "12px", margin: 0 }}>No spam. Unsubscribe anytime. 🔒</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "48px", flexWrap: "wrap" }}>
        {[["🎵", "150+ Platforms"], ["💰", "90% Revenue Share"], ["🤖", "AI-Powered Tools"], ["🎙️", "Pro DAW Included"]].map(([icon, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "6px" }}>{icon}</div>
            <div style={{ color: "#8b949e", fontSize: "13px", fontWeight: "600" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WaitlistSection;
