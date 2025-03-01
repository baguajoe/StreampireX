import React, { useState, useEffect } from "react";

const PodcastPlayer = ({ episodeUrl }) => {
  const [audio] = useState(new Audio(episodeUrl));
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    playing ? audio.pause() : audio.play();
    setPlaying(!playing);
  };

  return (
    <div>
      <button onClick={togglePlay}>{playing ? "Pause" : "Play"}</button>
    </div>
  );
};

export default PodcastPlayer;
