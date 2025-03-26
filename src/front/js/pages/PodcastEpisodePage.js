import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const PodcastEpisodePage = () => {
  const { podcastId, episodeId } = useParams();
  const [episode, setEpisode] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState("");

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        const res = await axios.get(`/api/episodes/${episodeId}`);
        setEpisode(res.data);
      } catch (err) {
        console.error("Episode fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    const checkAccess = async () => {
      try {
        const res = await axios.get(`/api/episodes/${episodeId}/access`);
        setHasAccess(res.data.access);
      } catch (err) {
        console.error("Access check failed:", err);
      }
    };

    fetchEpisode();
    checkAccess();
  }, [episodeId]);

  const handlePurchase = async () => {
    try {
      const res = await axios.post(`/podcast/${podcastId}/purchase`, {
        episode_id: episodeId,
      });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      console.error("Purchase error:", err);
      alert("Something went wrong while processing your payment.");
    }
  };

  if (loading || !episode) return <p>Loading...</p>;

  return (
    <div>
      <h2>{episode.title}</h2>
      <p>{episode.description}</p>

      {episode.is_premium && !hasAccess ? (
        <>
          <p>🎧 This episode is premium. Price: ${episode.price_per_episode.toFixed(2)}</p>
          <button onClick={handlePurchase}>Unlock Episode</button>
        </>
      ) : (
        <audio controls>
          <source src={episode.stream_url} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
};

export default PodcastEpisodePage;
