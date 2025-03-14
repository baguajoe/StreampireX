import { useState } from "react";

const LicensingSubmission = () => {
    const [trackId, setTrackId] = useState("");
    const [message, setMessage] = useState("");

    const submitToLicensing = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/licensing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ track_id: trackId })
            });

            const data = await response.json();
            setMessage(data.message || "Submission successful!");
        } catch (error) {
            setMessage("Error submitting track for licensing.");
        }
    };

    return (
        <div>
            <h2>Submit Track for Licensing</h2>
            <input
                type="text"
                placeholder="Track ID"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
            />
            <button onClick={submitToLicensing}>Submit</button>
            {message && <p>{message}</p>}
        </div>
    );
};

export default LicensingSubmission;
