import React, { useEffect, useState } from "react";

const ProductPage = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch(process.env.BACKEND_URL + "/api/products")
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((err) => console.error("Error fetching products:", err));
    }, []);

    const handlePurchase = (productId) => {
        fetch(process.env.BACKEND_URL + `/api/products/buy/${productId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.shipping_required) {
                    alert("Purchase Successful! Please enter your shipping details.");
                } else {
                    alert(`Purchase Successful! Download: ${data.download_link}`);
                }
            })
            .catch((err) => console.error("Error purchasing:", err));
    };

    return (
        <div className="products-page">
            <h1>🛍️ Marketplace</h1>
            <div className="product-list">
                {products.map((product) => (
                    <div key={product.id} className="product-card">
                        <img src={product.image_url} alt={product.title} />
                        <h3>{product.title}</h3>
                        <p>{product.description}</p>
                        <p>💰 Price: ${product.price}</p>
                        {product.is_digital ? (
                            <button onClick={() => handlePurchase(product.id)}>Buy & Download</button>
                        ) : (
                            <>
                                <p>📦 Stock: {product.stock}</p>
                                <button onClick={() => handlePurchase(product.id)}>Buy & Ship</button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductPage;
