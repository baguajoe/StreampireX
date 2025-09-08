// Marketplace.js - Debug Version to Fix Backend Issues
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartUtils } from '../utils/cartUtils';
import "../../styles/marketplace.css";

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Debug: Check environment variables
        const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL;
        console.log('Backend URL:', backendUrl);
        
        setDebugInfo(prev => ({
          ...prev,
          backendUrl: backendUrl,
          attemptedUrl: `${backendUrl}/api/marketplace/products`
        }));

        if (!backendUrl) {
          throw new Error('Backend URL not configured. Please set REACT_APP_BACKEND_URL in your .env file');
        }

        const fullUrl = `${backendUrl}/api/products`;
        console.log('Fetching from:', fullUrl);
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add auth token if needed
            ...(localStorage.getItem('token') && {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            })
          }
        });

        setDebugInfo(prev => ({
          ...prev,
          responseStatus: response.status,
          responseOk: response.ok,
          responseHeaders: Object.fromEntries(response.headers.entries())
        }));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          throw new Error(`API Error ${response.status}: ${errorText || 'Failed to fetch products'}`);
        }

        const data = await response.json();
        console.log('Products received:', data);
        
        setDebugInfo(prev => ({
          ...prev,
          productsReceived: data?.length || 0,
          rawResponse: data
        }));

        // Handle different response formats
        if (Array.isArray(data)) {
          setProducts(data);
        } else if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else if (data.data && Array.isArray(data.data)) {
          setProducts(data.data);
        } else {
          console.warn('Unexpected response format:', data);
          setProducts([]);
        }

      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        setDebugInfo(prev => ({
          ...prev,
          error: err.message,
          errorType: err.constructor.name
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = (product) => {
    CartUtils.addToCart(product, 1);
    
    // Show success message
    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span>✅ Added to cart!</span>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 3000);
  };

  const handleQuickBuy = (product) => {
    handleAddToCart(product);
    navigate('/cart');
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'name':
          return (a.name || a.title || '').localeCompare(b.name || b.title || '');
        case 'newest':
        default:
          return (b.id || 0) - (a.id || 0);
      }
    });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'music', label: 'Music' },
    { value: 'artwork', label: 'Artwork' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'digital', label: 'Digital' }
  ];

  if (loading) {
    return (
      <div className="marketplace-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h2>Loading products...</h2>
          <p>Connecting to backend...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marketplace-container">
        <div className="error-state">
          <h2>❌ Unable to Load Products</h2>
          <div className="error-details">
            <p><strong>Error:</strong> {error}</p>
            
            <div className="debug-info">
              <h3>🔧 Debug Information:</h3>
              <ul>
                <li><strong>Backend URL:</strong> {debugInfo.backendUrl || 'Not set'}</li>
                <li><strong>Attempted URL:</strong> {debugInfo.attemptedUrl || 'N/A'}</li>
                <li><strong>Response Status:</strong> {debugInfo.responseStatus || 'No response'}</li>
                <li><strong>Products Received:</strong> {debugInfo.productsReceived || 0}</li>
              </ul>
            </div>

            <div className="troubleshooting">
              <h3>🛠️ Troubleshooting Steps:</h3>
              <ol>
                <li>Check if your backend server is running</li>
                <li>Verify REACT_APP_BACKEND_URL in your .env file</li>
                <li>Ensure /api/marketplace/products endpoint exists</li>
                <li>Check browser console for detailed errors</li>
                <li>Verify database has product records</li>
              </ol>
            </div>

            <button 
              className="btn-retry"
              onClick={() => window.location.reload()}
            >
              🔄 Retry
            </button>
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
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="debug-panel">
              <summary>🔧 Debug Info</summary>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="marketplace-controls">
        <div className="search-section">
          <div className="search-box">
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filter-section">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        <span className="results-count">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
        </span>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Products Available</h3>
          <p>There are currently no products in the marketplace.</p>
          {products.length === 0 ? (
            <div className="no-products-help">
              <p>This could mean:</p>
              <ul>
                <li>No products have been added to the database yet</li>
                <li>The backend API is not returning products</li>
                <li>There's a connection issue with the server</li>
              </ul>
              <Link to="/storefront" className="btn-add-products">
                Add Your First Product
              </Link>
            </div>
          ) : (
            <button 
              className="btn-reset-filters"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <img 
                  src={product.image_url || 'https://via.placeholder.com/300x300/e2e8f0/64748b?text=No+Image'} 
                  alt={product.name || product.title} 
                  className="product-image"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x300/e2e8f0/64748b?text=No+Image';
                  }}
                />
                {product.is_digital && (
                  <span className="digital-badge">📱 Digital</span>
                )}
                {!product.is_digital && product.stock <= 5 && product.stock > 0 && (
                  <span className="low-stock-badge">⚠️ Only {product.stock} left</span>
                )}
                {!product.is_digital && product.stock === 0 && (
                  <span className="out-of-stock-badge">❌ Out of Stock</span>
                )}
              </div>

              <div className="product-info">
                <h3 className="product-title">{product.name || product.title}</h3>
                <p className="product-description">{product.description}</p>
                
                <div className="product-price">
                  <span className="price">${product.price}</span>
                  {product.category && (
                    <span className="category-tag">{product.category}</span>
                  )}
                </div>

                <div className="product-actions">
                  <Link 
                    to={`/product/${product.id}`} 
                    className="btn-view-details"
                  >
                    View Details
                  </Link>
                  
                  <button 
                    className="btn-add-cart"
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.is_digital && product.stock === 0}
                  >
                    🛒 Add to Cart
                  </button>
                  
                  <button 
                    className="btn-quick-buy"
                    onClick={() => handleQuickBuy(product)}
                    disabled={!product.is_digital && product.stock === 0}
                  >
                    ⚡ Quick Buy
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;