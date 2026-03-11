import React, { useEffect, useState, useContext } from "react";
import { Context } from "../store/appContext";
import "../../styles/StorefrontPage.css";

const PRINTFUL_CATEGORIES = ["T-Shirts", "Hoodies", "Hats", "Mugs", "Phone Cases", "Posters"];

const MerchStore = () => {
    const { store } = useContext(Context);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [category, setCategory] = useState("all");
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/merch/products`, {
            headers: { Authorization: `Bearer ${store.token}` }
        })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => { setProducts(data.products || []); setLoading(false); })
        .catch(() => {
            // Fallback to mock products until Printful is connected
            setProducts(MOCK_PRODUCTS);
            setLoading(false);
        });
    }, []);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? {...i, qty: i.qty + 1} : i);
            return [...prev, {...product, qty: 1}];
        });
    };

    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const filtered = category === "all" ? products : products.filter(p => p.category === category);

    return (
        <div className="merch-store">
            <div className="merch-store__header">
                <h1>🛍️ Creator Merch Store</h1>
                <p>Custom merch powered by Printful — ships worldwide, no inventory needed</p>
                <button className="merch-store__cart-btn" onClick={() => setCartOpen(!cartOpen)}>
                    🛒 Cart ({cart.reduce((s, i) => s + i.qty, 0)}) — ${cartTotal.toFixed(2)}
                </button>
            </div>
            <div className="merch-store__filters">
                {["all", ...PRINTFUL_CATEGORIES].map(c => (
                    <button key={c}
                        className={`merch-filter-btn ${category === c ? "active" : ""}`}
                        onClick={() => setCategory(c)}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                    </button>
                ))}
            </div>
            {loading ? <div className="merch-loading">Loading products...</div> :
             error ? <div className="merch-error">{error}</div> :
            <div className="merch-store__grid">
                {filtered.map(product => (
                    <div key={product.id} className="merch-card">
                        <div className="merch-card__img">
                            {product.image ? <img src={product.image} alt={product.name} /> :
                             <div className="merch-card__placeholder">👕</div>}
                        </div>
                        <div className="merch-card__info">
                            <h3>{product.name}</h3>
                            <p className="merch-card__category">{product.category}</p>
                            <p className="merch-card__price">${product.price?.toFixed(2)}</p>
                            <button className="merch-card__btn" onClick={() => addToCart(product)}>
                                Add to Cart
                            </button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="merch-empty">
                        <p>🎨 No products yet. Connect your Printful account to add merch.</p>
                        <a href="https://printful.com" target="_blank" rel="noreferrer"
                           className="merch-connect-btn">Connect Printful →</a>
                    </div>
                )}
            </div>}
            {cartOpen && (
                <div className="merch-cart-panel">
                    <h3>Your Cart</h3>
                    {cart.length === 0 ? <p>Cart is empty</p> : <>
                        {cart.map(i => (
                            <div key={i.id} className="merch-cart-item">
                                <span>{i.name} x{i.qty}</span>
                                <span>${(i.price * i.qty).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="merch-cart-total">Total: ${cartTotal.toFixed(2)}</div>
                        <button className="merch-checkout-btn"
                            onClick={() => alert("Connect Stripe + Printful to enable checkout")}>
                            Checkout
                        </button>
                    </>}
                </div>
            )}
        </div>
    );
};

const MOCK_PRODUCTS = [
    { id: 1, name: "StreamPireX Tee", category: "T-Shirts", price: 29.99, image: null },
    { id: 2, name: "Creator Hoodie", category: "Hoodies", price: 54.99, image: null },
    { id: 3, name: "SPX Logo Hat", category: "Hats", price: 24.99, image: null },
    { id: 4, name: "Studio Mug", category: "Mugs", price: 16.99, image: null },
    { id: 5, name: "Beats Poster", category: "Posters", price: 19.99, image: null },
];

export default MerchStore;
