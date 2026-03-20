import React, { useState, useEffect, useRef, useCallback } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken = () => localStorage.getItem("token");
const getHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

const CATEGORIES = ["All","T-Shirts","Hoodies","Hats","Bags","Mugs","Posters","Accessories","Apparel","Jackets"];

const SIZE_ORDER = ["XXS","XS","S","M","L","XL","2XL","3XL","4XL","5XL","OS","One Size"];

const S = {
  page:    { minHeight:"100vh", background:"#06060f", color:"#e6edf3", fontFamily:"Inter,system-ui,sans-serif" },
  topbar:  { display:"flex", alignItems:"center", gap:12, padding:"16px 24px", background:"#0d1117", borderBottom:"1px solid #21262d", position:"sticky", top:0, zIndex:100 },
  title:   { fontSize:18, fontWeight:900, color:"#e6edf3", letterSpacing:-0.5, margin:0 },
  badge:   { padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, background:"rgba(0,255,200,0.1)", border:"1px solid rgba(0,255,200,0.25)", color:"#00ffc8" },
  body:    { display:"grid", gridTemplateColumns:"260px 1fr", minHeight:"calc(100vh - 61px)" },
  sidebar: { background:"#0d1117", borderRight:"1px solid #21262d", padding:"20px 16px", display:"flex", flexDirection:"column", gap:8 },
  catBtn:  (active) => ({ width:"100%", padding:"9px 14px", borderRadius:8, border:"1px solid", textAlign:"left", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s", background:active?"rgba(0,255,200,0.1)":"transparent", borderColor:active?"rgba(0,255,200,0.3)":"transparent", color:active?"#00ffc8":"#8b949e" }),
  grid:    { padding:24, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16, alignContent:"start" },
  card:    (sel) => ({ background:"#0d1117", border:`1px solid ${sel?"rgba(0,255,200,0.4)":"#21262d"}`, borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"all 0.15s", boxShadow:sel?"0 0 20px rgba(0,255,200,0.15)":"none" }),
  cardImg: { width:"100%", aspectRatio:"1", objectFit:"contain", background:"#161b22", display:"block", padding:8 },
  cardBody:{ padding:"12px 14px" },
  cardName:{ fontSize:13, fontWeight:700, color:"#e6edf3", marginBottom:4, lineHeight:1.3 },
  cardCat: { fontSize:11, color:"#4e6a82", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 },
  cardPrice:{fontSize:13, fontWeight:800, color:"#00ffc8", marginTop:6 },
  searchWrap:{ padding:"0 24px 16px", display:"flex", gap:10, alignItems:"center" },
  search:  { flex:1, background:"#161b22", border:"1px solid #21262d", borderRadius:8, color:"#e6edf3", fontFamily:"Inter,system-ui,sans-serif", fontSize:13, padding:"8px 14px", outline:"none" },
  modal:   { position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
  modalBox:{ background:"#0d1117", border:"1px solid #21262d", borderRadius:20, width:"100%", maxWidth:960, maxHeight:"90vh", overflow:"hidden", display:"grid", gridTemplateColumns:"1fr 1fr" },
  closeBtn:{ position:"absolute", top:16, right:16, background:"#161b22", border:"1px solid #21262d", borderRadius:8, color:"#8b949e", fontSize:14, padding:"6px 12px", cursor:"pointer" },
  btn:     (color="#00ffc8",bg="rgba(0,255,200,0.1)") => ({ padding:"10px 20px", borderRadius:10, border:`1px solid ${color}40`, background:bg, color, fontFamily:"Inter,system-ui,sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }),
  input:   { width:"100%", background:"#161b22", border:"1px solid #21262d", borderRadius:8, color:"#e6edf3", fontFamily:"Inter,system-ui,sans-serif", fontSize:13, padding:"8px 12px", outline:"none", boxSizing:"border-box" },
  label:   { fontSize:11, fontWeight:700, color:"#4e6a82", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:6 },
  colorDot:(code,sel)=>({ width:28, height:28, borderRadius:"50%", background:code, border:`2px solid ${sel?"#00ffc8":"#21262d"}`, cursor:"pointer", boxShadow:sel?"0 0 8px rgba(0,255,200,0.5)":"none", flexShrink:0 }),
  sizeBtn: (sel)=>({ padding:"6px 14px", borderRadius:6, border:`1px solid ${sel?"#00ffc8":"#21262d"}`, background:sel?"rgba(0,255,200,0.1)":"transparent", color:sel?"#00ffc8":"#8b949e", fontSize:12, fontWeight:700, cursor:"pointer" }),
};

const ProductCard = ({ p, onClick, selected }) => (
  <div style={S.card(selected)} onClick={() => onClick(p)}>
    {p.image
      ? <img src={p.image} alt={p.name} style={S.cardImg} onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }}/>
      : null}
    <div style={{ ...S.cardImg, display:p.image?"none":"flex", alignItems:"center", justifyContent:"center", fontSize:56 }}>
      {{"T-Shirts":"👕","Hoodies":"🧥","Hats":"🧢","Bags":"👜","Mugs":"☕","Posters":"🖼️","Accessories":"🎒","Jackets":"🧣"}[p.category]||"📦"}
    </div>
    <div style={S.cardBody}>
      <div style={S.cardName}>{p.name}</div>
      <div style={S.cardCat}>{p.category}</div>
      {p.base_price > 0 && <div style={S.cardPrice}>from ${(p.base_price*2.5).toFixed(2)}</div>}
    </div>
  </div>
);

const ProductDetailModal = ({ product, onClose, onDesign }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selColor, setSelColor] = useState(null);
  const [selSize, setSelSize] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!product) return;
    setLoading(true);
    fetch(`${BACKEND_URL}/api/printful/catalog/${product.id}`, { headers: getHeaders() })
      .then(r => r.json())
      .then(d => {
        setDetail(d);
        setSelColor(d.colors?.[0]?.name || null);
        setSelSize(d.sizes?.[1] || d.sizes?.[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [product]);

  if (!product) return null;
  const selColorObj = detail?.colors?.find(c => c.name === selColor);

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        {/* Left: Image */}
        <div style={{ background:"#161b22", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", minHeight:400 }}>
          <button style={{...S.closeBtn, position:"absolute", top:12, right:12}} onClick={onClose}>✕</button>
          {loading ? (
            <div style={{color:"#4e6a82", fontSize:13}}>Loading variants...</div>
          ) : (
            <img
              src={selColorObj?.image || detail?.image || product.image || ""}
              alt={product.name}
              style={{ maxWidth:"85%", maxHeight:380, objectFit:"contain", borderRadius:12 }}
              onError={e => e.target.style.display="none"}
            />
          )}
        </div>

        {/* Right: Options */}
        <div style={{ padding:28, overflowY:"auto", display:"flex", flexDirection:"column", gap:20 }}>
          <div>
            <div style={{fontSize:10, fontWeight:700, color:"#4e6a82", textTransform:"uppercase", letterSpacing:1, marginBottom:6}}>{product.category}</div>
            <h2 style={{fontSize:20, fontWeight:900, color:"#e6edf3", margin:0, lineHeight:1.2}}>{product.name}</h2>
            {product.base_price > 0 && (
              <div style={{fontSize:15, fontWeight:800, color:"#00ffc8", marginTop:8}}>
                from ${(product.base_price * 2.5).toFixed(2)} · Base cost: ${product.base_price.toFixed(2)}
              </div>
            )}
          </div>

          {/* Description */}
          {detail?.description && (
            <p style={{fontSize:12, color:"#8b949e", lineHeight:1.6, margin:0}}>{detail.description.substring(0,200)}...</p>
          )}

          {/* Colors */}
          {detail?.colors?.length > 0 && (
            <div>
              <label style={S.label}>Color — {selColor}</label>
              <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                {detail.colors.map(c => (
                  <div key={c.name} title={c.name}
                    style={S.colorDot(c.code || "#888", selColor === c.name)}
                    onClick={() => setSelColor(c.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {detail?.sizes?.length > 0 && (
            <div>
              <label style={S.label}>Size</label>
              <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                {detail.sizes.map(s => (
                  <button key={s} style={S.sizeBtn(selSize===s)} onClick={() => setSelSize(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          <div>
            <label style={S.label}>Quantity</label>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <button style={S.btn("#8b949e")} onClick={() => setQty(q => Math.max(1,q-1))}>−</button>
              <span style={{fontSize:16, fontWeight:800, color:"#e6edf3", minWidth:30, textAlign:"center"}}>{qty}</span>
              <button style={S.btn("#8b949e")} onClick={() => setQty(q => q+1)}>+</button>
            </div>
          </div>

          {/* Techniques */}
          {detail?.techniques?.length > 0 && (
            <div>
              <label style={S.label}>Print Techniques</label>
              <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                {detail.techniques.map(t => (
                  <span key={t.key} style={{padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, background:"rgba(255,102,0,0.08)", border:"1px solid rgba(255,102,0,0.2)", color:"#ff6600"}}>{t.display_name}</span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{display:"flex", gap:10, marginTop:"auto"}}>
            <button style={{...S.btn("#00ffc8","rgba(0,255,200,0.1)"), flex:2, fontSize:14}}
              onClick={() => onDesign({ product, detail, selColor, selSize, qty })}>
              🎨 Start Designing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MerchDesigner() {
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [designConfig, setDesignConfig] = useState(null);
  const [artworkDataUrl, setArtworkDataUrl] = useState(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [mockupUrl, setMockupUrl] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canvasRef = useRef(null);
  const [artPos, setArtPos] = useState({ x: 0.5, y: 0.4, scale: 0.3 });
  const dragging = useRef(false);
  const dragStart = useRef(null);
  const artworkImg = useRef(null);

  const fetchCatalog = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ category, search, page, per_page: 48 });
    fetch(`${BACKEND_URL}/api/printful/catalog?${params}`, { headers: getHeaders() })
      .then(r => r.json())
      .then(d => {
        setProducts(d.products || []);
        setTotalPages(d.pages || 1);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, search, page]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);
  useEffect(() => { setPage(1); }, [category, search]);

  const handleDesign = (config) => {
    setDesignConfig(config);
    setDetailOpen(false);
    setProductName(`My ${config.product.name}`);
    setProductPrice(((config.product.base_price || 12) * 2.8).toFixed(2));
    setStep(2);
  };

  // ── Canvas drawing ──
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !designConfig) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Product background
    const colorCode = designConfig.detail?.colors?.find(c => c.name === designConfig.selColor)?.code || "#1a1a1a";
    ctx.fillStyle = colorCode;
    ctx.beginPath(); ctx.roundRect(W*0.08, H*0.04, W*0.84, H*0.92, 20); ctx.fill();

    // Product image
    const pImg = new Image(); pImg.crossOrigin = "anonymous";
    const imgSrc = designConfig.detail?.colors?.find(c=>c.name===designConfig.selColor)?.image || designConfig.detail?.image || designConfig.product.image;
    if (imgSrc) {
      pImg.onload = () => {
        ctx.drawImage(pImg, W*0.08, H*0.04, W*0.84, H*0.92);
        drawArtwork(ctx, W, H);
      };
      pImg.src = imgSrc;
    } else {
      drawArtwork(ctx, W, H);
    }
  }, [designConfig, artPos, artworkDataUrl]);

  const drawArtwork = (ctx, W, H) => {
    if (!artworkImg.current) return;
    const aw = artPos.scale * W, ah = artPos.scale * W;
    ctx.drawImage(artworkImg.current, artPos.x*W - aw/2, artPos.y*H - ah/2, aw, ah);
    // Print area guides
    ctx.strokeStyle = "rgba(0,255,200,0.4)"; ctx.lineWidth = 1.5; ctx.setLineDash([5,5]);
    ctx.strokeRect(W*0.28, H*0.2, W*0.44, H*0.44);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0,255,200,0.6)"; ctx.font = "bold 11px Inter";
    ctx.fillText("Print Area", W*0.28, H*0.18);
  };

  useEffect(() => { if (step === 2) drawCanvas(); }, [drawCanvas, step]);

  const handleArtworkUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setArtworkDataUrl(e.target.result);
      const img = new Image();
      img.onload = () => { artworkImg.current = img; drawCanvas(); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = e => {
    dragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: artPos.x, oy: artPos.y };
  };
  const handleMouseMove = e => {
    if (!dragging.current || !dragStart.current) return;
    const canvas = canvasRef.current;
    const dx = (e.clientX - dragStart.current.mx) / canvas.width;
    const dy = (e.clientY - dragStart.current.my) / canvas.height;
    setArtPos(p => ({ ...p, x: dragStart.current.ox + dx, y: dragStart.current.oy + dy }));
  };
  const handleMouseUp = () => { dragging.current = false; };

  const handlePublish = async () => {
    if (!designConfig || !canvasRef.current) return;
    setPublishing(true); setError("");
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      // Upload design image first
      const blob = await (await fetch(dataUrl)).blob();
      const form = new FormData(); form.append("file", blob, "design.png");
      const upRes = await fetch(`${BACKEND_URL}/api/video-editor/upload`, { method:"POST", headers:{Authorization:`Bearer ${getToken()}`}, body:form });
      const upData = await upRes.json();
      const designUrl = upData.url || upData.file_url || dataUrl;

      // Get variant IDs
      const selVariants = designConfig.detail?.variants?.filter(v =>
        v.color === designConfig.selColor && v.size === designConfig.selSize
      ).map(v => v.id) || [];

      // Generate mockup
      if (selVariants.length > 0) {
        const mkRes = await fetch(`${BACKEND_URL}/api/printful/mockup`, {
          method:"POST", headers:getHeaders(),
          body: JSON.stringify({ product_id: designConfig.product.id, variant_ids: selVariants, image_url: designUrl })
        });
        const mkData = await mkRes.json();
        if (mkData.result?.task_key) setMockupUrl(mkData.result.task_key);
      }

      // Publish to store
      const pubRes = await fetch(`${BACKEND_URL}/api/printful/publish`, {
        method:"POST", headers:getHeaders(),
        body: JSON.stringify({
          title: productName,
          price: parseFloat(productPrice),
          mockup_url: designUrl,
          printful_id: designConfig.product.id,
        })
      });
      if (pubRes.ok) {
        setSuccess("🎉 Product published to your store!");
        setStep(3);
      } else throw new Error("Publish failed");
    } catch(e) { setError(e.message); }
    setPublishing(false);
  };

  // ── STEP 1: Catalog ──
  if (step === 1) return (
    <div style={S.page}>
      {/* Topbar */}
      <div style={S.topbar}>
        <span style={S.title}>🛍️ Merch Designer</span>
        <span style={S.badge}>{total} products</span>
        <span style={{marginLeft:"auto", fontSize:12, color:"#4e6a82"}}>Powered by Printful</span>
      </div>

      <div style={S.body}>
        {/* Sidebar */}
        <div style={S.sidebar}>
          <div style={{fontSize:11, fontWeight:800, color:"#4e6a82", textTransform:"uppercase", letterSpacing:1, marginBottom:8}}>Categories</div>
          {CATEGORIES.map(cat => (
            <button key={cat} style={S.catBtn(category===cat)} onClick={() => setCategory(cat)}>
              {{"All":"🗂️ All","T-Shirts":"👕","Hoodies":"🧥","Hats":"🧢","Bags":"👜","Mugs":"☕","Posters":"🖼️","Accessories":"🎒","Apparel":"👗","Jackets":"🧣"}[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Main */}
        <div style={{display:"flex", flexDirection:"column"}}>
          {/* Search */}
          <div style={S.searchWrap}>
            <input style={S.search} placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <button style={S.btn()} onClick={fetchCatalog}>🔄 Refresh</button>
          </div>

          {loading ? (
            <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:400, color:"#4e6a82", fontSize:14}}>
              <div>Loading {category} products from Printful...</div>
            </div>
          ) : products.length === 0 ? (
            <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:400, color:"#4e6a82", fontSize:14}}>
              No products found
            </div>
          ) : (
            <>
              <div style={S.grid}>
                {products.map(p => (
                  <ProductCard key={p.id} p={p} selected={selectedProduct?.id===p.id}
                    onClick={p => { setSelectedProduct(p); setDetailOpen(true); }}/>
                ))}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{display:"flex", justifyContent:"center", gap:8, padding:"20px 24px"}}>
                  <button style={S.btn()} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                  <span style={{padding:"8px 16px", color:"#8b949e", fontSize:13}}>Page {page} of {totalPages}</span>
                  <button style={S.btn()} disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {detailOpen && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setDetailOpen(false)}
          onDesign={handleDesign}
        />
      )}
    </div>
  );

  // ── STEP 2: Designer ──
  if (step === 2) return (
    <div style={S.page}>
      <div style={S.topbar}>
        <button style={S.btn("#8b949e")} onClick={() => setStep(1)}>← Back</button>
        <span style={S.title}>🎨 Design Studio</span>
        <span style={S.badge}>{designConfig?.product?.name}</span>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 340px", gap:0, height:"calc(100vh - 61px)"}}>
        {/* Canvas */}
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#06060f", padding:32}}>
          <canvas ref={canvasRef} width={480} height={520} style={{borderRadius:16, border:"1px solid #21262d", cursor:"move", boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}/>
          <div style={{marginTop:12, display:"flex", gap:8}}>
            <button style={S.btn()} onClick={() => setArtPos(p=>({...p,scale:Math.min(0.8,p.scale+0.05)}))}>＋ Larger</button>
            <button style={S.btn()} onClick={() => setArtPos(p=>({...p,scale:Math.max(0.05,p.scale-0.05)}))}>－ Smaller</button>
            <button style={S.btn()} onClick={() => setArtPos({x:0.5,y:0.38,scale:0.3})}>⊙ Reset</button>
          </div>
        </div>

        {/* Controls */}
        <div style={{background:"#0d1117", borderLeft:"1px solid #21262d", padding:24, display:"flex", flexDirection:"column", gap:20, overflowY:"auto"}}>
          {/* Upload artwork */}
          <div>
            <label style={S.label}>Upload Artwork</label>
            <label style={{display:"flex", alignItems:"center", justifyContent:"center", height:80, border:"2px dashed #21262d", borderRadius:10, cursor:"pointer", color:"#4e6a82", fontSize:13, transition:"all 0.15s", background:artworkDataUrl?"rgba(0,255,200,0.04)":"transparent"}}>
              <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleArtworkUpload(e.target.files[0])}/>
              {artworkDataUrl ? "✅ Artwork loaded — drag to reposition" : "🖼️ Click to upload design (PNG, SVG, JPG)"}
            </label>
          </div>

          {/* Color selector */}
          {designConfig?.detail?.colors?.length > 0 && (
            <div>
              <label style={S.label}>Color — {designConfig.selColor}</label>
              <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                {designConfig.detail.colors.map(c => (
                  <div key={c.name} title={c.name}
                    style={S.colorDot(c.code||"#888", designConfig.selColor===c.name)}
                    onClick={() => setDesignConfig(d => ({...d, selColor:c.name}))}/>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {designConfig?.detail?.sizes?.length > 0 && (
            <div>
              <label style={S.label}>Size</label>
              <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                {designConfig.detail.sizes.map(s => (
                  <button key={s} style={S.sizeBtn(designConfig.selSize===s)}
                    onClick={() => setDesignConfig(d => ({...d, selSize:s}))}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Product name */}
          <div>
            <label style={S.label}>Product Name</label>
            <input style={S.input} value={productName} onChange={e=>setProductName(e.target.value)}/>
          </div>

          {/* Price */}
          <div>
            <label style={S.label}>Your Selling Price ($)</label>
            <input style={S.input} type="number" min="0" step="0.01" value={productPrice} onChange={e=>setProductPrice(e.target.value)}/>
            {designConfig?.product?.base_price > 0 && (
              <div style={{fontSize:11, color:"#4e6a82", marginTop:4}}>
                Base cost: ${designConfig.product.base_price.toFixed(2)} · Your profit: ${(parseFloat(productPrice||0)-designConfig.product.base_price).toFixed(2)}
              </div>
            )}
          </div>

          {error && <div style={{padding:"10px 14px", background:"rgba(248,81,73,0.1)", border:"1px solid rgba(248,81,73,0.3)", borderRadius:8, color:"#f85149", fontSize:13}}>{error}</div>}

          <button style={{...S.btn("#00ffc8","rgba(0,255,200,0.1)"), fontSize:15, padding:"14px 20px", marginTop:"auto"}}
            onClick={handlePublish} disabled={publishing||!artworkDataUrl}>
            {publishing ? "Publishing..." : "🚀 Publish to Store"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 3: Success ──
  return (
    <div style={{...S.page, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:24}}>
      <div style={{fontSize:64}}>🎉</div>
      <h2 style={{color:"#e6edf3", fontSize:24, fontWeight:900}}>Product Published!</h2>
      <p style={{color:"#8b949e", fontSize:14}}>{success}</p>
      <div style={{display:"flex", gap:12}}>
        <button style={S.btn()} onClick={() => { setStep(1); setSuccess(""); setArtworkDataUrl(null); setDesignConfig(null); }}>
          🛍️ Design Another
        </button>
        <button style={S.btn("#ff6600","rgba(255,102,0,0.1)")} onClick={() => window.location.href="/merch-store"}>
          🏪 View Store
        </button>
      </div>
    </div>
  );
}
