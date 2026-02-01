// src/front/js/pages/Dashboard/DashboardGaming.js
// Gaming Hub — Command center for all gaming features
// NOT a profile mirror — this is the operational hub
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Context } from '../../store/appContext';
import {
  getVideoRoomStatus,
  updateUserPresence,
  getGamerProfile,
  getSquadMembersPresence
} from '../../utils/videoChatAPI';
import {
  FaGamepad,
  FaDesktop,
  FaPlaystation,
  FaXbox,
  FaSteam,
  FaMobileAlt,
  FaSearch,
  FaEdit,
  FaVideo,
  FaSync,
  FaSignInAlt
} from 'react-icons/fa';
import "../../../styles/DashboardGaming.css";

const DashboardGaming = ({ user }) => {
  const { store } = useContext(Context);
  const navigate = useNavigate();

  // Loading / profile state
  const [loading, setLoading] = useState(true);
  const [gamerProfile, setGamerProfile] = useState(null);

  // Live hub state
  const [squadMembers, setSquadMembers] = useState([]);
  const [videoRoomStatus, setVideoRoomStatus] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState('online');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const hasGamerProfile = user?.is_gamer === true ||
    user?.profile_type === 'gamer' ||
    user?.profile_type === 'multiple';

  // ============================================================
  // LOAD ALL HUB DATA
  // ============================================================
  useEffect(() => {
    if (hasGamerProfile) {
      loadGamingHub();
    } else {
      setLoading(false);
    }
  }, []);

  // Auto-refresh squad presence & room status every 15s
  useEffect(() => {
    if (!hasGamerProfile) return;
    const interval = setInterval(() => {
      refreshSquadPresence();
      refreshRoomStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [hasGamerProfile]);

  const loadGamingHub = async () => {
    try {
      setLoading(true);

      // Load all hub data in parallel
      const [profileResult, roomResult] = await Promise.allSettled([
        getGamerProfile(),
        getVideoRoomStatus()
      ]);

      if (profileResult.status === 'fulfilled' && profileResult.value) {
        setGamerProfile(profileResult.value);
        setOnlineStatus(profileResult.value.online_status || 'online');
      }

      if (roomResult.status === 'fulfilled') {
        setVideoRoomStatus(roomResult.value);
      }

      // Load squad if in one
      if (store.user?.squad_id) {
        try {
          const squadData = await getSquadMembersPresence(store.user.squad_id);
          setSquadMembers(squadData.members_presence || []);
        } catch (e) {
          console.error("Squad presence error:", e);
        }
      }
    } catch (error) {
      console.error("Error loading gaming hub:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSquadPresence = async () => {
    if (!store.user?.squad_id) return;
    try {
      const squadData = await getSquadMembersPresence(store.user.squad_id);
      setSquadMembers(squadData.members_presence || []);
    } catch (e) { /* silent */ }
  };

  const refreshRoomStatus = async () => {
    try {
      const status = await getVideoRoomStatus();
      setVideoRoomStatus(status);
    } catch (e) { /* silent */ }
  };

  // ============================================================
  // STATUS CONTROLS
  // ============================================================
  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    setOnlineStatus(newStatus);
    try {
      await updateUserPresence({
        online_status: newStatus,
        current_game: gamerProfile?.current_games?.[0] || null
      });
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleJoinRoom = async (destination, options = {}) => {
    try {
      await updateUserPresence({
        online_status: "in_call",
        gaming_status: `Joining ${destination}`
      });
    } catch (e) {
      console.error("Presence update error:", e);
    }
    navigate(destination, options);
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#00ff88';
      case 'in_game': return '#4a9eff';
      case 'in_call': return '#ff6b35';
      case 'away': return '#ffa500';
      default: return '#666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'in_game': return 'In Game';
      case 'in_call': return 'In Call';
      case 'away': return 'Away';
      default: return 'Offline';
    }
  };

  const getPlatformIcon = (platform) => {
    const lower = (platform || '').toLowerCase();
    if (lower.includes('pc')) return <FaDesktop />;
    if (lower.includes('playstation') || lower.includes('ps')) return <FaPlaystation />;
    if (lower.includes('xbox')) return <FaXbox />;
    if (lower.includes('steam')) return <FaSteam />;
    if (lower.includes('mobile')) return <FaMobileAlt />;
    return <FaGamepad />;
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
        <p>Loading gaming hub...</p>
      </div>
    );
  }

  // ============================================================
  // NO GAMER PROFILE — ENABLE PROMPT
  // ============================================================
  if (!hasGamerProfile) {
    return (
      <div className="gaming-tab">
        <div className="gaming-enable-prompt">
          <div className="enable-prompt-glow"></div>
          <div className="enable-prompt-icon">🎮</div>
          <h3>Unlock Your Gaming Hub</h3>
          <p>
            Enable your gamer profile to access chatrooms, team rooms,
            squad finder, video calls, and the gaming community.
          </p>
          <div className="enable-features-preview">
            {[
              { icon: '💬', name: 'Gamer Chatrooms', desc: 'Real-time chat with gamers' },
              { icon: '🧑‍🤝‍🧑', name: 'Team Rooms', desc: 'Private squad voice & video' },
              { icon: '🔍', name: 'Squad Finder', desc: 'Match with teammates' },
              { icon: '📹', name: 'Video Calls', desc: 'Screen share & co-op' },
              { icon: '🏆', name: 'Gaming Stats', desc: 'Track your progress' },
              { icon: '🎯', name: 'Steam Integration', desc: 'Sync your Steam library' },
            ].map((f, i) => (
              <div key={i} className="enable-feature-item">
                <span className="ef-icon">{f.icon}</span>
                <div className="ef-text">
                  <strong>{f.name}</strong>
                  <small>{f.desc}</small>
                </div>
              </div>
            ))}
          </div>
          <Link to="/add-profile-type" className="btn-enable-gaming">
            <FaGamepad /> Enable Gamer Profile
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // HAS GAMER PROFILE — GAMING HUB
  // ============================================================
  const stats = gamerProfile?.gaming_stats || {};
  const currentGames = gamerProfile?.current_games || [];
  const platforms = gamerProfile?.gaming_platforms || {};
  const activePlatforms = Object.entries(platforms).filter(([_, v]) => v);
  const squadOnline = squadMembers.filter(
    m => m.online_status === 'online' || m.online_status === 'in_game'
  );
  const squadInGame = squadMembers.filter(m => m.online_status === 'in_game');
  const teamRoomActive = videoRoomStatus?.squad_room?.is_active || false;
  const activeRoomCount =
    (teamRoomActive ? 1 : 0) + (videoRoomStatus?.active_rooms?.length || 0);

  return (
    <div className="gaming-tab">

      {/* ====== STATUS BAR ====== */}
      <div className="gaming-hub-status-bar">
        <div className="hub-status-left">
          <div className="hub-status-selector">
            <span
              className="hub-status-dot"
              style={{ background: getStatusColor(onlineStatus) }}
            ></span>
            <select
              className="hub-status-dropdown"
              value={onlineStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
            >
              <option value="online">🟢 Online</option>
              <option value="away">🟡 Away</option>
              <option value="offline">⚫ Offline</option>
            </select>
          </div>
          {gamerProfile?.gamertag && (
            <span className="hub-gamertag">
              <FaGamepad /> {gamerProfile.gamertag}
            </span>
          )}
          {gamerProfile?.skill_level && (
            <span className="hub-skill-badge">{gamerProfile.skill_level}</span>
          )}
          {currentGames.length > 0 && (
            <span className="hub-playing-badge">
              🎮 Playing: {currentGames[0]}
            </span>
          )}
        </div>
        <div className="hub-status-right">
          <Link
            to={`/gamer/${user?.id || gamerProfile?.id}`}
            className="hub-edit-profile-btn"
          >
            <FaEdit /> Gamer Profile
          </Link>
        </div>
      </div>

      {/* ====== MAIN HUB GRID ====== */}
      <div className="gaming-hub-grid">

        {/* ---- LEFT COLUMN: Rooms & Actions ---- */}
        <div className="hub-left-col">

          {/* Quick Join */}
          <div className="hub-section hub-quick-join">
            <h3>🚀 Quick Join</h3>
            <div className="hub-join-grid">
              <button
                className="hub-join-card chatroom"
                onClick={() => handleJoinRoom('/gamers/chat')}
              >
                <div className="join-card-top">
                  <span className="join-icon">💬</span>
                  <span className="join-label">Gamer Chatrooms</span>
                </div>
                <span className="join-sublabel">Join the conversation</span>
              </button>

              <button
                className={`hub-join-card team-room ${teamRoomActive ? 'room-active' : ''}`}
                onClick={() => handleJoinRoom('/team-room')}
              >
                <div className="join-card-top">
                  <span className="join-icon">🧑‍🤝‍🧑</span>
                  <span className="join-label">Team Room</span>
                  {teamRoomActive && <span className="live-badge">LIVE</span>}
                </div>
                <span className="join-sublabel">
                  {teamRoomActive ? 'Room is active — join now' : 'Voice & video with your squad'}
                </span>
              </button>

              <button
                className="hub-join-card squad-finder"
                onClick={() => handleJoinRoom('/squad-finder')}
              >
                <div className="join-card-top">
                  <span className="join-icon">🔍</span>
                  <span className="join-label">Squad Finder</span>
                </div>
                <span className="join-sublabel">Find teammates</span>
              </button>

              <button
                className="hub-join-card video-call"
                onClick={() =>
                  handleJoinRoom('/team-room', { state: { autoStartVideo: true } })
                }
              >
                <div className="join-card-top">
                  <span className="join-icon">📹</span>
                  <span className="join-label">Video Call</span>
                </div>
                <span className="join-sublabel">Screen share & co-op</span>
              </button>
            </div>
          </div>

          {/* Active Rooms */}
          <div className="hub-section hub-room-status">
            <h3>📡 Active Rooms</h3>
            {activeRoomCount > 0 ? (
              <div className="room-status-list">
                {teamRoomActive && (
                  <div className="room-status-item active">
                    <div className="room-status-info">
                      <span className="room-status-dot live"></span>
                      <div>
                        <strong>Team Room</strong>
                        {gamerProfile?.squad_id && (
                          <small>Squad #{gamerProfile.squad_id}</small>
                        )}
                      </div>
                    </div>
                    <button
                      className="room-join-btn"
                      onClick={() => handleJoinRoom('/team-room')}
                    >
                      <FaSignInAlt /> Join
                    </button>
                  </div>
                )}
                {videoRoomStatus?.active_rooms?.map((room, idx) => (
                  <div key={idx} className="room-status-item active">
                    <div className="room-status-info">
                      <span className="room-status-dot live"></span>
                      <div>
                        <strong>{room.name || `Room ${idx + 1}`}</strong>
                        <small>{room.participants || 0} in room</small>
                      </div>
                    </div>
                    <button
                      className="room-join-btn"
                      onClick={() => handleJoinRoom('/team-room')}
                    >
                      <FaSignInAlt /> Join
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="room-status-empty">
                <p>No active rooms right now</p>
                <button
                  className="start-room-btn"
                  onClick={() =>
                    handleJoinRoom('/team-room', { state: { autoStartVideo: true } })
                  }
                >
                  <FaVideo /> Start a Room
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---- RIGHT COLUMN: Squad & Stats ---- */}
        <div className="hub-right-col">

          {/* Squad Online Widget */}
          <div className="hub-section hub-squad-widget">
            <div className="squad-widget-header">
              <h3>👥 Squad Online</h3>
              <button
                className="squad-refresh-btn"
                onClick={refreshSquadPresence}
                title="Refresh"
              >
                <FaSync />
              </button>
            </div>

            {squadMembers.length > 0 ? (
              <>
                <div className="squad-online-count">
                  <span className="online-count-number">{squadOnline.length}</span>
                  <span className="online-count-label">
                    / {squadMembers.length} online
                  </span>
                </div>

                <div className="squad-members-list">
                  {squadMembers
                    .sort((a, b) => {
                      const order = { online: 0, in_game: 0, in_call: 1, away: 2, offline: 3 };
                      return (order[a.online_status] || 3) - (order[b.online_status] || 3);
                    })
                    .map((member, idx) => (
                      <div key={idx} className={`squad-member-row ${member.online_status}`}>
                        <span
                          className="squad-member-dot"
                          style={{ background: getStatusColor(member.online_status) }}
                        ></span>
                        <div className="squad-member-info">
                          <span className="squad-member-name">
                            {member.gamertag || member.username}
                          </span>
                          {member.current_game && (
                            <span className="squad-member-game">
                              🎮 {member.current_game}
                            </span>
                          )}
                        </div>
                        <span className="squad-member-status-label">
                          {getStatusLabel(member.online_status)}
                        </span>
                      </div>
                    ))}
                </div>

                {squadInGame.length > 0 && (
                  <div className="squad-in-game-summary">
                    <small>
                      🎮 {squadInGame.length} member{squadInGame.length > 1 ? 's' : ''} in game
                    </small>
                  </div>
                )}
              </>
            ) : gamerProfile?.squad_id ? (
              <div className="squad-empty-state">
                <p>No squad members found</p>
                <small>Your squad mates will appear here when online</small>
              </div>
            ) : (
              <div className="squad-empty-state">
                <p>You're not in a squad yet</p>
                <button
                  className="find-squad-btn"
                  onClick={() => navigate('/squad-finder')}
                >
                  <FaSearch /> Find a Squad
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="hub-section hub-quick-stats">
            <h3>📊 My Stats</h3>
            <div className="hub-stats-mini-grid">
              <div className="hub-stat-mini">
                <span className="stat-mini-value">{stats.hoursPlayed || 0}</span>
                <span className="stat-mini-label">Hours</span>
              </div>
              <div className="hub-stat-mini">
                <span className="stat-mini-value">
                  {stats.gamesOwned || currentGames.length || 0}
                </span>
                <span className="stat-mini-label">Games</span>
              </div>
              <div className="hub-stat-mini">
                <span className="stat-mini-value">{stats.achievementsUnlocked || 0}</span>
                <span className="stat-mini-label">Achievements</span>
              </div>
              <div className="hub-stat-mini">
                <span className="stat-mini-value">{stats.winRate || 0}%</span>
                <span className="stat-mini-label">Win Rate</span>
              </div>
            </div>
          </div>

          {/* Currently Playing */}
          {currentGames.length > 0 && (
            <div className="hub-section hub-playing-now">
              <h3>🎮 Currently Playing</h3>
              <div className="hub-games-list">
                {currentGames.map((game, idx) => (
                  <div key={idx} className="hub-game-item">
                    <FaGamepad className="hub-game-icon" />
                    <span>{game}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platforms */}
          {activePlatforms.length > 0 && (
            <div className="hub-section hub-platforms">
              <h3>🖥️ Platforms</h3>
              <div className="hub-platform-pills">
                {activePlatforms.map(([platform]) => (
                  <span key={platform} className="hub-platform-pill">
                    {getPlatformIcon(platform)}
                    <span>{platform}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardGaming;