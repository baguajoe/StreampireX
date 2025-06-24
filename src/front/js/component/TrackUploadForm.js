// ✅ TrackUploadForm.js
import React, { useState } from 'react';

const TrackUploadForm = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [isExplicit, setIsExplicit] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title || !genre) {
      setMessage("Please fill out all fields and select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("genre", genre);
    formData.append("explicit", isExplicit);

    try {
      const res = await fetch("/api/upload-track", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage(`✅ Track uploaded! ID: ${data.track_id}`);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Upload Your Track</h3>
      <form onSubmit={handleUpload}>
        <div className="form-group">
          <label>Title</label>
          <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Genre</label>
          <input className="form-control" value={genre} onChange={e => setGenre(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Audio File</label>
          <input type="file" className="form-control" accept=".mp3,.wav,.flac" onChange={e => setFile(e.target.files[0])} required />
        </div>

        <div className="form-check">
          <input type="checkbox" className="form-check-input" checked={isExplicit} onChange={() => setIsExplicit(!isExplicit)} />
          <label className="form-check-label">Explicit Lyrics?</label>
        </div>

        <button className="btn btn-primary mt-3" type="submit">Upload</button>
      </form>

      {message && <div className="alert alert-info mt-3">{message}</div>}
    </div>
  );
};

export default TrackUploadForm;
