import React, { useState } from "react";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState(null); // null | 'sending' | 'success' | 'error'

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) {
      setStatus("validation");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", background: "#0d1117",
    border: "1px solid #30363d", borderRadius: "8px", color: "#e6edf3",
    fontSize: "14px", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", marginBottom: "16px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", padding: "60px 20px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: "700", color: "#00ffc8", margin: "0 0 12px" }}>
            Get in Touch
          </h1>
          <p style={{ color: "#8b949e", fontSize: "16px", margin: 0 }}>
            Questions, partnerships, press inquiries — we'd love to hear from you.
          </p>
        </div>

        {/* Contact Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "40px" }}>
          {[
            { icon: "📧", label: "Email", value: "support@streampirex.com" },
            { icon: "🤝", label: "Partnerships", value: "partners@streampirex.com" },
            { icon: "📰", label: "Press", value: "press@streampirex.com" },
          ].map((item) => (
            <div key={item.label} style={{
              background: "#161b22", border: "1px solid #30363d", borderRadius: "12px",
              padding: "20px", textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{item.icon}</div>
              <div style={{ color: "#00ffc8", fontWeight: "600", fontSize: "13px", marginBottom: "4px" }}>{item.label}</div>
              <div style={{ color: "#8b949e", fontSize: "11px" }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "16px", padding: "40px" }}>
          <h2 style={{ margin: "0 0 24px", fontSize: "20px", color: "#e6edf3" }}>Send a Message</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <input style={inputStyle} placeholder="Your Name *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
            <input style={inputStyle} placeholder="Email Address *" type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>

          <input style={inputStyle} placeholder="Subject" value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })} />

          <textarea style={{ ...inputStyle, minHeight: "160px", resize: "vertical", marginBottom: "24px" }}
            placeholder="Your message *" value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })} />

          {status === "validation" && (
            <p style={{ color: "#FF6600", marginBottom: "16px" }}>⚠️ Please fill in all required fields.</p>
          )}
          {status === "success" && (
            <p style={{ color: "#00ffc8", marginBottom: "16px" }}>✅ Message sent! We'll get back to you within 1-2 business days.</p>
          )}
          {status === "error" && (
            <p style={{ color: "#f85149", marginBottom: "16px" }}>❌ Something went wrong. Please try again.</p>
          )}

          <button onClick={handleSubmit} disabled={status === "sending"}
            style={{
              width: "100%", padding: "14px", background: status === "sending" ? "#30363d" : "#00ffc8",
              color: "#0d1117", border: "none", borderRadius: "8px", fontSize: "16px",
              fontWeight: "700", cursor: status === "sending" ? "not-allowed" : "pointer",
            }}>
            {status === "sending" ? "Sending..." : "Send Message 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Contact;
