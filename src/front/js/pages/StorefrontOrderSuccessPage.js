// =============================================================================
// StorefrontOrderSuccessPage.js - MC-4 Order detail / success landing page
// =============================================================================
// Location: src/front/js/pages/StorefrontOrderSuccessPage.js
// Route:    /storefront/orders/:orderId
//
// Lands here after Stripe Checkout success_url redirect, OR direct nav from
// "My Orders" page. Polls /api/storefront/orders/<id> for status updates.
//
// Buyer can:
// - See current status (pending/paid/shipped/delivered/cancelled/refunded)
// - View tracking number if shipped
// - Cancel order if status is paid (calls PATCH /cancel - MC-2)
// - Download digital file if status delivered + fulfillment=digital_download
// =============================================================================

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

const STATUS_BADGE = {
  pending:   { color:"#888",     label:"Pending Payment" },
  paid:      { color:"#00ffc8",  label:"Paid" },
  shipped:   { color:"#4a9eff",  label:"Shipped" },
  delivered: { color:"#a78bfa",  label:"Delivered" },
  cancelled: { color:"#ff8080",  label:"Cancelled" },
  refunded:  { color:"#FF6600",  label:"Refunded" },
};

const S = {
  page:    { minHeight:"100vh", background:"#06060f", color:"#e0e0e0", fontFamily:"JetBrains Mono, monospace", padding:"24px" },
  wrap:    { maxWidth:720, margin:"0 auto" },
  banner:  (color) => ({ background:`${color}15`, border:`1px solid ${color}`, borderRadius:10, padding:"16px 20px", marginBottom:20, display:"flex", alignItems:"center", gap:14 }),
  bIcon:   { fontSize:28 },
  bTitle:  (color) => ({ fontSize:16, fontWeight:700, color, marginBottom:2 }),
  bSub:    { fontSize:11, color:"#888" },
  panel:   { background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:10, padding:20, marginBottom:16 },
  pTitle:  { fontSize:12, fontWeight:700, color:"#e0e0e0", marginBottom:12, textTransform:"uppercase", letterSpacing:0.5 },
  row:     { display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:12, borderBottom:"1px solid #1a1a2e" },
  rowLast: { display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:12 },
  k:       { color:"#888" },
  v:       { color:"#e0e0e0" },
  badge:   (color) => ({ display:"inline-block", padding:"3px 10px", border:`1px solid ${color}`, borderRadius:4, color, fontSize:10, fontWeight:700 }),
  btn:     (color="#00ffc8") => ({
    padding:"8px 18px", border:`1px solid ${color}`, borderRadius:6,
    background:`${color}10`, color, cursor:"pointer",
    fontFamily:"inherit", fontSize:12, fontWeight:600,
  }),
  err:     { background:"rgba(255,80,80,0.1)", border:"1px solid #ff5050", borderRadius:6, padding:"10px 14px", color:"#ff8080", fontSize:12, marginBottom:12 },
  loading: { textAlign:"center", padding:40, color:"#888" },
};

const StorefrontOrderSuccessPage = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cameFromCheckout = searchParams.get("status") === "success";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND}/api/storefront/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to load order (${res.status})`);
      }
      const data = await res.json();
      setOrder(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Poll briefly if just came from checkout - status may still be 'pending'
  // until webhook fires
  useEffect(() => {
    if (!cameFromCheckout) return;
    if (!order || order.status !== "pending") return;
    const t = setTimeout(() => fetchOrder(), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameFromCheckout, order]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError("Please provide a cancellation reason.");
      return;
    }
    setCancelling(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND}/api/storefront/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cancellation_reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Cancel failed (${res.status})`);
      setOrder(data);
      setShowCancelForm(false);
      setCancelReason("");
    } catch (e) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div style={S.page}><div style={S.loading}>Loading order...</div></div>;

  if (error && !order) {
    return (
      <div style={S.page}>
        <div style={S.wrap}>
          <div style={S.err}>{error}</div>
          <Link to="/orders" style={S.btn()}>Back to My Orders</Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusInfo = STATUS_BADGE[order.status] || { color:"#888", label: order.status };
  const isDelivered = order.status === "delivered";
  const isPaidNotShipped = order.status === "paid";
  const canCancel = order.status === "pending" || order.status === "paid";

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {cameFromCheckout && order.status !== "pending" && (
          <div style={S.banner(statusInfo.color)}>
            <div style={S.bIcon}>✅</div>
            <div>
              <div style={S.bTitle(statusInfo.color)}>Thanks for your order!</div>
              <div style={S.bSub}>Order #{order.id} · {statusInfo.label}</div>
            </div>
          </div>
        )}

        {cameFromCheckout && order.status === "pending" && (
          <div style={S.banner("#888")}>
            <div style={S.bIcon}>⏳</div>
            <div>
              <div style={S.bTitle("#888")}>Confirming payment...</div>
              <div style={S.bSub}>This usually takes a few seconds.</div>
            </div>
          </div>
        )}

        {/* Order details */}
        <div style={S.panel}>
          <div style={S.pTitle}>📦 Order #{order.id}</div>
          <div style={S.row}>
            <span style={S.k}>Status</span>
            <span style={S.badge(statusInfo.color)}>{statusInfo.label}</span>
          </div>
          <div style={S.row}>
            <span style={S.k}>Fulfillment</span>
            <span style={S.v}>{order.fulfillment_type}</span>
          </div>
          <div style={S.row}>
            <span style={S.k}>Quantity</span>
            <span style={S.v}>{order.quantity}</span>
          </div>
          <div style={S.row}>
            <span style={S.k}>Unit price</span>
            <span style={S.v}>${parseFloat(order.unit_price).toFixed(2)}</span>
          </div>
          <div style={S.rowLast}>
            <span style={S.k}>Total</span>
            <span style={{ ...S.v, color:"#00ffc8", fontWeight:700 }}>${parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
        </div>

        {/* Tracking (if shipped) */}
        {(order.tracking_number || order.shipped_at) && (
          <div style={S.panel}>
            <div style={S.pTitle}>🚚 Tracking</div>
            {order.carrier && (
              <div style={S.row}>
                <span style={S.k}>Carrier</span>
                <span style={S.v}>{order.carrier}</span>
              </div>
            )}
            {order.tracking_number && (
              <div style={S.row}>
                <span style={S.k}>Tracking #</span>
                <span style={{ ...S.v, fontFamily:"JetBrains Mono, monospace" }}>{order.tracking_number}</span>
              </div>
            )}
            {order.shipped_at && (
              <div style={S.rowLast}>
                <span style={S.k}>Shipped</span>
                <span style={S.v}>{new Date(order.shipped_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Shipping address (if creator_ship) */}
        {order.shipping && (
          <div style={S.panel}>
            <div style={S.pTitle}>🏠 Ship to</div>
            <div style={{ fontSize:12, color:"#e0e0e0", lineHeight:1.6 }}>
              {order.shipping.name}<br />
              {order.shipping.address}<br />
              {order.shipping.city}, {order.shipping.state} {order.shipping.zip}<br />
              {order.shipping.country}
            </div>
          </div>
        )}

        {/* Cancellation reason if cancelled/refunded */}
        {order.cancellation_reason && (
          <div style={S.panel}>
            <div style={S.pTitle}>📝 Note</div>
            <div style={{ fontSize:12, color:"#888", lineHeight:1.5 }}>{order.cancellation_reason}</div>
          </div>
        )}

        {error && <div style={S.err}>{error}</div>}

        {/* Actions */}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Link to="/orders" style={{ ...S.btn("#555"), textDecoration:"none" }}>← My Orders</Link>
          {isDelivered && order.fulfillment_type === "digital_download" && (
            <button style={S.btn("#a78bfa")} onClick={() => alert("Download flow TBD")}>
              📥 Download
            </button>
          )}
          {canCancel && !showCancelForm && (
            <button style={S.btn("#ff8080")} onClick={() => setShowCancelForm(true)}>
              ❌ Cancel order
            </button>
          )}
        </div>

        {/* Cancel form */}
        {showCancelForm && (
          <div style={{ ...S.panel, marginTop:16 }}>
            <div style={S.pTitle}>Cancel order</div>
            <textarea
              style={{ width:"100%", padding:"10px 12px", background:"#080810", border:"1px solid #1a1a2e", borderRadius:6, color:"#e0e0e0", fontFamily:"inherit", fontSize:12, minHeight:60, resize:"vertical", boxSizing:"border-box", marginBottom:10 }}
              placeholder="Reason for cancellation (required)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={S.btn("#555")} onClick={() => { setShowCancelForm(false); setCancelReason(""); }} disabled={cancelling}>
                Keep order
              </button>
              <button style={S.btn("#ff8080")} onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorefrontOrderSuccessPage;
