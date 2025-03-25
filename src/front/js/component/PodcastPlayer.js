const PodcastPlayer = ({ podcast }) => {
  const [chapters, setChapters] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: "", timestamp: 0 });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/podcasts/${podcast.id}/chapters`)
      .then(res => res.json())
      .then(data => setChapters(data))
      .catch(err => console.error("Error fetching chapters:", err));
  }, [podcast.id]);

  const seekToTime = (time) => {
    document.getElementById("podcast-audio").currentTime = time;
  };

  const addChapter = async () => {
    const response = await fetch(`${process.env.BACKEND_URL}/podcasts/${podcast.id}/chapters`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newChapter)
    });

    if (response.ok) {
      const data = await response.json();
      setChapters([...chapters, data.chapter]);
      setNewChapter({ title: "", timestamp: 0 });
    }
  };

  return (
    <div className="podcast-player">
      <h2>{podcast.title}</h2>
      <audio id="podcast-audio" controls playbackRate={playbackSpeed}>
        <source src={podcast.audio_url} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      <div>
        <label>Playback Speed: </label>
        <select onChange={(e) => setPlaybackSpeed(e.target.value)} value={playbackSpeed}>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>

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

export default PodcastPlayer;  // <-- Add this line to export the component
