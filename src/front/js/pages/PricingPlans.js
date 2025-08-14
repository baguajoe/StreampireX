// Enhanced PricingPlans.js with improved UI and music distribution focus

import React, { useEffect, useState } from "react";
import { useContext } from "react";
import { Context } from "../store/appContext";
import "../../styles/PricingPlans.css";

const PricingPlans = () => {
    const { store } = useContext(Context);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPlan, setCurrentPlan] = useState(null);

    useEffect(() => {
        fetchPlans();
        if (store.user) {
            fetchCurrentPlan();
        }
    }, [store.user]);

    const fetchPlans = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/subscriptions/subscribe");
            const data = await response.json();
            console.log("response from /pricing-plans:", data);
            setPlans(data);
        } catch (err) {
            console.error("Error fetching pricing plans:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentPlan = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${process.env.BACKEND_URL}/api/user/plan-status`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentPlan(data.plan);
            }
        } catch (err) {
            console.error("Error fetching current plan:", err);
        }
    };

    const handleSubscribe = async (planId) => {
        if (!store.user) {
            alert("Please log in to subscribe to a plan");
            return;
        }

        try {
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
        } catch (error) {
            console.error("Subscription error:", error);
            alert("❌ Failed to process subscription. Please try again.");
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
        
        // Music Distribution - Enhanced Display
        if (plan.includes_music_distribution) {
            if (plan.distribution_uploads_limit === -1) {
                features.push("🎵 Unlimited Music Distribution");
            } else if (plan.distribution_uploads_limit > 0) {
                features.push(`🎵 ${plan.distribution_uploads_limit} Tracks/Month Distribution`);
            } else {
                features.push("🎵 Music Distribution Access");
            }
        }
        if (plan.sonosuite_access) features.push("🎼 SonoSuite Dashboard Access");
        if (plan.includes_music_distribution) features.push("🌍 150+ Global Platforms");
        if (plan.includes_music_distribution) features.push("💰 Keep 100% Royalties");
        
        // Gaming Features
        if (plan.includes_gaming_features) features.push("🎮 Gaming Community");
        if (plan.includes_team_rooms) features.push("🏠 Private Team Rooms");
        if (plan.includes_squad_finder) features.push("🔍 Squad Finder");
        if (plan.includes_gaming_analytics) features.push("📊 Gaming Analytics");
        if (plan.includes_game_streaming) features.push("📺 Live Game Streaming");
        if (plan.includes_gaming_monetization) features.push("💰 Gaming Monetization");
        
        return features;
    };

    const getPlanDescription = (plan) => {
        switch(plan.name) {
            case "Free":
                return "Perfect for listeners - Follow artists, join gaming community";
            case "Basic":
                return "Enhanced experience - Ad-free listening, premium gaming features";
            case "Pro":
                return "Content creators - Upload content, livestreaming, limited distribution";
            case "Premium":
                return "Full creators - Unlimited distribution, sell merch, complete marketplace";
            default:
                return "";
        }
    };

    const getYearlySavings = (plan) => {
        if (plan.price_monthly === 0) return 0;
        const monthlyTotal = plan.price_monthly * 12;
        return monthlyTotal - plan.price_yearly;
    };

    const isCurrentPlan = (plan) => {
        return currentPlan && currentPlan.id === plan.id;
    };

    const getMusicDistributionInfo = (plan) => {
        if (!plan.includes_music_distribution) return null;
        
        return {
            hasDistribution: true,
            limit: plan.distribution_uploads_limit === -1 ? "Unlimited" : `${plan.distribution_uploads_limit} tracks/month`,
            sonosuiteAccess: plan.sonosuite_access
        };
    };

    if (loading) {
        return (
            <div className="pricing-container loading">
                <h1>💰 Loading Plans...</h1>
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="pricing-container">
            {/* Header Section */}
            <div className="pricing-header">
                <h1>💰 Choose Your Plan</h1>
                <p className="pricing-subtitle">
                    Start with our free plan or unlock music distribution and creator features
                </p>
                {currentPlan && (
                    <div className="current-plan-badge">
                        Currently on: <strong>{currentPlan.name} Plan</strong>
                    </div>
                )}
            </div>
            
            {/* Plans Grid */}
            <div className="pricing-grid">
                {plans.map((plan) => {
                    const musicInfo = getMusicDistributionInfo(plan);
                    const isCurrent = isCurrentPlan(plan);
                    
                    return (
                        <div key={plan.id} className={`pricing-card ${plan.name.toLowerCase()} ${isCurrent ? 'current-plan' : ''}`}>
                            {/* Popular Badge */}
                            {plan.name === "Pro" && (
                                <div className="popular-badge">
                                    ⭐ MOST POPULAR
                                </div>
                            )}

                            {/* Current Plan Badge */}
                            {isCurrent && (
                                <div className="current-badge">
                                    ✅ CURRENT PLAN
                                </div>
                            )}

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

                            {/* Music Distribution Highlight */}
                            {musicInfo && (
                                <div className="music-distribution-highlight">
                                    <h4>🎵 Music Distribution Included</h4>
                                    <div className="distribution-features">
                                        <div>📊 {musicInfo.limit}</div>
                                        <div>🌍 150+ Platforms</div>
                                        {musicInfo.sonosuiteAccess && <div>🎼 SonoSuite Access</div>}
                                    </div>
                                </div>
                            )}

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
                                className={`subscribe-btn ${plan.name.toLowerCase()} ${isCurrent ? 'current' : ''}`}
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={isCurrent}
                            >
                                {isCurrent 
                                    ? "Current Plan" 
                                    : plan.name === "Free" 
                                        ? "Get Started Free" 
                                        : `Subscribe to ${plan.name}`
                                }
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Music Distribution Standalone Services */}
            <div className="additional-services">
                <h2>🎵 Standalone Music Distribution</h2>
                <p className="services-subtitle">
                    Don't need other features? Get music distribution only.
                </p>
                <div className="services-grid">
                    <div className="service-card">
                        <h3>🎤 Artist Distribution</h3>
                        <div className="service-price">$22.99/month</div>
                        <div className="service-features">
                            <div>✅ Unlimited track uploads</div>
                            <div>✅ 150+ global platforms</div>
                            <div>✅ Keep 100% royalties</div>
                            <div>✅ SonoSuite dashboard</div>
                            <div>✅ Analytics & reporting</div>
                        </div>
                        <button 
                            className="service-btn artist"
                            onClick={() => handleSubscribe("artist-distribution")}
                        >
                            Choose Artist Plan
                        </button>
                    </div>
                    
                    <div className="service-card">
                        <h3>🏢 Label Distribution</h3>
                        <div className="service-price">$74.99/month</div>
                        <div className="service-features">
                            <div>✅ Multiple artist management</div>
                            <div>✅ Unlimited releases</div>
                            <div>✅ Advanced analytics</div>
                            <div>✅ Priority support</div>
                            <div>✅ White-label options</div>
                        </div>
                        <button 
                            className="service-btn label"
                            onClick={() => handleSubscribe("label-distribution")}
                        >
                            Choose Label Plan
                        </button>
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="pricing-faq">
                <h2>❓ Frequently Asked Questions</h2>
                <div className="faq-grid">
                    <div className="faq-item">
                        <h4>Can I change plans anytime?</h4>
                        <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
                    </div>
                    <div className="faq-item">
                        <h4>Do I keep my royalties?</h4>
                        <p>Absolutely! You keep 100% of your streaming royalties. We don't take any commission.</p>
                    </div>
                    <div className="faq-item">
                        <h4>How long does distribution take?</h4>
                        <p>Your music typically goes live on streaming platforms within 24-48 hours of submission.</p>
                    </div>
                    <div className="faq-item">
                        <h4>Can I cancel anytime?</h4>
                        <p>Yes, you can cancel your subscription at any time. Your features remain active until the end of your billing cycle.</p>
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="pricing-cta">
                <h2>🚀 Ready to Distribute Your Music?</h2>
                <p>Join thousands of artists already using StreampireX to reach global audiences</p>
                <div className="cta-buttons">
                    <button 
                        className="cta-btn primary"
                        onClick={() => {
                            const proPlan = plans.find(p => p.name === "Pro");
                            if (proPlan) handleSubscribe(proPlan.id);
                        }}
                    >
                        Start with Pro Plan
                    </button>
                    <button 
                        className="cta-btn secondary"
                        onClick={() => window.location.href = "/music-distribution"}
                    >
                        Learn More About Distribution
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PricingPlans;