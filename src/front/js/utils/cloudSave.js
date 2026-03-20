// src/front/js/utils/cloudSave.js
// Cloud save/load for SPX tools — saves project JSON to R2

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

export async function saveToCloud(tool, name, payload) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not logged in");
  const res = await fetch(`${BACKEND}/api/projects/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tool, name, payload })
  });
  if (!res.ok) throw new Error("Save failed");
  return res.json(); // { url, key, name }
}

export async function listCloudProjects(tool) {
  const token = localStorage.getItem("token");
  if (!token) return [];
  const res = await fetch(`${BACKEND}/api/projects/list?tool=${tool}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.projects || [];
}

export async function loadFromCloud(key) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not logged in");
  const res = await fetch(`${BACKEND}/api/projects/load?key=${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Load failed");
  const data = await res.json();
  return data.payload;
}

export async function deleteCloudProject(key) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not logged in");
  const res = await fetch(`${BACKEND}/api/projects/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key })
  });
  return res.ok;
}
