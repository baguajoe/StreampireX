import React, { useEffect, useRef, useState } from "react";
import * as mpHolistic from "@mediapipe/holistic";
import { Camera } from "@mediapipe/camera_utils";

const LiveStudio = ({ isOpen, onClose }) => {
    const [isLive, setIsLive] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const videoRef = useRef(null);
    const mediaPipeCameraRef = useRef(null);
    let stream = null;

    const constraints = { audio: true, video: true };

    // 🧠 Handle results from MediaPipe Holistic
    const onHolisticResults = (results) => {
        if (results.poseLandmarks) {
            console.log("🧍 Pose Landmarks:", results.poseLandmarks);
        }
        if (results.leftHandLandmarks) {
            console.log("🖐️ Left Hand:", results.leftHandLandmarks);
        }
        if (results.rightHandLandmarks) {
            console.log("✋ Right Hand:", results.rightHandLandmarks);
        }
        if (results.faceLandmarks) {
            console.log("🙂 Face Landmarks:", results.faceLandmarks);
        }
    };

    // 🔁 Setup Holistic pipeline
    const setupHolisticTracking = () => {
        const holistic = new mpHolistic.Holistic({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
        });

        holistic.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            refineFaceLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        holistic.onResults(onHolisticResults);

        mediaPipeCameraRef.current = new Camera(videoRef.current, {
            onFrame: async () => {
                await holistic.send({ image: videoRef.current });
            },
            width: 640,
            height: 480
        });

        mediaPipeCameraRef.current.start();
    };

    // 🎥 Get mic and camera, then launch Holistic
    const getMicAndCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log("✅ Media access granted:", stream);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setupHolisticTracking(); // 🧠 Start MediaPipe Holistic
            }
        } catch (error) {
            console.error("🚫 Media access error:", error);
        }
    };

    const startLiveStream = async () => {
        await getMicAndCamera();
        setIsLive(true);

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/live/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    title: "Live DJ Set",
                    description: "Playing exclusive new tracks!"
                })
            });

            if (!response.ok) throw new Error("Failed to start live stream");
            console.log("🎥 Live stream started");
        } catch (error) {
            console.error("❌ Error starting live stream:", error);
        }
    };

    const endLiveStream = async () => {
        setIsLive(false);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            if (mediaPipeCameraRef.current) {
                mediaPipeCameraRef.current.stop();
            }
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/live/end`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });

            if (!response.ok) throw new Error("Failed to end live stream");
            console.log("⛔ Live stream ended");
            onClose();
        } catch (error) {
            console.error("❌ Error ending live stream:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="live-studio-modal">
            <div className="live-studio-content">
                <button className="close-btn" onClick={onClose}>❌</button>
                <h2>🎙️ Live Studio</h2>

                <div className="video-preview">
                    <video
                        ref={videoRef}
                        id="video"
                        autoPlay
                        playsInline
                        muted
                        width="640"
                        height="480"
                    ></video>
                </div>

                <div className="controls">
                    <button onClick={() => setMicOn(!micOn)}>
                        {micOn ? "🎤 Mute Mic" : "🎙️ Unmute Mic"}
                    </button>
                    <button onClick={() => setCameraOn(!cameraOn)}>
                        {cameraOn ? "📹 Turn Off Camera" : "📷 Turn On Camera"}
                    </button>
                    {!isLive ? (
                        <button className="go-live" onClick={startLiveStream}>
                            🚀 Go Live
                        </button>
                    ) : (
                        <button className="end-live" onClick={endLiveStream}>
                            ❌ End Live
                        </button>
                    )}
                </div>
                {isLive && <p>🔴 You are live! Listeners: 100</p>}
            </div>
        </div>
    );
};

export default LiveStudio;
