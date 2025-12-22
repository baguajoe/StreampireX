import React, { useState, useEffect, useRef } from "react";
import "../../styles/CreateRadioStation.css";

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

    // Helper function to get message type class
    const getMessageClass = () => {
        if (message.includes('Error') || message.includes('required') || message.includes('must')) {
            return 'message error';
        } else if (message.includes('Using offline')) {
            return 'message warning';
        } else if (message.includes('Creating')) {
            return 'message info';
        } else {
            return 'message success';
        }
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
        <div className="create-radio-container">
            <div className="form-wrapper">
                <h2>📻 Create a New Radio Station</h2>

                {message && (
                    <p className={getMessageClass()}>
                        {message}
                    </p>
                )}

                <div className="form-section">
                    <h3>Basic Information</h3>

                    <input
                        type="text"
                        placeholder="Enter Radio Station Name *"
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                    />

                    <textarea
                        placeholder="Enter Description *"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    ></textarea>

                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Select a Category *</option>
                        {categories.map((cat, index) => (
                            <option key={index} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Initial Mix Upload Section */}
                <div className="form-section">
                    <h3>🎧 Upload Your Initial Mix *</h3>
                    <p className="section-description">
                        Upload a mix or playlist to get your station started. This will be the first thing listeners hear!
                    </p>

                    <div className="audio-upload-container">
                        <div
                            className={`audio-dropzone ${initialMixFile ? 'has-file' : ''}`}
                            onClick={() => audioInputRef.current.click()}
                        >
                            {initialMixFile ? (
                                <div className="audio-file-info">
                                    <div className="audio-icon">🎵</div>
                                    <div>
                                        <strong>{initialMixFile.name}</strong>
                                        <p>{formatFileSize(initialMixFile.size)}</p>
                                        {audioPreview && (
                                            <audio controls className="audio-preview">
                                                <source src={audioPreview} type={initialMixFile.type} />
                                            </audio>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="upload-prompt">
                                    <div className="upload-icon">🎧</div>
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
                        <div className="mix-metadata">
                            <h4>Mix Details</h4>

                            <input
                                type="text"
                                placeholder="Mix Title *"
                                value={mixTitle}
                                onChange={(e) => setMixTitle(e.target.value)}
                            />

                            <textarea
                                placeholder="Mix Description *"
                                value={mixDescription}
                                onChange={(e) => setMixDescription(e.target.value)}
                            />

                            <div className="row-inputs">
                                <input
                                    type="text"
                                    placeholder="DJ Name *"
                                    value={djName}
                                    onChange={(e) => setDjName(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="BPM (optional)"
                                    value={bpm}
                                    onChange={(e) => setBpm(e.target.value)}
                                />
                            </div>

                            <div className="row-inputs">
                                <input
                                    type="text"
                                    placeholder="Mood/Vibe (e.g., Chill, Energetic)"
                                    value={mood}
                                    onChange={(e) => setMood(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Sub-genres (e.g., Deep House, Techno)"
                                    value={subGenres}
                                    onChange={(e) => setSubGenres(e.target.value)}
                                />
                            </div>

                            {/* MANDATORY TRACKLIST FOR ROYALTY COMPLIANCE */}
                            <div className="tracklist-section">
                                <div className="tracklist-header">
                                    <h4>📋 Tracklist * (Required for BMI/ASCAP Royalty Reporting)</h4>
                                    <p className="compliance-note">
                                        Complete track information is legally required for proper royalty distribution to artists, songwriters, and publishers.
                                    </p>
                                </div>

                                {tracklist.map((track, index) => (
                                    <div key={index} className="track-item">
                                        <div className="track-header">
                                            <h5>Track {track.playOrderNumber}</h5>
                                            {tracklist.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeTrackFromList(index)}
                                                    className="remove-track-btn"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        {/* Required Fields */}
                                        <div className="row-inputs">
                                            <input
                                                type="text"
                                                placeholder="Song Title *"
                                                value={track.songTitle}
                                                onChange={(e) => updateTrack(index, 'songTitle', e.target.value)}
                                                required
                                            />
                                            <input
                                                type="text"
                                                placeholder="Artist Name *"
                                                value={track.artistName}
                                                onChange={(e) => updateTrack(index, 'artistName', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Songwriter(s) * (Required for royalties - separate multiple with commas)"
                                            value={track.songwriterNames}
                                            onChange={(e) => updateTrack(index, 'songwriterNames', e.target.value)}
                                            required
                                        />

                                        {/* Additional Metadata */}
                                        <div className="row-inputs">
                                            <input
                                                type="text"
                                                placeholder="Album Name (if applicable)"
                                                value={track.albumName}
                                                onChange={(e) => updateTrack(index, 'albumName', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Record Label (if known)"
                                                value={track.recordLabel}
                                                onChange={(e) => updateTrack(index, 'recordLabel', e.target.value)}
                                            />
                                        </div>

                                        <div className="row-inputs">
                                            <input
                                                type="text"
                                                placeholder="Publisher (if known)"
                                                value={track.publisherName}
                                                onChange={(e) => updateTrack(index, 'publisherName', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Duration (e.g., 3:45)"
                                                value={track.approximateDuration}
                                                onChange={(e) => updateTrack(index, 'approximateDuration', e.target.value)}
                                            />
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Start Time in Mix (e.g., 0:00, 3:45)"
                                            value={track.approximateStartTime}
                                            onChange={(e) => updateTrack(index, 'approximateStartTime', e.target.value)}
                                        />
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addTrackToList}
                                    className="add-track-btn"
                                >
                                    + Add Another Track
                                </button>

                                <div className="royalty-notice">
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

                <div className="form-section">
                    <h3>🎨 Station Visuals</h3>

                    <div className="image-upload-container">
                        <div className="image-upload-box">
                            <h4>Station Logo *</h4>
                            <div
                                className="upload-preview"
                                style={{
                                    backgroundImage: logoPreview ? `url(${logoPreview})` : 'none'
                                }}
                                onClick={() => logoInputRef.current.click()}
                            >
                                {!logoPreview && <p>Click to upload logo</p>}
                            </div>
                            <p className="upload-hint">Square image, max 2MB</p>
                            <input
                                type="file"
                                ref={logoInputRef}
                                accept="image/jpeg, image/png, image/gif"
                                onChange={handleLogoChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <div className="image-upload-box">
                            <h4>Cover Image (Optional)</h4>
                            <div
                                className="upload-preview cover-preview"
                                style={{
                                    backgroundImage: coverPreview ? `url(${coverPreview})` : 'none'
                                }}
                                onClick={() => coverInputRef.current.click()}
                            >
                                {!coverPreview && <p>Click to upload cover</p>}
                            </div>
                            <p className="upload-hint">Banner image, max 5MB</p>
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

                <div className="form-section">
                    <h3>👥 Audience & Content</h3>

                    <input
                        type="text"
                        placeholder="Target Audience *"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                    />

                    <select
                        value={broadcastHours}
                        onChange={(e) => setBroadcastHours(e.target.value)}
                    >
                        <option value="24/7">24/7 Broadcasting</option>
                        <option value="mornings">Morning Hours</option>
                        <option value="evenings">Evening Hours</option>
                        <option value="weekends">Weekends Only</option>
                        <option value="custom">Custom Schedule</option>
                    </select>

                    <div className="checkbox-container">
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
                    />

                    <textarea
                        placeholder="Welcome Message for Listeners"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                    ></textarea>
                </div>

                <div className="form-section">
                    <h3>🔗 Social Media Links</h3>

                    <input
                        type="url"
                        placeholder="Website URL"
                        value={socialLinks.website}
                        onChange={(e) => handleSocialLinkChange("website", e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Instagram Handle"
                        value={socialLinks.instagram}
                        onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Twitter Handle"
                        value={socialLinks.twitter}
                        onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                    />
                </div>

                <button onClick={createStation} className="submit-btn" disabled={loading}>
                    {loading ? "⏳ Creating Station..." : "🚀 Create Station"}
                </button>

                <p className="next-steps-info">
                    After creating your station, you'll be able to upload more music and manage your playlists.
                </p>
            </div>
        </div>
    );
};

export default CreateRadioStation;