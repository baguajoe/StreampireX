import React, { useState } from "react";

const UploadPodcast = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audio, setAudio] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("audio", audio);
    formData.append("title", title);
    formData.append("description", description);

    const response = await fetch("http://127.0.0.1:5000/api/upload_podcast", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      body: formData
    });

    const data = await response.json();
    if (data.message) {
      alert("Podcast uploaded successfully!");
    }
  };

  return (
    <div>
      <h2>Upload Podcast</h2>
      <input type="text" placeholder="Title" onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="Description" onChange={(e) => setDescription(e.target.value)} />
      <input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default UploadPodcast;
