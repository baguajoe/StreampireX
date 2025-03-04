import React from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

const TrendingPage = ({ trendingData }) => {
  const data = {
    labels: trendingData.map((item) => item.title),
    datasets: [
      {
        label: "Likes",
        data: trendingData.map((item) => item.likes),
        backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
      },
    ],
  };

  return (
    <div className="trending-page">
      <h1>🔥 Trending Content</h1>
      <Bar data={data} />
    </div>
  );
};

export default TrendingPage;
