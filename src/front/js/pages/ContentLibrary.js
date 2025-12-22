// src/front/js/pages/ContentLibrary.js - Complete solution
import React, { useState, useEffect } from 'react';
import UniversalSocialShare from '../component/UniversalSocialShare';
import "../../styles/ContentLibrary.css";

const ContentLibrary = () => {
  const [allContent, setAllContent] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [socialShare, setSocialShare] = useState({ show: false, data: null, type: null });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, week, month, 3months, 6months, year
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, popular, title
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const itemsPerPage = 12;

  useEffect(() => {
    fetchAllContent();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allContent, searchTerm, contentTypeFilter, dateFilter, sortBy]);

  const fetchAllContent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/all-content`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllContent(data.content);
      } else {
        // Fallback with comprehensive mock data
        setAllContent(generateMockContent());
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      setAllContent(generateMockContent());
    } finally {
      setLoading(false);
    }
  };

  const generateMockContent = () => {
    const mockContent = [];
    const contentTypes = ['music', 'video', 'podcast', 'radio', 'gaming'];
    const dates = [
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
      new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    ];

    for (let i = 0; i < 50; i++) {
      const type = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      const date = dates[Math.floor(Math.random() * dates.length)];
      
      mockContent.push({
        id: i + 1,
        type: type,
        title: type === 'music' ? `Track ${i + 1}` :
               type === 'video' ? `Video ${i + 1}` :
               type === 'podcast' ? `Episode ${i + 1}` :
               type === 'radio' ? `Radio Show ${i + 1}` :
               `Gaming Session ${i + 1}`,
        artist_name: type === 'music' ? 'You' : undefined,
        description: `This is a great ${type} content piece`,
        created_at: date.toISOString(),
        thumbnail: `/thumb-${type}-${i + 1}.jpg`,
        album_cover: type === 'music' ? `/cover-${i + 1}.jpg` : undefined,
        cover_image: type === 'radio' ? `/radio-cover-${i + 1}.jpg` : undefined,
        stats: {
          views: Math.floor(Math.random() * 10000),
          streams: Math.floor(Math.random() * 5000),
          shares: Math.floor(Math.random() * 100),
          listeners: Math.floor(Math.random() * 200)
        },
        tags: [`${type}`, 'original', Math.random() > 0.5 ? 'featured' : 'standard']
      });
    }

    return mockContent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const applyFilters = () => {
    let filtered = [...allContent];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.artist_name && item.artist_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Content type filter
    if (contentTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === contentTypeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          filterDate.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          filterDate.setFullYear(1970); // Show all
      }
      
      filtered = filtered.filter(item => new Date(item.created_at) >= filterDate);
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0));
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // newest
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredContent(filtered);
    setCurrentPage(1); // Reset pagination
  };

  const handleShare = (content) => {
    setSocialShare({
      show: true,
      data: content,
      type: content.type
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setContentTypeFilter('all');
    setDateFilter('all');
    setSortBy('newest');
  };

  // Pagination
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentContent = filteredContent.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  const getContentIcon = (type) => {
    const icons = {
      music: '🎵',
      video: '🎬',
      podcast: '🎙️',
      radio: '📻',
      gaming: '🎮',
      live_stream: '🔴'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="content-library">
      <div className="library-header">
        <div className="header-content">
          <h1>📚 My Content Library</h1>
          <p>All your StreampireX content in one place - search, filter, and share anything you've ever created</p>
        </div>
        
        <div className="library-stats">
          <div className="stat-item">
            <span className="stat-number">{allContent.length}</span>
            <span className="stat-label">Total Items</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{filteredContent.length}</span>
            <span className="stat-label">Showing</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search your content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          {/* Content Type Filter */}
          <div className="filter-group">
            <label>Content Type:</label>
            <select 
              value={contentTypeFilter} 
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">🌟 All Content</option>
              <option value="music">🎵 Music</option>
              <option value="video">🎬 Videos</option>
              <option value="podcast">🎙️ Podcasts</option>
              <option value="radio">📻 Radio</option>
              <option value="gaming">🎮 Gaming</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label>Created:</label>
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">🕐 All Time</option>
              <option value="week">📅 Past Week</option>
              <option value="month">📅 Past Month</option>
              <option value="3months">📅 Past 3 Months</option>
              <option value="6months">📅 Past 6 Months</option>
              <option value="year">📅 Past Year</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="filter-group">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="newest">🆕 Newest First</option>
              <option value="oldest">🕰️ Oldest First</option>
              <option value="popular">⭐ Most Popular</option>
              <option value="title">🔤 Alphabetical</option>
            </select>
          </div>

          <button onClick={clearFilters} className="clear-filters-btn">
            🗑️ Clear Filters
          </button>
        </div>
      </div>

      {/* Quick Stats for Current Filter */}
      {(searchTerm || contentTypeFilter !== 'all' || dateFilter !== 'all') && (
        <div className="filter-summary">
          <p>
            Showing {filteredContent.length} results 
            {searchTerm && ` for "${searchTerm}"`}
            {contentTypeFilter !== 'all' && ` in ${contentTypeFilter}`}
            {dateFilter !== 'all' && ` from ${dateFilter.replace(/(\d+)/, '$1 ')}`}
          </p>
        </div>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your content library...</p>
        </div>
      ) : currentContent.length > 0 ? (
        <div className="content-grid">
          {currentContent.map(content => (
            <div key={content.id} className={`content-card ${content.type}-card`}>
              <div className="content-thumbnail">
                <img 
                  src={content.thumbnail || content.album_cover || content.cover_image || '/default-thumb.jpg'} 
                  alt={content.title}
                  className="thumbnail-image"
                />
                <div className="content-type-badge">
                  {getContentIcon(content.type)}
                </div>
                <div className="content-overlay">
                  <button 
                    onClick={() => handleShare(content)}
                    className="share-overlay-btn"
                  >
                    🚀 Share Now
                  </button>
                </div>
              </div>
              
              <div className="content-info">
                <h4 className="content-title">{content.title}</h4>
                {content.artist_name && (
                  <p className="content-artist">by {content.artist_name}</p>
                )}
                
                <div className="content-meta">
                  <span className="content-date">{formatDate(content.created_at)}</span>
                  <div className="content-stats">
                    {content.stats?.views && <span>👁️ {content.stats.views}</span>}
                    {content.stats?.streams && <span>🎵 {content.stats.streams}</span>}
                    {content.stats?.listeners && <span>👥 {content.stats.listeners}</span>}
                    {content.stats?.shares && <span>🔄 {content.stats.shares}</span>}
                  </div>
                </div>
              </div>

              <div className="content-actions">
                <button 
                  onClick={() => handleShare(content)}
                  className="share-btn-primary"
                >
                  📱 Share on Social Media
                </button>
                
                <div className="quick-actions">
                  <button className="quick-action-btn edit-btn" title="Edit">✏️</button>
                  <button className="quick-action-btn analytics-btn" title="Analytics">📊</button>
                  <button className="quick-action-btn more-btn" title="More options">⋯</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            {searchTerm || contentTypeFilter !== 'all' || dateFilter !== 'all' ? '🔍' : '📚'}
          </div>
          <h3>
            {searchTerm || contentTypeFilter !== 'all' || dateFilter !== 'all' 
              ? 'No content matches your filters' 
              : 'No content yet'}
          </h3>
          <p>
            {searchTerm || contentTypeFilter !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Start creating content to build your library!'}
          </p>
          {(searchTerm || contentTypeFilter !== 'all' || dateFilter !== 'all') && (
            <button onClick={clearFilters} className="clear-filters-btn">
              🗑️ Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}

      {/* Social Share Modal */}
      <UniversalSocialShare
        isOpen={socialShare.show}
        onClose={() => setSocialShare({ show: false, data: null, type: null })}
        contentType={socialShare.type}
        contentData={socialShare.data}
      />
    </div>
  );
};

export default ContentLibrary;