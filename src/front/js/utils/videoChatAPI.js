// Create this file: src/front/js/utils/videoChatAPI.js
// Video Chat API functions for the gamer profile integration

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

// Get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

// Video Room Status and Management
export const getVideoRoomStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/video-rooms/status`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching video room status:", error);
    throw error;
  }
};

export const joinVideoRoom = async (roomId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/video-rooms/join`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ room_id: roomId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error joining video room:", error);
    throw error;
  }
};

export const leaveVideoRoom = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/video-rooms/leave`, {
      method: "POST",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error leaving video room:", error);
    throw error;
  }
};

export const getActiveVideoRooms = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/video-rooms/active`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching active video rooms:", error);
    throw error;
  }
};

// User Presence Management
export const updateUserPresence = async (presenceData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/user-presence/update`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(presenceData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating user presence:", error);
    throw error;
  }
};

export const getSquadMembersPresence = async (squadId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/squad/${squadId}/members/presence`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching squad members presence:", error);
    throw error;
  }
};

// Communication Preferences
export const getCommunicationPreferences = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/communication-preferences`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching communication preferences:", error);
    throw error;
  }
};

export const updateCommunicationPreferences = async (preferences) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/communication-preferences`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(preferences)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating communication preferences:", error);
    throw error;
  }
};

// Existing Gamer Profile API (enhanced)
export const updateGamerProfile = async (userId, profileData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/user/gamer-profile`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating gamer profile:", error);
    throw error;
  }
};

export const getGamerProfile = async (userId = null) => {
  try {
    const endpoint = userId
      ? `${BACKEND_URL}/api/user/${userId}/gamer-profile`
      : `${BACKEND_URL}/api/user/profile`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching gamer profile:", error);
    throw error;
  }
};

// Real-time Socket.IO integration helpers
export const initializeVideoSocketListeners = (socket, callbacks = {}) => {
  if (!socket) return;

  // User joined room
  socket.on('user_joined_room', (data) => {
    if (callbacks.onUserJoined) {
      callbacks.onUserJoined(data);
    }
  });

  // User left room
  socket.on('user_left_room', (data) => {
    if (callbacks.onUserLeft) {
      callbacks.onUserLeft(data);
    }
  });

  // User status update
  socket.on('user_status_update', (data) => {
    if (callbacks.onStatusUpdate) {
      callbacks.onStatusUpdate(data);
    }
  });

  return () => {
    socket.off('user_joined_room');
    socket.off('user_left_room');
    socket.off('user_status_update');
  };
};

export const emitVideoRoomJoin = (socket, roomId, userId) => {
  if (socket) {
    socket.emit('join_video_room', {
      room_id: roomId,
      user_id: userId
    });
  }
};

export const emitVideoRoomLeave = (socket, roomId, userId) => {
  if (socket) {
    socket.emit('leave_video_room', {
      room_id: roomId,
      user_id: userId
    });
  }
};

export const emitVideoStatusUpdate = (socket, roomId, userId, videoEnabled, audioEnabled) => {
  if (socket) {
    socket.emit('update_video_status', {
      room_id: roomId,
      user_id: userId,
      video_enabled: videoEnabled,
      audio_enabled: audioEnabled
    });
  }
};