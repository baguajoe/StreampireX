// src/front/js/pages/Marketplace.js - Updated to match browse/pricing style
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "../../styles/marketplace.css";

const Marketplace = () => {
  // State Management
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  
  // UI States
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  
  const navigate = useNavigate();

  // Apply same dark gradient background as Browse / Pricing pages
  useEffect(() => {
    document.body.style.background =
      "linear-gradient(135deg, #050816 0%, #020617 45%, #04101a 100%)";
    document.body.style.minHeight = "100vh";
    document.body.style.color = "#e1e4e8";

    return () => {
      document.body.style.background = "";
      document.body.style.minHeight = "";
      document.body.style.color = "";
    };
  }, []);

  // Utility Functions
  const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  const testConnection = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public-health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setConnectionStatus('connected');
        return true;
      } else {
        setConnectionStatus('error');
        return false;
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      return false;
    }
  };

  // Data Fetching Functions
  const fetchProducts = useCallback(async () => {
    const token = getAuthToken();
    
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      const params = new URLSearchParams({
        category: categoryFilter !== 'all' ? categoryFilter : '',
        search: searchTerm,
        sort_by: sortBy,
        min_price: priceRange.min,
        max_price: priceRange.max
      });

      const url = `${process.env.REACT_APP_BACKEND_URL}/api/marketplace/products?${params}`;
      console.log('Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Invalid response format from server');
      }

      setProducts(data.products);
      setPagination(data.pagination);
      setConnectionStatus('connected');
      setRetryCount(0);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setConnectionStatus('error');
      
      if (retryCount < 2 && err.message !== 'Invalid response format from server') {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchTerm, sortBy, priceRange.min, priceRange.max, retryCount]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/categories`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchFeaturedProducts = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/featured`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeaturedProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
    }
  }, []);

  // Load cart and wishlist from localStorage
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const savedWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    setCartItems(savedCart);
    setWishlistItems(savedWishlist);
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchFeaturedProducts();
  }, [fetchProducts, fetchCategories, fetchFeaturedProducts]);

  // Handler Functions
  const handleRetry = () => {
    setRetryCount(0);
    fetchProducts();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSortBy('newest');
    setPriceRange({ min: 0, max: 1000 });
  };

  // Shopping Functions
  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.product.id === product.id);
    let newCartItems;

    if (existingItem) {
      newCartItems = cartItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCartItems = [...cartItems, { product, quantity: 1 }];
    }

    setCartItems(newCartItems);
    localStorage.setItem('cart', JSON.stringify(newCartItems));
  };

  const toggleWishlist = (product) => {
    const isInWishlist = wishlistItems.some(item => item.product_id === product.id);
    let newWishlistItems;

    if (isInWishlist) {
      newWishlistItems = wishlistItems.filter(item => item.product_id !== product.id);
    } else {
      newWishlistItems = [...wishlistItems, { product_id: product.id, product }];
    }

    setWishlistItems(newWishlistItems);
    localStorage.setItem('wishlist', JSON.stringify(newWishlistItems));
  };

  const quickBuy = async (product) => {
    const token = getAuthToken();

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: product.id })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          alert('Purchase successful!');
        }
      } else {
        const errorData = await response.json();
        alert(`Purchase failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    }
  };

  // Filter + sort products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max;
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'popular':
        return (b.sales_count || 0) - (a.sales_count || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'trending':
        return (b.views || 0) - (a.views || 0);
      case 'newest':
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // Config error
  if (!process.env.REACT_APP_BACKEND_URL) {
    return (
      <div className="marketplace-page">
        <div className="marketplace-error-state">
          <h2>Configuration Error</h2>
          <p>Backend URL not configured. Set <code>REACT_APP_BACKEND_URL</code> in your .env file.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !error && products.length === 0) {
    return (
      <div className="marketplace-page marketplace-loading">
        <div className="marketplace-loading-inner">
          <div className="marketplace-spinner" />
          <h2 className="marketplace-loading-text">Loading Marketplace...</h2>
          <p className="marketplace-loading-sub">
            Connecting to: {process.env.REACT_APP_BACKEND_URL}
          </p>
        </div>
      </div>
    );
  }

  // Error state (hard fail)
  if (error && products.length === 0) {
    return (
      <div className="marketplace-page">
        <div className="marketplace-error-state">
          <h2>Unable to Load Marketplace</h2>
          <p className="marketplace-error-message">{error}</p>
          <button className="marketplace-primary-btn" onClick={handleRetry}>
            Retry
          </button>
          <button
            className="marketplace-secondary-btn"
            onClick={() => window.open(
              `${process.env.REACT_APP_BACKEND_URL}/api/public-health`,
              "_blank"
            )}
          >
            Test Backend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-page">
      {/* HEADER */}
      <header className="marketplace-header">
        <div className="marketplace-header-main">
          <div className="marketplace-header-text">
            <h1 className="marketplace-title">Browse Marketplace</h1>
            <p className="marketplace-subtext">
              {pagination
                ? `Showing ${products.length} of ${pagination.total || products.length} products`
                : `${products.length} products found`}
            </p>
          </div>

          <div className="marketplace-header-right">
            <div className={`connection-indicator ${connectionStatus}`}>
              <span className="status-dot" />
              <span>
                {connectionStatus === "connected"
                  ? "Online"
                  : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Offline"}
              </span>
            </div>

            <div
              className="cart-summary"
              onClick={() => setShowCart(!showCart)}
            >
              <span className="cart-icon">🛒</span>
              <span className="cart-count">{cartItems.length}</span>
              <span className="cart-total">
                $
                {cartItems
                  .reduce(
                    (total, item) =>
                      total + item.product.price * item.quantity,
                    0
                  )
                  .toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURED STRIP */}
      {featuredProducts.length > 0 && (
        <section className="featured-section">
          <h2 className="featured-title">Featured Drops</h2>
          <div className="featured-carousel">
            {featuredProducts.slice(0, 3).map(product => (
              <article key={product.id} className="featured-card">
                <img
                  src={product.image_url || "/placeholder-product.jpg"}
                  alt={product.name}
                  className="featured-image"
                  onError={(e) => (e.target.src = "/placeholder-product.jpg")}
                />
                <div className="featured-info">
                  <h3>{product.name}</h3>
                  <p className="featured-price">${product.price}</p>
                  <button
                    className="featured-cta"
                    onClick={() => quickBuy(product)}
                  >
                    ⚡ Quick Buy
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* SEARCH + FILTER BAR */}
      <section className="marketplace-controls">
        <div className="marketplace-search-row">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search products, artists, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                className="search-clear"
                onClick={() => setSearchTerm("")}
              >
                ✖
              </button>
            )}
          </div>

          <button
            className={
              "filter-toggle" + (showFilters ? " filter-toggle-active" : "")
            }
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label>Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  {categories && categories.length > 0 ? (
                    categories.map((category) => (
                      <option
                        key={category.id || category.slug}
                        value={category.slug}
                      >
                        {category.name}
                        {category.count ? ` (${category.count})` : ""}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="apparel">Apparel</option>
                      <option value="digital">Digital</option>
                      <option value="merch">Merch</option>
                      <option value="music">Music</option>
                    </>
                  )}
                </select>
              </div>

              <div className="filter-group">
                <label>Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="trending">Trending</option>
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>
                  Price Range: ${priceRange.min} – ${priceRange.max}
                </label>
                <div className="price-range">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange.min}
                    onChange={(e) =>
                      setPriceRange((prev) => ({
                        ...prev,
                        min: parseInt(e.target.value)
                      }))
                    }
                    className="price-slider"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange.max}
                    onChange={(e) =>
                      setPriceRange((prev) => ({
                        ...prev,
                        max: parseInt(e.target.value)
                      }))
                    }
                    className="price-slider"
                  />
                </div>
              </div>

              <div className="filter-actions">
                <button
                  className="clear-filters-btn"
                  onClick={clearFilters}
                >
                  Clear
                </button>
                <button
                  className="apply-filters-btn"
                  onClick={() => setShowFilters(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* GRID */}
      <section className="products-grid">
        {sortedProducts.length === 0 ? (
          <div className="marketplace-empty">
            <div className="empty-icon">📦</div>
            <h3>No products found</h3>
            <p>Try adjusting your search or filters.</p>
            <button
              className="marketplace-primary-btn"
              onClick={clearFilters}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          sortedProducts.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-image">
                <img
                  src={product.image_url || "/placeholder-product.jpg"}
                  alt={product.name}
                  onError={(e) =>
                    (e.target.src = "/placeholder-product.jpg")
                  }
                />

                <div className="product-badges">
                  {product.stock === 0 && (
                    <span className="badge out-of-stock">Sold Out</span>
                  )}
                  {product.is_featured && (
                    <span className="badge featured">Featured</span>
                  )}
                  {product.is_new && (
                    <span className="badge new">New</span>
                  )}
                  {product.discount_percentage > 0 && (
                    <span className="badge sale">
                      -{product.discount_percentage}%
                    </span>
                  )}
                </div>

                <div className="quick-actions">
                  <button
                    className={
                      "wishlist-btn" +
                      (wishlistItems.some(
                        (item) => item.product_id === product.id
                      )
                        ? " active"
                        : "")
                    }
                    onClick={() => toggleWishlist(product)}
                  >
                    ♥
                  </button>
                  <Link
                    to={`/marketplace/product/${product.id}`}
                    className="quick-view-btn"
                  >
                    👁
                  </Link>
                </div>
              </div>

              <div className="product-info">
                <div className="product-header">
                  <h3 className="product-name">{product.name}</h3>
                  <span className="product-category">
                    {product.category}
                  </span>
                </div>

                <p className="product-description">
                  {product.description?.substring(0, 110)}...
                </p>

                <div className="product-creator">
                  <img
                    src={product.creator_avatar || "/default-avatar.jpg"}
                    alt={product.creator_name}
                    className="creator-avatar"
                  />
                  <span>By {product.creator_name}</span>
                </div>

                <div className="product-stats">
                  <div className="rating">
                    <span className="stars">
                      {"★".repeat(Math.floor(product.rating || 0))}
                    </span>
                    <span className="rating-text">
                      ({product.review_count || 0})
                    </span>
                  </div>
                  <span className="sales-count">
                    {product.sales_count || 0} sold
                  </span>
                </div>

                <div className="product-price">
                  {product.original_price > product.price && (
                    <span className="original-price">
                      ${product.original_price.toFixed(2)}
                    </span>
                  )}
                  <span className="current-price">
                    ${product.price.toFixed(2)}
                  </span>
                </div>

                <div className="product-actions">
                  <button
                    className="btn-add-cart"
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                  >
                    Add to Cart
                  </button>
                  <button
                    className="btn-quick-buy"
                    onClick={() => quickBuy(product)}
                    disabled={product.stock === 0}
                  >
                    Quick Buy
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {/* CREATOR CTA */}
      <section className="creator-cta">
        <div className="cta-content">
          <h2>Are you a creator?</h2>
          <p>
            Launch your own store and sell merch & digital packs directly
            to your fans.
          </p>
          <Link to="/creator-signup" className="btn-creator-signup">
            Become a Seller
          </Link>
        </div>
      </section>

      {/* Soft error notification */}
      {error && products.length > 0 && (
        <div className="marketplace-toast">
          <span>Some data may be outdated: {error}</span>
          <button onClick={handleRetry}>Refresh</button>
        </div>
      )}

      {/* CART SIDEBAR */}
      {showCart && (
        <aside className="cart-sidebar">
          <div className="cart-header">
            <h3>Your Cart</h3>
            <button onClick={() => setShowCart(false)}>✖</button>
          </div>
          <div className="cart-items">
            {cartItems.length === 0 ? (
              <p className="cart-empty">Your cart is empty.</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.product.id} className="cart-item">
                  <img
                    src={item.product.image_url || "/placeholder-product.jpg"}
                    alt={item.product.name}
                  />
                  <div className="cart-item-details">
                    <h4>{item.product.name}</h4>
                    <p>
                      ${item.product.price} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {cartItems.length > 0 && (
            <div className="cart-footer">
              <div className="cart-total">
                Total: $
                {cartItems
                  .reduce(
                    (total, item) =>
                      total + item.product.price * item.quantity,
                    0
                  )
                  .toFixed(2)}
              </div>
              <button className="checkout-btn">Checkout</button>
            </div>
          )}
        </aside>
      )}

      {/* LIGHT LOADING OVERLAY WHEN REFRESHING */}
      {loading && products.length > 0 && (
        <div className="marketplace-loading-overlay">
          <div className="marketplace-spinner" />
        </div>
      )}
    </div>
  );
};

export default Marketplace;
