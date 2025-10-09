import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const FreeTrial = () => {
    const [trialInfo, setTrialInfo] = useState(null);
    const navigate = useNavigate();

    const fetchTrialStatus = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(process.env.REACT_APP_BACKEND_URL + "/free-trial-status", {
            headers: { Authorization: "Bearer " + token },
        });

        const data = await res.json();
        setTrialInfo(data);
    };

    const activateTrial = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(process.env.REACT_APP_BACKEND_URL + "/free-trial", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
        });

        const data = await res.json();
        alert(data.message);
        fetchTrialStatus();
    };

    useEffect(() => {
        fetchTrialStatus();
    }, []);

    if (!trialInfo) return <p>Loading trial status...</p>;

    return (
        <div className="trial-box">
            {trialInfo.trial_active ? (
                <p>🎉 You're on a free trial until {trialInfo.trial_ends}!</p>
            ) : trialInfo.is_on_trial ? (
                <p>😕 Your trial has expired.</p>
            ) : (
                <button onClick={activateTrial} className="btn btn-primary">
                    Start 7-Day Free Trial
                </button>
            )}
        </div>
    );
};

export default FreeTrial;
