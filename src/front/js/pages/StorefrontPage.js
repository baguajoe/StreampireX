import React, { useState, useEffect } from "react";
import "../../styles/StorefrontPage.css";

const StorefrontPage = () => {
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({
        title: "",
        description: "",
        price: "",
        stock: 1,
        image: null,
        isDigital: false,
        file: null
    });

    useEffect(() => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/storefront`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => res.json())
        .then(data => setProducts(data))
        .catch(err => console.error("Error fetching products:", err));
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewProduct({ ...newProduct, [name]: value });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setNewProduct({ ...newProduct, file });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        setNewProduct({ ...newProduct, image: URL.createObjectURL(file) });
    };

    const addProduct = () => {
        const formData = new FormData();
        formData.append("title", newProduct.title);
        formData.append("description", newProduct.description);
        formData.append("price", newProduct.price);
        formData.append("isDigital", newProduct.isDigital);
        if (!newProduct.isDigital) formData.append("stock", newProduct.stock || 1);
        if (newProduct.file) formData.append("productFile", newProduct.file);
        if (newProduct.image) formData.append("image", newProduct.image);

        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products/upload`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            setProducts([...products, data.product]);
            alert("Product added successfully!");
        })
        .catch(err => console.error("Error adding product:", err));
    };

    return (
        <div className="storefront-container">
            <h1>🛍️ My Storefront</h1>

            {/* Add New Product */}
            <div className="add-product-section">
                <h3>Add a New Product</h3>
                <input type="text" name="title" placeholder="Product Title" value={newProduct.title} onChange={handleInputChange} />
                <textarea name="description" placeholder="Product Description" value={newProduct.description} onChange={handleInputChange} />
                <input type="number" name="price" placeholder="Price ($)" value={newProduct.price} onChange={handleInputChange} />
                
                <label>
                    <input type="checkbox" name="isDigital" checked={newProduct.isDigital} onChange={(e) => setNewProduct({ ...newProduct, isDigital: e.target.checked })} />
                    Digital Product
                </label>

                {!newProduct.isDigital && (
                    <input
                        type="number"
                        name="stock"
                        placeholder="Stock Quantity"
                        value={newProduct.stock || ""}
                        onChange={handleInputChange}
                    />
                )}

                <input type="file" onChange={handleImageUpload} />
                {newProduct.image && <img src={newProduct.image} alt="Preview" className="product-preview" />}
                
                {newProduct.isDigital && <input type="file" onChange={handleFileUpload} />}
                <button onClick={addProduct} className="btn-primary">➕ Add Product</button>
            </div>

            {/* Product List */}
            <div className="product-list">
                <h2>🛒 Your Products</h2>
                {products.length > 0 ? (
                    products.map(product => (
                        <div key={product.id} className="product-card">
                            <img src={product.image || "/default-product.jpg"} alt={product.title} className="product-image" />
                            <h3>{product.title}</h3>
                            <p>{product.description}</p>
                            <p><strong>${product.price}</strong></p>
                            {product.isDigital ? <p>📥 Digital Download</p> : <p>📦 Physical Product</p>}
                            <button className="btn-secondary">🛒 Buy Now</button>
                        </div>
                    ))
                ) : (
                    <p>No products added yet.</p>
                )}
            </div>
        </div>
    );
};

export default StorefrontPage;
