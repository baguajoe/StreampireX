import React, { useState } from "react";

const VRCreateEvent = ({ onCreate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEvent = {
      id: Date.now(), // Temp unique ID — in real app, use backend-generated ID
      title,
      description,
    };
    onCreate(newEvent);
    setTitle("");
    setDescription("");

    // Optional: If you want to persist to backend
    // fetch('/api/vr-events', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(newEvent),
    // }).then(res => res.json()).then(data => console.log("Event created:", data));
  };

  return (
    <form onSubmit={handleSubmit} className="vr-event-form">
      <h3>Create New VR Event</h3>
      <div>
        <label>Event Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., VR Listening Party"
          required
        />
      </div>
      <div>
        <label>Description:</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief event details..."
          required
        />
      </div>
      <button type="submit">🚀 Launch VR Event</button>
    </form>
  );
};

export default VRCreateEvent;
