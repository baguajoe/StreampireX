import React from "react";

const PodcastActions = ({ podcast }) => {
  const likeContent = (contentId, type) => {
    fetch(process.env.REACT_APP_BACKEND_URL + "/api/like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ content_id: contentId, content_type: type })
    })
      .then((res) => res.json())
      .then(() => alert("Action completed!"))
      .catch((err) => console.error("Error:", err));
  };

  const addToFavorites = (contentId, type) => {
    fetch(process.env.REACT_APP_BACKEND_URL + "/api/favorite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ content_id: contentId, content_type: type })
    })
      .then((res) => res.json())
      .then(() => alert("Added to favorites!"))
      .catch((err) => console.error("Error:", err));
  };

  return (
    <div className="content-actions">
      <button onClick={() => likeContent(podcast.id, "podcast")}>❤️ Like</button>
      <button onClick={() => addToFavorites(podcast.id, "podcast")}>⭐ Favorite</button>
    </div>
  );
};

export default PodcastActions;
