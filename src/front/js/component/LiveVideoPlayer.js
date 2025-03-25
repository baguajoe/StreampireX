import React, { useState, useEffect, useRef } from "react";
import Hls from "hls.js";

const LiveVideoPlayer = ({ streamUrl }) => {
  const [availableResolutions, setAvailableResolutions] = useState([]);
  const [selectedResolution, setSelectedResolution] = useState(2); // Default to 1080p
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (Hls.isSupported()) {
      const hls = new Hls();

      // Log available resolutions and update the state
      hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
        setAvailableResolutions(data.levels);
        console.log('Available resolutions: ', data.levels);
        hls.startLevel = selectedResolution; // Set the resolution based on the user selection
        setLoading(false);  // Set loading to false once the stream is ready
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          setError("Error loading the stream. Please try again.");
          setLoading(false);
        }
      });

      // Load the HLS stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      // Clean up HLS instance when the component is unmounted
      return () => {
        hls.destroy();
      };
    } else {
      setError("HLS.js is not supported in this browser.");
      setLoading(false);
    }
  }, [streamUrl, selectedResolution]);

  // Handle resolution selection
  const handleResolutionChange = (event) => {
    const resolutionIndex = parseInt(event.target.value, 10);
    setSelectedResolution(resolutionIndex);
  };

  if (loading) {
    return <p>Loading stream...</p>;  // Show loading message while stream is loading
  }

  if (error) {
    return <p>{error}</p>;  // Show error message if there is an error
  }

  return (
    <div>
      <h2>🎥 Live Video Stream</h2>
      
      {/* Resolution selection */}
      <div>
        <label>Select Resolution: </label>
        <select onChange={handleResolutionChange} value={selectedResolution}>
          {availableResolutions.map((level, index) => (
            <option key={index} value={index}>
              {level.height}p
            </option>
          ))}
        </select>
      </div>

      {/* Video player */}
      <video ref={videoRef} controls autoPlay width="600px" />
    </div>
  );
};

export default LiveVideoPlayer;
