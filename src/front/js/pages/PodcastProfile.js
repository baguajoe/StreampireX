import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TipJar from "../component/TipJar";
import "../../styles/ProfilePage.css";

const PodcastProfile = () => {
    const { username, podcastId } = useParams();
    const [podcast, setPodcast] = useState(null);
    const [episodes, setEpisodes] = useState([]);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcast/${username}/${podcastId}`)
            .then(res => res.json())
            .then(data => {
                setPodcast(data);
                setEpisodes(data.episodes);
            })
            .catch(error => console.error("Error loading podcast:", error));
    }, [username, podcastId]);

    if (!podcast) return <p>Loading...</p>;

    return (
        <div className="podcast-profile">
            <div className="podcast-header">
                <img src={podcast.coverImage} alt={podcast.title} className="podcast-cover" />
                <div>
                    <h1>{podcast.title}</h1>
                    <h3>Hosted by {podcast.host}</h3>
                    <p>{podcast.description}</p>
                    <button>Follow</button>
                    <TipJar
                        creatorId={podcast.host_id}
                        creatorName={podcast.host}
                        buttonText="Donate"
                        buttonStyle="inline"
                    />
                </div>
            </div>

            <h2>Episodes</h2>
            <ul className="episode-list">
                {episodes.map(episode => (
                    <li key={episode.id} className="episode">
                        <h3>{episode.title}</h3>
                        <audio controls>
                            <source src={episode.audioUrl} type="audio/mp3" />
                            Your browser does not support the audio tag.
                        </audio>
                        <div className="episode-actions">
                            <button onClick={() => window.open(episode.audioUrl)}>Download</button>
                            <button onClick={() => navigator.clipboard.writeText(window.location.href)}>Share</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PodcastProfile;