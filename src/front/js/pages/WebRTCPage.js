import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";

// Define BACKEND_URL properly - ensure it matches your backend port
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

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

  // Refs for video elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);

  // WebRTC configuration
  const servers = {
    iceServers: [
      { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }
    ]
  };

  // Initialize socket connection
  useEffect(() => {
    if (!socketRef.current) {
      console.log(`Connecting to WebRTC socket at: ${BACKEND_URL}`);
      
      // Get auth token for socket connection
      const token = localStorage.getItem('token');
      
      socketRef.current = io(BACKEND_URL, {
        transports: ["websocket"],
        withCredentials: true,
        auth: { token }, // Add token for authentication
        autoConnect: true,
        forceNew: true
      });

      const socket = socketRef.current;

      // Socket event handlers
      socket.emit("join_webrtc_room", { roomId, userId, userName });

      socket.on("user-joined", ({ userId: joinedUserId, userName: joinedUserName }) => {
        console.log("User joined:", joinedUserName);
        setConnectedUsers(prev => [...prev.filter(u => u.id !== joinedUserId), 
          { id: joinedUserId, name: joinedUserName }]);
      });

      socket.on("user-left", ({ userId: leftUserId }) => {
        console.log("User left:", leftUserId);
        setConnectedUsers(prev => prev.filter(u => u.id !== leftUserId));
        // Clean up peer connection if the user who left was connected to us
        if (peerConnection) {
          console.log("Cleaning up peer connection for left user");
          peerConnection.close();
          setPeerConnection(null);
          setRemoteStream(null);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        }
      });

      socket.on("webrtc-offer", async ({ offer, from }) => {
        console.log("Received WebRTC offer from:", from);
        await handleOffer(offer, from);
      });

      socket.on("webrtc-answer", async ({ answer, from }) => {
        console.log("Received WebRTC answer from:", from);
        await handleAnswer(answer);
      });

      socket.on("webrtc-ice-candidate", async ({ candidate, from }) => {
        console.log("Received ICE candidate from:", from);
        await handleIceCandidate(candidate);
      });

      // Connection established
      socket.on("connect", () => {
        console.log("Socket connected successfully");
        setConnectionStatus("connected");
      });

      // Connection error
      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setConnectionStatus("error");
      });

      // Disconnection
      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setConnectionStatus("disconnected");
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_webrtc_room", roomId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      cleanup();
    };
  }, [roomId, userId, userName]);

  // Create peer connection
  const createPeerConnection = () => {
    console.log("Creating new peer connection");
    const pc = new RTCPeerConnection(servers);

    pc.ontrack = (event) => {
      console.log("Remote track received");
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log("Sending ICE candidate");
        socketRef.current.emit("webrtc-ice-candidate", { 
          candidate: event.candidate, 
          roomId,
          from: userId
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Peer connection state:", pc.connectionState);
      setConnectionStatus(pc.connectionState);
      
      // Handle connection failures
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log("Peer connection failed/disconnected, cleaning up");
        setRemoteStream(null);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", pc.iceGatheringState);
    };

    return pc;
  };

  // Handle WebRTC offers
  const handleOffer = async (offer, from) => {
    try {
      console.log("Handling offer from:", from);
      const pc = createPeerConnection();
      setPeerConnection(pc);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      if (localStream) {
        localStream.getTracks().forEach(track => {
          console.log("Adding local track to peer connection");
          pc.addTrack(track, localStream);
        });
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log("Sending answer to:", from);
      socketRef.current.emit("webrtc-answer", { 
        answer, 
        roomId, 
        from: userId,
        to: from 
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  // Handle WebRTC answers
  const handleAnswer = async (answer) => {
    try {
      if (peerConnection && peerConnection.signalingState !== "stable") {
        console.log("Setting remote description from answer");
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  // Handle ICE candidates
  const handleIceCandidate = async (candidate) => {
    try {
      if (peerConnection && peerConnection.remoteDescription) {
        console.log("Adding ICE candidate");
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  };

  // Start video chat
  const startVideo = async () => {
    try {
      setIsConnecting(true);
      console.log("Starting video chat...");

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support camera/microphone access");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false,
        audio: isAudioEnabled
      });

      console.log("Got local stream");
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => {
        console.log("Adding track to peer connection:", track.kind);
        pc.addTrack(track, stream);
      });
      setPeerConnection(pc);

      // Create and send offer only if there are other users in the room
      if (connectedUsers.length > 0) {
        console.log("Creating offer for", connectedUsers.length, "users");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (socketRef.current) {
          socketRef.current.emit("webrtc-offer", { 
            offer, 
            roomId, 
            from: userId 
          });
        }
      }

      setIsVideoStarted(true);
      setIsConnecting(false);
      console.log("Video started successfully");
    } catch (error) {
      console.error("Error starting video:", error);
      setIsConnecting(false);
      
      // More specific error messages
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert("No camera or microphone found. Please check your devices.");
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert("Camera/microphone access denied. Please allow access and try again.");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        alert("Camera/microphone is being used by another application.");
      } else {
        alert("Could not access camera/microphone: " + error.message);
      }
    }
  };

  // Stop video chat
  const stopVideo = () => {
    console.log("Stopping video...");
    cleanup();
    setIsVideoStarted(false);
    setConnectionStatus("disconnected");
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log("Audio toggled:", audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log("Video toggled:", videoTrack.enabled);
      }
    }
  };

  // Cleanup function
  const cleanup = () => {
    console.log("Cleaning up WebRTC resources");
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      setLocalStream(null);
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
    setRemoteStream(null);
  };

  return (
    <div className="webrtc-chat-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header with user info */}
      <div className="webrtc-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div className="webrtc-user-info">
          <h3 style={{ margin: '0 0 5px 0' }}>Video Chat</h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <span>User: {userName || 'Anonymous'} | </span>
            <span>Room: {roomId}</span>
          </div>
        </div>
        <div className="webrtc-status">
          <span style={{ 
            padding: '5px 10px', 
            borderRadius: '15px',
            backgroundColor: connectionStatus === 'connected' ? '#4CAF50' : '#f44336',
            color: 'white',
            fontSize: '12px'
          }}>
            {connectionStatus === 'connected' ? '🟢' : '🔴'} {connectionStatus}
          </span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="webrtc-video-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div className="webrtc-video-container" style={{ position: 'relative' }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              width: '100%', 
              height: '300px', 
              backgroundColor: '#000',
              borderRadius: '8px'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '12px'
          }}>
            You ({userName})
          </div>
        </div>

        <div className="webrtc-video-container" style={{ position: 'relative' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ 
              width: '100%', 
              height: '300px', 
              backgroundColor: '#000',
              borderRadius: '8px'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '12px'
          }}>
            {connectedUsers.length > 0 ? connectedUsers[0].name : 'Waiting for others...'}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="webrtc-controls" style={{ 
        display: 'flex', 
        gap: '10px', 
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <button
          onClick={startVideo}
          disabled={isVideoStarted || isConnecting}
          style={{
            padding: '10px 20px',
            backgroundColor: isVideoStarted || isConnecting ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isVideoStarted || isConnecting ? 'not-allowed' : 'pointer'
          }}
        >
          {isConnecting ? 'Connecting...' : 'Start Video'}
        </button>

        <button
          onClick={stopVideo}
          disabled={!isVideoStarted}
          style={{
            padding: '10px 20px',
            backgroundColor: !isVideoStarted ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: !isVideoStarted ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Video
        </button>

        <button
          onClick={toggleAudio}
          disabled={!isVideoStarted}
          style={{
            padding: '10px 20px',
            backgroundColor: !isVideoStarted ? '#ccc' : (isAudioEnabled ? '#2196F3' : '#ff9800'),
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: !isVideoStarted ? 'not-allowed' : 'pointer'
          }}
        >
          {isAudioEnabled ? '🔊 Mute' : '🔇 Unmute'}
        </button>

        <button
          onClick={toggleVideo}
          disabled={!isVideoStarted}
          style={{
            padding: '10px 20px',
            backgroundColor: !isVideoStarted ? '#ccc' : (isVideoEnabled ? '#2196F3' : '#ff9800'),
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: !isVideoStarted ? 'not-allowed' : 'pointer'
          }}
        >
          {isVideoEnabled ? '📹 Hide Video' : '📹 Show Video'}
        </button>
      </div>

      {/* Connection Info */}
      <div className="webrtc-info" style={{ 
        backgroundColor: '#f9f9f9', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '10px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Connected Users ({connectedUsers.length + 1}):</strong>
          <div style={{ marginTop: '5px' }}>
            <span style={{ 
              display: 'inline-block', 
              margin: '2px 5px', 
              padding: '3px 8px',
              backgroundColor: '#4CAF50',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px'
            }}>
              👑 {userName} (You)
            </span>
            {connectedUsers.map(user => (
              <span key={user.id} style={{ 
                display: 'inline-block', 
                margin: '2px 5px', 
                padding: '3px 8px',
                backgroundColor: '#2196F3',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                👤 {user.name}
              </span>
            ))}
          </div>
        </div>
        
        <div style={{ fontSize: '12px', color: '#666' }}>
          <span style={{ marginRight: '15px' }}>
            Video: {isVideoStarted ? '✅ Active' : '❌ Inactive'}
          </span>
          <span style={{ marginRight: '15px' }}>
            Audio: {isAudioEnabled ? '🔊 On' : '🔇 Off'}
          </span>
          <span>
            Video Feed: {isVideoEnabled ? '📹 On' : '📹 Off'}
          </span>
        </div>
      </div>

      {/* Debug Info */}
      <details style={{ fontSize: '12px', color: '#666' }}>
        <summary style={{ cursor: 'pointer' }}>🔧 Debug Info</summary>
        <div style={{ marginTop: '10px', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
          <div>Room ID: {roomId}</div>
          <div>User ID: {userId}</div>
          <div>Username: {userName}</div>
          <div>Backend URL: {BACKEND_URL}</div>
          <div>Local Stream: {localStream ? '✅ Active' : '❌ None'}</div>
          <div>Remote Stream: {remoteStream ? '✅ Active' : '❌ None'}</div>
          <div>Peer Connection: {peerConnection ? '✅ Connected' : '❌ None'}</div>
          <div>Connection State: {connectionStatus}</div>
          <div>Socket Connected: {socketRef.current?.connected ? '✅' : '❌'}</div>
        </div>
      </details>
    </div>
  );
};

export default WebRTCChat;