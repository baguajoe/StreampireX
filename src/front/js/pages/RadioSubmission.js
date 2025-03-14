import { useState } from "react";

const RadioSubmission = () => {
    const [trackId, setTrackId] = useState("");
    const [stationName, setStationName] = useState("");

    const submitTrack = async () => {
        const response = await fetch("http://localhost:5000/api/radio_submission", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ track_id: trackId, station_name: stationName })
        });
        const data = await response.json();
        alert(data.message);
    };

    return (
        <div>
            <h2>Submit Track to Radio Station</h2>
            <input type="text" placeholder="Track ID" onChange={(e) => setTrackId(e.target.value)} />
            <input type="text" placeholder="Station Name" onChange={(e) => setStationName(e.target.value)} />
            <button onClick={submitTrack}>Submit</button>
        </div>
    );
};

export default RadioSubmission;
