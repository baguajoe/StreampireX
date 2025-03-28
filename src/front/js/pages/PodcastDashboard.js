import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../component/sidebar';
import PodcastOverview from '../component/PodcastOverview';
import RecentEpisodes from '../component/RecentEpisodes';
import MonetizationAnalytics from '../component/MonetizationAnalytics';
import AudienceInteraction from '../component/AudienceInteraction';
import ScheduleEpisodeForm from '../component/ScheduleEpisodeForm';
import '../../styles/PodcastDashboard.css';  // Assuming you have a CSS file for custom styles

const PodcastDashboard = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [selectedPodcast, setSelectedPodcast] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [earnings, setEarnings] = useState(0);

    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/user/podcasts`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
            .then((res) => res.json())
            .then((data) => {
                setPodcasts(data);
                setLoading(false);
            })
            .catch((error) => console.error('Error fetching podcasts:', error));
    }, []);

    const loadEpisodes = (podcastId) => {
        setSelectedPodcast(podcastId);
        fetch(`${process.env.BACKEND_URL}/api/podcasts/${podcastId}/episodes`)
            .then((res) => res.json())
            .then((data) => setEpisodes(data))
            .catch((error) => console.error('Error fetching episodes:', error));
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

    if (loading) return <p>Loading your podcasts...</p>;

    return (
        <div className="dashboard-container">
            <Sidebar />
            <div className="content">
                <h1>🎙 Podcast Dashboard</h1>

                {/* 🎥 Live Studio Access */}
                <div className="live-studio">
                    <h2>Go Live</h2>
                    <Link to="/live-studio">
                        <button className="btn-live">🎥 Start Live Podcast</button>
                    </Link>
                </div>

                {/* 💰 Monetization & Analytics */}
                <MonetizationAnalytics earnings={earnings} />

                {/* 🎧 Podcast List */}
                <h2>Your Podcasts</h2>
                <div className="podcast-list">
                    {podcasts.map((podcast) => (
                        <div key={podcast.id} className="podcast-card">
                            <img
                                src={podcast.cover_art_url}
                                alt={podcast.title}
                                className="podcast-cover"
                            />
                            <h3>{podcast.title}</h3>
                            <p>{podcast.description}</p>
                            <button onClick={() => loadEpisodes(podcast.id)}>View Episodes</button>
                            <button onClick={() => deletePodcast(podcast.id)} className="btn-delete">
                                Delete
                            </button>
                            <Link to={`/podcasts/${podcast.id}/edit`} className="btn-edit">
                                Edit
                            </Link>
                            <ScheduleEpisodeForm podcastId={podcast.id} />
                        </div>
                    ))}
                </div>

                {/* 🎵 Episodes List */}
                {selectedPodcast && (
                    <div className="episodes-section">
                        <h2>Episodes</h2>
                        <ul className="episode-list">
                            {episodes.map((episode) => (
                                <li key={episode.id} className="episode-item">
                                    <h3>{episode.title}</h3>
                                    <audio controls>
                                        <source src={episode.file_url} type="audio/mp3" />
                                    </audio>
                                    <button className="btn-delete">🗑 Delete</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* 🎧 Latest Episodes & Audience Interaction */}
                <RecentEpisodes />
                <AudienceInteraction />

                {/* ➕ Create New Podcast */}
                <div className="new-podcast">
                    <Link to="/create-podcast">
                        <button className="btn-create">➕ Create New Podcast</button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PodcastDashboard;