// =============================================================================
// TechSupportPage.js — StreamPireX Tech Support / Help Desk
// =============================================================================
// Location: src/front/js/pages/TechSupportPage.js
// Route: /support
// Features: Create ticket, view tickets, ticket detail with replies
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/TechSupport.css";

const CATEGORIES = [
  { value: "general", label: "General Question", icon: "❓" },
  { value: "account", label: "Account & Login", icon: "👤" },
  { value: "billing", label: "Billing & Subscriptions", icon: "💳" },
  { value: "recording-studio", label: "Recording Studio / DAW", icon: "🎚️" },
  { value: "video-editor", label: "Video Editor", icon: "🎬" },
  { value: "streaming", label: "Live Streaming", icon: "📡" },
  { value: "podcasting", label: "Podcasting", icon: "🎙️" },
  { value: "radio", label: "Radio Stations", icon: "📻" },
  { value: "distribution", label: "Music Distribution", icon: "🌍" },
  { value: "gaming", label: "Gaming Hub", icon: "🎮" },
  { value: "bug-report", label: "Bug Report", icon: "🐛" },
  { value: "feature-request", label: "Feature Request", icon: "💡" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "#666" },
  { value: "normal", label: "Normal", color: "#00ffc8" },
  { value: "high", label: "High", color: "#ff9500" },
  { value: "urgent", label: "Urgent", color: "#ff3b30" },
];

const STATUS_STYLES = {
  open: { label: "Open", color: "#00ffc8", bg: "rgba(0,255,200,0.1)" },
  "in-progress": { label: "In Progress", color: "#ff9500", bg: "rgba(255,149,0,0.1)" },
  "awaiting-reply": { label: "Awaiting Your Reply", color: "#007aff", bg: "rgba(0,122,255,0.1)" },
  resolved: { label: "Resolved", color: "#34c759", bg: "rgba(52,199,89,0.1)" },
  closed: { label: "Closed", color: "#666", bg: "rgba(102,102,102,0.1)" },
};

const TechSupportPage = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("list"); // list, create, detail
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Create ticket form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Reply form
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

  // =============================================
  // FETCH TICKETS
  // =============================================
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("per_page", "50");

      const response = await fetch(
        `${backendUrl}/api/support/tickets?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else if (response.status === 401) {
        navigate("/login");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, statusFilter, navigate]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // =============================================
  // CREATE TICKET
  // =============================================
  const handleSubmitTicket = async (e) => {
    e.preventDefault();

    if (!subject.trim()) {
      setMessage({ type: "error", text: "Please enter a subject." });
      return;
    }
    if (!description.trim()) {
      setMessage({ type: "error", text: "Please describe your issue." });
      return;
    }
    if (description.trim().length < 20) {
      setMessage({ type: "error", text: "Please provide more detail (at least 20 characters)." });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendUrl}/api/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          category,
          priority,
          browser_info: navigator.userAgent,
          platform_info: window.matchMedia("(display-mode: standalone)").matches
            ? "pwa"
            : "web",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Ticket ${data.ticket.ticket_number} created! We'll respond within 24-48 hours.`,
        });
        setSubject("");
        setDescription("");
        setCategory("general");
        setPriority("normal");
        fetchTickets();
        setTimeout(() => {
          setActiveView("list");
          setMessage({ type: "", text: "" });
        }, 3000);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to create ticket." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // =============================================
  // VIEW TICKET DETAIL
  // =============================================
  const viewTicket = async (ticketId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendUrl}/api/support/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data.ticket);
        setActiveView("detail");
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
    }
  };

  // =============================================
  // REPLY TO TICKET
  // =============================================
  const handleReply = async () => {
    if (!replyText.trim()) return;

    setReplying(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/support/tickets/${selectedTicket.id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: replyText.trim() }),
        }
      );

      if (response.ok) {
        setReplyText("");
        viewTicket(selectedTicket.id); // Refresh
      }
    } catch (error) {
      console.error("Error replying:", error);
    } finally {
      setReplying(false);
    }
  };

  // =============================================
  // CLOSE TICKET
  // =============================================
  const handleCloseTicket = async () => {
    if (!window.confirm("Are you sure you want to close this ticket?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/support/tickets/${selectedTicket.id}/close`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        viewTicket(selectedTicket.id);
        fetchTickets();
      }
    } catch (error) {
      console.error("Error closing ticket:", error);
    }
  };

  // =============================================
  // REOPEN TICKET
  // =============================================
  const handleReopenTicket = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/support/tickets/${selectedTicket.id}/reopen`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        viewTicket(selectedTicket.id);
        fetchTickets();
      }
    } catch (error) {
      console.error("Error reopening ticket:", error);
    }
  };

  // =============================================
  // FORMAT HELPERS
  // =============================================
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateStr);
  };

  // =============================================
  // RENDER: TICKET LIST
  // =============================================
  const renderTicketList = () => (
    <div className="support-list">
      <div className="support-list-header">
        <h2>📋 My Support Tickets</h2>
        <button className="btn-create-ticket" onClick={() => setActiveView("create")}>
          ✉️ New Ticket
        </button>
      </div>

      {/* Status Filter */}
      <div className="status-filters">
        {["all", "open", "in-progress", "awaiting-reply", "resolved", "closed"].map((s) => (
          <button
            key={s}
            className={`filter-btn ${statusFilter === s ? "active" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "All" : STATUS_STYLES[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Tickets */}
      {loading ? (
        <div className="loading-state">⏳ Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎫</div>
          <h3>No Tickets Yet</h3>
          <p>
            Need help? Create a support ticket and our team will get back to you
            within 24-48 hours.
          </p>
          <button className="btn-create-ticket" onClick={() => setActiveView("create")}>
            ✉️ Create Your First Ticket
          </button>
        </div>
      ) : (
        <div className="tickets-list">
          {tickets.map((ticket) => {
            const statusStyle = STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
            const catInfo = CATEGORIES.find((c) => c.value === ticket.category);
            return (
              <div
                key={ticket.id}
                className="ticket-card"
                onClick={() => viewTicket(ticket.id)}
              >
                <div className="ticket-card-header">
                  <span className="ticket-number">{ticket.ticket_number}</span>
                  <span
                    className="ticket-status"
                    style={{ color: statusStyle.color, background: statusStyle.bg }}
                  >
                    {statusStyle.label}
                  </span>
                </div>
                <div className="ticket-card-body">
                  <span className="ticket-category-icon">{catInfo?.icon || "❓"}</span>
                  <div className="ticket-info">
                    <h4>{ticket.subject}</h4>
                    <p className="ticket-preview">
                      {ticket.description.length > 120
                        ? ticket.description.substring(0, 120) + "..."
                        : ticket.description}
                    </p>
                  </div>
                </div>
                <div className="ticket-card-footer">
                  <span className="ticket-date">{getTimeAgo(ticket.created_at)}</span>
                  <span className="ticket-category">{catInfo?.label || ticket.category}</span>
                  {ticket.replies && ticket.replies.length > 0 && (
                    <span className="ticket-replies">
                      💬 {ticket.replies.length} {ticket.replies.length === 1 ? "reply" : "replies"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // =============================================
  // RENDER: CREATE TICKET
  // =============================================
  const renderCreateTicket = () => (
    <div className="support-create">
      <button className="btn-back" onClick={() => { setActiveView("list"); setMessage({ type: "", text: "" }); }}>
        ← Back to Tickets
      </button>

      <div className="create-header">
        <h2>✉️ Create Support Ticket</h2>
        <p className="response-notice">
          ⏱️ Our team will respond within <strong>24-48 hours</strong>. Please
          provide as much detail as possible to help us resolve your issue quickly.
        </p>
      </div>

      {message.text && (
        <div className={`support-message ${message.type}`}>
          {message.type === "success" ? "✅" : "⚠️"} {message.text}
        </div>
      )}

      <form onSubmit={handleSubmitTicket} className="ticket-form">
        {/* Category */}
        <div className="form-group">
          <label>Category *</label>
          <div className="category-grid">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.value}
                className={`category-btn ${category === cat.value ? "selected" : ""}`}
                onClick={() => setCategory(cat.value)}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-label">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="form-group">
          <label htmlFor="ticket-subject">Subject *</label>
          <input
            id="ticket-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue..."
            maxLength={255}
          />
          <span className="char-count">{subject.length}/255</span>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="ticket-description">Describe Your Issue *</label>
          <textarea
            id="ticket-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the issue in detail. Include what you were doing, what you expected to happen, and what actually happened. Steps to reproduce the problem are very helpful."
            rows={8}
            maxLength={5000}
          />
          <span className="char-count">{description.length}/5000</span>
        </div>

        {/* Priority */}
        <div className="form-group">
          <label>Priority</label>
          <div className="priority-options">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p.value}
                className={`priority-btn ${priority === p.value ? "selected" : ""}`}
                style={{
                  borderColor: priority === p.value ? p.color : "transparent",
                  color: priority === p.value ? p.color : "#aaa",
                }}
                onClick={() => setPriority(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="btn-submit-ticket" disabled={submitting}>
          {submitting ? "⏳ Submitting..." : "📩 Submit Ticket"}
        </button>
      </form>
    </div>
  );

  // =============================================
  // RENDER: TICKET DETAIL
  // =============================================
  const renderTicketDetail = () => {
    if (!selectedTicket) return null;
    const statusStyle = STATUS_STYLES[selectedTicket.status] || STATUS_STYLES.open;
    const catInfo = CATEGORIES.find((c) => c.value === selectedTicket.category);
    const isClosed = selectedTicket.status === "closed" || selectedTicket.status === "resolved";

    return (
      <div className="support-detail">
        <button className="btn-back" onClick={() => { setActiveView("list"); setSelectedTicket(null); }}>
          ← Back to Tickets
        </button>

        {/* Ticket Header */}
        <div className="detail-header">
          <div className="detail-header-top">
            <span className="ticket-number-large">{selectedTicket.ticket_number}</span>
            <span
              className="ticket-status-large"
              style={{ color: statusStyle.color, background: statusStyle.bg }}
            >
              {statusStyle.label}
            </span>
          </div>
          <h2>{selectedTicket.subject}</h2>
          <div className="detail-meta">
            <span>{catInfo?.icon} {catInfo?.label}</span>
            <span>📅 {formatDate(selectedTicket.created_at)}</span>
            <span>
              Priority:{" "}
              <span style={{ color: PRIORITIES.find((p) => p.value === selectedTicket.priority)?.color }}>
                {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
              </span>
            </span>
          </div>
        </div>

        {/* Original Message */}
        <div className="message-thread">
          <div className="thread-message user-message">
            <div className="message-header">
              <span className="message-author">👤 You</span>
              <span className="message-date">{formatDate(selectedTicket.created_at)}</span>
            </div>
            <div className="message-body">{selectedTicket.description}</div>
          </div>

          {/* Replies */}
          {selectedTicket.replies &&
            selectedTicket.replies.map((reply) => (
              <div
                key={reply.id}
                className={`thread-message ${reply.is_admin ? "admin-message" : "user-message"}`}
              >
                <div className="message-header">
                  <span className="message-author">
                    {reply.is_admin ? "🛡️ StreamPireX Support" : "👤 You"}
                  </span>
                  <span className="message-date">{formatDate(reply.created_at)}</span>
                </div>
                <div className="message-body">{reply.message}</div>
              </div>
            ))}
        </div>

        {/* Reply Form or Actions */}
        {!isClosed ? (
          <div className="reply-section">
            <h3>💬 Add Reply</h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              maxLength={5000}
            />
            <div className="reply-actions">
              <button
                className="btn-send-reply"
                onClick={handleReply}
                disabled={replying || !replyText.trim()}
              >
                {replying ? "⏳ Sending..." : "📩 Send Reply"}
              </button>
              <button className="btn-close-ticket" onClick={handleCloseTicket}>
                ✅ Close Ticket
              </button>
            </div>
          </div>
        ) : (
          <div className="closed-section">
            <p>This ticket is {selectedTicket.status}.</p>
            <button className="btn-reopen" onClick={handleReopenTicket}>
              🔄 Reopen Ticket
            </button>
          </div>
        )}
      </div>
    );
  };

  // =============================================
  // MAIN RENDER
  // =============================================
  return (
    <div className="tech-support-page">
      <div className="support-container">
        {/* Page Header */}
        <div className="support-page-header">
          <h1>🛠️ Tech Support</h1>
          <p>
            Need help? Submit a ticket and our support team will get back to you
            within <strong>24-48 hours</strong>.
          </p>
        </div>

        {/* View Switcher */}
        {activeView === "list" && renderTicketList()}
        {activeView === "create" && renderCreateTicket()}
        {activeView === "detail" && renderTicketDetail()}
      </div>
    </div>
  );
};

export default TechSupportPage;