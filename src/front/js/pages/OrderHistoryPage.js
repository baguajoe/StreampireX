import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "../../styles/OrderHistoryPage.css";

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [refundMessage, setRefundMessage] = useState(null);

  // Check for new purchases passed from checkout
  const newPurchases = location.state?.newPurchases;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view your orders.");
        setLoading(false);
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/user/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || data || []);
      } else if (response.status === 401) {
        setError("Session expired. Please log in again.");
      } else if (response.status === 404) {
        setOrders([]);
      } else {
        // Try alternate endpoint
        const altResponse = await fetch(`${backendUrl}/api/marketplace/my-orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (altResponse.ok) {
          const altData = await altResponse.json();
          setOrders(altData.orders || altData || []);
        } else {
          setError("Unable to load orders. Please try again later.");
        }
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // DOWNLOAD - Digital product file download
  // =============================================
  const handleDownload = async (productId, fileName) => {
    try {
      setDownloadingId(productId);
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/download/${productId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName || `product_${productId}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        alert(`Download failed: ${errorData.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  // =============================================
  // REFUND - Request refund for an order
  // =============================================
  const requestRefund = async (orderId, productId) => {
    const reason = prompt("Please provide a reason for the refund request:");
    if (!reason) return;

    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/refund/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: productId,
          order_id: orderId,
          reason: reason,
        }),
      });

      if (response.ok) {
        setRefundMessage({ type: "success", text: "Refund request submitted successfully!" });
        fetchOrders();
        setTimeout(() => setRefundMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setRefundMessage({
          type: "error",
          text: `Refund request failed: ${errorData.message || "Unknown error"}`,
        });
        setTimeout(() => setRefundMessage(null), 5000);
      }
    } catch (err) {
      console.error("Refund request error:", err);
      setRefundMessage({ type: "error", text: "Failed to submit refund request. Please try again." });
      setTimeout(() => setRefundMessage(null), 5000);
    }
  };

  // =============================================
  // FORMAT HELPERS
  // =============================================
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =============================================
  // STATUS HELPERS
  // =============================================
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "delivered":
        return "✅";
      case "shipped":
        return "🚚";
      case "processing":
        return "⚙️";
      case "pending":
        return "⏳";
      case "cancelled":
        return "❌";
      case "refunded":
        return "💰";
      default:
        return "📦";
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "delivered":
        return "completed";
      case "shipped":
        return "shipped";
      case "processing":
        return "processing";
      case "pending":
        return "pending";
      case "cancelled":
        return "cancelled";
      case "refunded":
        return "refunded";
      default:
        return "pending";
    }
  };

  // =============================================
  // FILTERING & SORTING
  // =============================================
  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Filter by status or type
    if (filter === "digital") {
      filtered = filtered.filter(
        (order) => order.is_digital || order.product?.is_digital
      );
    } else if (filter === "physical") {
      filtered = filtered.filter(
        (order) => !(order.is_digital || order.product?.is_digital)
      );
    } else if (filter !== "all") {
      filtered = filtered.filter((order) => {
        const status = order.status?.toLowerCase();
        if (filter === "pending") return status === "pending" || status === "processing";
        if (filter === "completed") return status === "completed" || status === "delivered";
        return status === filter;
      });
    }

    // Search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          (order.product_name || order.product?.title || "")
            .toLowerCase()
            .includes(search) ||
          String(order.id).includes(search) ||
          (order.tracking_number || "").toLowerCase().includes(search)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || a.purchased_at || 0);
      const dateB = new Date(b.created_at || b.purchased_at || 0);
      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "amount-high")
        return (b.total_amount || b.amount || 0) - (a.total_amount || a.amount || 0);
      if (sortBy === "amount-low")
        return (a.total_amount || a.amount || 0) - (b.total_amount || b.amount || 0);
      return 0;
    });

    return filtered;
  };

  // =============================================
  // STATS
  // =============================================
  const getOrderStats = () => {
    const total = orders.length;
    const completed = orders.filter(
      (o) => o.status === "completed" || o.status === "delivered"
    ).length;
    const pending = orders.filter(
      (o) => o.status === "pending" || o.status === "processing"
    ).length;
    const shipped = orders.filter((o) => o.status === "shipped").length;
    const totalSpent = orders.reduce(
      (sum, o) => sum + parseFloat(o.total_amount || o.amount || 0),
      0
    );
    const digitalItems = orders.filter(
      (o) => o.is_digital || o.product?.is_digital
    ).length;
    const physicalItems = orders.filter(
      (o) => !(o.is_digital || o.product?.is_digital)
    ).length;
    return { total, completed, pending, shipped, totalSpent, digitalItems, physicalItems };
  };

  const filteredOrders = getFilteredOrders();
  const stats = getOrderStats();

  // =============================================
  // LOADING STATE
  // =============================================
  if (loading) {
    return (
      <div className="order-history-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  // =============================================
  // ERROR STATE
  // =============================================
  if (error) {
    return (
      <div className="order-history-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Oops!</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn-primary" onClick={fetchOrders}>
              Try Again
            </button>
            <button className="btn-secondary" onClick={() => navigate("/login")}>
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =============================================
  // MAIN RENDER
  // =============================================
  return (
    <div className="order-history-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>📦 My Orders</h1>
          <p>Track and manage your purchases</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate("/marketplace")}>
            🛍️ Continue Shopping
          </button>
        </div>
      </div>

      {/* New Purchase Success Banner */}
      {newPurchases && newPurchases.length > 0 && (
        <div className="success-banner">
          <span className="success-icon">🎉</span>
          <div className="success-text">
            <strong>Order placed successfully!</strong>
            <p>
              {newPurchases.length} item{newPurchases.length > 1 ? "s" : ""}{" "}
              purchased. You'll receive a confirmation email shortly.
            </p>
          </div>
        </div>
      )}

      {/* Refund Message */}
      {refundMessage && (
        <div className={`refund-message ${refundMessage.type}`}>
          {refundMessage.type === "success" ? "✅" : "❌"} {refundMessage.text}
        </div>
      )}

      {/* Order Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>Total Orders</h3>
            <p>{stats.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Completed</h3>
            <p>{stats.completed}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <div className="stat-info">
            <h3>In Transit</h3>
            <p>{stats.shipped}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Total Spent</h3>
            <p>{formatCurrency(stats.totalSpent)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📥</div>
          <div className="stat-info">
            <h3>Digital</h3>
            <p>{stats.digitalItems}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>Physical</h3>
            <p>{stats.physicalItems}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="controls-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search orders by product, ID, or tracking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <div className="filter-tabs">
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "⏳ Pending" },
              { key: "shipped", label: "🚚 Shipped" },
              { key: "completed", label: "✅ Completed" },
              { key: "digital", label: "📥 Digital" },
              { key: "physical", label: "📦 Physical" },
            ].map((f) => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Highest Amount</option>
            <option value="amount-low">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-list">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div key={order.id} className={`order-card ${getStatusClass(order.status)}`}>
              <div className="order-card-header">
                <div className="order-id-section">
                  <span className="order-id">Order #{order.id}</span>
                  <span className="order-date">
                    {formatDate(order.created_at || order.purchased_at)}
                  </span>
                </div>
                <div className="order-header-right">
                  <span className={`type-badge ${(order.is_digital || order.product?.is_digital) ? "digital" : "physical"}`}>
                    {(order.is_digital || order.product?.is_digital) ? "📥 Digital" : "📦 Physical"}
                  </span>
                  <span className={`status-badge ${getStatusClass(order.status)}`}>
                    {getStatusIcon(order.status)} {order.status || "pending"}
                  </span>
                </div>
              </div>

              <div className="order-card-body">
                <div className="product-info">
                  {order.product_image || order.product?.image_url ? (
                    <img
                      src={order.product_image || order.product?.image_url}
                      alt={order.product_name || order.product?.title}
                      className="product-thumbnail"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="product-placeholder">🛍️</div>
                  )}
                  <div className="product-details">
                    <h4>{order.product_name || order.product?.title || "Product"}</h4>
                    {order.quantity && order.quantity > 1 && (
                      <span className="quantity">Qty: {order.quantity}</span>
                    )}
                    {order.seller_name && (
                      <span className="seller">Sold by: {order.seller_name}</span>
                    )}
                  </div>
                </div>

                <div className="order-amount">
                  <span className="amount">
                    {formatCurrency(order.total_amount || order.amount)}
                  </span>
                </div>
              </div>

              {/* Tracking Info */}
              {order.tracking_number && (
                <div className="tracking-info">
                  <span className="tracking-label">📍 Tracking:</span>
                  <span className="tracking-number">{order.tracking_number}</span>
                  {order.carrier && (
                    <span className="carrier-badge">{order.carrier}</span>
                  )}
                </div>
              )}

              {/* Shipping Address */}
              {order.shipping_address && (
                <div className="shipping-address">
                  <span className="address-label">📫 Ships to:</span>
                  <span className="address-text">{order.shipping_address}</span>
                </div>
              )}

              {/* Shipping Timeline */}
              {order.shipped_at && (
                <div className="shipping-timeline">
                  <div className="timeline-item">
                    <span className="timeline-icon">📦</span>
                    <span>Ordered {formatDateTime(order.created_at || order.purchased_at)}</span>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-icon">🚚</span>
                    <span>Shipped {formatDateTime(order.shipped_at)}</span>
                  </div>
                  {(order.status === "completed" || order.status === "delivered") && (
                    <div className="timeline-item">
                      <span className="timeline-icon">✅</span>
                      <span>Delivered {formatDateTime(order.delivered_at || order.completed_at)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Order Actions */}
              <div className="order-actions">
                {order.product_id && (
                  <Link to={`/product/${order.product_id}`} className="btn-action">
                    👁️ View Product
                  </Link>
                )}

                {/* Download for digital products */}
                {(order.is_digital || order.product?.is_digital) &&
                  (order.download_url || order.download_link) && (
                    <button
                      className="btn-action download"
                      onClick={() =>
                        handleDownload(
                          order.product_id,
                          order.product_name || order.product?.title
                        )
                      }
                      disabled={downloadingId === order.product_id}
                    >
                      {downloadingId === order.product_id
                        ? "⏳ Downloading..."
                        : "📥 Download"}
                    </button>
                  )}

                {/* Refund request */}
                {order.status !== "refunded" &&
                  order.status !== "cancelled" && (
                    <button
                      className="btn-action refund"
                      onClick={() => requestRefund(order.id, order.product_id)}
                    >
                      💰 Request Refund
                    </button>
                  )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No Orders Found</h3>
            {filter !== "all" || searchTerm ? (
              <p>
                No orders match your current filters.{" "}
                <button
                  className="btn-link"
                  onClick={() => {
                    setFilter("all");
                    setSearchTerm("");
                  }}
                >
                  Clear filters
                </button>
              </p>
            ) : (
              <>
                <p>You haven't made any purchases yet.</p>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/marketplace")}
                >
                  🛍️ Browse Marketplace
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Order Summary */}
      {orders.length > 0 && (
        <div className="order-summary-section">
          <h3>📊 Order Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-value">{stats.total}</span>
              <span className="summary-label">Total Orders</span>
            </div>
            <div className="summary-item">
              <span className="summary-value">{formatCurrency(stats.totalSpent)}</span>
              <span className="summary-label">Total Spent</span>
            </div>
            <div className="summary-item">
              <span className="summary-value">{stats.digitalItems}</span>
              <span className="summary-label">Digital Items</span>
            </div>
            <div className="summary-item">
              <span className="summary-value">{stats.physicalItems}</span>
              <span className="summary-label">Physical Items</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryPage;