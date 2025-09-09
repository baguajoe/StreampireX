// src/front/js/component/RadioStationDetailPage.js - Enhanced with comprehensive audio error handling
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ErrorHandler, AuthErrorHandler } from '../utils/errorUtils';
import "../../styles/RadioStationDetail.css";

// Import the same static images for fallback
import LofiDreamsImg from "../../img/LofiDreams.png";
import JazzLoungeImg from "../../img/JazzLounge.png";
import TalkNationImg from "../../img/TalkNation.png";
import ElectricVibesImg from "../../img/ElectricVibes.png";
import ReggaeRootzImg from "../../img/ReggaeRootz.png";
import MorningClassicalImg from "../../img/MorningClassical.png";
import PopPulseImg from "../../img/PopPulse.png";
import RockRumbleImg from "../../img/RockRumble.png";
import UrbanSoulImg from "../../img/UrbanSoul.png";
import ChillHopCafeImg from "../../img/ChillHopCafe.png";
import CosmicJazzImg from "../../img/CosmicJazz.png";
import LoFiTempleImg from "../../img/LofiTemple.png";
import TheSynthLordsImg from "../../img/TheSynthLords.png";
import VelvetEchoImg from "../../img/VelvetEcho.png";
import DJNovaImg from "../../img/DJNova.png";
import TheGrooveMechanicsImg from "../../img/TheGrooveMechanics.png";
import IndigoRainImg from "../../img/IndigoRain.png";
import ZaraMoonlightImg from "../../img/ZaraMoonlight.png";

const RadioStationDetailPage = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [volume, setVolume] = useState(1.0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  
  // Station state
  const [station, setStation] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs
  const audioRef = useRef(null);
  const nowPlayingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Environment config
  const [backendUrl, setBackendUrl] = useState(null);

  // Static stations data
  const staticStations = {
    static1: { id: "static1", name: "LoFi Dreams", genre: "Lo-Fi", description: "Relaxing lo-fi beats to help you focus, study, or unwind. Perfect background music for any time of day.", image: LofiDreamsImg, listeners: "12.5K", rating: 4.8 },
    static2: { id: "static2", name: "Jazz Lounge", genre: "Jazz", description: "Smooth & classy jazz from the golden era to modern interpretations. Experience the sophisticated sounds of jazz legends.", image: JazzLoungeImg, listeners: "8.9K", rating: 4.9 },
    static3: { id: "static3", name: "Talk Nation", genre: "Talk Radio", description: "News, discussions, and thought-provoking conversations on current events, politics, and society.", image: TalkNationImg, listeners: "15.2K", rating: 4.6 },
    static4: { id: "static4", name: "Electric Vibes", genre: "Electronic", description: "High-energy electronic music perfect for workouts, parties, or when you need an energy boost.", image: ElectricVibesImg, listeners: "18.7K", rating: 4.7 },
    static5: { id: "static5", name: "Reggae Rootz", genre: "Reggae", description: "Authentic reggae rhythms and roots music that transport you to the islands. Feel the positive vibrations.", image: ReggaeRootzImg, listeners: "6.3K", rating: 4.8 },
    static6: { id: "static6", name: "Morning Classical", genre: "Classical", description: "Uplifting orchestral works perfect for starting your day. Beautiful classical compositions from renowned composers.", image: MorningClassicalImg, listeners: "4.1K", rating: 4.9 },
    static7: { id: "static7", name: "Pop Pulse", genre: "Pop", description: "The hottest pop hits and chart-toppers. Stay up to date with the latest mainstream music trends.", image: PopPulseImg, listeners: "25.8K", rating: 4.5 },
    static8: { id: "static8", name: "Rock Rumble", genre: "Rock", description: "Hard-hitting rock classics and modern rock anthems. Turn up the volume and feel the power of rock.", image: RockRumbleImg, listeners: "14.6K", rating: 4.8 },
    static9: { id: "static9", name: "Urban Soul", genre: "Soul", description: "Silky vocals and slow grooves that touch the soul. R&B and soul music at its finest.", image: UrbanSoulImg, listeners: "9.7K", rating: 4.7 },
    static10: { id: "static10", name: "Chill Hop Cafe", genre: "Hip Hop", description: "Instrumental hip hop beats perfect for studying, working, or relaxing. Laid-back vibes only.", image: ChillHopCafeImg, listeners: "11.4K", rating: 4.8 },
    static11: { id: "static11", name: "Cosmic Jazz", genre: "Jazz", description: "Out-of-this-world jazz improvisations and experimental sounds. Journey through space with cosmic jazz.", image: CosmicJazzImg, listeners: "5.8K", rating: 4.9 },
    static12: { id: "static12", name: "LoFi Temple", genre: "Lo-Fi", description: "Zen and mellow beats for meditation and mindfulness. Find your inner peace with these calming sounds.", image: LoFiTempleImg, listeners: "16.3K", rating: 4.9 },
    static13: { id: "static13", name: "The Synth Lords", genre: "Electronic", description: "Retro synthwave duos bringing back the 80s with modern production. Neon-soaked electronic soundscapes.", image: TheSynthLordsImg, listeners: "7.2K", rating: 4.6 },
    static14: { id: "static14", name: "Velvet Echo", genre: "Soul", description: "Smooth vocal powerhouse delivering emotional performances. Contemporary soul with classic influences.", image: VelvetEchoImg, listeners: "8.9K", rating: 4.8 },
    static15: { id: "static15", name: "DJ Nova", genre: "House", description: "Galactic EDM grooves and house music that will make you move. Dance floor anthems from across the universe.", image: DJNovaImg, listeners: "13.1K", rating: 4.7 },
    static16: { id: "static16", name: "The Groove Mechanics", genre: "Funk", description: "Bass-heavy funk that gets your body moving. Infectious grooves and rhythms that you can't resist.", image: TheGrooveMechanicsImg, listeners: "6.7K", rating: 4.8 },
    static17: { id: "static17", name: "Indigo Rain", genre: "Indie", description: "Dreamy alternative sounds and indie rock gems. Discover new artists and underground classics.", image: IndigoRainImg, listeners: "9.4K", rating: 4.7 },
    static18: { id: "static18", name: "Zara Moonlight", genre: "Pop", description: "Chart-topping solo artist with powerful vocals and catchy melodies. Pop perfection at its finest.", image: ZaraMoonlightImg, listeners: "19.8K", rating: 4.6 }
  };

  // Helper function to get backend URL
  const getBackendUrl = useCallback(() => {
    return process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
  }, []);

  useEffect(() => {
    try {
      const config = ErrorHandler.validateEnvironment();
      setBackendUrl(config.backendUrl);
    } catch (error) {
      setError(`Configuration Error: ${error.message}`);
      setLoading(false);
    }
  }, []);

  // FIXED getAudioUrl function with Cloudinary priority
  const getAudioUrl = useCallback(() => {
    if (!station) return null;

    console.log("🔍 Getting audio URL for station:", station.name);
    console.log("🔍 Station data:", {
        stream_url: station.stream_url,
        loop_audio_url: station.loop_audio_url,
        initial_mix_url: station.initial_mix_url,
        audio_url: station.audio_url,
        now_playing: station.now_playing_metadata
    });

    // Priority 1: Direct stream URL (Cloudinary)
    if (station.stream_url && station.stream_url.startsWith('http')) {
        console.log("✅ Using stream_url (Cloudinary):", station.stream_url);
        return station.stream_url;
    }
    
    // Priority 2: Audio URL field (Cloudinary)
    if (station.audio_url && station.audio_url.startsWith('http')) {
        console.log("✅ Using audio_url (Cloudinary):", station.audio_url);
        return station.audio_url;
    }
    
    // Priority 3: Loop audio URL (Cloudinary)
    if (station.loop_audio_url && station.loop_audio_url.startsWith('http')) {
        console.log("✅ Using loop_audio_url (Cloudinary):", station.loop_audio_url);
        return station.loop_audio_url;
    }
    
    // Priority 4: Initial mix URL (Cloudinary)  
    if (station.initial_mix_url && station.initial_mix_url.startsWith('http')) {
        console.log("✅ Using initial_mix_url (Cloudinary):", station.initial_mix_url);
        return station.initial_mix_url;
    }

    // Priority 5: From playlist metadata (Cloudinary)
    if (station.now_playing_metadata?.file_url && station.now_playing_metadata.file_url.startsWith('http')) {
        console.log("✅ Using now_playing file_url (Cloudinary):", station.now_playing_metadata.file_url);
        return station.now_playing_metadata.file_url;
    }

    // Priority 6: From playlist schedule (Cloudinary)
    if (station.playlist_schedule?.tracks?.length > 0) {
        const firstTrack = station.playlist_schedule.tracks[0];
        if (firstTrack.file_url && firstTrack.file_url.startsWith('http')) {
            console.log("✅ Using playlist track file_url (Cloudinary):", firstTrack.file_url);
            return firstTrack.file_url;
        }
    }
    
    console.log("❌ No valid Cloudinary audio URL found");
    return null;
  }, [station]);

  // Enhanced audio error handling
  const handleAudioError = useCallback((e) => {
    const audio = audioRef.current;
    const audioError = audio?.error;
    
    console.error("❌ Audio error:", e, audioError);
    
    let errorMessage = "Unknown audio error";
    let canRetry = false;
    
    if (audioError) {
      switch (audioError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Audio playback was aborted";
          canRetry = true;
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error while loading audio stream";
          canRetry = true;
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Audio format not supported or stream corrupted";
          canRetry = false;
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Audio source not available or format not supported";
          canRetry = false;
          break;
        default:
          errorMessage = `Audio error (code: ${audioError.code})`;
          canRetry = true;
      }
    }
    
    setAudioError({ message: errorMessage, canRetry });
    setConnectionStatus('error');
    setIsPlaying(false);
    setAudioLoading(false);
    
    // Auto-retry for network errors
    if (canRetry && retryCount < 3) {
      console.log(`🔄 Auto-retrying audio connection (${retryCount + 1}/3)`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        retryAudioConnection();
      }, 2000 * (retryCount + 1));
    }
  }, [retryCount]);

  // Audio event handlers
  const handleLoadStart = useCallback(() => {
    console.log("📡 Starting to load stream...");
    setAudioLoading(true);
    setConnectionStatus('connecting');
    setAudioError(null);
  }, []);

  const handleCanPlay = useCallback(() => {
    console.log("✅ Stream ready to play");
    setAudioLoading(false);
    setAudioReady(true);
    setConnectionStatus('ready');
    setRetryCount(0); // Reset retry count on success
  }, []);

  const handlePlaying = useCallback(() => {
    console.log("🔊 Audio is playing");
    setIsPlaying(true);
    setAudioLoading(false);
    setAudioError(null);
    setConnectionStatus('playing');
  }, []);

  const handlePause = useCallback(() => {
    console.log("⏸️ Audio paused");
    setIsPlaying(false);
    setAudioLoading(false);
    setConnectionStatus('paused');
  }, []);

  const handleWaiting = useCallback(() => {
    console.log("⏳ Audio buffering...");
    setAudioLoading(true);
    setConnectionStatus('buffering');
  }, []);

  const handleStalled = useCallback(() => {
    console.warn("⚠️ Audio stream stalled");
    setConnectionStatus('stalled');
    
    // Try to recover from stall
    setTimeout(() => {
      if (audioRef.current && !audioRef.current.ended) {
        console.log("🔄 Attempting to recover from stall");
        audioRef.current.load();
      }
    }, 3000);
  }, []);

  const handleVolumeChange = useCallback(() => {
    if (audioRef.current) {
      setVolume(audioRef.current.volume);
    }
  }, []);

  const handleEnded = useCallback(() => {
    console.log("🔄 Audio ended");
    
    // For loop-enabled stations, restart playback
    if (station?.is_loop_enabled) {
      console.log("🔄 Restarting loop...");
      setTimeout(() => {
        if (audioRef.current && isPlaying) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.error);
        }
      }, 100);
    } else {
      setIsPlaying(false);
    }
  }, [station, isPlaying]);

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('error', handleAudioError);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('error', handleAudioError);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleLoadStart, handleCanPlay, handlePlaying, handlePause, handleWaiting, handleStalled, handleAudioError, handleVolumeChange, handleEnded]);

  // Fetch station data with error handling
  const fetchStationData = useCallback(async () => {
    if (!backendUrl) return;

    try {
      setLoading(true);
      setError(null);

      if (type === 'static') {
        const staticStation = staticStations[id];
        if (staticStation) {
          setStation(staticStation);
        } else {
          setError("Station not found");
        }
        setLoading(false);
      } else {
        const url = `${backendUrl}/api/radio/${id}`;
        
        const data = await ErrorHandler.withRetry(
          async () => {
            return await ErrorHandler.fetchWithErrorHandling(url, {
              headers: {
                ...AuthErrorHandler.getAuthHeaders()
              }
            });
          },
          3, // Max retries
          1000 // Initial delay
        );

        setStation(data.station);
        console.log("📻 Station data:", data.station);
        
        // Try to fetch now playing info with better error handling
        if (data.station.is_live) {
          await fetchNowPlaying();
          startNowPlayingUpdates();
        }
      }
      
    } catch (error) {
      console.error('❌ Station fetch error:', error);
      
      if (AuthErrorHandler.handleAuthError(error, navigate)) {
        return;
      }
      
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, id, type, navigate]);

  // Fetch now playing with enhanced error handling
  const fetchNowPlaying = useCallback(async () => {
    if (!backendUrl || !id || type === 'static') return;

    try {
      const url = `${backendUrl}/api/radio/${id}/now-playing`;
      
      const response = await fetch(url, {
        headers: {
          ...AuthErrorHandler.getAuthHeaders()
        }
      });

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn("⚠️ Now playing endpoint returned non-JSON response");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setNowPlaying(data.now_playing);
        console.log("📻 Now playing updated:", data.now_playing);
      } else {
        console.warn(`⚠️ Now playing endpoint returned ${response.status}`);
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch now playing info:", err.message);
      // Don't throw error, just log warning since this is not critical
    }
  }, [backendUrl, id, type]);

  // Start periodic now playing updates
  const startNowPlayingUpdates = useCallback(() => {
    if (nowPlayingIntervalRef.current) {
      clearInterval(nowPlayingIntervalRef.current);
    }
    
    // Initial fetch
    fetchNowPlaying();
    
    // Set up interval
    nowPlayingIntervalRef.current = setInterval(() => {
      fetchNowPlaying();
    }, 30000); // Update every 30 seconds
  }, [fetchNowPlaying]);

  // Retry audio connection
  const retryAudioConnection = useCallback(() => {
    if (audioRef.current && station) {
      console.log("🔄 Retrying audio connection...");
      setAudioError(null);
      setConnectionStatus('connecting');
      
      // Force reload the audio source
      audioRef.current.load();
      
      // Try to play if it was playing before
      if (isPlaying) {
        setTimeout(() => {
          audioRef.current?.play().catch(err => {
            console.error("Failed to resume playback:", err);
          });
        }, 1000);
      }
    }
  }, [station, isPlaying]);

  // ENHANCED audio element setup with better Cloudinary support
  const setupAudioElement = useCallback(() => {
    const audioUrl = getAudioUrl();
    if (!audioUrl) {
        console.error("❌ No audio URL available for setup");
        setAudioError("No audio file available for this station");
        return null;
    }

    console.log("🎵 Setting up audio with Cloudinary URL:", audioUrl);

    const audio = new Audio();
    
    // Enhanced audio properties for Cloudinary
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    
    // Add comprehensive event listeners
    audio.addEventListener('loadstart', () => {
        console.log("🔄 Audio loading started");
        setConnectionStatus('connecting');
    });
    
    audio.addEventListener('canplay', () => {
        console.log("✅ Audio can play");
        setConnectionStatus('connected');
        setAudioLoading(false);
    });
    
    audio.addEventListener('loadeddata', () => {
        console.log("✅ Audio data loaded");
    });

    audio.addEventListener('loadedmetadata', () => {
        console.log("✅ Audio metadata loaded, duration:", audio.duration);
    });
    
    audio.addEventListener('error', (e) => {
        console.error("❌ Audio error event:", e);
        console.error("❌ Audio error object:", audio.error);
        
        let errorMessage = 'Audio failed to load';
        if (audio.error) {
            switch (audio.error.code) {
                case audio.error.MEDIA_ERR_ABORTED:
                    errorMessage = 'Audio loading was aborted';
                    break;
                case audio.error.MEDIA_ERR_NETWORK:
                    errorMessage = 'Network error while loading audio';
                    break;
                case audio.error.MEDIA_ERR_DECODE:
                    errorMessage = 'Audio format not supported';
                    break;
                case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Audio source not supported';
                    break;
                default:
                    errorMessage = `Audio error (code: ${audio.error.code})`;
            }
        }
        
        setAudioError(errorMessage);
        setConnectionStatus('error');
        setAudioLoading(false);
    });

    // Set the Cloudinary URL
    audio.src = audioUrl;
    
    return audio;
  }, [getAudioUrl]);

  // Play/pause handlers with error handling
  const handlePlay = useCallback(async () => {
    if (!audioRef.current || !station) return;

    try {
      setAudioLoading(true);
      setAudioError(null);
      
      // Check if audio is ready
      if (audioRef.current.readyState < 2) {
        console.log("Audio not ready, loading first...");
        audioRef.current.load();
        
        // Wait for canplay event
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Audio loading timeout'));
          }, 10000);
          
          audioRef.current.addEventListener('canplay', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
          
          audioRef.current.addEventListener('error', () => {
            clearTimeout(timeout);
            reject(new Error('Audio loading failed'));
          }, { once: true });
        });
      }
      
      await audioRef.current.play();
      startNowPlayingUpdates();
      
    } catch (error) {
      console.error("Play failed:", error);
      setAudioError({ 
        message: `Playback failed: ${error.message}`, 
        canRetry: true 
      });
      setAudioLoading(false);
      setConnectionStatus('error');
    }
  }, [station, startNowPlayingUpdates]);

  const handlePauseClick = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      
      // Stop now playing updates
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current);
      }
    }
  }, []);

  // Improved play/pause handler
  const handlePlayPause = useCallback(async () => {
    if (type === 'static') {
      setIsPlaying(!isPlaying);
      console.log(isPlaying ? "⏸️ Pausing" : "▶️ Playing", station?.name);
      return;
    }

    const audioUrl = getAudioUrl();
    if (!station || !audioUrl) {
      setAudioError("No audio available for this station");
      return;
    }

    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        console.log("⏸️ Paused:", station.name);
        return;
      }

      setAudioError(null);
      setAudioLoading(true);
      
      // Clean up existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      console.log("🎵 Creating new audio stream:", audioUrl);
      
      // Setup new audio element
      const audio = setupAudioElement();
      if (!audio) {
        setAudioError("Failed to create audio element");
        setAudioLoading(false);
        return;
      }

      audioRef.current = audio;
      
      // Load and play with better error handling
      try {
        audio.load();
        
        // Wait a bit for the audio to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Timeout loading audio"));
          }, 10000);
          
          const onCanPlay = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = (e) => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(new Error("Failed to load audio"));
          };
          
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('error', onError);
        });
        
        await audio.play();
        console.log("▶️ Successfully started playing:", station.name);
      } catch (playError) {
        console.error("❌ Play error:", playError);
        setAudioError(`Cannot start playback: ${playError.message}`);
        setAudioLoading(false);
        setConnectionStatus('error');
      }
      
    } catch (error) {
      console.error("❌ Audio control error:", error);
      setAudioError(`Audio error: ${error.message}`);
      setAudioLoading(false);
      setConnectionStatus('error');
    }
  }, [type, isPlaying, station, getAudioUrl, setupAudioElement]);

  // Volume control
  const handleVolumeChangeInput = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (nowPlayingIntervalRef.current) {
      clearInterval(nowPlayingIntervalRef.current);
    }
    navigate(-1);
  }, [navigate]);

  // Dismiss audio error
  const dismissAudioError = useCallback(() => {
    setAudioError(null);
  }, []);

  // Initialize
  useEffect(() => {
    if (backendUrl || type === 'static') {
      fetchStationData();
    }

    return () => {
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [backendUrl, fetchStationData, type]);

  // FIXED Logo Rendering
  const renderStationLogo = () => {
    console.log("🖼️ Rendering logo, URL:", station?.logo_url);
    
    if (!station?.logo_url) {
        return (
            <div className="station-logo-placeholder">
                <span style={{ fontSize: '2rem' }}>📻</span>
                <p style={{ margin: '5px 0', fontSize: '12px' }}>No Logo</p>
            </div>
        );
    }

    return (
        <div className="station-logo-container">
            <img 
                src={station.logo_url} 
                alt={`${station.name} logo`}
                className="station-logo"
                onLoad={() => {
                    console.log("✅ Logo loaded successfully:", station.logo_url);
                }}
                onError={(e) => {
                    console.error("❌ Logo failed to load:", station.logo_url);
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `
                        <div class="station-logo-placeholder">
                            <span style="font-size: 2rem">📻</span>
                            <p style="margin: 5px 0; font-size: 12px">Logo Error</p>
                        </div>
                    `;
                }}
            />
        </div>
    );
  };

  // Render helpers
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <span className="connection-status connecting">🔄 Connecting...</span>;
      case 'connected':
        return <span className="connection-status connected">🟢 Connected</span>;
      case 'error':
        return <span className="connection-status error">🔴 Connection Error</span>;
      default:
        return null;
    }
  };

  // ENHANCED Play Button with Better Error Handling
  const renderPlayButton = () => {
    const audioUrl = getAudioUrl();
    const isDisabled = !audioUrl || audioLoading;
    
    let buttonText = '▶️ Play';
    let buttonClass = 'play-button';
    
    if (audioLoading) {
        buttonText = '⏳ Loading...';
        buttonClass += ' loading';
    } else if (isPlaying) {
        buttonText = '⏸️ Pause';
        buttonClass += ' playing';
    }

    if (isDisabled) {
        buttonClass += ' disabled';
    }

    return (
        <div className="play-button-container">
            <button 
                onClick={handlePlayPause} 
                className={buttonClass}
                disabled={isDisabled}
                title={!audioUrl ? 'No audio available' : isPlaying ? 'Pause' : 'Play'}
            >
                {buttonText}
            </button>
            {!audioUrl && (
                <p className="no-audio-message">
                    ⚠️ No audio file available
                </p>
            )}
        </div>
    );
  };

  const renderNowPlaying = () => {
    if (type === 'static') {
      return (
        <div className="now-playing">
          <p>🎵 Currently streaming {station.genre} music</p>
          <p>🔴 Live broadcast</p>
        </div>
      );
    }

    if (!station?.is_live) return null;

    return (
      <div className="now-playing">
        {station.now_playing_metadata ? (
          <>
            <p><strong>🎵 {station.now_playing_metadata.title || 'Unknown Track'}</strong></p>
            <p>👤 {station.now_playing_metadata.artist || 'Unknown Artist'}</p>
            {station.now_playing_metadata.duration && (
              <p>⏱️ Duration: {station.now_playing_metadata.duration}</p>
            )}
            {station.is_loop_enabled && (
              <p>🔄 Looping enabled</p>
            )}
          </>
        ) : nowPlaying ? (
          <>
            <p><strong>🎵 {nowPlaying.title}</strong></p>
            <p>👤 {nowPlaying.artist}</p>
            {nowPlaying.duration && <p>⏱️ Duration: {nowPlaying.duration}</p>}
          </>
        ) : (
          <p>🎵 Currently streaming {station.genre || station.genres?.[0] || 'music'}</p>
        )}
        <p>🔴 Live broadcast</p>
      </div>
    );
  };

  // DEBUG Component (for development)
  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    const audioUrl = getAudioUrl();
    
    return (
        <div style={{ 
            background: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            padding: '15px', 
            margin: '15px 0',
            borderRadius: '8px',
            fontSize: '14px'
        }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>🐛 Debug Info</h4>
            <p><strong>Station ID:</strong> {station?.id}</p>
            <p><strong>Station Name:</strong> {station?.name}</p>
            <p><strong>Logo URL:</strong> {station?.logo_url || 'None'}</p>
            <p><strong>Audio URL:</strong> {audioUrl || 'None'}</p>
            <p><strong>Is Live:</strong> {station?.is_live ? 'Yes' : 'No'}</p>
            <p><strong>Loop Enabled:</strong> {station?.is_loop_enabled ? 'Yes' : 'No'}</p>
            <p><strong>Connection Status:</strong> {connectionStatus}</p>
            {audioError && <p style={{color: 'red'}}><strong>Audio Error:</strong> {audioError}</p>}
            
            <button 
                onClick={() => {
                    console.log("🔍 Full Station Object:", station);
                    if (audioUrl) {
                        window.open(audioUrl, '_blank');
                    }
                }}
                style={{
                    marginTop: '10px',
                    padding: '5px 10px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                Test Audio URL
            </button>
        </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="station-detail-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading station details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !station) {
    return (
      <div className="station-detail-error">
        <h2>❌ Station Not Found</h2>
        <p>Sorry, we couldn't find the radio station you're looking for.</p>
        <p className="error-details">{error}</p>
        <button onClick={handleBack} className="back-button">
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="station-detail-container">
      <div className="station-detail-header">
        <button onClick={handleBack} className="back-button">
          ← Back to Stations
        </button>
      </div>

      <div className="station-detail-content">
        <div className="station-info">
          <div className="station-image-container">
            <img 
              src={station.image || station.cover_image_url || station.logo_url} 
              alt={station.name} 
              className="station-detail-image"
              onError={(e) => {
                e.target.src = LofiDreamsImg; // Fallback image
              }}
            />
            {/* Render station logo separately */}
            {renderStationLogo()}
          </div>
          
          <div className="station-meta">
            <h1 className="station-name">{station.name}</h1>
            <p className="station-genre">{station.genre || (station.genres && station.genres[0])}</p>
            <p className="station-description">{station.description}</p>
            
            <div className="station-stats">
              {station.listeners && (
                <span className="stat">
                  👥 {station.listeners} listeners
                </span>
              )}
              {station.rating && (
                <span className="stat">
                  ⭐ {station.rating}/5.0
                </span>
              )}
              {station.is_live && (
                <span className="stat live-indicator">
                  🔴 LIVE
                </span>
              )}
              {station.is_loop_enabled && (
                <span className="stat loop-indicator">
                  🔄 LOOP
                </span>
              )}
              {type !== 'static' && !station.is_live && (
                <span className="stat offline-indicator">
                  ⚫ OFFLINE
                </span>
              )}
              {connectionStatus !== 'disconnected' && renderConnectionStatus()}
            </div>

            {/* Audio Player */}
            <div className="audio-player">
              <audio
                ref={audioRef}
                preload="none"
                crossOrigin="anonymous"
              >
                {station.stream_url && <source src={station.stream_url} type="audio/mpeg" />}
                {station.stream_url && <source src={station.stream_url} type="audio/ogg" />}
                Your browser does not support the audio element.
              </audio>

              {/* Error Display */}
              {audioError && (
                <div className="audio-error">
                  <div className="error-message">
                    <span>⚠️ {audioError.message || audioError}</span>
                    {audioError.canRetry && (
                      <button onClick={retryAudioConnection} className="retry-btn">
                        🔄 Retry
                      </button>
                    )}
                    <button 
                      onClick={dismissAudioError} 
                      className="dismiss-error"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {audioError.canRetry && (
                    <div className="troubleshooting">
                      <h4>Troubleshooting:</h4>
                      <ul>
                        <li>Check your internet connection</li>
                        <li>Try refreshing the page</li>
                        <li>Disable ad blockers or VPN</li>
                        <li>Try a different browser</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {audioLoading && (
                <div className="audio-loading">
                  ⏳ Loading audio stream...
                </div>
              )}

              {/* Player Controls */}
              <div className="player-controls">
                <button
                  className={`play-pause-btn ${isPlaying ? 'playing' : ''}`}
                  onClick={isPlaying ? handlePauseClick : handlePlay}
                  disabled={audioLoading || (audioError && !audioError.canRetry)}
                >
                  {audioLoading ? (
                    <div className="loading-spinner"></div>
                  ) : isPlaying ? (
                    '⏸️'
                  ) : (
                    '▶️'
                  )}
                  <span>{audioLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                {/* Volume Control */}
                <div className="volume-control">
                  <span>🔊</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChangeInput}
                    className="volume-slider"
                  />
                  <span>{Math.round(volume * 100)}%</span>
                </div>
              </div>

              {/* Now Playing in Audio Player */}
              {nowPlaying && (
                <div className="now-playing">
                  <h3>🎵 Now Playing</h3>
                  <div className="track-info">
                    <div className="track-title">{nowPlaying.title || 'Unknown Track'}</div>
                    <div className="track-artist">{nowPlaying.artist || 'Unknown Artist'}</div>
                    {nowPlaying.album && <div className="track-album">{nowPlaying.album}</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="station-controls">
              {renderPlayButton()}
              
              <button className="favorite-button">
                ❤️ Add to Favorites
              </button>

              {/* Development debug info */}
              {renderDebugInfo()}
            </div>
          </div>
        </div>

        {/* Station Details */}
        <div className="station-details">
          <div className="station-stats">
            <div className="stat">
              <span className="label">Status:</span>
              <span className={`value ${station.is_live ? 'live' : 'offline'}`}>
                {station.is_live ? '🔴 Live' : '⚫ Offline'}
              </span>
            </div>
            
            <div className="stat">
              <span className="label">Genre:</span>
              <span className="value">{station.genre || 'General'}</span>
            </div>
            
            <div className="stat">
              <span className="label">Listeners:</span>
              <span className="value">{station.listener_count || station.listeners || 0}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>About This Station</h3>
            <p>
              {station.description || `This station brings you the best music in the ${station.genre || station.genres?.[0] || 'various'} genre.`}
            </p>
          </div>

          {/* Now playing section */}
          {(type !== 'static' && station.is_live) || type === 'static' ? (
            <div className="detail-section">
              <h3>Now Playing</h3>
              {renderNowPlaying()}
            </div>
          ) : null}

          {/* Station info grid */}
          <div className="detail-section">
            <h3>Station Info</h3>
            <div className="station-info-grid">
              <div className="info-item">
                <strong>Genre:</strong> {station.genre || (station.genres && station.genres[0]) || 'Music'}
              </div>
              <div className="info-item">
                <strong>Type:</strong> {type === 'static' ? 'Featured Station' : 'Live Station'}
              </div>
              {station.listeners && (
                <div className="info-item">
                  <strong>Listeners:</strong> {station.listeners}
                </div>
              )}
              {station.rating && (
                <div className="info-item">
                  <strong>Rating:</strong> {station.rating}/5.0 ⭐
                </div>
              )}
              {station.creator_name && (
                <div className="info-item">
                  <strong>Created by:</strong> {station.creator_name}
                </div>
              )}
              {station.created_at && (
                <div className="info-item">
                  <strong>Created:</strong> {new Date(station.created_at).toLocaleDateString()}
                </div>
              )}
              {station.is_loop_enabled && station.loop_duration_minutes && (
                <div className="info-item">
                  <strong>Loop Duration:</strong> {station.loop_duration_minutes} minutes
                </div>
              )}
            </div>
          </div>

          {/* Additional features */}
          {type !== 'static' && station.submission_guidelines && (
            <div className="detail-section">
              <h3>Submission Guidelines</h3>
              <p>{station.submission_guidelines}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RadioStationDetailPage;