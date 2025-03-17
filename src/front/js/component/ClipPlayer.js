import React from "react";

const ClipPlayer = ({ clipUrl, ctaLink }) => {
  return (
    <div className="clip-container">
      <video src={clipUrl} controls className="clip-video"></video>
      <a href={ctaLink} className="cta-overlay">🎥 Watch Full Episode</a>
    </div>
  );
};

export default ClipPlayer;
