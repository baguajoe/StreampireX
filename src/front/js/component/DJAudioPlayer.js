import React, { useState, useRef } from "react";

const DJAudioPlayer = ({ streamUrl }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipTrack = () => {
    audioRef.current.currentTime = 0; // Reset to beginning
    audioRef.current.play();
  };

  const adjustVolume = (event) => {
    setVolume(event.target.value);
    audioRef.current.volume = event.target.value;
  };

  return (
    <div>
      <audio ref={audioRef} src={streamUrl} controls />
      <button onClick={togglePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
      <button onClick={skipTrack}>Skip</button>
      <input type="range" min="0" max="1" step="0.01" value={volume} onChange={adjustVolume} />
    </div>
  );
};

export default DJAudioPlayer;
