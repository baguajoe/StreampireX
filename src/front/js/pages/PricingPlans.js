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

            // Use consistent backend URL
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
            
            console.log("🔍 Attempting to fetch from:", `${backendUrl}/api/pricing/plans`);
            
            const response = await fetch(`${backendUrl}/api/pricing/plans`, {
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
            
            // Handle response format: backend returns {plans: [...]}
            if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
                setPlans(data.plans);
            } else if (Array.isArray(data) && data.length > 0) {
                setPlans(data);
            } else {
                console.warn("⚠️ No pricing plans returned from API");
                setError("No pricing plans available. Please contact support.");
            }
            
        } catch (err) {
            console.error("❌ Error fetching pricing plans:", err);
            setError(`Failed to load pricing plans: ${err.message}`);
            
            // Set fallback plans with all 6 plans including distribution
            setPlans([
                {
                    id: "fallback-free",
                    name: "Free",
                    price_monthly: 0,
                    price_yearly: 0,
                    includes_podcasts: true,
                    includes_radio: true,
                    includes_music_distribution: false,
                    includes_gaming_features: true,
                    trial_days: 0,
                    description: "Perfect for getting started"
                },
                {
                    id: "fallback-basic",
                    name: "Basic",
                    price_monthly: 12.99,
                    price_yearly: 129.99,
                    includes_podcasts: true,
                    includes_radio: true,
                    includes_live_events: true,
                    includes_music_distribution: false,
                    includes_gaming_features: true,
                    trial_days: 7,
                    description: "Enhanced features for growing creators"
                },
                {
                    id: "fallback-pro",
                    name: "Pro", 
                    price_monthly: 21.99,
                    price_yearly: 219.99,
                    includes_podcasts: true,
                    includes_radio: true,
                    includes_live_events: true,
                    includes_merch_sales: true,
                    includes_ad_revenue: true,
                    includes_music_distribution: false,
                    includes_gaming_features: true,
                    trial_days: 14,
                    description: "Professional tools for serious creators"
                },
                {
                    id: "fallback-premium",
                    name: "Premium",
                    price_monthly: 29.99,
                    price_yearly: 299.99,
                    includes_podcasts: true,
                    includes_radio: true,
                    includes_live_events: true,
                    includes_music_distribution: false,
                    includes_gaming_features: true,
                    includes_brand_partnerships: true,
                    includes_affiliate_marketing: true,
                    includes_digital_sales: true,
                    includes_merch_sales: true,
                    includes_tip_jar: true,
                    includes_ad_revenue: true,
                    includes_team_rooms: true,
                    includes_squad_finder: true,
                    trial_days: 30,
                    description: "Maximum monetization power"
                },
                {
                    id: "fallback-artist-distribution",
                    name: "Artist Distribution",
                    price_monthly: 21.99,
                    price_yearly: 21.99, // Same price yearly
                    includes_podcasts: false,
                    includes_radio: false,
                    includes_live_events: false,
                    includes_music_distribution: true,
                    includes_gaming_features: false,
                    trial_days: 0,
                    description: "Music distribution for independent artists"
                },
                {
                    id: "fallback-label-distribution",
                    name: "Label Distribution",
                    price_monthly: 74.99,
                    price_yearly: 74.99, // Same price yearly
                    includes_podcasts: false,
                    includes_radio: false,
                    includes_live_events: false,
                    includes_music_distribution: true,
                    includes_gaming_features: false,
                    trial_days: 0,
                    description: "Music distribution for record labels"
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentPlan = async () => {
        try {
            const token = localStorage.getItem("token");
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
                              
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
            if (planId === "artist-distribution" || planId === "fallback-artist-distribution") {
                actualPlanId = "standalone-artist";
            } else if (planId === "label-distribution" || planId === "fallback-label-distribution") {
                actualPlanId = "standalone-label";
            }

            console.log("🔄 Subscribing to plan:", actualPlanId);

            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

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
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
                              
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
        
        // Distribution plans have different features
        if (plan.name === "Artist Distribution") {
            return [
                "🎵 Global Music Distribution",
                "📊 Streaming Analytics", 
                "💰 100% Royalty Retention",
                "📈 Performance Tracking",
                "🎧 Major Streaming Platforms",
                "⚡ 24-48 Hour Distribution"
            ];
        }
        
        if (plan.name === "Label Distribution") {
            return [
                "🎵 Unlimited Artist Distribution",
                "🏷️ Label Management Tools",
                "📊 Multi-Artist Analytics",
                "💰 Revenue Split Management", 
                "📈 Label Performance Dashboard",
                "🎧 All Major Platforms",
                "⚡ Priority Distribution",
                "🎤 Artist Roster Management"
            ];
        }
        
        // Regular plans - Social Media Features (FREE FOR ALL PLANS)
        if (plan.name !== "Artist Distribution" && plan.name !== "Label Distribution") {
            features.push("📱 Multi-Platform Social Posting");
            features.push("🐦 Social Network Integration");
            features.push("📸 Photo & Story Sharing");
            features.push("🎬 Short-Form Video Posting");
            features.push("📺 Video Platform Integration");
            features.push("📘 Professional Network Posting");
            features.push("📅 Content Scheduling");
            features.push("📊 Social Media Analytics");
            features.push("🤖 AI Content Optimization");
            features.push("📈 Cross-Platform Dashboard");
        }
        
        // Core Content Creation
        if (plan.includes_podcasts) features.push("🎙️ Create Podcasts");
        if (plan.includes_radio) features.push("📻 Radio Stations");
        if (plan.includes_live_events) features.push("🎥 Live Streaming");
        
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
                return "Enhanced features for growing creators";
            case "Pro":
                return "Professional tools for serious creators";
            case "Premium":
                return "Complete creator suite with advanced monetization features";
            case "Artist Distribution":
                return "Music distribution for independent artists";
            case "Label Distribution":
                return "Music distribution for record labels";
            case "Creator":
                return "Free social features + enhanced content creation tools";
            default:
                return plan.description || "";
        }
    };

    const getYearlySavings = (plan) => {
        if (plan.price_monthly === 0) return 0;
        // Distribution plans don't have yearly savings (same price)
        if (plan.name === "Artist Distribution" || plan.name === "Label Distribution") return 0;
        const monthlyTotal = plan.price_monthly * 12;
        return monthlyTotal - plan.price_yearly;
    };

    const getCurrentPrice = (plan) => {
        // Distribution plans are yearly-only pricing
        if (plan.name === "Artist Distribution" || plan.name === "Label Distribution") {
            return selectedBilling === 'yearly' ? plan.price_yearly : plan.price_yearly;
        }
        return selectedBilling === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
    };

    const getPricePeriod = (plan) => {
        // Distribution plans are yearly-only
        if (plan.name === "Artist Distribution" || plan.name === "Label Distribution") {
            return "/year";
        }
        return selectedBilling === 'yearly' ? '/month' : '/month';
    };

    const isCurrentPlan = (plan) => {
        return currentPlan && currentPlan.id === plan.id;
    };

    // Separate regular plans from distribution plans
    const regularPlans = plans.filter(plan => 
        plan.name !== "Artist Distribution" && plan.name !== "Label Distribution"
    );
    const distributionPlans = plans.filter(plan => 
        plan.name === "Artist Distribution" || plan.name === "Label Distribution"
    );

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
                        <p>Backend URL: <code>{process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}</code></p>
                        
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
                        <div className="platform-badge">🐦 Social Network A</div>
                        <div className="platform-badge">📸 Photo Sharing</div>
                        <div className="platform-badge">🎬 Short Video</div>
                        <div className="platform-badge">📺 Video Platform</div>
                    </div>
                    <div className="platform-row">
                        <div className="platform-badge">📘 Social Network B</div>
                        <div className="platform-badge">💼 Professional Network</div>
                        <div className="platform-badge">👻 Story Platform</div>
                        <div className="platform-badge">📌 Visual Discovery</div>
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

            {/* Main Creator Plans Grid */}
            <div className="pricing-section">
                <h2>🎨 Creator Plans</h2>
                <div className="pricing-grid">
                    {regularPlans.map((plan) => {
                        const isCurrent = isCurrentPlan(plan);
                        const currentPrice = getCurrentPrice(plan);
                        const isProcessing = processingPayment === plan.id;
                        
                        return (
                            <div key={plan.id} className={`pricing-card ${plan.name.toLowerCase().replace(/\s+/g, '-')} ${isCurrent ? 'current-plan' : ''}`}>
                                {/* Popular Badge */}
                                {(plan.name === "Pro" || plan.name === "Creator") && (
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
                                        <span className="period">{getPricePeriod(plan)}</span>
                                    </div>
                                    {selectedBilling === 'yearly' && plan.price_yearly > 0 && getYearlySavings(plan) > 0 && (
                                        <div className="yearly-price">
                                            <span className="yearly-label">Billed ${plan.price_yearly} yearly</span>
                                            <span className="savings">Save ${getYearlySavings(plan).toFixed(2)}</span>
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
                                    {plan.features ? plan.features.map((feature, index) => (
                                        <div key={index} className="feature-item">
                                            ✅ {feature}
                                        </div>
                                    )) : getFeatureList(plan).map((feature, index) => (
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
                                    className={`subscribe-btn ${plan.name.toLowerCase().replace(/\s+/g, '-')} ${isCurrent ? 'current' : ''}`}
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
            </div>

            {/* Music Distribution Plans */}
            {distributionPlans.length > 0 && (
                <div className="pricing-section distribution-section">
                    <h2>🎵 Music Distribution Plans</h2>
                    <p className="section-subtitle">Distribute your music globally to 150+ platforms</p>
                    <div className="pricing-grid distribution-grid">
                        {distributionPlans.map((plan) => {
                            const isCurrent = isCurrentPlan(plan);
                            const currentPrice = getCurrentPrice(plan);
                            const isProcessing = processingPayment === plan.id;
                            
                            return (
                                <div key={plan.id} className={`pricing-card distribution-card ${plan.name.toLowerCase().replace(/\s+/g, '-')} ${isCurrent ? 'current-plan' : ''}`}>
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
                                            <span className="period">/year</span>
                                        </div>
                                        <div className="yearly-price">
                                            <span className="yearly-label">Annual billing only</span>
                                        </div>
                                    </div>

                                    <div className="plan-features">
                                        {plan.features ? plan.features.map((feature, index) => (
                                            <div key={index} className="feature-item">
                                                ✅ {feature}
                                            </div>
                                        )) : getFeatureList(plan).map((feature, index) => (
                                            <div key={index} className="feature-item">
                                                ✅ {feature}
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        className={`subscribe-btn distribution-btn ${plan.name.toLowerCase().replace(/\s+/g, '-')} ${isCurrent ? 'current' : ''}`}
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
                                            : `Subscribe to ${plan.name}`
                                        }
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                        <h4>Are distribution plans monthly or yearly?</h4>
                        <p>Music distribution plans are billed annually only. Creator plans can be billed monthly or yearly with savings.</p>
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
                <p>Backend URL: {process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}</p>
                <p>Plans loaded: {plans.length}</p>
                <p>Regular plans: {regularPlans.length}</p>
                <p>Distribution plans: {distributionPlans.length}</p>
                <p>Current plan: {currentPlan ? currentPlan.name : 'None'}</p>
                <p>Environment: {process.env.NODE_ENV || 'development'}</p>
                <p>Selected billing: {selectedBilling}</p>
            </div>
        </div>
    );
};

export default PricingPlans;