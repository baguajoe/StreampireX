// MarketplaceFinalization.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/marketplace/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Error fetching products:', err));
  }, []);

  const handleCheckout = async (productId) => {
    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/marketplace/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem("token")
        },
        body: JSON.stringify({ product_id: productId })
      });

      const data = await res.json();
      if (res.ok) {
        window.location.href = data.checkout_url;
      } else {
        alert("Checkout Error: " + data.error);
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  return (
    <div className="marketplace-container">
      <h1>🛍 Artist Merch Store</h1>
      <div className="product-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <img src={product.image_url} alt={product.name} className="product-image" />
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p><strong>${product.price}</strong></p>
            <button onClick={() => handleCheckout(product.id)}>
              {product.is_digital ? 'Download Now' : 'Buy Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;