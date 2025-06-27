import React from "react";

const PodcastActions = ({ podcast }) => {
  const likeContent = (contentId, type) => {
    fetch(`${process.env.BACKEND_URL}/api/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ content_id: contentId, content_type: type })
    })
      .then(res => res.json())
      .then(() => alert("Liked!"))
      .catch(err => console.error("Error liking content:", err));
  };

  const addToFavorites = (contentId, type) => {
    fetch(`${process.env.BACKEND_URL}/api/favorite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ content_id: contentId, content_type: type })
    })
      .then(res => res.json())
      .then(() => alert("Added to favorites!"))
      .catch(err => console.error("Error adding to favorites:", err));
  };

  return (
    <div className="podcast-actions">
      <button onClick={() => likeContent(podcast.id, "podcast")}>❤️ Like</button>
      <button onClick={() => addToFavorites(podcast.id, "podcast")}>⭐ Favorite</button>
    </div>
  );
};

export default PodcastActions;
