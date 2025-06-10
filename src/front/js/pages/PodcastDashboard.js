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

    useEffect(() => {
        const fetchPodcasts = async () => {
            try {
                const res = await fetch(`${process.env.BACKEND_URL}/api/user/podcasts`, {
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
        setSelectedPodcast(podcastId);
        fetch(`${process.env.BACKEND_URL}/api/podcasts/${podcastId}/episodes`)
            .then(res => res.json())
            .then(data => setEpisodes(data))
            .catch(error => console.error('Error fetching episodes:', error));
    };

    const deletePodcast = (podcastId) => {
        if (!window.confirm('Are you sure you want to delete this podcast?')) return;
        fetch(`${process.env.BACKEND_URL}/api/podcasts/${podcastId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
            .then(() => setPodcasts(podcasts.filter((p) => p.id !== podcastId)))
            .catch((error) => console.error('Error deleting podcast:', error));
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
                                    src={podcast.cover_art_url}
                                    alt={podcast.title}
                                    className="podcast-cover"
                                />
                                <div className="podcast-content">
                                    <h3>{podcast.title}</h3>
                                    <p>{podcast.description}</p>
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
                                    <strong>{episode.title}</strong>
                                    <audio controls>
                                        <source src={episode.file_url} type="audio/mp3" />
                                        Your browser does not support the audio element.
                                    </audio>
                                    <button className="btn-delete">🗑 Delete</button>
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