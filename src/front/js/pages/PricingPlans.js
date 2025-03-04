import React, { useEffect, useState } from "react";

const PricingPlans = () => {
    const [plans, setPlans] = useState([]);

    useEffect(() => {
        fetch(process.env.BACKEND_URL + "/api/pricing-plans")
            .then((res) => res.json())
            .then((data) => setPlans(data))
            .catch((err) => console.error("Error fetching pricing plans:", err));
    }, []);

    return (
        <div className="pricing-container">
            <h1>💰 Choose Your Plan</h1>
            <div className="pricing-grid">
                {plans.map((plan) => (
                    <div key={plan.id} className="pricing-card">
                        <h2>{plan.name}</h2>
                        <p>💵 Price: ${plan.price_monthly}/month</p>
                        <p>📅 Yearly Price: ${plan.price_yearly}/year</p>
                        <p>🎙 Podcasts: {plan.includes_podcasts ? "✅ Yes" : "❌ No"}</p>
                        <p>📻 Radio Stations: {plan.includes_radio ? "✅ Yes" : "❌ No"}</p>
                        <p>🛍 Sell Digital Products: {plan.includes_digital_sales ? "✅ Yes" : "❌ No"}</p>
                        <p>👕 Sell Merch: {plan.includes_merch_sales ? "✅ Yes" : "❌ No"}</p>
                        <p>🆓 Free Trial: {plan.trial_days} days</p>
                        <button className="subscribe-btn">Subscribe</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PricingPlans;
