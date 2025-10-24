from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_jwt_extended import create_access_token
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON
from api.extensions import db

import json


# ✅ This is fine here
socketio = SocketIO(cors_allowed_origins="*", allow_credentials=True)



# Role Model
class Role(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # "Admin", "Creator", "Listener", "Radio DJ", "Podcaster"
    __table_args__ = {'extend_existing': True}
    def serialize(self):
        return {
            "id": self.id,
            "name": self.name
        }
    
class Squad(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = "squad"
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    invite_code = db.Column(db.String(20), unique=True)
    platform_tags = db.Column(db.ARRAY(db.String))
    creator_id = db.Column(db.Integer, nullable=True)  # No ForeignKey constraint
    
    # Additional gaming-specific fields
    game = db.Column(db.String(100), nullable=True)
    max_members = db.Column(db.Integer, default=5)
    is_public = db.Column(db.Boolean, default=True)
    skill_requirement = db.Column(db.String(50), nullable=True)
    region = db.Column(db.String(100), nullable=True)
    communication_platform = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ✅ FIXED: Relationships with proper overlaps parameters
    members = db.relationship("User", back_populates="squad", foreign_keys="User.squad_id")
    
    # ✅ FIXED: Add overlaps parameter to silence warnings
    streams = db.relationship("Stream", 
                             back_populates="squad", 
                             foreign_keys="Stream.squad_id",
                             overlaps="squad_streams")
    
    

    def get_creator(self):
        """Get creator user object"""
        if self.creator_id:
            return User.query.get(self.creator_id)
        return None

    def serialize(self):
        creator = self.get_creator()
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "invite_code": self.invite_code,
            "platform_tags": self.platform_tags or [],
            "creator_id": self.creator_id,
            "creator_name": creator.username if creator else None,
            "creator_gamertag": getattr(creator, 'gamertag', None) if creator else None,
            "game": self.game,
            "max_members": self.max_members,
            "current_members": len(self.members) if self.members else 0,
            "is_public": self.is_public,
            "skill_requirement": self.skill_requirement,
            "region": self.region,
            "communication_platform": self.communication_platform,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "members": [{"id": m.id, "username": m.username, "gamertag": getattr(m, 'gamertag', None), "skill_level": getattr(m, 'skill_level', 'Unknown')} for m in (self.members or [])]
        }


class User(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    artist_name = db.Column(db.String(80), unique=True, nullable=True)
    bio = db.Column(db.String(500), nullable=True)
    industry = db.Column(db.String(80), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_premium = db.Column(db.Boolean, default=False, server_default="False")
    avatar_url = db.Column(db.String(500))
    
    # ✅ Basic Gamer Features (existing)
    is_gamer = db.Column(db.Boolean, default=False)
    gamer_tags = db.Column(db.JSON, default={})  # e.g., {"psn": "ShadowWolf", "xbox": "NoScopeKing"}
    favorite_games = db.Column(db.ARRAY(db.String), default=[])
    gamer_rank = db.Column(db.String(50), default="Casual")
    squad_id = db.Column(db.Integer, db.ForeignKey("squad.id"))
    
    # 🆕 NEW GAMER PROFILE FIELDS
    # Essential Information
    gamertag = db.Column(db.String(100), nullable=True)  # Main gaming identity
    gaming_platforms = db.Column(db.JSON, default={})  # {"pc": True, "playstation": False, ...}
    current_games = db.Column(db.ARRAY(db.String), default=[])  # Currently playing
    gaming_schedule = db.Column(db.Text, nullable=True)  # When they're online
    skill_level = db.Column(db.String(50), default="intermediate")  # beginner, intermediate, advanced, competitive, pro
    
    # Social & Team Elements
    looking_for = db.Column(db.ARRAY(db.String), default=[])  # ["Casual Friends", "Competitive Teammates", ...]
    communication_prefs = db.Column(db.ARRAY(db.String), default=[])  # ["Voice Chat", "Discord", ...]
    age_range = db.Column(db.String(20), nullable=True)  # "18-24", "25-34", etc.
    timezone = db.Column(db.String(50), nullable=True)  # "EST", "PST", "GMT", etc.
    region = db.Column(db.String(100), nullable=True)  # "North America", "EU West", etc.
    
    # Gaming Preferences
    favorite_genres = db.Column(db.ARRAY(db.String), default=[])  # ["FPS", "RPG", "Strategy", ...]
    playstyle = db.Column(db.String(50), nullable=True)  # "aggressive", "strategic", "supportive", etc.
    game_modes = db.Column(db.ARRAY(db.String), default=[])  # ["Solo", "Co-op", "PvP", ...]
    
    # Setup & Equipment
    gaming_setup = db.Column(db.JSON, default={})  # {"headset": "SteelSeries", "controller": "Xbox", ...}
    
    # Streaming & Content
    is_streamer = db.Column(db.Boolean, default=False)
    streaming_platforms = db.Column(db.ARRAY(db.String), default=[])  # ["Twitch", "YouTube", ...]
    streaming_schedule = db.Column(db.Text, nullable=True)
    
    # Languages & Communication
    languages_spoken = db.Column(db.ARRAY(db.String), default=[])  # ["English", "Spanish", ...]
    
    # Gaming Stats & Achievements
    gaming_stats = db.Column(db.JSON, default={})  # {"hours_played": 1500, "games_owned": 45, ...}
    
    # Gamer Bio (separate from regular bio)
    gamer_bio = db.Column(db.Text, nullable=True)
    
    # Availability & Status
    online_status = db.Column(db.String(20), default="offline")  # "online", "away", "busy", "offline"
    last_seen = db.Column(db.DateTime, nullable=True)
    current_game_activity = db.Column(db.String(200), nullable=True)  # "Playing Valorant - Ranked"
    
    # ✅ Trials (existing)
    is_on_trial = db.Column(db.Boolean, default=False)
    trial_start_date = db.Column(db.DateTime, nullable=True)
    trial_end_date = db.Column(db.DateTime, nullable=True)
    
    # 💳 Access & Purchases (existing)
    vr_tickets = db.relationship('VRAccessTicket', backref='user', lazy=True)
    ticket_purchases = db.relationship('TicketPurchase', backref='user', lazy=True)
    
    # 🧑‍💼 Business Info (existing)
    business_name = db.Column(db.String(255), nullable=True)
    display_name = db.Column(db.String(255), nullable=True)
    
    # 📸 Media (existing)
    profile_picture = db.Column(db.String(500), nullable=True)
    cover_photo = db.Column(db.String(500), nullable=True)
    radio_station = db.Column(db.String(500), nullable=True)
    podcast = db.Column(db.String(500), nullable=True)
    social_links = db.Column(db.JSON, nullable=True)
    gallery = db.Column(db.JSON, default=[])
    videos = db.Column(db.JSON, default=[])
    
    # 🛂 Role (existing)
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'))
    role = db.relationship("Role", backref="users")
    
    # 📻 Followers (existing)
    radio_follows = db.relationship('RadioFollower', back_populates='user', lazy='dynamic')

    # 🎵 Artist Features
    is_artist = db.Column(db.Boolean, default=False)
    artist_bio = db.Column(db.Text, nullable=True)
    artist_genre = db.Column(db.String(50), nullable=True)
    artist_location = db.Column(db.String(100), nullable=True)
    artist_website = db.Column(db.String(200), nullable=True)
    artist_social_links = db.Column(db.JSON, default={})
    is_verified_artist = db.Column(db.Boolean, default=False)
    monthly_listeners = db.Column(db.Integer, default=0)
    total_plays = db.Column(db.Integer, default=0)
    
    # 🔄 Gaming Relationships - ✅ FIXED WITH OVERLAPS PARAMETERS
    squad = db.relationship("Squad", back_populates="members", foreign_keys=[squad_id])
    
    # ✅ FIXED: Main streams relationship (for GameStream)
    streams = db.relationship("GameStream", 
                             back_populates="user", 
                             foreign_keys="GameStream.creator_id", 
                             lazy=True)
    
    # ✅ FIXED: Add overlaps parameter for any additional stream relationships
    # If you have a regular Stream model as well, add this:
    live_streams = db.relationship("Stream", 
                                  foreign_keys="Stream.creator_id",
                                  overlaps="streams")
    
    # ✅ FIXED: Game streams with overlaps parameter to avoid conflicts
    game_streams = db.relationship("GameStream", 
                                  foreign_keys="GameStream.creator_id",
                                  overlaps="streams,live_streams")
    
    # ✅ Friend request relationships (these are fine)
    sent_friend_requests = db.relationship("FriendRequest", 
                                          foreign_keys="FriendRequest.sender_id", 
                                          back_populates="sender")
    received_friend_requests = db.relationship("FriendRequest", 
                                              foreign_keys="FriendRequest.receiver_id", 
                                              back_populates="receiver")
    
    def serialize(self):
        return {
            "id": self.id,
            "username": self.username,
            "artist_name": self.artist_name,
            "bio": self.bio,
            "email": self.email,
            "business_name": self.business_name,
            "display_name": self.display_name,
            "profile_picture": self.profile_picture,
            "cover_photo": self.cover_photo,
            "radio_station": self.radio_station,
            "podcast": self.podcast,
            "social_links": self.social_links or {},
            "gallery": self.gallery or [],
            "videos": self.videos or [],
            "is_on_trial": self.is_on_trial,
            "trial_start_date": self.trial_start_date.strftime("%Y-%m-%d") if self.trial_start_date else None,
            "trial_end_date": self.trial_end_date.strftime("%Y-%m-%d") if self.trial_end_date else None,
            "role": self.role.name if self.role else None,
            "avatar_url": self.avatar_url,
            
            # 🎮 GAMER FIELDS
            "is_gamer": self.is_gamer,
            "gamer_tags": self.gamer_tags or {},
            "favorite_games": self.favorite_games or [],
            "gamer_rank": self.gamer_rank or "Casual",
            "squad_id": self.squad_id,
            "gamertag": self.gamertag,
            "gaming_platforms": self.gaming_platforms or {},
            "current_games": self.current_games or [],
            "gaming_schedule": self.gaming_schedule,
            "skill_level": self.skill_level,
            "looking_for": self.looking_for or [],
            "communication_prefs": self.communication_prefs or [],
            "age_range": self.age_range,
            "timezone": self.timezone,
            "region": self.region,
            "favorite_genres": self.favorite_genres or [],
            "playstyle": self.playstyle,
            "game_modes": self.game_modes or [],
            "gaming_setup": self.gaming_setup or {},
            "is_streamer": self.is_streamer,
            "streaming_platforms": self.streaming_platforms or [],
            "streaming_schedule": self.streaming_schedule,
            "languages_spoken": self.languages_spoken or [],
            "gaming_stats": self.gaming_stats or {},
            "gamer_bio": self.gamer_bio,
            "online_status": self.online_status,
            "last_seen": self.last_seen.strftime("%Y-%m-%d %H:%M:%S") if self.last_seen else None,
            "current_game_activity": self.current_game_activity,
            
            # 🎵 ARTIST FIELDS
            "is_artist": self.is_artist,
            "artist_bio": self.artist_bio,
            "artist_genre": self.artist_genre,
            "artist_location": self.artist_location,
            "artist_website": self.artist_website,
            "artist_social_links": self.artist_social_links or {},
            "is_verified_artist": self.is_verified_artist,
            "monthly_listeners": self.monthly_listeners,
            "total_plays": self.total_plays
        }
    
class UserSettings(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True)
    enableChat = db.Column(db.Boolean, default=True)
    useAvatar = db.Column(db.Boolean, default=False)
    enableNotifications = db.Column(db.Boolean, default=True)
    emailNotifications = db.Column(db.Boolean, default=True)
    darkMode = db.Column(db.Boolean, default=False)
    profileVisibility = db.Column(db.String(50), default="public")
    twoFactorEnabled = db.Column(db.Boolean, default=False)
    payoutMethod = db.Column(db.String(50), default="")
    defaultStreamQuality = db.Column(db.String(20), default="high")
    defaultVRRoom = db.Column(db.String(50), default="Main Hall")

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

    
class Like(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    content_id = db.Column(db.Integer, nullable=False)  # Can be a podcast, radio station, or live stream
    content_type = db.Column(db.String(50), nullable=False)  # "podcast", "radio", "livestream"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("likes", lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "created_at": self.created_at.isoformat(),
        }
    
class Favorite(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    video_id = db.Column(db.Integer, db.ForeignKey("video.id"), nullable=True)
    content_id = db.Column(db.Integer, nullable=True)
    content_type = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("favorites", lazy=True))
    video = db.relationship("Video", back_populates="video_favorites")  # ✅ use back_populates

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "video_id": self.video_id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "created_at": self.created_at.isoformat(),
        }



class FavoritePage(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    page_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # user whose page is being favorited
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('favorite_pages', lazy='dynamic'))
    page_user = db.relationship('User', foreign_keys=[page_user_id])

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "page_user_id": self.page_user_id,
            "created_at": self.created_at.isoformat(),
        }


class Analytics(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content_type = db.Column(db.String(50), nullable=False)  # 'podcast', 'music', 'video', etc.
    content_id = db.Column(db.Integer, nullable=False)  # ID of the item (track, podcast, etc.)
    play_count = db.Column(db.Integer, default=0)
    purchase_count = db.Column(db.Integer, default=0)
    revenue_generated = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content_type": self.content_type,
            "content_id": self.content_id,
            "play_count": self.play_count,
            "purchase_count": self.purchase_count,
            "revenue_generated": self.revenue_generated,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }

class ShareAnalytics(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content_id = db.Column(db.Integer, nullable=False)
    content_type = db.Column(db.String(50), nullable=False)  # 'podcast', 'radio', 'livestream'
    platform = db.Column(db.String(50), nullable=False)  # 'facebook', 'twitter', etc.
    shared_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "platform": self.platform,
            "shared_at": self.shared_at.isoformat(),
        }

    @staticmethod
    def get_shared_data(user_id):
        """ Fetch all shared analytics for a given user """
        return ShareAnalytics.query.filter_by(user_id=user_id).all()


playlist_audio_association = db.Table(
    'playlist_audio_association',
    db.Column('playlist_id', db.Integer, db.ForeignKey('playlist_audio.id'), primary_key=True),
    db.Column('audio_id', db.Integer, db.ForeignKey('audio.id'), primary_key=True),
    extend_existing=True
)


# Add this to your models.py file

class Audio(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'audio'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    file_url = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_file_url = db.Column(db.String(500))  # URL to processed audio file
    processing_status = db.Column(db.String(50), default='original')  # 'original', 'processing', 'processed'
    last_processed_at = db.Column(db.DateTime)
    
    # Optional additional fields
    duration = db.Column(db.String(10))  # e.g., "3:45"
    plays = db.Column(db.Integer, default=0)
    likes = db.Column(db.Integer, default=0)
    album = db.Column(db.String(255))
    genre = db.Column(db.String(100))
    artwork_url = db.Column(db.String(500))
    is_public = db.Column(db.Boolean, default=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('audio_tracks', lazy=True))
    
    def serialize(self):
        """Serialize the Audio model to a dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "file_url": self.file_url,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "duration": self.duration or "0:00",
            "plays": self.plays or 0,
            "likes": self.likes or 0,
            "album": self.album or "Single",
            "genre": self.genre or "Unknown",
            "artwork": self.artwork_url or "/default-track-artwork.jpg",
            "is_public": self.is_public,
            "artist_name": self.user.username if self.user else "Unknown Artist"
        }
    
    def __repr__(self):
        return f'<Audio {self.id}: {self.title}>'




class PlaylistAudio(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Many-to-Many relationship with Audio
    audios = db.relationship(
        'Audio', secondary=playlist_audio_association, backref="playlists"
    )

    user = db.relationship('User', backref=db.backref('playlist_audios', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "audios": [audio.id for audio in self.audios],  # List of associated audio files
        }




class StreamingHistory(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'streaming_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    content_id = db.Column(db.Integer, nullable=False)  # Audio, podcast, or stream
    content_type = db.Column(db.String(50), nullable=False)  # 'audio', 'podcast', 'stream'
    
    listened_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('history', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "listened_at": self.listened_at.isoformat(),
        }


# Enhanced Video Model Updates for better browsing experience

class Video(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'video'

    # Primary key
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('video_channels.id'), nullable=True)  # ✅ ADD THIS
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=True)
    
    # Basic video information
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_url = db.Column(db.String(500), nullable=False)
    thumbnail_url = db.Column(db.String(500), nullable=True)
    duration = db.Column(db.Integer, nullable=True)
    
    # Video dimensions and technical specs
    width = db.Column(db.Integer, default=1920) 
    height = db.Column(db.Integer, default=1080)
    frame_rate = db.Column(db.Integer, default=30)
    resolution = db.Column(db.String(20), nullable=True)
    file_size = db.Column(db.BigInteger, nullable=True)
    codec = db.Column(db.String(50), nullable=True)
    
    # Timeline/editing data
    timeline_data = db.Column(db.JSON, default={'tracks': []})
    
    # Timestamps
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Engagement metrics
    likes = db.Column(db.Integer, default=0)
    views = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    shares_count = db.Column(db.Integer, default=0)
    average_watch_time = db.Column(db.Integer, default=0)
    completion_rate = db.Column(db.Float, default=0.0)
    
    # Content organization
    tags = db.Column(db.JSON, default=[])
    category = db.Column(db.String(100), nullable=True)  # ✅ ADD THIS for category name
    
    # Access control and visibility
    is_public = db.Column(db.Boolean, default=True)
    is_premium = db.Column(db.Boolean, default=False)
    price = db.Column(db.Float, nullable=True)
    
    # ✅ Content moderation and compliance (ADD ALL THESE)
    age_restricted = db.Column(db.Boolean, default=False)
    made_for_kids = db.Column(db.Boolean, default=False)
    contains_paid_promotion = db.Column(db.Boolean, default=False)
    original_content = db.Column(db.Boolean, default=True)
    
    # ✅ Interaction settings (ADD THESE)
    allow_comments = db.Column(db.Boolean, default=True)
    allow_likes = db.Column(db.Boolean, default=True)
    allow_embedding = db.Column(db.Boolean, default=True)
    allow_downloads = db.Column(db.Boolean, default=False)
    
    # SEO and metadata
    video_slug = db.Column(db.String(255), unique=True)
    keywords = db.Column(db.Text, nullable=True)
    
    # Status fields
    status = db.Column(db.String(50), default="active")
    processing_status = db.Column(db.String(50), default="completed")
    
    # ✅ Relationships
    category_rel = db.relationship('Category', backref='videos', foreign_keys=[category_id])
    user = db.relationship('User', backref=db.backref('user_videos', lazy=True))
    channel = db.relationship('VideoChannel', backref='channel_videos')  # ✅ ADD THIS
    
    video_favorites = db.relationship(
        "Favorite", 
        back_populates="video",
        overlaps="favorites"
    )
    
    video_likes = db.relationship(
        "VideoLike", 
        back_populates="video", 
        lazy=True
    )
    
    video_comments = db.relationship(
        "Comment",
        foreign_keys="Comment.video_id",
        back_populates="video",
        lazy=True,
        cascade="all, delete-orphan",
        overlaps="comments"
    )
    
    video_views = db.relationship(
        "VideoView", 
        back_populates="video", 
        lazy=True
    )

    def serialize(self):
        """Serialize video data for JSON responses"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "channel_id": self.channel_id,  # ✅ ADD THIS
            "title": self.title,
            "description": self.description,
            "file_url": self.file_url,
            "thumbnail_url": self.thumbnail_url,
            "duration": self.duration,
            "width": self.width,
            "height": self.height,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "likes": self.likes,
            "views": self.views,
            "comments_count": self.comments_count,
            "shares_count": self.shares_count,
            "category": self.category,  # ✅ Category name
            "category_id": self.category_id,
            "tags": self.tags or [],
            "is_public": self.is_public,
            "is_premium": self.is_premium,
            "price": self.price,
            
            # ✅ ADD THESE
            "age_restricted": self.age_restricted,
            "made_for_kids": self.made_for_kids,
            "contains_paid_promotion": self.contains_paid_promotion,
            "original_content": self.original_content,
            "allow_comments": self.allow_comments,
            "allow_likes": self.allow_likes,
            
            "video_slug": self.video_slug,
            "keywords": self.keywords,
            "resolution": self.resolution,
            "file_size": self.file_size,
            "codec": self.codec,
            "status": self.status,
            "processing_status": self.processing_status,
            "uploader_name": self.user.display_name or self.user.username if self.user else "Unknown",
            "uploader_avatar": self.user.profile_picture or self.user.avatar_url if self.user else None,
            "uploader_id": self.user_id,
            "average_watch_time": self.average_watch_time,
            "completion_rate": self.completion_rate,
            
            # ✅ ADD CHANNEL INFO
            "channel": self.channel.serialize() if self.channel else None,
            "channel_name": self.channel.channel_name if self.channel else None,
            "channel_verified": self.channel.is_verified if self.channel else False,
            "channel_subscriber_count": self.channel.subscriber_count if self.channel else 0
        }

    def __repr__(self):
        return f'<Video {self.id}: {self.title}>'

    @property
    def is_processing(self):
        """Check if video is still being processed"""
        return self.processing_status in ['pending', 'processing']

    @property
    def is_ready(self):
        """Check if video is ready for viewing"""
        return self.processing_status == 'completed' and self.status == 'active'

    def increment_views(self):
        """Increment view count"""
        self.views += 1
        db.session.commit()

    def increment_likes(self):
        """Increment like count"""
        self.likes += 1
        db.session.commit()

    def decrement_likes(self):
        """Decrement like count"""
        if self.likes > 0:
            self.likes -= 1
            db.session.commit()

    def update_comments_count(self):
        """Update comments count based on actual comments"""
        self.comments_count = len(self.video_comments)
        db.session.commit()

    def get_formatted_duration(self):
        """Get duration in MM:SS format"""
        if not self.duration:
            return "0:00"
        
        minutes = self.duration // 60
        seconds = self.duration % 60
        return f"{minutes}:{seconds:02d}"

    def get_file_size_mb(self):
        """Get file size in MB"""
        if not self.file_size:
            return 0
        return round(self.file_size / (1024 * 1024), 2)


# 2. Create a VideoLike model for better like tracking
class VideoLike(db.Model):
    __tablename__ = 'video_likes'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'video_id', name='unique_user_video_like'),
        {'extend_existing': True}
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    video_id = db.Column(db.Integer, db.ForeignKey('video.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='video_likes')
    video = db.relationship('Video', back_populates='video_likes')
    
    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "video_id": self.video_id,
            "created_at": self.created_at.isoformat()
        }
# 3. Create a VideoView model for analytics
class VideoView(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'video_views'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Anonymous views allowed
    video_id = db.Column(db.Integer, db.ForeignKey('video.id'), nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)  # For anonymous tracking
    watch_time = db.Column(db.Integer, default=0)  # Seconds watched
    completed = db.Column(db.Boolean, default=False)  # Did they watch to the end?
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='video_views')
    video = db.relationship('Video', back_populates='video_views')
    
    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "video_id": self.video_id,
            "watch_time": self.watch_time,
            "completed": self.completed,
            "viewed_at": self.viewed_at.isoformat()
        }

# 4. Update Category model with better fields
class Category(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)  # URL-friendly
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), nullable=True)  # Emoji or icon class
    __table_args__ = {'extend_existing': True}
    color = db.Column(db.String(7), nullable=True)  # Hex color for UI
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)  # For custom ordering
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
            "is_active": self.is_active,
            "podcast_count": len(self.podcasts) if hasattr(self, 'podcasts') else 0
        }

# 5. Create VideoTag model for better tagging
class VideoTag(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'video_tags'
    
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('video.id'), nullable=False)
    tag_name = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    video = db.relationship('Video', backref='tag_associations')
    
    def serialize(self):
        return {
            "id": self.id,
            "video_id": self.video_id,
            "tag_name": self.tag_name
        }

# 6. Update Comment model to properly link to videos
# (Update your existing Comment model with this relationship)
# Add this to your existing Comment model:
# video = db.relationship('Video', foreign_keys='Comment.video_id', back_populates='video_comments')

# 7. Seed default categories
def seed_video_categories():
    """Run this to populate default video categories"""
    default_categories = [
        {"name": "Music", "slug": "music", "icon": "🎵", "color": "#FF6B6B"},
        {"name": "Podcasts", "slug": "podcasts", "icon": "🎙️", "color": "#4ECDC4"},
        {"name": "Meditation", "slug": "meditation", "icon": "🧘", "color": "#45B7D1"},
        {"name": "Fitness", "slug": "fitness", "icon": "💪", "color": "#96CEB4"},
        {"name": "Education", "slug": "education", "icon": "📚", "color": "#FFEAA7"},
        {"name": "Entertainment", "slug": "entertainment", "icon": "🎭", "color": "#DDA0DD"},
        {"name": "Gaming", "slug": "gaming", "icon": "🎮", "color": "#98D8C8"},
        {"name": "Tech", "slug": "tech", "icon": "💻", "color": "#74B9FF"},
        {"name": "Art", "slug": "art", "icon": "🎨", "color": "#FD79A8"},
        {"name": "Other", "slug": "other", "icon": "📁", "color": "#636E72"}
    ]
    
    for cat_data in default_categories:
        existing = Category.query.filter_by(slug=cat_data["slug"]).first()
        if not existing:
            category = Category(**cat_data)
            db.session.add(category)
    
    db.session.commit()
    print("✅ Video categories seeded successfully!")
  

class VideoPlaylist(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('video_playlists', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
        }


class VideoPlaylistVideo(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    playlist_id = db.Column(db.Integer, db.ForeignKey('video_playlist.id'), nullable=False)
    video_id = db.Column(db.Integer, db.ForeignKey('video.id'), nullable=False)

    playlist = db.relationship('VideoPlaylist', backref=db.backref('playlist_videos', lazy=True))
    video = db.relationship('Video', backref=db.backref('playlist_videos', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "playlist_id": self.playlist_id,
            "video_id": self.video_id,
        }

# ✅ Junction Table for Private Access Control
radio_access = db.Table(
    'radio_access',
    db.Column('station_id', db.Integer, db.ForeignKey('radio_station.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    extend_existing=True
)




class RadioFollower(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'radio_followers'

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), primary_key=True)
    followed_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='radio_follows')
    station = db.relationship('RadioStation', back_populates='radio_follower_entries')

    def serialize(self):
        return {
            "user_id": self.user_id,
            "station_id": self.station_id,
            "followed_at": self.followed_at.isoformat()
        }



class RadioStation(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'radio_station'
    
    # Core Fields
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Access Control
    status = db.Column(db.String(50), default='active')  # active, inactive, suspended
    is_public = db.Column(db.Boolean, default=True)
    is_subscription_based = db.Column(db.Boolean, default=False)
    subscription_price = db.Column(db.Float, nullable=True)
    is_ticketed = db.Column(db.Boolean, default=False)
    ticket_price = db.Column(db.Float, nullable=True)
    
    # Live Broadcasting
    is_live = db.Column(db.Boolean, default=False)
    stream_url = db.Column(db.String(500), nullable=True)
    is_webrtc_enabled = db.Column(db.Boolean, default=False)
    max_listeners = db.Column(db.Integer, default=100)
    
    # Media Assets
    logo_url = db.Column(db.String(500), nullable=True)
    cover_image_url = db.Column(db.String(500), nullable=True)
    
    # Analytics & Timestamps
    followers_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Creator Information
    creator_name = db.Column(db.String(255), nullable=True)
    
    # ✅ MODERN APPROACH: Use db.JSON for complex data

    # genres = db.Column(db.JSON, nullable=True)  # List of genres
    # preferred_genres = db.Column(db.JSON, nullable=True)  # Preferred genres (tags)
    # tags = db.Column(db.JSON, nullable=True)  # User-defined tags

    genres = db.Column(db.ARRAY(db.String), nullable=True, default=[])
    preferred_genres = db.Column(db.ARRAY(db.String), nullable=True, default=[])
    tags = db.Column(db.ARRAY(db.String), nullable=True, default=[])

    social_links = db.Column(db.JSON, nullable=True)  # Social media links
    playlist_schedule = db.Column(db.JSON, nullable=True)  # Stores track schedule
    
    # Audio Management
    submission_guidelines = db.Column(db.Text, nullable=True)
    audio_file_name = db.Column(db.String(500), nullable=True)  # Original filename
    loop_audio_url = db.Column(db.String(500), nullable=True)   # URL for looping audio
    is_loop_enabled = db.Column(db.Boolean, default=False)
    loop_duration_minutes = db.Column(db.Integer, nullable=True)  # Duration in minutes
    loop_started_at = db.Column(db.DateTime, nullable=True)  # When loop started
    
    # Monetization & Analytics
    total_plays = db.Column(db.Integer, default=0)
    total_revenue = db.Column(db.Float, default=0.0)
    
    # Additional Features
    target_audience = db.Column(db.String(255), nullable=True)
    broadcast_hours = db.Column(db.String(100), nullable=True)  # "24/7", "mornings", etc.
    is_explicit = db.Column(db.Boolean, default=False)
    welcome_message = db.Column(db.Text, nullable=True)
    
    # Relationships
    allowed_users = db.relationship('User', secondary='radio_access', backref='private_stations')
    user = db.relationship('User', backref=db.backref('radio_stations', lazy=True))
    radio_follower_entries = db.relationship('RadioFollower', back_populates='station')
    
    def serialize(self):
        """Convert model to JSON-compatible dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "is_public": self.is_public,
            "is_subscription_based": self.is_subscription_based,
            "subscription_price": self.subscription_price,
            "is_ticketed": self.is_ticketed,
            "ticket_price": self.ticket_price,
            "is_live": self.is_live,
            "stream_url": self.stream_url,
            "is_webrtc_enabled": self.is_webrtc_enabled,
            "max_listeners": self.max_listeners,
            "logo_url": self.logo_url,
            "cover_image_url": self.cover_image_url,
            "followers_count": self.followers_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "creator_name": self.creator_name,
            # ✅ JSON fields return as Python objects automatically
            "genres": self.genres or [],
            "preferred_genres": self.preferred_genres or [],
            "submission_guidelines": self.submission_guidelines,
            "audio_file_name": self.audio_file_name,
            "loop_audio_url": self.loop_audio_url,
            "is_loop_enabled": self.is_loop_enabled,
            "loop_duration_minutes": self.loop_duration_minutes,
            "loop_started_at": self.loop_started_at.isoformat() if self.loop_started_at else None,
            "playlist_schedule": self.playlist_schedule,
            "total_plays": self.total_plays,
            "total_revenue": self.total_revenue,
            "target_audience": self.target_audience,
            "broadcast_hours": self.broadcast_hours,
            "is_explicit": self.is_explicit,
            "tags": self.tags or [],
            "welcome_message": self.welcome_message,
            "social_links": self.social_links or {}
        }
    
    def get_current_track(self):
        """Get currently playing track based on loop timing"""
        if not self.is_loop_enabled or not self.playlist_schedule or not self.loop_started_at:
            return None
            
        try:
            # Calculate time elapsed since loop started
            elapsed_seconds = (datetime.utcnow() - self.loop_started_at).total_seconds()
            
            # Get tracks from playlist schedule
            tracks = self.playlist_schedule.get("tracks", [])
            if not tracks:
                return None
            
            # Calculate which track should be playing
            total_duration = 0
            for track in tracks:
                # Parse duration (format: "mm:ss")
                duration_parts = track.get("duration", "3:30").split(":")
                if len(duration_parts) == 2:
                    minutes, seconds = map(int, duration_parts)
                    track_duration = minutes * 60 + seconds
                else:
                    track_duration = 210  # Default 3:30
                
                if elapsed_seconds <= total_duration + track_duration:
                    # This is the current track
                    position_in_track = elapsed_seconds - total_duration
                    return {
                        **track,
                        "position": int(position_in_track),
                        "remaining": track_duration - int(position_in_track)
                    }
                
                total_duration += track_duration
            
            # If we've gone past all tracks, loop back to beginning
            if self.playlist_schedule.get("loop_mode", True):
                total_loop_duration = total_duration
                if total_loop_duration > 0:
                    loop_position = elapsed_seconds % total_loop_duration
                    return self._get_track_at_position(loop_position)
            
        except Exception as e:
            print(f"Error calculating current track: {e}")
        
        return tracks[0] if tracks else None
    
    def _get_track_at_position(self, position_seconds):
        """Helper method to get track at specific position in loop"""
        tracks = self.playlist_schedule.get("tracks", [])
        current_position = 0
        
        for track in tracks:
            duration_parts = track.get("duration", "3:30").split(":")
            if len(duration_parts) == 2:
                minutes, seconds = map(int, duration_parts)
                track_duration = minutes * 60 + seconds
            else:
                track_duration = 210
            
            if position_seconds <= current_position + track_duration:
                position_in_track = position_seconds - current_position
                return {
                    **track,
                    "position": int(position_in_track),
                    "remaining": track_duration - int(position_in_track)
                }
            
            current_position += track_duration
        
        return tracks[0] if tracks else None
    
    def __repr__(self):
        return f'<RadioStation {self.name}>'



class RadioPlaylist(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=False)
    audio_id = db.Column(db.Integer, db.ForeignKey('audio.id'), nullable=False)

    station = db.relationship('RadioStation', backref=db.backref('radio_playlists', lazy=True))
    audio = db.relationship('Audio', backref=db.backref('radio_playlists', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "station_id": self.station_id,
            "audio_id": self.audio_id,
        }

class RadioSubscription(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=False)
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)  # Stripe subscription tracking
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)  # Expiration date

    user = db.relationship('User', backref=db.backref('radio_subscriptions', lazy=True))
    station = db.relationship('RadioStation', backref=db.backref('subscriptions', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "station_id": self.station_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat() if self.end_date else None
        }

class RadioDonation(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('radio_donations', lazy=True))
    station = db.relationship('RadioStation', backref=db.backref('donations', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "station_id": self.station_id,
            "amount": self.amount,
            "message": self.message,
            "created_at": self.created_at.isoformat()
        }
    
class RadioSubmission(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, nullable=False)
    track_id = db.Column(db.Integer, nullable=False)
    station_name = db.Column(db.String(255), nullable=False)
    submission_status = db.Column(db.String(50), default="Pending")

class LiveStream(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=True)  # Optional for radio stations
    stream_key = db.Column(db.String(255), unique=True, nullable=False)  # Unique key per session
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    thumbnail_url = db.Column(db.String(500), nullable=True)  # Optional thumbnail
    is_live = db.Column(db.Boolean, default=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('radio_live_sessions', lazy=True))  # ✅ RENAMED backref
    station = db.relationship('RadioStation', backref=db.backref('live_streams', lazy=True), uselist=False)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "station_id": self.station_id,
            "stream_key": self.stream_key,
            "title": self.title,
            "description": self.description,
            "thumbnail_url": self.thumbnail_url,
            "is_live": self.is_live,
            "started_at": self.started_at.isoformat(),
        }



class LiveStudio(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    stream_key = db.Column(db.String(255), unique=True, nullable=False)  # Unique identifier for the stream
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    thumbnail_url = db.Column(db.String(500), nullable=True)  # Optional thumbnail
    is_live = db.Column(db.Boolean, default=False)  # Indicates whether the stream is active
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime, nullable=True)

    # ✅ VR Support & Virtual Concerts
    is_vr_enabled = db.Column(db.Boolean, default=False)  # Enable VR mode for the event
    vr_environment = db.Column(db.String(255), nullable=True)  # Name of the VR environment (e.g., "Cyber Stage", "Neon Club")

    # ✅ Ticketed Events
    is_ticketed = db.Column(db.Boolean, default=False)  # Whether tickets are required
    ticket_price = db.Column(db.Float, nullable=True)  # Ticket price if applicable
    ticket_sales = db.Column(db.Integer, default=0)  # Track number of tickets sold
    payment_provider = db.Column(db.String(50), nullable=True)  # e.g., "Stripe", "PayPal"

    # ✅ Monetization
    donation_link = db.Column(db.String(500), nullable=True)  # Link for audience donations
    ad_revenue = db.Column(db.Float, default=0.0)  # Revenue from ads
    total_earnings = db.Column(db.Float, default=0.0)  # Total revenue from the stream

    # ✅ Live Chat & Fan Interaction
    has_live_chat = db.Column(db.Boolean, default=True)  # Enable chat functionality
    chat_messages = db.relationship("LiveChat", backref="studio_chats", lazy=True)

    # ✅ Merch Sales (Coming Soon)
    merch_sales = db.Column(db.Float, default=0.0)  # Revenue from merch sales

    user = db.relationship("User")
    def serialize(self):
        """Convert model instance to JSON format."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "stream_key": self.stream_key,
            "title": self.title,
            "description": self.description,
            "thumbnail_url": self.thumbnail_url,
            "is_live": self.is_live,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "is_vr_enabled": self.is_vr_enabled,
            "vr_environment": self.vr_environment,
            "is_ticketed": self.is_ticketed,
            "ticket_price": self.ticket_price,
            "ticket_sales": self.ticket_sales,
            "payment_provider": self.payment_provider,
            "donation_link": self.donation_link,
            "ad_revenue": self.ad_revenue,
            "total_earnings": self.total_earnings,
            "has_live_chat": self.has_live_chat,
            "merch_sales": self.merch_sales
        }


class LiveChat(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    live_studio_id = db.Column(db.Integer, db.ForeignKey('live_studio.id'), nullable=True)  # Foreign Key added
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

      # ✅ Ensure it matches the new backref 'studio_chat'
    user = db.relationship("User", backref="chat_messages")


class PodcastEpisode(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Storage & Metadata
    file_url = db.Column(db.String(500), nullable=False)  # Audio File URL
    cover_art_url = db.Column(db.String(500), nullable=True)
    duration = db.Column(db.Integer, nullable=True)

    # Monetization & Subscription
    is_premium = db.Column(db.Boolean, default=False)  # Paid content
    is_published = db.Column(db.Boolean, default=False)  # Mark as live
    release_date = db.Column(db.DateTime, nullable=True)  # Scheduled release

    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Revenue Tracking for episodes
    total_revenue = db.Column(db.Float, default=0.00)
    revenue_from_ads = db.Column(db.Float, default=0.00)
    revenue_from_subscriptions = db.Column(db.Float, default=0.00)

    # Earnings Split Fields
    platform_cut = db.Column(db.Float, default=0.15)  # 15% platform cut by default
    creator_earnings = db.Column(db.Float, default=0.85)  # 85% for the creator by default

    user = db.relationship('User', backref=db.backref('podcast_episodes', lazy=True))

    # Method to calculate revenue for episodes
    def calculate_episode_revenue(self):
        """Calculates the total revenue for the episode from ads and subscriptions."""
        self.total_revenue = (
            self.revenue_from_ads +
            self.revenue_from_subscriptions
        )
        db.session.commit()
        return self.total_revenue

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "file_url": self.file_url,
            "cover_art_url": self.cover_art_url,
            "duration": self.duration,
            "is_premium": self.is_premium,
            "is_published": self.is_published,
            "release_date": self.release_date.isoformat() if self.release_date else None,
            "uploaded_at": self.uploaded_at.isoformat(),
            # Revenue Data
            "total_revenue": self.total_revenue,
            "revenue_from_ads": self.revenue_from_ads,
            "revenue_from_subscriptions": self.revenue_from_subscriptions,
            "creator_earnings": self.creator_earnings,
            "platform_cut": self.platform_cut
        }


class PodcastClip(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    clip_url = db.Column(db.String(255), nullable=False)
    start_time = db.Column(db.Integer, nullable=False)  # In seconds
    end_time = db.Column(db.Integer, nullable=False)
    shared_platform = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Podcast(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    audio_file_name = db.Column(db.String(500), nullable=True) 
    video_file_name = db.Column(db.String(500), nullable=True) 
    
    # ✅ ADD: Category field
    category = db.Column(db.String(100), nullable=True, default='General')
    
    # ✅ ADD: Missing fields from upload route
    transcription = db.Column(db.Text, nullable=True)  # AI-generated transcription
    duration = db.Column(db.Integer, nullable=True)    # Duration in seconds
    
    # Storage & Metadata
    audio_url = db.Column(db.String(500), nullable=True)
    video_url = db.Column(db.String(500), nullable=True)
    cover_art_url = db.Column(db.String(500), nullable=True)

    # Monetization & Stripe Integration
    monetization_type = db.Column(db.String(50), default="free")  # "free", "paid", "ad-supported"
    price_per_episode = db.Column(db.Float, nullable=True, default=0.00)
    subscription_tier = db.Column(db.String(50), default="Free")
    stripe_product_id = db.Column(db.String(255), nullable=True)  # Stripe product ID
    sponsor = db.Column(db.String(255), nullable=True)  # Optional sponsor name
    donation_link = db.Column(db.String(255), nullable=True)

    # Revenue Tracking
    total_revenue = db.Column(db.Float, default=0.00)  # Total revenue from all sources
    revenue_from_subscriptions = db.Column(db.Float, default=0.00)
    revenue_from_ads = db.Column(db.Float, default=0.00)
    revenue_from_sponsorships = db.Column(db.Float, default=0.00)
    revenue_from_donations = db.Column(db.Float, default=0.00)
    stripe_transaction_ids = db.Column(db.JSON, default=[])  # Store Stripe transactions as an array
    
    # Earnings Split Fields
    platform_cut = db.Column(db.Float, default=0.15)  # 15% platform cut by default
    creator_earnings = db.Column(db.Float, default=0.85)  # 85% for the creator by default
    
    # Engagement & Social Features
    views = db.Column(db.Integer, default=0)
    likes = db.Column(db.Integer, default=0)
    shares = db.Column(db.Integer, default=0)

    # Live Streaming Feature
    streaming_enabled = db.Column(db.Boolean, default=False)
    is_live = db.Column(db.Boolean, default=False)
    stream_url = db.Column(db.String(500), nullable=True)
    live_replay_url = db.Column(db.String(500), nullable=True)
    scheduled_time = db.Column(db.DateTime, nullable=True)

    # Episode Scheduling
    scheduled_release = db.Column(db.DateTime, nullable=True)
    exclusive_until = db.Column(db.DateTime, nullable=True)

    # Series Information
    series_name = db.Column(db.String(255), nullable=True)
    season_number = db.Column(db.Integer, nullable=True)
    episode_number = db.Column(db.Integer, nullable=True)
    ad_insertion = db.Column(db.Boolean, default=False)

    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('podcasts', lazy=True))

    # Method to calculate revenue for podcasts
    def calculate_revenue(self):
        """Calculates the total revenue from all sources."""
        self.total_revenue = (
            self.revenue_from_subscriptions +
            self.revenue_from_ads +
            self.revenue_from_sponsorships +
            self.revenue_from_donations
        )
        db.session.commit()
        return self.total_revenue

    def serialize(self):
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "title": self.title,
            "description": self.description,
            "category": self.category,  # ✅ ADD: Include category in serialization
            "transcription": self.transcription,  # ✅ ADD: Include transcription
            "duration": self.duration,  # ✅ ADD: Include duration
            "audio_url": self.audio_url if self.audio_url else "No audio available",
            "video_url": self.video_url if self.video_url else "No video available",
            "cover_art_url": self.cover_art_url,
            "monetization_type": self.monetization_type,
            "price_per_episode": self.price_per_episode,
            "subscription_tier": self.subscription_tier,
            "stripe_product_id": self.stripe_product_id,
            "sponsor": self.sponsor,
            "donation_link": self.donation_link,
            "views": self.views,
            "likes": self.likes,
            "shares": self.shares,
            "streaming_enabled": self.streaming_enabled,
            "is_live": self.is_live,
            "stream_url": self.stream_url,
            "live_replay_url": self.live_replay_url,
            "scheduled_time": self.scheduled_time.isoformat() if self.scheduled_time else None,
            "scheduled_release": self.scheduled_release.isoformat() if self.scheduled_release else None,
            "exclusive_until": self.exclusive_until.isoformat() if self.exclusive_until else None,
            "series_name": self.series_name,
            "season_number": self.season_number,
            "episode_number": self.episode_number,
            "ad_insertion": self.ad_insertion,
            # Revenue Data
            "total_revenue": self.total_revenue,
            "revenue_from_subscriptions": self.revenue_from_subscriptions,
            "revenue_from_ads": self.revenue_from_ads,
            "revenue_from_sponsorships": self.revenue_from_sponsorships,
            "revenue_from_donations": self.revenue_from_donations,
            "stripe_transaction_ids": self.stripe_transaction_ids,
            "creator_earnings": self.creator_earnings,
            "platform_cut": self.platform_cut
        }


# Assuming you have a model for tracking podcast plays (or similar)

class PodcastEpisodeInteraction(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    episode_id = db.Column(db.Integer, db.ForeignKey('podcast_episode.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    play_count = db.Column(db.Integer, default=1)  # Increase this count with each play
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    episode = db.relationship('PodcastEpisode', backref='interactions')
    user = db.relationship('User', backref='podcast_interactions')

    def update_ad_revenue(self):
        """ Update ad revenue based on number of plays. """
        ad_rate_per_play = 0.05  # Example: $0.05 per play
        ad_revenue = self.play_count * ad_rate_per_play

        episode = self.episode
        episode.revenue_from_ads += ad_revenue  # Update ad revenue for the episode
        episode.calculate_episode_revenue()  # Recalculate the total revenue for the episode
        db.session.commit()

    

class PodcastHost(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)


class PricingPlan(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # "Free", "Basic", "Pro", "Premium"
    price_monthly = db.Column(db.Float, nullable=False)
    price_yearly = db.Column(db.Float, nullable=False)
    trial_days = db.Column(db.Integer, default=14)  # Free Trial Support
    
    # Core Platform Features
    includes_podcasts = db.Column(db.Boolean, default=False)
    includes_radio = db.Column(db.Boolean, default=False)
    includes_digital_sales = db.Column(db.Boolean, default=False)
    includes_merch_sales = db.Column(db.Boolean, default=False)
    includes_live_events = db.Column(db.Boolean, default=False)
    includes_tip_jar = db.Column(db.Boolean, default=False)
    includes_ad_revenue = db.Column(db.Boolean, default=False)
    
    # Music Distribution Features
    includes_music_distribution = db.Column(db.Boolean, default=False)
    sonosuite_access = db.Column(db.Boolean, default=False)
    distribution_uploads_limit = db.Column(db.Integer, default=0)  # Number of tracks per month
    
    # Gaming Features
    includes_gaming_features = db.Column(db.Boolean, default=False)
    includes_team_rooms = db.Column(db.Boolean, default=False)
    includes_squad_finder = db.Column(db.Boolean, default=False)
    includes_gaming_analytics = db.Column(db.Boolean, default=False)
    includes_game_streaming = db.Column(db.Boolean, default=False)
    includes_gaming_monetization = db.Column(db.Boolean, default=False)
    
    # Video Distribution Features
    includes_video_distribution = db.Column(db.Boolean, default=False)
    video_uploads_limit = db.Column(db.Integer, default=0)  # Videos per month
    
    # NEW: Video Editor Limits
    video_clip_max_size = db.Column(db.BigInteger, default=500*1024*1024)  # 500MB default
    audio_clip_max_size = db.Column(db.BigInteger, default=100*1024*1024)  # 100MB default
    image_max_size = db.Column(db.BigInteger, default=10*1024*1024)        # 10MB default
    project_total_max_size = db.Column(db.BigInteger, default=2*1024*1024*1024)  # 2GB default
    
    max_clips_per_track = db.Column(db.Integer, default=10)
    max_tracks_per_project = db.Column(db.Integer, default=5)
    max_projects = db.Column(db.Integer, default=3)
    
    # Export Features
    export_formats = db.Column(JSON, default=['mp4'])  # Allowed export formats
    max_export_quality = db.Column(db.String(10), default='720p')  # 720p, 1080p, 4k, 8k
    max_export_duration = db.Column(db.Integer, default=3600)  # seconds
    
    # Platform Export Features
    platform_export_enabled = db.Column(db.Boolean, default=False)
    allowed_platforms = db.Column(JSON, default=['youtube'])  # youtube, instagram, tiktok, etc.
    
    # Advanced Features
    audio_separation_enabled = db.Column(db.Boolean, default=False)
    advanced_effects_enabled = db.Column(db.Boolean, default=False)
    collaboration_enabled = db.Column(db.Boolean, default=False)
    priority_export_enabled = db.Column(db.Boolean, default=False)
    
    # Additional metadata
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_file_size_limit(self, file_type):
        """Get file size limit for specific file type"""
        size_mapping = {
            'video': self.video_clip_max_size,
            'audio': self.audio_clip_max_size,
            'image': self.image_max_size
        }
        return size_mapping.get(file_type, self.video_clip_max_size)
    
    def can_export_to_platform(self, platform):
        """Check if plan allows export to specific platform"""
        if not self.platform_export_enabled:
            return False
        
        return platform in (self.allowed_platforms or [])
    
    def can_use_quality(self, quality):
        """Check if plan allows specific export quality"""
        quality_hierarchy = {
            '480p': 1,
            '720p': 2, 
            '1080p': 3,
            '4k': 4,
            '8k': 5
        }
        
        max_level = quality_hierarchy.get(self.max_export_quality, 2)
        requested_level = quality_hierarchy.get(quality, 2)
        
        return requested_level <= max_level
    
    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "price_monthly": self.price_monthly,
            "price_yearly": self.price_yearly,
            "trial_days": self.trial_days,
            
            # Core Features
            "includes_podcasts": self.includes_podcasts,
            "includes_radio": self.includes_radio,
            "includes_digital_sales": self.includes_digital_sales,
            "includes_merch_sales": self.includes_merch_sales,
            "includes_live_events": self.includes_live_events,
            "includes_tip_jar": self.includes_tip_jar,
            "includes_ad_revenue": self.includes_ad_revenue,
            
            # Music Distribution
            "includes_music_distribution": self.includes_music_distribution,
            "sonosuite_access": self.sonosuite_access,
            "distribution_uploads_limit": self.distribution_uploads_limit,
            
            # Gaming Features
            "includes_gaming_features": self.includes_gaming_features,
            "includes_team_rooms": self.includes_team_rooms,
            "includes_squad_finder": self.includes_squad_finder,
            "includes_gaming_analytics": self.includes_gaming_analytics,
            "includes_game_streaming": self.includes_game_streaming,
            "includes_gaming_monetization": self.includes_gaming_monetization,
            
            # Video Distribution
            "includes_video_distribution": self.includes_video_distribution,
            "video_uploads_limit": self.video_uploads_limit,
            
            # Video Editor Limits
            "video_editor_limits": {
                "video_clip_max_size": self.video_clip_max_size,
                "audio_clip_max_size": self.audio_clip_max_size,
                "image_max_size": self.image_max_size,
                "project_total_max_size": self.project_total_max_size,
                "max_clips_per_track": self.max_clips_per_track,
                "max_tracks_per_project": self.max_tracks_per_project,
                "max_projects": self.max_projects,
                "export_formats": self.export_formats,
                "max_export_quality": self.max_export_quality,
                "max_export_duration": self.max_export_duration
            },
            
            # Video Editor Features
            "video_editor_features": {
                "platform_export_enabled": self.platform_export_enabled,
                "allowed_platforms": self.allowed_platforms,
                "audio_separation_enabled": self.audio_separation_enabled,
                "advanced_effects_enabled": self.advanced_effects_enabled,
                "collaboration_enabled": self.collaboration_enabled,
                "priority_export_enabled": self.priority_export_enabled
            },
            
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class AudioEffects(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'audio_effects'
    
    id = db.Column(db.Integer, primary_key=True)
    audio_id = db.Column(db.Integer, db.ForeignKey('audio.id'), nullable=False)
    effect_type = db.Column(db.String(50), nullable=False)  # 'reverb', 'compressor', etc.
    intensity = db.Column(db.Float, default=50.0)  # 0-100
    parameters = db.Column(db.JSON, default={})  # Store effect-specific parameters
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationship
    audio = db.relationship('Audio', backref=db.backref('applied_effects', lazy=True))
    
    def serialize(self):
        return {
            "id": self.id,
            "audio_id": self.audio_id,
            "effect_type": self.effect_type,
            "intensity": self.intensity,
            "parameters": self.parameters,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "is_active": self.is_active
        }

class AudioPresets(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'audio_presets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # 'vocals', 'podcast', 'music'
    description = db.Column(db.Text)
    effects_chain = db.Column(db.JSON, nullable=False)  # Array of effects with parameters
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    is_public = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "effects_chain": self.effects_chain,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

# ============ DATABASE MIGRATION SQL ============
# Run this SQL to add the new columns to your existing pricing_plans table:

MIGRATION_SQL = """
-- Add video editing columns to existing pricing_plans table
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS video_clip_max_size BIGINT DEFAULT 524288000;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS audio_clip_max_size BIGINT DEFAULT 104857600;  
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS image_max_size BIGINT DEFAULT 10485760;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS project_total_max_size BIGINT DEFAULT 2147483648;

ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS max_clips_per_track INTEGER DEFAULT 10;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS max_tracks_per_project INTEGER DEFAULT 5;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 3;

ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS export_formats JSON DEFAULT '["mp4"]';
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS max_export_quality VARCHAR(10) DEFAULT '720p';
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS max_export_duration INTEGER DEFAULT 3600;

ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS platform_export_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS allowed_platforms JSON DEFAULT '["youtube"]';

ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS audio_separation_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS advanced_effects_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS collaboration_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS priority_export_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pricing_plans_active ON pricing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_sort ON pricing_plans(sort_order);

-- Update existing plans with default video editor values
UPDATE pricing_plans SET 
    video_clip_max_size = CASE 
        WHEN name = 'Free' THEN 524288000 
        WHEN name = 'Basic' THEN 2147483648 
        WHEN name = 'Premium' THEN 5368709120 
        WHEN name = 'Professional' THEN 21474836480 
        ELSE 524288000 
    END,
    audio_clip_max_size = CASE 
        WHEN name = 'Free' THEN 104857600 
        WHEN name = 'Basic' THEN 524288000 
        WHEN name = 'Premium' THEN 1073741824 
        WHEN name = 'Professional' THEN 2147483648 
        ELSE 104857600 
    END,
    max_projects = CASE 
        WHEN name = 'Free' THEN 3 
        WHEN name = 'Basic' THEN 10 
        WHEN name = 'Premium' THEN 50 
        WHEN name = 'Professional' THEN -1 
        ELSE 3 
    END,
    max_tracks_per_project = CASE 
        WHEN name = 'Free' THEN 5 
        WHEN name = 'Basic' THEN 10 
        WHEN name = 'Premium' THEN 20 
        WHEN name = 'Professional' THEN -1 
        ELSE 5 
    END,
    max_export_quality = CASE 
        WHEN name = 'Free' THEN '720p' 
        WHEN name = 'Basic' THEN '1080p' 
        WHEN name = 'Premium' THEN '4k' 
        WHEN name = 'Professional' THEN '8k' 
        ELSE '720p' 
    END,
    platform_export_enabled = CASE 
        WHEN name = 'Free' THEN TRUE 
        ELSE TRUE 
    END,
    allowed_platforms = CASE 
        WHEN name = 'Free' THEN '["youtube"]' 
        WHEN name = 'Basic' THEN '["youtube", "instagram", "tiktok", "facebook"]' 
        WHEN name = 'Premium' THEN '["youtube", "instagram", "tiktok", "facebook", "twitter"]' 
        WHEN name = 'Professional' THEN '["youtube", "instagram", "tiktok", "facebook", "twitter", "vimeo", "linkedin"]' 
        ELSE '["youtube"]' 
    END,
    audio_separation_enabled = CASE 
        WHEN name IN ('Basic', 'Premium', 'Professional') THEN TRUE 
        ELSE FALSE 
    END,
    advanced_effects_enabled = CASE 
        WHEN name IN ('Premium', 'Professional') THEN TRUE 
        ELSE FALSE 
    END
WHERE name IN ('Free', 'Basic', 'Premium', 'Professional');
"""


# ============ SEEDING FUNCTION ============
def seed_video_editing_plans():
    """Create or update video editing pricing plans"""
    plans_data = [
        {
            "name": "Free",
            "description": "Basic video editing for personal use",
            "price_monthly": 0.00,
            "price_yearly": 0.00,
            "video_clip_max_size": 500 * 1024 * 1024,        # 500MB
            "audio_clip_max_size": 100 * 1024 * 1024,        # 100MB
            "project_total_max_size": 2 * 1024 * 1024 * 1024, # 2GB
            "max_clips_per_track": 10,
            "max_tracks_per_project": 5,
            "max_projects": 3,
            "export_formats": ["mp4"],
            "max_export_quality": "720p",
            "platform_export_enabled": True,
            "allowed_platforms": ["youtube"],
            "audio_separation_enabled": False,
            "advanced_effects_enabled": False,
        },
        {
            "name": "Basic",
            "description": "Enhanced video editing with HD export",
            "price_monthly": 9.99,
            "price_yearly": 99.99,
            "video_clip_max_size": 2 * 1024 * 1024 * 1024,   # 2GB
            "audio_clip_max_size": 500 * 1024 * 1024,        # 500MB
            "project_total_max_size": 10 * 1024 * 1024 * 1024, # 10GB
            "max_clips_per_track": 25,
            "max_tracks_per_project": 10,
            "max_projects": 10,
            "export_formats": ["mp4", "mov", "avi"],
            "max_export_quality": "1080p",
            "platform_export_enabled": True,
            "allowed_platforms": ["youtube", "instagram", "tiktok", "facebook"],
            "audio_separation_enabled": True,
            "advanced_effects_enabled": False,
        },
        {
            "name": "Premium",
            "description": "Professional video editing with 4K export",
            "price_monthly": 29.99,
            "price_yearly": 299.99,
            "video_clip_max_size": 5 * 1024 * 1024 * 1024,   # 5GB
            "audio_clip_max_size": 1024 * 1024 * 1024,       # 1GB
            "project_total_max_size": 50 * 1024 * 1024 * 1024, # 50GB
            "max_clips_per_track": 50,
            "max_tracks_per_project": 20,
            "max_projects": 50,
            "export_formats": ["mp4", "mov", "avi", "webm", "mkv"],
            "max_export_quality": "4k",
            "platform_export_enabled": True,
            "allowed_platforms": ["youtube", "instagram", "tiktok", "facebook", "twitter"],
            "audio_separation_enabled": True,
            "advanced_effects_enabled": True,
        },
        {
            "name": "Professional",
            "description": "Enterprise-grade video editing with unlimited projects",
            "price_monthly": 99.99,
            "price_yearly": 999.99,
            "video_clip_max_size": 20 * 1024 * 1024 * 1024,  # 20GB
            "audio_clip_max_size": 2 * 1024 * 1024 * 1024,   # 2GB
            "project_total_max_size": 500 * 1024 * 1024 * 1024, # 500GB
            "max_clips_per_track": -1,  # Unlimited
            "max_tracks_per_project": -1,  # Unlimited
            "max_projects": -1,  # Unlimited
            "export_formats": ["mp4", "mov", "avi", "webm", "mkv", "prores"],
            "max_export_quality": "8k",
            "platform_export_enabled": True,
            "allowed_platforms": ["youtube", "instagram", "tiktok", "facebook", "twitter", "vimeo", "linkedin"],
            "audio_separation_enabled": True,
            "advanced_effects_enabled": True,
            "collaboration_enabled": True,
            "priority_export_enabled": True,
        }
    ]
    
    for plan_data in plans_data:
        existing_plan = PricingPlan.query.filter_by(name=plan_data["name"]).first()
        
        if existing_plan:
            # Update existing plan
            for key, value in plan_data.items():
                if hasattr(existing_plan, key):
                    setattr(existing_plan, key, value)
        else:
            # Create new plan
            new_plan = PricingPlan(**plan_data)
            db.session.add(new_plan)
    
    db.session.commit()
    print("Video editing pricing plans seeded successfully!")


class SonoSuiteUser(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    streampirex_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sonosuite_external_id = db.Column(db.String(255), nullable=False, unique=True)
    sonosuite_email = db.Column(db.String(255), nullable=False)
    jwt_secret = db.Column(db.String(500), nullable=False)  # Store shared secret
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    user = db.relationship('User', backref='sonosuite_profile')
    
    def serialize(self):
        return {
            "id": self.id,
            "sonosuite_external_id": self.sonosuite_external_id,
            "sonosuite_email": self.sonosuite_email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat()
        }


# Updated models.py - Consolidate your subscription models

# KEEP THIS ONE - Main subscription model that links users to PricingPlan
class Subscription(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('pricing_plan.id'), nullable=False)  # Links to PricingPlan
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)
    stripe_checkout_session_id = db.Column(db.String(255), unique=True, nullable=True)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    grace_period_end = db.Column(db.DateTime, nullable=True)  # 7-day grace period
    auto_renew = db.Column(db.Boolean, default=True)
    billing_cycle = db.Column(db.String(20), default="monthly")  # "monthly" or "yearly"
    status = db.Column(db.String(20), default="active")  # "active", "canceled", "expired"
    
    # Remove these - they should come from the PricingPlan
    # platform_cut = db.Column(db.Float, default=0.15)  # DELETE THIS
    # creator_earnings = db.Column(db.Float)  # DELETE THIS

    user = db.relationship('User', backref=db.backref('subscriptions', lazy=True))
    plan = db.relationship('PricingPlan', backref=db.backref('subscriptions', lazy=True))

    def get_monthly_revenue(self):
        """Calculate monthly revenue based on billing cycle"""
        if self.billing_cycle == "yearly":
            return self.plan.price_yearly / 12
        return self.plan.price_monthly

    def calculate_earnings(self):
        """Calculate creator earnings based on subscription price and billing cycle"""
        monthly_price = self.get_monthly_revenue()
        platform_cut = 0.10  # 10% platform cut
        return monthly_price * (1 - platform_cut)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "plan_name": self.plan.name,
            "stripe_subscription_id": self.stripe_subscription_id,
            "stripe_checkout_session_id": self.stripe_checkout_session_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "grace_period_end": self.grace_period_end.isoformat() if self.grace_period_end else None,
            "auto_renew": self.auto_renew,
            "billing_cycle": self.billing_cycle,
            "status": self.status,
            "monthly_price": self.get_monthly_revenue(),
            "creator_earnings": self.calculate_earnings(),
        }

class UserSubscription(db.Model):
    __table_args__ = {'extend_existing': True}
    """For subscribing to individual radio stations or creator content"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Make these mutually exclusive - either platform plan OR specific content
    plan_id = db.Column(db.Integer, nullable=True)  # For legacy compatibility
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=True)  # Station-specific subscription
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Creator-specific subscription
    
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    monthly_price = db.Column(db.Float, nullable=False)  # Store the price at time of subscription

    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('user_subscriptions', lazy=True))
    creator = db.relationship('User', foreign_keys=[creator_id], backref=db.backref('creator_subscriptions', lazy=True))
    station = db.relationship('RadioStation', backref=db.backref('station_subscriptions', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "station_id": self.station_id,
            "creator_id": self.creator_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "monthly_price": self.monthly_price
        }

class TicketPurchase(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=False)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)
    amount_paid = db.Column(db.Float, nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "station_id": self.station_id,
            "purchase_date": self.purchase_date.isoformat(),
            "amount_paid": self.amount_paid
        }

# Add these models to your models.py file

# Distribution Submission Model (to track submissions)
class DistributionSubmission(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'distribution_submission'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('audio.id'), nullable=True)
    release_title = db.Column(db.String(255), nullable=False)
    artist_name = db.Column(db.String(255), nullable=False)
    genre = db.Column(db.String(100), nullable=False)
    release_date = db.Column(db.Date, nullable=True)
    label = db.Column(db.String(255), default='StreampireX Records')
    explicit = db.Column(db.Boolean, default=False)
    platforms = db.Column(db.JSON, default=[])  # Array of platform names
    territories = db.Column(db.JSON, default=['worldwide'])
    status = db.Column(db.String(50), default='pending')  # pending, processing, live, rejected
    sonosuite_submission_id = db.Column(db.String(255), unique=True)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    expected_live_date = db.Column(db.DateTime, nullable=True)
    actual_live_date = db.Column(db.DateTime, nullable=True)
    
    # Revenue tracking
    total_streams = db.Column(db.Integer, default=0)
    total_revenue = db.Column(db.Float, default=0.0)
    
    # Relationships
    user = db.relationship('User', backref='distribution_submissions')
    track = db.relationship('Audio', backref='distribution_submissions')
    
    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "track_id": self.track_id,
            "release_title": self.release_title,
            "artist_name": self.artist_name,
            "genre": self.genre,
            "release_date": self.release_date.isoformat() if self.release_date else None,
            "label": self.label,
            "explicit": self.explicit,
            "platforms": self.platforms or [],
            "territories": self.territories or [],
            "status": self.status,
            "sonosuite_submission_id": self.sonosuite_submission_id,
            "submitted_at": self.submitted_at.isoformat(),
            "expected_live_date": self.expected_live_date.isoformat() if self.expected_live_date else None,
            "actual_live_date": self.actual_live_date.isoformat() if self.actual_live_date else None,
            "total_streams": self.total_streams,
            "total_revenue": self.total_revenue
        }

# Distribution Analytics Model (to track performance)


class PodcastSubscription(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'), nullable=False)

    podcast = db.relationship('Podcast', backref=db.backref('subscribers', lazy=True))
    user = db.relationship('User', backref=db.backref('podcast_subscriptions', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "podcast_id": self.podcast_id,
        }



class UserPodcast(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cover_art_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
  

    user = db.relationship('User', backref=db.backref('user_podcasts', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "cover_art_url": self.cover_art_url,
            "created_at": self.created_at.isoformat(),
        }


class Track(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    artist_name = db.Column(db.String(150), nullable=True)
    genre = db.Column(db.String(100), nullable=True)
    is_explicit = db.Column(db.Boolean, default=False)
    lyrics = db.Column(db.Text, nullable=True)  # ✅ Add this line
    isrc = db.Column(db.String(50), nullable=True)
    album_id = db.Column(db.Integer, db.ForeignKey('album.id'), nullable=True)




class Music(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Who uploaded the music
    title = db.Column(db.String(255), nullable=False)
    artist = db.Column(db.String(255), nullable=False)  # Artist name
    album = db.Column(db.String(255), nullable=True)
    genre = db.Column(db.String(100), nullable=False)  # Music category
    file_url = db.Column(db.String(500), nullable=False)  # Audio file location
    cover_art_url = db.Column(db.String(500), nullable=True)  # Album cover image
    duration = db.Column(db.Integer, nullable=True)  # Duration in seconds
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_premium = db.Column(db.Boolean, default=False)
    price = db.Column(db.Float, nullable=True)

    platform_cut = db.Column(db.Float, default=0.15)  # 15% by default
    creator_earnings = db.Column(db.Float)            # 85% automatically calculated


    # ✅ Licensing Information
    is_licensed = db.Column(db.Boolean, default=False)  # Whether the track is available for licensing
    license_type = db.Column(db.String(100), nullable=True)  # Example: "Commercial", "Non-Commercial"
    licensing_price = db.Column(db.Float, nullable=True)  # Price for licensing
    license_status = db.Column(db.String(50), default="Pending")  # Licensing status: "Pending", "Approved", "Rejected"
    
    # ✅ Monetization Options
    is_premium = db.Column(db.Boolean, default=False)  # Only premium users can stream/download
    price = db.Column(db.Float, nullable=True)  # Pay-per-download pricing
    ad_revenue = db.Column(db.Float, default=0.0)  # Revenue from ads
    
    # ✅ Engagement & Analytics
    play_count = db.Column(db.Integer, default=0)  # Total plays
    like_count = db.Column(db.Integer, default=0)  # Total likes
    share_count = db.Column(db.Integer, default=0)  # Total shares
    
    # ✅ Integration with Radio Stations & Playlists
    radio_station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=True)  # Optional: Assigned to a radio station
    playlist_id = db.Column(db.Integer, db.ForeignKey('playlist_audio.id'), nullable=True)  # Optional: Assigned to a playlist
    
    user = db.relationship('User', backref=db.backref('music', lazy=True))
    radio_station = db.relationship('RadioStation', backref=db.backref('music', lazy=True))
    playlist = db.relationship('PlaylistAudio', backref=db.backref('music', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "genre": self.genre,
            "file_url": self.file_url,
            "cover_art_url": self.cover_art_url,
            "duration": self.duration,
            "uploaded_at": self.uploaded_at.isoformat(),
            "is_licensed": self.is_licensed,
            "license_type": self.license_type,
            "licensing_price": self.licensing_price,
            "license_status": self.license_status,
            "is_premium": self.is_premium,
            "price": self.price,
            "ad_revenue": self.ad_revenue,
            "play_count": self.play_count,
            "like_count": self.like_count,
            "share_count": self.share_count,
            "radio_station_id": self.radio_station_id,
            "playlist_id": self.playlist_id
        }
    
class MusicPurchase(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    music_id = db.Column(db.Integer, db.ForeignKey('music.id'), nullable=False)
    amount_paid = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "music_id": self.music_id,
            "amount_paid": self.amount_paid,
            "created_at": self.created_at.isoformat()
        }

class MusicEarnings(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    music_id = db.Column(db.Integer, db.ForeignKey('music.id'), nullable=False)
    earnings = db.Column(db.Float, default=0.0)
    payout_triggered = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    music = db.relationship('Music', backref='earnings')
    user = db.relationship('User', backref='earnings')

    def calculate_royalties(self, play_count, royalty_per_play):
        self.earnings += play_count * royalty_per_play
        db.session.commit()

    def trigger_payout(self):
        if self.earnings >= 50:  # Threshold for payout
            # Trigger payout logic (Stripe, PayPal, Bank transfer)
            # Here you would use an API like PayPal or Stripe to send payment
            self.payout_triggered = True
            self.earnings = 0  # Reset earnings after payout
            db.session.commit()
            return "Payout processed"
        return "Earnings below payout threshold"
class MusicUsage(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    music_id = db.Column(db.Integer, db.ForeignKey('music.id'), nullable=False)
    play_count = db.Column(db.Integer, default=0)
    download_count = db.Column(db.Integer, default=0)
    revenue_generated = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    music = db.relationship('Music', backref=db.backref('usage_data', lazy=True))
    
    def serialize(self):
        return {
            "id": self.id,
            "music_id": self.music_id,
            "play_count": self.play_count,
            "download_count": self.download_count,
            "revenue_generated": self.revenue_generated,
            "timestamp": self.timestamp.isoformat(),
        }

class MusicInteraction(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Who interacted with the content
    music_id = db.Column(db.Integer, db.ForeignKey('music.id'), nullable=False)  # Music track
    play_count = db.Column(db.Integer, default=0)  # Number of plays
    download_count = db.Column(db.Integer, default=0)  # Number of downloads
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)  # When this interaction occurred

    user = db.relationship('User', backref=db.backref('music_interactions', lazy=True))
    music = db.relationship('Music', backref=db.backref('interactions', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "music_id": self.music_id,
            "play_count": self.play_count,
            "download_count": self.download_count,
            "timestamp": self.timestamp.isoformat(),
        }


class MusicLicensing(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Artist submitting the track
    track_id = db.Column(db.Integer, db.ForeignKey('audio.id'), nullable=False)  # Music track being licensed
    license_type = db.Column(db.String(100), nullable=False)  # Example: "Film", "Game", "Advertisement"
    licensing_price = db.Column(db.Float, nullable=False)  # Price for the license
    status = db.Column(db.String(50), default="Pending")  # Status: Pending, Approved, Rejected
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)  # Date when submitted
    approved_at = db.Column(db.DateTime, nullable=True)  # Date when approved
    buyer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Who purchased the license (if any)
    stripe_payment_id = db.Column(db.String(255), nullable=True)  # Stripe transaction ID

    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('music_licensing_submissions', lazy=True))
    track = db.relationship('Audio', backref=db.backref('music_licensing', lazy=True))
    buyer = db.relationship('User', foreign_keys=[buyer_id], backref=db.backref('licensed_music', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "track_id": self.track_id,
            "license_type": self.license_type,
            "licensing_price": self.licensing_price,
            "status": self.status,
            "submitted_at": self.submitted_at.isoformat(),
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "buyer_id": self.buyer_id,
            "stripe_payment_id": self.stripe_payment_id
        }

class MusicDistribution(db.Model):
    """Tracks music distribution submissions to streaming platforms via SonoSuite"""
    __tablename__ = 'music_distribution'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'), nullable=True)
    album_id = db.Column(db.Integer, db.ForeignKey('album.id'), nullable=True)
    
    # Distribution details
    title = db.Column(db.String(200), nullable=False)
    artist_name = db.Column(db.String(200), nullable=False)
    release_date = db.Column(db.DateTime, nullable=True)
    upc = db.Column(db.String(50), nullable=True)  # Universal Product Code
    isrc = db.Column(db.String(50), nullable=True)  # International Standard Recording Code
    
    # Status tracking
    status = db.Column(db.String(50), default='pending')  # pending, processing, live, failed, takedown
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    live_date = db.Column(db.DateTime, nullable=True)
    
    # Platform distribution
    platforms = db.Column(db.JSON, default=list)  # List of platforms: ['spotify', 'apple_music', 'amazon', etc.]
    platform_links = db.Column(db.JSON, default=dict)  # Platform-specific links
    
    # SonoSuite integration
    sonosuite_release_id = db.Column(db.String(100), nullable=True)
    sonosuite_status = db.Column(db.String(50), nullable=True)
    
    # Metadata
    genre = db.Column(db.String(100), nullable=True)
    language = db.Column(db.String(50), nullable=True)
    cover_art_url = db.Column(db.String(500), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='music_distributions')
    track = db.relationship('Track', backref='distributions')
    album = db.relationship('Album', backref='distributions')
    analytics = db.relationship('DistributionAnalytics', back_populates='distribution', cascade='all, delete-orphan')
    
    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "track_id": self.track_id,
            "album_id": self.album_id,
            "title": self.title,
            "artist_name": self.artist_name,
            "release_date": self.release_date.isoformat() if self.release_date else None,
            "upc": self.upc,
            "isrc": self.isrc,
            "status": self.status,
            "submission_date": self.submission_date.isoformat() if self.submission_date else None,
            "live_date": self.live_date.isoformat() if self.live_date else None,
            "platforms": self.platforms,
            "platform_links": self.platform_links,
            "sonosuite_release_id": self.sonosuite_release_id,
            "genre": self.genre,
            "language": self.language,
            "cover_art_url": self.cover_art_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class DistributionAnalytics(db.Model):
    """Analytics for distributed music across platforms"""
    __tablename__ = 'distribution_analytics'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    distribution_id = db.Column(db.Integer, db.ForeignKey('music_distribution.id'), nullable=False)
    
    # Platform-specific analytics
    platform = db.Column(db.String(50), nullable=False)  # spotify, apple_music, etc.
    date = db.Column(db.Date, nullable=False)
    
    # Metrics
    streams = db.Column(db.Integer, default=0)
    downloads = db.Column(db.Integer, default=0)
    revenue = db.Column(db.Float, default=0.0)
    listeners = db.Column(db.Integer, default=0)
    
    # Geographic data
    country = db.Column(db.String(100), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    distribution = db.relationship('MusicDistribution', back_populates='analytics')
    
    def serialize(self):
        return {
            "id": self.id,
            "distribution_id": self.distribution_id,
            "platform": self.platform,
            "date": self.date.isoformat() if self.date else None,
            "streams": self.streams,
            "downloads": self.downloads,
            "revenue": self.revenue,
            "listeners": self.listeners,
            "country": self.country,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class DistributionSubmission(db.Model):
    """Tracks submission history and status updates for distributions"""
    __tablename__ = 'distribution_submissions'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    distribution_id = db.Column(db.Integer, db.ForeignKey('music_distribution.id'), nullable=False)
    
    # Submission tracking
    platform = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(50), nullable=False)  # submitted, approved, rejected, live
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    status_update_date = db.Column(db.DateTime, nullable=True)
    
    # Response data
    response_message = db.Column(db.Text, nullable=True)
    platform_release_id = db.Column(db.String(200), nullable=True)
    platform_url = db.Column(db.String(500), nullable=True)
    
    # Error handling
    error_code = db.Column(db.String(50), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    distribution = db.relationship('MusicDistribution', backref='submissions')
    
    def serialize(self):
        return {
            "id": self.id,
            "distribution_id": self.distribution_id,
            "platform": self.platform,
            "status": self.status,
            "submission_date": self.submission_date.isoformat() if self.submission_date else None,
            "status_update_date": self.status_update_date.isoformat() if self.status_update_date else None,
            "response_message": self.response_message,
            "platform_release_id": self.platform_release_id,
            "platform_url": self.platform_url,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class CreatorDonation(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    supporter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Anonymous support possible
    amount = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', foreign_keys=[creator_id], backref=db.backref('donations_received', lazy=True))
    supporter = db.relationship('User', foreign_keys=[supporter_id], backref=db.backref('donations_made', lazy=True))

    platform_cut = db.Column(db.Float, default=0.15)  # 15% by default
    creator_earnings = db.Column(db.Float)            # 85% automatically calculated

    def update_donation_revenue(self):
        """Update donation revenue for the creator, including platform cut and creator earnings."""
        # Calculate platform cut and creator earnings
        platform_revenue = self.amount * self.platform_cut
        self.creator_earnings = self.amount - platform_revenue

        # Update creator's donation revenue (adding the creator's earnings after platform cut)
        self.creator.revenue_from_donations += self.creator_earnings
        self.creator.calculate_revenue()  # Recalculate total revenue
        db.session.commit()

    def serialize(self):
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "supporter_id": self.supporter_id,
            "amount": self.amount,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
            "platform_cut": self.platform_cut,
            "creator_earnings": self.creator_earnings,
        }

    
# Initialize Stripe
# stripe.api_key = "your_stripe_secret_key"

# Creator Membership Tiers
class CreatorMembershipTier(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    price_monthly = db.Column(db.Float, nullable=False)
    price_yearly = db.Column(db.Float, nullable=False)
    benefits = db.Column(db.Text, nullable=True)

    creator = db.relationship('User', backref=db.backref('membership_tiers', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "name": self.name,
            "price_monthly": self.price_monthly,
            "price_yearly": self.price_yearly,
            "benefits": self.benefits.split(";") if self.benefits else []
        }
class Comment(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'comment'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    content_id = db.Column(db.Integer, nullable=False)
    content_type = db.Column(db.String(50), nullable=False)
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    video_id = db.Column(db.Integer, db.ForeignKey('video.id'))

    # ✅ Match this to the property name in Video
    video = db.relationship(
        'Video',
        back_populates='video_comments',
        overlaps="comments"
    )

    user = db.relationship("User", backref=db.backref("comments", lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "video_id": self.video_id,
            "text": self.text,
            "timestamp": self.timestamp,
            "created_at": self.created_at.isoformat(),
        }


    
class PodcastChapter(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)  # Chapter title
    timestamp = db.Column(db.Integer, nullable=False)  # Start time in seconds
    manual_edit = db.Column(db.Boolean, default=False)  # ✅ Flag for manual edits


    podcast = db.relationship("Podcast", backref=db.backref("chapters", lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "podcast_id": self.podcast_id,
            "title": self.title,
            "timestamp": self.timestamp,
            "manual_edit": self.manual_edit
        }




class Notification(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)  # Who receives the notification
    action_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)  # Who triggered the notification
    content_id = db.Column(db.Integer, nullable=False)  # Related to which content
    content_type = db.Column(db.String(50), nullable=False)  # "podcast", "radio", "livestream"
    message = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

    user = db.relationship("User", foreign_keys=[user_id], backref=db.backref("notifications", lazy=True))
    action_user = db.relationship("User", foreign_keys=[action_user_id])

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action_user_id": self.action_user_id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }
    

class Product(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=False)  # ✅ Product image
    file_url = db.Column(db.String(500), nullable=True)  # ✅ Only for digital downloads
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, nullable=True)  # ✅ Only for physical products
    is_digital = db.Column(db.Boolean, default=True)  # ✅ Mark if it's a digital product
    sales_revenue = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    platform_cut = db.Column(db.Float, default=0.15)  # 15% by default
    creator_earnings = db.Column(db.Float)            # 85% automatically calculated


    creator = db.relationship('User', backref=db.backref('products', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "title": self.title,
            "description": self.description,
            "image_url": self.image_url,
            "file_url": self.file_url if self.is_digital else None,  # ✅ Only show for digital products
            "price": self.price,
            "stock": self.stock if not self.is_digital else None,  # ✅ Only show for physical products
            "is_digital": self.is_digital,
            "sales_revenue": self.sales_revenue,
            "created_at": self.created_at.isoformat(),
        }
    
class Collaboration(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, nullable=False)
    role = db.Column(db.String(255), nullable=False)
    available = db.Column(db.Boolean, default=True)

class LicensingOpportunity(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, nullable=False)
    track_id = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default="Pending")

class IndieStation(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    artist = db.relationship("User", backref=db.backref("indie_station", lazy=True))
    followers = db.relationship("IndieStationFollower", backref="station", lazy=True)
    tracks = db.relationship("IndieStationTrack", backref="station", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "artist_id": self.artist_id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "followers": len(self.followers),
            "tracks": [track.serialize() for track in self.tracks],
        }

class IndieStationTrack(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey('indie_station.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('audio.id'), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "track_id": self.track_id,
            "track": Audio.query.get(self.track_id).serialize()
        }

class IndieStationFollower(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey('indie_station.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class LiveEvent(db.Model):
    __table_args__ = {'extend_existing': True}
    """Represents a live event for concerts, VR shows, and ticketed streams."""
    __tablename__ = "live_event"

    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # The artist hosting the event
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.DateTime, nullable=False)
    is_vr_enabled = db.Column(db.Boolean, default=False)  # Supports VR concerts
    ticket_price = db.Column(db.Float, nullable=True)  # Ticket price if required
    total_tickets_sold = db.Column(db.Integer, default=0)
    stream_url = db.Column(db.String(500), nullable=True)  # URL for the live stream
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    platform_cut = db.Column(db.Float, default=0.15)  # 15% platform cut by default
    creator_earnings = db.Column(db.Float)  # 85% earnings automatically calculated

    artist = db.relationship('User', backref=db.backref('live_events', lazy=True))
    vr_access_tickets = db.relationship('VRAccessTicket', backref='event', lazy=True)
    tickets = db.relationship('EventTicket', back_populates="event")

    def calculate_revenue(self):
        """Calculate creator earnings for live events."""
        if self.ticket_price:
            self.creator_earnings = self.ticket_price * (1 - self.platform_cut) * self.total_tickets_sold
        db.session.commit()

    def serialize(self):
        return {
            "id": self.id,
            "artist_id": self.artist_id,
            "title": self.title,
            "description": self.description,
            "date": self.date.isoformat(),
            "is_vr_enabled": self.is_vr_enabled,
            "ticket_price": self.ticket_price,
            "total_tickets_sold": self.total_tickets_sold,
            "stream_url": self.stream_url,
            "created_at": self.created_at.isoformat(),
            "platform_cut": self.platform_cut,
            "creator_earnings": self.creator_earnings,
        }


class EventTicket(db.Model):
    __table_args__ = {'extend_existing': True}
    """Represents a ticket purchase for live events."""
    __tablename__ = "event_ticket"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Who bought the ticket
    event_id = db.Column(db.Integer, db.ForeignKey('live_event.id'), nullable=False)  # Which event the ticket is for
    price_paid = db.Column(db.Float, nullable=False)
    platform_cut = db.Column(db.Float, default=0.15)  # 15% by default
    creator_earnings = db.Column(db.Float)            # 85% automatically calculated
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship with LiveEvent
    event = db.relationship("LiveEvent", back_populates="tickets")

    def calculate_revenue(self):
        """Calculate creator earnings for event ticket sales."""
        self.creator_earnings = self.price_paid * (1 - self.platform_cut)
        db.session.commit()

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "price_paid": self.price_paid,
            "creator_earnings": self.creator_earnings,
            "platform_cut": self.platform_cut,
            "purchased_at": self.purchased_at.isoformat(),
        }


class RadioTrack(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'), nullable=False)  # Linking to uploaded tracks
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "station_id": self.station_id,
            "track_id": self.track_id,
            "added_at": self.added_at.isoformat(),
        }


class Payout(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Creator requesting payout
    amount = db.Column(db.Float, nullable=False)  # Payout amount
    status = db.Column(db.String(20), default="Pending")  # Pending, Approved, Rejected, Processed
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)  # Time when payout was requested
    processed_at = db.Column(db.DateTime, nullable=True)  # Time when payout was approved/processed

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": self.amount,
            "status": self.status,
            "requested_at": self.requested_at.strftime("%Y-%m-%d %H:%M:%S"),
            "processed_at": self.processed_at.strftime("%Y-%m-%d %H:%M:%S") if self.processed_at else None,
        }
    
# models.py
class Payment(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    amount = db.Column(db.Integer)
    payment_intent_id = db.Column(db.String(120), unique=True)
    status = db.Column(db.String(50))  # e.g., 'succeeded'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "amount": self.amount,
            "payment_intent_id": self.payment_intent_id,
            "status": self.status,
            "timestamp": self.timestamp.isoformat(),
        }

    
class Revenue(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Creator or platform revenue
    revenue_type = db.Column(db.String(50), nullable=False)  # e.g., 'subscription', 'ad', 'music', 'donation'
    amount = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    platform_cut = db.Column(db.Float, default=0.15)  # 15% by default
    creator_earnings = db.Column(db.Float)            # 85% automatically calculated

    user = db.relationship("User", backref="revenues")

    def calculate_revenue(self):
        """Calculate and update creator earnings based on revenue type."""
        self.creator_earnings = self.amount * (1 - self.platform_cut)  # Subtract platform cut from total revenue
        db.session.commit()

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "revenue_type": self.revenue_type,
            "amount": self.amount,
            "creator_earnings": self.creator_earnings,
            "platform_cut": self.platform_cut,
            "timestamp": self.timestamp.isoformat(),
        }

    
# models/listening_party.py

class ListeningParty(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'listening_party'

    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, db.ForeignKey('artist.id'), nullable=False)
    album_name = db.Column(db.String(255), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    ticket_price = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    vr_room_url = db.Column(db.String(512))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attendees = db.relationship('ListeningPartyAttendee', backref='party', lazy=True)

class ListeningPartyAttendee(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'listening_party_attendee'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    party_id = db.Column(db.Integer, db.ForeignKey('listening_party.id'), nullable=False)
    payment_status = db.Column(db.String(50), default='paid')  # or 'pending', 'refunded'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

# ✅ In models.py
class Album(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    genre = db.Column(db.String(80), nullable=False)
    release_date = db.Column(db.String(20), nullable=False)
    cover_art_url = db.Column(db.String(255), nullable=True)
    artist_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # ✅ FIXED: Specify which foreign key to use for each relationship
    user = db.relationship("User", foreign_keys=[user_id], backref="albums")
    artist = db.relationship("User", foreign_keys=[artist_id], backref="artist_albums")
    tracks = db.relationship("Track", backref="album", lazy=True)


class Artist(db.Model):
    __table_args__ = {'extend_existing': True}
    """If you don't actually need the Artist.albums relationship"""
    __tablename__ = 'artist'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    bio = db.Column(db.Text)
    
    # ✅ REMOVE the problematic albums relationship
    # albums = db.relationship("Album", ...)  # REMOVE THIS LINE
    
    user = db.relationship("User", backref="artist_profile")
    
    def get_albums(self):
        """Get albums by querying through user relationship"""
        return self.user.albums


class Purchase(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)
    platform_cut = db.Column(db.Float, default=0.15)  # 15% by default
    creator_earnings = db.Column(db.Float)            # 85% automatically calculated

    
    # Relationships
    user = db.relationship('User', backref='purchases')
    product = db.relationship('Product', backref='purchases')

    def __repr__(self):
        return f"<Purchase by user {self.user_id} for product {self.product_id} costing ${self.amount}>"

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "amount": self.amount,
            "purchased_at": self.purchased_at.strftime("%Y-%m-%d %H:%M:%S"),
            "user": self.user.username if self.user else None,
            "product": self.product.name if self.product else None
        }

class RefundRequest(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="Pending")  # Pending, Approved, Rejected, Refunded
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "reviewed_at": self.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if self.reviewed_at else None
        }
    
class Order(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    tracking_number = db.Column(db.String(100))
    carrier = db.Column(db.String(50))  # USPS, FedEx, UPS, etc.
    shipped_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    estimated_delivery = db.Column(db.DateTime)

class Engagement(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, nullable=False)
    views = db.Column(db.Integer)
    plays = db.Column(db.Integer)
    # Add more fields as needed
    
class Earnings(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Float)
    adRevenue = db.Column(db.Float)
    subscriptionRevenue = db.Column(db.Float)
    donationRevenue = db.Column(db.Float)
    # Add more fields as needed

class Popularity(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, nullable=False)
    popularity_score = db.Column(db.Integer)
    # Add more fields as needed

class Tip(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    platform_cut = db.Column(db.Float, default=0.15)  # 15% by default
    creator_earnings = db.Column(db.Float)            # 85% automatically calculated


    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_tips')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_tips')

    def __repr__(self):
        return f"<Tip from {self.sender_id} to {self.recipient_id} of ${self.amount}>"

# Ad Revenue Model
class AdRevenue(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(255), nullable=True)  # e.g., ad network
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', backref='ad_revenue')

    def __repr__(self):
        return f"<AdRevenue for creator {self.creator_id}: ${self.amount}>"
    
# Stream Model
class Stream(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = "stream"

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    squad_id = db.Column(db.Integer, db.ForeignKey('squad.id'), nullable=True)
    stream_url = db.Column(db.String(500), nullable=False)
    platform = db.Column(db.String(50))
    title = db.Column(db.String(150), nullable=True)
    views = db.Column(db.Integer, default=0)
    is_live = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ✅ FIXED: Proper relationships with back_populates
    user = db.relationship("User", foreign_keys=[creator_id], overlaps="streams,game_streams,live_streams")
    squad = db.relationship("Squad", back_populates="streams", foreign_keys=[squad_id])

    def serialize(self):
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "squad_id": self.squad_id,
            "stream_url": self.stream_url,
            "platform": self.platform,
            "title": self.title,
            "views": self.views,
            "is_live": self.is_live,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }



# models/share.py or models.py
class Share(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)

    # Polymorphic reference — remove ForeignKey
    content_id = db.Column(db.Integer, nullable=False)  
    content_type = db.Column(db.String(50), nullable=False)  # "podcast", "radio", "livestream"

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    platform = db.Column(db.String(50), nullable=False)
    shared_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("shares", lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "user_id": self.user_id,
            "platform": self.platform,
            "shared_at": self.shared_at.isoformat()
        }
    


class VRAccessTicket(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    event_id = db.Column(db.Integer, db.ForeignKey('live_event.id'))
    is_verified = db.Column(db.Boolean, default=False)



class Conversation(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user2_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Message(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    room = db.Column(db.String(128), nullable=False)  # UUID or "user1-user2"
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # null for group
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=True)
    text = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)



# Define association table first
# 🔁 Many-to-Many Table (no model needed)
group_members = db.Table('group_members',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('group_id', db.Integer, db.ForeignKey('group.id')),
    extend_existing=True
)

# Add to models.py
class DirectMessage(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'direct_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_messages')
    
    def serialize(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.username,
            'recipient_id': self.recipient_id,
            'recipient_name': self.recipient.username,
            'message': self.message,
            'read': self.read,
            'created_at': self.created_at.isoformat()
        }

class Conversation(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    last_message_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user1 = db.relationship('User', foreign_keys=[user1_id])
    user2 = db.relationship('User', foreign_keys=[user2_id])

# 👥 Group Chat Model
class Group(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Users in the group
    members = db.relationship('User', secondary=group_members, backref='groups')

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_by": self.created_by,
            "members": [user.id for user in self.members],
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }

# models.py

class UserPodcastFollow(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'user_podcast_follow'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class TrackRelease(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'track_releases'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    genre = db.Column(db.String(50))
    release_date = db.Column(db.Date)
    cover_url = db.Column(db.String(250))
    audio_url = db.Column(db.String(250))
    is_explicit = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(50), default='pending')  # 'pending', 'live', 'rejected', etc.
    platform_links = db.Column(JSON, nullable=True)  # Example: {"spotify": "...", "apple": "..."}
    external_id = db.Column(db.String(120))  # ID returned from Revelator
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "genre": self.genre,
            "release_date": self.release_date.strftime('%Y-%m-%d') if self.release_date else None,
            "cover_url": self.cover_url,
            "audio_url": self.audio_url,
            "is_explicit": self.is_explicit,
            "status": self.status,
            "platform_links": self.platform_links,
            "external_id": self.external_id,
            "created_at": self.created_at.isoformat()
        }

class Release(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    title = db.Column(db.String(150))
    genre = db.Column(db.String(80))
    release_date = db.Column(db.String(20))
    explicit = db.Column(db.Boolean, default=False)
    track_id = db.Column(db.Integer)
    cover_art_url = db.Column(db.String(255))
    external_id = db.Column(db.String(120))  # Revelator response tracking ID
    delivery_status = db.Column(db.String(50), default="pending")  # e.g. delivered, rejected
    delivery_message = db.Column(db.Text, nullable=True)  # optional error or info message
    status = db.Column(db.String)
    platform_links = db.Column(db.JSON)
    upc = db.Column(db.String(50), nullable=True)


# Track
lyrics_text = db.Column(db.Text)
isrc_code = db.Column(db.String(20))

# Release
upc_code = db.Column(db.String(20))

# New Table
class Collaborator(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(120))
    percentage = db.Column(db.Float)

    track = db.relationship('Track', backref=db.backref('collaborators', lazy=True))

class AlbumTrack(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    album_id = db.Column(db.Integer, db.ForeignKey('album.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'), nullable=False)


class Post(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    content = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "created_at": self.created_at.isoformat()
        }

class Follow(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    followed_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    follower = db.relationship('User', foreign_keys=[follower_id])
    followed = db.relationship('User', foreign_keys=[followed_id])

class Label(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
        }


    
class Game(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String)
    supports_crossplay = db.Column(db.Boolean)
    platforms = db.Column(db.ARRAY(db.String))  # ["PS5", "Xbox", "PC"]
    genre = db.Column(db.String)
    
    # Optional: Add a few useful fields that complement your existing structure
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "supports_crossplay": self.supports_crossplay,
            "platforms": self.platforms or [],
            "genre": self.genre,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    def get_current_players(self):
        """Get current player count from User table"""
    
        return User.query.filter(User.current_games.contains([self.name])).count()
    
    @staticmethod
    def get_popular_games(limit=10):
        """Get most popular games based on current players"""
        from sqlalchemy import func
      
        
        # Query to get games by player count
        result = db.session.query(
            func.unnest(User.current_games).label('game_name'),
            func.count('*').label('player_count')
        ).filter(
            User.is_gamer == True,
            User.current_games != None
        ).group_by('game_name').order_by(
            func.count('*').desc()
        ).limit(limit).all()
        
        popular_games = []
        for row in result:
            game = Game.query.filter_by(name=row.game_name).first()
            if game:
                game_data = game.serialize()
                game_data['current_players'] = row.player_count
                popular_games.append(game_data)
        
        return popular_games


class UserGameStat(db.Model):
    __table_args__ = {'extend_existing': True}
    """Track individual user statistics for specific games"""
    __tablename__ = 'user_game_stat'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # No FK to match your pattern
    game_id = db.Column(db.Integer, nullable=False)   # References Game.id
    
    # Basic Gaming Statistics
    hours_played = db.Column(db.Float, default=0.0)
    matches_played = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)
    
    # Combat Stats (for applicable games)
    kills = db.Column(db.Integer, default=0)
    deaths = db.Column(db.Integer, default=0)
    assists = db.Column(db.Integer, default=0)
    
    # Ranking & Progress
    current_rank = db.Column(db.String(50), nullable=True)
    highest_rank = db.Column(db.String(50), nullable=True)
    level = db.Column(db.Integer, default=1)
    
    # User Interaction
    user_rating = db.Column(db.Integer, nullable=True)  # 1-5 rating
    is_favorite = db.Column(db.Boolean, default=False)
    
    # Timestamps
    first_played = db.Column(db.DateTime, default=datetime.utcnow)
    last_played = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_user(self):
        """Get user object"""
       
        return User.query.get(self.user_id)
    
    def get_game(self):
        """Get game object"""
        return Game.query.get(self.game_id)
    
    def serialize(self):
        user = self.get_user()
        game = self.get_game()
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": user.username if user else None,
            "game_id": self.game_id,
            "game_name": game.name if game else None,
            "hours_played": self.hours_played,
            "matches_played": self.matches_played,
            "wins": self.wins,
            "losses": self.losses,
            "win_rate": round((self.wins / self.matches_played * 100), 2) if self.matches_played > 0 else 0,
            "kills": self.kills,
            "deaths": self.deaths,
            "assists": self.assists,
            "kd_ratio": round((self.kills / self.deaths), 2) if self.deaths > 0 else self.kills,
            "current_rank": self.current_rank,
            "highest_rank": self.highest_rank,
            "level": self.level,
            "user_rating": self.user_rating,
            "is_favorite": self.is_favorite,
            "first_played": self.first_played.isoformat(),
            "last_played": self.last_played.isoformat()
        }

class FriendRequest(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'friend_request'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default="pending")
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime, nullable=True)
    
    # ✅ These relationships are correct - using back_populates properly
    sender = db.relationship("User", foreign_keys=[sender_id], back_populates="sent_friend_requests")
    receiver = db.relationship("User", foreign_keys=[receiver_id], back_populates="received_friend_requests")
    
    def serialize(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "sender_username": self.sender.username,
            "sender_gamertag": getattr(self.sender, 'gamertag', None),
            "receiver_id": self.receiver_id,
            "receiver_username": self.receiver.username,
            "status": self.status,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
            "responded_at": self.responded_at.isoformat() if self.responded_at else None
        }



class GameStream(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'game_stream'
    
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    squad_id = db.Column(db.Integer, db.ForeignKey('squad.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    game = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    stream_url = db.Column(db.String(500), nullable=True)
    thumbnail_url = db.Column(db.String(500), nullable=True)
    is_live = db.Column(db.Boolean, default=False)
    viewer_count = db.Column(db.Integer, default=0)
    category = db.Column(db.String(100), nullable=True)
    tags = db.Column(db.ARRAY(db.String), default=[])
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime, nullable=True)
    
    # ✅ FIXED: Add overlaps="game_streams" to silence the warning
    user = db.relationship("User", 
                          back_populates="streams", 
                          foreign_keys=[creator_id],
                          overlaps="game_streams")
    
    squad = db.relationship("Squad", foreign_keys=[squad_id])
    
    def serialize(self):
        squad = self.squad if self.squad_id else None
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "creator_username": self.user.username if self.user else "Unknown",
            "creator_gamertag": getattr(self.user, 'gamertag', None) if self.user else None,
            "squad_id": self.squad_id,
            "squad_name": squad.name if squad else None,
            "title": self.title,
            "game": self.game,
            "description": self.description,
            "stream_url": self.stream_url,
            "thumbnail_url": self.thumbnail_url,
            "is_live": self.is_live,
            "viewer_count": self.viewer_count,
            "category": self.category,
            "tags": self.tags or [],
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None
        }


class GameMatch(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'game_match'
    
    id = db.Column(db.Integer, primary_key=True)
    game = db.Column(db.String(100), nullable=False)
    match_type = db.Column(db.String(50), nullable=False)  # "ranked", "casual", "tournament"
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    max_players = db.Column(db.Integer, default=10)
    skill_requirement = db.Column(db.String(50), nullable=True)
    region = db.Column(db.String(100), nullable=True)
    scheduled_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default="open")  # open, full, started, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = db.relationship("User", foreign_keys=[creator_id], backref="created_matches")
    participants = db.relationship("MatchParticipant", back_populates="match")
    
    def serialize(self):
        return {
            "id": self.id,
            "game": self.game,
            "match_type": self.match_type,
            "creator_id": self.creator_id,
            "creator_username": self.creator.username,
            "title": self.title,
            "description": self.description,
            "max_players": self.max_players,
            "current_players": len(self.participants),
            "skill_requirement": self.skill_requirement,
            "region": self.region,
            "scheduled_time": self.scheduled_time.isoformat() if self.scheduled_time else None,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "participants": [p.serialize() for p in self.participants]
        }


class MatchParticipant(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'match_participant'
    
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('game_match.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="joined")  # joined, confirmed, no_show
    
    # Relationships
    match = db.relationship("GameMatch", back_populates="participants")
    user = db.relationship("User", backref="match_participations")
    
    def serialize(self):
        return {
            "id": self.id,
            "match_id": self.match_id,
            "user_id": self.user_id,
            "username": self.user.username,
            "gamertag": self.user.gamertag,
            "skill_level": self.user.skill_level,
            "joined_at": self.joined_at.isoformat(),
            "status": self.status
        }  

# Add this to your models.py file

class InnerCircle(db.Model):
    """User's Inner Circle - Top 10 featured friends (like MySpace Top 8 but expanded)"""
    __tablename__ = 'inner_circle'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'position', name='unique_user_position'),
        db.UniqueConstraint('user_id', 'friend_user_id', name='unique_user_friend'),
        db.CheckConstraint('user_id != friend_user_id', name='no_self_inner_circle'),
        {'extend_existing': True}
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    friend_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    position = db.Column(db.Integer, nullable=False)  # 1-10 ranking position
    custom_title = db.Column(db.String(50), nullable=True)  # Optional custom title like "Best Friend", "Gaming Buddy", etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='inner_circle_members')
    friend = db.relationship('User', foreign_keys=[friend_user_id], backref='featured_in_circles')
    
    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "friend_user_id": self.friend_user_id,
            "position": self.position,
            "custom_title": self.custom_title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "friend": {
                "id": self.friend.id,
                "username": self.friend.username,
                "artist_name": self.friend.artist_name,
                "avatar_url": self.friend.avatar_url,
                "bio": self.friend.bio,
                "is_gamer": self.friend.is_gamer,
                "gamertag": self.friend.gamertag,
                "is_artist": self.friend.is_artist
            } if self.friend else None
        }

# Add this method to your existing User model class
def get_inner_circle(self):
    """Get user's inner circle ordered by position"""
    return InnerCircle.query.filter_by(user_id=self.id)\
                           .order_by(InnerCircle.position)\
                           .all()

def add_to_inner_circle(self, friend_user_id, position=None, custom_title=None):
    """Add a friend to inner circle at specific position"""
    if position is None:
        # Find next available position
        existing_positions = [ic.position for ic in self.get_inner_circle()]
        position = 1
        while position in existing_positions and position <= 10:
            position += 1
        if position > 10:
            return None  # Inner circle is full
    
    # Remove existing entry for this friend if exists
    existing = InnerCircle.query.filter_by(user_id=self.id, friend_user_id=friend_user_id).first()
    if existing:
        db.session.delete(existing)
    
    # If position is taken, shift others down
    if position <= 10:
        existing_at_position = InnerCircle.query.filter_by(user_id=self.id, position=position).first()
        if existing_at_position:
            # Shift this and subsequent positions down
            to_shift = InnerCircle.query.filter_by(user_id=self.id)\
                                      .filter(InnerCircle.position >= position)\
                                      .order_by(InnerCircle.position.desc()).all()
            for item in to_shift:
                if item.position < 10:
                    item.position += 1
                else:
                    db.session.delete(item)  # Remove if it would go beyond position 10
    
    # Add new inner circle member
    new_member = InnerCircle(
        user_id=self.id,
        friend_user_id=friend_user_id,
        position=position,
        custom_title=custom_title
    )
    db.session.add(new_member)
    return new_member

def remove_from_inner_circle(self, friend_user_id):
    """Remove a friend from inner circle and reorder positions"""
    member = InnerCircle.query.filter_by(user_id=self.id, friend_user_id=friend_user_id).first()
    if member:
        removed_position = member.position
        db.session.delete(member)
        
        # Shift higher positions down to fill the gap
        to_shift = InnerCircle.query.filter_by(user_id=self.id)\
                                  .filter(InnerCircle.position > removed_position)\
                                  .order_by(InnerCircle.position).all()
        for item in to_shift:
            item.position -= 1
        
        db.session.commit()
        return True
    return False

def reorder_inner_circle(self, new_order):
    """Reorder inner circle based on list of friend_user_ids in desired order"""
    for i, friend_user_id in enumerate(new_order[:10], 1):  # Limit to top 10
        member = InnerCircle.query.filter_by(user_id=self.id, friend_user_id=friend_user_id).first()
        if member:
            member.position = i
            member.updated_at = datetime.utcnow()
    db.session.commit()

class DistributionAnalytics(db.Model):
    __table_args__ = {'extend_existing': True}
    """Store analytics data from distribution services"""
    __tablename__ = 'distribution_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    distribution_id = db.Column(db.Integer, db.ForeignKey('music_distributions.id'), nullable=False)
    
    # Platform-specific data
    platform = db.Column(db.String(50), nullable=False)  # spotify, apple_music, etc.
    territory = db.Column(db.String(10))  # US, UK, etc.
    
    # Metrics
    streams = db.Column(db.BigInteger, default=0)
    downloads = db.Column(db.BigInteger, default=0)
    revenue = db.Column(db.Numeric(10, 4), default=0.0000)
    
    # Time period
    report_date = db.Column(db.Date, nullable=False)
    report_period = db.Column(db.String(20), default='daily')  # daily, weekly, monthly
    
    # Additional metrics
    unique_listeners = db.Column(db.Integer, default=0)
    playlist_adds = db.Column(db.Integer, default=0)
    saves = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    distribution = db.relationship('MusicDistribution', backref=db.backref('analytics', lazy=True))
    
    def serialize(self):
        return {
            "id": self.id,
            "distribution_id": self.distribution_id,
            "platform": self.platform,
            "territory": self.territory,
            "streams": self.streams or 0,
            "downloads": self.downloads or 0,
            "revenue": float(self.revenue) if self.revenue else 0.0,
            "report_date": self.report_date.isoformat() if self.report_date else None,
            "report_period": self.report_period,
            "unique_listeners": self.unique_listeners or 0,
            "playlist_adds": self.playlist_adds or 0,
            "saves": self.saves or 0,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ENHANCE YOUR EXISTING Audio MODEL by adding these fields if not already present:
"""
Add these fields to your existing Audio model if they don't exist:

    # Distribution-related fields (add these if missing)
    isrc_code = db.Column(db.String(20))  # International Standard Recording Code
    explicit_content = db.Column(db.Boolean, default=False)
    copyright_info = db.Column(db.String(200))
"""

# ADD THESE NEW MODELS TO YOUR models.py - NO CONFLICTS

class VideoChannel(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'video_channels'
    
    # Basic Channel Info
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    channel_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    custom_url = db.Column(db.String(100), unique=True, nullable=True)
    
    # Media Assets
    avatar_url = db.Column(db.String(500), nullable=True)
    banner_url = db.Column(db.String(500), nullable=True)
    watermark_url = db.Column(db.String(500), nullable=True)
    
    # Statistics
    subscriber_count = db.Column(db.Integer, default=0)
    total_views = db.Column(db.Integer, default=0)
    total_videos = db.Column(db.Integer, default=0)
    
    # Categories & Location
    primary_category = db.Column(db.String(50), nullable=True)
    secondary_category = db.Column(db.String(50), nullable=True)
    country = db.Column(db.String(100), nullable=True)
    language = db.Column(db.String(10), default='en')
    
    # Channel Settings
    is_verified = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=True)
    allow_comments = db.Column(db.Boolean, default=True)
    allow_likes = db.Column(db.Boolean, default=True)
    age_restricted = db.Column(db.Boolean, default=False)
    made_for_kids = db.Column(db.Boolean, default=False)
    enable_monetization = db.Column(db.Boolean, default=False)
    
    # Branding & Theme
    theme_color = db.Column(db.String(7), default='#667eea')
    accent_color = db.Column(db.String(7), default='#764ba2')
    custom_css = db.Column(db.Text, nullable=True)
    
    # Social Links
    website_url = db.Column(db.String(255), nullable=True)
    twitter_url = db.Column(db.String(255), nullable=True)
    instagram_url = db.Column(db.String(255), nullable=True)
    facebook_url = db.Column(db.String(255), nullable=True)
    tiktok_url = db.Column(db.String(255), nullable=True)
    discord_url = db.Column(db.String(255), nullable=True)
    twitch_url = db.Column(db.String(255), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='video_channels')
    clips = db.relationship('VideoClip', backref='channel', lazy=True)
    
    def serialize(self):
        return {
            # Basic Info
            'id': self.id,
            'user_id': self.user_id,
            'channel_name': self.channel_name,
            'description': self.description,
            'custom_url': self.custom_url,
            
            # Media Assets
            'avatar_url': self.avatar_url,
            'banner_url': self.banner_url,
            'watermark_url': self.watermark_url,
            
            # Statistics
            'subscriber_count': self.subscriber_count,
            'total_views': self.total_views,
            'total_videos': self.total_videos,
            
            # Categories & Location
            'primary_category': self.primary_category,
            'secondary_category': self.secondary_category,
            'country': self.country,
            'language': self.language,
            
            # Channel Settings
            'is_verified': self.is_verified,
            'is_public': self.is_public,
            'allow_comments': self.allow_comments,
            'allow_likes': self.allow_likes,
            'age_restricted': self.age_restricted,
            'made_for_kids': self.made_for_kids,
            'enable_monetization': self.enable_monetization,
            
            # Branding & Theme
            'theme_color': self.theme_color,
            'accent_color': self.accent_color,
            'custom_css': self.custom_css,
            
            # Social Links
            'website_url': self.website_url,
            'twitter_url': self.twitter_url,
            'instagram_url': self.instagram_url,
            'facebook_url': self.facebook_url,
            'tiktok_url': self.tiktok_url,
            'discord_url': self.discord_url,
            'twitch_url': self.twitch_url,
            
            # Timestamps
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class VideoClip(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'video_clips'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('video_channels.id'), nullable=True)
    source_video_id = db.Column(db.Integer, db.ForeignKey('video.id'), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    video_url = db.Column(db.String(500), nullable=False)
    thumbnail_url = db.Column(db.String(500), nullable=True)
    start_time = db.Column(db.Integer, nullable=True)
    end_time = db.Column(db.Integer, nullable=True)
    duration = db.Column(db.Integer, nullable=False)
    content_type = db.Column(db.String(50), default='clip')
    views = db.Column(db.Integer, default=0)
    likes = db.Column(db.Integer, default=0)
    comments = db.Column(db.Integer, default=0)
    shares = db.Column(db.Integer, default=0)
    tags = db.Column(db.JSON, default=[])
    is_public = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Verify these exist in your VideoClip model:
    timeline_start = db.Column(db.Float, default=0)  # Position on timeline
    timeline_end = db.Column(db.Float, default=0)    # End position on timeline
    track_id = db.Column(db.Integer, default=1)      # Which track it's on
    
    # Relationships
    user = db.relationship('User', backref='clips')
    source_video = db.relationship('Video', backref='clips', foreign_keys=[source_video_id])
    
    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'channel_id': self.channel_id,
            'source_video_id': self.source_video_id,
            'title': self.title,
            'description': self.description,
            'video_url': self.video_url,
            'thumbnail_url': self.thumbnail_url,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'duration': self.duration,
            'content_type': self.content_type,
            'views': self.views,
            'likes': self.likes,
            'comments': self.comments,
            'shares': self.shares,
            'tags': self.tags,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'creator': {
                'id': self.user.id,
                'username': self.user.username,
                'profile_picture': getattr(self.user, 'profile_picture', None) or getattr(self.user, 'avatar_url', None)
            } if self.user else None
        }

class ChannelSubscription(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'channel_subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    subscriber_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('video_channels.id'), nullable=False)
    notifications_enabled = db.Column(db.Boolean, default=True)
    subscribed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    subscriber = db.relationship('User', backref='channel_subscriptions')
    channel = db.relationship('VideoChannel', backref='subscriptions')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('subscriber_id', 'channel_id', name='unique_channel_subscription'),)
    
    def serialize(self):
        return {
            'id': self.id,
            'subscriber_id': self.subscriber_id,
            'channel_id': self.channel_id,
            'notifications_enabled': self.notifications_enabled,
            'subscribed_at': self.subscribed_at.isoformat() if self.subscribed_at else None
        }

class ClipLike(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'clip_likes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    clip_id = db.Column(db.Integer, db.ForeignKey('video_clips.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='clip_likes')
    clip = db.relationship('VideoClip', backref='clip_likes')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'clip_id', name='unique_clip_like'),)

class SocialAccount(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'social_accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    platform = db.Column(db.String(50), nullable=False)
    platform_user_id = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(255), nullable=True)
    profile_picture = db.Column(db.String(500), nullable=True)
    access_token = db.Column(db.Text, nullable=True)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expires_at = db.Column(db.DateTime, nullable=True)
    followers_count = db.Column(db.Integer, default=0)
    following_count = db.Column(db.Integer, default=0)
    posts_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    last_sync = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='social_accounts')
    posts = db.relationship('SocialPost', backref='account', lazy=True)
    
    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'platform': self.platform,
            'username': self.username,
            'display_name': self.display_name,
            'profile_picture': self.profile_picture,
            'followers_count': self.followers_count,
            'following_count': self.following_count,
            'posts_count': self.posts_count,
            'is_active': self.is_active,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class SocialPost(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'social_posts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('social_accounts.id'), nullable=False)
    platform_post_id = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=False)
    media_urls = db.Column(db.JSON, default=[])
    hashtags = db.Column(db.JSON, default=[])
    scheduled_time = db.Column(db.DateTime, nullable=True)
    posted_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), default='draft')
    likes_count = db.Column(db.Integer, default=0)
    shares_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    reach = db.Column(db.Integer, default=0)
    engagement_rate = db.Column(db.Float, default=0.0)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='social_posts')
    
    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'platform': self.account.platform if self.account else None,
            'platform_post_id': self.platform_post_id,
            'content': self.content,
            'media_urls': self.media_urls,
            'hashtags': self.hashtags,
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'posted_at': self.posted_at.isoformat() if self.posted_at else None,
            'status': self.status,
            'likes_count': self.likes_count,
            'shares_count': self.shares_count,
            'comments_count': self.comments_count,
            'reach': self.reach,
            'engagement_rate': self.engagement_rate,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class SocialAnalytics(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'social_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('social_accounts.id'), nullable=True)
    date = db.Column(db.Date, nullable=False)
    platform = db.Column(db.String(50), nullable=False)
    followers_gained = db.Column(db.Integer, default=0)
    followers_lost = db.Column(db.Integer, default=0)
    posts_published = db.Column(db.Integer, default=0)
    total_likes = db.Column(db.Integer, default=0)
    total_shares = db.Column(db.Integer, default=0)
    total_comments = db.Column(db.Integer, default=0)
    total_reach = db.Column(db.Integer, default=0)
    total_impressions = db.Column(db.Integer, default=0)
    engagement_rate = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='social_analytics')
    account = db.relationship('SocialAccount', backref='analytics')
    
    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'date': self.date.isoformat() if self.date else None,
            'platform': self.platform,
            'followers_gained': self.followers_gained,
            'followers_lost': self.followers_lost,
            'posts_published': self.posts_published,
            'total_likes': self.total_likes,
            'total_shares': self.total_shares,
            'total_comments': self.total_comments,
            'total_reach': self.total_reach,
            'total_impressions': self.total_impressions,
            'engagement_rate': self.engagement_rate,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class VideoRoom(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'video_rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.String(100), unique=True, nullable=False)
    room_type = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    max_participants = db.Column(db.Integer, default=8)
    is_active = db.Column(db.Boolean, default=True)
    requires_permission = db.Column(db.Boolean, default=False)
    allow_screen_sharing = db.Column(db.Boolean, default=True)
    allow_recording = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    squad_id = db.Column(db.Integer, db.ForeignKey('squad.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    squad = db.relationship('Squad', backref='video_rooms')
    
    def serialize(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'room_type': self.room_type,
            'name': self.name,
            'description': self.description,
            'max_participants': self.max_participants,
            'is_active': self.is_active,
            'requires_permission': self.requires_permission,
            'allow_screen_sharing': self.allow_screen_sharing,
            'allow_recording': self.allow_recording,
            'created_by': self.created_by,
            'squad_id': self.squad_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'creator_name': self.creator.username if self.creator else None
        }

# User presence and video chat status
class UserPresence(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'user_presence'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    online_status = db.Column(db.String(20), default='offline')
    current_room_id = db.Column(db.String(100), nullable=True)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    video_enabled = db.Column(db.Boolean, default=True)
    audio_enabled = db.Column(db.Boolean, default=True)
    screen_sharing = db.Column(db.Boolean, default=False)
    current_game = db.Column(db.String(200), nullable=True)
    gaming_status = db.Column(db.String(100), nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='presence')
    
    def serialize(self):
        return {
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'gamertag': getattr(self.user, 'gamertag', None) if self.user else None,
            'online_status': self.online_status,
            'current_room_id': self.current_room_id,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'video_enabled': self.video_enabled,
            'audio_enabled': self.audio_enabled,
            'screen_sharing': self.screen_sharing,
            'current_game': self.current_game,
            'gaming_status': self.gaming_status
        }

# Video chat session tracking
class VideoChatSession(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'video_chat_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    left_at = db.Column(db.DateTime, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)
    had_video = db.Column(db.Boolean, default=False)
    had_audio = db.Column(db.Boolean, default=False)
    shared_screen = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default='participant')
    
    # Relationships
    user = db.relationship('User')
    
    def serialize(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'left_at': self.left_at.isoformat() if self.left_at else None,
            'duration_minutes': self.duration_minutes,
            'had_video': self.had_video,
            'had_audio': self.had_audio,
            'shared_screen': self.shared_screen,
            'role': self.role
        }

# Communication preferences (extends existing user model)
class CommunicationPreferences(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'communication_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    auto_join_squad_room = db.Column(db.Boolean, default=True)
    allow_random_invites = db.Column(db.Boolean, default=False)
    preferred_communication = db.Column(db.ARRAY(db.String), default=['Voice Chat', 'Video Chat'])
    notify_squad_online = db.Column(db.Boolean, default=True)
    notify_game_invites = db.Column(db.Boolean, default=True)
    notify_video_calls = db.Column(db.Boolean, default=True)
    preferred_video_quality = db.Column(db.String(20), default='720p')
    enable_noise_suppression = db.Column(db.Boolean, default=True)
    enable_echo_cancellation = db.Column(db.Boolean, default=True)
    
    # Relationships
    user = db.relationship('User', backref='comm_prefs')
    
    def serialize(self):
        return {
            'user_id': self.user_id,
            'auto_join_squad_room': self.auto_join_squad_room,
            'allow_random_invites': self.allow_random_invites,
            'preferred_communication': self.preferred_communication or [],
            'notify_squad_online': self.notify_squad_online,
            'notify_game_invites': self.notify_game_invites,
            'notify_video_calls': self.notify_video_calls,
            'preferred_video_quality': self.preferred_video_quality,
            'enable_noise_suppression': self.enable_noise_suppression,
            'enable_echo_cancellation': self.enable_echo_cancellation
        }

# Add this to your models.py if you want more advanced effect tracking

class VideoEffects(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'video_effects'
    
    id = db.Column(db.Integer, primary_key=True)
    clip_id = db.Column(db.Integer, db.ForeignKey('video_clips.id'), nullable=False)
    effect_type = db.Column(db.String(50), nullable=False)  # 'brightness', 'contrast', 'blur', etc.
    intensity = db.Column(db.Integer, default=50)  # 0-100
    parameters = db.Column(db.JSON, nullable=True)  # Additional effect parameters
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    applied_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    processed_url = db.Column(db.String(500), nullable=True)  # URL of processed video
    is_active = db.Column(db.Boolean, default=True)  # Can be disabled
    processing_time = db.Column(db.Float, nullable=True)  # Processing time in seconds
    
    # Relationships
    clip = db.relationship('VideoClip', backref='applied_effects')
    user = db.relationship('User', backref='video_effects_applied')
    
    def serialize(self):
        return {
            'id': self.id,
            'clip_id': self.clip_id,
            'effect_type': self.effect_type,
            'intensity': self.intensity,
            'parameters': self.parameters,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'applied_by': self.applied_by,
            'processed_url': self.processed_url,
            'is_active': self.is_active,
            'processing_time': self.processing_time
        }

# Also add this model for effect presets/templates
class EffectPreset(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'effect_presets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    effect_type = db.Column(db.String(50), nullable=False)
    default_intensity = db.Column(db.Integer, default=50)
    default_parameters = db.Column(db.JSON, nullable=True)
    thumbnail_url = db.Column(db.String(500), nullable=True)  # Preview image
    is_premium = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # User-created presets
    is_public = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='effect_presets_created')
    
    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'effect_type': self.effect_type,
            'default_intensity': self.default_intensity,
            'default_parameters': self.default_parameters,
            'thumbnail_url': self.thumbnail_url,
            'is_premium': self.is_premium,
            'created_by': self.created_by,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
class PodcastAccess(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'podcast_access'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'), nullable=False)
    access_type = db.Column(db.String(50), default='premium')
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)
    payment_amount = db.Column(db.Float)

# Fix the PodcastPurchase model in your models.py file

class PodcastPurchase(db.Model):
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # FIX: Change from 'episode.id' to 'podcast_episode.id' 
    # to match the actual table name
    episode_id = db.Column(db.Integer, db.ForeignKey('podcast_episode.id'))
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    platform_cut = db.Column(db.Float, default=0.10)  # 10% by default
    creator_earnings = db.Column(db.Float)            # 85% automatically calculated
    
    # Add relationships
    user = db.relationship('User', backref='podcast_purchases')
    episode = db.relationship('PodcastEpisode', backref='purchases')

class StationFollow(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'station_follows'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=False)
    followed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='station_follows')
    station = db.relationship('RadioStation', backref='followers')
    
    # Unique constraint to prevent duplicate follows
    __table_args__ = (db.UniqueConstraint('user_id', 'station_id'),)