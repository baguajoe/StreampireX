import React, { useState, useEffect } from 'react';

const CreatorAnalytics = ({ creatorId }) => {
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch analytics data for the creator
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/analytics/creator/${creatorId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching creator analytics:", error);
        setLoading(false);
      });
  }, [creatorId]);

  if (loading) {
    return <p>Loading analytics...</p>;
  }

  return (
    <div>
      <h3>📈 Creator Analytics</h3>
      <p>Total Streams: {analytics.total_streams}</p>
      <p>Total Earnings: ${analytics.total_earnings?.toFixed(2)}</p>
      <p>Ad Revenue: ${analytics.ad_revenue?.toFixed(2)}</p>
      <p>Subscription Revenue: ${analytics.subscription_revenue?.toFixed(2)}</p>
      <p>Donation Revenue: ${analytics.donation_revenue?.toFixed(2)}</p>
    </div>
  );
};

export default CreatorAnalytics;
