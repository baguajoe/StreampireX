import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "../../styles/BrowseVideos.css";
import VideoCard from "../component/VideoCard";

// Constants moved outside component to prevent recreation
const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

const DEFAULT_CATEGORIES = [
  { id: 0, name: "All", video_count: 0 },
  // Music & Audio
  { id: 1, name: "Music", video_count: 0 },
  { id: 2, name: "Podcasts", video_count: 0 },
  { id: 3, name: "Live Concerts", video_count: 0 },
  { id: 4, name: "Music Videos", video_count: 0 },
  { id: 5, name: "DJ Sets", video_count: 0 },
  { id: 6, name: "Karaoke", video_count: 0 },
  // Health & Wellness  
  { id: 7, name: "Meditation", video_count: 0 },
  { id: 8, name: "Yoga", video_count: 0 },
  { id: 9, name: "Fitness", video_count: 0 },
  { id: 10, name: "Mental Health", video_count: 0 },
  { id: 11, name: "Nutrition", video_count: 0 },
  { id: 12, name: "Sleep & Relaxation", video_count: 0 },
  // Education & Learning
  { id: 13, name: "Education", video_count: 0 },
  { id: 14, name: "Tutorials", video_count: 0 },
  { id: 15, name: "Language Learning", video_count: 0 },
  { id: 16, name: "Science", video_count: 0 },
  { id: 17, name: "History", video_count: 0 },
  { id: 18, name: "Philosophy", video_count: 0 },
  // Technology
  { id: 19, name: "Tech", video_count: 0 },
  { id: 20, name: "Programming", video_count: 0 },
  { id: 21, name: "AI & Machine Learning", video_count: 0 },
  { id: 22, name: "Web Development", video_count: 0 },
  { id: 23, name: "Mobile Apps", video_count: 0 },
  { id: 24, name: "Cybersecurity", video_count: 0 },
  // Entertainment
  { id: 25, name: "Comedy", video_count: 0 },
  { id: 26, name: "Movies & TV", video_count: 0 },
  { id: 27, name: "Anime & Manga", video_count: 0 },
  { id: 28, name: "Celebrity News", video_count: 0 },
  { id: 29, name: "Reactions", video_count: 0 },
  { id: 30, name: "Memes", video_count: 0 },
  // Gaming
  { id: 31, name: "Gaming", video_count: 0 },
  { id: 32, name: "Game Reviews", video_count: 0 },
  { id: 33, name: "Esports", video_count: 0 },
  { id: 34, name: "Game Development", video_count: 0 },
  { id: 35, name: "Streaming Highlights", video_count: 0 },
  // Lifestyle
  { id: 36, name: "Lifestyle", video_count: 0 },
  { id: 37, name: "Fashion", video_count: 0 },
  { id: 38, name: "Beauty", video_count: 0 },
  { id: 39, name: "Travel", video_count: 0 },
  { id: 40, name: "Food & Cooking", video_count: 0 },
  { id: 41, name: "Home & Garden", video_count: 0 },
  { id: 42, name: "Parenting", video_count: 0 },
  { id: 43, name: "Relationships", video_count: 0 },
  // Creative Arts
  { id: 44, name: "Art", video_count: 0 },
  { id: 45, name: "Photography", video_count: 0 },
  { id: 46, name: "Design", video_count: 0 },
  { id: 47, name: "Writing", video_count: 0 },
  { id: 48, name: "Crafts & DIY", video_count: 0 },
  { id: 49, name: "Architecture", video_count: 0 },
  // Business & Finance
  { id: 50, name: "Business", video_count: 0 },
  { id: 51, name: "Entrepreneurship", video_count: 0 },
  { id: 52, name: "Investing", video_count: 0 },
  { id: 53, name: "Cryptocurrency", video_count: 0 },
  { id: 54, name: "Marketing", video_count: 0 },
  { id: 55, name: "Personal Finance", video_count: 0 },
  // Sports & Activities
  { id: 56, name: "Sports", video_count: 0 },
  { id: 57, name: "Basketball", video_count: 0 },
  { id: 58, name: "Football", video_count: 0 },
  { id: 59, name: "Soccer", video_count: 0 },
  { id: 60, name: "Extreme Sports", video_count: 0 },
  { id: 61, name: "Martial Arts", video_count: 0 },
  // News & Politics
  { id: 62, name: "News", video_count: 0 },
  { id: 63, name: "Politics", video_count: 0 },
  { id: 64, name: "Current Events", video_count: 0 },
  { id: 65, name: "Documentary", video_count: 0 },
  // Spirituality & Personal Growth
  { id: 66, name: "Spirituality", video_count: 0 },
  { id: 67, name: "Personal Development", video_count: 0 },
  { id: 68, name: "Motivation", video_count: 0 },
  { id: 69, name: "Life Coaching", video_count: 0 },
  // Special Interest
  { id: 70, name: "True Crime", video_count: 0 },
  { id: 71, name: "ASMR", video_count: 0 },
  { id: 72, name: "Animals", video_count: 0 },
  { id: 73, name: "Nature", video_count: 0 },
  { id: 74, name: "Space & Astronomy", video_count: 0 },
  { id: 75, name: "Product Reviews", video_count: 0 },
  { id: 76, name: "Vlogs", video_count: 0 },
  { id: 77, name: "Other", video_count: 0 }
];

// Custom hook for debounced search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom hook for API calls
const useApi = () => {
  const baseUrl = process.env.BACKEND_URL;
  
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }, [baseUrl]);

  return { apiCall };
};

const BrowseVideosPage = () => {
  // State management
  const [videos, setVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(""); // For navigation tabs

  // Refs for scrolling
  const scrollRef = useRef(null);

  // Custom hooks
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);
  const { apiCall } = useApi();

  // Memoized values
  const hasActiveFilters = useMemo(() => {
    return searchTerm || selectedCategory !== "All" || sortBy !== "newest";
  }, [searchTerm, selectedCategory, sortBy]);

  const videoCountText = useMemo(() => {
    return pagination.total 
      ? `${pagination.total.toLocaleString()} videos found` 
      : `${videos.length.toLocaleString()} videos`;
  }, [pagination.total, videos.length]);

  // Scroll functions for categories
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft -= 200;
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += 200;
    }
  };

  // API functions
  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiCall('/api/videos/categories');
      setCategories(data.categories || DEFAULT_CATEGORIES);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setCategories(DEFAULT_CATEGORIES);
    }
  }, [apiCall]);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        category: selectedCategory,
        sort_by: sortBy,
        page: currentPage.toString(),
        per_page: ITEMS_PER_PAGE.toString()
      });

      const data = await apiCall(`/api/videos?${params}`);

      // Handle both response formats
      if (data.videos) {
        setVideos(data.videos);
        setPagination(data.pagination || {});
      } else if (Array.isArray(data)) {
        setVideos(data);
        setPagination({ 
          page: 1, 
          total: data.length, 
          has_next: false, 
          has_prev: false,
          pages: 1
        });
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      setError("Failed to load videos. Please try again later.");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, debouncedSearchTerm, selectedCategory, sortBy, currentPage]);

  // Event handlers
  const handleLike = useCallback(async (videoId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to like videos");
        return;
      }

      const data = await apiCall(`/api/videos/${videoId}/like`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        }
      });

      setVideos(prev => prev.map(video =>
        video.id === videoId
          ? { ...video, likes: data.likes }
          : video
      ));
    } catch (err) {
      console.error("Failed to like video:", err);
      if (err.message.includes('401')) {
        alert("Please log in to like videos");
      } else {
        alert("Failed to like video. Please try again.");
      }
    }
  }, [apiCall]);

  const handleVideoView = useCallback(async (videoId) => {
    try {
      await apiCall(`/api/videos/${videoId}/view`, {
        method: "POST"
      });
    } catch (err) {
      console.error("Failed to record view:", err);
      // Silently fail for view tracking
    }
  }, [apiCall]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSortBy("newest");
    setCurrentPage(1);
  }, []);

  const handleShare = useCallback(async (video) => {
    const shareData = {
      title: video.title,
      url: `${window.location.origin}${window.location.pathname}?video=${video.id}`
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Video link copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to share:", err);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        alert("Video link copied to clipboard!");
      } catch (clipboardErr) {
        console.error("Failed to copy to clipboard:", clipboardErr);
        alert("Unable to share or copy link");
      }
    }
  }, []);

  // Utility functions
  const formatDuration = useCallback((seconds) => {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, selectedCategory, sortBy]);

  // Loading state
  if (isLoading && videos.length === 0) {
    return (
      <div className="categories-wrapper">
        <h1 className="categories-heading">📹 Browse All Free Videos</h1>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="categories-wrapper">
      <div className="browse-videos-header">
        <h1 className="categories-heading">📹 Browse All Free Videos</h1>
        <p className="video-count">{videoCountText}</p>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search videos, creators, or topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search videos"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="clear-search-btn"
              title="Clear search"
              aria-label="Clear search"
            >
              ✖️
            </button>
          )}
        </div>
      </div>

      {/* Sort and Filter Controls with Navigation Tabs */}
      <div className="controls-section">
        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <div 
            className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="nav-icon">🕐</span>
            <span className="nav-text">History</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-text">Playlists</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'your-videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('your-videos')}
          >
            <span className="nav-icon">📹</span>
            <span className="nav-text">Your videos</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'watch-later' ? 'active' : ''}`}
            onClick={() => setActiveTab('watch-later')}
          >
            <span className="nav-icon">🕒</span>
            <span className="nav-text">Watch later</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'liked' ? 'active' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            <span className="nav-icon">👍</span>
            <span className="nav-text">Liked videos</span>
          </div>
          <div 
            className={`nav-tab ${activeTab === 'downloads' ? 'active' : ''}`}
            onClick={() => setActiveTab('downloads')}
          >
            <span className="nav-icon">⬇️</span>
            <span className="nav-text">Downloads</span>
          </div>
        </div>

        {/* Sort Section */}
        <div className="sort-and-filters">
          <div className="sort-section">
            <label htmlFor="sort-select">Sort by: </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="popular">Most Popular</option>
              <option value="most_liked">Most Liked</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="clear-filters-btn"
            >
              🔄 Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Category Navigation - BrowseRadioStations Style */}
      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`category-pill ${selectedCategory === category.name ? "active" : ""}`}
            >
              {category.name}
            </div>
          ))}
        </div>
        <button onClick={scrollRight} className="scroll-button">›</button>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-message">
          <h3>⚠️ {error}</h3>
          <button onClick={fetchVideos} className="retry-btn">
            🔄 Try Again
          </button>
        </div>
      )}

      {/* No Videos State */}
      {!isLoading && !error && videos.length === 0 && (
        <div className="no-videos">
          <h3>🎬 No videos found</h3>
          <p>
            {hasActiveFilters
              ? "Try adjusting your search or filters"
              : "No videos have been uploaded yet. Be the first!"
            }
          </p>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="btn-secondary">
              🔄 Clear All Filters
            </button>
          )}
          <Link to="/profile" className="btn-primary">
            📤 Upload Your First Video
          </Link>
        </div>
      )}

      {/* Video Grid - 4 per row */}
      {videos.length > 0 && (
        <div className="podcast-section">
          <div className="podcast-scroll-row">
            {videos.map((video) => (
              <div key={video.id} className="video-card">
                <img 
                  src={video.thumbnail_url || '/placeholder-thumbnail.jpg'} 
                  alt={video.title}
                  className="video-thumbnail"
                />
                <div className="video-content">
                  <h3 className="video-title">{video.title}</h3>
                  <span className="video-creator">
                    {video.uploader_name || 'Unknown'}
                  </span>
                  <div className="video-stats">
                    <span>{video.views || 0} views</span>
                    <span className="video-duration">
                      {formatDuration(video.duration)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.has_prev}
            className="pagination-btn"
          >
            ← Previous
          </button>

          <div className="pagination-info">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <span className="total-items">
              ({pagination.total?.toLocaleString()} total videos)
            </span>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.has_next}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}

        {/* Loading overlay for pagination */}
        {isLoading && videos.length > 0 && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
    </div>
  );
};

export default BrowseVideosPage;