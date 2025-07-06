import React, { useEffect, useState, useContext } from "react";
import { getLiveSquadStreams } from "../utils/gamerAPI";
import { Context } from "../store/appContext";
import MultiStreamSection from "../components/MultiStreamSection";

const TeamRoomPage = () => {
  const { store } = useContext(Context);
  const token = store.token;

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getLiveSquadStreams(token)
        .then(data => {
          setStreams(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching squad streams:", err);
          setLoading(false);
        });
    }
  }, [token]);

  return (
    <div className="page-container">
      <h1>🧑‍🤝‍🧑 Team Room</h1>

      {loading ? (
        <p>Loading squad streams...</p>
      ) : (
        <MultiStreamSection streams={streams} />
      )}
    </div>
  );
};

export default TeamRoomPage;
