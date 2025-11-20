// src/front/js/pages/BrowseVideosPage.js
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef
} from "react";
import { Link } from "react-router-dom";
import "../../styles/BrowseVideos.css";

// Constants
const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 300;

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// API hook
const useApi = () => {
  const baseUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

  const apiCall = useCallback(
    async (endpoint, options = {}) => {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
          },
          ...options
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.error(`API call failed for ${endpoint}:`, error);
        throw error;
      }
    },
    [baseUrl]
  );

  return { apiCall };
};

const BrowseVideosPage = () => {
  // State
  const [videos, setVideos] = useState([]);
  const [clips, setClips] = useState([]);
  const [channels, setChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const [browseMode, setBrowseMode] = useState("videos");

  const scrollRef = useRef(null);

  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);
  const { apiCall } = useApi();

  // Derived values
  const hasActiveFilters = useMemo(
    () => searchTerm || selectedCategory !== "All" || sortBy !== "newest",
    [searchTerm, selectedCategory, sortBy]
  );

  const contentCountText = useMemo(() => {
    if (browseMode === "channels") {
      return channels.length
        ? `${channels.length} channels found`
        : "No channels found";
    }
    if (browseMode === "clips") {
      return pagination.total
        ? `${pagination.total.toLocaleString()} clips found`
        : `${clips.length.toLocaleString()} clips`;
    }
    return pagination.total
      ? `${pagination.total.toLocaleString()} videos found`
      : `${videos.length.toLocaleString()} videos`;
  }, [pagination.total, videos.length, clips.length, channels.length, browseMode]);

  // Utils
  const formatCount = useCallback(count => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  }, []);

  const formatDuration = useCallback(seconds => {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${remaining.toString().padStart(2, "0")}`;
  }, []);

  // Category scrolling
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

  // API calls
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

      const data = await apiCall(`/api/videos?${params.toString()}`);

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

      const data = await apiCall(`/api/clips?${params.toString()}`);

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

      const data = await apiCall(`/api/video/channels/browse?${params.toString()}`);
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
  const handlePageChange = useCallback(newPage => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSortBy("newest");
    setCurrentPage(1);
  }, []);

  const handleBrowseModeChange = useCallback(mode => {
    setBrowseMode(mode);
    setCurrentPage(1);
    setActiveTab("");
    setSelectedCategory("All");
  }, []);

  // Effects
  useEffect(() => {
    document.body.style.color = "#e1e4e8";
    return () => {
      document.body.style.color = "";
    };
  }, []);

  // Fetch content when mode or filters change
  useEffect(() => {
    if (browseMode === "videos") {
      fetchVideos();
    } else if (browseMode === "clips") {
      fetchClips();
    } else {
      fetchChannels();
    }
  }, [browseMode, fetchVideos, fetchClips, fetchChannels]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory, sortBy, browseMode]);

  const getModeLabel = () => {
    if (browseMode === "clips") return "Clips";
    if (browseMode === "channels") return "Channels";
    return "Videos";
  };

  // Initial loading skeleton
  if (
    isLoading &&
    videos.length === 0 &&
    clips.length === 0 &&
    channels.length === 0
  ) {
    return (
      <div className="browse-page browse-page-loading">
        <div className="browse-loading-inner">
          <div className="browse-spinner" />
          <h2 className="browse-loading-text">
            Loading {getModeLabel()}...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="browse-page">
      {/* Header */}
      <div className="browse-header">
        <div className="browse-header-main">
          <div className="browse-header-text">
            <h1 className="browse-title">Browse All Free {getModeLabel()}</h1>
            <p className="browse-subtext">{contentCountText}</p>
          </div>
          <Link to="/upload-video" className="browse-upload-link">
            <button className="browse-upload-btn">📤 Upload Video</button>
          </Link>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="browse-mode-toggle">
        <button
          onClick={() => handleBrowseModeChange("videos")}
          className={`browse-mode-btn${browseMode === "videos" ? " active" : ""}`}
        >
          📹 Videos
        </button>
        <button
          onClick={() => handleBrowseModeChange("clips")}
          className={`browse-mode-btn${browseMode === "clips" ? " active" : ""}`}
        >
          ⚡ Clips
        </button>
        <button
          onClick={() => handleBrowseModeChange("channels")}
          className={`browse-mode-btn${browseMode === "channels" ? " active" : ""}`}
        >
          📺 Channels
        </button>
      </div>

      {/* Search */}
      <div className="browse-search">
        <div className="browse-search-inner">
          <input
            type="text"
            className="browse-search-input"
            placeholder={`Search ${browseMode}, creators, or topics...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="browse-search-clear"
              onClick={() => setSearchTerm("")}
            >
              ✖
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="browse-tabs">
        <div className="browse-tabs-wrapper">
          {["history", "playlists", "your-videos", "watch-later", "liked", "downloads"].map(
            tab => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`browse-tab${activeTab === tab ? " active" : ""}`}
              >
                <span className="browse-tab-icon">
                  {tab === "history"
                    ? "🕐"
                    : tab === "playlists"
                    ? "📋"
                    : tab === "your-videos"
                    ? "📹"
                    : tab === "watch-later"
                    ? "🕒"
                    : tab === "liked"
                    ? "👍"
                    : "⬇"}
                </span>
                <span className="browse-tab-label">
                  {tab.replace("-", " ")}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Sort + filters */}
      {(browseMode === "videos" || browseMode === "clips") && (
        <div className="browse-sort">
          <div className="browse-sort-card">
            <label className="browse-sort-label">Sort by:</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="browse-sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_liked">Most Liked</option>
              <option value="popular">Most Popular</option>
            </select>
            {hasActiveFilters && (
              <button
                className="browse-clear-filters-btn"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Categories – HARDCODED VERSION THAT WILL WORK */}
      {browseMode === "videos" && (
        <div className="browse-categories">
          <button
            className="browse-cat-scroll-btn"
            onClick={scrollLeft}
          >
            ‹
          </button>
          <div 
            className="browse-cat-scroll" 
            ref={scrollRef}
          >
            <button
              onClick={() => setSelectedCategory("All")}
              className={`browse-cat-pill${selectedCategory === "All" ? " active" : ""}`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedCategory("Music")}
              className={`browse-cat-pill${selectedCategory === "Music" ? " active" : ""}`}
            >
              Music
            </button>
            <button
              onClick={() => setSelectedCategory("Podcasts")}
              className={`browse-cat-pill${selectedCategory === "Podcasts" ? " active" : ""}`}
            >
              Podcasts
            </button>
            <button
              onClick={() => setSelectedCategory("Live Concerts")}
              className={`browse-cat-pill${selectedCategory === "Live Concerts" ? " active" : ""}`}
            >
              Live Concerts
            </button>
            <button
              onClick={() => setSelectedCategory("Music Videos")}
              className={`browse-cat-pill${selectedCategory === "Music Videos" ? " active" : ""}`}
            >
              Music Videos
            </button>
            <button
              onClick={() => setSelectedCategory("DJ Sets")}
              className={`browse-cat-pill${selectedCategory === "DJ Sets" ? " active" : ""}`}
            >
              DJ Sets
            </button>
            <button
              onClick={() => setSelectedCategory("Gaming")}
              className={`browse-cat-pill${selectedCategory === "Gaming" ? " active" : ""}`}
            >
              Gaming
            </button>
            <button
              onClick={() => setSelectedCategory("Education")}
              className={`browse-cat-pill${selectedCategory === "Education" ? " active" : ""}`}
            >
              Education
            </button>
            <button
              onClick={() => setSelectedCategory("Tech")}
              className={`browse-cat-pill${selectedCategory === "Tech" ? " active" : ""}`}
            >
              Tech
            </button>
            <button
              onClick={() => setSelectedCategory("Comedy")}
              className={`browse-cat-pill${selectedCategory === "Comedy" ? " active" : ""}`}
            >
              Comedy
            </button>
            <button
              onClick={() => setSelectedCategory("Sports")}
              className={`browse-cat-pill${selectedCategory === "Sports" ? " active" : ""}`}
            >
              Sports
            </button>
            <button
              onClick={() => setSelectedCategory("News")}
              className={`browse-cat-pill${selectedCategory === "News" ? " active" : ""}`}
            >
              News
            </button>
            <button
              onClick={() => setSelectedCategory("Lifestyle")}
              className={`browse-cat-pill${selectedCategory === "Lifestyle" ? " active" : ""}`}
            >
              Lifestyle
            </button>
            <button
              onClick={() => setSelectedCategory("Travel")}
              className={`browse-cat-pill${selectedCategory === "Travel" ? " active" : ""}`}
            >
              Travel
            </button>
            <button
              onClick={() => setSelectedCategory("Food & Cooking")}
              className={`browse-cat-pill${selectedCategory === "Food & Cooking" ? " active" : ""}`}
            >
              Food & Cooking
            </button>
            <button
              onClick={() => setSelectedCategory("Art & Design")}
              className={`browse-cat-pill${selectedCategory === "Art & Design" ? " active" : ""}`}
            >
              Art & Design
            </button>
            <button
              onClick={() => setSelectedCategory("Business")}
              className={`browse-cat-pill${selectedCategory === "Business" ? " active" : ""}`}
            >
              Business
            </button>
            <button
              onClick={() => setSelectedCategory("Documentary")}
              className={`browse-cat-pill${selectedCategory === "Documentary" ? " active" : ""}`}
            >
              Documentary
            </button>
            <button
              onClick={() => setSelectedCategory("ASMR")}
              className={`browse-cat-pill${selectedCategory === "ASMR" ? " active" : ""}`}
            >
              ASMR
            </button>
            <button
              onClick={() => setSelectedCategory("Vlogs")}
              className={`browse-cat-pill${selectedCategory === "Vlogs" ? " active" : ""}`}
            >
              Vlogs
            </button>
          </div>
          <button
            className="browse-cat-scroll-btn"
            onClick={scrollRight}
          >
            ›
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="browse-empty">
          <h3 className="browse-empty-title error">{error}</h3>
          <button
            className="browse-primary-btn"
            onClick={
              browseMode === "videos"
                ? fetchVideos
                : browseMode === "clips"
                ? fetchClips
                : fetchChannels
            }
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty no-content state */}
      {!isLoading &&
        !error &&
        ((browseMode === "videos" && videos.length === 0) ||
          (browseMode === "clips" && clips.length === 0) ||
          (browseMode === "channels" && channels.length === 0)) && (
          <div className="browse-empty">
            <div className="browse-empty-icon">📁</div>
            <h3 className="browse-empty-title">
              No {browseMode} found
            </h3>
            <p className="browse-empty-text">
              {hasActiveFilters
                ? "Try adjusting your search or filters."
                : `No ${browseMode} have been uploaded yet.`}
            </p>
            {hasActiveFilters && (
              <button
                className="browse-secondary-btn"
                onClick={handleClearFilters}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

      {/* Videos grid */}
      {browseMode === "videos" && videos.length > 0 && (
        <div className="browse-video-grid">
          {videos.map(video => (
            <div key={video.id} className="browse-video-card">
              <Link
                to={`/video-details/${video.id}`}
                className="browse-card-link"
              >
                <img
                  src={video.thumbnail_url || "/placeholder-thumbnail.jpg"}
                  alt={video.title}
                  className="browse-card-thumb"
                />
              </Link>
              <div className="browse-card-body">
                <h3 className="browse-card-title">{video.title}</h3>
                <div className="browse-card-meta">
                  {video.uploader_avatar && (
                    <img
                      src={video.uploader_avatar}
                      alt={video.uploader_name}
                      className="browse-card-avatar"
                    />
                  )}
                  <span className="browse-card-uploader">
                    {video.uploader_name || "Unknown"}
                  </span>
                </div>
                <div className="browse-card-footer">
                  <span className="browse-card-views">
                    {formatCount(video.views || 0)} views
                  </span>
                  <span className="browse-card-duration">
                    {formatDuration(video.duration)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clips grid */}
      {browseMode === "clips" && clips.length > 0 && (
        <div className="browse-clips-grid">
          {clips.map(clip => (
            <div key={clip.id} className="browse-clip-card">
              <div className="browse-clip-thumb-wrapper">
                <img
                  src={clip.thumbnail_url || "/placeholder-thumbnail.jpg"}
                  alt={clip.title}
                  className="browse-clip-thumb"
                />
                <div className="browse-clip-badge">⚡ CLIP</div>
                <div className="browse-clip-duration">
                  {formatDuration(clip.duration)}
                </div>
              </div>
              <div className="browse-clip-body">
                <h3 className="browse-clip-title">{clip.title}</h3>
                <p className="browse-clip-uploader">
                  {clip.uploader_name || "Unknown"}
                </p>
                <p className="browse-clip-views">
                  {formatCount(clip.views || 0)} views
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Channels grid */}
      {browseMode === "channels" && channels.length > 0 && (
        <div className="browse-video-grid">
          {channels.map(channel => (
            <div key={channel.id} className="browse-video-card">
              <div
                className="browse-channel-banner"
                style={{
                  backgroundImage: channel.banner_url
                    ? `url(${channel.banner_url})`
                    : "linear-gradient(135deg, #FF6600, #ff8833)"
                }}
              />
              <div className="browse-channel-body">
                <img
                  src={
                    channel.creator?.profile_picture ||
                    "/default-avatar.png"
                  }
                  alt={channel.creator?.username}
                  className="browse-channel-avatar"
                />
                <h3 className="browse-channel-title">
                  {channel.channel_name}
                  {channel.is_verified && (
                    <span className="browse-channel-verified">✓</span>
                  )}
                </h3>
                <p className="browse-channel-handle">
                  by @{channel.creator?.username}
                </p>
                <p className="browse-channel-description">
                  {channel.description}
                </p>
                <div className="browse-channel-stats">
                  <span className="browse-channel-subs">
                    {formatCount(channel.subscriber_count)} subscribers
                  </span>
                  <span>{channel.total_videos} videos</span>
                </div>
                <button className="browse-primary-btn">
                  Visit Channel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="browse-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.has_prev}
            className={`browse-page-btn${!pagination.has_prev ? " disabled" : ""}`}
          >
            ← Previous
          </button>
          <div className="browse-page-info">
            <div>
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="browse-page-subinfo">
              ({pagination.total?.toLocaleString()} total {browseMode})
            </div>
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.has_next}
            className={`browse-page-btn${!pagination.has_next ? " disabled" : ""}`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Loading overlay (while data already shown) */}
      {isLoading &&
        (videos.length > 0 ||
          clips.length > 0 ||
          channels.length > 0) && (
          <div className="browse-loading-overlay">
            <div className="browse-spinner" />
          </div>
        )}
    </div>
  );
};

export default BrowseVideosPage;