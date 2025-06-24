// ✅ EarningsDashboard.js (React Component)
import React, { useEffect, useState } from 'react';

const EarningsDashboard = () => {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch('/api/earnings');
        const data = await res.json();
        setEarnings(data);
      } catch (error) {
        console.error("Error fetching earnings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  const total = earnings.reduce((acc, entry) => acc + entry.amount, 0);

  return (
    <div>
      <h2>Your Earnings</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h3>Total: ${total.toFixed(2)}</h3>
          <table>
            <thead>
              <tr>
                <th>Track</th>
                <th>Platform</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map(entry => (
                <tr key={entry.id}>
                  <td>{entry.track_id}</td>
                  <td>{entry.platform}</td>
                  <td>${entry.amount.toFixed(2)}</td>
                  <td>{entry.reported_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default EarningsDashboard;
