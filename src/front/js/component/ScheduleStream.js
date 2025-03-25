// src/components/ScheduleStream.js

import React, { useState } from "react";

const ScheduleStream = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamTime, setStreamTime] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch("/api/streams/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ title, description, stream_time: streamTime }),
    });

    const data = await response.json();
    if (response.ok) {
      alert("Stream Scheduled!");
    } else {
      alert(data.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Stream Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        placeholder="Stream Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="datetime-local"
        value={streamTime}
        onChange={(e) => setStreamTime(e.target.value)}
      />
      <button type="submit">Schedule Stream</button>
    </form>
  );
};

export default ScheduleStream;


