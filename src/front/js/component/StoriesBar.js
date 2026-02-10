// =============================================================================
// StoriesBar.js - Horizontal stories bar at top of feed
// =============================================================================
// Location: /src/front/js/component/StoriesBar.js
// Features: Story avatars with gradient rings, create story button, story viewer
// =============================================================================

import React, { useState, useEffect, useContext, useRef } from 'react';
import { Context } from '../store/appContext';
import { StoryViewerModal } from '../pages/StoryViewer';
import CreateStoryModal from './CreateStoryModal';
import '../../styles/StoriesBar.css';

const StoriesBar = () => {
  const { store } = useContext(Context);
  const [usersStories, setUsersStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIndex, setSelectedUserIndex] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const scrollRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchStoriesFeed();
  }, []);

  const fetchStoriesFeed = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${backendUrl}/api/stories/feed`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // data should be an array of { user, stories, has_unseen }
        setUsersStories(data.users_stories || data || []);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (index) => {
    setSelectedUserIndex(index);
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedUserIndex(null);
    // Refresh to update viewed status
    fetchStoriesFeed();
  };

  const handleCreateStory = () => {
    setShowCreateModal(true);
  };

  const handleStoryCreated = (newStory) => {
    // Add new story to current user's stories
    fetchStoriesFeed();
  };

  // Scroll handlers
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Check if current user has stories
  const currentUserStories = usersStories.find(u => u.user?.id === store.user?.id);
  const hasOwnStory = currentUserStories?.stories?.length > 0;

  if (loading) {
    return (
      <div className="stories-bar">
        <div className="stories-loading">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="story-placeholder">
              <div className="placeholder-avatar"></div>
              <div className="placeholder-name"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="stories-bar">
        {/* Scroll Buttons */}
        <button className="scroll-btn scroll-left" onClick={scrollLeft}>
          ‹
        </button>

        <div className="stories-scroll" ref={scrollRef}>
          {/* Your Story - Always First */}
          <div className="story-item your-story" onClick={handleCreateStory}>
            <div className={`story-avatar-wrapper ${hasOwnStory ? 'has-story' : 'no-story'}`}>
              <img 
                src={store.user?.profile_picture || store.user?.avatar_url || '/default-avatar.png'}
                alt="Your story"
                className="story-avatar"
              />
              <div className="add-story-badge">+</div>
            </div>
            <span className="story-username">Your Story</span>
          </div>

          {/* Other Users' Stories */}
          {usersStories
            .filter(u => u.user?.id !== store.user?.id)
            .map((userStory, index) => {
              const user = userStory.user;
              const storyCount = userStory.stories?.length || 0;
              const hasUnseen = userStory.has_unseen;

              return (
                <div 
                  key={user.id} 
                  className="story-item"
                  onClick={() => handleStoryClick(
                    usersStories.findIndex(u => u.user?.id === user.id)
                  )}
                >
                  <div 
                    className={`story-avatar-wrapper ${hasUnseen ? 'has-unseen' : 'seen'}`}
                    style={storyCount > 1 ? { '--story-count': storyCount } : {}}
                  >
                    <img 
                      src={user.profile_picture || user.avatar_url || '/default-avatar.png'}
                      alt={user.username}
                      className="story-avatar"
                    />
                    {storyCount > 1 && (
                      <span className="story-count-badge">{storyCount}</span>
                    )}
                  </div>
                  <span className="story-username">
                    {user.display_name || user.username || 'User'}
                  </span>
                </div>
              );
            })}

          {/* Empty State */}
          {usersStories.length === 0 && (
            <div className="stories-empty">
              <p>No stories yet. Follow more creators!</p>
            </div>
          )}
        </div>

        <button className="scroll-btn scroll-right" onClick={scrollRight}>
          ›
        </button>
      </div>

      {/* Story Viewer Modal */}
      {showViewer && selectedUserIndex !== null && (
        <StoryViewerModal
          usersStories={usersStories}
          initialUserIndex={selectedUserIndex}
          onClose={handleCloseViewer}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onStoryCreated={handleStoryCreated}
      />
    </>
  );
};

export default StoriesBar;