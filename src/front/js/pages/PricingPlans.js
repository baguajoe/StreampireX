// Complete PricingPlans.js with all original features and improved styling

import React, { useEffect, useState } from "react";
import { useContext } from "react";
import { Context } from "../store/appContext";
import "../../styles/PricingPlans.css";

const PricingPlans = () => {
    const { store } = useContext(Context);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [error, setError] = useState(null);
    const [selectedBilling, setSelectedBilling] = useState('monthly');
    const [processingPayment, setProcessingPayment] = useState(null);

    useEffect(() => {
        fetchPlans();
        if (store.user) {
            fetchCurrentPlan();
        }
    }, [store.user]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get backend URL with multiple fallbacks
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 
                              process.env.BACKEND_URL || 
                              'http://localhost:3001';
            
            console.log("🔍 Attempting to fetch from:", `${backendUrl}/api/pricing-plans`);
            
            // ✅ FIXED: Use the correct endpoint to GET pricing plans
            const response = await fetch(`${backendUrl}/api/pricing-plans`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log("📡 Response status:", response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("✅ Pricing plans fetched successfully:", data);
            
            if (Array.isArray(data) && data.length > 0) {
                setPlans(data);
            } else {
                console.warn("⚠️ No pricing plans returned from API");
                setError("No pricing plans available. Please contact support.");
            }
            
        } catch (err) {
            console.error("❌ Error fetching pricing plans:", err);
            setError(`Failed to load pricing plans: ${err.message}`);
            
            // Set fallback plans for development/testing
            setPlans([
                {
                    id: "fallback-free",
                    name: "Free",
                    price_monthly: 0,
                    price_yearly: 0,
                    includes_podcasts: false,
                    includes_radio: false,
                    includes_music_distribution: false,
                    includes_gaming_features: true,
                    trial_days: 0
                },
                {
                    id: "fallback-basic",
                    name: "Basic",
                    price_monthly: 9.99,
                    price_yearly: 99.99,
                    includes_podcasts: true,
                    includes_radio: false,
                    includes_music_distribution: false,
                    includes_gaming_features: true,
                    trial_days: 7
                },
                {
                    id: "fallback-pro",
                    name: "Pro", 
                    price_monthly: 19.99,
                    price_yearly: 199.99,
                    includes_podcasts: true,
                    includes_radio: true,
                    includes_music_distribution: true,
                    distribution_uploads_limit: 10,
                    includes_gaming_features: true,
                    trial_days: 14
                },
                {
                    id: "fallback-premium",
                    name: "Premium",
                    price_monthly: 39.99,
                    price_yearly: 399.99,
                    includes_podcasts: true,
                    includes_radio: true,
                    includes_music_distribution: true,
                    distribution_uploads_limit: -1,
                    includes_gaming_features: true,
                    includes_brand_partnerships: true,
                    includes_affiliate_marketing: true,
                    includes_digital_sales: true,
                    includes_merch_sales: true,
                    includes_tip_jar: true,
                    includes_ad_revenue: true,
                    includes_team_rooms: true,
                    includes_squad_finder: true,
                    includes_gaming_analytics: true,
                    includes_game_streaming: true,
                    includes_gaming_monetization: true,
                    includes_live_events: true,
                    sonosuite_access: true,
                    trial_days: 30
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentPlan = async () => {
        try {
            const token = localStorage.getItem("token");
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 
                              process.env.BACKEND_URL || 
                              'http://localhost:3001';
                              
            console.log("🔍 Fetching current plan from:", `${backendUrl}/api/user/plan-status`);
            
            const response = await fetch(`${backendUrl}/api/user/plan-status`, {
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setCurrentPlan(data.plan);
                console.log("✅ Current plan fetched:", data.plan);
            } else {
                console.log("ℹ️ No current plan found (user may be on free plan)");
            }
        } catch (err) {
            console.error("❌ Error fetching current plan:", err);
        }
    };

    const handleSubscribe = async (planId) => {
        if (!store.user) {
            alert("Please log in to subscribe to a plan");
            return;
        }

        try {
            setProcessingPayment(planId);

            // Handle standalone distribution plans
            let actualPlanId = planId;
            if (planId === "artist-distribution") {
                actualPlanId = "standalone-artist";
            } else if (planId === "label-distribution") {
                actualPlanId = "standalone-label";
            }

            console.log("🔄 Subscribing to plan:", actualPlanId);

            const backendUrl = process.env.REACT_APP_BACKEND_URL || 
                              process.env.BACKEND_URL || 
                              'http://localhost:3001';

            const res = await fetch(`${backendUrl}/api/subscriptions/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem("token")
                },
                body: JSON.stringify({ 
                    plan_id: actualPlanId,
                    billing_cycle: selectedBilling 
                })
            });

            const data = await res.json();
            console.log("📋 Subscription response:", data);

            if (res.ok) {
                if (data.checkout_url) {
                    console.log("🔗 Redirecting to checkout:", data.checkout_url);
                    window.location.href = data.checkout_url;
                } else {
                    // Handle direct subscription success (like free plans)
                    alert("✅ " + data.message);
                    window.location.reload(); // Refresh to show updated plan
                }
            } else {
                console.error("❌ Subscription error:", data);
                alert("❌ " + (data.error || "Subscription failed"));
            }
        } catch (error) {
            console.error("❌ Subscription error:", error);
            alert("❌ Failed to process subscription. Please try again.");
        } finally {
            setProcessingPayment(null);
        }
    };

    // Test backend connection
    const testConnection = async () => {
        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 
                              process.env.BACKEND_URL || 
                              'http://localhost:3001';
                              
            console.log("🧪 Testing connection to:", backendUrl);
            
            const response = await fetch(`${backendUrl}/api/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                console.log("✅ Backend connection successful");
                alert("✅ Backend connection successful!");
                // Retry fetching plans
                fetchPlans();
            } else {
                console.error("❌ Backend responded with error:", response.status);
                alert(`❌ Backend error: ${response.status}`);
            }
        } catch (error) {
            console.error("❌ Connection test failed:", error);
            alert(`❌ Connection failed: ${error.message}`);
        }
    };

    const getFeatureList = (plan) => {
        const features = [];
        
        // 📱 SOCIAL MEDIA FEATURES (FREE FOR ALL PLANS)
        features.push("📱 Multi-Platform Social Posting");
        features.push("🐦 Twitter/X Integration");
        features.push("📸 Instagram Stories & Reels");
        features.push("🎬 TikTok Auto-Posting");
        features.push("📺 YouTube Integration");
        features.push("📘 Facebook & LinkedIn");
        features.push("📅 Content Scheduling");
        features.push("📊 Social Media Analytics");
        features.push("🤖 AI Content Optimization");
        features.push("📈 Cross-Platform Dashboard");
        
        // Core Content Creation
        if (plan.includes_podcasts) features.push("🎙️ Create Podcasts");
        if (plan.includes_radio) features.push("📻 Radio Stations");
        if (plan.includes_live_events) features.push("🎥 Live Streaming");
        
        // Music Distribution features removed - only available as separate service
        
        // Monetization
        if (plan.includes_digital_sales) features.push("🛍️ Digital Sales");
        if (plan.includes_merch_sales) features.push("👕 Merch Store");
        if (plan.includes_tip_jar) features.push("💰 Fan Tipping");
        if (plan.includes_ad_revenue) features.push("📺 Ad Revenue Sharing");
        if (plan.includes_brand_partnerships || plan.name === "Premium") {
            features.push("🤝 Brand Partnership Hub");
        }
        if (plan.includes_affiliate_marketing || plan.name === "Premium") {
            features.push("💼 Affiliate Marketing Tools");
        }
        
        // Gaming Features
        if (plan.includes_gaming_features) features.push("🎮 Gaming Community");
        if (plan.includes_team_rooms) features.push("🏠 Private Team Rooms");
        if (plan.includes_squad_finder) features.push("🔍 Squad Finder");
        if (plan.includes_gaming_analytics) features.push("🎮 Gaming Analytics");
        if (plan.includes_game_streaming) features.push("📺 Game Streaming");
        if (plan.includes_gaming_monetization) features.push("💰 Gaming Monetization");
        
        return features;
    };

    const getPlanDescription = (plan) => {
        switch(plan.name) {
            case "Free":
                return "Full social media features + gaming community access for everyone";
            case "Basic":
                return "Free social features + enhanced content creation tools";
            case "Pro":
                return "Everything in Basic + radio stations and team collaboration";
            case "Premium":
                return "Complete creator suite with advanced monetization features";
            default:
                return "";
        }
    };

    const getYearlySavings = (plan) => {
        if (plan.price_monthly === 0) return 0;
        const monthlyTotal = plan.price_monthly * 12;
        return monthlyTotal - plan.price_yearly;
    };

    const getCurrentPrice = (plan) => {
        return selectedBilling === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
    };

    const isCurrentPlan = (plan) => {
        return currentPlan && currentPlan.id === plan.id;
    };

    if (loading) {
        return (
            <div className="pricing-container loading">
                <h1>💰 Loading Plans...</h1>
                <div className="loading-spinner"></div>
                <p>Connecting to backend...</p>
            </div>
        );
    }

    // Enhanced error handling with connection testing
    if (error || plans.length === 0) {
        return (
            <div className="pricing-container">
                <div className="pricing-header">
                    <h1>💰 Pricing Plans</h1>
                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}
                    
                    <div className="connection-troubleshooting">
                        <h3>🔧 Connection Troubleshooting</h3>
                        <p>Backend URL: <code>{process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001'}</code></p>
                        
                        <div className="troubleshooting-steps">
                            <h4>Debug Steps:</h4>
                            <ol>
                                <li>✅ Check if your backend is running on port 3001</li>
                                <li>✅ Verify your environment variables are set</li>
                                <li>✅ Test the API endpoint directly</li>
                                <li>✅ Check browser console for detailed errors</li>
                            </ol>
                        </div>
                        
                        <div className="action-buttons">
                            <button 
                                className="retry-btn"
                                onClick={() => {
                                    setLoading(true);
                                    setError(null);
                                    fetchPlans();
                                }}
                            >
                                🔄 Retry Loading Plans
                            </button>
                            
                            <button 
                                className="test-btn"
                                onClick={testConnection}
                            >
                                🧪 Test Backend Connection
                            </button>
                        </div>
                    </div>
                </div>
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
                
                {/* Billing Toggle */}
                <div className="billing-toggle">
                    <button
                        className={selectedBilling === 'monthly' ? 'active' : ''}
                        onClick={() => setSelectedBilling('monthly')}
                    >
                        Monthly
                    </button>
                    <button
                        className={selectedBilling === 'yearly' ? 'active' : ''}
                        onClick={() => setSelectedBilling('yearly')}
                    >
                        Yearly
                        <span className="savings-badge">Save up to 25%</span>
                    </button>
                </div>
                
                {currentPlan && (
                    <div className="current-plan-badge">
                        Currently on: <strong>{currentPlan.name} Plan</strong>
                    </div>
                )}
            </div>
            
            {/* Social Media Integration Section */}
            <div className="social-media-integration">
                <h2>📱 Complete Social Media Suite - FREE FOR EVERYONE</h2>
                <p className="integration-subtitle">
                    Unlike other platforms, StreampireX includes powerful social media tools with every plan
                </p>
                <div className="social-platforms-showcase">
                    <div className="platform-row">
                        <div className="platform-badge">🐦 Twitter/X</div>
                        <div className="platform-badge">📸 Instagram</div>
                        <div className="platform-badge">🎬 TikTok</div>
                        <div className="platform-badge">📺 YouTube</div>
                    </div>
                    <div className="platform-row">
                        <div className="platform-badge">📘 Facebook</div>
                        <div className="platform-badge">💼 LinkedIn</div>
                        <div className="platform-badge">👻 Snapchat</div>
                        <div className="platform-badge">📌 Pinterest</div>
                    </div>
                </div>
                <div className="integration-features">
                    <div className="integration-feature">
                        <span className="feature-icon">🆓</span>
                        <div>
                            <h4>100% Free Social Features</h4>
                            <p>Full social media management included with every plan - no hidden fees</p>
                        </div>
                    </div>
                    <div className="integration-feature">
                        <span className="feature-icon">📈</span>
                        <div>
                            <h4>Unified Analytics</h4>
                            <p>Track performance across all platforms in one comprehensive dashboard</p>
                        </div>
                    </div>
                    <div className="integration-feature">
                        <span className="feature-icon">⏰</span>
                        <div>
                            <h4>Smart Automation</h4>
                            <p>Schedule posts, optimize timing, and manage everything from one place</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="pricing-grid">
                {plans.map((plan) => {
                    const isCurrent = isCurrentPlan(plan);
                    const currentPrice = getCurrentPrice(plan);
                    const isProcessing = processingPayment === plan.id;
                    
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
                                    <span className="price">${currentPrice.toFixed(2)}</span>
                                    <span className="period">/{selectedBilling === 'yearly' ? 'month' : 'month'}</span>
                                </div>
                                {selectedBilling === 'yearly' && plan.price_yearly > 0 && (
                                    <div className="yearly-price">
                                        <span className="yearly-label">Billed ${plan.price_yearly} yearly</span>
                                        {getYearlySavings(plan) > 0 && (
                                            <span className="savings">Save ${getYearlySavings(plan).toFixed(2)}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Social Media Features Highlight - FREE FOR ALL */}
                            <div className="social-media-highlight">
                                <h4>📱 Social Media Features (FREE)</h4>
                                <div className="social-features">
                                    <div>🚀 Post to all platforms at once</div>
                                    <div>📅 Smart scheduling & automation</div>
                                    <div>📊 Analytics across all networks</div>
                                    <div>🤖 AI content optimization</div>
                                </div>
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
                                className={`subscribe-btn ${plan.name.toLowerCase()} ${isCurrent ? 'current' : ''}`}
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={isCurrent || isProcessing}
                            >
                                {isProcessing ? (
                                    <span className="processing">
                                        <div className="btn-spinner"></div>
                                        Processing...
                                    </span>
                                ) : isCurrent 
                                    ? "✅ Current Plan" 
                                    : plan.name === "Free" 
                                        ? "🚀 Get Started Free" 
                                        : `Subscribe to ${plan.name}`
                                }
                            </button>
                        </div>
                    );
                })}
            </div>



            {/* Social Media Success Stats */}
            <div className="social-success-stats">
                <h2>📈 Why Creators Choose StreampireX Social Features</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">FREE</div>
                        <div className="stat-label">Social media tools</div>
                        <div className="stat-detail">included with every plan</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">15+</div>
                        <div className="stat-label">Platforms connected</div>
                        <div className="stat-detail">post everywhere at once</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">85%</div>
                        <div className="stat-label">Time saved</div>
                        <div className="stat-detail">on social media management</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">24/7</div>
                        <div className="stat-label">Automation</div>
                        <div className="stat-detail">schedule weeks in advance</div>
                    </div>
                </div>
                <div className="social-cta">
                    <h3>🎯 The Only Platform That Includes Social Media Management for FREE</h3>
                    <p>While others charge $50-200/month for social media tools, we include everything free!</p>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="pricing-faq">
                <h2>❓ Frequently Asked Questions</h2>
                <div className="faq-grid">
                    <div className="faq-item">
                        <h4>Can I change plans anytime?</h4>
                        <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate any billing differences.</p>
                    </div>
                    <div className="faq-item">
                        <h4>What happens to my content if I downgrade?</h4>
                        <p>Your existing content remains accessible. However, some advanced features may become unavailable based on your new plan limits.</p>
                    </div>
                    <div className="faq-item">
                        <h4>Do you offer refunds?</h4>
                        <p>We offer a 30-day money-back guarantee for all paid plans. Contact support if you're not satisfied with your subscription.</p>
                    </div>
                    <div className="faq-item">
                        <h4>Are there any setup fees?</h4>
                        <p>No setup fees ever! What you see is what you pay. All features are included in your monthly or yearly subscription.</p>
                    </div>
                </div>
            </div>

            {/* Debug Info */}
            <div className="debug-info" style={{ 
                background: '#f8f9fa', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginTop: '2rem',
                fontSize: '0.8rem',
                color: '#666',
                border: '1px solid #e0e0e0'
            }}>
                <h4>🔍 Debug Information:</h4>
                <p>Backend URL: {process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001'}</p>
                <p>Plans loaded: {plans.length}</p>
                <p>Current plan: {currentPlan ? currentPlan.name : 'None'}</p>
                <p>Environment: {process.env.NODE_ENV || 'development'}</p>
                <p>Selected billing: {selectedBilling}</p>
            </div>
        </div>
    );
};

export default PricingPlans;