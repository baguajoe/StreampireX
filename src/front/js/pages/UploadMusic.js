import React, { useState } from "react";

const UploadMusic = () => {
    const [stationId, setStationId] = useState("");
    const [audioFile, setAudioFile] = useState(null);
    const [message, setMessage] = useState("");

    const handleFileUpload = (e) => {
        setAudioFile(e.target.files[0]);
    };

    const uploadTrack = async () => {
        if (!stationId || !audioFile) {
            setMessage("Station ID and audio file are required!");
            return;
        }

        const formData = new FormData();
        formData.append("station_id", stationId);
        formData.append("audio", audioFile);

        const response = await fetch("http://localhost:5000/api/radio/upload_music", {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            setMessage("🎵 Track uploaded successfully!");
            setAudioFile(null);
        } else {
            setMessage(`❌ Error: ${data.error}`);
        }
    };

    return (
        <div>
            <h2>Upload Music to Radio Station</h2>
            {message && <p>{message}</p>}
            <input type="text" placeholder="Station ID" value={stationId} onChange={(e) => setStationId(e.target.value)} />
            <input type="file" accept="audio/*" onChange={handleFileUpload} />
            <button onClick={uploadTrack}>Upload</button>
        </div>
    );
};

export default UploadMusic;
