import React, { useState, useEffect } from 'react';
// import '../../styles/SellerDashboard.css';

const SellerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/seller/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      setOrders(data.orders);
      setStats(data.stats);
    }
    setLoading(false);
  };

  const fulfillOrder = async (orderId, trackingNumber, carrier) => {
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
    }
  };

  return (
    <div className="seller-dashboard">
      <h1>📦 Seller Dashboard</h1>
      
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>💰 Total Sales</h3>
          <p>${stats.total_sales?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="stat-card">
          <h3>⏳ Pending Orders</h3>
          <p>{stats.pending_orders || 0}</p>
        </div>
        <div className="stat-card">
          <h3>✅ Completed</h3>
          <p>{stats.completed_orders || 0}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-section">
        <h2>Recent Orders</h2>
        {orders.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <span className="order-id">Order #{order.id}</span>
              <span className={`status-badge ${order.status}`}>
                {order.status}
              </span>
            </div>
            
            <div className="order-details">
              <p><strong>Product:</strong> {order.product_name}</p>
              <p><strong>Amount:</strong> ${order.total_amount}</p>
              <p><strong>Buyer:</strong> {order.buyer_email}</p>
              <p><strong>Shipping:</strong> {order.shipping_address}</p>
            </div>

            {order.status === 'pending' && (
              <div className="fulfillment-form">
                <input
                  type="text"
                  placeholder="Tracking Number"
                  id={`tracking-${order.id}`}
                />
                <select id={`carrier-${order.id}`}>
                  <option value="USPS">USPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="UPS">UPS</option>
                </select>
                <button onClick={() => {
                  const tracking = document.getElementById(`tracking-${order.id}`).value;
                  const carrier = document.getElementById(`carrier-${order.id}`).value;
                  fulfillOrder(order.id, tracking, carrier);
                }}>
                  📦 Mark as Shipped
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SellerDashboard;