// src/front/js/pages/WebRTCPage.js - Enhanced with comprehensive error handling
import React, { useState, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { ErrorHandler, WebSocketErrorHandler } from "../utils/errorUtils";

const WebRTCChat = ({ roomId, userId, userName }) => {
  // State management
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [errors, setErrors] = useState([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Environment validation
  const [backendUrl, setBackendUrl] = useState(null);

  useEffect(() => {
    try {
      const config = ErrorHandler.validateEnvironment();
      setBackendUrl(config.backendUrl);
    } catch (error) {
      addError(`Configuration Error: ${error.message}`);
    }
  }, []);

  // WebRTC configuration with STUN/TURN servers
  const servers = {
    iceServers: [
      { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
      // Add TURN servers for production
      // { urls: "turn:your-turn-server.com", username: "user", credential: "pass" }
    ]
  };

  const addError = useCallback((message) => {
    const error = { id: Date.now(), message, timestamp: new Date().toISOString() };
    setErrors(prev => [error, ...prev.slice(0, 4)]); // Keep last 5 errors
    console.error('WebRTC Error:', message);
  }, []);

  const clearError = useCallback((id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  // Enhanced socket connection with error handling
  const initializeSocket = useCallback(async () => {
    if (!backendUrl) return;

    try {
      setConnectionStatus("connecting");

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Clean up existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      console.log(`Connecting to WebRTC socket at: ${backendUrl}`);

      socketRef.current = io(backendUrl, {
        transports: ["websocket", "polling"],
        withCredentials: true,
        path: '/socket.io/',
        namespace: '/webrtc',  // ✅ ADD THIS LINE
        autoConnect: true,
        forceNew: true,
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: token ? { token } : {}
      });

      const socket = socketRef.current;

      // Setup error handlers
      WebSocketErrorHandler.handleSocketError(socket, setConnectionStatus, () => {
        if (reconnectAttempts < 5) {
          setReconnectAttempts(prev => prev + 1);
          setTimeout(initializeSocket, 5000 * (reconnectAttempts + 1));
        } else {
          addError('Maximum reconnection attempts reached');
        }
      });

      // Connection success
      socket.on("connect", () => {
        console.log("✅ Socket connected successfully");
        setConnectionStatus("connected");
        setReconnectAttempts(0);
        socket.emit("join_webrtc_room", { roomId, userId, userName });
      });

      // Room events
      socket.on("user-joined", ({ userId: joinedUserId, userName: joinedUserName }) => {
        console.log(`👋 User joined: ${joinedUserName}`);
        setConnectedUsers(prev => [...prev, { userId: joinedUserId, userName: joinedUserName }]);
      });

      socket.on("user-left", ({ userId: leftUserId }) => {
        console.log(`👋 User left: ${leftUserId}`);
        setConnectedUsers(prev => prev.filter(user => user.userId !== leftUserId));
      });

      // WebRTC signaling with error handling
      socket.on("offer", async (data) => {
        try {
          await handleOffer(data);
        } catch (error) {
          addError(`Failed to handle offer: ${error.message}`);
        }
      });

      socket.on("answer", async (data) => {
        try {
          await handleAnswer(data);
        } catch (error) {
          addError(`Failed to handle answer: ${error.message}`);
        }
      });

      socket.on("ice-candidate", async (data) => {
        try {
          await handleIceCandidate(data);
        } catch (error) {
          addError(`Failed to handle ICE candidate: ${error.message}`);
        }
      });

    } catch (error) {
      addError(`Socket initialization failed: ${error.message}`);
      setConnectionStatus("error");
    }
  }, [backendUrl, roomId, userId, userName, reconnectAttempts]);

  // Enhanced getUserMedia with fallbacks
  const getUserMedia = useCallback(async () => {
    try {
      setIsConnecting(true);

      // Try with video first
      let constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (videoError) {
        console.warn("Video failed, trying audio only:", videoError);
        addError("Camera access failed, using audio only");

        // Fallback to audio only
        constraints = { video: false, audio: true };
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (audioError) {
          console.warn("Audio failed, trying without constraints:", audioError);
          addError("Microphone access failed");

          // Last resort - no constraints
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
      }

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsVideoStarted(true);
      setIsConnecting(false);
      return stream;

    } catch (error) {
      setIsConnecting(false);
      addError(`Media access failed: ${error.message}`);

      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        addError('Camera/microphone permission denied. Please allow access and refresh.');
      } else if (error.name === 'NotFoundError') {
        addError('No camera or microphone found. Please connect a device.');
      } else if (error.name === 'NotReadableError') {
        addError('Camera/microphone is being used by another application.');
      }

      throw error;
    }
  }, []);

  // Enhanced peer connection setup
  const createPeerConnection = useCallback(async () => {
    try {
      const pc = new RTCPeerConnection(servers);

      // Enhanced connection state monitoring
      pc.addEventListener('connectionstatechange', () => {
        console.log('Connection state:', pc.connectionState);

        switch (pc.connectionState) {
          case 'connected':
            setConnectionStatus('connected');
            break;
          case 'disconnected':
            setConnectionStatus('disconnected');
            addError('Peer connection lost, attempting to reconnect...');
            break;
          case 'failed':
            setConnectionStatus('failed');
            addError('Peer connection failed');
            // Attempt to restart connection
            setTimeout(() => {
              createPeerConnection();
            }, 2000);
            break;
          case 'closed':
            setConnectionStatus('closed');
            break;
        }
      });

      // ICE connection state monitoring
      pc.addEventListener('iceconnectionstatechange', () => {
        console.log('ICE connection state:', pc.iceConnectionState);

        if (pc.iceConnectionState === 'failed') {
          addError('ICE connection failed - network connectivity issues');
          // Trigger ICE restart
          pc.restartIce();
        }
      });

      // ICE candidate handling
      pc.addEventListener('icecandidate', (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', {
            candidate: event.candidate,
            roomId
          });
        }
      });

      // Remote stream handling
      pc.addEventListener('track', (event) => {
        console.log('Received remote track');
        const [stream] = event.streams;
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      // Add local stream to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      setPeerConnection(pc);
      return pc;

    } catch (error) {
      addError(`Failed to create peer connection: ${error.message}`);
      throw error;
    }
  }, [localStream, roomId]);

  // WebRTC signaling handlers with error handling
  const handleOffer = useCallback(async (data) => {
    try {
      const pc = peerConnection || await createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit('answer', {
        answer: answer,
        roomId
      });
    } catch (error) {
      addError(`Failed to handle offer: ${error.message}`);
    }
  }, [peerConnection, createPeerConnection, roomId]);

  const handleAnswer = useCallback(async (data) => {
    try {
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    } catch (error) {
      addError(`Failed to handle answer: ${error.message}`);
    }
  }, [peerConnection]);

  const handleIceCandidate = useCallback(async (data) => {
    try {
      if (peerConnection && data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (error) {
      addError(`Failed to add ICE candidate: ${error.message}`);
    }
  }, [peerConnection]);

  // Control functions with error handling
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      } else {
        addError('No audio track available');
      }
    }
  }, [localStream, isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      } else {
        addError('No video track available');
      }
    }
  }, [localStream, isVideoEnabled]);

  const startCall = useCallback(async () => {
    try {
      const stream = await getUserMedia();
      const pc = await createPeerConnection();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('offer', {
        offer: offer,
        roomId
      });

    } catch (error) {
      addError(`Failed to start call: ${error.message}`);
    }
  }, [getUserMedia, createPeerConnection, roomId]);

  const endCall = useCallback(() => {
    try {
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      // Close peer connection
      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      setRemoteStream(null);
      setIsVideoStarted(false);
      setConnectionStatus("disconnected");

    } catch (error) {
      addError(`Error ending call: ${error.message}`);
    }
  }, [localStream, peerConnection]);

  // Screen sharing functionality
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  // Chat functionality
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Recording functionality
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const mediaRecorderRef = useRef(null);

  // Device selection
  const [availableDevices, setAvailableDevices] = useState({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: []
  });
  const [selectedDevices, setSelectedDevices] = useState({
    audioInput: '',
    videoInput: '',
    audioOutput: ''
  });

  // Get available media devices
  const getAvailableDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

      setAvailableDevices({ audioInputs, videoInputs, audioOutputs });

      // Set default devices if not already selected
      if (!selectedDevices.audioInput && audioInputs.length > 0) {
        setSelectedDevices(prev => ({ ...prev, audioInput: audioInputs[0].deviceId }));
      }
      if (!selectedDevices.videoInput && videoInputs.length > 0) {
        setSelectedDevices(prev => ({ ...prev, videoInput: videoInputs[0].deviceId }));
      }
      if (!selectedDevices.audioOutput && audioOutputs.length > 0) {
        setSelectedDevices(prev => ({ ...prev, audioOutput: audioOutputs[0].deviceId }));
      }

    } catch (error) {
      addError(`Failed to get media devices: ${error.message}`);
    }
  }, [selectedDevices]);

  // Screen sharing functionality
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      setScreenStream(screenStream);
      setIsScreenSharing(true);

      // Replace video track in peer connection
      if (peerConnection && localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      // Handle screen share end
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

    } catch (error) {
      addError(`Screen sharing failed: ${error.message}`);
    }
  }, [peerConnection, localStream]);

  const stopScreenShare = useCallback(async () => {
    try {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }

      setIsScreenSharing(false);

      // Restore camera video
      if (peerConnection && localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );

        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }

    } catch (error) {
      addError(`Failed to stop screen sharing: ${error.message}`);
    }
  }, [screenStream, peerConnection, localStream]);

  // Chat functionality
  const sendChatMessage = useCallback(() => {
    if (newMessage.trim() && socketRef.current) {
      const message = {
        id: Date.now(),
        text: newMessage.trim(),
        sender: userName,
        timestamp: new Date().toISOString()
      };

      socketRef.current.emit('chat-message', {
        roomId,
        message
      });

      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  }, [newMessage, userName, roomId]);

  // Recording functionality
  const startRecording = useCallback(async () => {
    try {
      if (!localStream) {
        throw new Error('No local stream available for recording');
      }

      const mediaRecorder = new MediaRecorder(localStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current = mediaRecorder;
      setRecordedChunks([]);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        // Download the recording
        const a = document.createElement('a');
        a.href = url;
        a.download = `webrtc-recording-${new Date().toISOString()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

    } catch (error) {
      addError(`Recording failed: ${error.message}`);
    }
  }, [localStream, recordedChunks]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Device switching
  const switchDevice = useCallback(async (deviceType, deviceId) => {
    try {
      if (deviceType === 'audioInput' || deviceType === 'videoInput') {
        // Create new constraints
        const constraints = {
          audio: deviceType === 'audioInput' ? { deviceId: { exact: deviceId } } : true,
          video: deviceType === 'videoInput' ? { deviceId: { exact: deviceId } } : true
        };

        // Get new stream
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Replace tracks in peer connection
        if (peerConnection) {
          const newTrack = deviceType === 'audioInput'
            ? newStream.getAudioTracks()[0]
            : newStream.getVideoTracks()[0];

          const sender = peerConnection.getSenders().find(s =>
            s.track && s.track.kind === (deviceType === 'audioInput' ? 'audio' : 'video')
          );

          if (sender) {
            await sender.replaceTrack(newTrack);
          }
        }

        // Update local stream
        const oldTrack = deviceType === 'audioInput'
          ? localStream.getAudioTracks()[0]
          : localStream.getVideoTracks()[0];

        if (oldTrack) {
          localStream.removeTrack(oldTrack);
          oldTrack.stop();
        }

        const newTrack = deviceType === 'audioInput'
          ? newStream.getAudioTracks()[0]
          : newStream.getVideoTracks()[0];

        localStream.addTrack(newTrack);

        setSelectedDevices(prev => ({ ...prev, [deviceType]: deviceId }));

      } else if (deviceType === 'audioOutput') {
        // Change audio output device
        if (remoteVideoRef.current && remoteVideoRef.current.setSinkId) {
          await remoteVideoRef.current.setSinkId(deviceId);
          setSelectedDevices(prev => ({ ...prev, audioOutput: deviceId }));
        }
      }

    } catch (error) {
      addError(`Failed to switch ${deviceType}: ${error.message}`);
    }
  }, [localStream, peerConnection]);

  // Initialize socket on mount
  useEffect(() => {
    if (backendUrl) {
      initializeSocket();
      getAvailableDevices();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      endCall();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [backendUrl, initializeSocket, endCall, getAvailableDevices, screenStream]);

  // Add chat message listener
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on('chat-message', (data) => {
        setChatMessages(prev => [...prev, data.message]);
      });
    }
  }, []);

  return (
    <div className="webrtc-container">
      {/* Error Display */}
      {errors.length > 0 && (
        <div className="error-panel">
          {errors.map(error => (
            <div key={error.id} className="error-message">
              <span>{error.message}</span>
              <button onClick={() => clearError(error.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Connection Status */}
      <div className={`connection-status ${connectionStatus}`}>
        <span className="status-indicator"></span>
        <span>Status: {connectionStatus}</span>
        {reconnectAttempts > 0 && <span> (Retry {reconnectAttempts}/5)</span>}
      </div>

      {/* Device Selection Panel */}
      <div className="device-panel">
        <h3>🎛️ Device Settings</h3>
        <div className="device-selectors">
          <div className="device-selector">
            <label>📷 Camera:</label>
            <select
              value={selectedDevices.videoInput}
              onChange={(e) => switchDevice('videoInput', e.target.value)}
            >
              {availableDevices.videoInputs.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="device-selector">
            <label>🎤 Microphone:</label>
            <select
              value={selectedDevices.audioInput}
              onChange={(e) => switchDevice('audioInput', e.target.value)}
            >
              {availableDevices.audioInputs.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="device-selector">
            <label>🔊 Speakers:</label>
            <select
              value={selectedDevices.audioOutput}
              onChange={(e) => switchDevice('audioOutput', e.target.value)}
            >
              {availableDevices.audioOutputs.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="video-section">
        <div className="local-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`video-element ${!isVideoEnabled ? 'video-disabled' : ''}`}
          />
          <div className="video-label">
            You {!isVideoEnabled && '(Video Off)'} {isScreenSharing && '(Screen Sharing)'}
          </div>
        </div>

        <div className="remote-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-element"
          />
          <div className="video-label">
            {remoteStream ? 'Remote User' : 'Waiting for connection...'}
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="controls">
        {!isVideoStarted ? (
          <button
            className="start-call-btn"
            onClick={startCall}
            disabled={isConnecting || connectionStatus === 'error'}
          >
            {isConnecting ? 'Connecting...' : 'Start Call'}
          </button>
        ) : (
          <>
            <button
              className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
              onClick={toggleAudio}
              title="Toggle Microphone"
            >
              {isAudioEnabled ? '🎤' : '🎤❌'}
            </button>

            <button
              className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
              onClick={toggleVideo}
              title="Toggle Camera"
            >
              {isVideoEnabled ? '📹' : '📹❌'}
            </button>

            <button
              className={`control-btn ${isScreenSharing ? 'active' : ''}`}
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              title="Share Screen"
            >
              {isScreenSharing ? '🖥️❌' : '🖥️'}
            </button>

            <button
              className={`control-btn ${isRecording ? 'active recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              title="Record Call"
            >
              {isRecording ? '⏹️' : '🔴'}
            </button>

            <button
              className={`control-btn ${isChatOpen ? 'active' : ''}`}
              onClick={() => setIsChatOpen(!isChatOpen)}
              title="Toggle Chat"
            >
              💬
            </button>

            <button className="end-call-btn" onClick={endCall}>
              📞❌ End Call
            </button>
          </>
        )}
      </div>

      {/* Chat Panel */}
      {isChatOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>💬 Chat</h3>
            <button onClick={() => setIsChatOpen(false)}>×</button>
          </div>

          <div className="chat-messages">
            {chatMessages.map(message => (
              <div key={message.id} className="chat-message">
                <span className="message-sender">{message.sender}:</span>
                <span className="message-text">{message.text}</span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendChatMessage}>Send</button>
          </div>
        </div>
      )}

      {/* Connected Users */}
      {connectedUsers.length > 0 && (
        <div className="connected-users">
          <h3>👥 Connected Users ({connectedUsers.length})</h3>
          <ul>
            {connectedUsers.map(user => (
              <li key={user.userId}>
                <span className="user-name">{user.userName}</span>
                <span className="user-status">🟢 Online</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recording Status */}
      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-dot"></span>
          <span>Recording in progress...</span>
        </div>
      )}
    </div>
  );
};

export default WebRTCChat;