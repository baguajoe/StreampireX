import React, { useState } from "react";

const ReleaseCard = ({ release }) => {
  const [showLyrics, setShowLyrics] = useState(false);

  return (
    <div className="card h-100">
      <img
        src={release.cover_art_url}
        className="card-img-top"
        alt={release.title}
        style={{ height: "250px", objectFit: "cover" }}
      />
      <div className="card-body">
        <h5 className="card-title">{release.title}</h5>
        <p className="card-text">
          Genre: {release.genre} <br />
          Release Date: {release.release_date} <br />
          Explicit: {release.explicit ? "Yes" : "No"}
        </p>
        {release.external_id ? (
          <p className="text-success">✔️ Submitted to DSPs</p>
        ) : (
          <p className="text-warning">⏳ Pending submission</p>
        )}

        {release.lyrics && (
          <>
            <button
              className="btn btn-sm btn-outline-secondary mt-2 mb-2"
              onClick={() => setShowLyrics(!showLyrics)}
            >
              {showLyrics ? "🙈 Hide Lyrics" : "📖 Show Lyrics"}
            </button>
            {showLyrics && (
              <pre className="border rounded p-2 bg-light" style={{ whiteSpace: "pre-wrap" }}>
                {release.lyrics}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReleaseCard;
