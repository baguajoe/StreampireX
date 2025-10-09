import React, { useState } from 'react';

const ScheduleEpisodeForm = ({ episodeId, podcastId }) => {
    const [releaseTime, setReleaseTime] = useState("");

    const handleSchedule = async () => {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcast/${podcastId}/episode/schedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({ episode_id: episodeId, release_time: releaseTime })
        });

        const data = await res.json();
        if (res.ok) alert("✅ Scheduled!"); else alert("❌ " + data.error);
    };

    return (
        <div>
            <input
                type="datetime-local"
                value={releaseTime}
                onChange={(e) => setReleaseTime(e.target.value.replace("T", " ") + ":00")}
            />
            <button onClick={handleSchedule}>📅 Schedule Episode</button>
        </div>
    );
};

export default ScheduleEpisodeForm;
