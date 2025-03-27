// 📦 Marketplace.js - page.js
import React, { useEffect, useState } from 'react';
import MarketplaceProductList from '../component/MarketplaceProductList';
import ProductUploadForm from '../component/ProductUploadForm';
// import '../../styles/Marketplace.css';

const Marketplace = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/marketplace/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error('Error loading products:', err));
  }, []);

  return (
    <div className="marketplace-container">
      <h1>🛍 Marketplace</h1>

      {/* 🔼 Product Upload Form for Creators */}
      <ProductUploadForm onUpload={() => window.location.reload()} />

      {/* 🛒 Product Listings */}
      <MarketplaceProductList products={products} />
    </div>
  );
};

export default Marketplace;