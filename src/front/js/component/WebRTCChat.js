import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5000"); // Replace with production endpoint

const WebRTCChat = ({ roomId, userId, userName }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(new MediaStream());
  const [peerConnection, setPeerConnection] = useState(null);

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    socket.emit("join_room", roomId);

    socket.on("offer", async (offer) => {
      const pc = createPeerConnection();
      setPeerConnection(pc);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, roomId });
    });

    socket.on("answer", async ({ answer }) => {
      await peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(servers);

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate, roomId });
      }
    };

    return pc;
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      setPeerConnection(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { offer, roomId });
    } catch (error) {
      console.error("Media error:", error);
    }
  };

  const stopVideo = () => {
    localStream?.getTracks().forEach((track) => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  return (
    <div className="webrtc-container">
      <div className="video-section">
        <video ref={localVideoRef} autoPlay playsInline muted className="video-box" />
        <video ref={remoteVideoRef} autoPlay playsInline className="video-box" />
      </div>
      <div className="control-buttons">
        <button onClick={startVideo}>🎥 Start</button>
        <button onClick={stopVideo}>⛔ Stop</button>
      </div>
    </div>
  );
};

export default WebRTCChat;
