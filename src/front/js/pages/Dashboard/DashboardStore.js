// src/front/js/pages/Dashboard/DashboardStore.js
// Store Tab - Sales and orders management (from SalesDashboard)
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import "../../../styles/SalesDashboard.css";

const DashboardStore = ({ user }) => {
  const navigate = useNavigate();
  
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalProducts: 0,
    totalOrders: 0,
    platformCut: 0,
    creatorEarnings: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [timeFilter, setTimeFilter] = useState("all");

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
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/revenue-analytics?period=${timeFilter}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setSalesData({
          totalRevenue: data.total_revenue || 0,
          totalProducts: data.total_products || 0,
          totalOrders: data.total_orders || 0,
          platformCut: data.platform_cut || 0,
          creatorEarnings: data.creator_earnings || 0
        });
      }
    } catch (err) {
      console.error("Error fetching sales data:", err);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/user/sales?limit=10`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
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
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/storefront`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/marketplace/seller/orders`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const fulfillOrder = async (orderId, trackingNumber, carrier) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/marketplace/orders/${orderId}/fulfill`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracking_number: trackingNumber, carrier })
        }
      );
      if (response.ok) {
        showToast.success('Order marked as shipped!');
        fetchOrders();
      }
    } catch (err) {
      showToast.error('Error fulfilling order');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getTopProducts = () => {
    return products
      .filter(p => p.sales_count > 0)
      .sort((a, b) => (b.sales_revenue || 0) - (a.sales_revenue || 0))
      .slice(0, 5);
  };

  const getPendingOrders = () => orders.filter(o => o.status === 'pending' || o.status === 'processing');
  const getConversionRate = () => {
    if (products.length === 0) return 0;
    const selling = products.filter(p => p.sales_count > 0).length;
    return ((selling / products.length) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
        <p>Loading store data...</p>
      </div>
    );
  }

  const pendingOrders = getPendingOrders();
  const topProducts = getTopProducts();

  return (
    <div className="store-tab">
      {/* Header */}
      <div className="tab-header">
        <div className="header-left">
          <h2>🛍️ My Store</h2>
          <p>Track revenue, manage orders, and grow your business</p>
        </div>
        <div className="header-actions">
          <Link to="/storefront" className="btn-secondary">🏪 View Store</Link>
          <Link to="/storefront" className="btn-primary">➕ Add Product</Link>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="sub-tabs">
        {['overview', 'orders', 'history'].map(tab => (
          <button
            key={tab}
            className={`sub-tab ${activeSubTab === tab ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab)}
          >
            {tab === 'overview' && '📊'}
            {tab === 'orders' && '📦'}
            {tab === 'history' && '📈'}
            <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            {tab === 'orders' && pendingOrders.length > 0 && (
              <span className="badge">{pendingOrders.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Sub-tab */}
      {activeSubTab === 'overview' && (
        <div className="store-overview">
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>{formatCurrency(salesData.totalRevenue)}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <h3>{formatCurrency(salesData.creatorEarnings)}</h3>
                <p>Your Earnings (90%)</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>{salesData.totalOrders}</h3>
                <p>Total Orders</p>
                {pendingOrders.length > 0 && <small>{pendingOrders.length} pending</small>}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🛍️</div>
              <div className="stat-content">
                <h3>{products.length}</h3>
                <p>Products</p>
                <small>{getConversionRate()}% selling</small>
              </div>
            </div>
          </div>

          {/* Time Filter */}
          <div className="time-filter">
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

          {/* Revenue Breakdown */}
          <div className="revenue-breakdown">
            <h3>💸 Revenue Breakdown</h3>
            <div className="breakdown-content">
              <div className="breakdown-row">
                <span>Gross Revenue:</span>
                <span>{formatCurrency(salesData.totalRevenue)}</span>
              </div>
              <div className="breakdown-row fee">
                <span>Platform Fee (10%):</span>
                <span>-{formatCurrency(salesData.platformCut)}</span>
              </div>
              <div className="breakdown-divider"></div>
              <div className="breakdown-row total">
                <span>Your Earnings:</span>
                <span>{formatCurrency(salesData.creatorEarnings)}</span>
              </div>
              <div className="earnings-bar">
                <div className="bar-fill" style={{ width: '90%' }}>90% Yours</div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="top-products">
            <h3>🏆 Top Products</h3>
            {topProducts.length > 0 ? (
              <div className="products-list">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="product-row">
                    <span className="rank">#{index + 1}</span>
                    <img src={product.image_url || '/default-product.jpg'} alt={product.title} />
                    <div className="product-info">
                      <h4>{product.title}</h4>
                      <p>{product.sales_count || 0} sales • {formatCurrency(product.sales_revenue || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No sales yet. Start selling!</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions-grid">
              <Link to="/storefront" className="quick-action-card">
                <div className="action-icon">➕</div>
                <h4>Add Product</h4>
              </Link>
              <button className="quick-action-card" onClick={() => setActiveSubTab('orders')}>
                <div className="action-icon">📦</div>
                <h4>Manage Orders</h4>
                {pendingOrders.length > 0 && <span className="badge">{pendingOrders.length}</span>}
              </button>
              <Link to="/storefront" className="quick-action-card">
                <div className="action-icon">🏪</div>
                <h4>My Store</h4>
              </Link>
              <button className="quick-action-card" onClick={() => setActiveSubTab('history')}>
                <div className="action-icon">📈</div>
                <h4>Sales History</h4>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Sub-tab */}
      {activeSubTab === 'orders' && (
        <div className="orders-content">
          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <div className="pending-orders">
              <h3>⏳ Awaiting Shipment ({pendingOrders.length})</h3>
              <div className="orders-list">
                {pendingOrders.map(order => (
                  <div key={order.id} className="order-card pending">
                    <div className="order-header">
                      <span className="order-id">Order #{order.id}</span>
                      <span className="status-badge pending">{order.status}</span>
                    </div>
                    <div className="order-details">
                      <p><strong>Product:</strong> {order.product_name || order.product?.title}</p>
                      <p><strong>Amount:</strong> {formatCurrency(order.total_amount || order.amount)}</p>
                      <p><strong>Date:</strong> {formatDate(order.created_at)}</p>
                    </div>
                    <div className="fulfillment-form">
                      <input type="text" placeholder="Tracking Number" id={`tracking-${order.id}`} />
                      <select id={`carrier-${order.id}`}>
                        <option value="USPS">USPS</option>
                        <option value="FedEx">FedEx</option>
                        <option value="UPS">UPS</option>
                        <option value="DHL">DHL</option>
                      </select>
                      <button 
                        className="btn-primary"
                        onClick={() => {
                          const tracking = document.getElementById(`tracking-${order.id}`).value;
                          const carrier = document.getElementById(`carrier-${order.id}`).value;
                          if (!tracking) { showToast.error('Enter tracking number'); return; }
                          fulfillOrder(order.id, tracking, carrier);
                        }}
                      >
                        📦 Ship
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Orders */}
          <div className="all-orders">
            <h3>📋 All Orders ({orders.length})</h3>
            {orders.length > 0 ? (
              <div className="orders-table">
                <div className="table-header">
                  <span>Order</span>
                  <span>Date</span>
                  <span>Product</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                {orders.map(order => (
                  <div key={order.id} className="table-row">
                    <span>#{order.id}</span>
                    <span>{formatDate(order.created_at)}</span>
                    <span>{order.product_name || order.product?.title}</span>
                    <span>{formatCurrency(order.total_amount || order.amount)}</span>
                    <span className={`status-badge ${order.status}`}>
                      {order.status === 'completed' || order.status === 'shipped' ? '✅' : '⏳'} {order.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No orders yet.</p>
            )}
          </div>
        </div>
      )}

      {/* History Sub-tab */}
      {activeSubTab === 'history' && (
        <div className="history-content">
          <h3>📈 Sales History</h3>
          {recentSales.length > 0 ? (
            <div className="sales-table">
              <div className="table-header">
                <span>Date</span>
                <span>Product</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {recentSales.map((sale) => (
                <div key={sale.id} className="table-row">
                  <span>{formatDate(sale.purchased_at)}</span>
                  <span>{sale.product?.title}</span>
                  <span>{formatCurrency(sale.amount)}</span>
                  <span className="status-badge completed">✅ Completed</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <h4>No Sales Yet</h4>
              <p>Your sales history will appear here.</p>
              <Link to="/storefront" className="btn-primary">Setup Your Store</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardStore;