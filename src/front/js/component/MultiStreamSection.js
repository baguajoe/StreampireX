import React from "react";
import StreamEmbedCard from "./StreamEmbedCard";

const MultiStreamSection = ({ streams }) => {
  if (!streams || streams.length === 0) {
    return <p className="text-muted">No active squad streams.</p>;
  }

  return (
    <div className="row">
      {streams.map((stream) => (
        <div key={stream.id} className="col-md-6 col-lg-4">
          <StreamEmbedCard stream={stream} />
        </div>
      ))}
    </div>
  );
};

export default MultiStreamSection;
