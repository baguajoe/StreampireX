import React from "react";

const platformColors = {
  psn: "#003087",
  xbox: "#107C10",
  steam: "#171A21",
  pc: "#555",
};

const PlatformBadge = ({ platform }) => {
  const color = platformColors[platform.toLowerCase()] || "#777";

  return (
    <span className="badge me-2" style={{ backgroundColor: color }}>
      {platform.toUpperCase()}
    </span>
  );
};

export default PlatformBadge;
