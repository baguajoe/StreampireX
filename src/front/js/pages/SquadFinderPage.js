// src/front/js/pages/SquadFinderPage.js
// UPDATED: Wrapped with GamerGate for non-gamer users
import React from "react";
import GamerGate from "../component/GamerGate";
import "../../styles/SquadFinderPage.css";

const squads = [
  {
    name: "Crimson Wolves",
    description: "FPS-focused squad across PS5 and PC.",
    platforms: ["PS5", "PC"],
    inviteCode: "ABCD1234",
  },
  {
    name: "Shadow Reapers",
    description: "Casual battle royale team.",
    platforms: ["Xbox", "PC"],
    inviteCode: "XYZ999",
  },
];

const SquadFinderPage = () => {
  return (
    <GamerGate featureName="Squad Finder">
      <div className="squad-finder-container">
        <h2 className="squad-header">
          <span role="img" aria-label="magnify">🔍</span> <span className="squad-header-text">Discover Squads</span>
        </h2>
        {squads.map((squad, index) => (
          <div className="squad-card" key={index}>
            <h3 className="squad-name">{squad.name}</h3>
            <p>{squad.description}</p>
            <div>
              {squad.platforms.map((platform, idx) => (
                <span className="platform-tag" key={idx}>{platform}</span>
              ))}
            </div>
            <p>Invite Code: <strong>{squad.inviteCode}</strong></p>
            <button className="join-squad-btn">Join Squad</button>
          </div>
        ))}
      </div>
    </GamerGate>
  );
};

export default SquadFinderPage;