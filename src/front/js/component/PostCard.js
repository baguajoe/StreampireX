// src/front/js/component/PostCard.js
import React, { useState, useRef, useEffect } from 'react';
import '../../styles/PostCard.css';

// Default avatar fallback
import lady1 from '../../img/lady1.png';

const PostCard = ({ 
    post, 
    currentUser, 
    onLike, 
    onDelete, 
    onEdit, 
    onComment,
    onShare,
    isOwnProfile = false 
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content || '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEditClick = () => {
        setIsEditing(true);
        setEditedContent(post.content || '');
        setShowMenu(false);
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
        setShowMenu(false);
    };

    const handleSaveEdit = async () => {
        if (editedContent.trim() && editedContent !== post.content) {
            if (onEdit) {
                await onEdit(post.id, editedContent.trim());
            }
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedContent(post.content || '');
        setIsEditing(false);
    };

    const handleConfirmDelete = async () => {
        if (onDelete) {
            await onDelete(post.id);
        }
        setShowDeleteConfirm(false);
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim() || isSubmittingComment) return;
        
        setIsSubmittingComment(true);
        try {
            if (onComment) {
                await onComment(post.id, {
                    id: Date.now(),
                    text: newComment.trim(),
                    author: currentUser?.display_name || currentUser?.username || 'You',
                    avatar: currentUser?.profile_picture || lady1,
                    timestamp: 'Just now',
                    likes: 0
                });
            }
            setNewComment('');
        } catch (error) {
            console.error('Error submitting comment:', error);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitComment();
        }
    };

    // Check if current user owns this post
    const isOwner = isOwnProfile || 
        post.user_id === currentUser?.id || 
        post.author_id === currentUser?.id ||
        post.username === currentUser?.username;

    const comments = post.comments || [];

    return (
        <div className="post-card">
            {/* Post Header */}
            <div className="post-header">
                <img
                    src={post.avatar || post.author_avatar || lady1}
                    alt={post.username || post.author_name || 'User'}
                    className="post-author-avatar"
                    onError={(e) => { e.target.src = lady1; }}
                />
                <div className="post-author-info">
                    <h6 className="post-author-name">
                        {post.username || post.author_name || 'Unknown User'}
                        {post.edited && <span className="post-edited-badge">(edited)</span>}
                    </h6>
                    <p className="post-timestamp">{post.timestamp || post.created_at || 'Just now'}</p>
                </div>
                
                {/* Three-dot Menu - Only show for post owner */}
                {isOwner && (
                    <div className="post-menu-container" ref={menuRef}>
                        <button 
                            className="post-menu-btn"
                            onClick={() => setShowMenu(!showMenu)}
                            aria-label="Post options"
                        >
                            ⋮
                        </button>
                        
                        {showMenu && (
                            <div className="post-dropdown-menu">
                                <button 
                                    className="post-dropdown-item"
                                    onClick={handleEditClick}
                                >
                                    <span className="dropdown-icon">✏️</span>
                                    Edit Post
                                </button>
                                <button 
                                    className="post-dropdown-item delete"
                                    onClick={handleDeleteClick}
                                >
                                    <span className="dropdown-icon">🗑️</span>
                                    Delete Post
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Post Content - Normal or Edit Mode */}
            <div className="post-content">
                {isEditing ? (
                    <div className="post-edit-mode">
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="post-edit-textarea"
                            maxLength={1000}
                            autoFocus
                            placeholder="What's on your mind?"
                        />
                        <div className="post-edit-actions">
                            <span className="edit-char-count">
                                {editedContent.length}/1000
                            </span>
                            <button 
                                className="edit-cancel-btn"
                                onClick={handleCancelEdit}
                            >
                                Cancel
                            </button>
                            <button 
                                className="edit-save-btn"
                                onClick={handleSaveEdit}
                                disabled={!editedContent.trim()}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="post-text">{post.content || post.text}</p>
                        {(post.image || post.image_url) && (
                            <img
                                src={post.image || post.image_url}
                                alt="Post content"
                                className="post-image"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Post Engagement - Hide when editing */}
            {!isEditing && (
                <>
                    <div className="post-engagement">
                        <button
                            onClick={() => onLike && onLike(post.id)}
                            className={`engagement-btn ${post.liked ? 'liked' : ''}`}
                        >
                            <span className="engagement-icon">{post.liked ? '❤️' : '🤍'}</span>
                            Like {post.likes || 0}
                        </button>
                        <button 
                            className="engagement-btn"
                            onClick={() => setShowComments(!showComments)}
                        >
                            <span className="engagement-icon">💬</span>
                            Comment {comments.length}
                        </button>
                        <button 
                            className="engagement-btn"
                            onClick={() => onShare && onShare(post.id)}
                        >
                            <span className="engagement-icon">🔗</span>
                            Share
                        </button>
                    </div>

                    {/* Comments Section */}
                    <div className={`post-comments-section ${showComments ? 'expanded' : ''}`}>
                        {/* View Comments Toggle */}
                        <button 
                            className="view-comments-btn"
                            onClick={() => setShowComments(!showComments)}
                        >
                            {showComments ? 'Hide' : 'View'} {comments.length} comment{comments.length !== 1 ? 's' : ''}
                        </button>

                        {/* Comments List */}
                        {showComments && (
                            <div className="comments-list">
                                {comments.length === 0 ? (
                                    <p className="no-comments">No comments yet. Be the first!</p>
                                ) : (
                                    comments.map((comment, index) => (
                                        <div key={comment.id || index} className="comment-item">
                                            <img 
                                                src={comment.avatar || lady1} 
                                                alt={comment.author}
                                                className="comment-avatar"
                                                onError={(e) => { e.target.src = lady1; }}
                                            />
                                            <div className="comment-content">
                                                <div className="comment-header">
                                                    <span className="comment-author">{comment.author}</span>
                                                    <span className="comment-time">{comment.timestamp}</span>
                                                </div>
                                                <p className="comment-text">{comment.text}</p>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Add Comment */}
                                <div className="add-comment">
                                    <img 
                                        src={currentUser?.profile_picture || lady1} 
                                        alt="You"
                                        className="comment-avatar"
                                    />
                                    <div className="comment-input-container">
                                        <input
                                            type="text"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Write a comment..."
                                            className="comment-input"
                                            disabled={isSubmittingComment}
                                        />
                                        <button 
                                            className="comment-submit-btn"
                                            onClick={handleSubmitComment}
                                            disabled={!newComment.trim() || isSubmittingComment}
                                        >
                                            {isSubmittingComment ? '...' : '➤'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-icon">🗑️</div>
                        <h4>Delete Post?</h4>
                        <p>This action cannot be undone. Your post will be permanently removed.</p>
                        <div className="delete-confirm-actions">
                            <button 
                                className="delete-cancel-btn"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="delete-confirm-btn"
                                onClick={handleConfirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostCard;