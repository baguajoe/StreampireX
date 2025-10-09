import React, { useState, useEffect } from 'react';

const InnerCircle = ({ userId, isOwnProfile = false }) => {
    const [innerCircle, setInnerCircle] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userId) {
            loadInnerCircle();
        }
    }, [userId]);

    const loadInnerCircle = async () => {
        setLoading(true);
        setError(null);

        try {
            const endpoint = isOwnProfile
                ? `${process.env.REACT_APP_BACKEND_URL}/api/profile/my-inner-circle`
                : `${process.env.REACT_APP_BACKEND_URL}/api/profile/${userId}/inner-circle`;

            const headers = {};
            if (isOwnProfile && localStorage.getItem('token')) {
                headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
            }

            const response = await fetch(endpoint, { headers });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setInnerCircle(data.inner_circle || []);
        } catch (error) {
            console.error('Error loading inner circle:', error);
            setError(error.message);
            setInnerCircle([]); // Set empty array as fallback
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (query) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(
                `${process.env.REACT_APP_BACKEND_URL}/api/profile/inner-circle/search-users?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();
            setSearchResults(data.users || []);
        } catch (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const addToInnerCircle = async (friendUserId, position = null) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please log in to add friends to your inner circle');
                return;
            }

            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profile/inner-circle/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    friend_user_id: friendUserId,
                    position: position
                })
            });

            const data = await response.json();

            if (response.ok) {
                await loadInnerCircle();
                setSearchQuery('');
                setSearchResults([]);
                alert('Friend added to inner circle!');
            } else {
                alert(data.error || 'Failed to add to inner circle');
            }
        } catch (error) {
            console.error('Error adding to inner circle:', error);
            alert('Error adding friend to inner circle');
        }
    };

    const removeFromInnerCircle = async (friendUserId) => {
        if (!confirm('Remove this person from your inner circle?')) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please log in to modify your inner circle');
                return;
            }

            const response = await fetch(
                `${process.env.REACT_APP_BACKEND_URL}/api/profile/inner-circle/remove/${friendUserId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                await loadInnerCircle();
                alert('Friend removed from inner circle');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to remove from inner circle');
            }
        } catch (error) {
            console.error('Error removing from inner circle:', error);
            alert('Error removing friend from inner circle');
        }
    };

    const reorderInnerCircle = async (newOrder) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please log in to reorder your inner circle');
                return;
            }

            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profile/inner-circle/reorder`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    order: newOrder
                })
            });

            if (response.ok) {
                await loadInnerCircle();
            } else {
                const data = await response.json();
                console.error('Reorder failed:', data.error);
            }
        } catch (error) {
            console.error('Error reordering inner circle:', error);
        }
    };

    const handleDragStart = (e, member) => {
        setDraggedItem(member);
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.7';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedItem(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetMember) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.friend_user_id === targetMember.friend_user_id) return;

        const currentOrder = innerCircle.map(member => member.friend_user_id);
        const draggedIndex = currentOrder.indexOf(draggedItem.friend_user_id);
        const targetIndex = currentOrder.indexOf(targetMember.friend_user_id);

        // Reorder array
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedItem.friend_user_id);

        reorderInnerCircle(newOrder);
    };

    const getDefaultAvatar = () => {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiM0Q0FGNTAI+PC9jaXJjbGU+CjxwYXRoIGQ9Ik0yMCA0NEMyMCAzNi4yNjggMjYuMjY4IDMwIDM0IDMwSDM4QzQ1LjczMiAzMCA1MiAzNi4yNjggNTIgNDRWNjRIMjBWNDRaIiBmaWxsPSJ3aGl0ZSIvPgo8Y2lyY2xlIGN4PSIzNiIgY3k9IjIwIiByPSIxMCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';
    };

    if (loading) {
        return (
            <div className="inner-circle-section">
                <div className="inner-circle-header">
                    <h3>⭐ Loading Inner Circle...</h3>
                </div>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error && !isOwnProfile) {
        return (
            <div className="inner-circle-section">
                <div className="inner-circle-header">
                    <h3>⭐ Inner Circle</h3>
                </div>
                <div className="error-message">
                    <p>Unable to load inner circle. This feature may not be available yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="inner-circle-section">
            <div className="inner-circle-header">
                <h3>
                    ⭐ {isOwnProfile ? 'My Inner Circle' : 'Inner Circle'}
                    <span className="circle-count">({innerCircle.length}/10)</span>
                </h3>
                {isOwnProfile && (
                    <button
                        className="edit-circle-btn"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? '✅ Done' : '✏️ Edit'}
                    </button>
                )}
            </div>

            {error && isOwnProfile && (
                <div className="error-message">
                    <p>⚠️ Inner Circle feature is not yet available. The backend API endpoints need to be implemented.</p>
                    <button onClick={loadInnerCircle} className="retry-btn">
                        Try Again
                    </button>
                </div>
            )}

            {isEditing && isOwnProfile && !error && (
                <div className="circle-search-section">
                    <div className="search-input-container">
                        <input
                            type="text"
                            placeholder="Search users to add to your inner circle..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                searchUsers(e.target.value);
                            }}
                            className="circle-search-input"
                        />
                        {isSearching && <div className="search-spinner">🔍</div>}
                    </div>

                    {searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map(user => (
                                <div key={user.id} className="search-result-item">
                                    <img
                                        src={user.avatar_url || getDefaultAvatar()}
                                        alt={user.username}
                                        className="search-result-avatar"
                                        onError={(e) => {
                                            e.target.src = getDefaultAvatar();
                                        }}
                                    />
                                    <div className="search-result-info">
                                        <strong>{user.username}</strong>
                                        {user.artist_name && <span className="artist-name"> ({user.artist_name})</span>}
                                        {user.bio && <p className="search-result-bio">{user.bio.substring(0, 60)}...</p>}
                                    </div>
                                    <button
                                        className="add-to-circle-btn"
                                        onClick={() => addToInnerCircle(user.id)}
                                        disabled={innerCircle.length >= 10}
                                    >
                                        {innerCircle.length >= 10 ? 'Full' : 'Add'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                        <div className="no-results">
                            <p>No users found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            )}

            <div className="inner-circle-grid">
                {innerCircle.length === 0 ? (
                    <div className="empty-circle">
                        {isOwnProfile ? (
                            <>
                                <p>🌟 Your inner circle is empty!</p>
                                <p>Add your closest friends and favorite users to showcase them on your profile.</p>
                                {!error && (
                                    <button
                                        className="start-editing-btn"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Start Building Your Inner Circle
                                    </button>
                                )}
                            </>
                        ) : (
                            <p>This user hasn't set up their inner circle yet.</p>
                        )}
                    </div>
                ) : (
                    innerCircle.map((member) => (
                        <div
                            key={member.friend_user_id}
                            className={`circle-member ${isEditing ? 'draggable' : ''}`}
                            draggable={isEditing}
                            onDragStart={(e) => handleDragStart(e, member)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, member)}
                        >
                            <div className="member-position">#{member.position}</div>
                            <img
                                src={member.friend?.avatar_url || getDefaultAvatar()}
                                alt={member.friend?.username || 'User'}
                                className="member-avatar"
                                onError={(e) => {
                                    e.target.src = getDefaultAvatar();
                                }}
                            />
                            <div className="member-info">
                                <strong className="member-username">
                                    {member.friend?.username || 'Unknown User'}
                                </strong>
                                {member.friend?.artist_name && (
                                    <div className="member-artist-name">
                                        {member.friend.artist_name}
                                    </div>
                                )}
                                {member.friend?.gamertag && (
                                    <div className="member-gamertag">
                                        🎮 {member.friend.gamertag}
                                    </div>
                                )}
                                {member.custom_title && (
                                    <div className="member-custom-title">
                                        "{member.custom_title}"
                                    </div>
                                )}
                            </div>
                            {isEditing && isOwnProfile && (
                                <button
                                    className="remove-member-btn"
                                    onClick={() => removeFromInnerCircle(member.friend_user_id)}
                                    title="Remove from inner circle"
                                >
                                    ❌
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {isEditing && isOwnProfile && innerCircle.length > 1 && (
                <div className="reorder-hint">
                    💡 Drag and drop to reorder your inner circle
                </div>
            )}

            {!error && innerCircle.length > 0 && (
                <div className="inner-circle-footer">
                    <p className="last-updated">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                </div>
            )}
        </div>
    );
};

export default InnerCircle;