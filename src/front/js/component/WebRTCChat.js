import React, { useEffect, useRef, useState } from "react";

// Mock socket for demo purposes (no external library needed)
const socket = {
  connect: () => console.log("Socket connected"),
  emit: (event, data) => console.log("Socket emit:", event, data),
  on: (event, callback) => console.log("Socket listening for:", event),
  disconnect: () => console.log("Socket disconnected")
};

const WebRTCChat = ({ roomId, userId, userName }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(new MediaStream());
  const [peerConnection, setPeerConnection] = useState(null);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    console.log("WebRTCChat mounted", { roomId, userId, userName });
    
    // Mock socket events for demo
    socket.emit("join_room", roomId);
    
    return () => {
      console.log("WebRTCChat unmounting");
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(servers);

    pc.ontrack = (event) => {
      console.log("Remote track received");
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE candidate generated");
        socket.emit("ice-candidate", { candidate: event.candidate, roomId });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
    };

    return pc;
  };

  const startVideo = async () => {
    try {
      console.log("Starting video chat...");
      setIsConnecting(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setLocalStream(stream);
      setIsVideoStarted(true);
      setIsConnecting(false);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      setPeerConnection(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { offer, roomId });
      
      console.log("Video chat started successfully");
    } catch (error) {
      console.error("Media access error:", error);
      setIsConnecting(false);
      alert("Could not access camera/microphone: " + error.message);
    }
  };

  const stopVideo = () => {
    console.log("Stopping video chat...");
    
    localStream?.getTracks().forEach((track) => {
      track.stop();
      console.log("Stopped track:", track.kind);
    });
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setLocalStream(null);
    setIsVideoStarted(false);
    
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
    console.log("Video chat stopped");
  };

  return (
    <div className="webrtc-chat-container">
      <div className="webrtc-header">
        <h3 className="webrtc-title">
          🎥 Video Chat
        </h3>
        <span className="webrtc-room-info">
          Room: {roomId || 'demo-room'}
        </span>
      </div>
      
      {/* Video Section */}
      <div className="webrtc-videos">
        <div className="webrtc-video-container">
          <div className="webrtc-video-label">
            You ({userName || 'User'})
          </div>
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="webrtc-video"
          />
        </div>
        
        <div className="webrtc-video-container">
          <div className="webrtc-video-label">
            Remote User
          </div>
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="webrtc-video remote"
          />
        </div>
      </div>
      
      {/* Control Buttons - This is the important part! */}
      <div className="webrtc-controls">
        <button 
          onClick={startVideo}
          disabled={isVideoStarted || isConnecting}
          className={`webrtc-btn ${isConnecting ? 'connecting' : 'start'}`}
        >
          {isConnecting ? '⏳' : '🎥'} {isConnecting ? 'Connecting...' : 'Start'}
        </button>
        
        <button 
          onClick={stopVideo}
          disabled={!isVideoStarted}
          className="webrtc-btn stop"
        >
          ⛔ Stop
        </button>
      </div>
      
      {/* Status Info */}
      <div className={`webrtc-status ${isVideoStarted ? 'active' : 'inactive'}`}>
        <strong>Status:</strong> {isVideoStarted ? '🟢 Video Active' : '🔴 Video Inactive'}
        {localStream && (
          <span className="webrtc-status-tracks">
            | Tracks: {localStream.getTracks().length}
          </span>
        )}
      </div>
      
      {/* Debug Section */}
      <details className="webrtc-debug">
        <summary>🔧 Debug Info</summary>
        <div className="webrtc-debug-content">
          <div className="webrtc-debug-item">Room ID: {roomId || 'N/A'}</div>
          <div className="webrtc-debug-item">User ID: {userId || 'N/A'}</div>
          <div className="webrtc-debug-item">User Name: {userName || 'N/A'}</div>
          <div className="webrtc-debug-item">Local Stream: {localStream ? '✅ Active' : '❌ None'}</div>
          <div className="webrtc-debug-item">Peer Connection: {peerConnection ? '✅ Connected' : '❌ None'}</div>
          <div className="webrtc-debug-item">Video Started: {isVideoStarted ? '✅ Yes' : '❌ No'}</div>
        </div>
      </details>
    </div>
  );
};

export default WebRTCChat;