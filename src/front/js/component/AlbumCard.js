import React from "react";
import { Link } from "react-router-dom";

const AlbumCard = ({ album }) => {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="card-title">{album.title}</h5>
        <p className="card-text">Genre: {album.genre}</p>

        {/* ✅ Add the View Album link here */}
        <Link to={`/album/${album.id}`} className="btn btn-outline-primary btn-sm mt-2">
          View Album
        </Link>
      </div>
    </div>
  );
};

export default AlbumCard;
