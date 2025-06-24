// ✅ CollaboratorForm.js
import React from "react";

const CollaboratorForm = ({ collaborator, index, updateCollaborator, removeCollaborator }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    updateCollaborator(index, { ...collaborator, [name]: value });
  };

  return (
    <div className="card mb-3 p-3">
      <h5>🎤 Collaborator #{index + 1}</h5>
      <div className="form-group mb-2">
        <input
          type="text"
          name="name"
          value={collaborator.name}
          onChange={handleChange}
          className="form-control"
          placeholder="Name (e.g. Producer, Featured Artist)"
        />
      </div>
      <div className="form-group mb-2">
        <input
          type="email"
          name="email"
          value={collaborator.email}
          onChange={handleChange}
          className="form-control"
          placeholder="Email (for royalty reports)"
        />
      </div>
      <div className="form-group mb-2">
        <input
          type="number"
          name="split_percent"
          value={collaborator.split_percent}
          onChange={handleChange}
          className="form-control"
          placeholder="Split %"
          min="0"
          max="100"
        />
      </div>
      <button className="btn btn-danger" onClick={() => removeCollaborator(index)}>
        ❌ Remove
      </button>
    </div>
  );
};

export default CollaboratorForm;
