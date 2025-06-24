import React, { useEffect, useState } from "react";

const AddToAlbumModal = ({ show, onClose, trackId }) => {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState("");

  useEffect(() => {
    if (show) {
      fetch(`${process.env.BACKEND_URL}/api/my-albums`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
        .then((res) => res.json())
        .then((data) => setAlbums(data));
    }
  }, [show]);

  const handleAttach = async () => {
    const res = await fetch(`${process.env.BACKEND_URL}/api/album/${selectedAlbum}/add-track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ track_id: trackId })
    });
    const data = await res.json();
    if (res.ok) {
      alert("✅ Track added to album");
      onClose();
    } else {
      alert(`❌ ${data.error}`);
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Track to Album</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <select
              className="form-select"
              value={selectedAlbum}
              onChange={(e) => setSelectedAlbum(e.target.value)}
            >
              <option value="">Select album</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAttach} disabled={!selectedAlbum}>
              Add to Album
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddToAlbumModal;
