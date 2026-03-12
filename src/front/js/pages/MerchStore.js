import React, { useEffect, useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MerchStore = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/printful/my-products`, {
          headers: {
            "Content-Type": "application/json"
          }
        });
        const data = await res.json();
        setProducts(Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Failed to load merch products.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <div className="container py-5 text-light">
      <h1 className="mb-4">Merch Store</h1>

      {loading && <p>Loading products...</p>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !products.length && (
        <div className="alert alert-secondary">
          No merch products yet.
        </div>
      )}

      <div className="row">
        {products.map((product) => (
          <div key={product.id || product.printful_product_id} className="col-md-4 mb-4">
            <div className="card bg-dark text-light h-100 border-secondary">
              {product.image_url || product.mockup_url ? (
                <img
                  src={product.image_url || product.mockup_url}
                  className="card-img-top"
                  alt={product.title || product.name}
                  style={{ objectFit: "cover", height: "280px" }}
                />
              ) : null}
              <div className="card-body">
                <h5 className="card-title">{product.title || product.name}</h5>
                <p className="card-text">{product.description || "Custom merch product"}</p>
                <p className="fw-bold">${product.price || product.retail_price || 0}</p>
                <a href="/merch-checkout" className="btn btn-primary">Buy Now</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MerchStore;
