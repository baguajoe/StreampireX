import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/LiveStreamViewer.css';

const LiveStreamViewer = () => {
    const { id } = useParams();
    const { store } = useContext(Context);
    const navigate = useNavigate();
    
    const videoRef = useRef(null);
    const socketRef = useRef(null);
    
    const [stream, setStream] = useState(null);
    const [streamer, setStreamer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Live stats
    const [viewerCount, setViewerCount] = useState(0);
    const [likeCount, setLikeCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    
    // Chat
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(true);
    
    // Video controls
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        fetchStream();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [id]);

    const fetchStream = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/live/stream/${id}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    setError('Stream not found');
                } else {
                    setError('Failed to load stream');
                }
                return;
            }
            
            const data = await response.json();
            setStream(data.stream || data);
            setStreamer(data.streamer || data.user);
            setViewerCount(data.viewer_count || 0);
            setLikeCount(data.like_count || 0);
            
            // Connect to WebSocket
            connectWebSocket();
            
        } catch (err) {
            console.error('Error fetching stream:', err);
            setError('Failed to load stream');
        } finally {
            setLoading(false);
        }
    };

    const connectWebSocket = () => {
        try {
            const wsUrl = process.env.REACT_APP_WS_URL || process.env.REACT_APP_BACKEND_URL?.replace('http', 'ws');
            if (!wsUrl) return;
            
            socketRef.current = new WebSocket(`${wsUrl}/ws/stream/${id}`);
            
            socketRef.current.onopen = () => {
                console.log('Connected to stream');
                // Notify joining
                socketRef.current.send(JSON.stringify({
                    type: 'join',
                    userId: store.user?.id,
                    userName: store.user?.username || 'Guest'
                }));
            };
            
            socketRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    switch (data.type) {
                        case 'viewer_count':
                            setViewerCount(data.count);
                            break;
                        case 'like':
                            setLikeCount(prev => prev + 1);
                            break;
                        case 'chat':
                            setChatMessages(prev => [...prev, data.message].slice(-100));
                            break;
                        case 'stream_ended':
                            setError('Stream has ended');
                            break;
                        default:
                            break;
                    }
                } catch (e) {
                    console.error('WebSocket message error:', e);
                }
            };
            
            socketRef.current.onclose = () => {
                console.log('Disconnected from stream');
            };
            
        } catch (err) {
            console.log('WebSocket not available');
        }
    };

    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        
        if (!store.user) {
            alert('Please log in to chat');
            return;
        }
        
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: 'chat',
                message: chatInput.trim(),
                sender: store.user?.username || 'Anonymous',
                senderId: store.user?.id
            }));
            setChatInput('');
        }
    };

    const handleLike = () => {
        if (hasLiked) return;
        
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: 'like',
                userId: store.user?.id
            }));
            setHasLiked(true);
            setLikeCount(prev => prev + 1);
        }
    };

    const toggleFullscreen = () => {
        const container = document.querySelector('.video-player-container');
        if (!document.fullscreenElement) {
            container?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const shareStream = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Stream link copied!');
    };

    if (loading) {
        return (
            <div className="viewer-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading stream...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="viewer-page">
                <div className="error-state">
                    <h2>😔 {error}</h2>
                    <p>This stream may have ended or doesn't exist.</p>
                    <Link to="/live-streams" className="back-btn">
                        ← Browse Live Streams
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="viewer-page">
            <div className="viewer-layout">
                {/* Main Video Section */}
                <div className="video-section">
                    <div className="video-player-container">
                        {/* Live Badge */}
                        <div className="live-badge">
                            <span className="live-dot"></span>
                            LIVE
                        </div>
                        
                        {/* Video Player */}
                        <div className="video-wrapper">
                            {stream?.stream_url ? (
                                <video
                                    ref={videoRef}
                                    src={stream.stream_url}
                                    autoPlay
                                    playsInline
                                    className="stream-video"
                                />
                            ) : (
                                <div className="video-placeholder">
                                    <div className="placeholder-content">
                                        <span className="placeholder-icon">📺</span>
                                        <p>Stream is starting...</p>
                                        <p className="sub">Waiting for broadcaster</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Video Controls */}
                        <div className="video-controls">
                            <div className="controls-left">
                                <button onClick={toggleMute} className="control-btn">
                                    {isMuted ? '🔇' : '🔊'}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="volume-slider"
                                />
                            </div>
                            <div className="controls-right">
                                <button onClick={toggleFullscreen} className="control-btn">
                                    {isFullscreen ? '⛶' : '⛶'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stream Info */}
                    <div className="stream-info">
                        <div className="stream-header">
                            <h1>{stream?.title || 'Live Stream'}</h1>
                            <div className="stream-stats">
                                <span className="stat">
                                    👁️ {viewerCount} watching
                                </span>
                            </div>
                        </div>
                        
                        <div className="streamer-info">
                            <Link to={`/profile/${streamer?.username || streamer?.id}`} className="streamer-link">
                                <img 
                                    src={streamer?.avatar || streamer?.profile_picture || '/default-avatar.png'} 
                                    alt={streamer?.username}
                                    className="streamer-avatar"
                                />
                                <div className="streamer-details">
                                    <span className="streamer-name">
                                        {streamer?.display_name || streamer?.username || 'Streamer'}
                                    </span>
                                    <span className="streamer-followers">
                                        {streamer?.followers_count || 0} followers
                                    </span>
                                </div>
                            </Link>
                            
                            <div className="stream-actions">
                                <button 
                                    onClick={handleLike}
                                    className={`action-btn like ${hasLiked ? 'liked' : ''}`}
                                >
                                    {hasLiked ? '❤️' : '🤍'} {likeCount}
                                </button>
                                <button onClick={shareStream} className="action-btn share">
                                    🔗 Share
                                </button>
                            </div>
                        </div>
                        
                        {stream?.description && (
                            <div className="stream-description">
                                <p>{stream.description}</p>
                            </div>
                        )}
                        
                        <div className="stream-tags">
                            <span className="tag">{stream?.category || 'Live'}</span>
                        </div>
                    </div>
                </div>

                {/* Chat Section */}
                <div className={`chat-section ${isChatOpen ? 'open' : 'closed'}`}>
                    <div className="chat-header">
                        <h3>💬 Live Chat</h3>
                        <button onClick={() => setIsChatOpen(!isChatOpen)} className="toggle-chat">
                            {isChatOpen ? '✕' : '💬'}
                        </button>
                    </div>
                    
                    {isChatOpen && (
                        <>
                            <div className="chat-messages">
                                {chatMessages.length === 0 ? (
                                    <div className="no-messages">
                                        <p>Welcome to the chat!</p>
                                        <p>Be the first to say something.</p>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, index) => (
                                        <div key={index} className={`chat-message ${msg.senderId === store.user?.id ? 'own' : ''}`}>
                                            <span className="message-sender">{msg.sender}</span>
                                            <span className="message-text">{msg.text || msg.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="chat-input-area">
                                {store.user ? (
                                    <>
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                            placeholder="Send a message..."
                                        />
                                        <button onClick={sendChatMessage}>Send</button>
                                    </>
                                ) : (
                                    <div className="login-prompt">
                                        <Link to="/login">Log in to chat</Link>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveStreamViewer;