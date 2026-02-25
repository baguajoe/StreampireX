import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/BeatCart.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

/* ───────────────────────────────────────────
   BEAT CART DRAWER  — slide-out cart panel
   Call: <BeatCart isOpen={bool} onClose={fn} />
   Also exports <CartIcon /> for navbar badge
   ─────────────────────────────────────────── */

export const CartIcon = ({ onClick }) => {
  const [count, setCount] = useState(0);

  const updateCount = () => {
    const cart = JSON.parse(localStorage.getItem("spx_cart") || "[]");
    setCount(cart.length);
  };

  useEffect(() => {
    updateCount();
    window.addEventListener("cart-updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("cart-updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  return (
    <button className="bc-icon-btn" onClick={onClick} title="Beat Cart">
      🛒
      {count > 0 && <span className="bc-icon-badge">{count}</span>}
    </button>
  );
};

const BeatCart = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [items, setItems] = useState([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) loadCart();
  }, [isOpen]);

  useEffect(() => {
    const handler = () => loadCart();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  const loadCart = () => {
    const cart = JSON.parse(localStorage.getItem("spx_cart") || "[]");
    setItems(cart);
  };

  const removeItem = (index) => {
    const cart = [...items];
    cart.splice(index, 1);
    setItems(cart);
    localStorage.setItem("spx_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.setItem("spx_cart", "[]");
    window.dispatchEvent(new Event("cart-updated"));
  };

  const total = items.reduce((sum, i) => sum + (i.price || 0), 0);

  /* ── Checkout: purchase each beat sequentially ── */
  const handleCheckout = async () => {
    if (!token) { navigate("/login"); onClose(); return; }
    if (items.length === 0) return;
    setCheckingOut(true);
    setError("");

    // For single item, go straight to Stripe
    if (items.length === 1) {
      const item = items[0];
      try {
        const res = await fetch(`${BACKEND}/api/beats/${item.beatId}/purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ license_id: item.licenseId }),
        });
        const data = await res.json();
        if (data.checkout_url) {
          clearCart();
          window.location.href = data.checkout_url;
          return;
        }
        setError(data.error || "Checkout failed");
      } catch { setError("Checkout failed"); }
      setCheckingOut(false);
      return;
    }

    // Multi-item: try batch endpoint, fallback to first item
    try {
      const res = await fetch(`${BACKEND}/api/beats/batch-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: items.map(i => ({ beat_id: i.beatId, license_id: i.licenseId })) }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        clearCart();
        window.location.href = data.checkout_url;
        return;
      }
      // Fallback: checkout first item
      setError("Multi-checkout not supported yet. Checking out first item...");
      const res2 = await fetch(`${BACKEND}/api/beats/${items[0].beatId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ license_id: items[0].licenseId }),
      });
      const data2 = await res2.json();
      if (data2.checkout_url) {
        const remaining = items.slice(1);
        localStorage.setItem("spx_cart", JSON.stringify(remaining));
        window.dispatchEvent(new Event("cart-updated"));
        window.location.href = data2.checkout_url;
      }
    } catch { setError("Checkout failed. Please try again."); }
    setCheckingOut(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="bc-overlay" onClick={onClose} />
      <div className={`bc-drawer ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="bc-header">
          <h2>🛒 Cart ({items.length})</h2>
          <button className="bc-close" onClick={onClose}>✕</button>
        </div>

        {/* Items */}
        <div className="bc-items">
          {items.length === 0 ? (
            <div className="bc-empty">
              <p>Your cart is empty</p>
              <Link to="/beats" className="bc-browse-link" onClick={onClose}>Browse Beats →</Link>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="bc-item">
                <img src={item.artwork || "/default-beat-artwork.jpg"} className="bc-item-art" alt="" />
                <div className="bc-item-info">
                  <span className="bc-item-title">{item.title}</span>
                  <span className="bc-item-prod">by {item.producerName}</span>
                  <span className="bc-item-lic">{item.licenseName || "Basic Lease"}</span>
                </div>
                <span className="bc-item-price">${item.price}</span>
                <button className="bc-item-remove" onClick={() => removeItem(idx)} title="Remove">✕</button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="bc-footer">
            {error && <p className="bc-error">{error}</p>}
            <div className="bc-total-row">
              <span>Total</span>
              <span className="bc-total">${total.toFixed(2)}</span>
            </div>
            <div className="bc-footer-actions">
              <button className="bc-clear" onClick={clearCart}>Clear Cart</button>
              <button className="bc-checkout" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut ? "Processing..." : `Checkout — $${total.toFixed(2)}`}
              </button>
            </div>
            <p className="bc-platform-note">You keep 90% of every sale on StreamPireX</p>
          </div>
        )}
      </div>
    </>
  );
};

export default BeatCart;