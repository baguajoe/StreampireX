import React from 'react';

const VideoChannelManager = ({ 
    isOpen, 
    onClose, 
    channel, 
    videos, 
    onVideoUpload, 
    uploading,
    supportsClips 
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="video-channel-manager-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Video Channel Manager</h3>
                    <button onClick={onClose} className="close-modal-btn">
                        ❌
                    </button>
                </div>
                <div className="modal-content">
                    <div className="channel-info">
                        <h4>Channel: {channel?.channel_name || 'No Channel'}</h4>
                        <p>Videos: {videos?.length || 0}</p>
                        <p>Clips Support: {supportsClips ? 'Yes' : 'No'}</p>
                    </div>
                    
                    <div className="upload-section">
                        <h5>Upload Video</h5>
                        <p>Video upload functionality coming soon!</p>
                        {uploading && <p>Uploading...</p>}
                    </div>
                    
                    <div className="videos-list">
                        <h5>Your Videos</h5>
                        {videos?.length > 0 ? (
                            videos.map((video, index) => (
                                <div key={index} className="video-item">
                                    <h6>{video.title}</h6>
                                    <p>Duration: {video.duration || 'Unknown'}</p>
                                    <p>Type: {video.content_type || 'video'}</p>
                                </div>
                            ))
                        ) : (
                            <p>No videos uploaded yet.</p>
                        )}
                    </div>
                    
                    <button onClick={onClose} className="close-btn">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoChannelManager;