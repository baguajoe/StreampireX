import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';

const EngagementGraph = ({ contentId }) => {
    const [engagementData, setEngagementData] = useState(null);

    useEffect(() => {
        fetch(`/api/engagement/${contentId}`)
            .then(res => res.json())
            .then(data => setEngagementData(data))
            .catch(err => console.error("Error fetching engagement data:", err));
    }, [contentId]);

    if (!engagementData) return <p>Loading...</p>;

    const data = {
        labels: engagementData.dates,
        datasets: [
            {
                label: 'Plays',
                data: engagementData.plays,
                borderColor: 'blue',
                fill: false,
            },
            {
                label: 'Views',
                data: engagementData.views,
                borderColor: 'green',
                fill: false,
            }
        ]
    };

    return <Line data={data} />;
};

export default EngagementGraph;
