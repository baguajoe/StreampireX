import React, { useState } from "react";

const LyricsUploadPage = () => {
  const [trackId, setTrackId] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [message, setMessage] = useState("");

  const handleTextUpload = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload-lyrics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ track_id: trackId, lyrics })
      });

      const data = await res.json();
      setMessage(res.ok ? "✅ Lyrics uploaded" : `❌ ${data.error}`);
    } catch (error) {
      setMessage("❌ Upload failed.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => setLyrics(e.target.result);
      reader.readAsText(file);
    } else {
      setMessage("❌ Only .txt files are supported.");
    }
  };

  return (
    <div className="container mt-4">
      <h2>📝 Upload Track Lyrics</h2>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Track ID"
        value={trackId}
        onChange={(e) => setTrackId(e.target.value)}
        required
      />
      <textarea
        className="form-control mb-3"
        rows={8}
        placeholder="Paste lyrics here..."
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
      />
      <input type="file" className="form-control-file mb-3" accept=".txt" onChange={handleFileChange} />
      <button className="btn btn-primary" onClick={handleTextUpload}>Upload Lyrics</button>
      {message && <p className="mt-3">{message}</p>}
    </div>
  );
};

export default LyricsUploadPage;
