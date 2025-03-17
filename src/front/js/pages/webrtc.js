const socket = io.connect("http://localhost:5000"); // Adjust to match your server
let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }] // Public STUN server
};

// 🎥 Get access to webcam & mic
const startVideo = async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("local-video").srcObject = localStream;
        initWebRTC(); // Initialize WebRTC after getting media
    } catch (error) {
        showError("Error accessing media devices: " + error.message);
    }
};

// ❌ Stop video stream
const stopVideo = () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        document.getElementById("local-video").srcObject = null;
    }
};

// 📺 Share screen
const shareScreen = async () => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        document.getElementById("local-video").srcObject = screenStream;
    } catch (error) {
        showError("Error sharing screen: " + error.message);
    }
};

// 🔗 Initialize WebRTC connection
const initWebRTC = async () => {
    peerConnection = new RTCPeerConnection(servers);
    remoteStream = new MediaStream();
    document.getElementById("remote-video").srcObject = remoteStream;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
        }
    };

    // Create and send SDP offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
};

// 🔄 Handle received offer
socket.on("offer", async (offer) => {
    if (!peerConnection) initWebRTC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
});

// ✅ Handle received answer
socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// 🔁 Handle received ICE candidates
socket.on("ice-candidate", async (candidate) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        showError("Error adding ICE candidate: " + error.message);
    }
});

// 🛑 Handle WebSocket disconnect
socket.on("disconnect", () => {
    showStatus("Disconnected from signaling server.");
});

// ⚠️ Show error messages
const showError = (message) => {
    const errorBox = document.getElementById("error-message");
    errorBox.innerText = "⚠️ " + message;
    errorBox.style.display = "block";
};

// ✅ Show connection status
const showStatus = (message) => {
    const statusBox = document.getElementById("connection-status");
    statusBox.innerText = "🟢 " + message;
    statusBox.style.display = "block";
};

// 🎯 Event Listeners
document.getElementById("start-video").addEventListener("click", startVideo);
document.getElementById("stop-video").addEventListener("click", stopVideo);
document.getElementById("share-screen").addEventListener("click", shareScreen);
