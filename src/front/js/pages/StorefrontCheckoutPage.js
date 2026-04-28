// =============================================================================
// StorefrontCheckoutPage.js - MC-4 Buyer Checkout for non-Printful goods
// =============================================================================
// Location: src/front/js/pages/StorefrontCheckoutPage.js
// Route:    /storefront/checkout/:productId
//
// Buyer flow:
//   1. Product page "Buy from Creator" -> /storefront/checkout/<id>
//   2. Pick fulfillment type (creator_ship / digital_download / pickup)
//   3. If creator_ship: enter shipping address
//   4. Confirm -> POST /api/storefront/checkout
//   5. Redirect to Stripe Checkout
//   6. Stripe success_url returns to /storefront/orders/<id>?status=success
//
// Wired backend: POST /api/storefront/checkout (MC-1).
// =============================================================================

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

const FULFILLMENT_OPTIONS = [
  {
    id: "creator_ship",
    icon: "📦",
    label: "Ship to me",
    desc: "Creator ships the item to your address",
    color: "#00ffc8",
  },
  {
    id: "digital_download",
    icon: "💾",
    label: "Digital download",
    desc: "Instant access after payment",
    color: "#a78bfa",
  },
  {
    id: "pickup",
    icon: "🤝",
    label: "Pickup in person",
    desc: "Arrange pickup with creator (no shipping)",
    color: "#FF6600",
  },
];

const S = {
  page:    { minHeight:"100vh", background:"#06060f", color:"#e0e0e0", fontFamily:"JetBrains Mono, monospace", padding:"24px" },
  wrap:    { maxWidth:720, margin:"0 auto" },
  header:  { fontSize:22, fontWeight:700, color:"#00ffc8", marginBottom:8 },
  sub:     { fontSize:12, color:"#888", marginBottom:24 },
  panel:   { background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:10, padding:20, marginBottom:16 },
  pTitle:  { fontSize:13, fontWeight:700, color:"#e0e0e0", marginBottom:12 },
  fOpts:   { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:10 },
  fOpt:    (selected, color) => ({
    background: selected ? `${color}10` : "#080810",
    border: selected ? `2px solid ${color}` : "2px solid #1a1a2e",
    borderRadius: 8, padding: 14, cursor: "pointer", transition: "all 0.15s",
    textAlign: "center",
  }),
  fIcon:   { fontSize:22, marginBottom:6 },
  fLabel:  (color) => ({ fontSize:12, fontWeight:700, color, marginBottom:4 }),
  fDesc:   { fontSize:10, color:"#888", lineHeight:1.4 },
  field:   { marginBottom:12 },
  label:   { fontSize:10, color:"#888", marginBottom:4, display:"block", textTransform:"uppercase", letterSpacing:0.5 },
  input:   { width:"100%", padding:"10px 12px", background:"#080810", border:"1px solid #1a1a2e", borderRadius:6, color:"#e0e0e0", fontFamily:"inherit", fontSize:13, boxSizing:"border-box" },
  row2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  row3:    { display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10 },
  summary: { background:"#080810", border:"1px solid #1a1a2e", borderRadius:8, padding:16, marginBottom:16 },
  sRow:    { display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:12 },
  sTotal:  { display:"flex", justifyContent:"space-between", padding:"10px 0 0", borderTop:"1px solid #1a1a2e", marginTop:8, fontSize:14, fontWeight:700, color:"#00ffc8" },
  btnRow:  { display:"flex", gap:10, justifyContent:"flex-end" },
  btn:     (primary) => ({
    padding:"10px 24px",
    border: primary ? "1px solid #00ffc8" : "1px solid #555",
    borderRadius:6,
    background: primary ? "rgba(0,255,200,0.1)" : "transparent",
    color: primary ? "#00ffc8" : "#888",
    cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600,
  }),
  err:     { background:"rgba(255,80,80,0.1)", border:"1px solid #ff5050", borderRadius:6, padding:"10px 14px", color:"#ff8080", fontSize:12, marginBottom:12 },
  loading: { textAlign:"center", padding:40, color:"#888" },
};

const StorefrontCheckoutPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [productError, setProductError] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [fulfillmentType, setFulfillmentType] = useState("creator_ship");
  const [shipping, setShipping] = useState({
    name: "", address: "", city: "", state: "", country: "US", zip: "",
  });
  const [notesToBuyer, setNotesToBuyer] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/products/${productId}`);
        if (!res.ok) throw new Error(`Product not found (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setProduct(data);
          // Auto-select fulfillment based on product type
          if (data.is_digital) {
            setFulfillmentType("digital_download");
          }
        }
      } catch (e) {
        if (!cancelled) setProductError(e.message);
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    };
    fetchProduct();
    return () => { cancelled = true; };
  }, [productId]);

  const handleSubmit = async () => {
    setError("");

    // Client-side validation
    if (fulfillmentType === "creator_ship") {
      const required = ["name", "address", "city", "state", "country", "zip"];
      const missing = required.filter((k) => !shipping[k] || !shipping[k].trim());
      if (missing.length) {
        setError(`Please fill in: ${missing.join(", ")}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to complete your purchase.");
        setSubmitting(false);
        return;
      }

      const body = {
        product_id: parseInt(productId, 10),
        quantity,
        fulfillment_type: fulfillmentType,
      };
      if (fulfillmentType === "creator_ship") {
        body.shipping = shipping;
      }
      if (fulfillmentType === "pickup" && pickupNotes.trim()) {
        body.pickup_notes = pickupNotes.trim();
      }
      if (notesToBuyer.trim()) {
        body.notes_to_buyer = notesToBuyer.trim();
      }

      const res = await fetch(`${BACKEND}/api/storefront/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Checkout failed (${res.status})`);
      }

      if (data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (loadingProduct) {
    return <div style={S.page}><div style={S.loading}>Loading product...</div></div>;
  }

  if (productError) {
    return (
      <div style={S.page}>
        <div style={S.wrap}>
          <div style={S.err}>{productError}</div>
          <button style={S.btn(false)} onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const unitPrice = parseFloat(product.price) || 0;
  const subtotal = unitPrice * quantity;
  const platformFee = subtotal * 0.10;
  const creatorEarnings = subtotal - platformFee;

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.header}>🛒 Checkout</div>
        <div style={S.sub}>Buying from creator: {product.title || product.name || `Product #${product.id}`}</div>

        {/* Product summary */}
        <div style={S.panel}>
          <div style={S.pTitle}>📦 Product</div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            {product.image_url && (
              <img src={product.image_url} alt="" style={{ width:60, height:60, objectFit:"cover", borderRadius:6, border:"1px solid #1a1a2e" }} />
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#e0e0e0" }}>{product.title || product.name}</div>
              <div style={{ fontSize:11, color:"#888", marginTop:2 }}>${unitPrice.toFixed(2)} each</div>
            </div>
            <div>
              <label style={S.label}>Qty</label>
              <input
                type="number"
                min="1"
                max={product.stock || 999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ ...S.input, width:70 }}
              />
            </div>
          </div>
        </div>

        {/* Fulfillment */}
        <div style={S.panel}>
          <div style={S.pTitle}>📬 How do you want it?</div>
          <div style={S.fOpts}>
            {FULFILLMENT_OPTIONS.map((opt) => {
              const disabled = (opt.id === "digital_download" && !product.is_digital) ||
                               (opt.id === "creator_ship" && product.is_digital);
              if (disabled) return null;
              return (
                <div
                  key={opt.id}
                  style={S.fOpt(fulfillmentType === opt.id, opt.color)}
                  onClick={() => setFulfillmentType(opt.id)}
                >
                  <div style={S.fIcon}>{opt.icon}</div>
                  <div style={S.fLabel(opt.color)}>{opt.label}</div>
                  <div style={S.fDesc}>{opt.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping address (creator_ship only) */}
        {fulfillmentType === "creator_ship" && (
          <div style={S.panel}>
            <div style={S.pTitle}>🏠 Shipping Address</div>
            <div style={S.field}>
              <label style={S.label}>Full name</label>
              <input style={S.input} value={shipping.name}
                onChange={(e) => setShipping({...shipping, name: e.target.value})} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Street address</label>
              <input style={S.input} value={shipping.address}
                onChange={(e) => setShipping({...shipping, address: e.target.value})} />
            </div>
            <div style={S.row3}>
              <div style={S.field}>
                <label style={S.label}>City</label>
                <input style={S.input} value={shipping.city}
                  onChange={(e) => setShipping({...shipping, city: e.target.value})} />
              </div>
              <div style={S.field}>
                <label style={S.label}>State</label>
                <input style={S.input} value={shipping.state}
                  onChange={(e) => setShipping({...shipping, state: e.target.value})} />
              </div>
              <div style={S.field}>
                <label style={S.label}>ZIP</label>
                <input style={S.input} value={shipping.zip}
                  onChange={(e) => setShipping({...shipping, zip: e.target.value})} />
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Country</label>
              <input style={S.input} value={shipping.country}
                onChange={(e) => setShipping({...shipping, country: e.target.value})} />
            </div>
          </div>
        )}

        {/* Pickup notes (pickup only) */}
        {fulfillmentType === "pickup" && (
          <div style={S.panel}>
            <div style={S.pTitle}>🤝 Pickup arrangement (optional)</div>
            <textarea
              style={{ ...S.input, minHeight:60, resize:"vertical", fontFamily:"inherit" }}
              placeholder="When/where would you like to pick up? (e.g. 'Saturday at the farmer's market')"
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
            />
          </div>
        )}

        {/* Order summary */}
        <div style={S.summary}>
          <div style={S.sRow}>
            <span style={{ color:"#888" }}>Subtotal ({quantity} x ${unitPrice.toFixed(2)})</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={S.sRow}>
            <span style={{ color:"#888" }}>Platform fee (10%)</span>
            <span style={{ color:"#888" }}>${platformFee.toFixed(2)}</span>
          </div>
          <div style={S.sRow}>
            <span style={{ color:"#888" }}>Creator earnings (90%)</span>
            <span style={{ color:"#888" }}>${creatorEarnings.toFixed(2)}</span>
          </div>
          <div style={S.sTotal}>
            <span>Total</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </div>

        {error && <div style={S.err}>{error}</div>}

        <div style={S.btnRow}>
          <button style={S.btn(false)} onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </button>
          <button style={S.btn(true)} onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Processing..." : "💳 Proceed to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorefrontCheckoutPage;
