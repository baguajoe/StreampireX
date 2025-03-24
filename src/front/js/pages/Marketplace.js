import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/marketplace.css"; // You can style it as you prefer

const MarketplacePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch products for radio stations, podcast creators, and artists
  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.BACKEND_URL}/api/marketplace/products`)
      .then((response) => response.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Error fetching products: " + err.message);
        setLoading(false);
      });
  }, []);

  // Render marketplace items
  if (loading) return <p>Loading marketplace...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="marketplace-container">
      <h1>Marketplace</h1>
      <p>Browse exclusive merchandise from artists, radio stations, and podcast creators.</p>

      <div className="marketplace-items">
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product.id} className="marketplace-item">
              <img src={product.image_url} alt={product.title} className="product-image" />
              <h4>{product.title}</h4>
              <p>{product.description}</p>
              <p className="price">${product.price}</p>
              <Link to={`/store/${product.artist_id}`} className="btn btn-primary">
                View Store
              </Link>
            </div>
          ))
        ) : (
          <p>No merchandise available.</p>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
