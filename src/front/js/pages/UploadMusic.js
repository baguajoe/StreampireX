import React, { useState, useEffect } from "react";
import "../../styles/UploadMusic.css";

const UploadMusic = () => {
	const [stations, setStations] = useState([]);
	const [selectedStation, setSelectedStation] = useState("");
	const [artistName, setArtistName] = useState("");
	const [trackTitle, setTrackTitle] = useState("");
	const [albumName, setAlbumName] = useState("");
	const [bio, setBio] = useState("");
	const [genre, setGenre] = useState("");
	const [socialLinks, setSocialLinks] = useState("");
	const [notes, setNotes] = useState("");
	const [audioFile, setAudioFile] = useState(null);
	const [message, setMessage] = useState("");

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) {
			setMessage("Please log in to submit music.");
			return;
		}

		fetch(`${process.env.BACKEND_URL}/api/radio/stations`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then(res => res.json())
			.then(data => setStations(data))
			.catch(err => {
				console.error("Failed to load stations", err);
				setMessage("Error loading radio stations");
			});
	}, []);

	const handleUpload = async () => {
		if (!selectedStation || !audioFile || !trackTitle || !artistName) {
			setMessage("Please fill in all required fields.");
			return;
		}

		const formData = new FormData();
		formData.append("station_id", selectedStation);
		formData.append("artist_name", artistName);
		formData.append("track_title", trackTitle);
		formData.append("album_name", albumName);
		formData.append("bio", bio);
		formData.append("genre", genre);
		formData.append("social_links", socialLinks);
		formData.append("notes", notes);
		formData.append("audio", audioFile);

		const response = await fetch(`${process.env.BACKEND_URL}/api/radio/upload_music`, {
			method: "POST",
			headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
			body: formData,
		});

		const data = await response.json();
		if (response.ok) {
			setMessage("🎵 Track submitted successfully!");
			// Reset form
			setSelectedStation("");
			setArtistName("");
			setTrackTitle("");
			setAlbumName("");
			setBio("");
			setGenre("");
			setSocialLinks("");
			setNotes("");
			setAudioFile(null);
		} else {
			setMessage(`❌ Error: ${data.error}`);
		}
	};

	return (
		<div className="upload-music-page">
			<div className="upload-music-card">
				<h2><i className="fas fa-music"></i> Submit Music to a Radio Station</h2>
				{message && <p className="upload-message">{message}</p>}

				<label>🎙️ Artist Name *</label>
				<input value={artistName} onChange={(e) => setArtistName(e.target.value)} type="text" placeholder="Your artist/stage name" />

				<label>🎵 Track Title *</label>
				<input value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} type="text" placeholder="Name of the track" />

				<label>💿 Album Name</label>
				<input value={albumName} onChange={(e) => setAlbumName(e.target.value)} type="text" placeholder="Album or project name" />

				<label>🎧 Genre</label>
				<input value={genre} onChange={(e) => setGenre(e.target.value)} type="text" placeholder="e.g. Lo-Fi, Jazz, Hip Hop" />

				<label>📝 Short Artist Bio</label>
				<textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />

				<label>🔗 Social or Music Links</label>
				<input value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)} type="text" placeholder="Spotify, YouTube, SoundCloud..." />

				<label>📩 Notes to the Station</label>
				<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional message to the station..." />

				<label>📻 Select a Radio Station *</label>
				<select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)}>
					<option value="">-- Choose a station --</option>
					{stations.map(station => (
						<option key={station.id} value={station.id}>{station.name}</option>
					))}
				</select>

				<label>📁 Upload Audio File *</label>
				<input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />

				<button className="upload-btn" onClick={handleUpload}>Submit Track</button>
			</div>
		</div>
	);
};

export default UploadMusic;
