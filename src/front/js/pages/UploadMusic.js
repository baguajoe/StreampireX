import React, { useState, useEffect } from "react";
import "../../styles/UploadMusic.css";

const UploadMusic = () => {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [stationDetails, setStationDetails] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" or "cards"
  const [searchTerm, setSearchTerm] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [sortBy, setSortBy] = useState("name"); // "name", "followers", "genre"
  
  // Form states
  const [artistName, setArtistName] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [bio, setBio] = useState("");
  const [genre, setGenre] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [notes, setNotes] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Please log in to submit music.");
      return;
    }

    // Enhanced API call with more station details
    fetch(`${process.env.BACKEND_URL}/api/radio/stations/detailed`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setStations(data);
        console.log("Stations loaded:", data);
      })
      .catch(err => {
        console.error("Failed to load stations", err);
        // Fallback to basic stations API
        fetch(`${process.env.BACKEND_URL}/api/radio/stations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.json())
          .then(data => setStations(data))
          .catch(() => setMessage("Error loading radio stations"));
      });
  }, []);

  // Get filtered and sorted stations
  const getFilteredStations = () => {
    let filtered = stations.filter(station => {
      const matchesSearch = station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (station.description && station.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesGenre = !genreFilter || 
                          (station.genres && station.genres.includes(genreFilter)) ||
                          (station.preferred_genres && station.preferred_genres.includes(genreFilter));
      return matchesSearch && matchesGenre;
    });

    // Sort stations
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "followers":
          return (b.followers || 0) - (a.followers || 0);
        case "genre":
          return (a.genres?.[0] || "").localeCompare(b.genres?.[0] || "");
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  };

  // Get unique genres from all stations
  const getAvailableGenres = () => {
    const genres = new Set();
    stations.forEach(station => {
      if (station.genres) station.genres.forEach(g => genres.add(g));
      if (station.preferred_genres) station.preferred_genres.forEach(g => genres.add(g));
    });
    return Array.from(genres).sort();
  };

  const handleStationSelect = (stationId) => {
    setSelectedStation(stationId);
    const station = stations.find(s => s.id === parseInt(stationId));
    setStationDetails(station);
  };

  const handleUpload = async () => {
    if (!selectedStation || !audioFile || !trackTitle || !artistName) {
      setMessage("Please fill in all required fields and select a station.");
      return;
    }

    const formData = new FormData();
    formData.append("station_id", selectedStation);
    formData.append("artist_name", artistName);
    formData.append("track_title", trackTitle);
    formData.append("album_name", albumName);
    formData.append("bio", bio);
    formData.append("genre", genre);
    formData.append("social_links", socialLinks);
    formData.append("notes", notes);
    formData.append("audio", audioFile);

    try {
      const response = await fetch(`${process.env.BACKEND_URL}/api/radio/upload_music`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("🎵 Track submitted successfully!");
        // Reset form
        setSelectedStation("");
        setStationDetails(null);
        setArtistName("");
        setTrackTitle("");
        setAlbumName("");
        setBio("");
        setGenre("");
        setSocialLinks("");
        setNotes("");
        setAudioFile(null);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("❌ Network error. Please try again.");
    }
  };

  const filteredStations = getFilteredStations();
  const availableGenres = getAvailableGenres();

  return (
    <div className="upload-music-page">
      <div className="upload-music-card">
        <h2><i className="fas fa-music"></i> Submit Music to a Radio Station</h2>
        {message && <p className="upload-message">{message}</p>}

        {/* Artist Details Section */}
        <div className="form-section">
          <h3>🎤 Artist Information</h3>
          
          <label>🎙️ Artist Name *</label>
          <input 
            value={artistName} 
            onChange={(e) => setArtistName(e.target.value)} 
            type="text" 
            placeholder="Your artist/stage name" 
          />

          <label>🎵 Track Title *</label>
          <input 
            value={trackTitle} 
            onChange={(e) => setTrackTitle(e.target.value)} 
            type="text" 
            placeholder="Name of the track" 
          />

          <label>💿 Album Name</label>
          <input 
            value={albumName} 
            onChange={(e) => setAlbumName(e.target.value)} 
            type="text" 
            placeholder="Album or project name" 
          />

          <label>🎧 Genre</label>
          <input 
            value={genre} 
            onChange={(e) => setGenre(e.target.value)} 
            type="text" 
            placeholder="e.g. Lo-Fi, Jazz, Hip Hop" 
          />

          <label>📝 Short Artist Bio</label>
          <textarea 
            value={bio} 
            onChange={(e) => setBio(e.target.value)} 
            rows={3} 
            placeholder="Tell us about yourself..." 
          />

          <label>🔗 Social or Music Links</label>
          <input 
            value={socialLinks} 
            onChange={(e) => setSocialLinks(e.target.value)} 
            type="text" 
            placeholder="Spotify, YouTube, SoundCloud..." 
          />

          <label>📁 Upload Audio File *</label>
          <input 
            type="file" 
            accept="audio/*" 
            onChange={(e) => setAudioFile(e.target.files[0])} 
          />
        </div>

        {/* Enhanced Station Selection Section */}
        <div className="form-section">
          <h3>📻 Choose Radio Station *</h3>
          
          {/* Search and Filter Controls */}
          <div className="station-controls">
            <div className="control-row">
              <input
                type="text"
                placeholder="🔍 Search stations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="genre-filter"
              >
                <option value="">All Genres</option>
                {availableGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="name">Sort by Name</option>
                <option value="followers">Sort by Popularity</option>
                <option value="genre">Sort by Genre</option>
              </select>
            </div>

            <div className="view-controls">
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                📋 List
              </button>
              <button 
                className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                🃏 Cards
              </button>
            </div>
          </div>

          {/* Station Selection Display */}
          {viewMode === 'list' ? (
            /* List View */
            <div className="stations-list">
              {filteredStations.length > 0 ? filteredStations.map(station => (
                <div 
                  key={station.id} 
                  className={`station-item ${selectedStation == station.id ? 'selected' : ''}`}
                  onClick={() => handleStationSelect(station.id)}
                >
                  <div className="station-info">
                    <h4>{station.name}</h4>
                    <p className="station-description">
                      {station.description || "No description available"}
                    </p>
                    <div className="station-meta">
                      <span className="followers">👥 {station.followers || 0} followers</span>
                      {station.genres && station.genres.length > 0 && (
                        <span className="genres">
                          🎵 {station.genres.slice(0, 3).join(", ")}
                          {station.genres.length > 3 && "..."}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="station-actions">
                    <button 
                      className={`select-btn ${selectedStation == station.id ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStationSelect(station.id);
                      }}
                    >
                      {selectedStation == station.id ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              )) : (
                <p className="no-stations">No stations found matching your criteria.</p>
              )}
            </div>
          ) : (
            /* Card View */
            <div className="stations-grid">
              {filteredStations.length > 0 ? filteredStations.map(station => (
                <div 
                  key={station.id} 
                  className={`station-card ${selectedStation == station.id ? 'selected' : ''}`}
                  onClick={() => handleStationSelect(station.id)}
                >
                  <div className="card-header">
                    <h4>{station.name}</h4>
                    <span className="followers">👥 {station.followers || 0}</span>
                  </div>
                  <p className="card-description">
                    {station.description ? 
                      (station.description.length > 100 ? 
                        station.description.substring(0, 100) + "..." : 
                        station.description) : 
                      "No description available"}
                  </p>
                  {station.genres && station.genres.length > 0 && (
                    <div className="card-genres">
                      {station.genres.slice(0, 2).map(genre => (
                        <span key={genre} className="genre-tag">{genre}</span>
                      ))}
                    </div>
                  )}
                  <button 
                    className={`card-select-btn ${selectedStation == station.id ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStationSelect(station.id);
                    }}
                  >
                    {selectedStation == station.id ? '✓ Selected' : 'Select Station'}
                  </button>
                </div>
              )) : (
                <p className="no-stations">No stations found matching your criteria.</p>
              )}
            </div>
          )}

          {/* Selected Station Details */}
          {stationDetails && (
            <div className="selected-station-details">
              <h4>📻 Selected Station: {stationDetails.name}</h4>
              <div className="station-detail-grid">
                <div className="detail-item">
                  <strong>Description:</strong>
                  <p>{stationDetails.description || "No description available"}</p>
                </div>
                {stationDetails.genres && stationDetails.genres.length > 0 && (
                  <div className="detail-item">
                    <strong>Preferred Genres:</strong>
                    <p>{stationDetails.genres.join(", ")}</p>
                  </div>
                )}
                <div className="detail-item">
                  <strong>Followers:</strong>
                  <p>{stationDetails.followers || 0} listeners</p>
                </div>
                {stationDetails.submission_guidelines && (
                  <div className="detail-item">
                    <strong>Submission Guidelines:</strong>
                    <p>{stationDetails.submission_guidelines}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submission Notes */}
        {selectedStation && (
          <div className="form-section">
            <label>📩 Notes to {stationDetails?.name || "Station"}</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
              placeholder="Optional message to the station..." 
            />
          </div>
        )}

        <button 
          className="upload-btn" 
          onClick={handleUpload}
          disabled={!selectedStation || !audioFile || !trackTitle || !artistName}
        >
          Submit Track to {stationDetails?.name || "Station"}
        </button>
      </div>
    </div>
  );
};

export default UploadMusic;