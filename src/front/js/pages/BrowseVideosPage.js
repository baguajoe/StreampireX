import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";

// Constants
const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

const DEFAULT_CATEGORIES = [
  { id: 0, name: "All", video_count: 0 },
  { id: 1, name: "Music", video_count: 0 },
  { id: 2, name: "Podcasts", video_count: 0 },
  { id: 3, name: "Live Concerts", video_count: 0 },
  { id: 4, name: "Music Videos", video_count: 0 },
  { id: 5, name: "DJ Sets", video_count: 0 },
  { id: 6, name: "Karaoke", video_count: 0 },
  { id: 7, name: "Meditation", video_count: 0 },
  { id: 8, name: "Yoga", video_count: 0 },
  { id: 9, name: "Fitness", video_count: 0 },
  { id: 10, name: "Mental Health", video_count: 0 },
  { id: 11, name: "Nutrition", video_count: 0 },
  { id: 12, name: "Sleep & Relaxation", video_count: 0 },
  { id: 13, name: "Education", video_count: 0 },
  { id: 14, name: "Tutorials", video_count: 0 },
  { id: 15, name: "Language Learning", video_count: 0 },
  { id: 16, name: "Science", video_count: 0 },
  { id: 17, name: "History", video_count: 0 },
  { id: 18, name: "Philosophy", video_count: 0 },
  { id: 19, name: "Tech", video_count: 0 },
  { id: 20, name: "Programming", video_count: 0 },
  { id: 21, name: "AI & Machine Learning", video_count: 0 },
  { id: 22, name: "Web Development", video_count: 0 },
  { id: 23, name: "Mobile Apps", video_count: 0 },
  { id: 24, name: "Cybersecurity", video_count: 0 },
  { id: 25, name: "Comedy", video_count: 0 },
  { id: 26, name: "Movies & TV", video_count: 0 },
  { id: 27, name: "Anime & Manga", video_count: 0 },
  { id: 28, name: "Celebrity News", video_count: 0 },
  { id: 29, name: "Reactions", video_count: 0 },
  { id: 30, name: "Memes", video_count: 0 },
  { id: 31, name: "Gaming", video_count: 0 },
  { id: 32, name: "Game Reviews", video_count: 0 },
  { id: 33, name: "Esports", video_count: 0 },
  { id: 34, name: "Game Development", video_count: 0 },
  { id: 35, name: "Streaming Highlights", video_count: 0 },
  { id: 36, name: "Lifestyle", video_count: 0 },
  { id: 37, name: "Fashion", video_count: 0 },
  { id: 38, name: "Beauty", video_count: 0 },
  { id: 39, name: "Travel", video_count: 0 },
  { id: 40, name: "Food & Cooking", video_count: 0 },
  { id: 41, name: "Home & Garden", video_count: 0 },
  { id: 42, name: "Parenting", video_count: 0 },
  { id: 43, name: "Relationships", video_count: 0 },
  { id: 44, name: "Art", video_count: 0 },
  { id: 45, name: "Photography", video_count: 0 },
  { id: 46, name: "Design", video_count: 0 },
  { id: 47, name: "Writing", video_count: 0 },
  { id: 48, name: "Crafts & DIY", video_count: 0 },
  { id: 49, name: "Architecture", video_count: 0 },
  { id: 50, name: "Business", video_count: 0 },
  { id: 51, name: "Entrepreneurship", video_count: 0 },
  { id: 52, name: "Investing", video_count: 0 },
  { id: 53, name: "Cryptocurrency", video_count: 0 },
  { id: 54, name: "Marketing", video_count: 0 },
  { id: 55, name: "Personal Finance", video_count: 0 },
  { id: 56, name: "Sports", video_count: 0 },
  { id: 57, name: "Basketball", video_count: 0 },
  { id: 58, name: "Football", video_count: 0 },
  { id: 59, name: "Soccer", video_count: 0 },
  { id: 60, name: "Extreme Sports", video_count: 0 },
  { id: 61, name: "Martial Arts", video_count: 0 },
  { id: 62, name: "News", video_count: 0 },
  { id: 63, name: "Politics", video_count: 0 },
  { id: 64, name: "Current Events", video_count: 0 },
  { id: 65, name: "Documentary", video_count: 0 },
  { id: 66, name: "Spirituality", video_count: 0 },
  { id: 67, name: "Personal Development", video_count: 0 },
  { id: 68, name: "Motivation", video_count: 0 },
  { id: 69, name: "Life Coaching", video_count: 0 },
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
  const baseUrl = process.env.REACT_APP_BACKEND_URL;

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
  const [clips, setClips] = useState([]);
  const [channels, setChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const [browseMode, setBrowseMode] = useState("videos"); // 'videos', 'clips', or 'channels'
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Refs for scrolling
  const scrollRef = useRef(null);

  // Custom hooks
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);
  const { apiCall } = useApi();

  // Memoized values
  const hasActiveFilters = useMemo(() => {
    return searchTerm || selectedCategory !== "All" || sortBy !== "newest";
  }, [searchTerm, selectedCategory, sortBy]);

  const contentCountText = useMemo(() => {
    if (browseMode === 'channels') {
      return channels.length > 0 ? `${channels.length} channels found` : 'No channels found';
    }
    if (browseMode === 'clips') {
      return pagination.total
        ? `${pagination.total.toLocaleString()} clips found`
        : `${clips.length.toLocaleString()} clips`;
    }
    return pagination.total
      ? `${pagination.total.toLocaleString()} videos found`
      : `${videos.length.toLocaleString()} videos`;
  }, [pagination.total, videos.length, clips.length, channels.length, browseMode]);

  // Utility functions
  const formatCount = useCallback((count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  const formatDuration = useCallback((seconds) => {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

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

  const fetchClips = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        sort_by: sortBy,
        page: currentPage.toString(),
        per_page: ITEMS_PER_PAGE.toString()
      });

      const data = await apiCall(`/api/clips?${params}`);

      if (data.clips) {
        setClips(data.clips);
        setPagination(data.pagination || {});
      } else if (Array.isArray(data)) {
        setClips(data);
        setPagination({
          page: 1,
          total: data.length,
          has_next: false,
          has_prev: false,
          pages: 1
        });
      }
    } catch (err) {
      console.error("Failed to fetch clips:", err);
      setError("Failed to load clips. Please try again later.");
      setClips([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, debouncedSearchTerm, sortBy, currentPage]);

  const fetchChannels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        page: currentPage.toString(),
        per_page: ITEMS_PER_PAGE.toString()
      });

      const data = await apiCall(`/api/video/channels/browse?${params}`);
      setChannels(data.channels || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error("Failed to fetch channels:", err);
      setError("Failed to load channels. Please try again later.");
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, debouncedSearchTerm, currentPage]);

  // Event handlers
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

  const handleBrowseModeChange = useCallback((mode) => {
    setBrowseMode(mode);
    setCurrentPage(1);
    setActiveTab("");
    setSelectedCategory("All");
  }, []);

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (browseMode === 'videos') {
      fetchVideos();
    } else if (browseMode === 'clips') {
      fetchClips();
    } else {
      fetchChannels();
    }
  }, [browseMode, fetchVideos, fetchClips, fetchChannels]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, selectedCategory, sortBy, browseMode]);

  // Get mode label
  const getModeLabel = () => {
    switch (browseMode) {
      case 'videos': return 'Videos';
      case 'clips': return 'Clips';
      case 'channels': return 'Channels';
      default: return 'Content';
    }
  };

  // Loading state
  if (isLoading && videos.length === 0 && clips.length === 0 && channels.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Browse All Free {getModeLabel()}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #1976d2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading {browseMode}...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #e0e0e0', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Browse All Free {getModeLabel()}</h1>
            <p style={{ color: '#666', fontSize: '14px' }}>{contentCountText}</p>
          </div>
          <Link to ="/upload-video">
            <button
              onClick={() => setShowUploadForm(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}

            >
              Upload Video
            </button>
          </Link>
        </div>
      </div>

      {/* Browse Mode Toggle */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <button
          onClick={() => handleBrowseModeChange('videos')}
          style={{
            padding: '10px 20px',
            border: browseMode === 'videos' ? '2px solid #1976d2' : '1px solid #ddd',
            backgroundColor: browseMode === 'videos' ? '#e3f2fd' : 'white',
            color: browseMode === 'videos' ? '#1976d2' : '#333',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: browseMode === 'videos' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          📹 Videos
        </button>
        <button
          onClick={() => handleBrowseModeChange('clips')}
          style={{
            padding: '10px 20px',
            border: browseMode === 'clips' ? '2px solid #1976d2' : '1px solid #ddd',
            backgroundColor: browseMode === 'clips' ? '#e3f2fd' : 'white',
            color: browseMode === 'clips' ? '#1976d2' : '#333',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: browseMode === 'clips' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          ⚡ Clips
        </button>
        <button
          onClick={() => handleBrowseModeChange('channels')}
          style={{
            padding: '10px 20px',
            border: browseMode === 'channels' ? '2px solid #1976d2' : '1px solid #ddd',
            backgroundColor: browseMode === 'channels' ? '#e3f2fd' : 'white',
            color: browseMode === 'channels' ? '#1976d2' : '#333',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: browseMode === 'channels' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          📺 Channels
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '600px' }}>
          <input
            type="text"
            placeholder={`Search ${browseMode}, creators, or topics...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 40px 12px 16px',
              border: '1px solid #ddd',
              borderRadius: '24px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#666'
              }}
            >
              ✖
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
        {['history', 'playlists', 'your-videos', 'watch-later', 'liked', 'downloads'].map((tab) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: activeTab === tab ? '2px solid #1976d2' : '1px solid #ddd',
              backgroundColor: activeTab === tab ? '#e3f2fd' : 'white',
              borderRadius: '20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '14px'
            }}
          >
            <span>{tab === 'history' ? '🕐' : tab === 'playlists' ? '📋' : tab === 'your-videos' ? '📹' : tab === 'watch-later' ? '🕒' : tab === 'liked' ? '👍' : '⬇'}</span>
            <span style={{ textTransform: 'capitalize' }}>{tab.replace('-', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Sort and Filters - Only for videos and clips */}
      {(browseMode === 'videos' || browseMode === 'clips') && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_liked">Most Liked</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Category Navigation - Only for videos */}
      {browseMode === 'videos' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
          <button
            onClick={scrollLeft}
            style={{
              padding: '8px 12px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ‹
          </button>
          <div
            ref={scrollRef}
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              flex: 1,
              scrollbarWidth: 'none'
            }}
          >
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedCategory === category.name ? '#1976d2' : '#f5f5f5',
                  color: selectedCategory === category.name ? 'white' : '#333',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '14px',
                  fontWeight: selectedCategory === category.name ? '600' : '400'
                }}
              >
                {category.name}
              </div>
            ))}
          </div>
          <button
            onClick={scrollRight}
            style={{
              padding: '8px 12px',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ›
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffebee', borderRadius: '8px' }}>
          <h3 style={{ color: '#c62828', marginBottom: '15px' }}>{error}</h3>
          <button
            onClick={browseMode === 'videos' ? fetchVideos : browseMode === 'clips' ? fetchClips : fetchChannels}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* No Content State */}
      {!isLoading && !error &&
        ((browseMode === 'videos' && videos.length === 0) ||
          (browseMode === 'clips' && clips.length === 0) ||
          (browseMode === 'channels' && channels.length === 0)) && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📁</div>
            <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>No {browseMode} found</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              {hasActiveFilters
                ? "Try adjusting your search or filters"
                : `No ${browseMode} have been uploaded yet.`
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

      {/* Videos Grid */}
      {browseMode === 'videos' && videos.length > 0 && (
        <div className="podcast-section">
          <div className="podcast-scroll-row">
            {videos.map((video) => (
              <div key={video.id} className="video-card">
                <Link to={`/video-details/${video.id}`}>
                  <img
                    src={video.thumbnail_url || '/placeholder-thumbnail.jpg'}
                    alt={video.title}
                    className="video-thumbnail"
                  />
                </Link>
                <div className="video-content">
                  <h3 className="video-title">{video.title}</h3>

                  {/* Enhanced creator/channel info */}
                  <div className="creator-channel-info">
                    <Link
                      to={`/profile/${video.uploader_id}`}
                      className="video-creator-link"
                    >
                      {video.uploader_avatar && (
                        <img
                          src={video.uploader_avatar}
                          alt={video.uploader_name}
                          className="creator-avatar"
                        />
                      )}
                      <div className="creator-details">
                        <span className="video-creator">
                          {video.uploader_name || 'Unknown'}
                        </span>

                        {/* Show channel name if exists */}
                        {video.channel_name && (
                          <div className="channel-info">
                            <span className="channel-name">
                              {video.channel_name}
                              {video.channel_verified && <span className="verified-badge">✓</span>}
                            </span>
                            <span className="channel-subs">
                              {formatCount(video.channel_subscriber_count)} subscribers
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>

                  <div className="video-stats">
                    <span>{formatCount(video.views || 0)} views</span>
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

      {/* Clips Grid - Vertical short-form layout */}
      {browseMode === 'clips' && clips.length > 0 && (
        <div className="clips-section">
          <div className="clips-grid">
            {clips.map((clip) => (
              <div key={clip.id} className="clip-card">
                <div className="clip-thumbnail-container">
                  <img
                    src={clip.thumbnail_url || '/placeholder-thumbnail.jpg'}
                    alt={clip.title}
                    className="clip-thumbnail"
                  />
                  <div className="clip-duration-badge">
                    {formatDuration(clip.duration)}
                  </div>
                </div>
                <div className="clip-content">
                  <div className="clip-badge">⚡ Clip</div>
                  <h3 className="clip-title">{clip.title}</h3>
                  <div className="clip-creator-info">
                    {clip.uploader_avatar && (
                      <img
                        src={clip.uploader_avatar}
                        alt={clip.uploader_name}
                        className="clip-creator-avatar"
                      />
                    )}
                    <span className="clip-creator-name">
                      {clip.uploader_name || 'Unknown'}
                    </span>
                  </div>
                  <div className="clip-stats">
                    <span className="clip-views">
                      {formatCount(clip.views || 0)} views
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channels Grid */}
      {browseMode === 'channels' && channels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {channels.map((channel) => (
            <div key={channel.id} style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ height: '100px', backgroundColor: '#e0e0e0', backgroundImage: `url(${channel.banner_url})`, backgroundSize: 'cover' }}></div>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <img
                  src={channel.creator?.profile_picture || '/default-avatar.png'}
                  alt={channel.creator?.username}
                  style={{ width: '80px', height: '80px', borderRadius: '50%', marginTop: '-40px', border: '4px solid white' }}
                />
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop: '12px', marginBottom: '4px' }}>
                  {channel.channel_name}
                  {channel.is_verified && <span style={{ color: '#1976d2', marginLeft: '4px' }}>✓</span>}
                </h3>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>by @{channel.creator?.username}</p>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {channel.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '12px', color: '#666', marginBottom: '15px' }}>
                  <span>{formatCount(channel.subscriber_count)} subscribers</span>
                  <span>{channel.total_videos} videos</span>
                </div>
                <button style={{ padding: '10px 24px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                  Visit Channel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px' }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.has_prev}
            style={{
              padding: '10px 20px',
              backgroundColor: pagination.has_prev ? '#1976d2' : '#e0e0e0',
              color: pagination.has_prev ? 'white' : '#999',
              border: 'none',
              borderRadius: '6px',
              cursor: pagination.has_prev ? 'pointer' : 'not-allowed'
            }}
          >
            ← Previous
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>Page {pagination.page} of {pagination.pages}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>({pagination.total?.toLocaleString()} total {browseMode})</div>
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.has_next}
            style={{
              padding: '10px 20px',
              backgroundColor: pagination.has_next ? '#1976d2' : '#e0e0e0',
              color: pagination.has_next ? 'white' : '#999',
              border: 'none',
              borderRadius: '6px',
              cursor: pagination.has_next ? 'pointer' : 'not-allowed'
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (videos.length > 0 || clips.length > 0 || channels.length > 0) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #1976d2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      )}
    </div>
  );
};

export default BrowseVideosPage;