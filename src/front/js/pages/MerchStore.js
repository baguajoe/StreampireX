import React, { useEffect, useState } from "react";
import axios from "axios";
import "./MerchStore.css"; 

const MerchStore = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get("/api/merch").then(response => setProducts(response.data));
  }, []);

  return (
    <div className="merch-store">
      <h1>Merch Store</h1>
      <div className="product-list">
        {products.map((product) => (
          <div key={product.id} className="product">
            <img src={product.image_url} alt={product.name} />
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <button>Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MerchStore;
