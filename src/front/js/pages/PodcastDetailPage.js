import React, { useEffect, useState } from "react";
import { Play, Pause, Heart, Share2, Download, Clock } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const PodcastDetailPage = ({ podcastId = "101" }) => {
  const { id } = useParams();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mock data for demo purposes
        const mockPodcast = {
          id: 101,
          title: "Cold Cases Uncovered",
          description: "Exploring the dark corners of justice. Dive deep into unsolved mysteries and cold cases that have baffled investigators for years.",
          category: "True Crime & Investigative Journalism",
          cover_art_url: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop",
          uploaded_at: "2024-01-15T10:30:00Z"
        };

        const mockEpisodes = [
          {
            id: 1,
            title: "The Vanishing of Sarah Chen",
            description: "In 2019, a promising young software engineer disappeared without a trace from her downtown apartment. Tonight, we examine the evidence and interview those closest to the case.",
            file_url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
            duration: "45:32",
            uploaded_at: "2024-01-15T10:30:00Z"
          },
          {
            id: 2,
            title: "The Missing Inheritance Papers",
            description: "A wealthy businessman's will goes missing just days before his death. His family is left with nothing but questions and a legal battle that spans decades.",
            file_url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
            duration: "52:18",
            uploaded_at: "2024-01-08T14:20:00Z"
          },
          {
            id: 3,
            title: "Secrets in the Archive",
            description: "When a historian discovers a hidden room in the city library, she uncovers documents that could solve a 50-year-old mystery.",
            file_url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
            duration: "38:45",
            uploaded_at: "2024-01-01T09:15:00Z"
          }
        ];

        // Use mock data for demo
        setPodcast(mockPodcast);
        setEpisodes(mockEpisodes);
        setLoading(false);


        // Real API calls (commented out for demo)

        const backendUrl =
          process.env.REACT_APP_BACKEND_URL ||
          process.env.REACT_APP_BACKEND_URL ||
          "http://localhost:3001";

        // Updated API endpoints based on project knowledge
        const [podcastRes, episodesRes] = await Promise.all([
          fetch(`${backendUrl}/api/podcasts/${id}`),
          fetch(`${backendUrl}/api/podcast/${id}/episodes`)
        ]);

        if (!podcastRes.ok) throw new Error("Podcast not found");
        const podcastData = await podcastRes.json();
        setPodcast(podcastData);

        if (episodesRes.ok) {
          const episodesData = await episodesRes.json();
          setEpisodes(episodesData);
        }

      } catch (err) {
        console.error("Error fetching podcast or episodes:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPodcast();
  }, [id]);

  const handleBack = () => {
    console.log("Going back to previous page");
  };

  const togglePlay = (episodeId) => {
    if (currentPlaying === episodeId && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentPlaying(episodeId);
      setIsPlaying(true);
    }
  };

  const handleLike = async () => {
    // Implementation for liking podcast
    setLiked(!liked);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: podcast?.title,
        text: podcast?.description,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading podcast details...</p>
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Podcast Not Found</h2>
          <p className="text-gray-400 mb-6">{error || "Something went wrong."}</p>
          <button
            onClick={handleBack}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="p-6">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-300 hover:text-white transition-colors mb-6"
        >
          ← Back to Browse
        </button>

        {/* Podcast Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <img
              src={podcast.cover_art_url || podcast.cover_image_url || "https://via.placeholder.com/300x300/6B46C1/FFFFFF?text=Podcast"}
              alt={podcast.title}
              className="w-72 h-72 object-cover rounded-2xl shadow-2xl"
            />
          </div>

          <div className="flex-grow">
            <div className="mb-4">
              <span className="inline-block bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium mb-4">
                {podcast.category}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              {podcast.title}
            </h1>

            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              {podcast.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${liked
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
                  }`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                {liked ? 'Liked' : 'Like'}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>

              <button className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
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
              {podcast.uploaded_at && (
                <div>
                  Created: {new Date(podcast.uploaded_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Episodes Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Episodes</h2>

          {episodes.length === 0 ? (
            <div className="text-center py-12">
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
                      onClick={() => togglePlay(episode.id)}
                      className="flex-shrink-0 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors"
                    >
                      {currentPlaying === episode.id && isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </button>

                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {episode.title || `Episode ${index + 1}`}
                        </h3>
                        {episode.duration && (
                          <span className="text-gray-400 text-sm">
                            {episode.duration}
                          </span>
                        )}
                      </div>

                      {episode.description && (
                        <p className="text-gray-300 mb-4 leading-relaxed">
                          {episode.description}
                        </p>
                      )}

                      {episode.file_url && (
                        <div className="mt-4">
                          {episode.file_url.match(/\.(mp4|mov)$/i) ? (
                            <video
                              controls
                              className="w-full"

                            >
                              <source src={episode.file_url} type="video/mp4" />
                              <source src={episode.file_url} type="video/quicktime" />
                              Your browser does not support the video element.
                            </video>
                          ) : (
                            <audio
                              controls
                              className="w-full h-10"
                              style={{
                                filter: 'sepia(1) hue-rotate(240deg) saturate(2) brightness(0.8)',
                              }}
                            >
                              <source src={episode.file_url} type="audio/mp3" />
                              <source src={episode.file_url} type="audio/wav" />
                              <source src={episode.file_url} type="audio/ogg" />
                              Your browser does not support the audio element.
                            </audio>
                          )}
                        </div>
                      )}
                      {episode.uploaded_at && (
                        <div className="mt-3 text-sm text-gray-500">
                          Published: {new Date(episode.uploaded_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Podcasts Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">More in {podcast.category}</h2>
          <div className="text-gray-400">
            <Link
              to={`/podcast-category/${encodeURIComponent(podcast.category)}`}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Browse more {podcast.category} podcasts →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastDetailPage;