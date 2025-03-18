/ MerchStore.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const MerchStore = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get("/api/merch")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Merch Store</h2>
      {products.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>Price: ${product.price}</p>
        </div>
      ))}
    </div>
  );
};

export default MerchStore;