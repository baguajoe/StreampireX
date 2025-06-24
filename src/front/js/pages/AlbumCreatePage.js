import React, { useState } from "react";
import TrackListEditor from "../component/TrackListEditor";

const AlbumCreatePage = () => {
  const [form, setForm] = useState({
    title: "",
    genre: "",
    release_date: "",
    cover_art: null,
  });
  const [albumId, setAlbumId] = useState(null);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const payload = new FormData();

    for (let key in form) {
      if (form[key]) payload.append(key, form[key]);
    }

    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/create-album`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      const data = await res.json();
      if (res.ok) {
        setAlbumId(data.album_id); // store the album ID for use in TrackListEditor
        setMessage("✅ Album created successfully.");
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Network error.");
    }
  };

  return (
    <div className="container mt-4">
      <h2>📀 Create New Album</h2>
      {message && <p className="alert alert-info">{message}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Album Title</label>
          <input
            type="text"
            className="form-control"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Genre</label>
          <input
            type="text"
            className="form-control"
            name="genre"
            value={form.genre}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Release Date</label>
          <input
            type="date"
            className="form-control"
            name="release_date"
            value={form.release_date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Cover Art</label>
          <input
            type="file"
            className="form-control-file"
            name="cover_art"
            accept=".jpg,.jpeg,.png"
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary mt-3">
          💾 Save Album
        </button>
      </form>

      {albumId && (
        <div className="mt-5">
          <TrackListEditor albumId={albumId} />
        </div>
      )}
    </div>
  );
};

export default AlbumCreatePage;
