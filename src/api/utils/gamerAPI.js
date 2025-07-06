export const getGamerProfile = async (userId) => {
  const res = await fetch(`/api/gamer-profile/${userId}`);
  if (!res.ok) throw new Error("Failed to load profile");
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
