import React, { useState, useContext } from "react";
import { createSquad } from "../utils/gamerAPI";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";

const CreateTeamRoomPage = () => {
  const { store } = useContext(Context);
  const token = store.token;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    platform_tags: []
  });

  const [platformInput, setPlatformInput] = useState("");
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await createSquad(formData, token);
      setMessage("✅ Squad created!");
      navigate("/team-room");
    } catch (err) {
      console.error("Error creating squad:", err);
      setMessage("❌ Failed to create squad.");
    }
  };

  const handleAddPlatform = () => {
    const trimmed = platformInput.trim();
    if (trimmed && !formData.platform_tags.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        platform_tags: [...prev.platform_tags, trimmed]
      }));
      setPlatformInput("");
    }
  };

  const handleRemovePlatform = (tag) => {
    setFormData(prev => ({
      ...prev,
      platform_tags: prev.platform_tags.filter(p => p !== tag)
    }));
  };

  return (
    <div className="page-container">
      <h1>➕ Create Team Room</h1>

      <form onSubmit={handleSubmit} className="bg-dark text-white p-4 rounded">
        <div className="mb-3">
          <label className="form-label">Team Name</label>
          <input
            type="text"
            className="form-control"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Supported Platforms (e.g. PS5, Xbox, PC)</label>
          <div className="d-flex mb-2">
            <input
              type="text"
              className="form-control me-2"
              value={platformInput}
              onChange={(e) => setPlatformInput(e.target.value)}
              placeholder="Add platform"
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddPlatform}>Add</button>
          </div>
          <ul className="list-group">
            {formData.platform_tags.map((tag) => (
              <li key={tag} className="list-group-item d-flex justify-content-between align-items-center">
                {tag}
                <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemovePlatform(tag)}>✖</button>
              </li>
            ))}
          </ul>
        </div>

        <button type="submit" className="btn btn-primary mt-3">🚀 Create Squad</button>
      </form>

      {message && <div className="mt-3 alert alert-info">{message}</div>}
    </div>
  );
};

export default CreateTeamRoomPage;
