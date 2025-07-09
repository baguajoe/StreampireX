// export const getGamerProfile = async (userId) => {
//   const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/gamer-profile/${userId}`);
//   if (!res.ok) throw new Error("Failed to load profile");
//   return res.json();
// };


// export const getGamerProfile = async (userId) => {
//   const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/gamer-profile/${userId}`);
  
//   // Check if response is ok first
//   if (!res.ok) {
//     const errorText = await res.text();
//     console.error("API Error:", res.status, errorText);
//     throw new Error(`Failed to load profile: ${res.status} ${res.statusText}`);
//   }
  
//   // Check if response is JSON
//   const contentType = res.headers.get("content-type");
//   if (!contentType || !contentType.includes("application/json")) {
//     const htmlResponse = await res.text();
//     console.error("Received HTML instead of JSON:", htmlResponse);
//     throw new Error("Server returned HTML instead of JSON");
//   }
  
//   return res.json();
// };


export const getGamerProfile = async (userId) => {
  const token = localStorage.getItem("token");
  
  // Use the same fallback URL pattern as ProfilePage
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
  const url = `${backendUrl}/api/gamer-profile/${userId}`;
  
  console.log("Making gamer profile request to:", url);
  console.log("Token available:", !!token);
  
  const headers = {
    "Content-Type": "application/json"
  };
  
  // Add auth header if token exists (following ProfilePage pattern)
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method: "GET",
    headers: headers,
  });
  
  console.log("Gamer profile response status:", res.status);
  
  // Check if response is ok first
  if (!res.ok) {
    const errorText = await res.text();
    console.error("API Error:", res.status, errorText);
    throw new Error(`Failed to load profile: ${res.status} ${res.statusText}`);
  }
  
  // Check if response is JSON
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const htmlResponse = await res.text();
    console.error("Received HTML instead of JSON:", htmlResponse);
    throw new Error("Server returned HTML instead of JSON");
  }
  
  return res.json();
};

export const updateGamerProfile = async (profileData, token) => {
  const res = await fetch(`/api/gamer-profile/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  return res.json();
};

export const createSquad = async (squadData, token) => {
  const res = await fetch(`/api/squads/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(squadData),
  });
  return res.json();
};

export const joinSquad = async (inviteCode, token) => {
  const res = await fetch(`/api/squads/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  return res.json();
};

export const addStream = async (streamData, token) => {
  const res = await fetch(`/api/streams/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(streamData),
  });
  return res.json();
};

export const getLiveSquadStreams = async (token) => {
  const res = await fetch(`/api/streams/live`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
};

export const getCrossplayGames = async () => {
  const res = await fetch(`/api/games/crossplay-list`);
  return res.json();
};
