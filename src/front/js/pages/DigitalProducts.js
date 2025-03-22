import React, { useEffect, useState } from "react";

const DigitalProducts = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/digital-products`)
            .then(res => res.json())
            .then(setProducts)
            .catch(err => console.error("Failed to load products:", err));
    }, []);

    const download = async (id) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.BACKEND_URL}/download/${id}`, {
            headers: { Authorization: "Bearer " + token }
        });

        if (!res.ok) return alert("You don't have access to download this.");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `product-${id}`;
        a.click();
        a.remove();
    };

    return (
        <div className="container">
            <h2 className="my-4">📥 Digital Downloads</h2>
            <div className="row">
                {products.map(p => (
                    <div className="col-md-4" key={p.id}>
                        <div className="card mb-3">
                            <img src={p.image_url} className="card-img-top" alt={p.title} />
                            <div className="card-body">
                                <h5 className="card-title">{p.title}</h5>
                                <p className="card-text">{p.description}</p>
                                <button className="btn btn-primary" onClick={() => download(p.id)}>
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DigitalProducts;
