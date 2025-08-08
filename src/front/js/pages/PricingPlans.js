// Updated PricingPlans.js to display all the new features

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
            window.location.href = data.checkout_url;
        } else {
            alert("❌ " + data.error);
        }
    };

    const getFeatureList = (plan) => {
        const features = [];
        
        // Core Features
        if (plan.includes_podcasts) features.push("🎙 Create Podcasts");
        if (plan.includes_radio) features.push("📻 Radio Stations");
        if (plan.includes_digital_sales) features.push("🛍 Digital Sales");
        if (plan.includes_merch_sales) features.push("👕 Merch Sales");
        if (plan.includes_live_events) features.push("🎟 Live Events");
        if (plan.includes_tip_jar) features.push("💰 Tip Jar");
        if (plan.includes_ad_revenue) features.push("📺 Ad Revenue");
        
        // Music Distribution
        if (plan.includes_music_distribution) {
            if (plan.distribution_uploads_limit === -1) {
                features.push("🎵 Unlimited Music Distribution");
            } else if (plan.distribution_uploads_limit > 0) {
                features.push(`🎵 ${plan.distribution_uploads_limit} Tracks/Month`);
            }
        }
        if (plan.sonosuite_access) features.push("🎼 SonoSuite Access");
        
        // Gaming Features
        if (plan.includes_gaming_features) features.push("🎮 Gaming Community");
        if (plan.includes_team_rooms) features.push("🏠 Private Team Rooms");
        if (plan.includes_squad_finder) features.push("🔍 Squad Finder");
        if (plan.includes_gaming_analytics) features.push("📊 Gaming Analytics");
        if (plan.includes_game_streaming) features.push("📺 Live Game Streaming");
        if (plan.includes_gaming_monetization) features.push("💰 Gaming Monetization");
        
        // Video Distribution
        if (plan.includes_video_distribution) {
            if (plan.video_uploads_limit === -1) {
                features.push("🎥 Unlimited Video Distribution");
            } else if (plan.video_uploads_limit > 0) {
                features.push(`🎥 ${plan.video_uploads_limit} Videos/Month`);
            }
        }
        
        return features;
    };

    const getPlanDescription = (plan) => {
        switch(plan.name) {
            case "Free":
                return "Fans & Followers - Listen, follow, no uploads";
            case "Basic":
                return "Superfans - Ad-free listening, save playlists, gaming community";
            case "Pro":
                return "Podcasters & DJs - Upload content, livestreaming, analytics";
            case "Premium":
                return "Full Creators - Sell merch, full dashboard, marketplace access";
            default:
                return "";
        }
    };

    const getYearlySavings = (plan) => {
        if (plan.price_monthly === 0) return 0;
        const monthlyTotal = plan.price_monthly * 12;
        return monthlyTotal - plan.price_yearly;
    };

    return (
        <div className="pricing-container">
            <h1>💰 Choose Your Plan</h1>
            <p className="pricing-subtitle">Start with our free plan or unlock more features with a paid subscription</p>
            
            <div className="pricing-grid">
                {plans.map((plan) => (
                    <div key={plan.id} className={`pricing-card ${plan.name.toLowerCase()}`}>
                        <div className="plan-header">
                            <h2>{plan.name}</h2>
                            <p className="plan-description">{getPlanDescription(plan)}</p>
                        </div>
                        
                        <div className="plan-pricing">
                            <div className="monthly-price">
                                <span className="price">${plan.price_monthly}</span>
                                <span className="period">/month</span>
                            </div>
                            {plan.price_yearly > 0 && (
                                <div className="yearly-price">
                                    <span className="yearly-label">Yearly: ${plan.price_yearly}</span>
                                    {getYearlySavings(plan) > 0 && (
                                        <span className="savings">Save ${getYearlySavings(plan).toFixed(2)}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="plan-features">
                            {getFeatureList(plan).map((feature, index) => (
                                <div key={index} className="feature-item">
                                    ✅ {feature}
                                </div>
                            ))}
                        </div>

                        {plan.trial_days > 0 && (
                            <div className="trial-info">
                                🆓 {plan.trial_days} day free trial
                            </div>
                        )}

                        <button 
                            className={`subscribe-btn ${plan.name.toLowerCase()}`}
                            onClick={() => handleSubscribe(plan.id)}
                        >
                            {plan.name === "Free" ? "Get Started Free" : `Subscribe to ${plan.name}`}
                        </button>
                    </div>
                ))}
            </div>

            <div className="additional-services">
                <h2>📊 Additional Services</h2>
                <div className="services-grid">
                    <div className="service-card">
                        <h3>🎵 Music Distribution (Standalone)</h3>
                        <p>Artist Distribution: $22.99</p>
                        <p>Label Distribution: $74.99</p>
                    </div>
                    <div className="service-card">
                        <h3>🎥 Video Distribution</h3>
                        <p>Vevo Only: $25/video</p>
                        <p>Full Network: $95/video</p>
                        <p>Unlimited Plan: $89/year</p>
                    </div>
                    <div className="service-card">
                        <h3>🔧 Add-Ons</h3>
                        <p>YouTube Monetization: $2.49/year</p>
                        <p>Content ID Single: $3.95/year</p>
                        <p>Content ID Album: $12.95/year</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPlans;