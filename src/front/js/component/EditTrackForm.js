import React, { useState, useEffect } from "react";

const EditTrackForm = ({ trackId }) => {
  const [track, setTrack] = useState(null);

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/track/${trackId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => setTrack(data.track));
  }, [trackId]);

  const handleChange = (e) => {
    setTrack({ ...track, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const res = await fetch(`${process.env.BACKEND_URL}/api/track/${trackId}/edit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify(track)
    });

    const data = await res.json();
    alert(data.message);
  };

  if (!track) return <p>Loading...</p>;

  return (
    <div className="edit-track-form">
      <h3>✏️ Edit Track</h3>
      <input name="title" value={track.title} onChange={handleChange} placeholder="Title" />
      <input name="genre" value={track.genre} onChange={handleChange} placeholder="Genre" />
      <textarea name="description" value={track.description} onChange={handleChange} placeholder="Description" />
      <label>
        Explicit:
        <input type="checkbox" name="is_explicit" checked={track.is_explicit} onChange={e => setTrack({...track, is_explicit: e.target.checked})} />
      </label>
      <button onClick={handleSubmit}>💾 Save Changes</button>
    </div>
  );
};

export default EditTrackForm;
