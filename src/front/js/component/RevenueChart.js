import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";

const RevenueChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/revenue-trends`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.labels && data.values) {
          setChartData({
            labels: data.labels,
            datasets: [
              {
                label: "Revenue ($)",
                data: data.values,
                backgroundColor: "rgba(75,192,192,0.6)",
              },
            ],
          });
        } else {
          setError("No revenue data available.");
        }
      })
      .catch((error) => {
        console.error("Error fetching revenue trends:", error);
        setError("Failed to load revenue data.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3>📊 Monthly Revenue Trends</h3>
      {loading && <p>Loading revenue data...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {chartData && <Bar data={chartData} />}
    </div>
  );
};

export default RevenueChart;
