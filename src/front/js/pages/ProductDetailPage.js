import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/ProductDetailPage.css"

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products/${id}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProduct(data);
            } else {
                setError("Product not found");
            }
        } catch (err) {
            setError("Failed to load product");
            console.error("Error fetching product:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products/buy/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ quantity })
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);

                // If digital product, show download link
                if (data.download_link) {
                    window.open(data.download_link, '_blank');
                }

                // Navigate to orders page
                navigate("/orders");
            } else {
                const errorData = await response.json();
                alert(`Purchase failed: ${errorData.error}`);
            }
        } catch (err) {
            console.error("Purchase error:", err);
            alert("Purchase failed. Please try again.");
        }
    };

    const handleStripeCheckout = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ product_id: parseInt(id) })
            });

            if (response.ok) {
                const data = await response.json();
                window.location.href = data.checkout_url;
            } else {
                const errorData = await response.json();
                alert(`Checkout failed: ${errorData.error}`);
            }
        } catch (err) {
            console.error("Checkout error:", err);
            alert("Checkout failed. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading product details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger" role="alert">
                    <h4 className="alert-heading">Error!</h4>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate("/marketplace")}>
                        Back to Marketplace
                    </button>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <h4>Product Not Found</h4>
                    <p>The product you're looking for doesn't exist.</p>
                    <button className="btn btn-primary" onClick={() => navigate("/marketplace")}>
                        Back to Marketplace
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item">
                        <button className="btn btn-link p-0" onClick={() => navigate("/marketplace")}>
                            Marketplace
                        </button>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                        {product.title}
                    </li>
                </ol>
            </nav>

            <div className="row">
                {/* Product Image */}
                <div className="col-md-6">
                    <div className="card">
                        <img
                            src={product.image_url || "/default-product.jpg"}
                            alt={product.title}
                            className="card-img-top"
                            style={{ height: "400px", objectFit: "cover" }}
                        />
                    </div>
                </div>

                {/* Product Info */}
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h1 className="card-title">{product.title}</h1>

                            <div className="mb-3">
                                <span className="badge bg-primary me-2">
                                    {product.is_digital ? "📥 Digital Product" : "📦 Physical Product"}
                                </span>
                                {!product.is_digital && (
                                    <span className="badge bg-success">
                                        📦 {product.stock} in stock
                                    </span>
                                )}
                            </div>

                            <h2 className="text-primary mb-3">${product.price}</h2>

                            <div className="mb-4">
                                <h5>Description</h5>
                                <p className="card-text">{product.description}</p>
                            </div>

                            {/* Quantity Selector (only for physical products) */}
                            {!product.is_digital && (
                                <div className="mb-3">
                                    <label htmlFor="quantity" className="form-label">Quantity:</label>
                                    <div className="input-group" style={{ maxWidth: "150px" }}>
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            className="form-control text-center"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                            min="1"
                                            max={product.stock}
                                        />
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Purchase Buttons */}
                            <div className="d-grid gap-2">
                                <button
                                    className="btn btn-success btn-lg"
                                    onClick={handlePurchase}
                                    disabled={!product.is_digital && product.stock < quantity}
                                >
                                    {product.is_digital ? "🔄 Buy & Download Now" : "🛒 Buy Now"}
                                    <span className="ms-2">${(product.price * quantity).toFixed(2)}</span>
                                </button>

                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleStripeCheckout}
                                    disabled={!product.is_digital && product.stock < quantity}
                                >
                                    💳 Pay with Stripe
                                </button>
                            </div>

                            {/* Out of Stock Warning */}
                            {!product.is_digital && product.stock <= 0 && (
                                <div className="alert alert-warning mt-3">
                                    <strong>Out of Stock!</strong> This item is currently unavailable.
                                </div>
                            )}

                            {/* Product Info */}
                            <div className="mt-4">
                                <h6>Product Information:</h6>
                                <ul className="list-unstyled">
                                    <li><strong>Product ID:</strong> #{product.id}</li>
                                    <li><strong>Type:</strong> {product.is_digital ? "Digital Download" : "Physical Item"}</li>
                                    {product.file_url && (
                                        <li><strong>File Format:</strong> Available after purchase</li>
                                    )}
                                    <li><strong>Seller:</strong> Creator #{product.creator_id}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Products Section */}
            <div className="row mt-5">
                <div className="col-12">
                    <h3>More from this seller</h3>
                    <div className="text-muted">
                        <p>Related products will be displayed here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;