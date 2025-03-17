const LiveStudio = ({ isOpen, onClose }) => {
    const [isLive, setIsLive] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const videoRef = useRef(null);
    let stream = null;  // Store media stream

    const constraints = { audio: true, video: true };

    const getMicAndCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log("Access granted:", stream);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (error) {
            console.log("User denied access to constraints", error);
        }
    };

    const startLiveStream = async () => {
        await getMicAndCamera();  // Ensure camera/mic is granted before streaming
        setIsLive(true);

        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/artist/live/start`, {
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
            console.log("🎥 Live Stream Started");
        } catch (error) {
            console.error("Error starting live stream:", error);
        }
    };

    const endLiveStream = async () => {
        setIsLive(false);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());  // Stop all media tracks
        }

        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/artist/live/end`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });

            if (!response.ok) throw new Error("Failed to end live stream");
            console.log("⛔ Live Stream Ended");
            onClose();
        } catch (error) {
            console.error("Error ending live stream:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="live-studio-modal">
            <div className="live-studio-content">
                <button className="close-btn" onClick={onClose}>❌</button>
                <h2>🎙️ Live Studio</h2>

                <div className="video-preview">
                    <video ref={videoRef} id="video" autoPlay playsInline></video>
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