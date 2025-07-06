import React, { useEffect, useState, useContext } from "react";
import { joinSquad } from "../utils/gamerAPI";
import { Context } from "../store/appContext";
import SquadPreviewCard from "../components/SquadPreviewCard";

// Optional fetchPublicSquads() would come from your backend
// You can mock it for now or add `/api/squads/public`
const mockSquads = [
  {
    id: 1,
    name: "Crimson Wolves",
    description: "FPS-focused squad across PS5 and PC.",
    platform_tags: ["PS5", "PC"],
    invite_code: "ABCD1234"
  },
  {
    id: 2,
    name: "Shadow Reapers",
    description: "Casual battle royale team.",
    platform_tags: ["Xbox", "PC"],
    invite_code: "XYZ999"
  }
];

const SquadFinderPage = () => {
  const { store } = useContext(Context);
  const token = store.token;

  const [publicSquads, setPublicSquads] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Replace with real fetchPublicSquads() call later
    setPublicSquads(mockSquads);
  }, []);

  const handleJoin = async (inviteCode) => {
    try {
      const res = await joinSquad(inviteCode, token);
      setStatus({ success: true, message: `✅ Joined squad ${res.squad_id}` });
    } catch (err) {
      console.error("Join failed:", err);
      setStatus({ success: false, message: "❌ Invalid invite code." });
    }
  };

  return (
    <div className="page-container">
      <h1>🔍 Discover Squads</h1>

      {status && (
        <div className={`alert ${status.success ? "alert-success" : "alert-danger"}`}>
          {status.message}
        </div>
      )}

      {publicSquads.map((squad) => (
        <SquadPreviewCard key={squad.id} squad={squad} onJoin={handleJoin} />
      ))}
    </div>
  );
};

export default SquadFinderPage;
