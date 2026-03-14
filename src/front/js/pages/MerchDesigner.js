import React, { useState, useEffect, useRef, useCallback } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken = () => localStorage.getItem("token");
const getHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });
const CATEGORIES = ["All", "T-Shirts", "Hoodies", "Hats", "Bags", "Mugs", "Accessories", "Posters"];

// Real product mockup images using reliable sources
const PRODUCT_MOCKUPS = {
  71:  { front: "https://images.squarespace-cdn.com/content/v1/5e10bdc20efb8f0d169f85f9/1578537600000-PLACEHOLDER/tshirt-black-front.png", color: "#1a1a1a" },
  14:  { front: null, color: "#1a1a1a" },
  12:  { front: null, color: "#1a1a1a" },
  380: { front: null, color: "#1a1a1a" },
  420: { front: null, color: "#1a1a1a" },
  146: { front: null, color: "#1a1a1a" },
  362: { front: null, color: "#d4c5a9" },
  358: { front: null, color: "#ffffff" },
  200: { front: null, color: "#1a1a1a" },
  561: { front: null, color: "#ffffff" },
  160: { front: null, color: "#ffffff" },
};

// Product emoji fallbacks by category
const CATEGORY_EMOJI = {
  "T-Shirts": "👕", "Hoodies": "🧥", "Hats": "🧢",
  "Bags": "👜", "Mugs": "☕", "Accessories": "🎒", "Posters": "🖼️"
};

const PRINT_AREAS = {
  "T-Shirts":    { x: 0.28, y: 0.18, w: 0.44, h: 0.44 },
  "Hoodies":     { x: 0.28, y: 0.20, w: 0.44, h: 0.38 },
  "Hats":        { x: 0.25, y: 0.30, w: 0.50, h: 0.35 },
  "Bags":        { x: 0.20, y: 0.25, w: 0.60, h: 0.50 },
  "Mugs":        { x: 0.15, y: 0.20, w: 0.70, h: 0.55 },
  "Accessories": { x: 0.20, y: 0.20, w: 0.60, h: 0.60 },
  "Posters":     { x: 0.10, y: 0.10, w: 0.80, h: 0.80 },
};

export default function MerchDesigner() {
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState("Black");
  const [selectedSize, setSelectedSize] = useState("");
  const [artworkDataUrl, setArtworkDataUrl] = useState(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Canvas designer state
  const canvasRef = useRef(null);
  const [artPos, setArtPos] = useState({ x: 0.5, y: 0.4, scale: 0.3 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const artworkImg = useRef(null);
  const productImg = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/printful/catalog`)
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoadingCatalog(false); })
      .catch(() => setLoadingCatalog(false));
  }, []);

  const filtered = categoryFilter === "All" ? products : products.filter(p => p.category === categoryFilter);

  const selectProduct = (p) => {
    setSelectedProduct(p);
    setSelectedColor(p.colors?.[0] || "Black");
    setSelectedSize(p.sizes?.[0] || "");
    setProductName(`My ${p.name}`);
    setProductPrice((p.base_price * 2.8).toFixed(2));
    setStep(2);
    setError("");
    setArtworkDataUrl(null);
  };

  const handleArtworkUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setArtworkDataUrl(e.target.result);
      const img = new Image();
      img.onload = () => { artworkImg.current = img; };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ── Canvas rendering ──
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedProduct) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background color based on selected color
    const bgColors = {
      "Black": "#1a1a1a", "White": "#f5f5f5", "Navy": "#1a2744",
      "Red": "#8b1a1a", "Gray": "#4a4a4a", "Pink": "#d4748a",
      "Khaki": "#c8b08a", "Natural": "#d4c5a9", "Clear": "#e8e8e8"
    };
    const bg = bgColors[selectedColor] || "#1a1a1a";

    // Draw product shape
    const emoji = CATEGORY_EMOJI[selectedProduct.category] || "👕";
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(W * 0.1, H * 0.05, W * 0.8, H * 0.9, 16);
    ctx.fill();

    // Draw product image if loaded, else emoji
    if (productImg.current) {
      ctx.drawImage(productImg.current, W * 0.1, H * 0.05, W * 0.8, H * 0.9);
    } else {
      // Draw big emoji as product placeholder
      ctx.font = `${W * 0.5}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = selectedColor === "White" ? "#000" : "#fff";
      ctx.fillText(emoji, W / 2, H / 2);
      ctx.globalAlpha = 1;
    }

    // Draw print area guide (dashed)
    const pa = PRINT_AREAS[selectedProduct.category] || PRINT_AREAS["T-Shirts"];
    ctx.strokeStyle = "rgba(0,255,200,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(W * pa.x, H * pa.y, W * pa.w, H * pa.h);
    ctx.setLineDash([]);

    // Draw artwork if loaded
    if (artworkImg.current && artworkDataUrl) {
      const aw = artworkImg.current;
      const drawW = W * artPos.scale;
      const drawH = (aw.height / aw.width) * drawW;
      const drawX = W * artPos.x - drawW / 2;
      const drawY = H * artPos.y - drawH / 2;
      ctx.drawImage(aw, drawX, drawY, drawW, drawH);

      // Selection handles
      ctx.strokeStyle = "#00ffc8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(drawX - 4, drawY - 4, drawW + 8, drawH + 8);
      ctx.setLineDash([]);

      // Corner handles
      [[drawX-4, drawY-4],[drawX+drawW+4,drawY-4],[drawX-4,drawY+drawH+4],[drawX+drawW+4,drawY+drawH+4]].forEach(([hx,hy]) => {
        ctx.fillStyle = "#00ffc8";
        ctx.fillRect(hx - 4, hy - 4, 8, 8);
      });
    } else {
      // Upload prompt in print area
      ctx.fillStyle = "rgba(0,255,200,0.08)";
      ctx.fillRect(W * pa.x, H * pa.y, W * pa.w, H * pa.h);
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,255,200,0.5)";
      ctx.fillText("Upload logo/artwork", W / 2, H * (pa.y + pa.h / 2));
    }
  }, [selectedProduct, selectedColor, artworkDataUrl, artPos]);

  useEffect(() => {
    if (step === 2) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const loop = () => { drawCanvas(); animRef.current = requestAnimationFrame(loop); };
      animRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animRef.current);
    }
  }, [step, drawCanvas]);

  // Mouse drag on canvas to move artwork
  const onMouseDown = (e) => {
    if (!artworkDataUrl) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    dragStart.current = { x, y, ox: artPos.x, oy: artPos.y };
    setDragging(true);
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setArtPos(p => ({ ...p, x: dragStart.current.ox + (x - dragStart.current.x), y: dragStart.current.oy + (y - dragStart.current.y) }));
  };
  const onMouseUp = () => setDragging(false);

  // Export canvas as final mockup
  const exportMockup = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.toDataURL("image/png") : null;
  };

  const publish = async () => {
    if (!productName || !productPrice) { setError("Add a name and price"); return; }
    setPublishing(true); setError("");
    const mockupDataUrl = exportMockup();
    try {
      const res = await fetch(`${BACKEND_URL}/api/printful/my-products`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: productName,
          printful_product_id: selectedProduct.id,
          retail_price: parseFloat(productPrice),
          mockup_url: mockupDataUrl || "",
          category: selectedProduct.category,
          selected_color: selectedColor,
          selected_size: selectedSize,
          is_active: true
        })
      });
      if (res.ok) {
        setSuccess("✅ Product published to your store!");
        setTimeout(() => { setStep(1); setSelectedProduct(null); setArtworkDataUrl(null); setSuccess(""); }, 2000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to publish");
      }
    } catch (e) { setError("Failed to publish"); }
    setPublishing(false);
  };

  const S = {
    page: { minHeight: "100vh", background: "#060612", color: "#fff", padding: "24px" },
    wrap: { maxWidth: 1200, margin: "0 auto" },
    header: { marginBottom: 28 },
    h1: { fontSize: 28, fontWeight: 800, color: "#00ffc8", margin: 0 },
    sub: { color: "#888", margin: "6px 0 0", fontSize: 14 },
    steps: { display: "flex", gap: 8, marginBottom: 28 },
    step: (active, done) => ({ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: active ? "#00ffc8" : done ? "rgba(0,255,200,0.15)" : "rgba(255,255,255,0.05)", color: active ? "#000" : done ? "#00ffc8" : "#555", border: `1px solid ${active||done ? "#00ffc8" : "#222"}` }),
    cats: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
    cat: (on) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${on?"#00ffc8":"#333"}`, background: on?"rgba(0,255,200,0.15)":"transparent", color: on?"#00ffc8":"#888", cursor: "pointer", fontSize: 13 }),
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 14 },
    card: { background: "#0d0d1f", border: "1px solid #1a1a2e", borderRadius: 12, padding: 14, cursor: "pointer", transition: "border-color 0.2s" },
    img: { width: "100%", aspectRatio: "1", background: "#111", borderRadius: 8, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, overflow: "hidden" },
    design: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 },
    canvas: { background: "#0d0d1f", border: "1px solid #1a1a2e", borderRadius: 12, padding: 16 },
    panel: { background: "#0d0d1f", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20 },
    label: { display: "block", color: "#aaa", fontSize: 13, marginBottom: 6 },
    input: { width: "100%", background: "#111", border: "1px solid #333", color: "#fff", padding: "10px 12px", borderRadius: 6, fontSize: 14, boxSizing: "border-box", marginBottom: 14 },
    btn: (c,tc,dis) => ({ width: "100%", padding: "12px", background: dis?"#333":c, color: dis?"#666":tc, border: "none", borderRadius: 8, cursor: dis?"not-allowed":"pointer", fontSize: 15, fontWeight: 700, marginTop: 8 }),
    err: { background: "rgba(255,50,50,0.1)", border: "1px solid #ff3366", padding: "10px 14px", borderRadius: 8, marginBottom: 14, color: "#ff8888", fontSize: 13 },
    ok: { background: "rgba(0,255,200,0.1)", border: "1px solid #00ffc8", padding: "10px 14px", borderRadius: 8, marginBottom: 14, color: "#00ffc8", fontSize: 13 },
    colorDot: (c, sel) => ({ width: 24, height: 24, borderRadius: "50%", background: c==="White"?"#f5f5f5":c==="Navy"?"#1a2744":c==="Red"?"#8b1a1a":c==="Gray"?"#666":c==="Pink"?"#d4748a":c==="Khaki"?"#c8b08a":c==="Natural"?"#d4c5a9":c==="Clear"?"#ddd":c.toLowerCase(), cursor: "pointer", border: sel?`3px solid #00ffc8`:"3px solid transparent", boxSizing:"border-box" }),
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.header}>
          <h1 style={S.h1}>🎨 Merch Designer</h1>
          <p style={S.sub}>Design and sell custom merchandise — we handle printing & shipping. You keep 90%.</p>
        </div>

        <div style={S.steps}>
          {["1. Pick Product","2. Design It","3. Publish"].map((s,i) => (
            <div key={i} style={S.step(step===i+1, step>i+1)}>{s}</div>
          ))}
        </div>

        {error && <div style={S.err}>{error}</div>}
        {success && <div style={S.ok}>{success}</div>}

        {/* ── STEP 1: Pick Product ── */}
        {step === 1 && (
          <>
            <div style={S.cats}>
              {CATEGORIES.map(c => <button key={c} style={S.cat(categoryFilter===c)} onClick={() => setCategoryFilter(c)}>{c}</button>)}
            </div>
            {loadingCatalog ? (
              <div style={{ textAlign:"center", padding:60, color:"#888" }}>Loading products...</div>
            ) : (
              <div style={S.grid}>
                {filtered.map((p, idx) => (
                  <div key={`${p.id}-${idx}`} style={S.card}
                    onMouseEnter={e => e.currentTarget.style.borderColor="#00ffc8"}
                    onMouseLeave={e => e.currentTarget.style.borderColor="#1a1a2e"}
                    onClick={() => selectProduct(p)}
                  >
                    <div style={S.img}>
                      <span>{CATEGORY_EMOJI[p.category]||"👕"}</span>
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{p.name}</div>
                    <div style={{ color:"#888", fontSize:12, marginBottom:6 }}>{p.category}</div>
                    <div style={{ color:"#00ffc8", fontSize:13, fontWeight:600 }}>From ${p.base_price}</div>
                    <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
                      {(p.colors||[]).slice(0,5).map(c => (
                        <div key={c} title={c} style={S.colorDot(c, false)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── STEP 2: Design Canvas ── */}
        {step === 2 && selectedProduct && (
          <div style={S.design}>
            {/* Canvas */}
            <div style={S.canvas}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <h3 style={{ margin:0, color:"#00ffc8", fontSize:16 }}>{selectedProduct.name} — {selectedColor}</h3>
                <button onClick={() => setStep(1)} style={{ background:"transparent", border:"1px solid #333", color:"#888", padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:12 }}>← Back</button>
              </div>
              <canvas
                ref={canvasRef} width={500} height={500}
                style={{ width:"100%", borderRadius:8, cursor: artworkDataUrl?"move":"default", display:"block" }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              />
              {artworkDataUrl && (
                <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
                  <label style={{ color:"#aaa", fontSize:12 }}>Size:</label>
                  <input type="range" min="0.1" max="0.8" step="0.01" value={artPos.scale}
                    onChange={e => setArtPos(p => ({...p, scale: parseFloat(e.target.value)}))}
                    style={{ flex:1 }}
                  />
                  <span style={{ color:"#888", fontSize:12 }}>{Math.round(artPos.scale*100)}%</span>
                </div>
              )}
              <p style={{ color:"#555", fontSize:11, marginTop:8 }}>
                {artworkDataUrl ? "Drag your logo to position it. Use slider to resize." : "Upload your logo or artwork below to place it on the product."}
              </p>
            </div>

            {/* Controls Panel */}
            <div>
              <div style={S.panel}>
                <h3 style={{ margin:"0 0 16px", color:"#fff", fontSize:15 }}>Customize</h3>

                {/* Color picker */}
                <label style={S.label}>Color</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                  {(selectedProduct.colors||[]).map(c => (
                    <div key={c} title={c} style={S.colorDot(c, selectedColor===c)} onClick={() => setSelectedColor(c)} />
                  ))}
                </div>

                {/* Size picker */}
                {selectedProduct.sizes && selectedProduct.sizes.length > 1 && (
                  <>
                    <label style={S.label}>Size</label>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                      {selectedProduct.sizes.map(s => (
                        <button key={s} onClick={() => setSelectedSize(s)} style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${selectedSize===s?"#00ffc8":"#333"}`, background: selectedSize===s?"rgba(0,255,200,0.15)":"transparent", color: selectedSize===s?"#00ffc8":"#888", cursor:"pointer", fontSize:13 }}>{s}</button>
                      ))}
                    </div>
                  </>
                )}

                {/* Artwork upload */}
                <label style={S.label}>Your Logo / Artwork</label>
                <div
                  style={{ border:"2px dashed #333", borderRadius:8, padding:20, textAlign:"center", cursor:"pointer", marginBottom:16 }}
                  onClick={() => document.getElementById("art-upload").click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleArtworkUpload(e.dataTransfer.files[0]); }}
                >
                  {artworkDataUrl ? (
                    <div>
                      <img src={artworkDataUrl} alt="art" style={{ maxHeight:80, maxWidth:"100%", borderRadius:4 }} />
                      <div style={{ color:"#00ffc8", fontSize:12, marginTop:6 }}>✅ Artwork loaded — drag on canvas to position</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize:28, marginBottom:6 }}>🖼️</div>
                      <div style={{ color:"#888", fontSize:13 }}>Click or drag to upload</div>
                      <div style={{ color:"#555", fontSize:11, marginTop:4 }}>PNG with transparent background works best</div>
                    </>
                  )}
                </div>
                <input id="art-upload" type="file" accept="image/*" style={{ display:"none" }} onChange={e => handleArtworkUpload(e.target.files[0])} />

                <button style={S.btn("#00ffc8","#000", !artworkDataUrl)} disabled={!artworkDataUrl} onClick={() => setStep(3)}>
                  Next: Set Price & Publish →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Publish ── */}
        {step === 3 && selectedProduct && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
            {/* Preview */}
            <div style={S.panel}>
              <h3 style={{ margin:"0 0 16px", color:"#00ffc8", fontSize:15 }}>Your Design Preview</h3>
              <canvas ref={canvasRef} width={500} height={500} style={{ width:"100%", borderRadius:8, display:"block" }} />
              <button onClick={() => setStep(2)} style={{ marginTop:10, background:"transparent", border:"1px solid #333", color:"#888", padding:"6px 12px", borderRadius:6, cursor:"pointer", fontSize:12 }}>← Edit Design</button>
            </div>

            {/* Publish form */}
            <div style={S.panel}>
              <h3 style={{ margin:"0 0 20px", color:"#fff", fontSize:15 }}>Publish to Your Store</h3>

              <label style={S.label}>Product Name</label>
              <input style={S.input} value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. My Classic Logo Tee" />

              <label style={S.label}>Your Selling Price ($)</label>
              <input style={S.input} type="number" step="0.01" min={selectedProduct.base_price} value={productPrice} onChange={e => setProductPrice(e.target.value)} />

              {/* Profit breakdown */}
              {productPrice && (
                <div style={{ background:"#111", borderRadius:8, padding:14, marginBottom:16, fontSize:13 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ color:"#888" }}>Production cost</span>
                    <span>${selectedProduct.base_price}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ color:"#888" }}>Your price</span>
                    <span style={{ color:"#fff", fontWeight:600 }}>${productPrice}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #222", paddingTop:8 }}>
                    <span style={{ color:"#888" }}>Your earnings (90%)</span>
                    <span style={{ color:"#00ffc8", fontWeight:700 }}>
                      ${Math.max(0, ((parseFloat(productPrice||0) - selectedProduct.base_price) * 0.9)).toFixed(2)}/sale
                    </span>
                  </div>
                </div>
              )}

              <button style={S.btn("linear-gradient(135deg,#00ffc8,#7b61ff)","#000", publishing||!productName||!productPrice)}
                disabled={publishing||!productName||!productPrice} onClick={publish}>
                {publishing ? "⏳ Publishing..." : "🚀 Publish to Store"}
              </button>
              <p style={{ color:"#555", fontSize:11, textAlign:"center", marginTop:8 }}>
                Appears in your public store immediately. Fans can order anytime.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
