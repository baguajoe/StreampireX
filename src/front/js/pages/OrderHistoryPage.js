import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/OrderHistoryPage.css"

const OrderHistoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState("all"); // all, digital, physical, pending, completed
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchOrders();

        // If coming from checkout with new purchases, show success message
        if (location.state?.newPurchases) {
            setTimeout(() => {
                alert("Order completed successfully! Your items are listed below.");
            }, 500);
        }
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/orders`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            } else if (response.status === 404) {
                // No orders found
                setOrders([]);
            } else {
                throw new Error("Failed to fetch orders");
            }
        } catch (err) {
            console.error("Error fetching orders:", err);
            setError("Failed to load order history");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (productId, fileName) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/${productId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName || `product_${productId}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                const errorData = await response.json();
                alert(`Download failed: ${errorData.message}`);
            }
        } catch (err) {
            console.error("Download error:", err);
            alert("Download failed. Please try again.");
        }
    };

    const requestRefund = async (orderId, productId) => {
        const reason = prompt("Please provide a reason for the refund request:");
        if (!reason) return;

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/refund/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    product_id: productId,
                    order_id: orderId,
                    reason: reason
                })
            });

            if (response.ok) {
                alert("Refund request submitted successfully!");
                fetchOrders(); // Refresh orders
            } else {
                const errorData = await response.json();
                alert(`Refund request failed: ${errorData.message}`);
            }
        } catch (err) {
            console.error("Refund request error:", err);
            alert("Failed to submit refund request. Please try again.");
        }
    };

    const getFilteredOrders = () => {
        let filtered = orders;

        // Filter by type
        if (filter === "digital") {
            filtered = filtered.filter(order => order.product?.is_digital);
        } else if (filter === "physical") {
            filtered = filtered.filter(order => !order.product?.is_digital);
        } else if (filter === "pending") {
            filtered = filtered.filter(order => order.status === "pending" || order.status === "processing");
        } else if (filter === "completed") {
            filtered = filtered.filter(order => order.status === "completed" || order.status === "delivered");
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.product?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.id.toString().includes(searchTerm)
            );
        }

        return filtered;
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            pending: { class: "bg-warning", text: "⏳ Pending" },
            processing: { class: "bg-info", text: "🔄 Processing" },
            completed: { class: "bg-success", text: "✅ Completed" },
            delivered: { class: "bg-success", text: "📦 Delivered" },
            cancelled: { class: "bg-danger", text: "❌ Cancelled" },
            refunded: { class: "bg-secondary", text: "💰 Refunded" }
        };

        const statusInfo = statusMap[status] || { class: "bg-secondary", text: status };
        return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading your order history...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <h4>Error Loading Orders</h4>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchOrders}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const filteredOrders = getFilteredOrders();

    return (
        <div className="container mt-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>📦 Order History</h2>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate("/marketplace")}
                        >
                            🛒 Continue Shopping
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="row mb-4">
                <div className="col-md-8">
                    <div className="btn-group" role="group">
                        <button
                            className={`btn ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setFilter("all")}
                        >
                            All Orders
                        </button>
                        <button
                            className={`btn ${filter === "digital" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setFilter("digital")}
                        >
                            📥 Digital
                        </button>
                        <button
                            className={`btn ${filter === "physical" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setFilter("physical")}
                        >
                            📦 Physical
                        </button>
                        <button
                            className={`btn ${filter === "pending" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setFilter("pending")}
                        >
                            ⏳ Pending
                        </button>
                        <button
                            className={`btn ${filter === "completed" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setFilter("completed")}
                        >
                            ✅ Completed
                        </button>
                    </div>
                </div>
                <div className="col-md-4">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="🔍 Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <div className="mb-4">
                                    <i className="fas fa-shopping-bag fa-4x text-muted"></i>
                                </div>
                                <h4 className="card-title">No Orders Found</h4>
                                <p className="card-text text-muted">
                                    {searchTerm || filter !== "all"
                                        ? "No orders match your current filters."
                                        : "You haven't made any purchases yet."
                                    }
                                </p>
                                <div className="d-flex gap-2 justify-content-center">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => navigate("/marketplace")}
                                    >
                                        🛒 Start Shopping
                                    </button>
                                    {(searchTerm || filter !== "all") && (
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={() => {
                                                setSearchTerm("");
                                                setFilter("all");
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="row">
                    <div className="col-12">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="card mb-3">
                                <div className="card-body">
                                    <div className="row align-items-center">
                                        {/* Product Image */}
                                        <div className="col-md-2">
                                            <img
                                                src={order.product?.image_url || "/default-product.jpg"}
                                                alt={order.product?.title}
                                                className="img-fluid rounded"
                                                style={{ height: "80px", objectFit: "cover" }}
                                            />
                                        </div>

                                        {/* Order Details */}
                                        <div className="col-md-4">
                                            <h6 className="card-title mb-1">{order.product?.title}</h6>
                                            <p className="text-muted small mb-1">
                                                Order #{order.id} • {formatDate(order.purchased_at)}
                                            </p>
                                            <div className="d-flex gap-2 align-items-center">
                                                {getStatusBadge(order.status || "completed")}
                                                <span className="badge bg-primary">
                                                    {order.product?.is_digital ? "📥 Digital" : "📦 Physical"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Quantity & Price */}
                                        <div className="col-md-2 text-center">
                                            <div className="fw-bold">Qty: {order.quantity || 1}</div>
                                            <div className="text-muted">${order.amount}</div>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-md-4">
                                            <div className="d-grid gap-2">
                                                {/* Download button for digital products */}
                                                {order.product?.is_digital && order.download_link && (
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleDownload(order.product_id, order.product?.title)}
                                                    >
                                                        📥 Download
                                                    </button>
                                                )}

                                                {/* View product button */}
                                                <button
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => navigate(`/product/${order.product_id}`)}
                                                >
                                                    👁️ View Product
                                                </button>

                                                {/* Refund button (only for recent orders) */}
                                                {order.status !== "refunded" && order.status !== "cancelled" && (
                                                    <button
                                                        className="btn btn-outline-warning btn-sm"
                                                        onClick={() => requestRefund(order.id, order.product_id)}
                                                    >
                                                        💰 Request Refund
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Order Info */}
                                    {(order.shipping_address || order.tracking_number) && (
                                        <div className="row mt-3">
                                            <div className="col-12">
                                                <div className="border-top pt-3">
                                                    {order.shipping_address && (
                                                        <div className="mb-2">
                                                            <strong>Shipping Address:</strong>
                                                            <span className="text-muted ms-2">{order.shipping_address}</span>
                                                        </div>
                                                    )}
                                                    {order.tracking_number && (
                                                        <div>
                                                            <strong>Tracking Number:</strong>
                                                            <span className="text-muted ms-2">{order.tracking_number}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            {orders.length > 0 && (
                <div className="row mt-5">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">📊 Order Summary</h5>
                                <div className="row text-center">
                                    <div className="col-md-3">
                                        <div className="fw-bold fs-4">{orders.length}</div>
                                        <div className="text-muted">Total Orders</div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="fw-bold fs-4">
                                            ${orders.reduce((sum, order) => sum + parseFloat(order.amount), 0).toFixed(2)}
                                        </div>
                                        <div className="text-muted">Total Spent</div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="fw-bold fs-4">
                                            {orders.filter(order => order.product?.is_digital).length}
                                        </div>
                                        <div className="text-muted">Digital Items</div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="fw-bold fs-4">
                                            {orders.filter(order => !order.product?.is_digital).length}
                                        </div>
                                        <div className="text-muted">Physical Items</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderHistoryPage;