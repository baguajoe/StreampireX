import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/GoLivePage.css';

const GoLivePage = () => {
    const { store } = useContext(Context);
    const navigate = useNavigate();
    
    // Refs
    const localVideoRef = useRef(null);
    const popupVideoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const socketRef = useRef(null);
    
    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLive, setIsLive] = useState(false);
    const [streamData, setStreamData] = useState(null);
    const [setupComplete, setSetupComplete] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    
    // Media controls
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMic, setSelectedMic] = useState('');
    const [availableCameras, setAvailableCameras] = useState([]);
    const [availableMics, setAvailableMics] = useState([]);
    
    // Stream settings
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Music');
    const [isTicketed, setIsTicketed] = useState(false);
    const [ticketPrice, setTicketPrice] = useState('');
    const [hasLiveChat, setHasLiveChat] = useState(true);
    
    // Live stats
    const [viewerCount, setViewerCount] = useState(0);
    const [likeCount, setLikeCount] = useState(0);
    const [streamDuration, setStreamDuration] = useState(0);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');

    const categories = [
        'Music', 'Gaming', 'Talk Show', 'Podcast', 'DJ Set', 
        'Tutorial', 'Q&A', 'Concert', 'Art', 'Fitness', 'Other'
    ];

    // Auto-initialize camera on page load
    useEffect(() => {
        initializeCamera();
        return () => {
            stopMediaStream();
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    // Duration timer when live
    useEffect(() => {
        let interval;
        if (isLive) {
            interval = setInterval(() => {
                setStreamDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isLive]);

    // Update popup video when it opens
    useEffect(() => {
        if (showPopup && popupVideoRef.current && mediaStreamRef.current) {
            popupVideoRef.current.srcObject = mediaStreamRef.current;
        }
    }, [showPopup]);

    const initializeCamera = async () => {
        try {
            setError('');
            
            // Request permissions and get stream
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            // Set the stream to video element
            mediaStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            
            // Get available devices after permission granted
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');
            const mics = devices.filter(d => d.kind === 'audioinput');
            
            setAvailableCameras(cameras);
            setAvailableMics(mics);
            
            if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
            if (mics.length > 0) setSelectedMic(mics[0].deviceId);
            
            setSetupComplete(true);
            
        } catch (err) {
            console.error('Error initializing camera:', err);
            if (err.name === 'NotAllowedError') {
                setError('Camera/microphone permission denied. Please allow access and refresh the page.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera or microphone found. Please connect a device.');
            } else {
                setError('Failed to access camera/microphone. Please check permissions.');
            }
        }
    };

    const stopMediaStream = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (popupVideoRef.current) {
            popupVideoRef.current.srcObject = null;
        }
    };

    const toggleCamera = () => {
        if (mediaStreamRef.current) {
            const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOn(videoTrack.enabled);
            }
        }
    };

    const toggleMic = () => {
        if (mediaStreamRef.current) {
            const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    const switchCamera = async (deviceId) => {
        setSelectedCamera(deviceId);
        if (setupComplete && mediaStreamRef.current) {
            try {
                // Stop current video track
                const oldVideoTrack = mediaStreamRef.current.getVideoTracks()[0];
                if (oldVideoTrack) oldVideoTrack.stop();
                
                // Get new video track
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId } }
                });
                const newVideoTrack = newStream.getVideoTracks()[0];
                
                // Replace track in stream
                mediaStreamRef.current.removeTrack(oldVideoTrack);
                mediaStreamRef.current.addTrack(newVideoTrack);
                
                // Update video elements
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = mediaStreamRef.current;
                }
                if (popupVideoRef.current) {
                    popupVideoRef.current.srcObject = mediaStreamRef.current;
                }
            } catch (err) {
                console.error('Error switching camera:', err);
                setError('Failed to switch camera');
            }
        }
    };

    const switchMic = async (deviceId) => {
        setSelectedMic(deviceId);
        if (setupComplete && mediaStreamRef.current) {
            try {
                // Stop current audio track
                const oldAudioTrack = mediaStreamRef.current.getAudioTracks()[0];
                if (oldAudioTrack) oldAudioTrack.stop();
                
                // Get new audio track
                const newStream = await navigator.mediaDevices.getUserMedia({
                    audio: { deviceId: { exact: deviceId } }
                });
                const newAudioTrack = newStream.getAudioTracks()[0];
                
                // Replace track in stream
                mediaStreamRef.current.removeTrack(oldAudioTrack);
                mediaStreamRef.current.addTrack(newAudioTrack);
            } catch (err) {
                console.error('Error switching microphone:', err);
                setError('Failed to switch microphone');
            }
        }
    };

    const startStream = async () => {
        if (!title.trim()) {
            setError('Please enter a stream title');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            
            // Create stream on backend - using /api/live/start
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/live/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    category,
                    is_ticketed: isTicketed,
                    ticket_price: isTicketed ? parseFloat(ticketPrice) || 0 : 0,
                    has_live_chat: hasLiveChat
                })
            });

            const data = await response.json();

            if (response.ok) {
                setIsLive(true);
                setStreamData(data.stream || data);
                setStreamDuration(0);
                setShowPopup(true); // Show the popup!
                
                // Connect to WebSocket for real-time updates
                connectWebSocket(data.stream?.id || data.id);
                
            } else {
                setError(data.error || 'Failed to start stream');
            }
        } catch (err) {
            console.error('Start stream error:', err);
            setError('Failed to start stream. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const connectWebSocket = (streamId) => {
        try {
            const wsUrl = process.env.REACT_APP_WS_URL || process.env.REACT_APP_BACKEND_URL?.replace('http', 'ws');
            if (!wsUrl) return;
            
            socketRef.current = new WebSocket(`${wsUrl}/ws/stream/${streamId}`);
            
            socketRef.current.onopen = () => {
                console.log('WebSocket connected');
            };
            
            socketRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'viewer_count') {
                        setViewerCount(data.count);
                    } else if (data.type === 'like') {
                        setLikeCount(prev => prev + 1);
                    } else if (data.type === 'chat') {
                        setChatMessages(prev => [...prev, data.message].slice(-50));
                    }
                } catch (e) {
                    console.error('WebSocket message parse error:', e);
                }
            };
            
            socketRef.current.onerror = (err) => {
                console.error('WebSocket error:', err);
            };
        } catch (err) {
            console.log('WebSocket not available');
        }
    };

    const stopStream = async () => {
        if (!window.confirm('Are you sure you want to end your live stream?')) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/live/stop`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stream_id: streamData?.id })
            });

            if (response.ok) {
                setIsLive(false);
                setStreamData(null);
                setShowPopup(false);
                
                if (socketRef.current) {
                    socketRef.current.close();
                }
                
                alert('Stream ended successfully!');
            }
        } catch (err) {
            console.error('Stop stream error:', err);
            setError('Failed to stop stream');
        } finally {
            setLoading(false);
        }
    };

    const sendChatMessage = () => {
        if (chatInput.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: 'chat',
                message: chatInput.trim(),
                sender: store.user?.username || 'Streamer'
            }));
            setChatInput('');
        }
    };

    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const copyStreamLink = () => {
        const link = `${window.location.origin}/live-streams/${streamData?.id}`;
        navigator.clipboard.writeText(link);
        alert('Stream link copied to clipboard!');
    };

    // ============ LIVE POPUP COMPONENT ============
    const LivePopup = () => (
        <div className={`live-popup-overlay ${isMinimized ? 'minimized' : ''}`}>
            <div className={`live-popup ${isMinimized ? 'minimized' : ''}`}>
                {/* Popup Header */}
                <div className="popup-header">
                    <div className="popup-title">
                        <span className="live-indicator">
                            <span className="live-dot"></span>
                            LIVE
                        </span>
                        <span className="stream-title">{title}</span>
                    </div>
                    <div className="popup-header-actions">
                        <button 
                            className="popup-btn"
                            onClick={() => setIsMinimized(!isMinimized)}
                            title={isMinimized ? 'Expand' : 'Minimize'}
                        >
                            {isMinimized ? '⬆️' : '⬇️'}
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    <div className="popup-content">
                        {/* Video Section */}
                        <div className="popup-video-section">
                            <div className="popup-video-container">
                                <video
                                    ref={popupVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="popup-video"
                                />
                                
                                {/* Video Controls Overlay */}
                                <div className="popup-video-controls">
                                    <button 
                                        onClick={toggleCamera}
                                        className={`ctrl-btn ${!isCameraOn ? 'off' : ''}`}
                                        title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
                                    >
                                        {isCameraOn ? '📹' : '🚫'}
                                    </button>
                                    <button 
                                        onClick={toggleMic}
                                        className={`ctrl-btn ${!isMicOn ? 'off' : ''}`}
                                        title={isMicOn ? 'Mute mic' : 'Unmute mic'}
                                    >
                                        {isMicOn ? '🎤' : '🔇'}
                                    </button>
                                </div>
                            </div>

                            {/* Stream Stats */}
                            <div className="popup-stats">
                                <div className="stat-item">
                                    <span className="stat-icon">👁️</span>
                                    <span>{viewerCount} watching</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-icon">❤️</span>
                                    <span>{likeCount} likes</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-icon">⏱️</span>
                                    <span>{formatDuration(streamDuration)}</span>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="popup-actions">
                                <button onClick={copyStreamLink} className="share-btn">
                                    🔗 Copy Link
                                </button>
                                <button 
                                    onClick={stopStream}
                                    className="end-btn"
                                    disabled={loading}
                                >
                                    {loading ? '⏳ Ending...' : '⏹️ End Stream'}
                                </button>
                            </div>
                        </div>

                        {/* Chat Section */}
                        {hasLiveChat && (
                            <div className="popup-chat">
                                <div className="chat-header">
                                    <h4>💬 Live Chat</h4>
                                </div>
                                
                                <div className="chat-messages">
                                    {chatMessages.length === 0 ? (
                                        <div className="no-chat">
                                            <p>Waiting for messages...</p>
                                        </div>
                                    ) : (
                                        chatMessages.map((msg, index) => (
                                            <div key={index} className="chat-msg">
                                                <span className="sender">{msg.sender}:</span>
                                                <span className="text">{msg.text || msg.message}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                
                                <div className="chat-input">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                        placeholder="Say something to viewers..."
                                    />
                                    <button onClick={sendChatMessage}>Send</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Minimized View */}
                {isMinimized && (
                    <div className="popup-mini">
                        <div className="mini-stats">
                            <span>👁️ {viewerCount}</span>
                            <span>⏱️ {formatDuration(streamDuration)}</span>
                        </div>
                        <button 
                            onClick={stopStream}
                            className="mini-end"
                            disabled={loading}
                        >
                            End
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    // ============ SETUP VIEW ============
    return (
        <div className="go-live-page">
            {/* Show popup when live */}
            {showPopup && <LivePopup />}

            <div className="go-live-container">
                <div className="go-live-header">
                    <h1>🎥 Go Live</h1>
                    <p>Set up your camera and start streaming to your audience</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {isLive && !showPopup && (
                    <div className="live-banner" onClick={() => setShowPopup(true)}>
                        <span className="live-dot"></span>
                        <span>You're currently live! Click to open controls.</span>
                    </div>
                )}

                <div className="setup-layout">
                    {/* Video Preview Section */}
                    <div className="preview-section">
                        <div className="video-preview-container">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="preview-video"
                            />
                            {setupComplete && (
                                <div className="preview-controls">
                                    <button 
                                        onClick={toggleCamera}
                                        className={`control-btn ${!isCameraOn ? 'off' : ''}`}
                                    >
                                        {isCameraOn ? '📹 Camera On' : '🚫 Camera Off'}
                                    </button>
                                    <button 
                                        onClick={toggleMic}
                                        className={`control-btn ${!isMicOn ? 'off' : ''}`}
                                    >
                                        {isMicOn ? '🎤 Mic On' : '🔇 Mic Off'}
                                    </button>
                                </div>
                            )}
                            {!setupComplete && !error && (
                                <div className="preview-loading">
                                    <p>🎥 Loading camera...</p>
                                </div>
                            )}
                        </div>

                        {/* Device Selection */}
                        <div className="device-selection">
                            <div className="device-select">
                                <label>📹 Camera</label>
                                <select 
                                    value={selectedCamera}
                                    onChange={(e) => switchCamera(e.target.value)}
                                    disabled={!setupComplete}
                                >
                                    {availableCameras.map(cam => (
                                        <option key={cam.deviceId} value={cam.deviceId}>
                                            {cam.label || `Camera ${availableCameras.indexOf(cam) + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="device-select">
                                <label>🎤 Microphone</label>
                                <select 
                                    value={selectedMic}
                                    onChange={(e) => switchMic(e.target.value)}
                                    disabled={!setupComplete}
                                >
                                    {availableMics.map(mic => (
                                        <option key={mic.deviceId} value={mic.deviceId}>
                                            {mic.label || `Microphone ${availableMics.indexOf(mic) + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Stream Settings Form */}
                    <div className="settings-section">
                        <div className="form-section">
                            <h3>📝 Stream Details</h3>
                            
                            <div className="form-group">
                                <label>Stream Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="What's your stream about?"
                                    maxLength={100}
                                    disabled={isLive}
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Tell viewers what to expect..."
                                    rows={3}
                                    maxLength={500}
                                    disabled={isLive}
                                />
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select 
                                    value={category} 
                                    onChange={(e) => setCategory(e.target.value)}
                                    disabled={isLive}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>⚙️ Stream Options</h3>
                            
                            <div className="checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={hasLiveChat}
                                        onChange={(e) => setHasLiveChat(e.target.checked)}
                                        disabled={isLive}
                                    />
                                    <span className="checkmark"></span>
                                    Enable Live Chat
                                </label>
                            </div>

                            <div className="checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={isTicketed}
                                        onChange={(e) => setIsTicketed(e.target.checked)}
                                        disabled={isLive}
                                    />
                                    <span className="checkmark"></span>
                                    Ticketed Event (Paid Access)
                                </label>
                            </div>

                            {isTicketed && (
                                <div className="form-group">
                                    <label>Ticket Price ($)</label>
                                    <input
                                        type="number"
                                        value={ticketPrice}
                                        onChange={(e) => setTicketPrice(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        disabled={isLive}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Go Live Button */}
                        <div className="form-actions">
                            <button 
                                onClick={() => navigate(-1)} 
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                            {!isLive ? (
                                <button 
                                    onClick={startStream}
                                    className="start-stream-btn"
                                    disabled={loading || !title.trim() || !setupComplete}
                                >
                                    {loading ? '⏳ Starting...' : '🔴 Go Live'}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setShowPopup(true)}
                                    className="show-popup-btn"
                                >
                                    📺 Show Live Controls
                                </button>
                            )}
                        </div>

                        {!setupComplete && (
                            <p className="setup-reminder">
                                ⚠️ Waiting for camera access...
                            </p>
                        )}
                    </div>
                </div>

                {/* Tips */}
                <div className="stream-tips">
                    <h4>💡 Tips for a Great Stream</h4>
                    <ul>
                        <li>Make sure you have good lighting on your face</li>
                        <li>Test your audio before going live</li>
                        <li>Have a stable internet connection</li>
                        <li>Engage with your chat and acknowledge viewers</li>
                        <li>Let your followers know you're going live!</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default GoLivePage;