import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/ShoppingCart.css"

const ShoppingCart = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        loadCartFromStorage();
    }, []);

    useEffect(() => {
        calculateTotal();
    }, [cartItems]);

    const loadCartFromStorage = () => {
        try {
            const savedCart = localStorage.getItem("shopping_cart");
            if (savedCart) {
                const cart = JSON.parse(savedCart);
                setCartItems(cart);
            }
        } catch (err) {
            console.error("Error loading cart:", err);
        }
    };

    const saveCartToStorage = (cart) => {
        try {
            localStorage.setItem("shopping_cart", JSON.stringify(cart));
        } catch (err) {
            console.error("Error saving cart:", err);
        }
    };

    const calculateTotal = () => {
        const totalAmount = cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        setTotal(totalAmount);
    };

    const addToCart = async (productId) => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.BACKEND_URL}/api/products/${productId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const product = await response.json();
                
                const existingItem = cartItems.find(item => item.id === product.id);
                let updatedCart;

                if (existingItem) {
                    // Update quantity if item already in cart
                    updatedCart = cartItems.map(item =>
                        item.id === product.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                } else {
                    // Add new item to cart
                    updatedCart = [...cartItems, { ...product, quantity: 1 }];
                }

                setCartItems(updatedCart);
                saveCartToStorage(updatedCart);
            }
        } catch (err) {
            console.error("Error adding to cart:", err);
            alert("Failed to add item to cart");
        } finally {
            setLoading(false);
        }
    };

    const removeFromCart = (productId) => {
        const updatedCart = cartItems.filter(item => item.id !== productId);
        setCartItems(updatedCart);
        saveCartToStorage(updatedCart);
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        const updatedCart = cartItems.map(item =>
            item.id === productId
                ? { ...item, quantity: Math.min(newQuantity, item.stock || 999) }
                : item
        );
        setCartItems(updatedCart);
        saveCartToStorage(updatedCart);
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem("shopping_cart");
    };

    const proceedToCheckout = () => {
        if (cartItems.length === 0) {
            alert("Your cart is empty");
            return;
        }
        navigate("/checkout", { state: { cartItems } });
    };

    const handleBulkCheckout = async () => {
        try {
            setLoading(true);
            
            // Create checkout sessions for each item
            const checkoutPromises = cartItems.map(async (item) => {
                const response = await fetch(`${process.env.BACKEND_URL}/api/marketplace/checkout`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({ 
                        product_id: item.id,
                        quantity: item.quantity 
                    })
                });

                if (response.ok) {
                    return await response.json();
                }
                throw new Error(`Failed to create checkout for ${item.title}`);
            });

            const checkoutSessions = await Promise.all(checkoutPromises);
            
            // For now, redirect to the first checkout session
            // In a real app, you'd create a combined checkout
            if (checkoutSessions.length > 0) {
                window.location.href = checkoutSessions[0].checkout_url;
            }
            
        } catch (err) {
            console.error("Bulk checkout error:", err);
            alert("Checkout failed. Please try again or checkout items individually.");
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="container mt-4">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <div className="mb-4">
                                    <i className="fas fa-shopping-cart fa-4x text-muted"></i>
                                </div>
                                <h3 className="card-title">Your Cart is Empty</h3>
                                <p className="card-text text-muted">
                                    Browse our marketplace to find amazing products from creators!
                                </p>
                                <button 
                                    className="btn btn-primary btn-lg"
                                    onClick={() => navigate("/marketplace")}
                                >
                                    🛒 Start Shopping
                                </button>
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
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>🛒 Shopping Cart ({cartItems.length} items)</h2>
                        <button 
                            className="btn btn-outline-danger"
                            onClick={clearCart}
                        >
                            🗑️ Clear Cart
                        </button>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Cart Items */}
                <div className="col-lg-8">
                    {cartItems.map((item) => (
                        <div key={item.id} className="card mb-3">
                            <div className="card-body">
                                <div className="row align-items-center">
                                    {/* Product Image */}
                                    <div className="col-md-2">
                                        <img 
                                            src={item.image_url || "/default-product.jpg"}
                                            alt={item.title}
                                            className="img-fluid rounded"
                                            style={{ height: "80px", objectFit: "cover" }}
                                        />
                                    </div>

                                    {/* Product Info */}
                                    <div className="col-md-4">
                                        <h6 className="card-title mb-1">{item.title}</h6>
                                        <p className="text-muted small mb-1">{item.description}</p>
                                        <span className="badge bg-primary">
                                            {item.is_digital ? "📥 Digital" : "📦 Physical"}
                                        </span>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="col-md-2">
                                        <div className="input-group">
                                            <button 
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            >
                                                -
                                            </button>
                                            <input 
                                                type="number"
                                                className="form-control form-control-sm text-center"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                                min="1"
                                                max={item.stock || 999}
                                                style={{ maxWidth: "60px" }}
                                            />
                                            <button 
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                disabled={item.quantity >= (item.stock || 999)}
                                            >
                                                +
                                            </button>
                                        </div>
                                        {!item.is_digital && (
                                            <small className="text-muted">
                                                {item.stock} available
                                            </small>
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div className="col-md-2 text-center">
                                        <div className="fw-bold">${item.price}</div>
                                        <div className="text-muted small">
                                            Total: ${(item.price * item.quantity).toFixed(2)}
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <div className="col-md-2 text-center">
                                        <button 
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            🗑️ Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cart Summary */}
                <div className="col-lg-4">
                    <div className="card position-sticky" style={{ top: "20px" }}>
                        <div className="card-header">
                            <h5 className="mb-0">Order Summary</h5>
                        </div>
                        <div className="card-body">
                            <div className="d-flex justify-content-between mb-2">
                                <span>Items ({cartItems.length}):</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Shipping:</span>
                                <span className="text-muted">Calculated at checkout</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Tax:</span>
                                <span className="text-muted">Calculated at checkout</span>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-between fw-bold fs-5">
                                <span>Total:</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                            
                            <div className="d-grid gap-2 mt-4">
                                <button 
                                    className="btn btn-success btn-lg"
                                    onClick={proceedToCheckout}
                                    disabled={loading}
                                >
                                    {loading ? "Processing..." : "💳 Proceed to Checkout"}
                                </button>
                                
                                <button 
                                    className="btn btn-primary"
                                    onClick={handleBulkCheckout}
                                    disabled={loading}
                                >
                                    🚀 Quick Stripe Checkout
                                </button>
                                
                                <button 
                                    className="btn btn-outline-secondary"
                                    onClick={() => navigate("/marketplace")}
                                >
                                    ← Continue Shopping
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Security Info */}
                    <div className="card mt-3">
                        <div className="card-body text-center">
                            <small className="text-muted">
                                🔒 Secure checkout powered by Stripe<br />
                                💳 All major payment methods accepted<br />
                                📧 Order confirmation via email
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShoppingCart;