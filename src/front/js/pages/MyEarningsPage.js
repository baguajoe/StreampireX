// ✅ MyEarningsPage.js (with Bootstrap Tabs)
import React, { useState } from 'react';
import EarningsPage from "../components/EarningsPage";
import EarningsDashboard from "../components/EarningsDashboard";
import EarningsReport from "../components/EarningsReport"; // Optional admin-only

const MyEarningsPage = ({ isAdmin = false, artistId = null }) => {
  const [activeTab, setActiveTab] = useState("overview");

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <EarningsPage />;
      case "music":
        return <EarningsDashboard />;
      case "admin":
        return isAdmin && artistId ? <EarningsReport artistId={artistId} /> : <p>Unauthorized</p>;
      default:
        return <EarningsPage />;
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">My Earnings</h1>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "music" ? "active" : ""}`}
            onClick={() => setActiveTab("music")}
          >
            Music Distribution
          </button>
        </li>
        {isAdmin && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => setActiveTab("admin")}
            >
              Admin View
            </button>
          </li>
        )}
      </ul>

      <div className="tab-content">
        {renderTab()}
      </div>
    </div>
  );
};

export default MyEarningsPage;
