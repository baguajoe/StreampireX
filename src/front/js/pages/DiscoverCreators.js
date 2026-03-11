import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const DiscoverCreators = () => {
    const [creators, setCreators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [genre, setGenre] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page, per_page: 20, ...(genre && { genre }) });
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/creators/discover?${params}`)
        .then(r => r.json())
        .then(data => { setCreators(data.creators || []); setTotal(data.total || 0); setLoading(false); })
        .catch(() => setLoading(false));
    }, [page, genre]);

    const GENRES = ["Hip-Hop", "Pop", "R&B", "EDM", "Rock", "Jazz", "Afrobeats", "Lo-fi", "Drill"];

    return (
        <div style={{padding:"24px", maxWidth:"1200px", margin:"0 auto"}}>
            <h1 style={{color:"#00ffc8", fontSize:"28px", marginBottom:"8px"}}>🎵 Discover Creators</h1>
            <p style={{color:"#8fa3b4", marginBottom:"24px"}}>
                Support independent artists — subscribe to their membership tiers
            </p>
            <div style={{display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"24px"}}>
                <button onClick={() => setGenre("")}
                    style={{padding:"6px 14px", borderRadius:"20px", border:"1px solid #2a3a4a",
                        background: genre === "" ? "#00ffc8" : "#161b22", color: genre === "" ? "#0d1117" : "#dde5ef",
                        cursor:"pointer", fontWeight: genre === "" ? "700" : "400"}}>All</button>
                {GENRES.map(g => (
                    <button key={g} onClick={() => setGenre(g)}
                        style={{padding:"6px 14px", borderRadius:"20px", border:"1px solid #2a3a4a",
                            background: genre === g ? "#00ffc8" : "#161b22", color: genre === g ? "#0d1117" : "#dde5ef",
                            cursor:"pointer", fontWeight: genre === g ? "700" : "400"}}>{g}</button>
                ))}
            </div>
            {loading ? <p style={{color:"#8fa3b4"}}>Loading creators...</p> :
            creators.length === 0 ? <p style={{color:"#8fa3b4"}}>No creators found. Be the first — create a membership tier!</p> :
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"20px"}}>
                {creators.map(c => (
                    <div key={c.id} style={{background:"#161b22", borderRadius:"12px", padding:"20px",
                        border:"1px solid #2a3a4a"}}>
                        <div style={{display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px"}}>
                            {c.profile_image ?
                                <img src={c.profile_image} alt={c.username}
                                    style={{width:"48px", height:"48px", borderRadius:"50%", objectFit:"cover"}} /> :
                                <div style={{width:"48px", height:"48px", borderRadius:"50%", background:"#00ffc8",
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    fontSize:"20px", fontWeight:"700", color:"#0d1117"}}>
                                    {c.username?.[0]?.toUpperCase()}
                                </div>}
                            <div>
                                <h3 style={{color:"#dde5ef", margin:0, fontSize:"16px"}}>{c.username}</h3>
                                {c.genre && <span style={{color:"#00ffc8", fontSize:"12px"}}>{c.genre}</span>}
                            </div>
                        </div>
                        <p style={{color:"#8fa3b4", fontSize:"13px", marginBottom:"12px", minHeight:"40px"}}>
                            {c.bio ? c.bio.slice(0, 100) + (c.bio.length > 100 ? "..." : "") : "Independent creator on StreamPireX"}
                        </p>
                        <div style={{marginBottom:"14px"}}>
                            {c.tiers.slice(0, 2).map(t => (
                                <div key={t.id} style={{display:"flex", justifyContent:"space-between",
                                    padding:"6px 10px", background:"#0d1117", borderRadius:"6px",
                                    marginBottom:"4px"}}>
                                    <span style={{color:"#dde5ef", fontSize:"13px"}}>{t.name}</span>
                                    <span style={{color:"#FF6600", fontSize:"13px", fontWeight:"700"}}>${t.price}/mo</span>
                                </div>
                            ))}
                        </div>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                            <span style={{color:"#8fa3b4", fontSize:"12px"}}>👥 {c.subscriber_count} subscribers</span>
                            <Link to={`/creator/${c.username}`}
                                style={{background:"#00ffc8", color:"#0d1117", padding:"6px 16px",
                                    borderRadius:"6px", textDecoration:"none", fontWeight:"700", fontSize:"13px"}}>
                                View Profile
                            </Link>
                        </div>
                    </div>
                ))}
            </div>}
            {total > 20 && (
                <div style={{display:"flex", justifyContent:"center", gap:"12px", marginTop:"32px"}}>
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                        style={{padding:"8px 20px", background:"#161b22", color:"#dde5ef",
                            border:"1px solid #2a3a4a", borderRadius:"6px", cursor:"pointer"}}>← Prev</button>
                    <span style={{color:"#8fa3b4", padding:"8px"}}>Page {page}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={creators.length < 20}
                        style={{padding:"8px 20px", background:"#161b22", color:"#dde5ef",
                            border:"1px solid #2a3a4a", borderRadius:"6px", cursor:"pointer"}}>Next →</button>
                </div>
            )}
        </div>
    );
};
export default DiscoverCreators;
