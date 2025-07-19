// CreateEpisodeForm.js
import React, { useState } from "react";

const CreateEpisodeForm = ({ podcastId }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audio, setAudio] = useState(null);
  const [video, setVideo] = useState(null);
  const [coverArt, setCoverArt] = useState(null);
  const [releaseDate, setReleaseDate] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append("podcast_id", podcastId);
    form.append("title", title);
    form.append("description", description);
    if (audio) form.append("audio", audio);
    if (video) form.append("video", video);
    if (coverArt) form.append("cover_art", coverArt);
    if (releaseDate) form.append("release_date", releaseDate);

    const response = await fetch("/api/upload_episode", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: form,
    });

    const result = await response.json();
    alert(result.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Episode Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input type="file" onChange={(e) => setAudio(e.target.files[0])} accept="audio/*" />
      <input type="file" onChange={(e) => setVideo(e.target.files[0])} accept="video/*" />
      <input type="file" onChange={(e) => setCoverArt(e.target.files[0])} />
      <input type="datetime-local" onChange={(e) => setReleaseDate(e.target.value)} />
      <button type="submit">Upload Episode</button>
    </form>
  );
};

export default CreateEpisodeForm;
