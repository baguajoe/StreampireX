#!/bin/bash
set -e
FILE="src/front/js/pages/PodcastCollabRoom.js"
echo "🖥️  Adding screen sharing to PodcastCollabRoom.js..."
cp "$FILE" "${FILE}.bak.$(date +%Y%m%d%H%M%S)"

python3 << 'PYEOF'
content = open("src/front/js/pages/PodcastCollabRoom.js", "r").read()

old_state = '  const [error, setError] = useState("");'
new_state = '''  const [error, setError] = useState("");

  // Screen Share
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [screenShareUser, setScreenShareUser] = useState(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);'''

if "isScreenSharing" not in content:
    content = content.replace(old_state, new_state)
    print("   ✅ Added screen share state")
else:
    print("   ↳ Screen share state already exists")

old_refs = '  const chatEndRef = useRef(null);'
new_refs = '''  const chatEndRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenPcRef = useRef(null);
  const screenVideoRef = useRef(null);'''

if "screenStreamRef" not in content:
    content = content.replace(old_refs, new_refs)
    print("   ✅ Added screen share refs")
else:
    print("   ↳ Screen share refs already exist")

old_layout_listener = '''      // Layout sync (host broadcasts layout changes)
      socket.on("podcast-layout-change", (data) => {
        if (data.layout) setLayout(data.layout);
        if (data.orientation) setOrientation(data.orientation);
        if (data.spotlight !== undefined) setSpotlightUser(data.spotlight);
      });'''

new_layout_listener = '''      // Layout sync (host broadcasts layout changes)
      socket.on("podcast-layout-change", (data) => {
        if (data.layout) setLayout(data.layout);
        if (data.orientation) setOrientation(data.orientation);
        if (data.spotlight !== undefined) setSpotlightUser(data.spotlight);
      });

      // Screen share events
      socket.on("screen-share-start", (data) => {
        setScreenShareUser({ userId: data.userId, userName: data.userName, sid: data.sid });
      });

      socket.on("screen-share-stop", () => {
        setScreenShareUser(null);
        setRemoteScreenStream(null);
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        if (screenPcRef.current) { screenPcRef.current.close(); screenPcRef.current = null; }
      });

      socket.on("screen-share-offer", async (data) => {
        try {
          const pc = new RTCPeerConnection(ICE_SERVERS);
          screenPcRef.current = pc;
          pc.ontrack = (event) => {
            setRemoteScreenStream(event.streams[0]);
            if (screenVideoRef.current) screenVideoRef.current.srcObject = event.streams[0];
          };
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("screen-share-ice", { roomId, candidate: event.candidate, targetSid: data.from });
            }
          };
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("screen-share-answer", { roomId, answer, targetSid: data.from });
        } catch (err) { console.error("Screen share offer error:", err); }
      });

      socket.on("screen-share-answer", async (data) => {
        try {
          if (screenPcRef.current && screenPcRef.current.signalingState !== "stable") {
            await screenPcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        } catch (err) { console.error("Screen share answer error:", err); }
      });

      socket.on("screen-share-ice", async (data) => {
        try {
          if (screenPcRef.current) {
            await screenPcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (err) { console.error("Screen share ICE error:", err); }
      });'''

if "screen-share-start" not in content:
    content = content.replace(old_layout_listener, new_layout_listener)
    print("   ✅ Added screen share socket listeners")
else:
    print("   ↳ Screen share socket listeners already exist")

old_cleanup = '''      localStream?.getTracks().forEach((t) => t.stop());
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());'''

new_cleanup = '''      localStream?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (screenPcRef.current) { screenPcRef.current.close(); screenPcRef.current = null; }
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());'''

if "screenStreamRef.current?.getTracks" not in content:
    content = content.replace(old_cleanup, new_cleanup)
    print("   ✅ Added screen share cleanup")
else:
    print("   ↳ Screen share cleanup already exists")

screen_functions = '''

  // ---------------------------------------------------------------------------
  // SCREEN SHARING
  // ---------------------------------------------------------------------------
  const startScreenShare = async () => {
    if (screenShareUser) {
      setError(`${screenShareUser.userName} is already sharing their screen.`);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true,
      });
      setScreenStream(stream);
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      socketRef.current?.emit("screen-share-start", {
        roomId,
        userId: user.id,
        userName: user.username || user.display_name,
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);
      screenPcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("screen-share-ice", { roomId, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("screen-share-offer", { roomId, offer });

      stream.getVideoTracks()[0].addEventListener("ended", () => stopScreenShare());
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        setError("Failed to start screen share: " + err.message);
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);
    setScreenShareUser(null);
    if (screenPcRef.current) {
      screenPcRef.current.close();
      screenPcRef.current = null;
    }
    socketRef.current?.emit("screen-share-stop", { roomId, userId: user.id });
  };'''

marker = '''      }
    }
  };

  // ---------------------------------------------------------------------------
  // RECORDING'''

new_marker = '''      }
    }
  };''' + screen_functions + '''

  // ---------------------------------------------------------------------------
  // RECORDING'''

if "startScreenShare" not in content:
    content = content.replace(marker, new_marker)
    print("   ✅ Added screen share functions")
else:
    print("   ↳ Screen share functions already exist")

old_controls_left_end = '''            {/* Noise suppression */}
            <button
              className={`pcr-control-btn ${noiseSuppression ? "active" : ""}`}
              onClick={toggleNoiseSuppression}
              title={noiseSuppression ? "Noise suppression ON" : "Noise suppression OFF"}
            >
              {noiseSuppression ? "🔇" : "🔊"}
            </button>
          </div>'''

new_controls_left_end = '''            {/* Noise suppression */}
            <button
              className={`pcr-control-btn ${noiseSuppression ? "active" : ""}`}
              onClick={toggleNoiseSuppression}
              title={noiseSuppression ? "Noise suppression ON" : "Noise suppression OFF"}
            >
              {noiseSuppression ? "🔇" : "🔊"}
            </button>

            {/* Screen Share */}
            <button
              className={`pcr-control-btn ${isScreenSharing ? "active screen-sharing" : ""}`}
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              {isScreenSharing ? "🖥️❌" : "🖥️"}
            </button>
          </div>'''

if "startScreenShare" in content and "Screen Share" not in content.split("pcr-controls-left")[1].split("pcr-controls-center")[0] if "pcr-controls-left" in content else True:
    content = content.replace(old_controls_left_end, new_controls_left_end)
    print("   ✅ Added screen share button to controls bar")
else:
    print("   ↳ Screen share button already in controls bar")

old_video_canvas = '''        <div
          className="pcr-video-canvas"'''

new_video_canvas = '''        {/* Screen Share Display */}
        {(remoteScreenStream || isScreenSharing) && (
          <div className="pcr-screen-share-container" style={{
            width: "100%",
            background: "#000",
            borderRadius: "12px",
            marginBottom: "12px",
            position: "relative",
            border: "2px solid #00ffc8",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 16px",
              background: "rgba(0,255,200,0.1)",
              borderRadius: "10px 10px 0 0",
            }}>
              <span style={{ color: "#00ffc8", fontSize: "0.85rem", fontWeight: 600 }}>
                🖥️ {isScreenSharing ? "You are sharing your screen" : `${screenShareUser?.userName} is sharing`}
              </span>
              {isScreenSharing && (
                <button
                  onClick={stopScreenShare}
                  style={{
                    background: "#ff4757",
                    color: "#fff",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Stop Sharing
                </button>
              )}
            </div>
            <video
              autoPlay
              playsInline
              muted={isScreenSharing}
              style={{
                width: "100%",
                maxHeight: "400px",
                objectFit: "contain",
                borderRadius: "0 0 10px 10px",
              }}
              ref={(el) => {
                screenVideoRef.current = el;
                if (el) {
                  if (isScreenSharing && screenStream) {
                    el.srcObject = screenStream;
                  } else if (remoteScreenStream) {
                    el.srcObject = remoteScreenStream;
                  }
                }
              }}
            />
          </div>
        )}

        <div
          className="pcr-video-canvas"'''

if "pcr-screen-share-container" not in content:
    content = content.replace(old_video_canvas, new_video_canvas)
    print("   ✅ Added screen share display area")
else:
    print("   ↳ Screen share display already exists")

old_header_center = '''        <div className="pcr-header-center">
          {isRecording && (
            <div className="pcr-recording-badge">
              <span className="pcr-rec-dot" />
              REC {formatTime(recordingTime)}
            </div>
          )}
        </div>'''

new_header_center = '''        <div className="pcr-header-center">
          {isRecording && (
            <div className="pcr-recording-badge">
              <span className="pcr-rec-dot" />
              REC {formatTime(recordingTime)}
            </div>
          )}
          {(isScreenSharing || screenShareUser) && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(0,255,200,0.15)",
              padding: "4px 12px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              color: "#00ffc8",
            }}>
              🖥️ {isScreenSharing ? "Sharing" : `${screenShareUser?.userName} sharing`}
            </div>
          )}
        </div>'''

if "screenShareUser" not in content.split("pcr-header-center")[1].split("pcr-header-right")[0] if content.count("pcr-header-center") > 0 else True:
    content = content.replace(old_header_center, new_header_center)
    print("   ✅ Added screen share indicator in header")
else:
    print("   ↳ Screen share header indicator already exists")

open("src/front/js/pages/PodcastCollabRoom.js", "w").write(content)
print("\n🖥️  Screen sharing added to PodcastCollabRoom.js!")
PYEOF

echo ""
echo "📤 Committing and pushing..."
git add -A
git commit -m "feat: add screen sharing to Podcast Collab Room"
git push
echo "✅ Done!"
