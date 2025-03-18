// RevenueDashboard.js
import React, { useEffect, useState } from "react";
import Chart from "chart.js/auto"; // For displaying charts
import "../styles/RevenueDashboard.css";

const RevenueDashboard = () => {
  const [revenue, setRevenue] = useState({
    total_revenue: 0,
    content_revenue: 0,
    ad_revenue: 0,
    donations: 0,
  });

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/creator-revenue`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setRevenue(data))
      .catch((error) => console.error("Error fetching revenue data:", error));
  }, []);

  return (
    <div className="revenue-dashboard">
      <h2>💰 Revenue Dashboard</h2>
      <div className="revenue-cards">
        <div className="revenue-card">
          <h3>Total Revenue</h3>
          <p>${revenue.total_revenue.toFixed(2)}</p>
        </div>
        <div className="revenue-card">
          <h3>Content Revenue</h3>
          <p>${revenue.content_revenue.toFixed(2)}</p>
        </div>
        <div className="revenue-card">
          <h3>Ad Revenue</h3>
          <p>${revenue.ad_revenue.toFixed(2)}</p>
        </div>
        <div className="revenue-card">
          <h3>Donations</h3>
          <p>${revenue.donations.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;