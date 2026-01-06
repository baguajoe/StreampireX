// src/front/js/pages/CreatorDashboard.js - Two Column Layout with Bottom Quick Actions
import React, { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { Link } from "react-router-dom";
import ProductUploadForm from "../component/ProductUploadForm";
import StorageStatus from "../component/StorageStatus";
import BandwidthStatus from "../component/BandwidthStatus";
import "../../styles/StorageStatus.css";
import "../../styles/BandwidthStatus.css";
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
  const [monthlyGrowth, setMonthlyGrowth] = useState({
    labels: [],
    engagement: []
  });
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    fetchOverviewData();
    
    // Auto-refresh activity every 30 seconds
    const activityInterval = setInterval(() => {
      fetchRecentActivity();
    }, 30000);
    
    return () => clearInterval(activityInterval);
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data in parallel
      const [
        profileRes,
        sharesRes,
        contentRes,
        earningsRes,
        productsRes,
        activityRes,
        growthRes
      ] = await Promise.allSettled([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profile`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/social-shares`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/content-breakdown`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/earnings`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/my-products`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/recent-activity`, { headers }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/monthly-growth`, { headers })
      ]);

      // Process profile
      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const profileData = await profileRes.value.json();
        setProfile(profileData);
      }

      // Process social shares
      if (sharesRes.status === 'fulfilled' && sharesRes.value.ok) {
        const sharesData = await sharesRes.value.json();
        setSocialShares(sharesData.platform_breakdown || sharesData);
      }

      // Process content breakdown
      if (contentRes.status === 'fulfilled' && contentRes.value.ok) {
        const contentData = await contentRes.value.json();
        // Handle both response formats
        if (contentData.breakdown) {
          setContentBreakdown({
            podcasts: contentData.breakdown.podcasts?.count || 0,
            radioStations: contentData.breakdown.radio_stations?.count || 0,
            musicTracks: contentData.breakdown.tracks?.count || 0,
            liveStreams: contentData.breakdown.videos?.count || 0,
            products: contentData.breakdown.products?.count || 0
          });
        } else {
          setContentBreakdown(contentData);
        }
      }

      // Process earnings
      if (earningsRes.status === 'fulfilled' && earningsRes.value.ok) {
        const earningsData = await earningsRes.value.json();
        setEarnings(earningsData);
      }

      // Process products
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const productsData = await productsRes.value.json();
        setMyProducts(productsData.products || []);
      }

      // Process recent activity
      if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
        const activityData = await activityRes.value.json();
        setRecentActivity(activityData.activities || []);
      }

      // Process monthly growth - THIS IS THE FIX!
      if (growthRes.status === 'fulfilled' && growthRes.value.ok) {
        const growthData = await growthRes.value.json();
        setMonthlyGrowth({
          labels: growthData.labels || [],
          engagement: growthData.engagement || [],
          plays: growthData.plays || [],
          followers: growthData.followers || []
        });
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/recent-activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      console.error("Error refreshing activity:", error);
    } finally {
      setActivityLoading(false);
    }
  };

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
      backgroundColor: ['#FF6B6B', '#00ffc8', '#45B7D1', '#96CEB4', '#FF6600'],
      borderWidth: 0
    }]
  };

  // REAL DATA from /api/monthly-growth - No more hardcoded values!
  const monthlyGrowthData = {
    labels: monthlyGrowth.labels.length > 0 
      ? monthlyGrowth.labels 
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Total Engagement',
      data: monthlyGrowth.engagement.length > 0 
        ? monthlyGrowth.engagement 
        : [0, 0, 0, 0, 0, 0],
      borderColor: '#00ffc8',
      backgroundColor: 'rgba(0, 255, 200, 0.1)',
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
      case 'tip': return '💰';
      case 'follower': return '👤';
      case 'sale': return '💵';
      default: return '📄';
    }
  };

  const handleProductUploaded = () => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/my-products`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.products) {
        setMyProducts(data.products);
      }
    })
    .catch(error => console.error("Error refreshing products:", error));
    
    // Also refresh activity
    fetchRecentActivity();
  };

  const calculateTotalEarnings = () => {
    const productEarnings = myProducts.reduce((total, product) => {
      return total + ((product.sales_count || 0) * (product.price || 0) * 0.9);
    }, 0);
    
    return {
      products: productEarnings,
      content: earnings.content || 0,
      tips: earnings.tips || 0,
      ads: earnings.ads || 0,
      subscriptions: earnings.subscriptions || 0,
      donations: earnings.donations || 0,
      total: productEarnings + (earnings.content || 0)
    };
  };

  const totalEarnings = calculateTotalEarnings();

  // Check if there's any data to show in charts
  const hasShareData = (socialShares.facebook || 0) + (socialShares.twitter || 0) + 
                       (socialShares.instagram || 0) + (socialShares.tiktok || 0) > 0;
  
  const hasContentData = (contentBreakdown.podcasts || 0) + (contentBreakdown.radioStations || 0) + 
                         (contentBreakdown.musicTracks || 0) + (contentBreakdown.liveStreams || 0) + 
                         myProducts.length > 0;

  const hasGrowthData = monthlyGrowth.engagement.length > 0 && 
                        monthlyGrowth.engagement.some(val => val > 0);

  if (loading) {
    return (
      <div className="creator-dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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
            <h1>{profile.display_name || profile.username || 'Creator'}</h1>
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
        {/* Overview Tab - Charts First, Quick Actions at Bottom */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            
            {/* Usage & Limits Section - Storage and Bandwidth */}
            <section className="usage-section">
              <h2>📊 Usage & Limits</h2>
              <div className="usage-grid">
                <StorageStatus />
                <BandwidthStatus />
              </div>
            </section>

            {/* Analytics Charts Section */}
            <section className="analytics-section">
              <div className="charts-grid">
                <div className="chart-container">
                  <h3>Social Media Shares</h3>
                  {hasShareData ? (
                    <div className="chart-wrapper">
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
                  ) : (
                    <div className="chart-empty">
                      <p>📤 No social shares yet</p>
                      <small>Share your content to see analytics here</small>
                    </div>
                  )}
                </div>

                <div className="chart-container">
                  <h3>Content Breakdown</h3>
                  {hasContentData ? (
                    <div className="chart-wrapper">
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
                  ) : (
                    <div className="chart-empty">
                      <p>📁 No content yet</p>
                      <small>Upload content to see breakdown here</small>
                    </div>
                  )}
                </div>
              </div>

              <div className="growth-chart">
                <h3>Monthly Growth Trend</h3>
                {hasGrowthData ? (
                  <div className="chart-wrapper">
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
                ) : (
                  <div className="chart-wrapper">
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
                    <p className="chart-hint">Engagement data will appear as you grow</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Activity Section */}
            <section className="recent-activity">
              <div className="section-header">
                <h2>Recent Activity</h2>
                <button 
                  className="refresh-btn" 
                  onClick={fetchRecentActivity}
                  disabled={activityLoading}
                  title="Refresh Activity"
                >
                  {activityLoading ? '⏳' : '🔄'}
                </button>
              </div>
              <div className="activity-list">
                {recentActivity.length > 0 ? recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="activity-item">
                    <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                    <div className="activity-content">
                      <p className="activity-text">{activity.text}</p>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  </div>
                )) : (
                  <div className="no-activity">
                    <p>🎬 No recent activity yet.</p>
                    <p>Start creating content to see activity here!</p>
                  </div>
                )}
              </div>
              {recentActivity.length > 10 && (
                <button 
                  className="view-all-btn"
                  onClick={() => setActiveTab('analytics')}
                >
                  View All Activity ({recentActivity.length})
                </button>
              )}
            </section>

            {/* Quick Actions - AT THE BOTTOM */}
            <section className="quick-actions-section">
              <h2>Quick Actions</h2>
              <div className="quick-actions-grid">
                <Link to="/podcast-create" className="quick-action-card">
                  <div className="action-icon">🎙️</div>
                  <h3>Create Podcast</h3>
                  <p>Start a new show</p>
                </Link>

                <Link to="/upload-music" className="quick-action-card">
                  <div className="action-icon">🎵</div>
                  <h3>Upload Music</h3>
                  <p>Share your tracks</p>
                </Link>

                <Link to="/create-radio" className="quick-action-card">
                  <div className="action-icon">📻</div>
                  <h3>Create Radio</h3>
                  <p>Start broadcasting</p>
                </Link>

                <button 
                  onClick={() => setActiveTab('upload')}
                  className="quick-action-card"
                >
                  <div className="action-icon">🛍️</div>
                  <h3>Sell Product</h3>
                  <p>Upload to marketplace</p>
                </button>
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
                    <span className="revenue-label">Tips</span>
                    <span className="revenue-value">${(earnings.tips || 0).toFixed(2)}</span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Ad Revenue</span>
                    <span className="revenue-value">${(earnings.ads || 0).toFixed(2)}</span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Subscriptions</span>
                    <span className="revenue-value">${(earnings.subscriptions || 0).toFixed(2)}</span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Donations</span>
                    <span className="revenue-value">${(earnings.donations || 0).toFixed(2)}</span>
                  </div>
                  <div className="revenue-item total">
                    <span className="revenue-label">Total Earnings</span>
                    <span className="revenue-value">${totalEarnings.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>📊 Content Stats</h3>
                <div className="metric">
                  <span className="metric-label">Podcasts</span>
                  <span className="metric-value">{contentBreakdown.podcasts || 0}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Music Tracks</span>
                  <span className="metric-value">{contentBreakdown.musicTracks || 0}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Radio Stations</span>
                  <span className="metric-value">{contentBreakdown.radioStations || 0}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Live Streams</span>
                  <span className="metric-value">{contentBreakdown.liveStreams || 0}</span>
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
                          onError={(e) => e.target.src = '/placeholder-product.jpg'}
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

            {/* Monthly Growth Chart in Analytics */}
            <div className="analytics-chart-section">
              <h3>📈 Monthly Engagement</h3>
              <div className="analytics-chart-wrapper">
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

            {/* Full Activity Log */}
            <div className="full-activity-section">
              <div className="section-header">
                <h3>📋 Complete Activity Log</h3>
                <button 
                  className="refresh-btn" 
                  onClick={fetchRecentActivity}
                  disabled={activityLoading}
                >
                  {activityLoading ? '⏳' : '🔄'}
                </button>
              </div>
              {recentActivity.length === 0 ? (
                <p className="no-activity">No activity recorded yet.</p>
              ) : (
                <div className="full-activity-list">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="full-activity-item">
                      <span className="activity-icon-large">{getActivityIcon(activity.type)}</span>
                      <div className="activity-details">
                        <p className="activity-text">{activity.text}</p>
                      </div>
                      <span className="activity-timestamp">{activity.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorDashboard;