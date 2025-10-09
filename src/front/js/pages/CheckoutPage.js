import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/CheckoutPage.css"

const CheckoutPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [isCartEmpty, setIsCartEmpty] = useState(false);

    const [billingInfo, setBillingInfo] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "United States"
    });

    const [shippingInfo, setShippingInfo] = useState({
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "United States"
    });

    const [sameAsBilling, setSameAsBilling] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState("stripe");
    const [orderSummary, setOrderSummary] = useState({
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0
    });

    // Get backend URL helper
    const getBackendUrl = () => {
        return process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
    };

    useEffect(() => {
        // Get cart items from location state or localStorage
        const items = location.state?.cartItems || JSON.parse(localStorage.getItem("shopping_cart") || "[]");

        if (items.length === 0) {
            setIsCartEmpty(true);
            setCartItems([]);
            return;
        }

        setIsCartEmpty(false);
        setCartItems(items);
        fetchUserInfo();
        calculateOrderSummary(items);
    }, []);

    useEffect(() => {
        if (sameAsBilling) {
            setShippingInfo({
                firstName: billingInfo.firstName,
                lastName: billingInfo.lastName,
                address: billingInfo.address,
                city: billingInfo.city,
                state: billingInfo.state,
                zipCode: billingInfo.zipCode,
                country: billingInfo.country
            });
        }
    }, [billingInfo, sameAsBilling]);

    const fetchUserInfo = async () => {
        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/user/profile`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);

                // Pre-fill billing info with user data
                setBillingInfo(prev => ({
                    ...prev,
                    firstName: userData.first_name || "",
                    lastName: userData.last_name || "",
                    email: userData.email || "",
                    phone: userData.phone || ""
                }));
            }
        } catch (err) {
            console.error("Error fetching user info:", err);
        }
    };

    const calculateOrderSummary = (items) => {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const hasPhysicalItems = items.some(item => !item.is_digital);
        const shipping = hasPhysicalItems ? (subtotal > 50 ? 0 : 9.99) : 0;
        const tax = subtotal * 0.08; // 8% tax rate
        const total = subtotal + shipping + tax;

        setOrderSummary({
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            total: total
        });
    };

    const handleBillingChange = (e) => {
        const { name, value } = e.target;
        setBillingInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleShippingChange = (e) => {
        const { name, value } = e.target;
        setShippingInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        const requiredBillingFields = ['firstName', 'lastName', 'email', 'address', 'city', 'state', 'zipCode'];

        for (let field of requiredBillingFields) {
            if (!billingInfo[field]) {
                alert(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
                return false;
            }
        }

        const hasPhysicalItems = cartItems.some(item => !item.is_digital);
        if (hasPhysicalItems && !sameAsBilling) {
            const requiredShippingFields = ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode'];
            for (let field of requiredShippingFields) {
                if (!shippingInfo[field]) {
                    alert(`Please fill in shipping ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
                    return false;
                }
            }
        }

        return true;
    };

    const handleStripeCheckout = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            const backendUrl = getBackendUrl();

            // For multiple items, we'll process them sequentially
            // In a real app, you'd create a single checkout session for all items
            for (const item of cartItems) {
                const response = await fetch(`${backendUrl}/api/marketplace/checkout`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({
                        product_id: item.id,
                        quantity: item.quantity,
                        billing_info: billingInfo,
                        shipping_info: sameAsBilling ? billingInfo : shippingInfo
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    // Clear cart and redirect to Stripe
                    localStorage.removeItem("shopping_cart");
                    window.location.href = data.checkout_url;
                    return;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Checkout failed');
                }
            }
        } catch (err) {
            console.error("Stripe checkout error:", err);
            alert(`Checkout failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDirectPurchase = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            const purchases = [];
            const backendUrl = getBackendUrl();

            for (const item of cartItems) {
                const response = await fetch(`${backendUrl}/api/products/buy/${item.id}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({
                        quantity: item.quantity,
                        billing_info: billingInfo,
                        shipping_info: sameAsBilling ? billingInfo : shippingInfo
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    purchases.push(data);
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to purchase ${item.title}`);
                }
            }

            // Clear cart and redirect to success page
            localStorage.removeItem("shopping_cart");
            alert("Order completed successfully!");
            navigate("/orders", { state: { newPurchases: purchases } });

        } catch (err) {
            console.error("Direct purchase error:", err);
            alert(`Purchase failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Render empty cart state
    if (isCartEmpty) {
        return (
            <div className="container mt-4">
                <div className="row">
                    <div className="col-12 mb-4">
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb">
                                <li className="breadcrumb-item">
                                    <button className="btn btn-link p-0" onClick={() => navigate("/marketplace")}>
                                        Marketplace
                                    </button>
                                </li>
                                <li className="breadcrumb-item">
                                    <button className="btn btn-link p-0" onClick={() => navigate("/cart")}>
                                        Cart
                                    </button>
                                </li>
                                <li className="breadcrumb-item active">Checkout</li>
                            </ol>
                        </nav>
                        <h2>Checkout</h2>
                    </div>
                </div>

                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <div className="mb-4">
                                    <i className="fas fa-shopping-cart fa-3x text-muted"></i>
                                </div>
                                <h4 className="card-title">Your cart is empty</h4>
                                <p className="card-text text-muted mb-4">
                                    Add some items to your cart before checking out.
                                </p>
                                <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={() => navigate("/marketplace")}
                                    >
                                        Browse Products
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary btn-lg"
                                        onClick={() => navigate("/cart")}
                                    >
                                        View Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12 mb-4">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item">
                                <button className="btn btn-link p-0" onClick={() => navigate("/marketplace")}>
                                    Marketplace
                                </button>
                            </li>
                            <li className="breadcrumb-item">
                                <button className="btn btn-link p-0" onClick={() => navigate("/cart")}>
                                    Cart
                                </button>
                            </li>
                            <li className="breadcrumb-item active">Checkout</li>
                        </ol>
                    </nav>
                    <h2>Checkout</h2>
                </div>
            </div>

            <div className="row">
                {/* Checkout Form */}
                <div className="col-lg-8">
                    {/* Billing Information */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">Billing Information</h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">First Name *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="firstName"
                                        value={billingInfo.firstName}
                                        onChange={handleBillingChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Last Name *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="lastName"
                                        value={billingInfo.lastName}
                                        onChange={handleBillingChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Email *</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        name="email"
                                        value={billingInfo.email}
                                        onChange={handleBillingChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        name="phone"
                                        value={billingInfo.phone}
                                        onChange={handleBillingChange}
                                    />
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label">Address *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="address"
                                        value={billingInfo.address}
                                        onChange={handleBillingChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">City *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="city"
                                        value={billingInfo.city}
                                        onChange={handleBillingChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">State *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="state"
                                        value={billingInfo.state}
                                        onChange={handleBillingChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">ZIP Code *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="zipCode"
                                        value={billingInfo.zipCode}
                                        onChange={handleBillingChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Information */}
                    {cartItems.some(item => !item.is_digital) && (
                        <div className="card mb-4">
                            <div className="card-header">
                                <h5 className="mb-0">Shipping Information</h5>
                            </div>
                            <div className="card-body">
                                <div className="form-check mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={sameAsBilling}
                                        onChange={(e) => setSameAsBilling(e.target.checked)}
                                    />
                                    <label className="form-check-label">
                                        Same as billing address
                                    </label>
                                </div>

                                {!sameAsBilling && (
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">First Name *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="firstName"
                                                value={shippingInfo.firstName}
                                                onChange={handleShippingChange}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Last Name *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="lastName"
                                                value={shippingInfo.lastName}
                                                onChange={handleShippingChange}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 mb-3">
                                            <label className="form-label">Address *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="address"
                                                value={shippingInfo.address}
                                                onChange={handleShippingChange}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">City *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="city"
                                                value={shippingInfo.city}
                                                onChange={handleShippingChange}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">State *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="state"
                                                value={shippingInfo.state}
                                                onChange={handleShippingChange}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">ZIP Code *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="zipCode"
                                                value={shippingInfo.zipCode}
                                                onChange={handleShippingChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Method */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">Payment Method</h5>
                        </div>
                        <div className="card-body">
                            <div className="form-check mb-2">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="paymentMethod"
                                    value="stripe"
                                    checked={paymentMethod === "stripe"}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                <label className="form-check-label">
                                    Credit/Debit Card (Stripe)
                                </label>
                            </div>
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="paymentMethod"
                                    value="direct"
                                    checked={paymentMethod === "direct"}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                />
                                <label className="form-check-label">
                                    Direct Purchase (Platform Credits)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="col-lg-4">
                    <div className="card position-sticky" style={{ top: "20px" }}>
                        <div className="card-header">
                            <h5 className="mb-0">Order Summary</h5>
                        </div>
                        <div className="card-body">
                            {/* Cart Items */}
                            <div className="mb-3">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                        <div className="flex-grow-1">
                                            <div className="fw-bold">{item.title}</div>
                                            <small className="text-muted">
                                                Qty: {item.quantity} × ${item.price}
                                            </small>
                                            <br />
                                            <span className="badge bg-primary">
                                                {item.is_digital ? "Digital" : "Physical"}
                                            </span>
                                        </div>
                                        <div className="fw-bold">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <hr />

                            {/* Order Totals */}
                            <div className="d-flex justify-content-between mb-2">
                                <span>Subtotal:</span>
                                <span>${orderSummary.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Shipping:</span>
                                <span>
                                    {orderSummary.shipping === 0 ? "FREE" : `$${orderSummary.shipping.toFixed(2)}`}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Tax:</span>
                                <span>${orderSummary.tax.toFixed(2)}</span>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-between fw-bold fs-5">
                                <span>Total:</span>
                                <span>${orderSummary.total.toFixed(2)}</span>
                            </div>

                            {/* Checkout Buttons */}
                            <div className="d-grid gap-2 mt-4">
                                {paymentMethod === "stripe" ? (
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleStripeCheckout}
                                        disabled={loading}
                                    >
                                        {loading ? "Processing..." : "Pay with Stripe"}
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-success btn-lg"
                                        onClick={handleDirectPurchase}
                                        disabled={loading}
                                    >
                                        {loading ? "Processing..." : "Complete Purchase"}
                                    </button>
                                )}

                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => navigate("/cart")}
                                    disabled={loading}
                                >
                                    Back to Cart
                                </button>
                            </div>

                            {/* Security Info */}
                            <div className="mt-3 text-center">
                                <small className="text-muted">
                                    Your payment information is secure<br />
                                    Order confirmation will be sent to your email
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;