// 📦 ProductUploadForm.js - componentpage.js
import React, { useState } from "react";

const ProductUploadForm = ({ onUpload }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    is_digital: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("price", formData.price);
    data.append("is_digital", formData.is_digital);
    if (!formData.is_digital) data.append("stock", formData.stock);
    if (imageFile) data.append("image", imageFile);
    if (fileUrl && formData.is_digital) data.append("file_url", fileUrl);

    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/products/upload`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: data,
      });

      const result = await res.json();
      if (res.ok) {
        alert("✅ Product uploaded!");
        onUpload();
      } else {
        alert("❌ Error: " + result.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ Upload failed");
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h2>📤 Upload Product</h2>
      <input
        type="text"
        name="title"
        placeholder="Title"
        value={formData.title}
        onChange={handleChange}
        required
      />
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
      ></textarea>
      <input
        type="number"
        name="price"
        placeholder="Price (USD)"
        value={formData.price}
        onChange={handleChange}
        required
      />
      <label>
        <input
          type="checkbox"
          name="is_digital"
          checked={formData.is_digital}
          onChange={handleChange}
        />
        Digital Product?
      </label>
      {!formData.is_digital && (
        <input
          type="number"
          name="stock"
          placeholder="Stock quantity"
          value={formData.stock}
          onChange={handleChange}
        />
      )}
      <input type="file" accept="image/*" onChange={handleImageChange} />
      {formData.is_digital && (
        <input
          type="text"
          name="file_url"
          placeholder="File URL for download"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
        />
      )}
      <button type="submit">🚀 Upload</button>
    </form>
  );
};

export default ProductUploadForm;
