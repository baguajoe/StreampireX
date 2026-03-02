import React, { useState, useMemo, useCallback } from 'react';

const VideoCategories = ({ categories, selectedCategory, onCategorySelect }) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['popular']));
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Organize categories into groups - memoized to prevent recreation
  const categoryGroups = useMemo(() => ({
    popular: [
      "All", "Music", "Podcasts", "Gaming", "Martial Arts", "Education", "Comedy", "Tech", "Fitness"
    ],
    musicAudio: [
      "Music", "Podcasts", "Live Concerts", "Music Videos", "DJ Sets", "Karaoke"
    ],
    martialArts: [
      "Martial Arts", "Internal Arts", "Tai Chi", "Baguazhang", "Xing Yi Quan",
      "Qigong", "Wing Chun", "Kung Fu", "Karate", "BJJ", "MMA", "Muay Thai",
      "Judo", "Taekwondo", "Capoeira", "Krav Maga", "Aikido", "Wushu", "Silat", "HEMA"
    ],
    healthWellness: [
      "Health & Fitness", "Meditation", "Yoga", "Fitness", "Mental Health", "Nutrition", "Sleep & Relaxation"
    ],
    education: [
      "Education", "Tutorials", "Language Learning", "Science", "History", "Philosophy"
    ],
    technology: [
      "Tech", "Programming", "AI & Machine Learning", "Web Development", "Mobile Apps", "Cybersecurity"
    ],
    entertainment: [
      "Comedy", "Movies & TV", "Anime & Manga", "Celebrity News", "Reactions", "Memes"
    ],
    gaming: [
      "Gaming", "Game Reviews", "Esports", "Game Development", "Streaming Highlights"
    ],
    lifestyle: [
      "Lifestyle", "Fashion", "Beauty", "Travel", "Food & Cooking", "Home & Garden", "Parenting", "Relationships"
    ],
    creative: [
      "Art & Design", "Photography", "Design", "Writing", "Crafts & DIY", "Architecture"
    ],
    business: [
      "Business", "Entrepreneurship", "Investing", "Cryptocurrency", "Marketing", "Personal Finance"
    ],
    sports: [
      "Sports", "Basketball", "Football", "Soccer", "Extreme Sports"
    ],
    newsInfo: [
      "News", "Politics", "Current Events", "Documentary"
    ],
    spirituality: [
      "Spirituality", "Personal Development", "Motivation", "Life Coaching"
    ],
    special: [
      "True Crime", "ASMR", "Animals", "Nature", "Space & Astronomy", "Product Reviews", "Vlogs", "Other"
    ]
  }), []);

  const sectionTitles = useMemo(() => ({
    popular: "🔥 Popular",
    musicAudio: "🎵 Music & Audio",
    martialArts: "🥋 Martial Arts",
    healthWellness: "🧘 Health & Wellness",
    education: "📚 Education & Learning",
    technology: "💻 Technology",
    entertainment: "🎭 Entertainment",
    gaming: "🎮 Gaming",
    lifestyle: "✨ Lifestyle",
    creative: "🎨 Creative Arts",
    business: "💼 Business & Finance",
    sports: "⚽ Sports & Activities",
    newsInfo: "📰 News & Info",
    spirituality: "🙏 Spirituality & Growth",
    special: "🌟 Special Interest"
  }), []);

  // Create a lookup map for better performance
  const categoryLookup = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.name] = category;
      return acc;
    }, {});
  }, [categories]);

  const toggleSection = useCallback((sectionKey) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(sectionKey)) {
        newExpanded.delete(sectionKey);
      } else {
        newExpanded.add(sectionKey);
      }
      return newExpanded;
    });
  }, []);

  const getCategoryCount = useCallback((categoryName) => {
    const category = categoryLookup[categoryName];
    return category ? category.video_count : 0;
  }, [categoryLookup]);

  const handleCategorySelect = useCallback((categoryName) => {
    onCategorySelect(categoryName);
  }, [onCategorySelect]);

  const toggleViewMode = useCallback(() => {
    setShowAllCategories(prev => !prev);
  }, []);

  const renderCategoryButton = useCallback((categoryName) => {
    const count = getCategoryCount(categoryName);
    const isActive = selectedCategory === categoryName;
    
    return (
      <button
        key={categoryName}
        onClick={() => handleCategorySelect(categoryName)}
        className={`category-pill ${isActive ? 'active' : ''}`}
        aria-pressed={isActive}
        title={`Filter by ${categoryName}${count > 0 ? ` (${count} videos)` : ''}`}
      >
        {categoryName}
        {count > 0 && ` (${count})`}
      </button>
    );
  }, [selectedCategory, getCategoryCount, handleCategorySelect]);

  const renderCategoryGroup = useCallback((sectionKey, categoryNames) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    // For martial arts section, show all subs even if they don't exist in DB yet
    const isMartialArts = sectionKey === 'martialArts';
    const existingCategories = isMartialArts 
      ? categoryNames 
      : categoryNames.filter(name => categoryLookup[name]);
    
    if (existingCategories.length === 0) {
      return null;
    }
    
    return (
      <div key={sectionKey} className={`category-group ${sectionKey === 'martialArts' ? 'martial-arts-group' : ''}`}>
        <button
          className="category-group-header"
          onClick={() => toggleSection(sectionKey)}
          aria-expanded={isExpanded}
          aria-controls={`category-group-${sectionKey}`}
        >
          <span>{sectionTitles[sectionKey]}</span>
          <span className="expand-icon" aria-hidden="true">
            {isExpanded ? '▼' : '▶'}
          </span>
        </button>
        
        {isExpanded && (
          <div 
            id={`category-group-${sectionKey}`}
            className="category-group-content"
          >
            {existingCategories.map(renderCategoryButton)}
          </div>
        )}
      </div>
    );
  }, [expandedSections, categoryLookup, sectionTitles, toggleSection, renderCategoryButton]);

  // Show all categories in a simple grid
  if (showAllCategories) {
    return (
      <div className="category-section">
        <div className="category-header">
          <h3>📂 All Categories</h3>
          <button 
            onClick={toggleViewMode}
            className="toggle-view-btn"
          >
            📋 Organized View
          </button>
        </div>
        <div className="category-pills-all">
          {categories.map(category => renderCategoryButton(category.name))}
        </div>
      </div>
    );
  }

  return (
    <div className="category-section">
      <div className="category-header">
        <h3>📂 Categories</h3>
        <button 
          onClick={toggleViewMode}
          className="toggle-view-btn"
        >
          📋 Show All ({categories.length})
        </button>
      </div>

      <div className="organized-categories">
        {Object.entries(categoryGroups).map(([sectionKey, categoryNames]) => 
          renderCategoryGroup(sectionKey, categoryNames)
        )}
      </div>
    </div>
  );
};

export default VideoCategories;