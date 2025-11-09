import React, { useEffect, useState, useContext, useRef } from "react";
import { Context } from "../store/appContext";
import { Link, useNavigate } from "react-router-dom";
import {
  getVideoRoomStatus,
  updateUserPresence,
  getCommunicationPreferences,
  updateCommunicationPreferences,
  getGamerProfile,
  updateGamerProfile,
  getSquadMembersPresence
} from "../utils/videoChatAPI";
import "../../styles/GamerProfile.css";

const GamerProfilePage = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();
  const [isGamerMode, setIsGamerMode] = useState(true);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Steam Integration States
  const [steamConnected, setSteamConnected] = useState(false);
  const [steamData, setSteamData] = useState(null);
  const [steamId, setSteamId] = useState('');
  const [showSteamModal, setShowSteamModal] = useState(false);
  const [steamLoading, setSteamLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
  const [onlineStatus, setOnlineStatus] = useState("online");

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

  // Video Chat & Team Room States
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [teamRoomAvailable, setTeamRoomAvailable] = useState(false);
  const [squadMembersOnline, setSquadMembersOnline] = useState([]);
  const [videoRoomStatus, setVideoRoomStatus] = useState(null);

  // Additional gaming stats
  const [gamingStats, setGamingStats] = useState({
    hoursPlayed: 1250,
    gamesOwned: 87,
    achievementsUnlocked: 342,
    winRate: 68
  });

  const userId = store.user?.id;
  const profilePicInputRef = useRef(null);

  useEffect(() => {
    if (userId) {
      loadGamerProfileFromBackend();
      loadVideoRoomStatus();
      loadCommunicationPreferences();
      loadSteamData();

      if (store.user?.squad_id) {
        loadSquadMembersPresence();
      }
    }
  }, [userId]);

  const loadGamerProfileFromBackend = async () => {
    try {
      const profileData = await getGamerProfile();
      setProfile(profileData);

      if (profileData) {
        setGamertag(profileData.gamertag || "");
        setPlatforms(profileData.gaming_platforms || platforms);
        setCurrentGames(profileData.current_games || []);
        setGamingSchedule(profileData.gaming_schedule || "");
        setSkillLevel(profileData.skill_level || "intermediate");
        setOnlineStatus(profileData.online_status || "online");
        setLookingFor(profileData.looking_for || []);
        setCommunicationPrefs(profileData.communication_prefs || []);
        setAgeRange(profileData.age_range || "");
        setTimezone(profileData.timezone || "");
        setRegion(profileData.region || "");
        setFavoriteGenres(profileData.favorite_genres || []);
        setPlaystyle(profileData.playstyle || "");
        setGameModes(profileData.game_modes || []);
        setSetupDetails(profileData.setup_details || setupDetails);
        setStreamingStatus(profileData.streaming_status || false);
        setStreamingPlatform(profileData.streaming_platform || "");
        setLanguages(profileData.languages_spoken || []);
        setGamerBio(profileData.gamer_bio || "");
        setGamingStats(profileData.gaming_stats || gamingStats);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading gamer profile:", error);
      loadExistingProfile();
      setLoading(false);
    }
  };

  const loadVideoRoomStatus = async () => {
    try {
      const status = await getVideoRoomStatus();
      setVideoRoomStatus(status);
      setTeamRoomAvailable(!!status.squad_room || !!status.private_room);
      setIsInVideoCall(status.user_presence?.online_status === "in_call");
      setCurrentRoomId(status.user_presence?.current_room_id || "");
    } catch (error) {
      console.error("Error loading video room status:", error);
      checkTeamRoomAvailability();
    }
  };

  const loadCommunicationPreferences = async () => {
    try {
      const prefs = await getCommunicationPreferences();
      setCommunicationPrefs(prefs.preferred_communication || []);
    } catch (error) {
      console.error("Error loading communication preferences:", error);
    }
  };

  const loadSquadMembersPresence = async () => {
    try {
      if (store.user?.squad_id) {
        const squadData = await getSquadMembersPresence(store.user.squad_id);
        setSquadMembersOnline(squadData.members_presence || []);
      }
    } catch (error) {
      console.error("Error loading squad members presence:", error);
    }
  };

  const loadExistingProfile = () => {
    const savedProfile = localStorage.getItem(`gamer_profile_${userId}`);
    if (savedProfile) {
      const data = JSON.parse(savedProfile);
      setGamertag(data.gamertag || "");
      setPlatforms(data.platforms || platforms);
      setCurrentGames(data.currentGames || []);
      setGamingSchedule(data.gamingSchedule || "");
      setSkillLevel(data.skillLevel || "intermediate");
      setOnlineStatus(data.onlineStatus || "online");
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
    } else {
      setProfile({
        id: userId,
        username: store.user?.username || "Player",
        gamer_rank: "Competitive",
        favorite_games: ["Valorant", "Minecraft", "Apex Legends"],
        gamer_tags: { steam: "player123", xbox: "PlayerX123" },
        squad_id: store.user?.squad_id || null
      });
    }
  };

  // Steam Integration Functions
  const loadSteamData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/steam/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSteamConnected(true);
        setSteamData(data);

        if (data.profile && !gamertag) {
          setGamertag(data.profile.persona_name);
        }
      } else {
        setSteamConnected(false);
        setSteamData(null);
      }
    } catch (error) {
      console.error('Error loading Steam data:', error);
      setSteamConnected(false);
    }
  };

  const connectSteamAccount = async () => {
    if (!steamId || steamId.trim() === '') {
      alert('Please enter your Steam ID');
      return;
    }

    try {
      setSteamLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/steam/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ steam_id: steamId.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Steam account connected successfully!');
        setShowSteamModal(false);
        setSteamId('');
        await loadSteamData();
      } else {
        alert(`Error: ${data.error || 'Failed to connect Steam account'}`);
      }
    } catch (error) {
      console.error('Error connecting Steam:', error);
      alert('Failed to connect Steam account. Please try again.');
    } finally {
      setSteamLoading(false);
    }
  };

  const disconnectSteam = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Steam account?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/steam/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Steam account disconnected');
        setSteamConnected(false);
        setSteamData(null);
      } else {
        alert('Failed to disconnect Steam account');
      }
    } catch (error) {
      console.error('Error disconnecting Steam:', error);
      alert('Failed to disconnect Steam account');
    }
  };

  const syncSteamData = async () => {
    try {
      setSyncing(true);
      await loadSteamData();
      alert('Steam data refreshed!');
    } catch (error) {
      console.error('Error syncing Steam:', error);
      alert('Failed to refresh Steam data');
    } finally {
      setSyncing(false);
    }
  };

  const checkTeamRoomAvailability = () => {
    setTeamRoomAvailable(true);

    if (store.user?.squad_id) {
      setCurrentRoomId(`squad-${store.user.squad_id}`);
    } else {
      setCurrentRoomId(`user-${userId}-room`);
    }
  };

  const handleJoinTeamRoom = async () => {
    try {
      await updateUserPresence({
        online_status: "in_call",
        gaming_status: "Joining team room"
      });
      navigate('/team-room');
    } catch (error) {
      console.error("Error updating presence:", error);
      navigate('/team-room');
    }
  };

  const handleJoinGamerChatroom = () => {
    navigate('/gamers-chatroom');
  };

  const handleStartVideoChat = async () => {
    try {
      await updateUserPresence({
        online_status: "in_call",
        gaming_status: "Starting video call"
      });
      navigate('/team-room', { state: { autoStartVideo: true } });
    } catch (error) {
      console.error("Error updating presence:", error);
      navigate('/team-room', { state: { autoStartVideo: true } });
    }
  };

  const handleSaveProfile = async () => {
    const gamerProfileData = {
      gamertag,
      gaming_platforms: platforms,
      current_games: currentGames,
      gaming_schedule: gamingSchedule,
      skill_level: skillLevel,
      looking_for: lookingFor,
      communication_prefs: communicationPrefs,
      age_range: ageRange,
      timezone: timezone,
      region: region,
      favorite_genres: favoriteGenres,
      playstyle: playstyle,
      game_modes: gameModes,
      setup_details: setupDetails,
      streaming_status: streamingStatus,
      streaming_platform: streamingPlatform,
      languages_spoken: languages,
      gamer_bio: gamerBio,
      gaming_stats: gamingStats,
      online_status: onlineStatus
    };

    try {
      await updateGamerProfile(userId, gamerProfileData);

      if (communicationPrefs.length > 0) {
        await updateCommunicationPreferences({
          preferred_communication: communicationPrefs
        });
      }

      await updateUserPresence({
        online_status: onlineStatus,
        current_game: currentGames[0] || null
      });

      alert("Profile saved successfully!");
      setIsEditing(false);
      loadVideoRoomStatus();
    } catch (error) {
      console.error("Error saving gamer profile:", error);

      const localData = {
        gamertag, platforms: platforms, currentGames, gamingSchedule, skillLevel, onlineStatus,
        lookingFor, communicationPrefs, ageRange, timezone, region,
        favoriteGenres, playstyle, gameModes, setupDetails,
        streamingStatus, streamingPlatform, languages, gamerBio, gamingStats
      };
      localStorage.setItem(`gamer_profile_${userId}`, JSON.stringify(localData));
      alert("Profile saved locally. Backend save failed.");
      setIsEditing(false);
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

  const getStatusDisplay = () => {
    const statusMap = {
      online: 'Online - Ready to play',
      away: 'Away - Back soon',
      offline: 'Offline'
    };
    return statusMap[onlineStatus] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="gamer-profile">
        <div className="loading-container">
          <p>Loading gamer profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gamer-profile">
      <div className="profile-mode-toggle">
        <button
          className={`mode-toggle-btn ${!isGamerMode ? 'active' : ''}`}
          onClick={() => setIsGamerMode(false)}
        >
          Regular Profile
        </button>
        <button
          className={`mode-toggle-btn ${isGamerMode ? 'active' : ''}`}
          onClick={() => setIsGamerMode(true)}
        >
          Gamer Profile
        </button>
      </div>

      {!isGamerMode ? (
        <div className="redirect-message">
          <h2>Regular Profile Mode</h2>
          <p>Switch to your regular profile view</p>
          <Link to="/profile" className="btn btn-primary">Go to Regular Profile</Link>
        </div>
      ) : (
        <>
          <div className="profile-header-section">
            <div className="cover-photo-container gaming-cover">
              <div className="gaming-overlay">
                <h1>GAMER PROFILE</h1>
                <p>Level up your gaming experience</p>
              </div>
            </div>

            <div className="profile-avatar-toggle-horizontal">
              <div className="profile-avatar-section">
                <img
                  src={profile.avatar_url || "/default-gamer-avatar.png"}
                  alt="Gamer Avatar"
                  className="profile-pic gamer-avatar"
                />
                <button
                  className="avatar-toggle-btn"
                  onClick={() => profilePicInputRef.current.click()}
                  title="Upload Avatar"
                >
                  📷
                </button>
                <input ref={profilePicInputRef} type="file" style={{ display: 'none' }} />
              </div>

              <div className="profile-name-inline">
                <div className="name-display">
                  <h2 className="profile-name-label">
                    {gamertag || profile.username || "Your Gamertag"}
                  </h2>
                  <span className="gamer-rank">Rank: {profile.gamer_rank || skillLevel}</span>
                </div>
              </div>

              <div className="profile-quick-actions">
                <button
                  className={`quick-action-btn ${isEditing ? 'active' : ''}`}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'View' : 'Edit'}
                </button>
                <button className="quick-action-btn">Message</button>
                <button
                  className="quick-action-btn primary"
                  onClick={handleStartVideoChat}
                >
                  Start Video Chat
                </button>
              </div>
            </div>
          </div>

          <div className="profile-main-content">
            <div className="profile-sidebar">
              <div className="sidebar-section">
                <h4>Video Chat & Rooms</h4>
                <div className="video-chat-quick-access">
                  <div className="chat-status">
                    <span className={`status-dot ${isInVideoCall ? 'online' : 'offline'}`}></span>
                    <span>{isInVideoCall ? 'In Video Call' : 'Available for Chat'}</span>
                    {squadMembersOnline.length > 0 && (
                      <small>{squadMembersOnline.filter(m => m.online_status === 'online').length} squad members online</small>
                    )}
                  </div>

                  <div className="chat-actions">
                    <button
                      className="chat-room-btn team-room"
                      onClick={handleJoinTeamRoom}
                      title="Join your team's video chat room"
                    >
                      <span className="btn-icon">🎯</span>
                      <span>Team Room</span>
                      {profile.squad_id && <span className="squad-indicator">Squad {profile.squad_id}</span>}
                      {videoRoomStatus?.squad_room?.is_active && (
                        <span className="room-active-indicator">Active</span>
                      )}
                    </button>

                    <button
                      className="chat-room-btn gamer-chat"
                      onClick={handleJoinGamerChatroom}
                      title="Join general gamer chatroom"
                    >
                      <span className="btn-icon">💬</span>
                      <span>Gamer Chat</span>
                    </button>

                    <button
                      className="chat-room-btn video-call primary"
                      onClick={handleStartVideoChat}
                      title="Start video call in team room"
                    >
                      <span className="btn-icon">📹</span>
                      <span>Video Call</span>
                    </button>
                  </div>

                  {currentRoomId && (
                    <div className="room-info">
                      <small>Room ID: {currentRoomId}</small>
                    </div>
                  )}
                </div>
              </div>

              <div className="sidebar-section">
                <h4>Gaming Stats</h4>
                <div className="gamer-stats-sidebar">
                  <div className="gamer-quick-stats">
                    <div className="quick-stat-item">
                      <span className="quick-stat-number">{gamingStats.hoursPlayed}</span>
                      <span className="quick-stat-label">Hours</span>
                    </div>
                    <div className="quick-stat-item">
                      <span className="quick-stat-number">{gamingStats.gamesOwned}</span>
                      <span className="quick-stat-label">Games</span>
                    </div>
                    <div className="quick-stat-item">
                      <span className="quick-stat-number">{gamingStats.achievementsUnlocked}</span>
                      <span className="quick-stat-label">Achievements</span>
                    </div>
                    <div className="quick-stat-item">
                      <span className="quick-stat-number">{gamingStats.winRate}%</span>
                      <span className="quick-stat-label">Win Rate</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <h4>Gaming Status</h4>
                <div className="current-gaming-status">
                  <div className="gaming-status-indicator">
                    <span className={`status-dot ${onlineStatus}`}></span>
                    <span>{getStatusDisplay()}</span>
                  </div>
                  {currentGames.length > 0 && (
                    <div className="current-game">
                      <strong>Playing:</strong> {currentGames[0]}
                    </div>
                  )}
                  {isEditing && (
                    <div style={{ marginTop: '12px' }}>
                      <select
                        value={onlineStatus}
                        onChange={(e) => setOnlineStatus(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #4a9eff', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                      >
                        <option value="online" style={{ background: '#1a1a2e', color: 'white' }}>Online</option>
                        <option value="away" style={{ background: '#1a1a2e', color: 'white' }}>Away</option>
                        <option value="offline" style={{ background: '#1a1a2e', color: 'white' }}>Offline</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="sidebar-section">
                <h4>Communication</h4>
                <div className="communication-quick-view">
                  <div className="comm-prefs">
                    {communicationPrefs.map((pref, index) => (
                      <span key={index} className="comm-badge">{pref}</span>
                    ))}
                    {communicationPrefs.length === 0 && (
                      <span className="no-prefs">Not set</span>
                    )}
                  </div>
                  <div className="webrtc-capabilities">
                    <div className="capability-item">
                      <span className="capability-icon">📹</span>
                      <span>Video Chat Ready</span>
                    </div>
                    <div className="capability-item">
                      <span className="capability-icon">🎙️</span>
                      <span>Voice Chat Ready</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <h4>Platforms</h4>
                <div className="platforms-quick-view">
                  <div className="platform-icons-row">
                    <div className={`platform-icon-item ${platforms.pc ? 'active' : 'inactive'}`}>
                      <span>💻</span>
                      <span>PC</span>
                    </div>
                    <div className={`platform-icon-item ${platforms.playstation ? 'active' : 'inactive'}`}>
                      <span>🎮</span>
                      <span>PS</span>
                    </div>
                    <div className={`platform-icon-item ${platforms.xbox ? 'active' : 'inactive'}`}>
                      <span>🎯</span>
                      <span>Xbox</span>
                    </div>
                    <div className={`platform-icon-item ${platforms.nintendo ? 'active' : 'inactive'}`}>
                      <span>🕹️</span>
                      <span>Switch</span>
                    </div>
                    <div className={`platform-icon-item ${platforms.mobile ? 'active' : 'inactive'}`}>
                      <span>📱</span>
                      <span>Mobile</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <h4>Player Info</h4>
                <div className="player-info-quick">
                  <div className="info-row">
                    <span className="info-label">Skill:</span>
                    <span className="info-value">{skillLevel}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Style:</span>
                    <span className="info-value">{playstyle || 'Not set'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Region:</span>
                    <span className="info-value">{region || 'Not set'}</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <h4>Schedule</h4>
                <div className="gaming-schedule-quick">
                  {!isEditing ? (
                    <>
                      <p>{gamingSchedule || "No schedule set"}</p>
                      <div className="timezone-info">
                        <small>{timezone || "Timezone not set"}</small>
                      </div>
                    </>
                  ) : (
                    <>
                      <textarea
                        rows={3}
                        value={gamingSchedule}
                        onChange={(e) => setGamingSchedule(e.target.value)}
                        placeholder="When are you usually online? (e.g., Weekdays 7-10 PM EST)"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #4a9eff', background: 'rgba(255,255,255,0.1)', color: 'white', marginBottom: '8px' }}
                      />
                      <input
                        type="text"
                        placeholder="Timezone (e.g., EST, PST, GMT)"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #4a9eff', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="sidebar-section">
                <h4>🎮 Steam Integration</h4>
                {steamConnected && steamData ? (
                  <div className="steam-connected">
                    <div className="steam-profile">
                      {steamData.profile && (
                        <>
                          <img
                            src={steamData.profile.avatar_url || '/default-avatar.jpg'}
                            alt="Steam Avatar"
                            className="steam-avatar"
                            onError={(e) => e.target.src = '/default-avatar.jpg'}
                          />
                          <div className="steam-info">
                            <p className="steam-username"><strong>{steamData.profile.persona_name}</strong></p>
                            <p className="steam-status">
                              {steamData.profile.game_extra_info
                                ? `🎮 ${steamData.profile.game_extra_info}`
                                : steamData.profile.online_status || 'offline'}
                            </p>
                            {steamData.profile.location && (
                              <p className="steam-location">📍 {steamData.profile.location}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {steamData.profile?.games_owned !== undefined && (
                      <div className="steam-stats">
                        <div className="stat-item">
                          <span className="stat-label">Games</span>
                          <span className="stat-value">{steamData.profile.games_owned}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Hours</span>
                          <span className="stat-value">{steamData.profile.total_hours}h</span>
                        </div>
                      </div>
                    )}

                    {steamData.profile?.top_games && steamData.profile.top_games.length > 0 && (
                      <div className="steam-top-games">
                        <h5>Top Games</h5>
                        <ul>
                          {steamData.profile.top_games.slice(0, 3).map((game, idx) => (
                            <li key={idx}>
                              <span className="game-name">{game.name}</span>
                              <span className="game-hours">{game.hours}h</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {steamData.profile?.recently_played && steamData.profile.recently_played.length > 0 && (
                      <div className="steam-recent-games">
                        <h5>Recently Played</h5>
                        <ul>
                          {steamData.profile.recently_played.slice(0, 3).map((game, idx) => (
                            <li key={idx}>
                              <span className="game-name">{game.name}</span>
                              <span className="game-hours">{game.hours_2weeks}h</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="steam-actions">
                      <button
                        onClick={syncSteamData}
                        disabled={syncing}
                        className="btn-steam-sync"
                      >
                        {syncing ? '⏳ Refreshing...' : '🔄 Refresh'}
                      </button>

                      {steamData.profile?.profile_url && (
                        <a
                          href={steamData.profile.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-steam-profile"
                        >
                          View Steam Profile
                        </a>
                      )}

                      <button
                        onClick={disconnectSteam}
                        className="btn-steam-disconnect"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="steam-not-connected">
                    <p>Connect your Steam account to display your gaming stats!</p>
                    <button
                      onClick={() => setShowSteamModal(true)}
                      className="btn-connect-steam"
                    >
                      🎮 Connect Steam
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-content-area">
              <div className="content-tabs-main">
                <button
                  className={`content-tab-main ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`content-tab-main ${activeTab === 'games' ? 'active' : ''}`}
                  onClick={() => setActiveTab('games')}
                >
                  Games & Preferences
                </button>
                <button
                  className={`content-tab-main ${activeTab === 'social' ? 'active' : ''}`}
                  onClick={() => setActiveTab('social')}
                >
                  Social & Team
                </button>
                <button
                  className={`content-tab-main ${activeTab === 'setup' ? 'active' : ''}`}
                  onClick={() => setActiveTab('setup')}
                >
                  Setup & Streaming
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="tab-content">
                  <div className="gaming-card">
                    <h3>About {gamertag || 'Gamer'}</h3>
                    <div className="info-section">
                      <label>Bio:</label>
                      {!isEditing ? (
                        <p>{gamerBio || "Share your gaming story..."}</p>
                      ) : (
                        <textarea
                          rows={4}
                          value={gamerBio}
                          onChange={(e) => setGamerBio(e.target.value)}
                          placeholder="Tell other gamers about yourself..."
                        />
                      )}
                    </div>
                  </div>

                  <div className="gaming-card">
                    <h3>Current Games</h3>
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

                  <div className="gaming-card">
                    <h3>Essential Info</h3>
                    <div className="info-section">
                      <label>Gamertag:</label>
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

                    <div className="info-section">
                      <label>Skill Level:</label>
                      {!isEditing ? (
                        <p>{skillLevel}</p>
                      ) : (
                        <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="competitive">Competitive</option>
                          <option value="pro">Professional</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'games' && (
                <div className="tab-content">
                  <div className="gaming-card">
                    <h3>Gaming Preferences</h3>

                    <div className="info-section">
                      <label>Favorite Genres:</label>
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
                      <label>Playstyle:</label>
                      {!isEditing ? (
                        <p>{playstyle || "Not set"}</p>
                      ) : (
                        <select value={playstyle} onChange={(e) => setPlaystyle(e.target.value)}>
                          <option value="">Select playstyle</option>
                          <option value="aggressive">Aggressive</option>
                          <option value="strategic">Strategic</option>
                          <option value="supportive">Supportive</option>
                          <option value="casual">Casual</option>
                          <option value="competitive">Competitive</option>
                        </select>
                      )}
                    </div>

                    <div className="info-section">
                      <label>Game Modes:</label>
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

                  <div className="gaming-card">
                    <h3>Platforms</h3>
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
                              onChange={(e) => setPlatforms({ ...platforms, [platform]: e.target.checked })}
                            />
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="tab-content">
                  <div className="gaming-card">
                    <h3>Video Chat & Team Rooms</h3>

                    <div className="info-section">
                      <label>Quick Access:</label>
                      <div className="video-chat-integration">
                        <div className="chat-room-grid">
                          <div className="chat-room-option">
                            <h4>Team Room</h4>
                            <p>Join your squad's dedicated video chat room with screen sharing and collaboration tools.</p>
                            <button className="chat-access-btn team" onClick={handleJoinTeamRoom}>
                              Join Team Room
                            </button>
                            {profile.squad_id && (
                              <small>Squad ID: {profile.squad_id}</small>
                            )}
                          </div>

                          <div className="chat-room-option">
                            <h4>Gamer Chatroom</h4>
                            <p>Connect with other gamers in the general community chat room.</p>
                            <button className="chat-access-btn gamer" onClick={handleJoinGamerChatroom}>
                              Join Gamer Chat
                            </button>
                          </div>

                          <div className="chat-room-option">
                            <h4>Video Call</h4>
                            <p>Start an instant video call with your team or friends.</p>
                            <button className="chat-access-btn video" onClick={handleStartVideoChat}>
                              Start Video Call
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="gaming-card">
                    <h3>Social & Team</h3>

                    <div className="info-section">
                      <label>Looking For:</label>
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
                      <label>Communication:</label>
                      <div className="tag-grid">
                        {['Voice Chat', 'Text Only', 'Discord', 'In-game Chat', 'Video Chat'].map(option => (
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

                    <div className="info-section">
                      <label>Age Range:</label>
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

                    <div className="info-section">
                      <label>Region:</label>
                      {!isEditing ? (
                        <p>{region || "Not set"}</p>
                      ) : (
                        <input
                          type="text"
                          placeholder="Region (e.g., North America, EU West)"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'setup' && (
                <div className="tab-content">
                  <div className="gaming-card">
                    <h3>Setup & Streaming</h3>

                    <div className="info-section">
                      <label>Setup Details:</label>
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
                            onChange={(e) => setSetupDetails({ ...setupDetails, headset: e.target.value })}
                            style={{ marginBottom: '8px' }}
                          />
                          <input
                            type="text"
                            placeholder="Controller type"
                            value={setupDetails.controller}
                            onChange={(e) => setSetupDetails({ ...setupDetails, controller: e.target.value })}
                            style={{ marginBottom: '8px' }}
                          />
                          <input
                            type="text"
                            placeholder="Other equipment"
                            value={setupDetails.other}
                            onChange={(e) => setSetupDetails({ ...setupDetails, other: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="info-section">
                      <label>Streaming:</label>
                      {!isEditing ? (
                        <p>{streamingStatus ? `Yes - ${streamingPlatform}` : "No"}</p>
                      ) : (
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
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
                      <label>Languages:</label>
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

                  <div className="gaming-card">
                    <h3>Video Chat Capabilities</h3>
                    <div className="webrtc-capabilities-overview">
                      <div className="capability-list">
                        <div className="capability-item">
                          <span className="capability-icon">📹</span>
                          <div className="capability-info">
                            <strong>HD Video Chat</strong>
                            <p>High-quality video communication with team members</p>
                          </div>
                        </div>
                        <div className="capability-item">
                          <span className="capability-icon">🎙️</span>
                          <div className="capability-info">
                            <strong>Crystal Clear Audio</strong>
                            <p>Professional gaming headset compatible</p>
                          </div>
                        </div>
                        <div className="capability-item">
                          <span className="capability-icon">🖥️</span>
                          <div className="capability-info">
                            <strong>Screen Sharing</strong>
                            <p>Share gameplay, strategies, or desktop with teammates</p>
                          </div>
                        </div>
                        <div className="capability-item">
                          <span className="capability-icon">👥</span>
                          <div className="capability-info">
                            <strong>Multi-User Rooms</strong>
                            <p>Support for squad rooms and large group chats</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="save-section">
                  <button onClick={handleSaveProfile} className="btn-primary gamer-save">
                    Save Gamer Profile
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showSteamModal && (
        <div className="modal-overlay" onClick={() => setShowSteamModal(false)}>
          <div className="modal-content steam-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎮 Connect Steam Account</h3>
              <button className="modal-close" onClick={() => setShowSteamModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <p>Enter your Steam ID to connect your account</p>

              <div className="steam-id-input-group">
                <input
                  type="text"
                  placeholder="Steam ID (e.g., 76561199662379942)"
                  value={steamId}
                  onChange={(e) => setSteamId(e.target.value)}
                  className="steam-id-input"
                  disabled={steamLoading}
                />
              </div>

              <div className="steam-help">
                <p><strong>How to find your Steam ID:</strong></p>
                <ol>
                  <li>Go to your Steam profile</li>
                  <li>Look at the URL in your browser</li>
                  <li>Copy the 17-digit number after /profiles/</li>
                  <li>Example: steamcommunity.com/profiles/<strong>76561199662379942</strong></li>
                </ol>
                <p>
                  <strong>Or use:</strong>{' '}
                  <a href="https://steamid.io/" target="_blank" rel="noopener noreferrer">
                    SteamID.io
                  </a>
                  {' '}to find your Steam ID
                </p>

                <div className="steam-privacy-note">
                  <strong>⚠️ Important:</strong> Your Steam profile must be set to <strong>PUBLIC</strong> for this to work.
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={connectSteamAccount}
                className="btn-primary"
                disabled={steamLoading || !steamId.trim()}
              >
                {steamLoading ? 'Connecting...' : 'Connect Steam'}
              </button>
              <button
                onClick={() => setShowSteamModal(false)}
                className="btn-secondary"
                disabled={steamLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamerProfilePage;