import React, { useEffect, useState } from "react";

const PodcastPage = () => {
    const [podcasts, setPodcasts] = useState([]);

    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/podcasts`)
            .then(res => res.json())
            .then(data => setPodcasts(data))
            .catch(err => console.error("Error fetching podcasts:", err));
    }, []);

    return (
        <div className="podcast-page-container">
            <h1>🎧 Podcasts</h1>
            <div className="podcast-list">
                {podcasts.map(podcast => (
                    <div key={podcast.id} className="podcast-card">
                        <img src={podcast.cover_art_url || "/default-podcast-cover.png"} alt="Podcast Cover" className="podcast-cover" />
                        <div className="podcast-info">
                            <h3>
                                {podcast.title} 
                                {podcast.streaming_enabled && <span className="live-badge">🔴 LIVE</span>}
                            </h3>
                            <p>{podcast.description}</p>
                            <p><strong>Category:</strong> {podcast.category}</p>

                            {/* Show Video If Available */}
                            {podcast.video_url ? (
                                <video controls width="100%">
                                    <source src={podcast.video_url} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <audio controls>
                                    <source src={podcast.file_url} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                </audio>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PodcastPage;
