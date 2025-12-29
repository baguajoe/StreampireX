import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "../../styles/WebRTCChat.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://streampirex-api.up.railway.app";

const WebRTCChat = ({ roomId, userId, userName, onClose }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState("Connecting...");
    const [remoteUserName, setRemoteUserName] = useState("Waiting for participant...");
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const socketRef = useRef(null);

    const iceServers = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    };

    useEffect(() => {
        initializeMedia();
        initializeSocket();

        return () => {
            cleanup();
        };
    }, [roomId]);

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            setConnectionStatus("Camera ready");
        } catch (error) {
            console.error("Error accessing media devices:", error);
            setConnectionStatus("Camera access denied");
        }
    };

    const initializeSocket = () => {
        socketRef.current = io(BACKEND_URL, {
            transports: ["websocket"],
            withCredentials: true
        });

        socketRef.current.emit("join-video-room", {
            roomId,
            userId,
            userName
        });

        socketRef.current.on("user-joined", async (data) => {
            setRemoteUserName(data.userName || "Remote User");
            setConnectionStatus("User joined, connecting...");
            await createOffer();
        });

        socketRef.current.on("offer", async (data) => {
            await handleOffer(data.offer);
        });

        socketRef.current.on("answer", async (data) => {
            await handleAnswer(data.answer);
        });

        socketRef.current.on("ice-candidate", async (data) => {
            await handleIceCandidate(data.candidate);
        });

        socketRef.current.on("user-left", () => {
            setRemoteUserName("User disconnected");
            setConnectionStatus("Participant left");
            setIsConnected(false);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
        });
    };

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection(iceServers);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit("ice-candidate", {
                    roomId,
                    candidate: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
            setIsConnected(true);
            setConnectionStatus("Connected");
        };

        pc.onconnectionstatechange = () => {
            setConnectionStatus(pc.connectionState);
        };

        if (localStream) {
            localStream.getTracks().forEach((track) => {
                pc.addTrack(track, localStream);
            });
        }

        peerConnectionRef.current = pc;
        return pc;
    };

    const createOffer = async () => {
        const pc = createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit("offer", { roomId, offer });
    };

    const handleOffer = async (offer) => {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("answer", { roomId, answer });
    };

    const handleAnswer = async (answer) => {
        await peerConnectionRef.current?.setRemoteDescription(
            new RTCSessionDescription(answer)
        );
    };

    const handleIceCandidate = async (candidate) => {
        await peerConnectionRef.current?.addIceCandidate(
            new RTCIceCandidate(candidate)
        );
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };

    const cleanup = () => {
        localStream?.getTracks().forEach((track) => track.stop());
        peerConnectionRef.current?.close();
        socketRef.current?.disconnect();
    };

    const handleEndCall = () => {
        cleanup();
        if (onClose) onClose();
    };

    return (
        <div className="webrtc-chat-container">
            {/* Header */}
            <div className="webrtc-header">
                <div className="webrtc-room-info">
                    <span className="room-label">Video Call</span>
                    <span className="room-id">Room: {roomId}</span>
                </div>
                <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
                    <span className="status-dot"></span>
                    {connectionStatus}
                </div>
            </div>

            {/* Video Grid */}
            <div className="webrtc-video-grid">
                {/* Remote Video (Main) */}
                <div className="video-container remote-video-container">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="remote-video"
                    />
                    {!isConnected && (
                        <div className="video-placeholder">
                            <div className="placeholder-icon">👤</div>
                            <p>{remoteUserName}</p>
                        </div>
                    )}
                    {isConnected && (
                        <div className="video-label">{remoteUserName}</div>
                    )}
                </div>

                {/* Local Video (PiP) */}
                <div className="video-container local-video-container">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="local-video"
                    />
                    {!isVideoEnabled && (
                        <div className="video-disabled-overlay">
                            <span>📷</span>
                            <p>Camera Off</p>
                        </div>
                    )}
                    <div className="video-label">You ({userName})</div>
                </div>
            </div>

            {/* Controls */}
            <div className="webrtc-controls">
                <button
                    className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
                    onClick={toggleAudio}
                    title={isAudioEnabled ? "Mute" : "Unmute"}
                >
                    {isAudioEnabled ? "🎤" : "🔇"}
                </button>
                
                <button
                    className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
                    onClick={toggleVideo}
                    title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                    {isVideoEnabled ? "📹" : "📷"}
                </button>
                
                <button
                    className="control-btn end-call"
                    onClick={handleEndCall}
                    title="End call"
                >
                    📞
                </button>
            </div>
        </div>
    );
};

export default WebRTCChat;