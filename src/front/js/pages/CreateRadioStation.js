import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const CreateRadioStation = () => {
    const [stationName, setStationName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    
    // New state variables for additional questions
    const [targetAudience, setTargetAudience] = useState("");
    const [broadcastHours, setBroadcastHours] = useState("24/7");
    const [isExplicit, setIsExplicit] = useState(false);
    const [tags, setTags] = useState("");
    const [welcomeMessage, setWelcomeMessage] = useState("");
    const [socialLinks, setSocialLinks] = useState({
        website: "",
        instagram: "",
        twitter: ""
    });
    
    // Image upload states
    const [logoImage, setLogoImage] = useState(null);
    const [coverImage, setCoverImage] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    
    // Refs for file inputs
    const logoInputRef = useRef(null);
    const coverInputRef = useRef(null);

    const navigate = useNavigate(); // Redirect after creation

    // Fetch radio categories from the backend
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/radio/categories");
                if (!response.ok) {
                    throw new Error("Failed to fetch categories");
                }
                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error("Error fetching categories:", error);
                setMessage("⚠️ Error loading categories.");
            }
        };

        fetchCategories();
    }, []);

    // Clean up image preview URLs when component unmounts
    useEffect(() => {
        return () => {
            if (logoPreview) URL.revokeObjectURL(logoPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
        };
    }, [logoPreview, coverPreview]);

    // Function to handle logo image selection
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setMessage("❗ Logo image must be less than 2MB");
                return;
            }
            
            if (logoPreview) URL.revokeObjectURL(logoPreview);
            setLogoImage(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // Function to handle cover image selection
    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setMessage("❗ Cover image must be less than 5MB");
                return;
            }
            
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setCoverImage(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    // Function to handle social link changes
    const handleSocialLinkChange = (platform, value) => {
        setSocialLinks(prev => ({
            ...prev,
            [platform]: value
        }));
    };

    // Function to create a new radio station
    const createStation = async () => {
        // Validate required fields
        if (!stationName.trim() || !category || !targetAudience.trim()) {
            setMessage("❗ Station name, category, and target audience are required!");
            return;
        }

        if (!logoImage) {
            setMessage("❗ Please upload a logo for your station!");
            return;
        }

        setLoading(true); // Show loading indicator
        setMessage("");

        try {
            // Create FormData object for file uploads
            const formData = new FormData();
            formData.append("name", stationName.trim());
            formData.append("description", description.trim());
            formData.append("category", category);
            formData.append("targetAudience", targetAudience.trim());
            formData.append("broadcastHours", broadcastHours);
            formData.append("isExplicit", isExplicit);
            formData.append("tags", JSON.stringify(tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')));
            formData.append("welcomeMessage", welcomeMessage.trim());
            formData.append("socialLinks", JSON.stringify(socialLinks));
            
            // Append image files if they exist
            if (logoImage) formData.append("logo", logoImage);
            if (coverImage) formData.append("cover", coverImage);

            const response = await fetch("http://localhost:5000/api/radio/create", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("🎶 Radio station created successfully!");
                // Reset all form fields
                setStationName("");
                setDescription("");
                setCategory("");
                setTargetAudience("");
                setBroadcastHours("24/7");
                setIsExplicit(false);
                setTags("");
                setWelcomeMessage("");
                setSocialLinks({
                    website: "",
                    instagram: "",
                    twitter: ""
                });
                setLogoImage(null);
                setCoverImage(null);
                setLogoPreview(null);
                setCoverPreview(null);
                
                setTimeout(() => {
                    navigate(`/station/${data.stationId}/manage`); // Redirect to station management
                }, 1500);
            } else {
                throw new Error(data.error || "Failed to create radio station");
            }
        } catch (error) {
            console.error("Error creating radio station:", error);
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false); // Hide loading indicator
        }
    };

    return (
        <div style={styles.container}>
            <h2>Create a New Radio Station 🎙️</h2>

            {message && <p style={styles.message}>{message}</p>}

            <div style={styles.formSection}>
                <h3>Basic Information</h3>

                <input
                    type="text"
                    placeholder="Enter Radio Station Name *"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    style={styles.input}
                />

                <textarea
                    placeholder="Enter Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={styles.textarea}
                ></textarea>

                <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
                    <option value="">🎵 Select a Category *</option>
                    {categories.map((cat, index) => (
                        <option key={index} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            <div style={styles.formSection}>
                <h3>Station Visuals</h3>
                
                <div style={styles.imageUploadContainer}>
                    <div style={styles.imageUploadBox}>
                        <h4>Station Logo *</h4>
                        <div 
                            style={{
                                ...styles.uploadPreview,
                                backgroundImage: logoPreview ? `url(${logoPreview})` : 'none'
                            }}
                            onClick={() => logoInputRef.current.click()}
                        >
                            {!logoPreview && <p>Click to upload logo</p>}
                        </div>
                        <p style={styles.uploadHint}>Square image, max 2MB</p>
                        <input
                            type="file"
                            ref={logoInputRef}
                            accept="image/jpeg, image/png, image/gif"
                            onChange={handleLogoChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div style={styles.imageUploadBox}>
                        <h4>Cover Image (Optional)</h4>
                        <div 
                            style={{
                                ...styles.uploadPreview,
                                ...styles.coverPreview,
                                backgroundImage: coverPreview ? `url(${coverPreview})` : 'none'
                            }}
                            onClick={() => coverInputRef.current.click()}
                        >
                            {!coverPreview && <p>Click to upload cover</p>}
                        </div>
                        <p style={styles.uploadHint}>Banner image, max 5MB</p>
                        <input
                            type="file"
                            ref={coverInputRef}
                            accept="image/jpeg, image/png"
                            onChange={handleCoverChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>
            </div>

            <div style={styles.formSection}>
                <h3>Audience & Content</h3>

                <input
                    type="text"
                    placeholder="Target Audience *"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    style={styles.input}
                />

                <select 
                    value={broadcastHours} 
                    onChange={(e) => setBroadcastHours(e.target.value)} 
                    style={styles.select}
                >
                    <option value="24/7">24/7 Broadcasting</option>
                    <option value="mornings">Morning Hours</option>
                    <option value="evenings">Evening Hours</option>
                    <option value="weekends">Weekends Only</option>
                    <option value="custom">Custom Schedule</option>
                </select>

                <div style={styles.checkboxContainer}>
                    <input
                        type="checkbox"
                        id="explicitContent"
                        checked={isExplicit}
                        onChange={(e) => setIsExplicit(e.target.checked)}
                    />
                    <label htmlFor="explicitContent">Contains explicit content</label>
                </div>

                <input
                    type="text"
                    placeholder="Tags (comma-separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    style={styles.input}
                />

                <textarea
                    placeholder="Welcome Message for Listeners"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    style={styles.textarea}
                ></textarea>
            </div>

            <div style={styles.formSection}>
                <h3>Social Media Links</h3>

                <input
                    type="url"
                    placeholder="Website URL"
                    value={socialLinks.website}
                    onChange={(e) => handleSocialLinkChange("website", e.target.value)}
                    style={styles.input}
                />

                <input
                    type="text"
                    placeholder="Instagram Handle"
                    value={socialLinks.instagram}
                    onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                    style={styles.input}
                />

                <input
                    type="text"
                    placeholder="Twitter Handle"
                    value={socialLinks.twitter}
                    onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                    style={styles.input}
                />
            </div>

            <button onClick={createStation} style={styles.button} disabled={loading}>
                {loading ? "⏳ Creating..." : "📡 Create Station"}
            </button>
            
            <p style={styles.nextStepsInfo}>
                After creating your station, you'll be able to upload music and create playlists.
            </p>
        </div>
    );
};

// 🎨 Improved Styling
const styles = {
    container: {
        maxWidth: "700px",
        margin: "auto",
        padding: "20px",
        textAlign: "left",
        border: "2px solid #ddd",
        borderRadius: "10px",
        backgroundColor: "#fff",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)"
    },
    formSection: {
        marginBottom: "20px",
        padding: "15px",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9"
    },
    input: {
        width: "100%",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        fontSize: "16px"
    },
    textarea: {
        width: "100%",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        minHeight: "80px",
        fontSize: "16px"
    },
    select: {
        width: "100%",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        fontSize: "16px"
    },
    button: {
        width: "100%",
        padding: "12px",
        backgroundColor: "#28A745",
        color: "#fff",
        borderRadius: "5px",
        cursor: "pointer",
        border: "none",
        fontSize: "16px"
    },
    message: {
        color: "#007BFF",
        fontWeight: "bold",
        marginBottom: "10px"
    },
    checkboxContainer: {
        display: "flex",
        alignItems: "center",
        marginBottom: "10px"
    },
    imageUploadContainer: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: "15px",
        marginBottom: "10px"
    },
    imageUploadBox: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    },
    uploadPreview: {
        width: "150px",
        height: "150px",
        border: "2px dashed #ccc",
        borderRadius: "5px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        backgroundSize: "cover",
        backgroundPosition: "center",
        marginBottom: "10px"
    },
    coverPreview: {
        width: "250px",
        height: "120px",
    },
    uploadHint: {
        fontSize: "12px",
        color: "#666",
        margin: "0"
    },
    nextStepsInfo: {
        textAlign: "center",
        marginTop: "15px",
        fontSize: "14px",
        color: "#666"
    }
};

export default CreateRadioStation;