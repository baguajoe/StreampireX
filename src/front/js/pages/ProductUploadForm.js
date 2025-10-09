import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const ProductUploadForm = ({ onUpload, editMode = false }) => {
    const navigate = useNavigate();
    const { productId } = useParams();
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [existingProduct, setExistingProduct] = useState(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        stock: "",
        category: "",
        tags: "",
        isDigital: false,
        isActive: true
    });

    const [files, setFiles] = useState({
        image: null,
        productFile: null
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (editMode && productId) {
            fetchProductForEdit();
        }
    }, [editMode, productId]);

    const fetchProductForEdit = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products/${productId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const product = await response.json();
                setExistingProduct(product);
                setFormData({
                    title: product.title || "",
                    description: product.description || "",
                    price: product.price || "",
                    stock: product.stock || "",
                    category: product.category || "",
                    tags: product.tags || "",
                    isDigital: product.is_digital || false,
                    isActive: product.is_active !== false
                });
                setImagePreview(product.image_url);
            } else {
                throw new Error("Product not found");
            }
        } catch (err) {
            console.error("Error fetching product:", err);
            alert("Failed to load product for editing");
            navigate("/storefront");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }
    };

    const handleFileChange = (e) => {
        const { name, files: fileList } = e.target;
        const file = fileList[0];

        if (file) {
            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                alert("File size must be less than 10MB");
                return;
            }

            setFiles(prev => ({
                ...prev,
                [name]: file
            }));

            // Preview image
            if (name === "image" && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => setImagePreview(e.target.result);
                reader.readAsDataURL(file);
            }
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = "Product title is required";
        }

        if (!formData.description.trim()) {
            newErrors.description = "Product description is required";
        }

        if (!formData.price || parseFloat(formData.price) <= 0) {
            newErrors.price = "Valid price is required";
        }

        if (!formData.isDigital && (!formData.stock || parseInt(formData.stock) < 0)) {
            newErrors.stock = "Stock quantity is required for physical products";
        }

        if (!editMode && !files.image) {
            newErrors.image = "Product image is required";
        }

        if (formData.isDigital && !editMode && !files.productFile) {
            newErrors.productFile = "Digital file is required for digital products";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            const submitData = new FormData();
            submitData.append("title", formData.title);
            submitData.append("description", formData.description);
            submitData.append("price", formData.price);
            submitData.append("category", formData.category);
            submitData.append("tags", formData.tags);
            submitData.append("isDigital", formData.isDigital);
            submitData.append("isActive", formData.isActive);

            if (!formData.isDigital) {
                submitData.append("stock", formData.stock);
            }

            if (files.image) {
                submitData.append("image", files.image);
            }

            if (files.productFile) {
                submitData.append("file", files.productFile);
            }

            const url = editMode
                ? `${process.env.REACT_APP_BACKEND_URL}/api/products/${productId}`
                : `${process.env.REACT_APP_BACKEND_URL}/api/storefront/add-product`;

            const method = editMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: submitData
            });

            if (response.ok) {
                const data = await response.json();

                if (editMode) {
                    alert("Product updated successfully!");
                    navigate("/storefront");
                } else {
                    alert("Product added successfully!");

                    // Reset form
                    setFormData({
                        title: "",
                        description: "",
                        price: "",
                        stock: "",
                        category: "",
                        tags: "",
                        isDigital: false,
                        isActive: true
                    });
                    setFiles({ image: null, productFile: null });
                    setImagePreview(null);

                    // Call callback if provided
                    if (onUpload) {
                        onUpload(data);
                    }
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || "Upload failed");
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert(`${editMode ? "Update" : "Upload"} failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (editMode) {
            navigate("/storefront");
        } else {
            // Reset form
            setFormData({
                title: "",
                description: "",
                price: "",
                stock: "",
                category: "",
                tags: "",
                isDigital: false,
                isActive: true
            });
            setFiles({ image: null, productFile: null });
            setImagePreview(null);
            setErrors({});
        }
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card">
                        <div className="card-header">
                            <h4 className="mb-0">
                                {editMode ? "✏️ Edit Product" : "➕ Add New Product"}
                            </h4>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                {/* Product Type Selection */}
                                <div className="row mb-4">
                                    <div className="col-12">
                                        <label className="form-label fw-bold">Product Type *</label>
                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="isDigital"
                                                value={false}
                                                checked={!formData.isDigital}
                                                onChange={(e) => setFormData(prev => ({ ...prev, isDigital: false }))}
                                                disabled={editMode}
                                            />
                                            <label className="form-check-label">
                                                📦 Physical Product
                                            </label>
                                        </div>
                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="isDigital"
                                                value={true}
                                                checked={formData.isDigital}
                                                onChange={(e) => setFormData(prev => ({ ...prev, isDigital: true }))}
                                                disabled={editMode}
                                            />
                                            <label className="form-check-label">
                                                📥 Digital Product
                                            </label>
                                        </div>
                                        {editMode && (
                                            <small className="text-muted">Product type cannot be changed after creation</small>
                                        )}
                                    </div>
                                </div>

                                {/* Basic Information */}
                                <div className="row mb-3">
                                    <div className="col-md-8">
                                        <label htmlFor="title" className="form-label fw-bold">Product Title *</label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.title ? "is-invalid" : ""}`}
                                            id="title"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Enter a catchy product title..."
                                            maxLength="100"
                                        />
                                        {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                                    </div>
                                    <div className="col-md-4">
                                        <label htmlFor="category" className="form-label fw-bold">Category</label>
                                        <select
                                            className="form-select"
                                            id="category"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select Category</option>
                                            <option value="music">🎵 Music</option>
                                            <option value="art">🎨 Art</option>
                                            <option value="digital">💻 Digital</option>
                                            <option value="merchandise">👕 Merchandise</option>
                                            <option value="books">📚 Books</option>
                                            <option value="courses">🎓 Courses</option>
                                            <option value="other">🔧 Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="description" className="form-label fw-bold">Description *</label>
                                    <textarea
                                        className={`form-control ${errors.description ? "is-invalid" : ""}`}
                                        id="description"
                                        name="description"
                                        rows="4"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Describe your product in detail..."
                                        maxLength="1000"
                                    />
                                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                                    <div className="form-text">{formData.description.length}/1000 characters</div>
                                </div>

                                {/* Pricing and Stock */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label htmlFor="price" className="form-label fw-bold">Price (USD) *</label>
                                        <div className="input-group">
                                            <span className="input-group-text">$</span>
                                            <input
                                                type="number"
                                                className={`form-control ${errors.price ? "is-invalid" : ""}`}
                                                id="price"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                min="0.01"
                                                step="0.01"
                                            />
                                            {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                                        </div>
                                    </div>

                                    {!formData.isDigital && (
                                        <div className="col-md-6">
                                            <label htmlFor="stock" className="form-label fw-bold">Stock Quantity *</label>
                                            <input
                                                type="number"
                                                className={`form-control ${errors.stock ? "is-invalid" : ""}`}
                                                id="stock"
                                                name="stock"
                                                value={formData.stock}
                                                onChange={handleInputChange}
                                                placeholder="0"
                                                min="0"
                                            />
                                            {errors.stock && <div className="invalid-feedback">{errors.stock}</div>}
                                        </div>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="tags" className="form-label fw-bold">Tags</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="tags"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleInputChange}
                                        placeholder="music, hip-hop, beat, instrumental (comma separated)"
                                    />
                                    <div className="form-text">Add tags to help customers find your product</div>
                                </div>

                                {/* File Uploads */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label htmlFor="image" className="form-label fw-bold">
                                            Product Image {!editMode && "*"}
                                        </label>
                                        <input
                                            type="file"
                                            className={`form-control ${errors.image ? "is-invalid" : ""}`}
                                            id="image"
                                            name="image"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        {errors.image && <div className="invalid-feedback">{errors.image}</div>}
                                        <div className="form-text">JPG, PNG, or GIF (max 10MB)</div>

                                        {/* Image Preview */}
                                        {imagePreview && (
                                            <div className="mt-2">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="img-thumbnail"
                                                    style={{ maxHeight: "150px" }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {formData.isDigital && (
                                        <div className="col-md-6">
                                            <label htmlFor="productFile" className="form-label fw-bold">
                                                Digital File {!editMode && "*"}
                                            </label>
                                            <input
                                                type="file"
                                                className={`form-control ${errors.productFile ? "is-invalid" : ""}`}
                                                id="productFile"
                                                name="productFile"
                                                onChange={handleFileChange}
                                            />
                                            {errors.productFile && <div className="invalid-feedback">{errors.productFile}</div>}
                                            <div className="form-text">
                                                {existingProduct?.file_url ? "Upload new file to replace existing" : "Any file type (max 10MB)"}
                                            </div>

                                            {existingProduct?.file_url && !files.productFile && (
                                                <div className="mt-2">
                                                    <small className="text-success">✅ Current file uploaded</small>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Product Status */}
                                <div className="mb-4">
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isActive"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                        />
                                        <label className="form-check-label" htmlFor="isActive">
                                            <strong>Active Product</strong>
                                            <div className="form-text">Uncheck to save as draft (won't be visible to customers)</div>
                                        </label>
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={handleCancel}
                                        disabled={loading}
                                    >
                                        ❌ Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                {editMode ? "Updating..." : "Uploading..."}
                                            </>
                                        ) : (
                                            <>
                                                {editMode ? "💾 Update Product" : "🚀 Add Product"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Help Section */}
                    <div className="card mt-4">
                        <div className="card-body">
                            <h6 className="card-title">💡 Tips for Better Sales</h6>
                            <div className="row">
                                <div className="col-md-6">
                                    <ul className="list-unstyled">
                                        <li>✅ Use high-quality images</li>
                                        <li>✅ Write detailed descriptions</li>
                                        <li>✅ Price competitively</li>
                                    </ul>
                                </div>
                                <div className="col-md-6">
                                    <ul className="list-unstyled">
                                        <li>✅ Add relevant tags</li>
                                        <li>✅ Choose the right category</li>
                                        <li>✅ Keep stock updated</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductUploadForm;