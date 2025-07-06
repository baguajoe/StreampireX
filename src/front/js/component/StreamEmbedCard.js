import React from "react";

const StreamEmbedCard = ({ stream }) => {
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title">{stream.title || "Untitled Stream"}</h5>
        <p className="card-text">Platform: {stream.platform}</p>
        <div className="ratio ratio-16x9">
          <iframe
            src={stream.stream_url}
            title={`Stream by ${stream.creator_id}`}
            allow="autoplay"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

export default StreamEmbedCard;
