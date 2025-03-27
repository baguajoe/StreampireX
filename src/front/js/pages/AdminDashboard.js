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

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const usersRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users`);
      const subsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/subscriptions`);
      const revenueRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/revenue`);

      const usersData = await usersRes.json();
      const subsData = await subsRes.json();
      const revenueData = await revenueRes.json();

      setUsers(usersData);
      setSubscriptions(subsData);
      setRevenue(revenueData.total_earnings);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
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
      )}

      <div className="admin-sections">
        <h2>Manage Users</h2>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.username} ({user.email}) - Role: {user.role}
              <button className="ban-btn">Ban</button>
            </li>
          ))}
        </ul>

        <h2>Manage Subscriptions</h2>
        <ul>
          {subscriptions.map((sub) => (
            <li key={sub.id}>
              {sub.user_email} - Plan: {sub.plan_name} - Status: {sub.status}
            </li>
          ))}
        </ul>

        <h2>Content Analytics</h2>
        <EngagementGraph contentId="podcast_1" />
        <MonetizationAnalytics earnings={revenue} />

        <h2>Content Popularity</h2>
        <PopularityRanking />
      </div>

      <div className="admin-actions">
        <h2>Platform Settings</h2>
        <Link to="/admin/settings">
          <button className="settings-btn">⚙️ Manage Platform Settings</button>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
