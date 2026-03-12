import React, { useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MerchDesigner = () => {
  const [productId, setProductId] = useState("");
  const [variantIds, setVariantIds] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mockup, setMockup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateMockup = async () => {
    setLoading(true);
    setError("");
    setMockup(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/printful/mockup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          product_id: Number(productId),
          variant_ids: variantIds.split(",").map(v => Number(v.trim())).filter(Boolean),
          imageUrl
        })
      });

      const data = await res.json();
      setMockup(data);
    } catch (err) {
      setError("Failed to generate mockup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 text-light">
      <h1 className="mb-4">Merch Designer</h1>

      <div className="card bg-dark text-light border-secondary p-4">
        <div className="mb-3">
          <label className="form-label">Printful Product ID</label>
          <input
            className="form-control"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="e.g. 71"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Variant IDs (comma-separated)</label>
          <input
            className="form-control"
            value={variantIds}
            onChange={(e) => setVariantIds(e.target.value)}
            placeholder="e.g. 4011,4012"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Artwork URL</label>
          <input
            className="form-control"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <button className="btn btn-success" onClick={generateMockup} disabled={loading}>
          {loading ? "Generating..." : "Generate Mockup"}
        </button>

        {error && <div className="alert alert-danger mt-3">{error}</div>}

        {mockup && (
          <pre className="mt-4 p-3 bg-black text-info" style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(mockup, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

export default MerchDesigner;
