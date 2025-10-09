import React, { useState } from "react";

const CollaboratorSplitPage = () => {
  const [collaborators, setCollaborators] = useState([{ name: "", role: "", percentage: "" }]);
  const [trackId, setTrackId] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (index, field, value) => {
    const updated = [...collaborators];
    updated[index][field] = value;
    setCollaborators(updated);
  };

  const addCollaborator = () => {
    setCollaborators([...collaborators, { name: "", role: "", percentage: "" }]);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/add-collaborator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ track_id: trackId, collaborators }),
      });
      const data = await res.json();
      setMessage(res.ok ? "✅ Collaborators saved" : `❌ ${data.error}`);
    } catch (err) {
      setMessage("❌ Network error");
    }
  };

  return (
    <div className="container mt-4">
      <h2>👥 Collaborator Splits</h2>

      <input
        type="text"
        className="form-control mb-3"
        placeholder="Track ID"
        value={trackId}
        onChange={(e) => setTrackId(e.target.value)}
        required
      />

      {collaborators.map((c, i) => (
        <div key={i} className="form-row mb-3">
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Name"
            value={c.name}
            onChange={(e) => handleChange(i, "name", e.target.value)}
          />
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Role (e.g. Producer)"
            value={c.role}
            onChange={(e) => handleChange(i, "role", e.target.value)}
          />
          <input
            type="number"
            className="form-control"
            placeholder="Split %"
            value={c.percentage}
            onChange={(e) => handleChange(i, "percentage", e.target.value)}
          />
        </div>
      ))}

      <button className="btn btn-secondary" onClick={addCollaborator}>➕ Add Another</button>
      <button className="btn btn-primary ml-3" onClick={handleSubmit}>💾 Save</button>
      {message && <p className="mt-3">{message}</p>}
    </div>
  );
};

export default CollaboratorSplitPage;
