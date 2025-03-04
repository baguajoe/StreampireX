import React, { useEffect, useState } from "react";

const MembersPage = () => {
    const [members, setMembers] = useState([]);
    const [analytics, setAnalytics] = useState({ subscribers: 0, likes: 0, comments: 0, earnings: 0 });

    useEffect(() => {
        fetch(process.env.BACKEND_URL + "/api/members", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
            .then((res) => res.json())
            .then((data) => {
                setMembers(data.members);
                setAnalytics(data.analytics);
            })
            .catch((err) => console.error("Error fetching members:", err));
    }, []);

    return (
        <div className="members-dashboard">
            <h1>📊 My Audience</h1>
            
            <div className="analytics">
                <h2>📈 Analytics</h2>
                <p>👥 Subscribers: {analytics.subscribers}</p>
                <p>❤️ Total Likes: {analytics.likes}</p>
                <p>💬 Comments: {analytics.comments}</p>
                <p>💰 Total Earnings: ${analytics.earnings}</p>
            </div>

            <h2>👥 Members</h2>
            <ul>
                {members.map((member) => (
                    <li key={member.id}>
                        <p><strong>{member.username}</strong></p>
                        <p>Email: {member.email}</p>
                        <p>Joined: {new Date(member.joined_at).toLocaleDateString()}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MembersPage;
