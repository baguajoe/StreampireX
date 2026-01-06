import React, { useEffect, useState } from "react";
import { Play, Pause, Heart, Share2, Download, Clock, ArrowLeft } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";

const PodcastDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [audioRef, setAudioRef] = useState(null);

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        setLoading(true);
        setError(null);

        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        const token = localStorage.getItem("token");

        if (!backendUrl) {
          throw new Error("Backend URL not configured");
        }

        // Fetch podcast details
        const podcastRes = await fetch(`${backendUrl}/api/podcasts/${id}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            "Content-Type": "application/json"
          }
        });

        if (!podcastRes.ok) {
          throw new Error("Podcast not found");
        }

        const podcastData = await podcastRes.json();
        setPodcast(podcastData);

        // Fetch episodes
        const episodesRes = await fetch(`${backendUrl}/api/podcast/${id}/episodes`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            "Content-Type": "application/json"
          }
        });

        if (episodesRes.ok) {
          const episodesData = await episodesRes.json();
          setEpisodes(Array.isArray(episodesData) ? episodesData : episodesData.episodes || []);
        }

      } catch (err) {
        console.error("Error fetching podcast:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPodcast();
    }
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const togglePlay = (episodeId, fileUrl) => {
    if (currentPlaying === episodeId && isPlaying) {
      if (audioRef) {
        audioRef.pause();
      }
      setIsPlaying(false);
    } else {
      if (audioRef) {
        audioRef.pause();
      }
      const newAudio = new Audio(fileUrl);
      newAudio.play();
      setAudioRef(newAudio);
      setCurrentPlaying(episodeId);
      setIsPlaying(true);

      newAudio.onended = () => {
        setIsPlaying(false);
        setCurrentPlaying(null);
      };
    }
  };

  const handleLike = async () => {
    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      if (token && backendUrl) {
        await fetch(`${backendUrl}/api/podcast/${id}/like`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      }
      setLiked(!liked);
    } catch (err) {
      console.error("Error liking podcast:", err);
      setLiked(!liked); // Toggle anyway for UX
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: podcast?.title,
        text: podcast?.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleSubscribe = async () => {
    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${backendUrl}/api/podcast/${id}/subscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        alert("Subscribed successfully!");
      }
    } catch (err) {
      console.error("Error subscribing:", err);
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return "00:00";
    if (typeof duration === "string" && duration.includes(":")) return duration;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎧</div>
          <p className="text-gray-400">Loading podcast...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">Podcast Not Found</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // No podcast found
  if (!podcast) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎧</div>
          <p className="text-gray-400">Podcast not available</p>
          <button
            onClick={handleBack}
            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Podcast Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="flex-shrink-0">
            <img
              src={podcast.cover_art_url || podcast.cover_image_url || "/default-podcast-cover.png"}
              alt={podcast.title}
              className="w-64 h-64 object-cover rounded-2xl shadow-2xl"
              onError={(e) => {
                e.target.src = "/default-podcast-cover.png";
              }}
            />
          </div>

          <div className="flex-grow">
            <span className="px-3 py-1 bg-purple-600/30 text-purple-400 rounded-full text-sm mb-4 inline-block">
              {podcast.category || "Podcast"}
            </span>
            <h1 className="text-4xl font-bold mb-4">{podcast.title}</h1>
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              {podcast.description || "No description available"}
            </p>

            {/* Host info */}
            {podcast.host_name && (
              <p className="text-gray-400 mb-4">Hosted by {podcast.host_name}</p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                  liked
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                {liked ? "Liked" : "Like"}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>

              <button
                onClick={handleSubscribe}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                Subscribe
              </button>
            </div>

            {/* Podcast Stats */}
            <div className="mt-6 flex gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {episodes.length} Episodes
              </div>
              {podcast.created_at && (
                <div>Created: {new Date(podcast.created_at).toLocaleDateString()}</div>
              )}
              {podcast.total_listens > 0 && (
                <div>🎧 {podcast.total_listens.toLocaleString()} listens</div>
              )}
            </div>
          </div>
        </div>

        {/* Episodes Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Episodes</h2>

          {episodes.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-xl">
              <div className="text-gray-400 text-lg mb-4">No episodes available yet</div>
              <p className="text-gray-500">Check back later for new content!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {episodes.map((episode, index) => (
                <div
                  key={episode.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 hover:bg-gray-800/70 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => togglePlay(episode.id, episode.file_url || episode.audio_url)}
                      className="flex-shrink-0 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors"
                    >
                      {currentPlaying === episode.id && isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-1" />
                      )}
                    </button>

                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-500 text-sm">#{index + 1}</span>
                        <h3 className="text-lg font-semibold">{episode.title}</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {episode.description || "No description"}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(episode.duration)}
                        </span>
                        {episode.uploaded_at && (
                          <span>{new Date(episode.uploaded_at).toLocaleDateString()}</span>
                        )}
                        {episode.listen_count > 0 && (
                          <span>🎧 {episode.listen_count}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {episode.file_url && (
                        <a
                          href={episode.file_url}
                          download
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5 text-gray-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PodcastDetailPage;