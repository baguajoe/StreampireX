// src/front/js/component/StoriesBar.js
// Horizontal scrollable bar showing story circles (like Instagram)
import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";
import "../../styles/Stories.css";

const StoriesBar = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();
  
  const [storiesFeed, setStoriesFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasOwnStory, setHasOwnStory] = useState(false);

  useEffect(() => {
    fetchStoriesFeed();
  }, []);

  const fetchStoriesFeed = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/stories/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStoriesFeed(data);
        
        // Check if current user has any stories
        const ownStories = data.find(u => u.user.id === store.user?.id);
        setHasOwnStory(!!ownStories);
      }
    } catch (error) {
      console.error("Error fetching stories feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const openStoryViewer = (userId, index = 0) => {
    navigate(`/stories/${userId}?start=${index}`);
  };

  const openStoryUpload = () => {
    navigate("/stories/create");
  };

  if (loading) {
    return (
      <div className="stories-bar">
        <div className="stories-bar-inner">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="story-circle-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stories-bar">
      <div className="stories-bar-inner">
        {/* Add Story Button (always first) */}
        <div className="story-item add-story" onClick={openStoryUpload}>
          <div className={`story-circle ${hasOwnStory ? 'has-story' : ''}`}>
            {store.user?.profile_image_url ? (
              <img 
                src={store.user.profile_image_url} 
                alt="Your story" 
                className="story-avatar"
              />
            ) : (
              <div className="story-avatar-placeholder">
                {store.user?.username?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div className="add-story-icon">+</div>
          </div>
          <span className="story-username">Your Story</span>
        </div>

        {/* Other Users' Stories */}
        {storiesFeed.map((userStories, index) => (
          // Skip own stories in the feed (shown in "Your Story")
          userStories.user.id !== store.user?.id && (
            <div 
              key={userStories.user.id} 
              className="story-item"
              onClick={() => openStoryViewer(userStories.user.id)}
            >
              <div className={`story-circle ${userStories.has_unviewed ? 'unviewed' : 'viewed'}`}>
                {userStories.user.profile_image ? (
                  <img 
                    src={userStories.user.profile_image} 
                    alt={userStories.user.username} 
                    className="story-avatar"
                  />
                ) : (
                  <div className="story-avatar-placeholder">
                    {userStories.user.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <span className="story-username">
                {userStories.user.gamertag || userStories.user.username}
              </span>
            </div>
          )
        ))}

        {/* If no stories from followed users */}
        {storiesFeed.filter(u => u.user.id !== store.user?.id).length === 0 && (
          <div className="no-stories-message">
            <p>No stories yet. Follow more creators!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoriesBar;