// MarketplaceProductList.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const MarketplaceProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/marketplace/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  return (
    <div className="product-list">
      <h1>🌟 Marketplace</h1>
      <div className="product-grid">
        {products.map((product) => (
          <div className="product-card" key={product.id}>
            <img src={product.image_url} alt={product.title} className="product-image" />
            <h3>{product.title}</h3>
            <p>{product.description}</p>
            <p>💵 ${product.price}</p>
            <p>{product.is_digital ? "Digital Product" : `In Stock: ${product.stock}`}</p>
            <Link to={`/product/${product.id}`} className="btn-view">
              View Product
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceProductList;
