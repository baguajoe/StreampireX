// src/components/SaveStream.js

import React from "react";

const SaveStream = ({ streamId }) => {
  const handleSave = async () => {
    const response = await fetch("/api/streams/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ stream_id: streamId }),
    });

    const data = await response.json();
    alert(data.message);
  };

  return (
    <button onClick={handleSave}>Save Stream</button>
  );
};

export default SaveStream;
