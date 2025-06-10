import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EngagementGraph from "../component/EngagementGraph";
import MonetizationAnalytics from "../component/MonetizationAnalytics";
import PopularityRanking from "../component/PopularityRanking";
import "../../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BACKEND_URL = process.env.BACKEND_URL || process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [usersRes, subsRes, revenueRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/admin/users`, { headers }),
          fetch(`${BACKEND_URL}/api/admin/subscriptions`, { headers }),
          fetch(`${BACKEND_URL}/api/admin/revenue`, { headers }),
        ]);

        if (!usersRes.ok || !subsRes.ok || !revenueRes.ok) {
          throw new Error("API responded with an error");
        }

        const usersData = await usersRes.json();
        const subsData = await subsRes.json();
        const revenueData = await revenueRes.json();

        setUsers(usersData);
        setSubscriptions(subsData);
        setRevenue(revenueData.total_earnings || 0);
      } catch (err) {
        console.error("❌ Admin Dashboard Error:", err);
        setError("Failed to load dashboard data. Showing fallback content.");

        // 🔁 Fallback Mock Data for Demo
        setUsers([
          { id: 1, username: "admin", email: "admin@example.com", role: "admin" },
          { id: 2, username: "creator01", email: "creator01@example.com", role: "creator" },
        ]);
        setSubscriptions([
          { id: 1, user_email: "creator01@example.com", plan_name: "Pro", status: "active" },
        ]);
        setRevenue(1234.56);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [BACKEND_URL]);

  return (
    <div className="admin-dashboard">
      <h1>🛡️ Admin Dashboard</h1>

      {loading && <p>⏳ Loading admin data...</p>}
      {error && <p className="error-message">⚠️ {error}</p>}

      {!loading && (
        <>
          <div className="dashboard-cards">
            <div className="card">
              <h3>Total Revenue</h3>
              <p>${revenue.toFixed(2)}</p>
            </div>
            <div className="card">
              <h3>Active Subscriptions</h3>
              <p>{subscriptions.length}</p>
            </div>
            <div className="card">
              <h3>Registered Users</h3>
              <p>{users.length}</p>
            </div>
          </div>

          <div className="admin-sections">
            <h2>👥 Manage Users</h2>
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  {user.username} ({user.email}) — Role: {user.role}
                  <button className="ban-btn">🚫 Ban</button>
                </li>
              ))}
            </ul>

            <h2>💼 Manage Subscriptions</h2>
            <ul>
              {subscriptions.map((sub) => (
                <li key={sub.id}>
                  {sub.user_email} — Plan: {sub.plan_name} — Status: {sub.status}
                </li>
              ))}
            </ul>

            <h2>📈 Content Analytics</h2>
            <EngagementGraph contentId="podcast_1" />
            <MonetizationAnalytics earnings={revenue} />

            <h2>🔥 Content Popularity</h2>
            <PopularityRanking />
          </div>

          <div className="admin-actions">
            <h2>⚙️ Platform Settings</h2>
            <Link to="/admin/settings">
              <button className="settings-btn">Manage Platform Settings</button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
