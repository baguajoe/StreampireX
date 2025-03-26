import React, { useEffect, useState } from 'react';

const EarningsPage = () => {
    const [earningsData, setEarningsData] = useState(null);

    useEffect(() => {
        // Fetch earnings data from backend (example endpoint '/api/creator/earnings')
        fetch('/api/creator/earnings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then((response) => response.json())
            .then((data) => setEarningsData(data))
            .catch((error) => console.error('Error fetching earnings:', error));
    }, []);

    return (
        <div className="earnings-page">
            <h1>Your Earnings</h1>
            {earningsData ? (
                <div>
                    <p><strong>Total Earnings:</strong> ${earningsData.total_earnings}</p>
                    <p><strong>Total Subscriptions:</strong> {earningsData.total_subscriptions}</p>
                    <p><strong>Revenue Breakdown:</strong></p>
                    <ul>
                        <li><strong>Podcast Revenue:</strong> ${earningsData.podcast_revenue}</li>
                        <li><strong>Merch Sales Revenue:</strong> ${earningsData.merch_sales_revenue}</li>
                        <li><strong>Ad Revenue:</strong> ${earningsData.ad_revenue}</li>
                    </ul>
                </div>
            ) : (
                <p>Loading earnings data...</p>
            )}
        </div>
    );
};

export default EarningsPage;
