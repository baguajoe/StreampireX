import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import "../../styles/EditArtistProfilePage.css";

const EditArtistProfilePage = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    artist_name: "",
    bio: "",
    genre: "",
    location: "",
    website: "",
    spotify_link: "",
    apple_music_link: "",
    youtube_link: "",
    instagram_link: "",
    twitter_link: ""
  });

  // File uploads
  const [profilePicture, setProfilePicture] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  // Genre options
  const genres = [
    "Pop", "Rock", "Hip-Hop", "R&B", "Country", "Electronic", "Jazz", "Classical",
    "Folk", "Blues", "Reggae", "Metal", "Punk", "Alternative", "Indie", "Soul",
    "Funk", "Disco", "House", "Techno", "Dubstep", "Ambient", "World", "Other"
  ];

  // Fetch current profile data
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const userData = await response.json();

        // Populate form with existing data
        setFormData({
          artist_name: userData.artist_name || "",
          bio: userData.bio || "",
          genre: userData.genre || "",
          location: userData.location || "",
          website: userData.website || "",
          spotify_link: userData.spotify_link || "",
          apple_music_link: userData.apple_music_link || "",
          youtube_link: userData.youtube_link || "",
          instagram_link: userData.instagram_link || "",
          twitter_link: userData.twitter_link || ""
        });

        // Set preview images
        if (userData.profile_picture) {
          setProfilePreview(userData.profile_picture);
        }
        if (userData.cover_photo) {
          setCoverPreview(userData.cover_photo);
        }
      } else {
        throw new Error("Failed to fetch profile data");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage("❌ Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Handle file uploads with preview
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          [type]: "Please select a valid image file"
        }));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [type]: "File size must be less than 5MB"
        }));
        return;
      }

      if (type === 'profile') {
        setProfilePicture(file);
        setProfilePreview(URL.createObjectURL(file));
      } else if (type === 'cover') {
        setCoverPhoto(file);
        setCoverPreview(URL.createObjectURL(file));
      }

      // Clear error
      setErrors(prev => ({
        ...prev,
        [type]: ""
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.artist_name.trim()) {
      newErrors.artist_name = "Artist name is required";
    }

    if (!formData.genre) {
      newErrors.genre = "Please select a genre";
    }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = "Please enter a valid website URL";
    }

    // Validate social links
    const socialFields = ['spotify_link', 'apple_music_link', 'youtube_link', 'instagram_link', 'twitter_link'];
    socialFields.forEach(field => {
      if (formData[field] && !isValidUrl(formData[field]) && !isValidHandle(formData[field])) {
        newErrors[field] = "Please enter a valid URL or handle";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper functions for validation
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const isValidHandle = (string) => {
    // Check if it's a social media handle (starts with @)
    return /^@[a-zA-Z0-9_]+$/.test(string.trim());
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setMessage("❌ Please fix the errors below");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const formDataToSend = new FormData();

      // Add form data
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      // Add files if selected
      if (profilePicture) {
        formDataToSend.append('profile_picture', profilePicture);
      }
      if (coverPhoto) {
        formDataToSend.append('cover_photo', coverPhoto);
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
          // Don't set Content-Type for FormData
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Artist profile updated successfully!");
        setTimeout(() => {
          navigate("/profile/artist");
        }, 2000);
      } else {
        throw new Error(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="edit-artist-container">
        <div className="loading-state">
          <div className="loading-spinner">🎵</div>
          <h3>Loading your artist profile...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-artist-container">
      <div className="edit-artist-header">
        <h1>✏️ Edit Artist Profile</h1>
        <p>Update your music artist profile and connect with your audience</p>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="edit-artist-form">

        {/* Profile Images Section */}
        <div className="form-section">
          <h3>📸 Profile Images</h3>

          <div className="image-uploads">
            <div className="image-upload-group">
              <label>Profile Picture</label>
              <div className="image-preview-container">
                {profilePreview && (
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    className="image-preview profile-preview"
                  />
                )}
                <div className="upload-overlay">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'profile')}
                    className="file-input"
                    id="profile-upload"
                  />
                  <label htmlFor="profile-upload" className="upload-btn">
                    📷 Choose Image
                  </label>
                </div>
              </div>
              {errors.profile && <span className="error-text">{errors.profile}</span>}
            </div>

            <div className="image-upload-group">
              <label>Cover Photo</label>
              <div className="image-preview-container cover">
                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="image-preview cover-preview"
                  />
                )}
                <div className="upload-overlay">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'cover')}
                    className="file-input"
                    id="cover-upload"
                  />
                  <label htmlFor="cover-upload" className="upload-btn">
                    🖼️ Choose Cover
                  </label>
                </div>
              </div>
              {errors.cover && <span className="error-text">{errors.cover}</span>}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="form-section">
          <h3>🎤 Basic Information</h3>

          <div className="form-group">
            <label>Artist Name *</label>
            <input
              type="text"
              name="artist_name"
              value={formData.artist_name}
              onChange={handleInputChange}
              placeholder="Your stage/artist name"
              className={errors.artist_name ? 'error' : ''}
              required
            />
            {errors.artist_name && <span className="error-text">{errors.artist_name}</span>}
          </div>

          <div className="form-group">
            <label>Genre *</label>
            <select
              name="genre"
              value={formData.genre}
              onChange={handleInputChange}
              className={errors.genre ? 'error' : ''}
              required
            >
              <option value="">Select your primary genre</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            {errors.genre && <span className="error-text">{errors.genre}</span>}
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell your audience about yourself, your music journey, and what inspires you..."
              rows="4"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, Country"
              />
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://yourwebsite.com"
                className={errors.website ? 'error' : ''}
              />
              {errors.website && <span className="error-text">{errors.website}</span>}
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="form-section">
          <h3>🔗 Social Media & Streaming Links</h3>

          <div className="social-links-grid">
            <div className="form-group">
              <label>🎵 Spotify</label>
              <input
                type="text"
                name="spotify_link"
                value={formData.spotify_link}
                onChange={handleInputChange}
                placeholder="https://open.spotify.com/artist/..."
                className={errors.spotify_link ? 'error' : ''}
              />
              {errors.spotify_link && <span className="error-text">{errors.spotify_link}</span>}
            </div>

            <div className="form-group">
              <label>🍎 Apple Music</label>
              <input
                type="text"
                name="apple_music_link"
                value={formData.apple_music_link}
                onChange={handleInputChange}
                placeholder="https://music.apple.com/artist/..."
                className={errors.apple_music_link ? 'error' : ''}
              />
              {errors.apple_music_link && <span className="error-text">{errors.apple_music_link}</span>}
            </div>

            <div className="form-group">
              <label>📺 YouTube</label>
              <input
                type="text"
                name="youtube_link"
                value={formData.youtube_link}
                onChange={handleInputChange}
                placeholder="https://youtube.com/@yourhandle"
                className={errors.youtube_link ? 'error' : ''}
              />
              {errors.youtube_link && <span className="error-text">{errors.youtube_link}</span>}
            </div>

            <div className="form-group">
              <label>📸 Instagram</label>
              <input
                type="text"
                name="instagram_link"
                value={formData.instagram_link}
                onChange={handleInputChange}
                placeholder="https://instagram.com/yourhandle or @yourhandle"
                className={errors.instagram_link ? 'error' : ''}
              />
              {errors.instagram_link && <span className="error-text">{errors.instagram_link}</span>}
            </div>

            <div className="form-group">
              <label>🐦 Twitter/X</label>
              <input
                type="text"
                name="twitter_link"
                value={formData.twitter_link}
                onChange={handleInputChange}
                placeholder="https://x.com/yourhandle or @yourhandle"
                className={errors.twitter_link ? 'error' : ''}
              />
              {errors.twitter_link && <span className="error-text">{errors.twitter_link}</span>}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate("/profile/artist")}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? "💾 Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditArtistProfilePage;