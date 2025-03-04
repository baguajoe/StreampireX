import React from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

const ChartPage = () => {
    const data = {
        labels: ["Podcasts", "Radio Stations", "Live Streams"],
        datasets: [{
            label: "Engagement Metrics",
            data: [150, 200, 175],
            backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
        }],
    };

    return (
        <div className="chart-page">
            <h1>📊 User Engagement Analytics</h1>
            <Bar data={data} />
        </div>
    );
};

export default ChartPage;
