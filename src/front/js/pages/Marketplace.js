// src/front/js/pages/Marketplace.js - Enhanced with comprehensive error handling
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartUtils } from '../utils/cartUtils';
import { ErrorHandler, AuthErrorHandler } from '../utils/errorUtils';
import "../../styles/marketplace.css";

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const navigate = useNavigate();

  // Environment validation
  const [envConfig, setEnvConfig] = useState(null);

  useEffect(() => {
    try {
      const config = ErrorHandler.validateEnvironment();
      setEnvConfig(config);
    } catch (error) {
      setError(`Configuration Error: ${error.message}`);
      setLoading(false);
      return;
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!envConfig) return;

    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      const url = `${envConfig.backendUrl}/api/marketplace/products`;
      
      const data = await ErrorHandler.withRetry(
        async () => {
          return await ErrorHandler.fetchWithErrorHandling(url, {
            headers: {
              ...AuthErrorHandler.getAuthHeaders()
            }
          });
        },
        3, // Max retries
        1000 // Initial delay
      );

      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Invalid products data received from server');
      }

      setProducts(data.products);
      setConnectionStatus('connected');
      setRetryCount(0);

    } catch (error) {
      console.error('❌ Marketplace fetch error:', error);
      
      // Handle auth errors
      if (AuthErrorHandler.handleAuthError(error, navigate)) {
        return;
      }

      setError(error.message);
      setConnectionStatus('error');
      
      // Auto-retry logic for network errors
      if (error.message.includes('Network') && retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchProducts();
        }, 5000 * (retryCount + 1)); // Increasing delay
      }
    } finally {
      setLoading(false);
    }
  }, [envConfig, navigate, retryCount]);

  useEffect(() => {
    if (envConfig) {
      fetchProducts();
    }
  }, [fetchProducts, envConfig]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    fetchProducts();
  }, [fetchProducts]);

  const addToCart = useCallback(async (product) => {
    try {
      await CartUtils.addToCart(product);
      // Show success feedback
    } catch (error) {
      console.error('Failed to add to cart:', error);
      setError(`Failed to add ${product.name} to cart: ${error.message}`);
    }
  }, []);

  // Filter and sort products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'popular':
        return (b.sales_count || 0) - (a.sales_count || 0);
      default: // newest
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // Environment configuration error
  if (!envConfig && error) {
    return (
      <div className="marketplace-container">
        <div className="error-state">
          <h2>⚙️ Configuration Error</h2>
          <div className="error-details">
            <p>{error}</p>
            <div className="troubleshooting">
              <h3>Setup Instructions:</h3>
              <ol>
                <li>Create a <code>.env</code> file in your project root</li>
                <li>Add: <code>REACT_APP_BACKEND_URL=http://localhost:3001</code></li>
                <li>Restart your development server</li>
                <li>Ensure your backend is running on the specified port</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !error) {
    return (
      <div className="marketplace-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h2>Loading Marketplace...</h2>
          <p>Status: {connectionStatus}</p>
          {retryCount > 0 && <p>Retry attempt: {retryCount}/3</p>}
        </div>
      </div>
    );
  }

  // Error state with comprehensive troubleshooting
  if (error) {
    return (
      <div className="marketplace-container">
        <div className="error-state">
          <h2>❌ Unable to Load Marketplace</h2>
          <div className="error-details">
            <p><strong>Error:</strong> {error}</p>
            
            <div className="debug-info">
              <h3>🔧 Connection Status:</h3>
              <ul>
                <li><strong>Status:</strong> {connectionStatus}</li>
                <li><strong>Backend URL:</strong> {envConfig?.backendUrl || 'Not configured'}</li>
                <li><strong>Retry Count:</strong> {retryCount}/3</li>
                <li><strong>Environment:</strong> {envConfig?.isProduction ? 'Production' : 'Development'}</li>
              </ul>
            </div>

            <div className="troubleshooting">
              <h3>🛠️ Troubleshooting Steps:</h3>
              <ol>
                <li>Check if your backend server is running on {envConfig?.backendUrl}</li>
                <li>Verify your authentication token is valid</li>
                <li>Check browser console for detailed errors</li>
                <li>Ensure database connection is working</li>
                <li>Verify the marketplace API endpoint exists</li>
              </ol>
            </div>

            <div className="action-buttons">
              <button className="retry-btn" onClick={handleRetry}>
                🔄 Retry Now
              </button>
              <button 
                className="test-btn" 
                onClick={() => window.open(envConfig?.backendUrl + '/api/health', '_blank')}
              >
                🧪 Test Backend
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-container">
      {/* Header Section */}
      <div className="marketplace-header">
        <div className="header-content">
          <h1>🛍️ Artist Merch Store</h1>
          <p>Discover exclusive merchandise and digital content from your favorite creators</p>
          
          {/* Connection Status Indicator */}
          <div className={`connection-indicator ${connectionStatus}`}>
            <span className="status-dot"></span>
            <span>{connectionStatus === 'connected' ? 'Online' : connectionStatus}</span>
          </div>

          {/* Cart Summary */}
          <div className="cart-summary" onClick={() => setShowCart(!showCart)}>
            <span className="cart-icon">🛒</span>
            <span className="cart-count">{cartItems.length}</span>
            <span className="cart-total">
              ${cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Featured Products Banner */}
      {featuredProducts.length > 0 && (
        <div className="featured-section">
          <h2>⭐ Featured Products</h2>
          <div className="featured-carousel">
            {featuredProducts.slice(0, 3).map(product => (
              <div key={product.id} className="featured-card">
                <img 
                  src={product.image_url || '/placeholder-product.jpg'} 
                  alt={product.name}
                  onError={(e) => e.target.src = '/placeholder-product.jpg'}
                />
                <div className="featured-info">
                  <h3>{product.name}</h3>
                  <p className="featured-price">${product.price}</p>
                  <button 
                    className="featured-cta"
                    onClick={() => quickBuy(product)}
                  >
                    Quick Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="marketplace-controls">
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search products, artists, categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button className="search-btn">🔍</button>
          </div>
          
          <button 
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔧 Filters {showFilters ? '▲' : '▼'}
          </button>
        </div>
        
        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label>Category:</label>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>
                      {category.name} ({category.count})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Sort by:</label>
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
                <label>Price Range: ${priceRange.min} - ${priceRange.max}</label>
                <div className="price-range">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                    className="price-slider"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                    className="price-slider"
                  />
                </div>
              </div>
              
              <div className="filter-actions">
                <button className="clear-filters-btn" onClick={clearFilters}>
                  Clear All
                </button>
                <button className="apply-filters-btn" onClick={() => setShowFilters(false)}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Results Summary */}
        <div className="results-summary">
          <span>
            {pagination ? 
              `Showing ${products.length} of ${pagination.total} products` :
              `${products.length} products found`
            }
          </span>
          {(searchTerm || categoryFilter !== 'all') && (
            <button className="clear-search" onClick={clearFilters}>
              ✕ Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <h3>No products found</h3>
            <p>Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="reset-filters-btn">
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  <img 
                    src={product.image_url || '/placeholder-product.jpg'} 
                    alt={product.name}
                    onError={(e) => {
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                  
                  {/* Product Badges */}
                  <div className="product-badges">
                    {product.stock === 0 && <span className="badge out-of-stock">Out of Stock</span>}
                    {product.is_featured && <span className="badge featured">Featured</span>}
                    {product.is_new && <span className="badge new">New</span>}
                    {product.discount_percentage > 0 && (
                      <span className="badge sale">-{product.discount_percentage}%</span>
                    )}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="quick-actions">
                    <button 
                      className={`wishlist-btn ${wishlistItems.some(item => item.product_id === product.id) ? 'active' : ''}`}
                      onClick={() => toggleWishlist(product)}
                      title="Add to Wishlist"
                    >
                      ❤️
                    </button>
                    <button 
                      className="quick-view-btn"
                      onClick={() => navigate(`/marketplace/product/${product.id}`)}
                      title="Quick View"
                    >
                      👁️
                    </button>
                  </div>
                </div>
                
                <div className="product-info">
                  <div className="product-category">{product.category}</div>
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  
                  {/* Artist Info */}
                  <div className="artist-info">
                    <img 
                      src={product.artist?.avatar_url || '/default-avatar.jpg'} 
                      alt={product.artist?.name}
                      className="artist-avatar"
                    />
                    <span className="artist-name">by {product.artist?.name}</span>
                  </div>
                  
                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="product-rating">
                      <span className="stars">{'⭐'.repeat(Math.floor(product.rating))}</span>
                      <span className="rating-value">({product.rating})</span>
                      <span className="review-count">{product.review_count} reviews</span>
                    </div>
                  )}
                  
                  {/* Price */}
                  <div className="product-pricing">
                    {product.discount_percentage > 0 ? (
                      <>
                        <span className="original-price">${product.original_price}</span>
                        <span className="sale-price">${product.price}</span>
                      </>
                    ) : (
                      <span className="product-price">${product.price}</span>
                    )}
                  </div>
                  
                  {/* Stock Info */}
                  {!product.is_digital && (
                    <div className="stock-info">
                      {product.stock > 0 ? (
                        <span className="in-stock">
                          {product.stock <= 5 ? `Only ${product.stock} left!` : 'In Stock'}
                        </span>
                      ) : (
                        <span className="out-of-stock">Out of Stock</span>
                      )}
                    </div>
                  )}
                  
                  <div className="product-actions">
                    <Link 
                      to={`/marketplace/product/${product.id}`} 
                      className="view-details-btn"
                    >
                      View Details
                    </Link>
                    
                    <div className="action-buttons">
                      <button 
                        className="add-to-cart-btn"
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                      
                      <button 
                        className="quick-buy-btn"
                        onClick={() => quickBuy(product)}
                        disabled={product.stock === 0}
                      >
                        Quick Buy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Load More Button */}
            {pagination && pagination.has_next && (
              <div className="load-more-section">
                <button 
                  className="load-more-btn"
                  onClick={loadMoreProducts}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <div className="cart-sidebar">
          <div className="cart-header">
            <h3>🛒 Shopping Cart ({cartItems.length})</h3>
            <button onClick={() => setShowCart(false)}>✕</button>
          </div>
          
          <div className="cart-items">
            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <p>Your cart is empty</p>
                <button onClick={() => setShowCart(false)}>Continue Shopping</button>
              </div>
            ) : (
              <>
                {cartItems.map(item => (
                  <div key={item.product_id} className="cart-item">
                    <img 
                      src={item.product.image_url || '/placeholder-product.jpg'} 
                      alt={item.product.name}
                    />
                    <div className="cart-item-info">
                      <h4>{item.product.name}</h4>
                      <div className="cart-item-price">
                        ${item.product.price} × {item.quantity}
                      </div>
                    </div>
                    <div className="cart-item-actions">
                      <button onClick={() => {/* Remove from cart */}}>✕</button>
                    </div>
                  </div>
                ))}
                
                <div className="cart-footer">
                  <div className="cart-total">
                    Total: ${cartItems.reduce((total, item) => 
                      total + (item.product.price * item.quantity), 0
                    ).toFixed(2)}
                  </div>
                  <button 
                    className="checkout-btn"
                    onClick={() => navigate('/checkout')}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Categories Quick Links */}
      <div className="categories-section">
        <h2>🏷️ Shop by Category</h2>
        <div className="categories-grid">
          {categories.map(category => (
            <div 
              key={category.id} 
              className="category-card"
              onClick={() => setCategoryFilter(category.slug)}
            >
              <div className="category-icon">{category.icon}</div>
              <h3>{category.name}</h3>
              <span className="category-count">{category.count} items</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;