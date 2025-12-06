// src/front/js/pages/CreatorDashboard.js - Two Column Layout with Left Sidebar
import React, { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { Link } from "react-router-dom";
import ProductUploadForm from "../component/ProductUploadForm";
import "../../styles/creatorDashboard.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const CreatorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState({});
  const [socialShares, setSocialShares] = useState({});
  const [contentBreakdown, setContentBreakdown] = useState({});
  const [earnings, setEarnings] = useState({});
  const [myProducts, setMyProducts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const token = localStorage.getItem("token");

        // Fetch profile data
        const profileRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/creator/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        }

        // Fetch social shares data
        const sharesRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/creator/social-shares`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (sharesRes.ok) {
          const sharesData = await sharesRes.json();
          setSocialShares(sharesData);
        }

        // Fetch content breakdown
        const contentRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/creator/content-breakdown`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const contentData = await contentRes.json();
          setContentBreakdown(contentData);
        }

        // Fetch earnings data
        const earningsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/creator/earnings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (earningsRes.ok) {
          const earningsData = await earningsRes.json();
          setEarnings(earningsData);
        }

        // Fetch my products
        const productsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/creator/my-products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setMyProducts(productsData.products || []);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchOverviewData();
  }, []);

  const shareBreakdownData = {
    labels: ['Facebook', 'Twitter', 'Instagram', 'TikTok'],
    datasets: [{
      data: [
        socialShares.facebook || 0,
        socialShares.twitter || 0,
        socialShares.instagram || 0,
        socialShares.tiktok || 0
      ],
      backgroundColor: ['#1877F2', '#1DA1F2', '#E4405F', '#000000'],
      borderWidth: 0
    }]
  };

  const contentBreakdownData = {
    labels: ['Podcasts', 'Radio Stations', 'Music Tracks', 'Live Streams', 'Products'],
    datasets: [{
      data: [
        contentBreakdown.podcasts || 0,
        contentBreakdown.radioStations || 0,
        contentBreakdown.musicTracks || 0,
        contentBreakdown.liveStreams || 0,
        myProducts.length || 0
      ],
      backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFB347'],
      borderWidth: 0
    }]
  };

  const monthlyGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Total Engagement',
      data: [1200, 1900, 3000, 5000, 7000, 8956],
      borderColor: '#45B7D1',
      backgroundColor: 'rgba(69, 183, 209, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'podcast': return '🎙️';
      case 'music': return '🎵';
      case 'radio': return '📻';
      case 'livestream': return '📹';
      case 'product': return '🛍️';
      default: return '📄';
    }
  };

  const handleProductUploaded = () => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/creator/my-products`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.products) {
        setMyProducts(data.products);
      }
    })
    .catch(error => console.error("Error refreshing products:", error));
  };

  const calculateTotalEarnings = () => {
    const productEarnings = myProducts.reduce((total, product) => {
      return total + ((product.sales_count || 0) * (product.price || 0) * 0.9);
    }, 0);
    
    return {
      products: productEarnings,
      content: earnings.content || 0,
      total: productEarnings + (earnings.content || 0)
    };
  };

  const totalEarnings = calculateTotalEarnings();

  return (
    <div className="creator-dashboard">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="creator-profile-overview">
          <img
            src={profile.profile_picture || "https://via.placeholder.com/80"}
            alt="Creator Profile"
            className="profile-avatar"
          />
          <div className="profile-info">
            <h1>{profile.username || 'Creator'}</h1>
            <p className="profile-subtitle">{profile.bio || 'Content Creator'}</p>
            <div className="profile-stats">
              <span className="stat">
                <strong>{profile.followers || 0}</strong> Followers
              </span>
              <span className="stat">
                <strong>{profile.following || 0}</strong> Following
              </span>
              <span className="stat">
                <strong>{myProducts.length}</strong> Products
              </span>
            </div>
          </div>
        </div>
        
        <div className="earnings-overview">
          <div className="earnings-card">
            <h3>Total Earnings</h3>
            <div className="earnings-amount">${totalEarnings.total.toFixed(2)}</div>
            <div className="earnings-breakdown">
              <small>Products: ${totalEarnings.products.toFixed(2)}</small>
              <small>Content: ${totalEarnings.content.toFixed(2)}</small>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`nav-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🛍️ My Products ({myProducts.length})
        </button>
        <button 
          className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          ⬆️ Upload Product
        </button>
        <button 
          className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </nav>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Overview Tab - Two Column Layout */}
        {activeTab === 'overview' && (
          <div className="overview-tab" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            alignItems: 'flex-start'
          }}>
            {/* LEFT COLUMN - Quick Actions */}
            <section style={{
              order: 1,
              flex: '0 0 160px',
              width: '160px',
              position: 'static',
              alignSelf: 'stretch',
              background: 'linear-gradient(145deg, #1f2937, #111827)',
              padding: '15px',
              borderRadius: '12px',
              border: '1px solid #374151',
              marginTop: '0'
            }}>
              <div style={{
                marginBottom: '12px',
                paddingBottom: '10px',
                borderBottom: '2px solid #374151'
              }}>
                <h2 style={{ fontSize: '14px', color: '#00ffc8', margin: 0, fontWeight: 600 }}>Quick Actions</h2>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <Link to="/podcast-create" style={{ 
                  display: 'block',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #fd79a8, #e84393)',
                  color: '#0d1117',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  🎙️ Podcast
                </Link>
                <Link to="/upload-music" style={{ 
                  display: 'block',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #00b894, #00cec9)',
                  color: '#0d1117',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  🎵 Music
                </Link>
                <Link to="/create-radio" style={{ 
                  display: 'block',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  color: '#0d1117',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  📻 Radio
                </Link>
                <button 
                  onClick={() => setActiveTab('upload')}
                  style={{ 
                    display: 'block',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #FF6600, #ff8833)',
                    color: '#0d1117',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'left'
                  }}
                >
                  🛍️ Product
                </button>
              </div>
            </section>

            {/* RIGHT COLUMN - Analytics Charts */}
            <section style={{
              order: 2,
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '20px'
              }}>
                <div style={{
                  background: 'linear-gradient(145deg, #1f2937, #111827)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #374151'
                }}>
                  <h3 style={{ color: '#00ffc8', fontSize: '16px', margin: '0 0 15px 0', fontWeight: 600 }}>Social Media Shares</h3>
                  <div style={{ height: '220px', position: 'relative' }}>
                    <Doughnut 
                      data={shareBreakdownData} 
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { 
                          legend: { 
                            position: 'bottom',
                            labels: { color: '#c9d1d9', padding: 15 }
                          } 
                        } 
                      }} 
                    />
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(145deg, #1f2937, #111827)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #374151'
                }}>
                  <h3 style={{ color: '#00ffc8', fontSize: '16px', margin: '0 0 15px 0', fontWeight: 600 }}>Content Breakdown</h3>
                  <div style={{ height: '220px', position: 'relative' }}>
                    <Doughnut 
                      data={contentBreakdownData} 
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { 
                          legend: { 
                            position: 'bottom',
                            labels: { color: '#c9d1d9', padding: 15 }
                          } 
                        } 
                      }} 
                    />
                  </div>
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(145deg, #1f2937, #111827)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #374151'
              }}>
                <h3 style={{ color: '#00ffc8', fontSize: '16px', margin: '0 0 15px 0', fontWeight: 600 }}>Monthly Growth Trend</h3>
                <div style={{ height: '220px', position: 'relative' }}>
                  <Line 
                    data={monthlyGrowthData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false, 
                      plugins: { 
                        legend: { display: false } 
                      }, 
                      scales: { 
                        y: { 
                          beginAtZero: true,
                          grid: { color: '#374151' },
                          ticks: { color: '#8b949e' }
                        },
                        x: {
                          grid: { color: '#374151' },
                          ticks: { color: '#8b949e' }
                        }
                      } 
                    }} 
                  />
                </div>
              </div>
            </section>

            {/* FULL WIDTH - Recent Activity */}
            <section className="recent-activity">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                    <div className="activity-content">
                      <p className="activity-text">{activity.text}</p>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  </div>
                )) : (
                  <div className="no-activity">
                    <p>🎬 No recent activity. Start creating content!</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* My Products Tab */}
        {activeTab === 'products' && (
          <div className="products-tab">
            <div className="products-header">
              <h2>My Products</h2>
              <button 
                className="btn-primary"
                onClick={() => setActiveTab('upload')}
              >
                + Upload New Product
              </button>
            </div>

            {myProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛍️</div>
                <h3>No products yet</h3>
                <p>Start selling by uploading your first product</p>
                <button 
                  className="btn-primary"
                  onClick={() => setActiveTab('upload')}
                >
                  Upload Product
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {myProducts.map(product => (
                  <div key={product.id} className="product-card">
                    <div className="product-image">
                      <img 
                        src={product.image_url || '/placeholder-product.jpg'} 
                        alt={product.title}
                        onError={(e) => e.target.src = '/placeholder-product.jpg'}
                      />
                      <div className="product-status">
                        <span className={`status-badge ${product.is_active ? 'active' : 'inactive'}`}>
                          {product.is_active ? 'Live' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="product-info">
                      <h3 className="product-title">{product.title}</h3>
                      <p className="product-description">{product.description}</p>
                      
                      <div className="product-stats">
                        <div className="stat">
                          <span className="stat-label">Price</span>
                          <span className="stat-value">${product.price}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Sales</span>
                          <span className="stat-value">{product.sales_count || 0}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Revenue</span>
                          <span className="stat-value">
                            ${((product.sales_count || 0) * product.price * 0.9).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="product-actions">
                        <button className="btn-edit">✏️ Edit</button>
                        <button className="btn-view">👁️ View</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Product Tab */}
        {activeTab === 'upload' && (
          <div className="upload-tab">
            <div className="upload-header">
              <h2>Upload New Product</h2>
              <p>Add products to your marketplace and start earning</p>
            </div>
            <ProductUploadForm onUpload={handleProductUploaded} />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <h2>Analytics & Insights</h2>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>📦 Product Performance</h3>
                <div className="metric">
                  <span className="metric-label">Total Products</span>
                  <span className="metric-value">{myProducts.length}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Total Sales</span>
                  <span className="metric-value">
                    {myProducts.reduce((total, product) => total + (product.sales_count || 0), 0)}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Average Price</span>
                  <span className="metric-value">
                    ${myProducts.length > 0 ? 
                      (myProducts.reduce((total, product) => total + product.price, 0) / myProducts.length).toFixed(2) 
                      : '0.00'}
                  </span>
                </div>
              </div>

              <div className="analytics-card">
                <h3>💰 Revenue Breakdown</h3>
                <div className="revenue-chart">
                  <div className="revenue-item">
                    <span className="revenue-label">Product Sales</span>
                    <span className="revenue-value">${totalEarnings.products.toFixed(2)}</span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Content Revenue</span>
                    <span className="revenue-value">${totalEarnings.content.toFixed(2)}</span>
                  </div>
                  <div className="revenue-item total">
                    <span className="revenue-label">Total Earnings</span>
                    <span className="revenue-value">${totalEarnings.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>🏆 Top Performing Products</h3>
                <div className="top-products">
                  {myProducts
                    .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
                    .slice(0, 3)
                    .map((product, index) => (
                      <div key={product.id} className="top-product">
                        <span className="top-rank">#{index + 1}</span>
                        <img 
                          src={product.image_url || '/placeholder-product.jpg'} 
                          alt={product.title}
                          className="top-product-image"
                        />
                        <div className="top-product-info">
                          <h4>{product.title}</h4>
                          <p>{product.sales_count || 0} sales</p>
                        </div>
                      </div>
                    ))}
                  {myProducts.length === 0 && (
                    <p className="no-products">No products to show yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorDashboard;