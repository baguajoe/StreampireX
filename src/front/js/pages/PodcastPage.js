import React, { useEffect, useState } from "react";

const PodcastPage = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showPremium, setShowPremium] = useState(false);

    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/podcasts`)
            .then(res => res.json())
            .then(data => setPodcasts(data))
            .catch(err => console.error("Error fetching podcasts:", err));
    }, []);

    return (
        <div className="podcast-page-container">
            <h1>🎧 Browse Podcasts</h1>

            <input
                type="text"
                placeholder="Search podcasts..."
                className="search-bar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="podcast-list">
                {podcasts.map(podcast => (
                    <div key={podcast.id} className="podcast-card">
                        <img src={podcast.cover_art_url || "/default-podcast-cover.png"} alt="Podcast Cover" className="podcast-cover" />
                        <div className="podcast-info">
                            <h3>{podcast.title}</h3>
                            <p>{podcast.description}</p>
                            <p><strong>Category:</strong> {podcast.category}</p>

                            {podcast.video_url ? (
                                <video controls width="100%">
                                    <source src={podcast.video_url} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <audio controls>
                                    <source src={podcast.audio_url} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                </audio>
                            )}

                            {podcast.is_premium && <span className="premium-label">🔒 Premium</span>}

                            <div className="transcription">
                                <h4>📝 Transcript</h4>
                                <p>{podcast.transcription || "Transcription not available."}</p>
                            </div>

                            <div className="comments-section">
                                <h4>💬 Comments</h4>
                                <textarea placeholder="Write a comment..."></textarea>
                                <button>💬 Post</button>
                            </div>

                            <div className="podcast-actions">
                                <button>❤️ Like</button>
                                <button>📤 Share</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PodcastPage;