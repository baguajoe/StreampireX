import React, { useState, useEffect } from 'react';

const MonetizationAnalytics = ({ podcastId }) => {
    const [earnings, setEarnings] = useState(null);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/earnings/${podcastId}`)
            .then(res => res.json())
            .then(data => setEarnings(data))
            .catch(err => console.error("Error fetching earnings data:", err));
    }, [podcastId]);

    if (!earnings) return <p>Loading earnings...</p>;

    return (
        <div>
            <h3>Total Earnings: ${earnings.total}</h3>
            <p>Ad Revenue: ${earnings.adRevenue}</p>
            <p>Subscription Revenue: ${earnings.subscriptionRevenue}</p>
            <p>Donation Revenue: ${earnings.donationRevenue}</p>
        </div>
    );
};

export default MonetizationAnalytics;
