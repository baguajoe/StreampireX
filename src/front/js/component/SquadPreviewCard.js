import React from "react";

const SquadPreviewCard = ({ squad, onJoin }) => {
  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <h5 className="card-title">{squad.name}</h5>
        <p className="card-text">{squad.description || "No description provided."}</p>

        <div className="mb-2">
          <strong>Platforms:</strong>{" "}
          {squad.platform_tags?.length > 0 ? (
            squad.platform_tags.map((p, i) => (
              <span key={i} className="badge bg-secondary me-1">{p}</span>
            ))
          ) : (
            <span className="text-muted">Not listed</span>
          )}
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">Invite Code: {squad.invite_code || "N/A"}</small>
          {onJoin && squad.invite_code && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => onJoin(squad.invite_code)}
            >
              Join Squad
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SquadPreviewCard;
