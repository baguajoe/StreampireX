import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/AnnouncementBar.css";

const AnnouncementBar = () => {
    const [dismissed, setDismissed] = useState(
        localStorage.getItem("spx_bar_dismissed") === "true"
    );
    if (dismissed) return null;
    return (
        <div className="announcement-bar">
            <span>
                🚀 <strong>Founding Member Pricing</strong> — Subscribe before April 30 and lock in your rate forever.
                <Link to="/pricing" className="announcement-bar__cta"> Join Now →</Link>
            </span>
            <button className="announcement-bar__close" onClick={() => {
                localStorage.setItem("spx_bar_dismissed", "true");
                setDismissed(true);
            }}>✕</button>
        </div>
    );
};
export default AnnouncementBar;
