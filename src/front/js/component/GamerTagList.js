import React from "react";
import PlatformBadge from "./PlatformBadge";

const GamerTagList = ({ gamerTags }) => {
  return (
    <ul className="list-group mb-3">
      {Object.entries(gamerTags || {}).map(([platform, tag]) => (
        <li key={platform} className="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <PlatformBadge platform={platform} /> {tag}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default GamerTagList;
