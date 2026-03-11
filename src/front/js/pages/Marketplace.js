import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";

export const Marketplace = () => {
    const { store, actions } = useContext(Context);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            const resp = await fetch(process.env.BACKEND_URL + "/api/products");
            if (resp.ok) setProducts(await resp.json());
        };
        fetchProducts();
    }, []);

    const renderProductCard = (item) => (
        <div className="col-md-4 mb-4" key={item.id}>
            <div className="card h-100 bg-dark text-white border-secondary">
                <img src={item.image_url || "https://placehold.co/400?text=No+Image"} className="card-img-top" alt={item.title} />
                <div className="card-body">
                    <h5 className="card-title">{item.title}</h5>
                    <p className="card-text text-muted">${item.price}</p>
                    <button onClick={() => item.category === "merch" ? window.location.href=`/merch/checkout/${item.id}` : null} className={`btn w-100 ${item.category === "merch" ? "btn-primary" : "btn-success"}`}>
                        {item.category === 'merch' ? 'Customize & Buy' : 'Download Beat'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-5">SpectraSphere Marketplace</h1>
            
            <section className="mb-5">
                <h2 className="border-bottom border-primary pb-2 mb-4">🎵 Digital Beats</h2>
                <div className="row">
                    {products.filter(p => p.category === 'beat').map(renderProductCard)}
                </div>
            </section>

            <section>
                <h2 className="border-bottom border-success pb-2 mb-4">👕 Official Merch</h2>
                <div className="row">
                    {products.filter(p => p.category === 'merch').map(renderProductCard)}
                </div>
            </section>
        </div>
    );
};
