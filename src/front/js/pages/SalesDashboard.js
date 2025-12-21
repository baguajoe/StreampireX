import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/SalesDashboard.css";

const SalesDashboard = () => {
    const navigate = useNavigate();
    
    // Sales Analytics State
    const [salesData, setSalesData] = useState({
        totalRevenue: 0,
        totalProducts: 0,
        totalOrders: 0,
        platformCut: 0,
        creatorEarnings: 0
    });
    const [recentSales, setRecentSales] = useState([]);
    const [products, setProducts] = useState([]);
    
    // Order Management State (from SellerDashboard)
    const [orders, setOrders] = useState([]);
    const [orderStats, setOrderStats] = useState({
        total_sales: 0,
        pending_orders: 0,
        completed_orders: 0
    });
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeFilter, setTimeFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        fetchAllData();
    }, [timeFilter]);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
            fetchSalesData(),
            fetchRecentSales(),
            fetchMyProducts(),
            fetchOrders()
        ]);
        setLoading(false);
    };

    const fetchSalesData = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/revenue-analytics?period=${timeFilter}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSalesData({
                    totalRevenue: data.total_revenue || 0,
                    totalProducts: data.total_products || 0,
                    totalOrders: data.total_orders || 0,
                    platformCut: data.platform_cut || 0,
                    creatorEarnings: data.creator_earnings || 0
                });
            } else {
                throw new Error("Failed to fetch sales data");
            }
        } catch (err) {
            console.error("Error fetching sales data:", err);
            setError("Failed to load sales analytics");
        }
    };

    const fetchRecentSales = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/sales?limit=10`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setRecentSales(data);
            }
        } catch (err) {
            console.error("Error fetching recent sales:", err);
        }
    };

    const fetchMyProducts = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/storefront`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (err) {
            console.error("Error fetching products:", err);
        }
    };

    // Order Management Functions (from SellerDashboard)
    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/seller/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setOrders(data.orders || []);
                setOrderStats(data.stats || {
                    total_sales: 0,
                    pending_orders: 0,
                    completed_orders: 0
                });
            }
        } catch (err) {
            console.error("Error fetching orders:", err);
        }
    };

    const fulfillOrder = async (orderId, trackingNumber, carrier) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${process.env.REACT_APP_BACKEND_URL}/api/marketplace/orders/${orderId}/fulfill`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tracking_number: trackingNumber, carrier })
                }
            );
            
            if (response.ok) {
                alert('Order marked as shipped!');
                fetchOrders();
            } else {
                alert('Failed to fulfill order. Please try again.');
            }
        } catch (err) {
            console.error("Error fulfilling order:", err);
            alert('Error fulfilling order. Please try again.');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
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

    const getTopPerformingProducts = () => {
        return products
            .filter(product => product.sales_count > 0)
            .sort((a, b) => (b.sales_revenue || 0) - (a.sales_revenue || 0))
            .slice(0, 5);
    };

    const getConversionRate = () => {
        if (products.length === 0) return 0;
        const productsWithSales = products.filter(p => p.sales_count > 0).length;
        return ((productsWithSales / products.length) * 100).toFixed(1);
    };

    const getPendingOrders = () => {
        return orders.filter(order => order.status === 'pending' || order.status === 'processing');
    };

    const getCompletedOrders = () => {
        return orders.filter(order => order.status === 'completed' || order.status === 'shipped');
    };

    if (loading) {
        return (
            <div className="sales-dashboard">
                <div className="loading-state">
                    <div className="loading-icon">💰</div>
                    <p>Loading your sales dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sales-dashboard">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <h3>Error Loading Dashboard</h3>
                    <p>{error}</p>
                    <button className="btn-primary" onClick={fetchAllData}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const topProducts = getTopPerformingProducts();
    const pendingOrders = getPendingOrders();
    const completedOrders = getCompletedOrders();

    const renderOverview = () => (
        <div className="overview-content">
            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card revenue">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                        <h3>Total Revenue</h3>
                        <p>{formatCurrency(salesData.totalRevenue)}</p>
                        <span className="stat-change positive">Gross sales</span>
                    </div>
                </div>

                <div className="stat-card earnings">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-info">
                        <h3>Your Earnings</h3>
                        <p>{formatCurrency(salesData.creatorEarnings)}</p>
                        <span className="stat-change">After platform fee</span>
                    </div>
                </div>

                <div className="stat-card orders">
                    <div className="stat-icon">📦</div>
                    <div className="stat-info">
                        <h3>Total Orders</h3>
                        <p>{salesData.totalOrders}</p>
                        <span className="stat-change">{pendingOrders.length} pending</span>
                    </div>
                </div>

                <div className="stat-card products">
                    <div className="stat-icon">🛍️</div>
                    <div className="stat-info">
                        <h3>Active Products</h3>
                        <p>{salesData.totalProducts}</p>
                        <span className="stat-change">{getConversionRate()}% selling</span>
                    </div>
                </div>
            </div>

            {/* Time Filter */}
            <div className="time-filter-section">
                <div className="time-filter-buttons">
                    {['all', 'week', 'month', 'year'].map((filter) => (
                        <button
                            key={filter}
                            className={`filter-btn ${timeFilter === filter ? 'active' : ''}`}
                            onClick={() => setTimeFilter(filter)}
                        >
                            {filter === 'all' ? 'All Time' : `This ${filter.charAt(0).toUpperCase() + filter.slice(1)}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Revenue Breakdown & Quick Stats */}
            <div className="dashboard-grid">
                <div className="revenue-breakdown-section">
                    <h3>💸 Revenue Breakdown</h3>
                    <div className="breakdown-content">
                        <div className="breakdown-row">
                            <span>Gross Revenue:</span>
                            <span className="value">{formatCurrency(salesData.totalRevenue)}</span>
                        </div>
                        <div className="breakdown-row platform-fee">
                            <span>Platform Fee (10%):</span>
                            <span className="value">-{formatCurrency(salesData.platformCut)}</span>
                        </div>
                        <div className="breakdown-divider"></div>
                        <div className="breakdown-row earnings-total">
                            <span>Your Earnings:</span>
                            <span className="value">{formatCurrency(salesData.creatorEarnings)}</span>
                        </div>
                        
                        {/* Earnings Progress Bar */}
                        <div className="earnings-progress">
                            <div className="progress-label">Earnings vs Platform Fee</div>
                            <div className="progress-bar-container">
                                <div 
                                    className="progress-bar-fill"
                                    style={{ 
                                        width: `${salesData.totalRevenue > 0 ? (salesData.creatorEarnings / salesData.totalRevenue) * 100 : 90}%` 
                                    }}
                                >
                                    <span>90% Yours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="quick-stats-section">
                    <h3>📊 Quick Stats</h3>
                    <div className="quick-stats-grid">
                        <div className="quick-stat">
                            <div className="quick-stat-value">
                                {salesData.totalOrders > 0 ? formatCurrency(salesData.totalRevenue / salesData.totalOrders) : "$0"}
                            </div>
                            <div className="quick-stat-label">Avg Order Value</div>
                        </div>
                        <div className="quick-stat">
                            <div className="quick-stat-value">{getConversionRate()}%</div>
                            <div className="quick-stat-label">Products Selling</div>
                        </div>
                        <div className="quick-stat">
                            <div className="quick-stat-value">{products.filter(p => p.is_digital).length}</div>
                            <div className="quick-stat-label">Digital Products</div>
                        </div>
                        <div className="quick-stat">
                            <div className="quick-stat-value">{products.filter(p => !p.is_digital).length}</div>
                            <div className="quick-stat-label">Physical Products</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performing Products */}
            <div className="top-products-section">
                <h3>🏆 Top Performing Products</h3>
                {topProducts.length > 0 ? (
                    <div className="products-table">
                        <div className="table-header">
                            <span>Product</span>
                            <span>Type</span>
                            <span>Sales</span>
                            <span>Revenue</span>
                            <span>Price</span>
                            <span>Actions</span>
                        </div>
                        {topProducts.map((product) => (
                            <div key={product.id} className="table-row">
                                <div className="product-cell">
                                    <img 
                                        src={product.image_url || "/default-product.jpg"}
                                        alt={product.title}
                                        className="product-thumbnail"
                                    />
                                    <div className="product-details">
                                        <span className="product-name">{product.title}</span>
                                        <span className="product-id">#{product.id}</span>
                                    </div>
                                </div>
                                <span className={`type-badge ${product.is_digital ? 'digital' : 'physical'}`}>
                                    {product.is_digital ? "📥 Digital" : "📦 Physical"}
                                </span>
                                <span className="sales-count">{product.sales_count || 0}</span>
                                <span className="revenue-amount">{formatCurrency(product.sales_revenue || 0)}</span>
                                <span className="price">{formatCurrency(product.price)}</span>
                                <div className="action-buttons">
                                    <button 
                                        className="action-btn view"
                                        onClick={() => navigate(`/product/${product.id}`)}
                                    >
                                        👁️ View
                                    </button>
                                    <button 
                                        className="action-btn edit"
                                        onClick={() => navigate(`/storefront/edit/${product.id}`)}
                                    >
                                        ✏️ Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h4>No Sales Yet</h4>
                        <p>Start selling to see your top performing products here!</p>
                        <button 
                            className="btn-primary"
                            onClick={() => navigate("/storefront")}
                        >
                            ➕ Add Your First Product
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Actions - AT THE BOTTOM */}
            <div className="quick-actions-section">
                <h3>Quick Actions</h3>
                <div className="quick-actions-grid">
                    <button
                        className="quick-action-card"
                        onClick={() => navigate("/storefront")}
                    >
                        <div className="action-icon">➕</div>
                        <h4>Add Product</h4>
                        <p>List new item</p>
                    </button>

                    <button
                        className="quick-action-card"
                        onClick={() => setActiveTab("orders")}
                    >
                        <div className="action-icon">📦</div>
                        <h4>Manage Orders</h4>
                        <p>{pendingOrders.length} pending</p>
                    </button>

                    <button
                        className="quick-action-card"
                        onClick={() => navigate("/storefront")}
                    >
                        <div className="action-icon">🏪</div>
                        <h4>My Store</h4>
                        <p>View storefront</p>
                    </button>

                    <button
                        className="quick-action-card"
                        onClick={() => setActiveTab("history")}
                    >
                        <div className="action-icon">📈</div>
                        <h4>Sales History</h4>
                        <p>View all sales</p>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderOrders = () => (
        <div className="orders-content">
            {/* Order Stats */}
            <div className="order-stats-grid">
                <div className="order-stat-card pending">
                    <div className="order-stat-icon">⏳</div>
                    <div className="order-stat-info">
                        <h3>Pending Orders</h3>
                        <p>{pendingOrders.length}</p>
                    </div>
                </div>

                <div className="order-stat-card completed">
                    <div className="order-stat-icon">✅</div>
                    <div className="order-stat-info">
                        <h3>Completed</h3>
                        <p>{completedOrders.length}</p>
                    </div>
                </div>

                <div className="order-stat-card total">
                    <div className="order-stat-icon">📊</div>
                    <div className="order-stat-info">
                        <h3>Total Orders</h3>
                        <p>{orders.length}</p>
                    </div>
                </div>
            </div>

            {/* Pending Orders - Need Fulfillment */}
            {pendingOrders.length > 0 && (
                <div className="pending-orders-section">
                    <h3>⏳ Orders Awaiting Shipment</h3>
                    <div className="orders-list">
                        {pendingOrders.map(order => (
                            <div key={order.id} className="order-card pending">
                                <div className="order-header">
                                    <span className="order-id">Order #{order.id}</span>
                                    <span className="status-badge pending">{order.status}</span>
                                </div>
                                
                                <div className="order-details">
                                    <div className="order-detail-row">
                                        <span className="label">Product:</span>
                                        <span className="value">{order.product_name || order.product?.title}</span>
                                    </div>
                                    <div className="order-detail-row">
                                        <span className="label">Amount:</span>
                                        <span className="value amount">{formatCurrency(order.total_amount || order.amount)}</span>
                                    </div>
                                    <div className="order-detail-row">
                                        <span className="label">Buyer:</span>
                                        <span className="value">{order.buyer_email || `Customer #${order.user_id}`}</span>
                                    </div>
                                    {order.shipping_address && (
                                        <div className="order-detail-row">
                                            <span className="label">Ship To:</span>
                                            <span className="value">{order.shipping_address}</span>
                                        </div>
                                    )}
                                    <div className="order-detail-row">
                                        <span className="label">Date:</span>
                                        <span className="value">{formatDate(order.created_at || order.purchased_at)}</span>
                                    </div>
                                </div>

                                <div className="fulfillment-form">
                                    <h4>📦 Fulfill Order</h4>
                                    <div className="fulfillment-inputs">
                                        <input
                                            type="text"
                                            placeholder="Tracking Number"
                                            id={`tracking-${order.id}`}
                                            className="tracking-input"
                                        />
                                        <select id={`carrier-${order.id}`} className="carrier-select">
                                            <option value="USPS">USPS</option>
                                            <option value="FedEx">FedEx</option>
                                            <option value="UPS">UPS</option>
                                            <option value="DHL">DHL</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <button 
                                            className="btn-fulfill"
                                            onClick={() => {
                                                const tracking = document.getElementById(`tracking-${order.id}`).value;
                                                const carrier = document.getElementById(`carrier-${order.id}`).value;
                                                if (!tracking) {
                                                    alert('Please enter a tracking number');
                                                    return;
                                                }
                                                fulfillOrder(order.id, tracking, carrier);
                                            }}
                                        >
                                            📦 Mark as Shipped
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Orders */}
            <div className="all-orders-section">
                <h3>📋 All Orders</h3>
                {orders.length > 0 ? (
                    <div className="orders-table">
                        <div className="table-header">
                            <span>Order ID</span>
                            <span>Date</span>
                            <span>Product</span>
                            <span>Customer</span>
                            <span>Amount</span>
                            <span>Status</span>
                        </div>
                        {orders.map(order => (
                            <div key={order.id} className="table-row">
                                <span className="order-id-cell">#{order.id}</span>
                                <span>{formatDate(order.created_at || order.purchased_at)}</span>
                                <span className="product-name-cell">{order.product_name || order.product?.title}</span>
                                <span>{order.buyer_email || `Customer #${order.user_id}`}</span>
                                <span className="amount-cell">{formatCurrency(order.total_amount || order.amount)}</span>
                                <span className={`status-badge ${order.status}`}>
                                    {order.status === 'completed' || order.status === 'shipped' ? '✅' : '⏳'} {order.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h4>No Orders Yet</h4>
                        <p>Your orders will appear here when customers make purchases.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderHistory = () => (
        <div className="history-content">
            <div className="section-header">
                <h3>📈 Sales History</h3>
            </div>

            {recentSales.length > 0 ? (
                <div className="sales-table">
                    <div className="table-header">
                        <span>Date</span>
                        <span>Product</span>
                        <span>Customer</span>
                        <span>Quantity</span>
                        <span>Amount</span>
                        <span>Status</span>
                    </div>
                    {recentSales.map((sale) => (
                        <div key={sale.id} className="table-row">
                            <span>{formatDate(sale.purchased_at)}</span>
                            <div className="product-cell">
                                <span className="product-name">{sale.product?.title}</span>
                            </div>
                            <span>Customer #{sale.user_id}</span>
                            <span>{sale.quantity || 1}</span>
                            <span className="amount-cell">{formatCurrency(sale.amount)}</span>
                            <span className="status-badge completed">✅ Completed</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">📈</div>
                    <h4>No Sales Yet</h4>
                    <p>Your sales history will appear here.</p>
                    <button 
                        className="btn-primary"
                        onClick={() => navigate("/storefront")}
                    >
                        🏪 Setup Your Store
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="sales-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="header-info">
                        <h1>💰 Sales Dashboard</h1>
                        <p className="header-subtitle">Track your revenue, manage orders, and grow your business</p>
                    </div>
                    <div className="header-actions">
                        <button 
                            className="btn-secondary"
                            onClick={() => navigate("/storefront")}
                        >
                            🏪 Manage Store
                        </button>
                        <button 
                            className="btn-primary"
                            onClick={() => navigate("/storefront")}
                        >
                            ➕ Add Product
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="dashboard-nav">
                <button 
                    className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Overview
                </button>
                <button 
                    className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                >
                    📦 Orders {pendingOrders.length > 0 && <span className="badge">{pendingOrders.length}</span>}
                </button>
                <button 
                    className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📈 Sales History
                </button>
            </nav>

            {/* Main Content */}
            <div className="dashboard-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'history' && renderHistory()}
            </div>
        </div>
    );
};

export default SalesDashboard;