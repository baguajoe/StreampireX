import React, { useEffect, useState } from "react";

const PricingPlans = () => {
    const [plans, setPlans] = useState([]);

    useEffect(() => {
        fetch(process.env.BACKEND_URL + "/api/pricing-plans")
            .then((res) => res.json())
            .then((data) => {
                console.log("response from /pricing-plans:", data)
                setPlans(data);
            })
            .catch((err) => console.error("Error fetching pricing plans:", err));
    }, []);

    // ✅ This is your subscription logic
    const handleSubscribe = async (planId) => {
        const res = await fetch(`${process.env.BACKEND_URL}/api/subscriptions/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem("token")
            },
            body: JSON.stringify({ plan_id: planId })
        });

        const data = await res.json();
        if (res.ok) {
            window.location.href = data.checkout_url;  // 👈 redirect to Stripe Checkout
        } else {
            alert("❌ " + data.error);
        }
    };

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
                        <p>🛍 Digital Sales: {plan.includes_digital_sales ? "✅ Yes" : "❌ No"}</p>
                        <p>👕 Merch Sales: {plan.includes_merch_sales ? "✅ Yes" : "❌ No"}</p>
                        <p>🆓 Trial: {plan.trial_days} days</p>
                        <button className="subscribe-btn" onClick={() => handleSubscribe(plan.id)}>Subscribe</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PricingPlans;
