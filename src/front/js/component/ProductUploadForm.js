import React, { useState } from "react";

const ProductUploadForm = ({ onUpload }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    is_digital: false, // Changed default to false for better UX
  });
  const [imageFile, setImageFile] = useState(null);
  const [digitalFile, setDigitalFile] = useState(null); // For actual file upload
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);

    // Create preview
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  };

  const handleDigitalFileChange = (e) => {
    setDigitalFile(e.target.files[0]);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      alert("Please enter a product title");
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert("Please enter a valid price");
      return false;
    }
    if (!formData.is_digital && (!formData.stock || parseInt(formData.stock) <= 0)) {
      alert("Please enter valid stock quantity for physical products");
      return false;
    }
    if (formData.is_digital && !digitalFile) {
      alert("Please upload a file for digital products");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      stock: "",
      is_digital: false,
    });
    setImageFile(null);
    setDigitalFile(null);
    setPreviewImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("price", parseFloat(formData.price));
    data.append("is_digital", formData.is_digital);

    // Add stock for physical products
    if (!formData.is_digital) {
      data.append("stock", parseInt(formData.stock));
    }

    // Add image if provided
    if (imageFile) {
      data.append("image", imageFile);
    }

    // Add digital file if provided
    if (digitalFile && formData.is_digital) {
      data.append("file", digitalFile);
    }

    try {
      // Updated API endpoint to match backend
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/storefront/add-product`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: data,
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ Product uploaded successfully!");
        resetForm();
        if (onUpload) onUpload(); // Refresh parent component
      } else {
        alert(`❌ Error: ${result.error || "Upload failed"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ Upload failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-form-container">
      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="form-header">
          <h2>📤 Upload New Product</h2>
          <p className="text-muted">Add a new product to your storefront</p>
        </div>

        {/* Product Title */}
        <div className="form-group">
          <label htmlFor="title">Product Title *</label>
          <input
            id="title"
            type="text"
            name="title"
            placeholder="Enter product title"
            value={formData.title}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        {/* Product Description */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Describe your product..."
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="form-control"
          />
        </div>

        {/* Price */}
        <div className="form-group">
          <label htmlFor="price">Price (USD) *</label>
          <input
            id="price"
            type="number"
            name="price"
            placeholder="0.00"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
            className="form-control"
          />
        </div>

        {/* Product Type Toggle */}
        <div className="form-group">
          <div className="checkbox-container">
            <input
              id="is_digital"
              type="checkbox"
              name="is_digital"
              checked={formData.is_digital}
              onChange={handleChange}
            />
            <label htmlFor="is_digital">
              {formData.is_digital ? "📥 Digital Product" : "📦 Physical Product"}
            </label>
          </div>
          <small className="form-text text-muted">
            {formData.is_digital
              ? "Customers will download this product after purchase"
              : "This product will be shipped to customers"
            }
          </small>
        </div>

        {/* Stock Quantity (Physical Products Only) */}
        {!formData.is_digital && (
          <div className="form-group">
            <label htmlFor="stock">Stock Quantity *</label>
            <input
              id="stock"
              type="number"
              name="stock"
              placeholder="Number of items available"
              value={formData.stock}
              onChange={handleChange}
              min="1"
              required
              className="form-control"
            />
          </div>
        )}

        {/* Product Image */}
        <div className="form-group">
          <label htmlFor="image">Product Image</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="form-control file-input"
          />
          <small className="form-text text-muted">
            Upload an image to showcase your product (JPG, PNG, GIF)
          </small>

          {/* Image Preview */}
          {previewImage && (
            <div className="image-preview">
              <img src={previewImage} alt="Preview" className="preview-img" />
            </div>
          )}
        </div>

        {/* Digital File Upload (Digital Products Only) */}
        {formData.is_digital && (
          <div className="form-group">
            <label htmlFor="digitalFile">Digital File *</label>
            <input
              id="digitalFile"
              type="file"
              onChange={handleDigitalFileChange}
              required
              className="form-control file-input"
            />
            <small className="form-text text-muted">
              Upload the file customers will download (PDF, ZIP, MP3, etc.)
            </small>
            {digitalFile && (
              <div className="file-info">
                <span className="file-name">📎 {digitalFile.name}</span>
                <span className="file-size">
                  ({(digitalFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-upload"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Uploading...
              </>
            ) : (
              <>🚀 Upload Product</>
            )}
          </button>

          {(formData.title || formData.description || formData.price) && (
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary"
              disabled={loading}
            >
              🗑️ Clear Form
            </button>
          )}
        </div>
      </form>

      {/* Form Styles */}
      <style jsx>{`
        .upload-form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .upload-form {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .form-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .form-header h2 {
          color: #1e293b;
          margin-bottom: 8px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
        }

        .form-control {
          width: 100%;
          padding: 12px 15px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .form-control:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .file-input {
          padding: 10px;
          border: 2px dashed #e2e8f0;
          background: #f8fafc;
          cursor: pointer;
        }

        .file-input:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .checkbox-container input[type="checkbox"] {
          width: auto;
          transform: scale(1.2);
        }

        .checkbox-container label {
          margin: 0;
          cursor: pointer;
        }

        .image-preview {
          margin-top: 15px;
          text-align: center;
        }

        .preview-img {
          max-width: 200px;
          max-height: 150px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .file-info {
          margin-top: 10px;
          padding: 10px;
          background: #f3f4f6;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .file-name {
          font-weight: 500;
          color: #374151;
        }

        .file-size {
          color: #6b7280;
          font-size: 12px;
        }

        .form-actions {
          display: flex;
          gap: 15px;
          margin-top: 30px;
        }

        .btn {
          padding: 12px 25px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          flex: 1;
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .form-text {
          font-size: 12px;
          margin-top: 5px;
          display: block;
        }

        .text-muted {
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .upload-form-container {
            padding: 15px;
          }

          .upload-form {
            padding: 20px;
          }

          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductUploadForm;