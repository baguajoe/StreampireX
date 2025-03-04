import React, { useEffect, useState } from "react";

const AdminDashboard = () => {
    const [plans, setPlans] = useState([]);
    const [users, setUsers] = useState([]);
    const [revenue, setRevenue] = useState({ total_earnings: 0, active_subscriptions: 0 });

    useEffect(() => {
        fetch(process.env.BACKEND_URL + "/api/admin/plans")
            .then((res) => res.json())
            .then((data) => setPlans(data))
            .catch((err) => console.error("Error fetching plans:", err));

        fetch(process.env.BACKEND_URL + "/api/admin/users")
            .then((res) => res.json())
            .then((data) => setUsers(data))
            .catch((err) => console.error("Error fetching users:", err));

        fetch(process.env.BACKEND_URL + "/api/admin/revenue")
            .then((res) => res.json())
            .then((data) => setRevenue(data))
            .catch((err) => console.error("Error fetching revenue analytics:", err));
    }, []);

    return (
        <div className="admin-dashboard">
            <h1>⚙️ Admin Dashboard</h1>

            <section>
                <h2>💰 Revenue Analytics</h2>
                <p>📈 Total Earnings: ${revenue.total_earnings}</p>
                <p>🔥 Active Subscriptions: {revenue.active_subscriptions}</p>
            </section>

            <section>
                <h2>📊 Subscription Plans</h2>
                {plans.map((plan) => (
                    <div key={plan.id} className="admin-card">
                        <h3>{plan.name}</h3>
                        <p>💰 Monthly: ${plan.price_monthly}</p>
                        <p>📅 Yearly: ${plan.price_yearly}</p>
                        <button>Edit</button>
                    </div>
                ))}
            </section>

            <section>
                <h2>👥 Users</h2>
                {users.map((user) => (
                    <div key={user.id} className="admin-card">
                        <h3>{user.username}</h3>
                        <p>Email: {user.email}</p>
                        <p>Subscription: {user.is_premium ? "Premium" : "Free"}</p>
                        <button>Ban User</button>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default AdminDashboard;
