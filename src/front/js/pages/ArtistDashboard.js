import React, { useState, useEffect } from 'react';
import '../../styles/ArtistDashboard.css';
import { FaDollarSign, FaUserFriends, FaMusic, FaHeart, FaBroadcastTower, FaUpload, FaGuitar, FaVideo, FaPlayCircle } from 'react-icons/fa';

// Required component imports
import LiveStudio from "../component/LiveStudio";
import TrackUploadForm from "../component/TrackUploadForm";
import TermsAgreementModal from "../component/TermsAgreementModal";
import AlbumCard from "../component/AlbumCard";
import EditTrackForm from "../component/EditTrackForm";
import EditAlbumForm from "../component/EditAlbumForm";

const ArtistDashboard = () => {
  const [trackTitle, setTrackTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [explicit, setExplicit] = useState(false);
  const [genres, setGenres] = useState([]);

  const [selectedTrack, setSelectedTrack] = useState("");
  const [studioOpen, setStudioOpen] = useState(false);
  const [showVideoDistributionInfo, setShowVideoDistributionInfo] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [trackBeingEdited, setTrackBeingEdited] = useState(null);
  const [albumBeingEdited, setAlbumBeingEdited] = useState(null);
  const [showAlbumCreator, setShowAlbumCreator] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/categories`)
      .then(res => res.json())
      .then(data => setGenres(data))
      .catch(err => setErrorMessage("Error fetching genres."));
  }, []);

  const handleAudioUpload = async () => {
    if (!trackTitle || !genre || !audioFile) {
      setErrorMessage("Please fill in all fields before uploading.");
      return;
    }
    setErrorMessage('');

    const formData = new FormData();
    formData.append("title", trackTitle);
    formData.append("genre", genre);
    formData.append("audio", audioFile);
    formData.append("explicit", explicit);

    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/upload-track`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert("Upload successful!");
        setTrackTitle('');
        setGenre('');
        setAudioFile(null);
        setExplicit(false);
      } else {
        setErrorMessage(data.error || "Upload failed.");
      }
    } catch (err) {
      setErrorMessage("Server error during upload.");
    }
  };

  const handleVideoUpload = () => {
    alert('Video distribution triggered!');
  };

  return (
    <div className="artist-dashboard">
      <h1><FaMusic /> Artist Dashboard</h1>

      <div className="stats-row">
        <div className="stat-card">
          <h3><FaDollarSign /> Total Earnings</h3>
          <p>$0.00</p>
        </div>
        <div className="stat-card">
          <h3><FaUserFriends /> Followers</h3>
          <p>0</p>
        </div>
        <div className="stat-card">
          <h3><FaMusic /> Uploaded Tracks</h3>
          <p>0</p>
        </div>
        <div className="stat-card">
          <h3><FaHeart /> Total Engagement</h3>
          <p>0</p>
        </div>
      </div>

      <div className="artist-section">
        <h2><FaBroadcastTower /> Quick Actions</h2>
        <button className="video-upload-btn" onClick={() => setStudioOpen(true)}><FaBroadcastTower /> Open Live Studio</button>
        <button className="video-info-btn"><FaUpload /> Upload Lyrics</button>
      </div>

      <div className="music-distribution-center">
        <h2><FaGuitar /> Music Distribution</h2>
        <p>Get your music on Spotify, Apple Music, YouTube Music, Amazon Music & 100+ platforms!</p>
        <div className="video-actions">
          <button className="music-upload-btn"><FaUpload /> Upload Music</button>
          <button className="music-info-btn">How Distribution Works</button>
        </div>
      </div>

      <div className="artist-section">
        <h2><FaUpload /> Upload Music</h2>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <div className="add-track-form">
          <input type="text" placeholder="Title" value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} />

          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">Select Genre</option>
            {genres.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>

          <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />
          <label>
            <input type="checkbox" checked={explicit} onChange={() => setExplicit(!explicit)} /> Explicit Lyrics
          </label>
          <button onClick={handleAudioUpload}>Upload</button>
        </div>
      </div>

      <div className="video-distribution-center">
        <h2><FaVideo /> Music Video Distribution</h2>
        <p>Distribute music videos, lyric videos, and visual content to video platforms!</p>
        <div className="distribution-option">
          <h4><FaUpload /> Upload & Distribute Music Videos</h4>
          <p>Get your music videos on YouTube, Vevo, Facebook, Instagram, TikTok & more.</p>
          <ul>
            <li>🎯 TikTok • Vevo • Facebook • Instagram • Triller • Snapchat</li>
            <li>🧠 Monetization enabled • Global placement • ID & Analytics tracking</li>
          </ul>
          <div className="video-actions">
            <button className="video-upload-btn" onClick={handleVideoUpload}><FaUpload /> Upload & Distribute Video</button>
            <button className="video-info-btn">📘 Video Requirements & Info</button>
          </div>
        </div>
      </div>

      <div className="artist-section">
        <h2><FaPlayCircle /> Upload Music Video</h2>
        <form className="add-track-form">
          <input type="text" placeholder="Title" required />
          <input type="text" placeholder="Director / Producer" required />
          <input type="file" />
          <label>
            <input type="checkbox" /> Explicit Content
          </label>
          <button type="submit">Upload Video</button>
        </form>
      </div>

      <div className="artist-section">
        <h2><FaBroadcastTower /> Your Indie Station</h2>
        <p>You don’t have an indie station yet.</p>
        <button className="video-upload-btn">➕ Create Station</button>
      </div>

      {studioOpen && <LiveStudio onClose={() => setStudioOpen(false)} />}
      {showTermsModal && <TermsAgreementModal onClose={() => setShowTermsModal(false)} />}
      {trackBeingEdited && <EditTrackForm track={trackBeingEdited} onClose={() => setTrackBeingEdited(null)} />}
      {albumBeingEdited && <EditAlbumForm album={albumBeingEdited} onClose={() => setAlbumBeingEdited(null)} />}
      {showAlbumCreator && <AlbumCard onClose={() => setShowAlbumCreator(false)} />}
    </div>
  );
};

export default ArtistDashboard;
