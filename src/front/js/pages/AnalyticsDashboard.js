import React, { useEffect, useState } from "react";

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState([]);
  const [shares, setShares] = useState([]);

  useEffect(() => {
    // Fetch Analytics Data
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/analytics`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((error) => console.error("Error fetching analytics:", error));

    // Fetch Share Analytics Data
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/share-analytics`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setShares(data))
      .catch((error) => console.error("Error fetching share analytics:", error));
  }, []);

  return (
    <div>
      <h2>Analytics Overview</h2>
      {analytics.length === 0 ? (
        <p>No analytics data available.</p>
      ) : (
        <ul>
          {analytics.map((data) => (
            <li key={data.id}>
              {data.content_type} - Plays: {data.play_count}, Purchases: {data.purchase_count}, Revenue: ${data.revenue_generated}
            </li>
          ))}
        </ul>
      )}

      <h2>Shared Content Analytics</h2>
      {shares.length === 0 ? (
        <p>No shared content data available.</p>
      ) : (
        <ul>
          {shares.map((data) => (
            <li key={data.id}>
              {data.content_type} shared on {data.platform} at {new Date(data.shared_at).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
