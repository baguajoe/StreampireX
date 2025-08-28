import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../component/sidebar';
import PodcastOverview from '../component/PodcastOverview';
import RecentEpisodes from '../component/RecentEpisodes';
import MonetizationAnalytics from '../component/MonetizationAnalytics';
import AudienceInteraction from '../component/AudienceInteraction';
import ScheduleEpisodeForm from '../component/ScheduleEpisodeForm';
import '../../styles/PodcastDashboard.css';

const PodcastDashboard = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [selectedPodcast, setSelectedPodcast] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [earnings, setEarnings] = useState({
        total: 0,
        ads: 0,
        subscriptions: 0,
        donations: 0
    });

    // Helper function to check if URL is a video file
    const isVideoFile = (url) => {
        if (!url) return false;
        return url.match(/\.(mp4|mov|avi|mkv|webm|m4v|3gp|flv)$/i);
    };

    // Helper function to check if URL is an audio file
    const isAudioFile = (url) => {
        if (!url) return false;
        return url.match(/\.(mp3|wav|flac|m4a|aac|ogg|wma)$/i);
    };

    useEffect(() => {
        const fetchPodcasts = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcast/dashboard`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                if (!res.ok) throw new Error(`Status: ${res.status}`);
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error("Data is not an array");
                setPodcasts(data);
            } catch (err) {
                console.error("Podcast fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPodcasts();
    }, []);

    const loadEpisodes = (podcastId) => {
        console.log("Loading episodes for podcast:", podcastId);
        setSelectedPodcast(podcastId);
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcast/${podcastId}/episodes`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("Episodes loaded:", data);
                setEpisodes(data);
            })
            .catch(error => {
                console.error('Error fetching episodes:', error);
                setEpisodes([]);
            });
    };

    const deletePodcast = (podcastId) => {
        if (!window.confirm('Are you sure you want to delete this podcast?')) return;
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcasts/${podcastId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
            .then(() => setPodcasts(podcasts.filter((p) => p.id !== podcastId)))
            .catch((error) => console.error('Error deleting podcast:', error));
    };

    const deleteEpisode = (episodeId) => {
        if (!window.confirm('Are you sure you want to delete this episode?')) return;
        
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/episodes/${episodeId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
            .then(() => {
                setEpisodes(episodes.filter((ep) => ep.id !== episodeId));
            })
            .catch((error) => console.error('Error deleting episode:', error));
    };

    // Enhanced media renderer that handles both audio and video
    const renderMediaPlayer = (episode) => {
        if (!episode.file_url) {
            return <p style={{color: '#666', fontStyle: 'italic'}}>No media file available</p>;
        }

        console.log("Rendering media for episode:", episode.title, "URL:", episode.file_url);

        if (isVideoFile(episode.file_url)) {
            return (
                <div className="video-container" style={{margin: '10px 0'}}>
                    <video 
                        controls 
                        style={{ 
                            width: '100%', 
                            maxWidth: '600px', 
                            height: 'auto',
                            borderRadius: '8px'
                        }}
                        preload="metadata"
                    >
                        <source src={episode.file_url} type="video/mp4" />
                        <source src={episode.file_url} type="video/webm" />
                        <source src={episode.file_url} type="video/ogg" />
                        Your browser does not support the video element.
                    </video>
                </div>
            );
        } else if (isAudioFile(episode.file_url)) {
            return (
                <div className="audio-container" style={{margin: '10px 0'}}>
                    <audio 
                        controls 
                        style={{ 
                            width: '100%', 
                            maxWidth: '500px' 
                        }}
                        preload="metadata"
                    >
                        <source src={episode.file_url} type="audio/mpeg" />
                        <source src={episode.file_url} type="audio/wav" />
                        <source src={episode.file_url} type="audio/ogg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            );
        } else {
            // Fallback for unknown file types - try both video and audio
            return (
                <div className="media-container" style={{margin: '10px 0'}}>
                    <video 
                        controls 
                        style={{ 
                            width: '100%', 
                            maxWidth: '600px', 
                            height: 'auto',
                            borderRadius: '8px'
                        }}
                        preload="metadata"
                        onError={(e) => {
                            console.log("Video failed, trying audio...");
                            // If video fails, hide it and show audio player
                            e.target.style.display = 'none';
                            const audioElement = e.target.nextElementSibling;
                            if (audioElement) {
                                audioElement.style.display = 'block';
                            }
                        }}
                    >
                        <source src={episode.file_url} />
                        Your browser does not support the video element.
                    </video>
                    <audio 
                        controls 
                        style={{ 
                            width: '100%', 
                            maxWidth: '500px',
                            display: 'none' // Hidden by default, shown if video fails
                        }}
                        preload="metadata"
                    >
                        <source src={episode.file_url} />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            );
        }
    };

    if (loading) return <p className="loading">Loading your podcasts...</p>;

    return (
        <div className="podcast-dashboard">
            <h1>🎙 Podcast Dashboard</h1>

            <div className="podcast-section">
                <h2>📊 Summary</h2>
                <div className="summary-info"><strong>Total Podcasts:</strong> {podcasts.length}</div>
                <div className="summary-info"><strong>Total Earnings:</strong> ${earnings.total.toFixed(2)}</div>
                <div className="summary-info"><strong>Ad Revenue:</strong> ${earnings.ads.toFixed(2)}</div>
                <div className="summary-info"><strong>Subscription Revenue:</strong> ${earnings.subscriptions.toFixed(2)}</div>
                <div className="summary-info"><strong>Donation Revenue:</strong> ${earnings.donations.toFixed(2)}</div>
            </div>

            <div className="podcast-section">
                <h2>🎥 Go Live</h2>
                <Link to="/live-studio">
                    <button className="btn-live">🎥 Start Live Podcast</button>
                </Link>
            </div>

            <div className="podcast-section">
                <h2>🎙️ Your Podcasts</h2>
                {podcasts.length === 0 ? (
                    <p className="empty-state">No podcasts found. Create your first show!</p>
                ) : (
                    <div className="podcast-list">
                        {podcasts.map((podcast) => (
                            <div key={podcast.id} className="podcast-card">
                                <img
                                    src={podcast.cover_art_url || '/default-podcast-cover.png'}
                                    alt={podcast.title}
                                    className="podcast-cover"
                                    onError={(e) => {
                                        e.target.src = '/default-podcast-cover.png';
                                    }}
                                />
                                <div className="podcast-content">
                                    <h3>{podcast.title}</h3>
                                    <p>{podcast.description}</p>
                                    <div className="podcast-metadata">
                                        <span className="podcast-category">{podcast.category}</span>
                                        {podcast.subscription_tier && (
                                            <span className="podcast-tier">{podcast.subscription_tier}</span>
                                        )}
                                    </div>
                                    <div className="podcast-actions">
                                        <button onClick={() => loadEpisodes(podcast.id)} className="btn-primary">
                                            View Episodes
                                        </button>
                                        <Link to={`/podcasts/${podcast.id}/edit`} className="btn-edit">
                                            Edit
                                        </Link>
                                        <button onClick={() => deletePodcast(podcast.id)} className="btn-delete">
                                            Delete
                                        </button>
                                    </div>
                                    <ScheduleEpisodeForm podcastId={podcast.id} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="create-podcast">
                    <Link to="/create-podcast">
                        <button className="btn-create">➕ Create New Podcast</button>
                    </Link>
                </div>
            </div>

            {selectedPodcast && (
                <div className="podcast-section">
                    <h2>🎧 Episodes</h2>
                    {episodes.length === 0 ? (
                        <p className="empty-state">No episodes found for this podcast.</p>
                    ) : (
                        <ul className="episode-list">
                            {episodes.map((episode) => (
                                <li key={episode.id} className="episode-item">
                                    <div className="episode-header">
                                        <h4>{episode.title || 'Untitled Episode'}</h4>
                                        <div className="episode-actions">
                                            <button 
                                                onClick={() => deleteEpisode(episode.id)} 
                                                className="btn-delete btn-small"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {episode.description && (
                                        <p className="episode-description">{episode.description}</p>
                                    )}
                                    
                                    <div className="episode-metadata">
                                        {episode.duration && (
                                            <span className="episode-duration">Duration: {episode.duration}s</span>
                                        )}
                                        {episode.release_date && (
                                            <span className="episode-date">
                                                Released: {new Date(episode.release_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    <div className="episode-media">
                                        {renderMediaPlayer(episode)}
                                    </div>

                                    {episode.file_url && (
                                        <div className="episode-download">
                                            <a 
                                                href={episode.file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="download-link"
                                            >
                                                Download {isVideoFile(episode.file_url) ? 'Video' : 'Audio'}
                                            </a>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="podcast-section">
                <h2>📈 Recent Episodes</h2>
                <div className="placeholder-content">
                    <p className="empty-state">No recent episodes to display.</p>
                    <p>Your latest episodes will appear here once you start creating content.</p>
                </div>
            </div>

            <div className="podcast-section">
                <h2>👥 Audience Interaction</h2>
                <div className="placeholder-content">
                    <p className="empty-state">No audience interactions yet.</p>
                    <p>Comments, likes, and audience engagement will be shown here.</p>
                </div>
            </div>

            <div className="podcast-section">
                <h2>🛠️ Podcast Tools</h2>
                <ul className="tools-list">
                    <li><Link to="/create-podcast">Create New Podcast</Link></li>
                    <li><Link to="/upload-episode">Upload Episode</Link></li>
                    <li><Link to="/analytics">View Analytics</Link></li>
                    <li><Link to="/monetization">Monetization Settings</Link></li>
                    <li><Link to="/audience-insights">Audience Insights</Link></li>
                </ul>
            </div>
        </div>
    );
};

export default PodcastDashboard;