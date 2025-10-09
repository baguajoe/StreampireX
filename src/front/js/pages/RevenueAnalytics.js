import React, { useEffect, useState } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const RevenueAnalytics = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/revenue-analytics`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setData(response.data);
            } catch (err) {
                console.error("Failed to fetch revenue analytics", err);
            }
        };
        fetchAnalytics();
    }, []);

    if (!data) return <p>Loading...</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Revenue Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 shadow rounded bg-white">
                    <h3 className="text-lg font-semibold">Total Revenue</h3>
                    <p className="text-xl">${data.total_revenue.toFixed(2)}</p>
                </div>
                <div className="p-4 shadow rounded bg-white">
                    <h3 className="text-lg font-semibold">Products Sold</h3>
                    <p className="text-xl">{data.total_products}</p>
                </div>
                <div className="p-4 shadow rounded bg-white">
                    <h3 className="text-lg font-semibold">Total Orders</h3>
                    <p className="text-xl">{data.total_orders}</p>
                </div>
            </div>

            <LineChart width={800} height={300} data={data.revenue_by_month}>
                <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" />
            </LineChart>
        </div>
    );
};

export default RevenueAnalytics;
