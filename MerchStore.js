import React, { useEffect, useState, useContext } from "react";
import { Context } from "../store/appContext";
import { useParams } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL;

const TABS = ["🛍️ Shop", "🎨 Design & Sell", "📦 My Products"];

const POPULAR_PRODUCTS = [
    { id: 71,  name: "Unisex Staple T-Shirt",     category: "T-Shirts",    base_price: 10.95, emoji: "👕" },
    { id: 146, name: "Premium Pullover Hoodie",    category: "Hoodies",     base_price: 18.95, emoji: "🧥" },
    { id: 177, name: "Classic Dad Hat",            category: "Hats",        base_price: 11.95, emoji: "🧢" },
    { id: 19,  name: "White Glossy Mug",           category: "Mugs",        base_price: 6.47,  emoji: "☕" },
    { id: 384, name: "Poster (18x24)",             category: "Posters",     base_price: 8.73,  emoji: "🖼️" },
    { id: 358, name: "Tote Bag",                   category: "Accessories", base_price: 8.95,  emoji: "👜" },
    { id: 300, name: "Phone Case",                 category: "Accessories", base_price: 10.50, emoji: "📱" },
    { id: 409, name: "Fleece Blanket",             category: "Home",        base_price: 18.95, emoji: "🛋️" },
    { id: 420, name: "Embroidered Beanie",         category: "Hats",        base_price: 11.25, emoji: "🧣" },
    { id: 160, name: "Canvas Print",               category: "Wall Art",    base_price: 17.45, emoji: "🎨" },
    { id: 246, name: "Leggings",                   category: "Activewear",  base_price: 18.50, emoji: "🩳" },
    { id: 507, name: "Sticker Sheet",              category: "Stickers",    base_price: 3.25,  emoji: "✨" },
];

const ALL_CATS = ["All", ...new Set(POPULAR_PRODUCTS.map(p => p.category))];

const s = {
    wrap: { background: "#0d1117", minHeight: "100vh", padding: 24, color: "#fff", fontFamily: "JetBrains Mono, monospace" },
    hdr: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
    title: { fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 },
    sub: { color: "#888", fontSize: 13, margin: "4px 0 0" },
    cartBtn: { background: "#1f2937", border: "1px solid #333", color: "#fff", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14 },
    tabs: { display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #1f2937" },
    tab: { background: "none", border: "none", borderBottom: "2px solid transparent", color: "#888", padding: "10px 20px", cursor: "pointer", fontSize: 14 },
    tabA: { color: "#00ffc8", borderBottom: "2px solid #00ffc8" },
    filters: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
    fbtn: { background: "#1f2937", border: "1px solid #333", color: "#888", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12 },
    fbtnA: { background: "#00ffc8", color: "#000", border: "1px solid #00ffc8" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 },
    card: { background: "#161b22", borderRadius: 12, overflow: "hidden", border: "1px solid #1f2937" },
    cImg: { height: 170, background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center" },
    cInfo: { padding: 14 },
    cCat: { color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
    cName: { color: "#fff", fontSize: 13, fontWeight: 600, margin: "4px 0 6px" },
    cPrice: { color: "#00ffc8", fontSize: 17, fontWeight: 700, margin: "0 0 10px" },
    addBtn: { flex: 1, background: "#1f2937", border: "1px solid #333", color: "#fff", padding: 7, borderRadius: 6, cursor: "pointer", fontSize: 12 },
    buyBtn: { flex: 1, background: "#FF6600", border: "none", color: "#fff", padding: 7, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 },
    empty: { textAlign: "center", padding: "60px 20px" },
    pgrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 },
    pcard: { background: "#161b22", border: "1px solid #1f2937", borderRadius: 10, padding: 14, textAlign: "center", cursor: "pointer" },
    step: { background: "#161b22", borderRadius: 14, padding: 28 },
    steps: { display: "flex", justifyContent: "space-between", marginBottom: 28 },
    sdot: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 700, fontSize: 12 },
    lbl: { display: "block", color: "#888", fontSize: 12, marginBottom: 6 },
    inp: { width: "100%", background: "#0d1117", border: "1px solid #333", color: "#fff", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" },
    sel: { width: "100%", background: "#0d1117", border: "1px solid #333", color: "#fff", padding: "10px 12px", borderRadius: 8, fontSize: 13 },
    pbox: { background: "#0d1117", borderRadius: 10, padding: 18, marginBottom: 20 },
    prow: { display: "flex", justifyContent: "space-between", color: "#888", fontSize: 13, marginBottom: 6 },
    primary: { width: "100%", background: "#FF6600", border: "none", color: "#fff", padding: 13, borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 700 },
    secondary: { background: "#1f2937", border: "1px solid #333", color: "#fff", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13 },
    back: { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 },
    uploadZ: { border: "2px dashed #333", borderRadius: 12, padding: 36, textAlign: "center", marginBottom: 20 },
    cartP: { position: "fixed", right: 0, top: 0, height: "100vh", width: 300, background: "#161b22", border: "1px solid #1f2937", padding: 22, overflowY: "auto", zIndex: 1000 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
    modal: { background: "#161b22", border: "1px solid #1f2937", borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" },
    prevCard: { background: "#0d1117", borderRadius: 14, padding: 28, textAlign: "center", marginBottom: 20 },
};

// ── Main ─────────────────────────────────────────────────────────────────────
const MerchStore = () => {
    const { store } = useContext(Context);
    const { username } = useParams() || {};
    const [tab, setTab] = useState(0);
    const [shopProds, setShopProds] = useState([]);
    const [myProds, setMyProds] = useState([]);
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [shopCat, setShopCat] = useState("All");
    const [creator, setCreator] = useState(null);
    const [checkout, setCheckout] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const target = username || store.user?.username;
        if (!target) return;
        setLoading(true);
        fetch(`${API}/api/store/${target}/products`)
            .then(r => r.json())
            .then(d => { setShopProds(d.products || []); setCreator(d.creator || null); setLoading(false); })
            .catch(() => setLoading(false));
    }, [username, store.user]);

    useEffect(() => {
        if (!store.token || tab !== 2) return;
        fetch(`${API}/api/printful/my-products`, { headers: { Authorization: `Bearer ${store.token}` } })
            .then(r => r.json()).then(d => setMyProds(d.products || [])).catch(() => {});
    }, [tab, store.token]);

    const addToCart = (p) => setCart(prev => {
        const ex = prev.find(i => i.id === p.id);
        if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
        return [...prev, { ...p, qty: 1 }];
    });

    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const cats = ["All", ...new Set(shopProds.map(p => p.category))];
    const filtered = shopCat === "All" ? shopProds : shopProds.filter(p => p.category === shopCat);

    return (
        <div style={s.wrap}>
            <div style={s.hdr}>
                <div>
                    {creator
                        ? <h1 style={s.title}>{creator.name}'s Store</h1>
                        : <h1 style={s.title}>🛍️ Creator Merch Store</h1>}
                    <p style={s.sub}>Print on Demand · Worldwide Shipping · No Inventory</p>
                </div>
                <button style={s.cartBtn} onClick={() => setCartOpen(!cartOpen)}>
                    🛒 {cart.reduce((n, i) => n + i.qty, 0)} — ${cartTotal.toFixed(2)}
                </button>
            </div>

            {!username && store.token && (
                <div style={s.tabs}>
                    {TABS.map((t, i) => (
                        <button key={i} style={{ ...s.tab, ...(tab === i ? s.tabA : {}) }} onClick={() => setTab(i)}>{t}</button>
                    ))}
                </div>
            )}

            {tab === 0 && (
                <ShopTab products={filtered} cats={cats} cat={shopCat} setCat={setShopCat}
                    addToCart={addToCart} onBuy={p => setCheckout(p)} loading={loading}
                    isOwner={!username && !!store.token} onDesign={() => setTab(1)} />
            )}
            {tab === 1 && store.token && <DesignerTab token={store.token} onDone={() => setTab(2)} />}
            {tab === 2 && store.token && <MyProdsTab products={myProds} />}

            {cartOpen && <CartPanel cart={cart} setCart={setCart} total={cartTotal}
                onCheckout={() => { setCartOpen(false); setCheckout(cart[0]); }} onClose={() => setCartOpen(false)} />}
            {checkout && <CheckoutModal product={checkout} token={store.token} onClose={() => setCheckout(null)} />}
        </div>
    );
};

// ── Shop Tab ─────────────────────────────────────────────────────────────────
const ShopTab = ({ products, cats, cat, setCat, addToCart, onBuy, loading, isOwner, onDesign }) => (
    <div>
        <div style={s.filters}>
            {cats.map(c => <button key={c} style={{ ...s.fbtn, ...(cat === c ? s.fbtnA : {}) }} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        {loading ? <div style={{ textAlign: "center", color: "#888", padding: 40 }}>Loading...</div>
            : products.length === 0 ? (
                <div style={s.empty}>
                    <div style={{ fontSize: 60 }}>🛍️</div>
                    <h3 style={{ color: "#fff", marginBottom: 8 }}>No products yet</h3>
                    <p style={{ color: "#888", marginBottom: 20 }}>{isOwner ? "Design your first product to start selling!" : "No products added yet."}</p>
                    {isOwner && <button style={{ ...s.primary, width: "auto", padding: "12px 28px" }} onClick={onDesign}>🎨 Design Your First Product</button>}
                </div>
            ) : (
                <div style={s.grid}>
                    {products.map(p => (
                        <div key={p.id} style={s.card}>
                            <div style={s.cImg}>
                                {p.mockup_url ? <img src={p.mockup_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    : <span style={{ fontSize: 44 }}>👕</span>}
                            </div>
                            <div style={s.cInfo}>
                                <div style={s.cCat}>{p.category}</div>
                                <h3 style={s.cName}>{p.name}</h3>
                                <p style={s.cPrice}>${parseFloat(p.price).toFixed(2)}</p>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button style={s.addBtn} onClick={() => addToCart(p)}>+ Cart</button>
                                    <button style={s.buyBtn} onClick={() => onBuy(p)}>Buy Now</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
    </div>
);

// ── Designer Tab ──────────────────────────────────────────────────────────────
const DesignerTab = ({ token, onDone }) => {
    const [step, setStep] = useState(1);
    const [prod, setProd] = useState(null);
    const [variants, setVariants] = useState([]);
    const [variant, setVariant] = useState(null);
    const [artPreview, setArtPreview] = useState("");
    const [artUrl, setArtUrl] = useState("");
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [price, setPrice] = useState("");
    const [mockup, setMockup] = useState("");
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [msg, setMsg] = useState("");
    const [fcat, setFcat] = useState("All");

    const selectProd = async (p) => {
        setProd(p); setName(`My ${p.name}`); setPrice((p.base_price * 2.5).toFixed(2));
        try {
            const r = await fetch(`${API}/api/printful/catalog/${p.id}/variants`);
            const d = await r.json();
            setVariants(d.variants || []);
            if (d.variants?.length) setVariant(d.variants[0]);
        } catch {
            const mock = [
                { id: p.id * 100 + 1, name: `S / White` }, { id: p.id * 100 + 2, name: `M / White` },
                { id: p.id * 100 + 3, name: `L / White` }, { id: p.id * 100 + 4, name: `XL / White` },
            ];
            setVariants(mock); setVariant(mock[1]);
        }
        setStep(2);
    };

    const handleArt = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setArtPreview(ev.target.result);
        reader.readAsDataURL(file);
        setArtUrl(URL.createObjectURL(file));
        setStep(3);
    };

    const genMockup = async () => {
        setGenerating(true); setMsg("Generating preview...");
        try {
            const r = await fetch(`${API}/api/printful/mockup`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ product_id: prod.id, variant_id: variant?.id, artwork_url: artUrl })
            });
            const d = await r.json();
            if (d.task_key) {
                let attempts = 0;
                const poll = async () => {
                    attempts++;
                    const pr = await fetch(`${API}/api/printful/mockup/result/${d.task_key}`);
                    const pd = await pr.json();
                    if (pd.status === "completed" && pd.mockups?.length) {
                        setMockup(pd.mockups[0].url); setStep(4); setGenerating(false);
                    } else if (attempts < 10) { setTimeout(poll, 3000); }
                    else { setMockup(artPreview); setStep(4); setGenerating(false); }
                };
                poll();
            } else { setMockup(artPreview); setStep(4); setGenerating(false); }
        } catch { setMockup(artPreview); setStep(4); setGenerating(false); }
    };

    const save = async () => {
        if (!name || !price) { setMsg("Fill in all fields"); return; }
        setSaving(true);
        try {
            const r = await fetch(`${API}/api/printful/store/product`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name, description: desc, product_id: prod.id, variant_id: variant?.id, retail_price: parseFloat(price), artwork_url: artUrl, mockup_url: mockup || artPreview, category: prod.category })
            });
            const d = await r.json();
            if (d.product_id) { setMsg("✅ Published!"); setTimeout(onDone, 1500); }
            else setMsg(d.error || "Failed");
        } catch { setMsg("Error saving"); }
        setSaving(false);
    };

    const profit = price && prod ? Math.max(0, parseFloat(price) - prod.base_price) : 0;
    const yourCut = (profit * 0.90).toFixed(2);
    const filtered = fcat === "All" ? POPULAR_PRODUCTS : POPULAR_PRODUCTS.filter(p => p.category === fcat);

    return (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={s.steps}>
                {["Pick Product", "Upload Art", "Set Price", "Publish"].map((l, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <div style={{ ...s.sdot, background: step > i ? "#00ffc8" : step === i + 1 ? "#FF6600" : "#333" }}>
                            {step > i ? "✓" : i + 1}
                        </div>
                        <span style={{ color: step === i + 1 ? "#fff" : "#666", fontSize: 11 }}>{l}</span>
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div>
                    <h2 style={{ color: "#fff", marginBottom: 16 }}>Choose a Product</h2>
                    <div style={s.filters}>
                        {ALL_CATS.map(c => <button key={c} style={{ ...s.fbtn, ...(fcat === c ? s.fbtnA : {}) }} onClick={() => setFcat(c)}>{c}</button>)}
                    </div>
                    <div style={s.pgrid}>
                        {filtered.map(p => (
                            <div key={p.id} style={s.pcard} onClick={() => selectProd(p)}>
                                <div style={{ fontSize: 32, marginBottom: 6 }}>{p.emoji}</div>
                                <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                                <div style={{ color: "#00ffc8", fontSize: 12, marginTop: 4 }}>from ${p.base_price}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 2 && prod && (
                <div style={s.step}>
                    <button style={s.back} onClick={() => setStep(1)}>← Back</button>
                    <h2 style={{ color: "#fff", marginBottom: 4 }}>{prod.emoji} {prod.name}</h2>
                    <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Upload your artwork — PNG/JPG, min 1500×1500px</p>
                    {variants.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <label style={s.lbl}>Variant</label>
                            <select style={s.sel} value={variant?.id} onChange={e => setVariant(variants.find(v => v.id == e.target.value))}>
                                {variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div style={s.uploadZ}>
                        {artPreview ? (
                            <div>
                                <img src={artPreview} alt="" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8 }} />
                                <p style={{ color: "#00ffc8", margin: "10px 0" }}>✓ Artwork ready</p>
                                <button style={{ ...s.secondary }} onClick={() => setStep(3)}>Next: Set Price →</button>
                            </div>
                        ) : (
                            <label style={{ cursor: "pointer" }}>
                                <input type="file" accept="image/*" onChange={handleArt} style={{ display: "none" }} />
                                <div style={{ fontSize: 44, marginBottom: 10 }}>🎨</div>
                                <div style={{ color: "#fff", marginBottom: 6 }}>Click to upload artwork</div>
                                <div style={{ color: "#666", fontSize: 12 }}>PNG · JPG · Max 10MB</div>
                            </label>
                        )}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div style={s.step}>
                    <button style={s.back} onClick={() => setStep(2)}>← Back</button>
                    <h2 style={{ color: "#fff", marginBottom: 20 }}>Name & Price Your Product</h2>
                    <div style={{ marginBottom: 16 }}>
                        <label style={s.lbl}>Product Name</label>
                        <input style={s.inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Artist Hoodie" />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={s.lbl}>Description (optional)</label>
                        <textarea style={{ ...s.inp, height: 72, resize: "vertical" }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Tell fans about this..." />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={s.lbl}>Your Retail Price ($)</label>
                        <input style={s.inp} type="number" min={prod?.base_price} step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
                    </div>
                    <div style={s.pbox}>
                        <div style={s.prow}><span>Printful base cost</span><span style={{ color: "#ff6b6b" }}>-${prod?.base_price}</span></div>
                        <div style={s.prow}><span>Profit per sale</span><span style={{ color: "#fff" }}>${profit.toFixed(2)}</span></div>
                        <div style={{ ...s.prow, borderTop: "1px solid #1f2937", paddingTop: 10, marginTop: 6 }}>
                            <span style={{ fontWeight: 700 }}>Your 90% cut</span>
                            <span style={{ color: "#00ffc8", fontWeight: 700, fontSize: 17 }}>${yourCut}</span>
                        </div>
                    </div>
                    <button style={s.primary} onClick={genMockup} disabled={generating}>
                        {generating ? "Generating Preview..." : "Generate Preview →"}
                    </button>
                    {msg && <p style={{ color: "#888", marginTop: 10, fontSize: 13 }}>{msg}</p>}
                </div>
            )}

            {step === 4 && (
                <div style={s.step}>
                    <button style={s.back} onClick={() => setStep(3)}>← Back</button>
                    <h2 style={{ color: "#fff", marginBottom: 20 }}>Preview & Publish</h2>
                    <div style={s.prevCard}>
                        {mockup && <img src={mockup} alt="" style={{ width: 200, height: 200, objectFit: "cover", borderRadius: 10, marginBottom: 14 }} />}
                        <h3 style={{ color: "#fff", margin: "0 0 4px" }}>{name}</h3>
                        <p style={{ color: "#888", fontSize: 12, margin: "0 0 8px" }}>{prod?.category}</p>
                        <p style={{ color: "#00ffc8", fontSize: 20, fontWeight: 700, margin: 0 }}>${parseFloat(price).toFixed(2)}</p>
                        <p style={{ color: "#666", fontSize: 12 }}>You earn ${yourCut} per sale</p>
                    </div>
                    <button style={s.primary} onClick={save} disabled={saving}>
                        {saving ? "Publishing..." : "🚀 Publish to My Store"}
                    </button>
                    {msg && <p style={{ color: msg.includes("✅") ? "#00ffc8" : "#ff6b6b", marginTop: 10, fontSize: 13 }}>{msg}</p>}
                </div>
            )}
        </div>
    );
};

// ── My Products Tab ───────────────────────────────────────────────────────────
const MyProdsTab = ({ products }) => (
    <div>
        <h2 style={{ color: "#fff", marginBottom: 20 }}>My Products</h2>
        {products.length === 0 ? (
            <div style={s.empty}><div style={{ fontSize: 48 }}>📦</div><p style={{ color: "#888" }}>No products yet.</p></div>
        ) : (
            <div style={s.grid}>
                {products.map(p => (
                    <div key={p.id} style={s.card}>
                        <div style={s.cImg}>
                            {p.mockup_url ? <img src={p.mockup_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 44 }}>👕</span>}
                        </div>
                        <div style={s.cInfo}>
                            <div style={s.cCat}>{p.category}</div>
                            <h3 style={s.cName}>{p.name}</h3>
                            <p style={s.cPrice}>${parseFloat(p.price).toFixed(2)}</p>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
                                <span>📦 {p.total_orders} orders</span>
                                <span style={{ color: "#00ffc8" }}>💰 ${p.total_revenue}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// ── Cart Panel ────────────────────────────────────────────────────────────────
const CartPanel = ({ cart, setCart, total, onCheckout, onClose }) => (
    <div style={s.cartP}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ color: "#fff", margin: 0 }}>🛒 Cart</h3>
            <button style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 18 }} onClick={onClose}>✕</button>
        </div>
        {cart.length === 0 ? <p style={{ color: "#888" }}>Cart is empty</p> : (
            <>
                {cart.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1f2937" }}>
                        <span style={{ color: "#fff", fontSize: 13 }}>{i.name} ×{i.qty}</span>
                        <span style={{ color: "#00ffc8" }}>${(i.price * i.qty).toFixed(2)}</span>
                    </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontWeight: 700, margin: "14px 0" }}>
                    <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
                <button style={s.primary} onClick={onCheckout}>Checkout →</button>
            </>
        )}
    </div>
);

// ── Checkout Modal ────────────────────────────────────────────────────────────
const CheckoutModal = ({ product, token, onClose }) => {
    const [form, setForm] = useState({ name: "", address1: "", city: "", state_code: "", zip: "", country_code: "US" });
    const [processing, setProcessing] = useState(false);
    const [done, setDone] = useState(false);
    const [msg, setMsg] = useState("");

    const submit = async () => {
        if (!form.name || !form.address1 || !form.city || !form.zip) { setMsg("Fill in all fields"); return; }
        if (!token) { setMsg("Please log in to purchase"); return; }
        setProcessing(true);
        try {
            const r = await fetch(`${API}/api/store/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ product_id: product?.id, quantity: 1, shipping_address: form })
            });
            const d = await r.json();
            if (d.order_id) {
                await fetch(`${API}/api/store/fulfillment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ order_id: d.order_id })
                });
                setDone(true);
            } else { setMsg(d.error || "Checkout failed"); }
        } catch { setMsg("Checkout error"); }
        setProcessing(false);
    };

    return (
        <div style={s.overlay}>
            <div style={s.modal}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                    <h3 style={{ color: "#fff", margin: 0 }}>Checkout</h3>
                    <button style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 18 }} onClick={onClose}>✕</button>
                </div>
                {done ? (
                    <div style={{ textAlign: "center", padding: 28 }}>
                        <div style={{ fontSize: 56 }}>✅</div>
                        <h3 style={{ color: "#00ffc8" }}>Order Confirmed!</h3>
                        <p style={{ color: "#888" }}>Printful will print & ship your order.</p>
                        <button style={{ ...s.primary, marginTop: 16 }} onClick={onClose}>Close</button>
                    </div>
                ) : (
                    <>
                        {product && (
                            <div style={{ display: "flex", gap: 12, marginBottom: 18, padding: 12, background: "#0d1117", borderRadius: 8 }}>
                                {product.mockup_url && <img src={product.mockup_url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }} />}
                                <div><div style={{ color: "#fff", fontWeight: 600 }}>{product.name}</div><div style={{ color: "#00ffc8" }}>${parseFloat(product.price).toFixed(2)}</div></div>
                            </div>
                        )}
                        <h4 style={{ color: "#fff", marginBottom: 12 }}>Shipping Address</h4>
                        {[["name", "Full Name"], ["address1", "Street Address"], ["city", "City"], ["state_code", "State (e.g. CA)"], ["zip", "ZIP Code"]].map(([k, ph]) => (
                            <input key={k} style={{ ...s.inp, marginBottom: 10 }} placeholder={ph} value={form[k]}
                                onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontWeight: 700, margin: "14px 0" }}>
                            <span>Total</span><span style={{ color: "#00ffc8" }}>${parseFloat(product?.price || 0).toFixed(2)}</span>
                        </div>
                        <button style={s.primary} onClick={submit} disabled={processing}>
                            {processing ? "Processing..." : "Place Order →"}
                        </button>
                        {msg && <p style={{ color: "#ff6b6b", marginTop: 8, fontSize: 12 }}>{msg}</p>}
                    </>
                )}
            </div>
        </div>
    );
};

export default MerchStore;
