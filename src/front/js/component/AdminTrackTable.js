// ✅ AdminTrackTable.js
import React, { useEffect, useState } from 'react';

const AdminTrackTable = () => {
  const [tracks, setTracks] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTracks = async (pg = 1) => {
    try {
      const res = await fetch(`/api/admin/tracks?page=${pg}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      setTracks(data.tracks);
      setTotalPages(data.pages);
      setPage(pg);
    } catch (err) {
      console.error("Error fetching tracks:", err);
    }
  };

  useEffect(() => {
    fetchTracks(page);
  }, []);

  const handleStatusChange = async (trackId, newStatus) => {
    try {
      await fetch(`/api/admin/tracks/${trackId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTracks(page);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Admin Track Review</h3>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Status</th>
            <th>Play</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => (
            <tr key={track.id}>
              <td>{track.title}</td>
              <td>{track.artist_name}</td>
              <td>{track.status}</td>
              <td>
                <audio controls src={track.audio_url} />
              </td>
              <td>
                <button
                  className="btn btn-success btn-sm mr-2"
                  onClick={() => handleStatusChange(track.id, "approved")}
                >
                  Approve
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleStatusChange(track.id, "rejected")}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="d-flex justify-content-between">
        <button
          className="btn btn-outline-primary"
          onClick={() => fetchTracks(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          className="btn btn-outline-primary"
          onClick={() => fetchTracks(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminTrackTable;
