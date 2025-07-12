import React, { useEffect, useState, useContext, useRef } from "react";
import { Context } from "../store/appContext";
import { Link } from "react-router-dom";
// import { getGamerProfile, updateGamerProfile } from "../utils/gamerAPI.js";
import "../../styles/ProfilePage.css";
import "../../styles/GamerProfile.css"; // We'll create this for gamer-specific styles

const GamerProfilePage = () => {
  const { store } = useContext(Context);
  const [isGamerMode, setIsGamerMode] = useState(true); // Toggle between regular and gamer profile
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Essential Information States
  const [gamertag, setGamertag] = useState("");
  const [platforms, setPlatforms] = useState({
    pc: false,
    playstation: false,
    xbox: false,
    nintendo: false,
    mobile: false
  });
  const [currentGames, setCurrentGames] = useState([]);
  const [newGame, setNewGame] = useState("");
  const [gamingSchedule, setGamingSchedule] = useState("");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  
  // Social & Team Elements
  const [lookingFor, setLookingFor] = useState([]);
  const [communicationPrefs, setCommunicationPrefs] = useState([]);
  const [ageRange, setAgeRange] = useState("");
  const [timezone, setTimezone] = useState("");
  const [region, setRegion] = useState("");
  
  // Gaming Preferences
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [playstyle, setPlaystyle] = useState("");
  const [gameModes, setGameModes] = useState([]);
  
  // Optional Elements
  const [setupDetails, setSetupDetails] = useState({
    headset: "",
    controller: "",
    other: ""
  });
  const [streamingStatus, setStreamingStatus] = useState(false);
  const [streamingPlatform, setStreamingPlatform] = useState("");
  const [languages, setLanguages] = useState([]);
  const [gamerBio, setGamerBio] = useState("");
  
  // Additional gaming stats
  const [gamingStats, setGamingStats] = useState({
    hoursPlayed: 0,
    gamesOwned: 0,
    achievementsUnlocked: 0,
    winRate: 0
  });

  const userId = store.user?.id;
  const profilePicInputRef = useRef(null);

  useEffect(() => {
    if (userId) {
      // Simulate API call - replace with actual API call
      setTimeout(() => {
        setProfile({
          id: userId,
          username: store.user?.username || "Player",
          gamer_rank: "Casual",
          favorite_games: ["Valorant", "Minecraft"],
          gamer_tags: { steam: "player123", xbox: "PlayerX123" },
          squad_id: null
        });
        setLoading(false);
      }, 1000);
      
      // Load existing data if available
      loadExistingProfile();
    }
  }, [userId]);

  const loadExistingProfile = () => {
    // Load from localStorage or API
    const savedProfile = localStorage.getItem(`gamer_profile_${userId}`);
    if (savedProfile) {
      const data = JSON.parse(savedProfile);
      setGamertag(data.gamertag || "");
      setPlatforms(data.platforms || platforms);
      setCurrentGames(data.currentGames || []);
      setGamingSchedule(data.gamingSchedule || "");
      setSkillLevel(data.skillLevel || "intermediate");
      setLookingFor(data.lookingFor || []);
      setCommunicationPrefs(data.communicationPrefs || []);
      setAgeRange(data.ageRange || "");
      setTimezone(data.timezone || "");
      setRegion(data.region || "");
      setFavoriteGenres(data.favoriteGenres || []);
      setPlaystyle(data.playstyle || "");
      setGameModes(data.gameModes || []);
      setSetupDetails(data.setupDetails || setupDetails);
      setStreamingStatus(data.streamingStatus || false);
      setStreamingPlatform(data.streamingPlatform || "");
      setLanguages(data.languages || []);
      setGamerBio(data.gamerBio || "");
      setGamingStats(data.gamingStats || gamingStats);
    }
  };

  const handleSaveProfile = async () => {
    const gamerProfileData = {
      gamertag,
      platforms,
      currentGames,
      gamingSchedule,
      skillLevel,
      lookingFor,
      communicationPrefs,
      ageRange,
      timezone,
      region,
      favoriteGenres,
      playstyle,
      gameModes,
      setupDetails,
      streamingStatus,
      streamingPlatform,
      languages,
      gamerBio,
      gamingStats
    };

    try {
      // Save to localStorage (replace with API call)
      localStorage.setItem(`gamer_profile_${userId}`, JSON.stringify(gamerProfileData));
      
      // TODO: Replace with actual API call
      // await updateGamerProfile(userId, gamerProfileData);
      
      alert("✅ Gamer profile saved successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving gamer profile:", error);
      alert("❌ Failed to save gamer profile");
    }
  };

  const addToList = (item, list, setList) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
    }
  };

  const removeFromList = (item, list, setList) => {
    setList(list.filter(i => i !== item));
  };

  const toggleArrayItem = (item, array, setArray) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  if (loading) return <div className="loading-container"><p>🎮 Loading gamer profile...</p></div>;

  return (
    <div className="profile-container gamer-profile">
      {/* Profile Mode Toggle */}
      <div className="profile-mode-toggle">
        <button 
          className={`mode-toggle-btn ${!isGamerMode ? 'active' : ''}`}
          onClick={() => setIsGamerMode(false)}
        >
          👤 Regular Profile
        </button>
        <button 
          className={`mode-toggle-btn ${isGamerMode ? 'active' : ''}`}
          onClick={() => setIsGamerMode(true)}
        >
          🎮 Gamer Profile
        </button>
      </div>

      {!isGamerMode ? (
        <div className="redirect-message">
          <h2>👤 Regular Profile Mode</h2>
          <p>Switch to your regular profile view</p>
          <Link to="/profile" className="btn btn-primary">Go to Regular Profile</Link>
        </div>
      ) : (
        <>
          {/* Gamer Cover Photo */}
          <div className="cover-photo-container gaming-cover">
            <div className="gaming-overlay">
              <h1>🎮 GAMER PROFILE</h1>
              <p>Level up your gaming experience</p>
            </div>
          </div>

          {/* Gamer Avatar and Basic Info */}
          <div className="profile-avatar-toggle-horizontal">
            <img
              src={profile.avatar_url || "/default-gamer-avatar.png"}
              alt="Gamer Avatar"
              className="profile-pic gamer-avatar"
            />
            <div className="profile-name-inline">
              <p className="profile-name-label gamer-tag">
                {gamertag || profile.username || "Your Gamertag"}
              </p>
              <p className="gamer-rank">Rank: {profile.gamer_rank || skillLevel}</p>
              <button onClick={() => profilePicInputRef.current.click()} className="upload-btn">
                🎮 Upload Gamer Avatar
              </button>
              <input ref={profilePicInputRef} type="file" style={{ display: 'none' }} />
            </div>
            <div className="profile-name-header">
              <div className="gamer-actions">
                <button 
                  className="edit-name-btn small-btn" 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? '👁️ View' : '✏️ Edit'}
                </button>
                <button className="message-btn small-btn">💬 Message</button>
                <button className="invite-btn small-btn">🎯 Invite to Game</button>
              </div>
            </div>
          </div>

          {/* Gaming Stats Row */}
          <div className="profile-header-flex">
            {/* Gamer Bio */}
            <div className="profile-card-bio gamer-bio-card">
              <label>🎮 Gamer Bio:</label>
              {!isEditing ? (
                <p>{gamerBio || "Share your gaming story..."}</p>
              ) : (
                <textarea 
                  rows={5} 
                  value={gamerBio} 
                  onChange={(e) => setGamerBio(e.target.value)}
                  placeholder="Tell other gamers about yourself..."
                />
              )}
            </div>

            {/* Gaming Stats */}
            <div className="profile-stats-card gaming-stats">
              <h4>📊 Gaming Stats</h4>
              <ul className="profile-stats-list">
                <li>⏱️ Hours Played: <strong>{gamingStats.hoursPlayed}</strong></li>
                <li>🎮 Games Owned: <strong>{gamingStats.gamesOwned}</strong></li>
                <li>🏆 Achievements: <strong>{gamingStats.achievementsUnlocked}</strong></li>
                <li>📈 Win Rate: <strong>{gamingStats.winRate}%</strong></li>
              </ul>
            </div>

            {/* Online Status & Schedule */}
            <div className="gaming-status-card">
              <h4>🕐 Gaming Schedule</h4>
              {!isEditing ? (
                <p>{gamingSchedule || "No schedule set"}</p>
              ) : (
                <textarea 
                  rows={3} 
                  value={gamingSchedule} 
                  onChange={(e) => setGamingSchedule(e.target.value)}
                  placeholder="When are you usually online? (e.g., Weekdays 7-10 PM EST)"
                />
              )}
              <div className="timezone-region">
                {!isEditing ? (
                  <>
                    <p><strong>🌍 Region:</strong> {region || "Not set"}</p>
                    <p><strong>⏰ Timezone:</strong> {timezone || "Not set"}</p>
                  </>
                ) : (
                  <>
                    <input 
                      type="text" 
                      placeholder="Region (e.g., North America, EU West)" 
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Timezone (e.g., EST, PST, GMT)" 
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gaming Information Grid */}
          <div className="gaming-info-grid">
            {/* Essential Information */}
            <div className="gaming-card">
              <h3>🎯 Essential Info</h3>
              
              {/* Gamertag */}
              <div className="info-section">
                <label>🏷️ Gamertag/Username:</label>
                {!isEditing ? (
                  <p>{gamertag || "Not set"}</p>
                ) : (
                  <input 
                    type="text" 
                    value={gamertag} 
                    onChange={(e) => setGamertag(e.target.value)}
                    placeholder="Your main gaming identity"
                  />
                )}
              </div>

              {/* Platforms */}
              <div className="info-section">
                <label>🖥️ Platforms:</label>
                {!isEditing ? (
                  <div className="platform-tags">
                    {Object.entries(platforms).filter(([_, enabled]) => enabled).map(([platform, _]) => (
                      <span key={platform} className="platform-tag">{platform.toUpperCase()}</span>
                    ))}
                  </div>
                ) : (
                  <div className="platform-checkboxes">
                    {Object.entries(platforms).map(([platform, enabled]) => (
                      <label key={platform} className="platform-checkbox">
                        <input 
                          type="checkbox" 
                          checked={enabled}
                          onChange={(e) => setPlatforms({...platforms, [platform]: e.target.checked})}
                        />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Skill Level */}
              <div className="info-section">
                <label>⭐ Skill Level:</label>
                {!isEditing ? (
                  <p>{skillLevel}</p>
                ) : (
                  <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>
                    <option value="beginner">🌱 Beginner</option>
                    <option value="intermediate">🎯 Intermediate</option>
                    <option value="advanced">🏆 Advanced</option>
                    <option value="competitive">🔥 Competitive</option>
                    <option value="pro">👑 Professional</option>
                  </select>
                )}
              </div>
            </div>

            {/* Current Games */}
            <div className="gaming-card">
              <h3>🎮 Current Games</h3>
              <div className="games-list">
                {currentGames.map((game, index) => (
                  <div key={index} className="game-tag">
                    <span>{game}</span>
                    {isEditing && (
                      <button onClick={() => removeFromList(game, currentGames, setCurrentGames)}>×</button>
                    )}
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="add-game">
                  <input 
                    type="text" 
                    value={newGame} 
                    onChange={(e) => setNewGame(e.target.value)}
                    placeholder="Add a game..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addToList(newGame, currentGames, setCurrentGames);
                        setNewGame("");
                      }
                    }}
                  />
                  <button onClick={() => {
                    addToList(newGame, currentGames, setCurrentGames);
                    setNewGame("");
                  }}>Add</button>
                </div>
              )}
            </div>

            {/* Social & Team */}
            <div className="gaming-card">
              <h3>👥 Social & Team</h3>
              
              <div className="info-section">
                <label>🔍 Looking For:</label>
                <div className="tag-grid">
                  {['Casual Friends', 'Competitive Teammates', 'Mentors', 'Coaching', 'Just Fun'].map(option => (
                    <button 
                      key={option}
                      className={`tag-btn ${lookingFor.includes(option) ? 'active' : ''}`}
                      onClick={() => isEditing && toggleArrayItem(option, lookingFor, setLookingFor)}
                      disabled={!isEditing}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="info-section">
                <label>🎙️ Communication:</label>
                <div className="tag-grid">
                  {['Voice Chat', 'Text Only', 'Discord', 'In-game Chat'].map(option => (
                    <button 
                      key={option}
                      className={`tag-btn ${communicationPrefs.includes(option) ? 'active' : ''}`}
                      onClick={() => isEditing && toggleArrayItem(option, communicationPrefs, setCommunicationPrefs)}
                      disabled={!isEditing}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range */}
              <div className="info-section">
                <label>👥 Age Range:</label>
                {!isEditing ? (
                  <p>{ageRange || "Not specified"}</p>
                ) : (
                  <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
                    <option value="">Select age range</option>
                    <option value="13-17">13-17</option>
                    <option value="18-24">18-24</option>
                    <option value="25-34">25-34</option>
                    <option value="35-44">35-44</option>
                    <option value="45+">45+</option>
                  </select>
                )}
              </div>
            </div>

            {/* Gaming Preferences */}
            <div className="gaming-card">
              <h3>🎯 Gaming Preferences</h3>
              
              <div className="info-section">
                <label>🎮 Favorite Genres:</label>
                <div className="tag-grid">
                  {['FPS', 'RPG', 'Strategy', 'Sports', 'Racing', 'Puzzle', 'Adventure', 'Fighting'].map(genre => (
                    <button 
                      key={genre}
                      className={`tag-btn ${favoriteGenres.includes(genre) ? 'active' : ''}`}
                      onClick={() => isEditing && toggleArrayItem(genre, favoriteGenres, setFavoriteGenres)}
                      disabled={!isEditing}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="info-section">
                <label>⚔️ Playstyle:</label>
                {!isEditing ? (
                  <p>{playstyle || "Not set"}</p>
                ) : (
                  <select value={playstyle} onChange={(e) => setPlaystyle(e.target.value)}>
                    <option value="">Select playstyle</option>
                    <option value="aggressive">⚡ Aggressive</option>
                    <option value="strategic">🧠 Strategic</option>
                    <option value="supportive">🤝 Supportive</option>
                    <option value="casual">😌 Casual</option>
                    <option value="competitive">🏆 Competitive</option>
                  </select>
                )}
              </div>

              <div className="info-section">
                <label>🎯 Game Modes:</label>
                <div className="tag-grid">
                  {['Solo', 'Co-op', 'PvP', 'PvE', 'Team', 'Battle Royale'].map(mode => (
                    <button 
                      key={mode}
                      className={`tag-btn ${gameModes.includes(mode) ? 'active' : ''}`}
                      onClick={() => isEditing && toggleArrayItem(mode, gameModes, setGameModes)}
                      disabled={!isEditing}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Setup & Streaming */}
            <div className="gaming-card">
              <h3>🎧 Setup & Streaming</h3>
              
              <div className="info-section">
                <label>🎧 Setup Details:</label>
                {!isEditing ? (
                  <div>
                    <p><strong>Headset:</strong> {setupDetails.headset || "Not specified"}</p>
                    <p><strong>Controller:</strong> {setupDetails.controller || "Not specified"}</p>
                    <p><strong>Other:</strong> {setupDetails.other || "Not specified"}</p>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="text" 
                      placeholder="Headset model" 
                      value={setupDetails.headset}
                      onChange={(e) => setSetupDetails({...setupDetails, headset: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Controller type" 
                      value={setupDetails.controller}
                      onChange={(e) => setSetupDetails({...setupDetails, controller: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Other equipment" 
                      value={setupDetails.other}
                      onChange={(e) => setSetupDetails({...setupDetails, other: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="info-section">
                <label>📺 Streaming:</label>
                {!isEditing ? (
                  <p>{streamingStatus ? `Yes - ${streamingPlatform}` : "No"}</p>
                ) : (
                  <div>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={streamingStatus}
                        onChange={(e) => setStreamingStatus(e.target.checked)}
                      />
                      I stream my gameplay
                    </label>
                    {streamingStatus && (
                      <input 
                        type="text" 
                        placeholder="Platform (Twitch, YouTube, etc.)" 
                        value={streamingPlatform}
                        onChange={(e) => setStreamingPlatform(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="info-section">
                <label>🌍 Languages:</label>
                <div className="tag-grid">
                  {['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese', 'Other'].map(lang => (
                    <button 
                      key={lang}
                      className={`tag-btn ${languages.includes(lang) ? 'active' : ''}`}
                      onClick={() => isEditing && toggleArrayItem(lang, languages, setLanguages)}
                      disabled={!isEditing}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="save-section">
              <button onClick={handleSaveProfile} className="btn-primary gamer-save">
                💾 Save Gamer Profile
              </button>
              <button onClick={() => setIsEditing(false)} className="btn-secondary">
                ❌ Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GamerProfilePage;