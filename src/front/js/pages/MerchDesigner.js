import React, { useState, useEffect } from "react";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken = () => localStorage.getItem("token");
const getHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

const CATEGORIES = ["All", "T-Shirts", "Hoodies", "Hats", "Bags", "Mugs", "Accessories", "Posters"];

const MerchDesigner = () => {
  const [products, setProducts] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [artworkFile, setArtworkFile] = useState(null);
  const [mockupResult, setMockupResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [step, setStep] = useState(1); // 1=pick product, 2=add artwork, 3=preview+publish
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/printful/catalog`)
      .then(r => r.json())
      .then(data => { setProducts(data.products || []); setLoadingCatalog(false); })
      .catch(() => setLoadingCatalog(false));
  }, []);

  const filteredProducts = categoryFilter === "All"
    ? products
    : products.filter(p => p.category === categoryFilter);

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setProductName(`My ${product.name}`);
    setProductPrice((product.base_price * 2.5).toFixed(2));
    setStep(2);
    setMockupResult(null);
    setError("");
  };

  const handleArtworkFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setArtworkUrl(ev.target.result);
    reader.readAsDataURL(file);
    setArtworkFile(file);
  };

  const generateMockup = async () => {
    if (!artworkUrl) { setError("Please add artwork first"); return; }
    setGenerating(true); setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/printful/mockup`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          product_id: selectedProduct.id,
          variant_ids: [],
          imageUrl: artworkUrl.startsWith("data:") ? artworkUrl : artworkUrl
        })
      });
      const data = await res.json();
      setMockupResult(data);
      setStep(3);
    } catch (e) {
      setError("Failed to generate mockup. Try again.");
    }
    setGenerating(false);
  };

  const publishProduct = async () => {
    if (!productName || !productPrice) { setError("Add a product name and price"); return; }
    setPublishing(true); setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/printful/my-products`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: productName,
          printful_product_id: selectedProduct.id,
          retail_price: parseFloat(productPrice),
          mockup_url: mockupResult?.mockup_url || mockupResult?.result?.mockups?.[0]?.mockup_url || "",
          category: selectedProduct.category,
          is_active: true
        })
      });
      if (res.ok) {
        setSuccess("✅ Product published to your Merch Store!");
        setStep(1);
        setSelectedProduct(null);
        setArtworkUrl("");
        setMockupResult(null);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to publish");
      }
    } catch (e) {
      setError("Failed to publish product");
    }
    setPublishing(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060612", color: "#fff", padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#00ffc8", margin: 0 }}>🎨 Merch Designer</h1>
          <p style={{ color: "#888", margin: "8px 0 0" }}>Design and sell custom merchandise powered by Printful</p>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {["1. Pick Product", "2. Add Artwork", "3. Publish"].map((s, i) => (
            <div key={i} style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: step === i + 1 ? "#00ffc8" : step > i + 1 ? "rgba(0,255,200,0.2)" : "rgba(255,255,255,0.05)",
              color: step === i + 1 ? "#000" : step > i + 1 ? "#00ffc8" : "#666",
              border: `1px solid ${step >= i + 1 ? "#00ffc8" : "#222"}`
            }}>{s}</div>
          ))}
        </div>

        {error && <div style={{ background: "rgba(255,50,50,0.15)", border: "1px solid #ff3366", padding: "12px 16px", borderRadius: 8, marginBottom: 16, color: "#ff8888" }}>{error}</div>}
        {success && <div style={{ background: "rgba(0,255,200,0.15)", border: "1px solid #00ffc8", padding: "12px 16px", borderRadius: 8, marginBottom: 16, color: "#00ffc8" }}>{success}</div>}

        {/* STEP 1 — Pick Product */}
        {step === 1 && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategoryFilter(c)} style={{
                  padding: "6px 14px", borderRadius: 20, border: "1px solid",
                  borderColor: categoryFilter === c ? "#00ffc8" : "#333",
                  background: categoryFilter === c ? "rgba(0,255,200,0.15)" : "transparent",
                  color: categoryFilter === c ? "#00ffc8" : "#888", cursor: "pointer", fontSize: 13
                }}>{c}</button>
              ))}
            </div>
            {loadingCatalog ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888" }}>Loading catalog...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => selectProduct(p)} style={{
                    background: "#0d0d1f", border: "1px solid #1a1a2e", borderRadius: 12,
                    padding: 16, cursor: "pointer", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#00ffc8"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1a2e"}
                  >
                    <div style={{ width: "100%", aspectRatio: "1", background: "#111", borderRadius: 8, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                      />
                      <div style={{ display: "none", alignItems: "center", justifyContent: "center", fontSize: 40 }}>👕</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>{p.category}</div>
                    <div style={{ color: "#00ffc8", fontSize: 13, fontWeight: 600 }}>Base: ${p.base_price}</div>
                    <button style={{ width: "100%", marginTop: 10, padding: "8px", background: "rgba(0,255,200,0.1)", border: "1px solid #00ffc8", color: "#00ffc8", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      Select →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* STEP 2 — Add Artwork */}
        {step === 2 && selectedProduct && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div>
              <div style={{ background: "#0d0d1f", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <h3 style={{ color: "#00ffc8", margin: "0 0 16px" }}>Selected: {selectedProduct.name}</h3>
                <div style={{ width: "100%", aspectRatio: "1", background: "#111", borderRadius: 8, overflow: "hidden" }}>
                  <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <button onClick={() => setStep(1)} style={{ marginTop: 12, background: "transparent", border: "1px solid #333", color: "#888", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                  ← Change Product
                </button>
              </div>
            </div>
            <div>
              <div style={{ background: "#0d0d1f", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20 }}>
                <h3 style={{ color: "#fff", margin: "0 0 20px" }}>Add Your Artwork</h3>
                
                {/* Upload file */}
                <div style={{ border: "2px dashed #333", borderRadius: 8, padding: 24, textAlign: "center", marginBottom: 16, cursor: "pointer" }}
                  onClick={() => document.getElementById("artwork-upload").click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setArtworkUrl(ev.target.result); r.readAsDataURL(f); } }}
                >
                  {artworkUrl && artworkUrl.startsWith("data:") ? (
                    <img src={artworkUrl} alt="artwork" style={{ maxHeight: 150, maxWidth: "100%", borderRadius: 6 }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                      <div style={{ color: "#888", fontSize: 14 }}>Click or drag to upload artwork</div>
                      <div style={{ color: "#555", fontSize: 12, marginTop: 4 }}>PNG, JPG — transparent PNG recommended</div>
                    </>
                  )}
                </div>
                <input id="artwork-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleArtworkFile} />

                <div style={{ color: "#888", fontSize: 13, textAlign: "center", marginBottom: 12 }}>— or paste URL —</div>
                <input
                  style={{ width: "100%", background: "#111", border: "1px solid #333", color: "#fff", padding: "10px 12px", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                  placeholder="https://your-artwork-url.com/image.png"
                  value={artworkUrl.startsWith("data:") ? "" : artworkUrl}
                  onChange={e => setArtworkUrl(e.target.value)}
                />

                <div style={{ marginTop: 20 }}>
                  <label style={{ display: "block", color: "#aaa", fontSize: 13, marginBottom: 6 }}>Product Name</label>
                  <input
                    style={{ width: "100%", background: "#111", border: "1px solid #333", color: "#fff", padding: "10px 12px", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                  />
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", color: "#aaa", fontSize: 13, marginBottom: 6 }}>Your Selling Price ($)</label>
                  <input
                    style={{ width: "100%", background: "#111", border: "1px solid #333", color: "#fff", padding: "10px 12px", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                    type="number" step="0.01" min={selectedProduct.base_price}
                    value={productPrice}
                    onChange={e => setProductPrice(e.target.value)}
                  />
                  {productPrice && <div style={{ color: "#00ffc8", fontSize: 12, marginTop: 4 }}>
                    Your profit: ${(parseFloat(productPrice) - selectedProduct.base_price).toFixed(2)} per sale (90% = ${((parseFloat(productPrice) - selectedProduct.base_price) * 0.9).toFixed(2)})
                  </div>}
                </div>

                <button onClick={generateMockup} disabled={generating || !artworkUrl} style={{
                  width: "100%", marginTop: 20, padding: "12px", background: artworkUrl ? "#00ffc8" : "#333",
                  color: artworkUrl ? "#000" : "#666", border: "none", borderRadius: 8, cursor: artworkUrl ? "pointer" : "not-allowed",
                  fontSize: 15, fontWeight: 700
                }}>
                  {generating ? "⏳ Generating Mockup..." : "🎨 Generate Mockup Preview"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Preview + Publish */}
        {step === 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div style={{ background: "#0d0d1f", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: "#00ffc8", margin: "0 0 16px" }}>Mockup Preview</h3>
              {mockupResult?.result?.mockups?.[0]?.mockup_url ? (
                <img src={mockupResult.result.mockups[0].mockup_url} alt="mockup" style={{ width: "100%", borderRadius: 8 }} />
              ) : (
                <div style={{ background: "#111", borderRadius: 8, padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>👕</div>
                  <div style={{ color: "#888", fontSize: 14 }}>Mockup generation may take a moment on Printful's side</div>
                  {artworkUrl && <img src={artworkUrl.startsWith("data:") ? artworkUrl : artworkUrl} alt="artwork" style={{ maxHeight: 120, marginTop: 16, borderRadius: 6 }} />}
                </div>
              )}
              <button onClick={() => setStep(2)} style={{ marginTop: 12, background: "transparent", border: "1px solid #333", color: "#888", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                ← Edit Artwork
              </button>
            </div>
            <div style={{ background: "#0d0d1f", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: "#fff", margin: "0 0 20px" }}>Publish to Your Store</h3>
              <div style={{ background: "#111", borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#888" }}>Product</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{productName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#888" }}>Base Cost</span>
                  <span style={{ color: "#fff" }}>${selectedProduct?.base_price}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#888" }}>Selling Price</span>
                  <span style={{ color: "#00ffc8", fontWeight: 700 }}>${productPrice}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #222", paddingTop: 8 }}>
                  <span style={{ color: "#888" }}>Your Earnings (90%)</span>
                  <span style={{ color: "#00ffc8", fontWeight: 700 }}>
                    ${((parseFloat(productPrice || 0) - (selectedProduct?.base_price || 0)) * 0.9).toFixed(2)}/sale
                  </span>
                </div>
              </div>
              <button onClick={publishProduct} disabled={publishing} style={{
                width: "100%", padding: "14px", background: "linear-gradient(135deg, #00ffc8, #7b61ff)",
                color: "#000", border: "none", borderRadius: 8, cursor: "pointer",
                fontSize: 16, fontWeight: 800
              }}>
                {publishing ? "⏳ Publishing..." : "🚀 Publish to Merch Store"}
              </button>
              <p style={{ color: "#555", fontSize: 12, textAlign: "center", marginTop: 12 }}>
                Product will appear in your public Merch Store immediately
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MerchDesigner;
