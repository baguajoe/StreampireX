import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const Voting = () => {
  const [votes, setVotes] = useState({});

  useEffect(() => {
    socket.on("vote_update", (data) => setVotes(data));
  }, []);

  const voteForSong = (song) => {
    fetch("http://localhost:5000/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song }),
    });
  };

  return (
    <div>
      <h2>🎵 Vote for Songs</h2>
      <button onClick={() => voteForSong("Song A")}>Vote Song A</button>
      <button onClick={() => voteForSong("Song B")}>Vote Song B</button>
      <h3>📊 Voting Results:</h3>
      {Object.entries(votes).map(([song, count]) => (
        <p key={song}>{song}: {count} votes</p>
      ))}
    </div>
  );
};

export default Voting;
