import React, { useState, useEffect, useContext } from "react";
import { updateGamerProfile, getGamerProfile } from "../utils/gamerAPI";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";

const EditGamerProfilePage = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();
  const userId = store.user?.id;
  const token = store.token;

  const [formData, setFormData] = useState({
    gamer_tags: { psn: "", xbox: "", steam: "" },
    favorite_games: [],
    gamer_rank: ""
  });

  const [newGame, setNewGame] = useState("");

  useEffect(() => {
    if (userId) {
      getGamerProfile(userId).then((data) => {
        setFormData({
          gamer_tags: data.gamer_tags || { psn: "", xbox: "", steam: "" },
          favorite_games: data.favorite_games || [],
          gamer_rank: data.gamer_rank || ""
        });
      });
    }
  }, [userId]);

  const handleTagChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      gamer_tags: { ...prev.gamer_tags, [platform]: value }
    }));
  };

  const handleAddGame = () => {
    if (newGame.trim() && !formData.favorite_games.includes(newGame.trim())) {
      setFormData(prev => ({
        ...prev,
        favorite_games: [...prev.favorite_games, newGame.trim()]
      }));
      setNewGame("");
    }
  };

  const handleRemoveGame = (game) => {
    setFormData(prev => ({
      ...prev,
      favorite_games: prev.favorite_games.filter(g => g !== game)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateGamerProfile(formData, token);
    navigate("/profile/gamer");
  };

  return (
    <div className="page-container">
      <h1>✏️ Edit Gamer Profile</h1>
      <form onSubmit={handleSubmit} className="bg-dark text-white p-4 rounded">

        <h5>🎮 Gamer Tags</h5>
        {["psn", "xbox", "steam"].map(platform => (
          <div key={platform} className="mb-3">
            <label className="form-label">{platform.toUpperCase()} Tag</label>
            <input
              type="text"
              className="form-control"
              value={formData.gamer_tags[platform] || ""}
              onChange={(e) => handleTagChange(platform, e.target.value)}
            />
          </div>
        ))}

        <h5>🕹️ Favorite Games</h5>
        <div className="mb-3 d-flex">
          <input
            type="text"
            className="form-control me-2"
            placeholder="Add game title"
            value={newGame}
            onChange={(e) => setNewGame(e.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={handleAddGame}>➕ Add</button>
        </div>
        <ul className="list-group mb-3">
          {formData.favorite_games.map((game) => (
            <li key={game} className="list-group-item d-flex justify-content-between align-items-center">
              {game}
              <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoveGame(game)}>✖</button>
            </li>
          ))}
        </ul>

        <h5>🏆 Gamer Rank</h5>
        <input
          type="text"
          className="form-control mb-3"
          value={formData.gamer_rank}
          onChange={(e) => setFormData({ ...formData, gamer_rank: e.target.value })}
          placeholder="e.g., Bronze, Silver, Platinum"
        />

        <button type="submit" className="btn btn-primary">💾 Save Changes</button>
      </form>
    </div>
  );
};

export default EditGamerProfilePage;
