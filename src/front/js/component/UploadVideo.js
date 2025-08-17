import React, { useEffect, useState } from 'react';

const UploadVideo = ({ currentUser }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [previewURL, setPreviewURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fetch videos on mount
    fetch(`${process.env.BACKEND_URL}/api/my_videos`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setUploadedVideos(data.videos || []))
      .catch((err) => console.error('Error loading videos:', err));
  }, []);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    const video = document.createElement('video');

    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const role = currentUser?.role || 'Free';

      if ((role === 'Free' && duration > 120) || (role !== 'Free' && duration > 1200)) {
        alert('⛔ Video too long for your subscription plan.');
        setSelectedFile(null);
        setPreviewURL(null);
      } else {
        setSelectedFile(file);
        setPreviewURL(URL.createObjectURL(file));
      }
    };

    video.src = URL.createObjectURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return alert('No file selected.');

    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('title', 'My Video');
    formData.append('description', 'My cool video');

    setUploading(true);
    setProgress(0);

    try {
      const res = await fetch('/api/upload_video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert('✅ Uploaded!');
        setUploadedVideos((prev) => [data.video, ...prev]);
        setSelectedFile(null);
        setPreviewURL(null);
      } else {
        alert(`⚠️ Upload failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('Delete this video?')) return;

    try {
      const res = await fetch(`/api/delete_video/${videoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (res.ok) {
        setUploadedVideos((prev) => prev.filter((v) => v.id !== videoId));
      } else {
        const data = await res.json();
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTitleEdit = async (id, newTitle) => {
    try {
      const res = await fetch(`/api/update_video_title/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`⚠️ Failed to update: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="video-upload-wrapper">
      <h3>📤 Upload a Video</h3>
      <input type="file" accept="video/*" onChange={handleVideoUpload} />

      {previewURL && (
        <div className="video-preview">
          <h4>🔍 Preview:</h4>
          <video src={previewURL} controls width="300" />
        </div>
      )}

      {selectedFile && (
        <button className="btn-primary" onClick={handleSubmit} disabled={uploading}>
          {uploading ? `Uploading... ${progress}%` : '🚀 Upload Video'}
        </button>
      )}

      <hr />

      <h3>🎞️ Uploaded Videos</h3>
      {uploadedVideos.length > 0 ? (
        uploadedVideos.map((video) => (
          <div key={video.id} className="uploaded-video-card">
            <video src={video.file_url} controls width="300" />
            <input
              type="text"
              value={video.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setUploadedVideos((prev) =>
                  prev.map((v) => (v.id === video.id ? { ...v, title: newTitle } : v))
                );
              }}
              onBlur={() => handleTitleEdit(video.id, video.title)}
            />
            <p>{video.description}</p>
            <button className="btn-danger" onClick={() => handleDelete(video.id)}>
              🗑️ Delete
            </button>
          </div>
        ))
      ) : (
        <p>No videos uploaded yet.</p>
      )}
    </div>
  );
};

export default UploadVideo;
