// src/front/js/pages/Dashboard/DashboardOverview.js
// Overview Tab - Aggregate stats, charts, and quick actions (from CreatorDashboard)
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import StorageStatus from "../../component/StorageStatus";
import BandwidthStatus from "../../component/BandwidthStatus";
import "../../../styles/StorageStatus.css";
import "../../../styles/BandwidthStatus.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const DashboardOverview = ({ user }) => {
  const [profile, setProfile] = useState({});
  const [socialShares, setSocialShares] = useState({});
  const [contentBreakdown, setContentBreakdown] = useState({});
  const [earnings, setEarnings] = useState({});
  const [myProducts, setMyProducts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState({ labels: [], engagement: [] });
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

      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const profileData = await profileRes.value.json();
        setProfile(profileData);
      }

      if (sharesRes.status === 'fulfilled' && sharesRes.value.ok) {
        const sharesData = await sharesRes.value.json();
        setSocialShares(sharesData.platform_breakdown || sharesData);
      }

      if (contentRes.status === 'fulfilled' && contentRes.value.ok) {
        const contentData = await contentRes.value.json();
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

      if (earningsRes.status === 'fulfilled' && earningsRes.value.ok) {
        const earningsData = await earningsRes.value.json();
        setEarnings(earningsData);
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const productsData = await productsRes.value.json();
        setMyProducts(productsData.products || []);
      }

      if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
        const activityData = await activityRes.value.json();
        setRecentActivity(activityData.activities || []);
      }

      if (growthRes.status === 'fulfilled' && growthRes.value.ok) {
        const growthData = await growthRes.value.json();
        setMonthlyGrowth({
          labels: growthData.labels || [],
          engagement: growthData.engagement || []
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

  // Chart data
  const hasShareData = (socialShares.facebook || 0) + (socialShares.twitter || 0) + 
                       (socialShares.instagram || 0) + (socialShares.tiktok || 0) > 0;
  
  const hasContentData = (contentBreakdown.podcasts || 0) + (contentBreakdown.radioStations || 0) + 
                         (contentBreakdown.musicTracks || 0) + (contentBreakdown.liveStreams || 0) + 
                         myProducts.length > 0;

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
    labels: ['Podcasts', 'Radio', 'Music', 'Videos', 'Products'],
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

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
        <p>Loading overview...</p>
      </div>
    );
  }

  return (
    <div className="overview-tab">
      {/* Earnings Summary */}
      <div className="earnings-summary">
        <div className="earnings-card main">
          <div className="earnings-icon">💰</div>
          <div className="earnings-info">
            <h3>Total Earnings</h3>
            <div className="earnings-amount">${totalEarnings.total.toFixed(2)}</div>
            <div className="earnings-breakdown-mini">
              <span>Products: ${totalEarnings.products.toFixed(2)}</span>
              <span>Content: ${totalEarnings.content.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="stats-mini-grid">
          <div className="stat-mini">
            <span className="stat-value">{profile.followers || 0}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat-mini">
            <span className="stat-value">{myProducts.length}</span>
            <span className="stat-label">Products</span>
          </div>
          <div className="stat-mini">
            <span className="stat-value">{contentBreakdown.podcasts || 0}</span>
            <span className="stat-label">Podcasts</span>
          </div>
          <div className="stat-mini">
            <span className="stat-value">{contentBreakdown.musicTracks || 0}</span>
            <span className="stat-label">Tracks</span>
          </div>
        </div>
      </div>

      {/* Usage & Limits */}
      <section className="usage-section">
        <h2>📊 Usage & Limits</h2>
        <div className="usage-grid">
          <StorageStatus />
          <BandwidthStatus />
        </div>
      </section>

      {/* Charts Section */}
      <section className="charts-section">
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
          <div className="chart-wrapper wide">
            <Line 
              data={monthlyGrowthData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
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

      {/* Recent Activity */}
      <section className="activity-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <button 
            className="refresh-btn" 
            onClick={fetchRecentActivity}
            disabled={activityLoading}
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
      </section>

      {/* Quick Actions */}
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

          <Link to="/storefront" className="quick-action-card">
            <div className="action-icon">🛍️</div>
            <h3>Sell Product</h3>
            <p>Upload to marketplace</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;