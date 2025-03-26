import React, { useState } from "react";

const ArtistUploadForm = () => {
    const [formData, setFormData] = useState({
        title: "",
        artistName: "",
        genre: "",
        price: "",
        file: null,
        licenseProvider: "",
        licenseId: "",
        licensingPrice: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleFileChange = (e) => {
        setFormData((prevData) => ({
            ...prevData,
            file: e.target.files[0],
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Submit form data to backend
        // Example: Uploading to the backend and handling licensing and music data
    };

    return (
        <form onSubmit={handleSubmit}>
            <label>Song Title</label>
            <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
            />
            <label>Artist Name</label>
            <input
                type="text"
                name="artistName"
                value={formData.artistName}
                onChange={handleChange}
            />
            <label>Genre</label>
            <input
                type="text"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
            />
            <label>Price (for sale)</label>
            <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
            />
            <label>License Provider (BMI/ASCAP)</label>
            <input
                type="text"
                name="licenseProvider"
                value={formData.licenseProvider}
                onChange={handleChange}
            />
            <label>License ID</label>
            <input
                type="text"
                name="licenseId"
                value={formData.licenseId}
                onChange={handleChange}
            />
            <label>Licensing Price</label>
            <input
                type="number"
                name="licensingPrice"
                value={formData.licensingPrice}
                onChange={handleChange}
            />
            <label>Upload Music File</label>
            <input
                type="file"
                name="file"
                onChange={handleFileChange}
            />
            <button type="submit">Upload Music</button>
        </form>
    );
};

export default ArtistUploadForm;
