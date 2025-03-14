import { useState } from "react";

const CollaborationMarketplace = () => {
    const [role, setRole] = useState("");

    const createListing = async () => {
        const response = await fetch("http://localhost:5000/api/collaboration", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ role })
        });
        const data = await response.json();
        alert(data.message);
    };

    return (
        <div>
            <h2>Collaboration Marketplace</h2>
            <input type="text" placeholder="Enter your role (e.g. Producer, Songwriter)" onChange={(e) => setRole(e.target.value)} />
            <button onClick={createListing}>Create Listing</button>
        </div>
    );
};

export default CollaborationMarketplace;
