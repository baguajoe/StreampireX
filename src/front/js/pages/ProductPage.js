import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PodcastPage = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/podcasts`)
            .then(res => res.json())
            .then(data => setPodcasts(data))
            .catch(err => console.error("Error fetching podcasts:", err));
    }, []);

    const shareToSocialMedia = (clipUrl, title) => {
        const shareText = encodeURIComponent(`Check out this podcast clip: "${title}"`);
        const shareUrl = encodeURIComponent(`${process.env.BACKEND_URL}/${clipUrl}`);
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;

        window.open(twitterUrl, "_blank");
    };

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
                        <h3>{podcast.title}</h3>
                        <p>{podcast.description}</p>

                        {/* Display Audio or Video */}
                        {podcast.video_url ? (
                            <video controls width="100%">
                                <source src={podcast.video_url} type="video/mp4" />
                            </video>
                        ) : (
                            <audio controls>
                                <source src={podcast.audio_url} type="audio/mpeg" />
                            </audio>
                        )}

                        {/* Display AI Transcription */}
                        {podcast.transcription && (
                            <div className="transcription">
                                <h4>📝 Transcription</h4>
                                <p>{podcast.transcription}</p>
                            </div>
                        )}

                        {/* Share Clip Button */}
                        {podcast.clip_url && (
                            <button onClick={() => shareToSocialMedia(podcast.clip_url, podcast.title)} className="share-btn">
                                🎬 Share Clip
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PodcastPage;