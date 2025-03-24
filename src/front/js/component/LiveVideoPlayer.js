import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

const LiveVideoPlayer = ({ streamUrl }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (Hls.isSupported()) {
      const hls = new Hls();

      // Log available resolutions and select quality manually
      hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
        console.log('Available resolutions: ', data.levels);
        // Set a specific resolution index (e.g., 1080p)
        hls.startLevel = 2; // 1080p resolution
      });

      // Load the HLS stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      // Clean up HLS instance when the component is unmounted
      return () => {
        hls.destroy();
      };
    } else {
      console.error("HLS.js is not supported in this browser.");
    }
  }, [streamUrl]);

  return (
    <div>
      <h2>🎥 Live Video Stream</h2>
      <video ref={videoRef} controls autoPlay width="600px" />
    </div>
  );
};

export default LiveVideoPlayer;
