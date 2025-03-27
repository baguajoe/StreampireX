import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LiveVideoPlayer from "../component/LiveVideoPlayer";
import ChatModal from "../component/ChatModal";
import PollComponent from "../component/PollComponent";
import TipJar from "../component/TipJar";
import "../../styles/liveShowPage.css";

const LiveShowPage = () => {
  const { id } = useParams();
  const [streamData, setStreamData] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [user, setUser] = useState({});

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/live-streams/${id}`)
      .then((res) => res.json())
      .then((data) => setStreamData(data))
      .catch((err) => console.error("Error loading stream:", err));

    // Optionally fetch current user for chat
    fetch(`${process.env.BACKEND_URL}/api/profile`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((profile) => setUser(profile))
      .catch(() => {});
  }, [id]);

  if (!streamData) return <div className="loading">Loading Live Show...</div>;

  return (
    <div className="live-show-page">
      <h1>{streamData.title}</h1>
      <p>{streamData.description}</p>

      <div className="video-and-chat">
        <LiveVideoPlayer streamUrl={streamData.stream_url} />

        {isChatOpen && (
          <ChatModal
            recipientId={streamData.creator_id}
            recipientName={streamData.creator_name}
            currentUserId={user.id}
            onClose={() => setIsChatOpen(false)}
            enableTypingIndicator={true}
            enableThreads={true}
            autoScroll={true}
            enableMediaUpload={true}
            enableGroupChat={true}
          />
        )}
      </div>

      <PollComponent streamId={id} />
      <TipJar streamId={id} />

      <div className="audience-stats">
        👥 Viewers: {streamData.viewer_count || 0}
      </div>
    </div>
  );
};

export default LiveShowPage;
