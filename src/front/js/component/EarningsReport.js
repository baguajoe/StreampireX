import React, { useState, useEffect } from 'react';

const EarningsReport = ({ artistId }) => {
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    fetch(`/api/earnings/artist/${artistId}`)
      .then(res => res.json())
      .then(data => setEarnings(data))
      .catch(err => console.error("Error fetching earnings:", err));
  }, [artistId]);

  if (!earnings) return <p>Loading...</p>;

  return (
    <div>
      <h3>Earnings Report</h3>
      <ul>
        <li>Total Earnings: ${earnings.total}</li>
        <li>Product Sales: ${earnings.product_sales}</li>
        <li>Subscription Revenue: ${earnings.subscription_revenue}</li>
      </ul>
    </div>
  );
};

export default EarningsReport;
