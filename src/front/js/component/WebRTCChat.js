import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// Connect to your real signaling backend
const socket = io("http://localhost:5000");

const WebRTCChat = ({ roomId = "demo-room", userId = "anon", userName = "User" }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream] = useState(new MediaStream());
  const [peerConnection, setPeerConnection] = useState(null);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    console.log("WebRTCChat mounted", { roomId, userId, userName });
    socket.emit("join_room", { roomId });

    socket.on("offer", async ({ offer, from }) => {
      console.log("Received offer from", from);
      const pc = createPeerConnection();
      setPeerConnection(pc);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from, roomId });
    });

    socket.on("answer", async ({ answer }) => {
      console.log("Received answer");
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      console.log("Received ICE candidate");
      try {
        await peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate", error);
      }
    });

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
        audio: true,
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
      socket.emit("offer", { offer, roomId, from: userId });

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
          Room: {roomId}
        </span>
      </div>

      <div className="webrtc-videos">
        <div className="webrtc-video-container">
          <div className="webrtc-video-label">
            You ({userName})
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

      <div className={`webrtc-status ${isVideoStarted ? 'active' : 'inactive'}`}>
        <strong>Status:</strong> {isVideoStarted ? '🟢 Video Active' : '🔴 Video Inactive'}
        {localStream && (
          <span className="webrtc-status-tracks">
            | Tracks: {localStream.getTracks().length}
          </span>
        )}
      </div>

      <details className="webrtc-debug">
        <summary>🔧 Debug Info</summary>
        <div className="webrtc-debug-content">
          <div className="webrtc-debug-item">Room ID: {roomId}</div>
          <div className="webrtc-debug-item">User ID: {userId}</div>
          <div className="webrtc-debug-item">User Name: {userName}</div>
          <div className="webrtc-debug-item">Local Stream: {localStream ? '✅ Active' : '❌ None'}</div>
          <div className="webrtc-debug-item">Peer Connection: {peerConnection ? '✅ Connected' : '❌ None'}</div>
          <div className="webrtc-debug-item">Video Started: {isVideoStarted ? '✅ Yes' : '❌ No'}</div>
        </div>
      </details>
    </div>
  );
};

export default WebRTCChat;
