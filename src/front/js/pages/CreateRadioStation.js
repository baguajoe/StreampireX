import React, { useState, useEffect, useRef } from "react";

const CreateRadioStation = () => {
    const [stationName, setStationName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // Existing state variables
    const [targetAudience, setTargetAudience] = useState("");
    const [broadcastHours, setBroadcastHours] = useState("24/7");
    const [isExplicit, setIsExplicit] = useState(false);
    const [tags, setTags] = useState("");
    const [welcomeMessage, setWelcomeMessage] = useState("");
    const [socialLinks, setSocialLinks] = useState({
        website: "",
        instagram: "",
        twitter: ""
    });

    // Image upload states
    const [logoImage, setLogoImage] = useState(null);
    const [coverImage, setCoverImage] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    // Audio/Mix upload states
    const [initialMixFile, setInitialMixFile] = useState(null);
    const [mixTitle, setMixTitle] = useState("");
    const [mixDescription, setMixDescription] = useState("");
    const [djName, setDjName] = useState("");
    const [bpm, setBpm] = useState("");
    const [mood, setMood] = useState("");
    const [subGenres, setSubGenres] = useState("");
    const [audioPreview, setAudioPreview] = useState(null);

    // Tracklist for royalty reporting
    const [tracklist, setTracklist] = useState([{
        songTitle: "",
        artistName: "",
        albumName: "",
        recordLabel: "",
        publisherName: "",
        songwriterNames: "",
        playOrderNumber: 1,
        approximateStartTime: "0:00",
        approximateDuration: "3:30"
    }]);

    // Refs for file inputs
    const logoInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const audioInputRef = useRef(null);

    // Navigation function - update based on your routing setup
    const navigate = (path) => {
        console.log(`Navigate to: ${path}`);
        // For React Router: 
        // const navigate = useNavigate();
        // navigate(path);

        // For manual navigation:
        window.location.href = path;
    };

    // Fetch radio categories from the backend
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
                console.log("Fetching categories from:", `${backendUrl}/api/radio/categories`);

                const response = await fetch(`${backendUrl}/api/radio/categories`);
                console.log("Categories response status:", response.status);

                if (!response.ok) {
                    throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log("Categories data:", data);
                setCategories(data);
            } catch (error) {
                console.error("Error fetching categories:", error);
                // Fallback to hardcoded categories if API fails
                const fallbackCategories = [
                    "Top 40 & Pop Hits", "Classic Pop", "K-Pop & J-Pop", "Indie & Alternative Pop",
                    "Classic Rock", "Hard Rock & Metal", "Alternative Rock", "Punk Rock", "Grunge",
                    "Hip-Hop & Rap", "R&B & Soul", "Neo-Soul", "Old-School Hip-Hop",
                    "EDM", "House & Deep House", "Techno", "Trance", "Drum & Bass", "Dubstep", "Lo-Fi",
                    "Smooth Jazz", "Classic Jazz", "Blues & Soul Blues", "Jazz Fusion", "Swing & Big Band",
                    "Classical & Opera", "Film Scores & Soundtracks", "Instrumental & Piano Music",
                    "Reggaeton", "Salsa & Merengue", "Cumbia & Bachata", "Afrobeat",
                    "Modern Country", "Classic Country", "Americana", "Bluegrass",
                    "Reggae", "Dancehall", "Roots Reggae",
                    "50s & 60s Classics", "70s & 80s Hits", "90s & 2000s Throwbacks",
                    "Talk Radio", "News", "Sports", "Comedy"
                ];
                setCategories(fallbackCategories);
                setMessage("Using offline categories - some features may be limited.");
            }
        };

        fetchCategories();
    }, []);

    // Clean up preview URLs when component unmounts
    useEffect(() => {
        return () => {
            if (logoPreview) URL.revokeObjectURL(logoPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            if (audioPreview) URL.revokeObjectURL(audioPreview);
        };
    }, [logoPreview, coverPreview, audioPreview]);

    // Function to handle logo image selection
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setMessage("Logo image must be less than 2MB");
                return;
            }

            if (logoPreview) URL.revokeObjectURL(logoPreview);
            setLogoImage(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // Function to handle cover image selection
    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage("Cover image must be less than 5MB");
                return;
            }

            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setCoverImage(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    // Function to handle audio file selection
    const handleAudioChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate audio file
        if (!file.type.startsWith('audio/')) {
            alert('Please select a valid audio file');
            return;
        }

        console.log("Audio file selected:", file.name, "Size:", file.size);

        setInitialMixFile(file);

        // Create preview URL for the player
        const audioUrl = URL.createObjectURL(file);
        setAudioPreview(audioUrl);

        // Clean up previous URL to prevent memory leaks
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    };

    // Function to handle social link changes
    const handleSocialLinkChange = (platform, value) => {
        setSocialLinks(prev => ({
            ...prev,
            [platform]: value
        }));
    };

    // Function to format file size for display
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Functions to handle tracklist for royalty compliance
    const addTrackToList = () => {
        const newTrack = {
            songTitle: "",
            artistName: "",
            albumName: "",
            recordLabel: "",
            publisherName: "",
            songwriterNames: "",
            playOrderNumber: tracklist.length + 1,
            approximateStartTime: "0:00",
            approximateDuration: "3:30"
        };
        setTracklist([...tracklist, newTrack]);
    };

    const removeTrackFromList = (index) => {
        if (tracklist.length > 1) {
            const updatedTracklist = tracklist.filter((_, i) => i !== index);
            // Update play order numbers
            const reorderedTracklist = updatedTracklist.map((track, i) => ({
                ...track,
                playOrderNumber: i + 1
            }));
            setTracklist(reorderedTracklist);
        }
    };

    const updateTrack = (index, field, value) => {
        const updatedTracklist = tracklist.map((track, i) =>
            i === index ? { ...track, [field]: value } : track
        );
        setTracklist(updatedTracklist);
    };

    const validateTracklist = () => {
        if (tracklist.length === 0) {
            return "At least one track must be listed for royalty compliance";
        }

        for (let i = 0; i < tracklist.length; i++) {
            const track = tracklist[i];
            if (!track.songTitle.trim()) {
                return `Track ${i + 1}: Song title is required`;
            }
            if (!track.artistName.trim()) {
                return `Track ${i + 1}: Artist name is required`;
            }
            if (!track.songwriterNames.trim()) {
                return `Track ${i + 1}: Songwriter name(s) required for royalty reporting`;
            }
        }
        return null;
    };

    // Function to create a new radio station
    const createStation = async () => {
        // Validate required fields - MANDATORY METADATA
        if (!stationName.trim()) {
            setMessage("Station name is required!");
            return;
        }

        if (!description.trim()) {
            setMessage("Station description is required!");
            return;
        }

        if (!category) {
            setMessage("Category selection is required!");
            return;
        }

        if (!targetAudience.trim()) {
            setMessage("Target audience is required!");
            return;
        }

        if (!logoImage) {
            setMessage("Please upload a logo for your station!");
            return;
        }

        // Validate initial mix upload - MANDATORY
        if (!initialMixFile) {
            setMessage("Please upload an initial mix to get your station started!");
            return;
        }

        // Validate mix metadata - MANDATORY
        if (!mixTitle.trim()) {
            setMessage("Mix title is required!");
            return;
        }

        if (!mixDescription.trim()) {
            setMessage("Mix description is required!");
            return;
        }

        if (!djName.trim()) {
            setMessage("DJ name is required!");
            return;
        }

        // Validate tracklist for royalty compliance
        const tracklistError = validateTracklist();
        if (tracklistError) {
            setMessage(tracklistError);
            return;
        }

        setLoading(true);
        setMessage("Creating your radio station...");

        try {
            const formData = new FormData();

            // Station metadata
            formData.append("name", stationName.trim());
            formData.append("description", description.trim());
            formData.append("category", category);
            formData.append("targetAudience", targetAudience.trim());
            formData.append("broadcastHours", broadcastHours);
            formData.append("isExplicit", isExplicit);
            formData.append("tags", JSON.stringify(tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')));
            formData.append("welcomeMessage", welcomeMessage.trim());
            formData.append("socialLinks", JSON.stringify(socialLinks));

            // Images
            if (logoImage) formData.append("logo", logoImage);
            if (coverImage) formData.append("cover", coverImage);

            // Audio and mix metadata
            if (initialMixFile) formData.append("initialMix", initialMixFile);
            formData.append("mixTitle", mixTitle.trim());
            formData.append("mixDescription", mixDescription.trim());
            formData.append("djName", djName.trim());
            formData.append("bpm", bpm.trim());
            formData.append("mood", mood.trim());
            formData.append("subGenres", subGenres.trim());

            // Tracklist for royalty compliance
            formData.append("tracklist", JSON.stringify(tracklist));

            // Updated fetch with correct environment variable
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
            const endpoint = `${backendUrl}/api/profile/radio/create`;

            console.log("Creating station with endpoint:", endpoint);
            console.log("FormData contents:");
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(`${key}: File(${value.name}, ${formatFileSize(value.size)})`);
                } else {
                    console.log(`${key}: ${value}`);
                }
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: formData,
            });

            console.log("Response status:", response.status, response.statusText);

            const data = await response.json();
            console.log("Response data:", data);

            if (response.ok) {
                setMessage("Radio station created successfully!");

                // Reset all form fields
                setStationName("");
                setDescription("");
                setCategory("");
                setTargetAudience("");
                setBroadcastHours("24/7");
                setIsExplicit(false);
                setTags("");
                setWelcomeMessage("");
                setSocialLinks({ website: "", instagram: "", twitter: "" });
                setLogoImage(null);
                setCoverImage(null);
                setLogoPreview(null);
                setCoverPreview(null);

                // Reset audio fields
                setInitialMixFile(null);
                setMixTitle("");
                setMixDescription("");
                setDjName("");
                setBpm("");
                setMood("");
                setSubGenres("");
                setAudioPreview(null);

                // Reset tracklist
                setTracklist([{
                    songTitle: "",
                    artistName: "",
                    albumName: "",
                    recordLabel: "",
                    publisherName: "",
                    songwriterNames: "",
                    playOrderNumber: 1,
                    approximateStartTime: "0:00",
                    approximateDuration: "3:30"
                }]);

                setMessage("Radio station created successfully! Redirecting to browse stations...");

                // Redirect to browse stations after short delay
                setTimeout(() => {
                    navigate("/browse-radio-stations");
                }, 2000);
            } else {
                throw new Error(data.error || data.message || "Failed to create radio station");
            }
        } catch (error) {
            console.error("Error creating radio station:", error);

            // More detailed error messages
            if (error.message.includes('fetch')) {
                setMessage("Could not connect to server. Please check your connection and try again.");
            } else if (error.message.includes('401')) {
                setMessage("Authentication error. Please log in again.");
            } else if (error.message.includes('413')) {
                setMessage("Files too large. Please reduce file sizes and try again.");
            } else if (error.message.includes('500')) {
                setMessage("Server error. Please try again later.");
            } else {
                setMessage(`Error: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2>Create a New Radio Station</h2>

            {message && (
                <p style={{
                    ...styles.message,
                    color: message.includes('Error') || message.includes('required') || message.includes('must') ? '#dc3545' :
                        message.includes('Using offline') ? '#ffc107' :
                            message.includes('Creating') ? '#007bff' : '#28a745'
                }}>
                    {message}
                </p>
            )}

            <div style={styles.formSection}>
                <h3>Basic Information</h3>

                <input
                    type="text"
                    placeholder="Enter Radio Station Name *"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    style={styles.input}
                />

                <textarea
                    placeholder="Enter Description *"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={styles.textarea}
                ></textarea>

                <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
                    <option value="">Select a Category *</option>
                    {categories.map((cat, index) => (
                        <option key={index} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Initial Mix Upload Section */}
            <div style={styles.formSection}>
                <h3>Upload Your Initial Mix *</h3>
                <p style={styles.sectionDescription}>
                    Upload a mix or playlist to get your station started. This will be the first thing listeners hear!
                </p>

                <div style={styles.audioUploadContainer}>
                    <div
                        style={{
                            ...styles.audioDropzone,
                            borderColor: initialMixFile ? '#28A745' : '#ccc'
                        }}
                        onClick={() => audioInputRef.current.click()}
                    >
                        {initialMixFile ? (
                            <div style={styles.audioFileInfo}>
                                <div style={styles.audioIcon}>🎵</div>
                                <div>
                                    <strong>{initialMixFile.name}</strong>
                                    <p>{formatFileSize(initialMixFile.size)}</p>
                                    {audioPreview && (
                                        <audio controls style={styles.audioPreview}>
                                            <source src={audioPreview} type={initialMixFile.type} />
                                        </audio>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={styles.uploadPrompt}>
                                <div style={styles.uploadIcon}>🎧</div>
                                <p><strong>Click to upload your mix</strong></p>
                                <p>MP3, WAV, or other audio formats • Max 120MB</p>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={audioInputRef}
                        accept="audio/*"
                        onChange={handleAudioChange}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Mix Metadata - MANDATORY FIELDS */}
                {initialMixFile && (
                    <div style={styles.mixMetadata}>
                        <h4>Mix Details</h4>

                        <input
                            type="text"
                            placeholder="Mix Title *"
                            value={mixTitle}
                            onChange={(e) => setMixTitle(e.target.value)}
                            style={styles.input}
                        />

                        <textarea
                            placeholder="Mix Description *"
                            value={mixDescription}
                            onChange={(e) => setMixDescription(e.target.value)}
                            style={styles.textarea}
                        />

                        <div style={styles.rowInputs}>
                            <input
                                type="text"
                                placeholder="DJ Name *"
                                value={djName}
                                onChange={(e) => setDjName(e.target.value)}
                                style={styles.inputHalf}
                            />
                            <input
                                type="text"
                                placeholder="BPM (optional)"
                                value={bpm}
                                onChange={(e) => setBpm(e.target.value)}
                                style={styles.inputHalf}
                            />
                        </div>

                        <div style={styles.rowInputs}>
                            <input
                                type="text"
                                placeholder="Mood/Vibe (e.g., Chill, Energetic)"
                                value={mood}
                                onChange={(e) => setMood(e.target.value)}
                                style={styles.inputHalf}
                            />
                            <input
                                type="text"
                                placeholder="Sub-genres (e.g., Deep House, Techno)"
                                value={subGenres}
                                onChange={(e) => setSubGenres(e.target.value)}
                                style={styles.inputHalf}
                            />
                        </div>

                        {/* MANDATORY TRACKLIST FOR ROYALTY COMPLIANCE */}
                        <div style={styles.tracklistSection}>
                            <div style={styles.tracklistHeader}>
                                <h4>Tracklist * (Required for BMI/ASCAP Royalty Reporting)</h4>
                                <p style={styles.complianceNote}>
                                    Complete track information is legally required for proper royalty distribution to artists, songwriters, and publishers.
                                </p>
                            </div>

                            {tracklist.map((track, index) => (
                                <div key={index} style={styles.trackItem}>
                                    <div style={styles.trackHeader}>
                                        <h5>Track {track.playOrderNumber}</h5>
                                        {tracklist.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeTrackFromList(index)}
                                                style={styles.removeTrackBtn}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    {/* Required Fields */}
                                    <div style={styles.rowInputs}>
                                        <input
                                            type="text"
                                            placeholder="Song Title *"
                                            value={track.songTitle}
                                            onChange={(e) => updateTrack(index, 'songTitle', e.target.value)}
                                            style={styles.inputHalf}
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Artist Name *"
                                            value={track.artistName}
                                            onChange={(e) => updateTrack(index, 'artistName', e.target.value)}
                                            style={styles.inputHalf}
                                            required
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Songwriter(s) * (Required for royalties - separate multiple with commas)"
                                        value={track.songwriterNames}
                                        onChange={(e) => updateTrack(index, 'songwriterNames', e.target.value)}
                                        style={styles.input}
                                        required
                                    />

                                    {/* Additional Metadata */}
                                    <div style={styles.rowInputs}>
                                        <input
                                            type="text"
                                            placeholder="Album Name (if applicable)"
                                            value={track.albumName}
                                            onChange={(e) => updateTrack(index, 'albumName', e.target.value)}
                                            style={styles.inputHalf}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Record Label (if known)"
                                            value={track.recordLabel}
                                            onChange={(e) => updateTrack(index, 'recordLabel', e.target.value)}
                                            style={styles.inputHalf}
                                        />
                                    </div>

                                    <div style={styles.rowInputs}>
                                        <input
                                            type="text"
                                            placeholder="Publisher (if known)"
                                            value={track.publisherName}
                                            onChange={(e) => updateTrack(index, 'publisherName', e.target.value)}
                                            style={styles.inputHalf}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Duration (e.g., 3:45)"
                                            value={track.approximateDuration}
                                            onChange={(e) => updateTrack(index, 'approximateDuration', e.target.value)}
                                            style={styles.inputHalf}
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Start Time in Mix (e.g., 0:00, 3:45)"
                                        value={track.approximateStartTime}
                                        onChange={(e) => updateTrack(index, 'approximateStartTime', e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addTrackToList}
                                style={styles.addTrackBtn}
                            >
                                Add Another Track
                            </button>

                            <div style={styles.royaltyNotice}>
                                <p><strong>Important:</strong> This tracklist will be used for:</p>
                                <ul>
                                    <li>BMI & ASCAP royalty reporting</li>
                                    <li>SoundExchange digital performance royalties</li>
                                    <li>Mechanical license compliance</li>
                                    <li>Artist and songwriter credit attribution</li>
                                </ul>
                                <p>Incomplete information may result in legal compliance issues and unpaid royalties to rights holders.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={styles.formSection}>
                <h3>Station Visuals</h3>

                <div style={styles.imageUploadContainer}>
                    <div style={styles.imageUploadBox}>
                        <h4>Station Logo *</h4>
                        <div
                            style={{
                                ...styles.uploadPreview,
                                backgroundImage: logoPreview ? `url(${logoPreview})` : 'none'
                            }}
                            onClick={() => logoInputRef.current.click()}
                        >
                            {!logoPreview && <p>Click to upload logo</p>}
                        </div>
                        <p style={styles.uploadHint}>Square image, max 2MB</p>
                        <input
                            type="file"
                            ref={logoInputRef}
                            accept="image/jpeg, image/png, image/gif"
                            onChange={handleLogoChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div style={styles.imageUploadBox}>
                        <h4>Cover Image (Optional)</h4>
                        <div
                            style={{
                                ...styles.uploadPreview,
                                ...styles.coverPreview,
                                backgroundImage: coverPreview ? `url(${coverPreview})` : 'none'
                            }}
                            onClick={() => coverInputRef.current.click()}
                        >
                            {!coverPreview && <p>Click to upload cover</p>}
                        </div>
                        <p style={styles.uploadHint}>Banner image, max 5MB</p>
                        <input
                            type="file"
                            ref={coverInputRef}
                            accept="image/jpeg, image/png"
                            onChange={handleCoverChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>
            </div>

            <div style={styles.formSection}>
                <h3>Audience & Content</h3>

                <input
                    type="text"
                    placeholder="Target Audience *"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    style={styles.input}
                />

                <select
                    value={broadcastHours}
                    onChange={(e) => setBroadcastHours(e.target.value)}
                    style={styles.select}
                >
                    <option value="24/7">24/7 Broadcasting</option>
                    <option value="mornings">Morning Hours</option>
                    <option value="evenings">Evening Hours</option>
                    <option value="weekends">Weekends Only</option>
                    <option value="custom">Custom Schedule</option>
                </select>

                <div style={styles.checkboxContainer}>
                    <input
                        type="checkbox"
                        id="explicitContent"
                        checked={isExplicit}
                        onChange={(e) => setIsExplicit(e.target.checked)}
                    />
                    <label htmlFor="explicitContent">Contains explicit content</label>
                </div>

                <input
                    type="text"
                    placeholder="Tags (comma-separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    style={styles.input}
                />

                <textarea
                    placeholder="Welcome Message for Listeners"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    style={styles.textarea}
                ></textarea>
            </div>

            <div style={styles.formSection}>
                <h3>Social Media Links</h3>

                <input
                    type="url"
                    placeholder="Website URL"
                    value={socialLinks.website}
                    onChange={(e) => handleSocialLinkChange("website", e.target.value)}
                    style={styles.input}
                />

                <input
                    type="text"
                    placeholder="Instagram Handle"
                    value={socialLinks.instagram}
                    onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                    style={styles.input}
                />

                <input
                    type="text"
                    placeholder="Twitter Handle"
                    value={socialLinks.twitter}
                    onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                    style={styles.input}
                />
            </div>

            <button onClick={createStation} style={styles.button} disabled={loading}>
                {loading ? "Creating Station..." : "Create Station"}
            </button>

            <p style={styles.nextStepsInfo}>
                After creating your station, you'll be able to upload more music and manage your playlists.
            </p>
        </div>
    );
};

// Enhanced Styling with audio upload styles
const styles = {
    container: {
        maxWidth: "700px",
        margin: "auto",
        padding: "20px",
        textAlign: "left",
        border: "2px solid #ddd",
        borderRadius: "10px",
        backgroundColor: "#fff",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)"
    },
    formSection: {
        marginBottom: "20px",
        padding: "15px",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9"
    },
    sectionDescription: {
        fontSize: "14px",
        color: "#666",
        marginBottom: "15px",
        fontStyle: "italic"
    },
    input: {
        width: "100%",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        fontSize: "16px",
        boxSizing: "border-box"
    },
    inputHalf: {
        width: "48%",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        fontSize: "16px",
        boxSizing: "border-box"
    },
    rowInputs: {
        display: "flex",
        justifyContent: "space-between",
        gap: "10px"
    },
    textarea: {
        width: "100%",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        minHeight: "80px",
        fontSize: "16px",
        boxSizing: "border-box"
    },
    select: {
        width: "100%",
        padding: "12px",
        marginBottom: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        fontSize: "16px"
    },
    button: {
        width: "100%",
        padding: "12px",
        backgroundColor: "#28A745",
        color: "#fff",
        borderRadius: "5px",
        cursor: "pointer",
        border: "none",
        fontSize: "16px"
    },
    message: {
        fontWeight: "bold",
        marginBottom: "10px",
        padding: "10px",
        borderRadius: "5px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #dee2e6"
    },
    checkboxContainer: {
        display: "flex",
        alignItems: "center",
        marginBottom: "10px"
    },
    imageUploadContainer: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: "15px",
        marginBottom: "10px"
    },
    imageUploadBox: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    },
    uploadPreview: {
        width: "150px",
        height: "150px",
        border: "2px dashed #ccc",
        borderRadius: "5px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        backgroundSize: "cover",
        backgroundPosition: "center",
        marginBottom: "10px"
    },
    coverPreview: {
        width: "250px",
        height: "120px",
    },
    uploadHint: {
        fontSize: "12px",
        color: "#666",
        margin: "0"
    },
    // Audio upload styles
    audioUploadContainer: {
        marginBottom: "15px"
    },
    audioDropzone: {
        width: "100%",
        minHeight: "120px",
        border: "2px dashed #ccc",
        borderRadius: "8px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        backgroundColor: "#fafafa",
        transition: "border-color 0.3s ease",
        marginBottom: "15px"
    },
    uploadPrompt: {
        textAlign: "center",
        padding: "20px"
    },
    uploadIcon: {
        fontSize: "48px",
        marginBottom: "10px"
    },
    audioFileInfo: {
        display: "flex",
        alignItems: "center",
        gap: "15px",
        padding: "20px"
    },
    audioIcon: {
        fontSize: "48px",
        color: "#28A745"
    },
    audioPreview: {
        width: "300px",
        marginTop: "10px"
    },
    mixMetadata: {
        backgroundColor: "#fff",
        padding: "15px",
        borderRadius: "8px",
        border: "1px solid #e0e0e0"
    },
    tracklistSection: {
        marginTop: "20px",
        padding: "15px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "2px solid #007bff"
    },
    tracklistHeader: {
        marginBottom: "15px",
        textAlign: "center"
    },
    complianceNote: {
        fontSize: "12px",
        color: "#666",
        fontStyle: "italic",
        margin: "5px 0"
    },
    trackItem: {
        backgroundColor: "#fff",
        padding: "15px",
        marginBottom: "15px",
        borderRadius: "6px",
        border: "1px solid #ddd"
    },
    trackHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px"
    },
    removeTrackBtn: {
        padding: "5px 10px",
        backgroundColor: "#dc3545",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "12px"
    },
    addTrackBtn: {
        width: "100%",
        padding: "10px",
        backgroundColor: "#007bff",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        marginBottom: "15px"
    },
    royaltyNotice: {
        backgroundColor: "#fff3cd",
        border: "1px solid #ffeaa7",
        borderRadius: "4px",
        padding: "15px",
        fontSize: "12px"
    },
    nextStepsInfo: {
        textAlign: "center",
        marginTop: "15px",
        fontSize: "14px",
        color: "#666"
    }
};

export default CreateRadioStation;