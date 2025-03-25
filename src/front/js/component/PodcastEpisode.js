import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY); // or process.env...

const PodcastEpisode = () => {
  const { episodeId } = useParams();
  const navigate = useNavigate();

  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);

  useEffect(() => {
    fetchEpisode();
  }, [episodeId]);

  const fetchEpisode = async () => {
    try {
      const res = await axios.get(`/api/episodes/${episodeId}`);
      setEpisode(res.data);
      setLoading(false);

      if (!res.data.is_premium) {
        setCanAccess(true);
      } else {
        checkAccess(res.data);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const checkAccess = async (episodeData) => {
    setCheckingAccess(true);
    try {
      const res = await axios.get(`/api/episodes/${episodeData.id}/access`);
      setCanAccess(res.data.access);
    } catch (err) {
      console.log('Access check failed:', err);
    }
    setCheckingAccess(false);
  };

  const handlePurchase = async () => {
    try {
      const res = await axios.post(`/podcast/${episode.podcast_id}/purchase`, {
        episode_id: episode.id,
        stripe_token: null // Replace if collecting token manually
      });

      // You can also redirect to Stripe Checkout here
      const stripe = await stripePromise;
      const result = await stripe.redirectToCheckout({
        sessionId: res.data.checkout_session_id
      });

      if (result.error) {
        console.error(result.error.message);
      }
    } catch (err) {
      console.error('Purchase failed', err);
    }
  };

  if (loading) return <div>Loading episode...</div>;

  if (!episode) return <div>Episode not found.</div>;

  return (
    <div className="episode-container">
      <h1>{episode.title}</h1>
      <p>{episode.description}</p>

      {episode.is_premium && !canAccess ? (
        <div>
          <p>This episode is premium. Purchase to listen.</p>
          <button onClick={handlePurchase} disabled={checkingAccess}>
            {checkingAccess ? 'Checking access...' : `Buy for $${episode.price_per_episode}`}
          </button>
        </div>
      ) : (
        <audio controls>
          <source src={episode.audio_url} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
};

export default PodcastEpisode;
