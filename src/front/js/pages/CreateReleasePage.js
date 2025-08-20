// ✅ CreateReleasePage.js – Updated with Track Dropdown
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CreateReleasePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    genre: "",
    release_date: "",
    explicit: false,
    cover_art: null,
    track_id: ""
  });
  const [uploadedTracks, setUploadedTracks] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/tracks`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await res.json();
        if (res.ok) {
          setUploadedTracks(data.tracks);
        } else {
          console.error("Error fetching tracks:", data);
        }
      } catch (err) {
        console.error("Error loading tracks:", err);
      }
    };
    fetchTracks();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked :
        type === "file" ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key]) payload.append(key, formData[key]);
    });

    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/create-release`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Release submitted successfully!");
        setTimeout(() => navigate("/releases"), 1500);
      } else {
        setMessage(`❌ ${data.error || "Submission failed."}`);
      }
    } catch (err) {
      console.error("Error submitting release:", err);
      setMessage("❌ Network or server error.");
    }
  };

  return (
    <div className="release-page container">
      <h2>🎶 Create New Release</h2>
      {message && <p className="alert alert-info">{message}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Track Title</label>
          <input type="text" name="title" className="form-control" value={formData.title} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Genre</label>
          <input type="text" name="genre" className="form-control" value={formData.genre} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Release Date</label>
          <input type="date" name="release_date" className="form-control" value={formData.release_date} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Select Uploaded Track</label>
          <select name="track_id" className="form-control" onChange={handleChange} value={formData.track_id} required>
            <option value="">-- Choose Track --</option>
            {uploadedTracks.map(track => (
              <option key={track.id} value={track.id}>{track.title}</option>
            ))}
          </select>
        </div>

        <div className="form-check mb-2">
          <input type="checkbox" className="form-check-input" name="explicit" checked={formData.explicit} onChange={handleChange} />
          <label className="form-check-label">Explicit Content</label>
        </div>

        <div className="form-group">
          <label>Cover Art (JPG or PNG)</label>
          <input type="file" name="cover_art" className="form-control-file" accept="image/*" onChange={handleChange} required />
        </div>

        <button type="submit" className="btn btn-primary mt-3">Submit Release</button>
      </form>
    </div>
  );
};

export default CreateReleasePage;
