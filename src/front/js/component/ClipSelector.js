import React, { useState } from "react";
import axios from "axios";

const ClipSelector = ({ podcastId }) => {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(60);
  const [clipUrl, setClipUrl] = useState(null);
  const [ctaLink, setCtaLink] = useState(null);

  const handleCreateClip = async () => {
    try {
      const response = await axios.post(`/api/podcast/${podcastId}/create_clip`, {
        start_time: startTime,
        end_time: endTime,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      setClipUrl(response.data.clip_url);
      setCtaLink(response.data.cta_link);
    } catch (error) {
      console.error("Error creating clip:", error);
    }
  };

  return (
    <div className="clip-selector">
      <h2>Create a Clip</h2>
      <label>Start Time (Seconds):</label>
      <input type="number" value={startTime} onChange={(e) => setStartTime(e.target.value)} />

      <label>End Time (Seconds):</label>
      <input type="number" value={endTime} onChange={(e) => setEndTime(e.target.value)} />

      <button onClick={handleCreateClip}>Generate Clip</button>

      {clipUrl && (
        <div className="clip-preview">
          <h3>Clip Preview</h3>
          <video src={clipUrl} controls></video>
          <a href={ctaLink} className="cta-button">🎥 Watch Full Episode</a>
        </div>
      )}
    </div>
  );
};

export default ClipSelector;
