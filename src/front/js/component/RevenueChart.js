import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";

const RevenueChart = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/revenue-trends`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
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
      })
      .catch((error) => console.error("Error fetching revenue trends:", error));
  }, []);

  return (
    <div>
      <h3>📊 Monthly Revenue Trends</h3>
      <Bar data={chartData} />
    </div>
  );
};

export default RevenueChart;
