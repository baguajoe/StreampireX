import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const PodcastPlayer = () => {
  const { podcast_id, episode_id } = useParams();
  const [episode, setEpisode] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: "", timestamp: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch episode details
    fetch(`${process.env.REACT_APP_BACKEND_URL}/podcast/${podcast_id}/episode/${episode_id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setEpisode(data);
      })
      .catch((err) => setError("Error loading episode"));

    // Fetch chapters
    fetch(`${process.env.REACT_APP_BACKEND_URL}/podcasts/${podcast_id}/chapters`)
      .then((res) => res.json())
      .then((data) => setChapters(data))
      .catch((err) => console.error("Error fetching chapters:", err));
  }, [podcast_id, episode_id]);

  const seekToTime = (time) => {
    document.getElementById("podcast-audio").currentTime = time;
  };

  const addChapter = async () => {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/podcasts/${podcast_id}/chapters`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newChapter),
    });

    if (response.ok) {
      const data = await response.json();
      setChapters([...chapters, data.chapter]);
      setNewChapter({ title: "", timestamp: 0 });
    }
  };

  if (error) return <p>{error}</p>;
  if (!episode) return <p>Loading...</p>;

  return (
    <div className="podcast-player">
      <h2>{episode.title}</h2>
      <audio id="podcast-audio" controls>
        <source src={episode.file_url} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      <h3>📖 Chapters</h3>
      <ul>
        {chapters.map((chapter) => (
          <li key={chapter.id} onClick={() => seekToTime(chapter.timestamp)}>
            ⏳ {chapter.timestamp}s - {chapter.title}
          </li>
        ))}
      </ul>

      {isEditing && (
        <div>
          <h3>➕ Add a Chapter</h3>
          <input
            type="text"
            placeholder="Chapter title"
            value={newChapter.title}
            onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
          />
          <input
            type="number"
            placeholder="Timestamp (seconds)"
            value={newChapter.timestamp}
            onChange={(e) => setNewChapter({ ...newChapter, timestamp: Number(e.target.value) })}
          />
          <button onClick={addChapter}>✅ Save Chapter</button>
        </div>
      )}

      <button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? "❌ Cancel Editing" : "📝 Edit Chapters"}
      </button>
    </div>
  );
};

export default PodcastPlayer;
