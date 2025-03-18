import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../style/RevenueDashboard.css"; // Add styles for UI

const RevenueDashboard = () => {
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    axios.get("/api/revenue")
      .then(response => setEarnings(response.data))
      .catch(error => console.error("Error fetching revenue data:", error));
  }, []);

  if (!earnings) return <p>Loading...</p>;

  return (
    <div className="revenue-dashboard">
      <h1>Revenue Dashboard</h1>
      <div className="summary">
        <h3>Total Earnings: ${earnings.total}</h3>
        <p>Ad Revenue: ${earnings.ad_revenue}</p>
        <p>Donations: ${earnings.donations}</p>
        <p>Music Sales: ${earnings.music_sales}</p>
        <p>Merch Sales: ${earnings.merch_sales}</p>
      </div>
      <div className="chart">
        {/* You can use Chart.js or Recharts here for a graph */}
      </div>
    </div>
  );
};

export default RevenueDashboard;
