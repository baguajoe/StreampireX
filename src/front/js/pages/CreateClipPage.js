import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/CreateClipPage.css';

const CreateClipPage = () => {
    const { store } = useContext(Context);
    const navigate = useNavigate();
    const videoRef = useRef(null);
    
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Videos list
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    
    // Clip settings
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(15);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    
    // Video preview
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const MAX_CLIP_DURATION = 60; // 60 seconds max

    useEffect(() => {
        fetchUserVideos();
    }, []);

    const fetchUserVideos = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setVideos(data.videos || []);
            }
        } catch (err) {
            console.error('Error fetching videos:', err);
            setError('Failed to load your videos');
        } finally {
            setLoading(false);
        }
    };

    const handleVideoSelect = (video) => {
        setSelectedVideo(video);
        setTitle(`Clip from "${video.title}"`);
        setStartTime(0);
        setEndTime(Math.min(15, video.duration || 15));
        setError('');
        setSuccess('');
    };

    const handleVideoLoaded = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setEndTime(Math.min(15, videoRef.current.duration));
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const setStartFromCurrent = () => {
        setStartTime(Math.floor(currentTime));
        if (endTime <= currentTime) {
            setEndTime(Math.min(Math.floor(currentTime) + 15, duration));
        }
    };

    const setEndFromCurrent = () => {
        if (currentTime > startTime) {
            setEndTime(Math.floor(currentTime));
        }
    };

    const seekToStart = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = startTime;
        }
    };

    const seekToEnd = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = endTime;
        }
    };

    const previewClip = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = startTime;
            videoRef.current.play();
            
            // Stop at end time
            const checkEnd = setInterval(() => {
                if (videoRef.current && videoRef.current.currentTime >= endTime) {
                    videoRef.current.pause();
                    clearInterval(checkEnd);
                }
            }, 100);
        }
    };

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !tags.includes(tag) && tags.length < 10) {
            setTags([...tags, tag]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const clipDuration = endTime - startTime;
    const isValidClip = clipDuration > 0 && clipDuration <= MAX_CLIP_DURATION;

    const createClip = async () => {
        if (!selectedVideo) {
            setError('Please select a video');
            return;
        }
        if (!title.trim()) {
            setError('Please enter a title for your clip');
            return;
        }
        if (!isValidClip) {
            setError(`Clip must be between 1 and ${MAX_CLIP_DURATION} seconds`);
            return;
        }

        setCreating(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/clips/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_video_id: selectedVideo.id,
                    title: title.trim(),
                    description: description.trim(),
                    start_time: startTime,
                    end_time: endTime,
                    tags
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('🎉 Clip created successfully!');
                setTimeout(() => {
                    navigate('/my-clips');
                }, 2000);
            } else {
                setError(data.error || 'Failed to create clip');
            }
        } catch (err) {
            console.error('Create clip error:', err);
            setError('Failed to create clip. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="create-clip-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your videos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="create-clip-page">
            <div className="create-clip-container">
                <div className="page-header">
                    <h1>✂️ Create Clip</h1>
                    <p>Create short clips from your videos to share highlights</p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <div className="clip-creator-layout">
                    {/* Video Selection */}
                    {!selectedVideo ? (
                        <div className="video-selection">
                            <h3>📹 Select a Video</h3>
                            
                            {videos.length === 0 ? (
                                <div className="no-videos">
                                    <p>You don't have any videos yet.</p>
                                    <button 
                                        onClick={() => navigate('/upload-video')}
                                        className="upload-btn"
                                    >
                                        📤 Upload a Video First
                                    </button>
                                </div>
                            ) : (
                                <div className="videos-grid">
                                    {videos.map(video => (
                                        <div 
                                            key={video.id} 
                                            className="video-select-card"
                                            onClick={() => handleVideoSelect(video)}
                                        >
                                            <div className="video-thumbnail">
                                                <img 
                                                    src={video.thumbnail_url || '/placeholder-video.jpg'} 
                                                    alt={video.title}
                                                />
                                                <span className="video-duration">
                                                    {formatTime(video.duration || 0)}
                                                </span>
                                            </div>
                                            <div className="video-info">
                                                <h4>{video.title}</h4>
                                                <p>{video.views || 0} views</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Video Preview & Timeline */}
                            <div className="clip-editor">
                                <div className="editor-header">
                                    <button 
                                        onClick={() => setSelectedVideo(null)}
                                        className="back-btn"
                                    >
                                        ← Choose Different Video
                                    </button>
                                    <h3>{selectedVideo.title}</h3>
                                </div>

                                <div className="video-preview">
                                    <video
                                        ref={videoRef}
                                        src={selectedVideo.file_url || selectedVideo.video_url}
                                        onLoadedMetadata={handleVideoLoaded}
                                        onTimeUpdate={handleTimeUpdate}
                                        controls
                                    />
                                </div>

                                {/* Timeline Controls */}
                                <div className="timeline-controls">
                                    <div className="time-display">
                                        <span>Current: {formatTime(currentTime)}</span>
                                        <span>Duration: {formatTime(duration)}</span>
                                    </div>

                                    <div className="clip-range">
                                        <div className="range-input">
                                            <label>Start Time</label>
                                            <div className="time-input-group">
                                                <input
                                                    type="number"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(Math.max(0, parseInt(e.target.value) || 0))}
                                                    min={0}
                                                    max={duration - 1}
                                                />
                                                <button onClick={setStartFromCurrent} title="Set from current position">
                                                    📍
                                                </button>
                                                <button onClick={seekToStart} title="Go to start">
                                                    ⏮️
                                                </button>
                                            </div>
                                        </div>

                                        <div className="range-input">
                                            <label>End Time</label>
                                            <div className="time-input-group">
                                                <input
                                                    type="number"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(Math.min(duration, parseInt(e.target.value) || 0))}
                                                    min={startTime + 1}
                                                    max={duration}
                                                />
                                                <button onClick={setEndFromCurrent} title="Set from current position">
                                                    📍
                                                </button>
                                                <button onClick={seekToEnd} title="Go to end">
                                                    ⏭️
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="clip-info">
                                        <span className={`clip-duration ${!isValidClip ? 'invalid' : ''}`}>
                                            Clip Duration: {formatTime(clipDuration)}
                                        </span>
                                        <span className="max-duration">
                                            (Max {MAX_CLIP_DURATION} seconds)
                                        </span>
                                    </div>

                                    <button onClick={previewClip} className="preview-btn">
                                        ▶️ Preview Clip
                                    </button>
                                </div>
                            </div>

                            {/* Clip Details Form */}
                            <div className="clip-details-form">
                                <h3>📝 Clip Details</h3>

                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter clip title..."
                                        maxLength={100}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe your clip..."
                                        rows={3}
                                        maxLength={300}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Tags</label>
                                    <div className="tags-input">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && addTag()}
                                            placeholder="Add tags..."
                                        />
                                        <button onClick={addTag} type="button">Add</button>
                                    </div>
                                    <div className="tags-list">
                                        {tags.map(tag => (
                                            <span key={tag} className="tag">
                                                #{tag}
                                                <button onClick={() => removeTag(tag)}>×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button 
                                        onClick={() => navigate(-1)}
                                        className="cancel-btn"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={createClip}
                                        className="create-btn"
                                        disabled={creating || !title.trim() || !isValidClip}
                                    >
                                        {creating ? '⏳ Creating...' : '✂️ Create Clip'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Tips */}
                <div className="clip-tips">
                    <h4>💡 Tips for Great Clips</h4>
                    <ul>
                        <li>Keep clips short and engaging (15-30 seconds is ideal)</li>
                        <li>Start with an attention-grabbing moment</li>
                        <li>Use descriptive titles to attract viewers</li>
                        <li>Add relevant tags to help discovery</li>
                        <li>Share clips on social media to drive traffic</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CreateClipPage;