import React, { useState, useEffect } from "react";

const Music = () => {
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [musicTracks, setMusicTracks] = useState([]);

    // Fetch categories from backend
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/radio/categories");
                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };

        fetchCategories();
    }, []);

    // Handle Category Selection (Allow multiple selections)
    const toggleCategory = (category) => {
        setSelectedCategories((prev) =>
            prev.includes(category) ? prev.filter((cat) => cat !== category) : [...prev, category]
        );
    };

    // Fetch Music Tracks based on selected categories
    useEffect(() => {
        if (selectedCategories.length === 0) return;

        const fetchMusic = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/music?categories=" + selectedCategories.join(","));
                const data = await response.json();
                setMusicTracks(data);
            } catch (error) {
                console.error("Error fetching music:", error);
            }
        };

        fetchMusic();
    }, [selectedCategories]);

    return (
        <div style={styles.container}>
            <h2>🎵 Music Library</h2>

            {/* Scrollable Horizontal Category Bar */}
            <div style={styles.categoryBar}>
                {categories.map((category, index) => (
                    <div
                        key={index}
                        style={{
                            ...styles.categoryItem,
                            backgroundColor: selectedCategories.includes(category) ? "#007BFF" : "#f0f0f0",
                            color: selectedCategories.includes(category) ? "#fff" : "#333"
                        }}
                        onClick={() => toggleCategory(category)}
                    >
                        {category}
                    </div>
                ))}
            </div>

            {/* Music List */}
            <div style={styles.musicList}>
                {musicTracks.length === 0 ? (
                    <p>Select categories to see music.</p>
                ) : (
                    musicTracks.map((track, index) => (
                        <div key={index} style={styles.musicCard}>
                            <img src={track.coverArtUrl} alt={track.title} style={styles.coverArt} />
                            <div>
                                <h3>{track.title}</h3>
                                <p>{track.artist}</p>
                                <audio controls>
                                    <source src={track.fileUrl} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// CSS-in-JS Styles
const styles = {
    container: {
        maxWidth: "800px",
        margin: "auto",
        padding: "20px",
        textAlign: "center",
        backgroundColor: "#fff",
        borderRadius: "8px"
    },
    categoryBar: {
        display: "flex",
        overflowX: "auto",
        whiteSpace: "nowrap",
        padding: "10px",
        marginBottom: "10px",
        borderBottom: "2px solid #ddd",
        scrollbarWidth: "none",
    },
    categoryItem: {
        padding: "10px 15px",
        margin: "5px",
        borderRadius: "5px",
        cursor: "pointer",
        fontWeight: "bold",
        transition: "0.3s",
        textAlign: "center"
    },
    musicList: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "15px",
        marginTop: "20px"
    },
    musicCard: {
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "5px",
        backgroundColor: "#fafafa",
        textAlign: "center"
    },
    coverArt: {
        width: "100%",
        height: "auto",
        borderRadius: "5px"
    }
};

export default Music;
