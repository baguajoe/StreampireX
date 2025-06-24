// ✅ ReleaseList.js with Reusable ReleaseCard and Routing Setup
import React, { useEffect, useState } from "react";
import ReleaseCard from "../component/ReleaseCard";
import { useNavigate } from "react-router-dom";

const ReleaseList = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const res = await fetch(`${process.env.BACKEND_URL}/api/creator/releases`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        const data = await res.json();
        setReleases(data);
      } catch (err) {
        console.error("Error fetching releases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
  }, []);

  return (
    <div className="container mt-4">
      <h2>🎵 My Music Releases</h2>
      <button
        className="btn btn-primary mb-3"
        onClick={() => navigate("/create-release")}
      >
        ➕ New Release
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : releases.length === 0 ? (
        <p>No releases found.</p>
      ) : (
        <div className="row">
          {releases.map((release) => (
            <div key={release.id} className="col-md-6 col-lg-4 mb-4">
              <ReleaseCard release={release} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReleaseList;
