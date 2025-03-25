
from flask_sqlalchemy import SQLAlchemy
# from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from datetime import datetime
from flask_socketio import SocketIO
from sqlalchemy.orm import relationship  # Add this line to import relationship
import stripe
from flask_socketio import SocketIO
socketio = SocketIO(cors_allowed_origins="*")  # ✅ Initialize without `app`

db = SQLAlchemy()
# bcrypt = Bcrypt()



# Role Model
class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # "Admin", "Creator", "Listener", "Radio DJ", "Podcaster"

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name
        }

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    artist_name = db.Column(db.String(80), unique=True, nullable=False)
    industry = db.Column(db.String(80), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_premium = db.Column(db.Boolean, default=False, server_default="False")
    avatar_url = db.Column(db.String(500))  # <-- add this line
    is_on_trial = db.Column(db.Boolean, default=False)
    trial_start_date = db.Column(db.DateTime, nullable=True)
    trial_end_date = db.Column(db.DateTime, nullable=True)

    # New Fields for Business & Display Name
    business_name = db.Column(db.String(255), nullable=True)
    display_name = db.Column(db.String(255), nullable=True)

    # Profile & Cover Picture
    profile_picture = db.Column(db.String(500), nullable=True)
    cover_photo = db.Column(db.String(500), nullable=True)

    # Radio & Podcast Links
    radio_station = db.Column(db.String(500), nullable=True)
    podcast = db.Column(db.String(500), nullable=True)

    # Social Media Links (Stored as JSON)
    social_links = db.Column(db.JSON, nullable=True)

    # Image Gallery (List of Image URLs)
    gallery = db.Column(db.JSON, default=[])

    # Video Gallery (List of Video URLs, Max 10)
    videos = db.Column(db.JSON, default=[])

    # Foreign Key for Role
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'))
    role = relationship("Role", backref="users")  # reference to the Role model

    def serialize(self):
        return {
            "id": self.id,
            "username": self.username,
            "artist_name": self.artist_name,
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
            "role": self.role.name if self.role else None  # Include role name if role exists
        }

class Like(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    content_id = db.Column(db.Integer, nullable=False)  # Can be podcast, radio station, or live stream
    content_type = db.Column(db.String(50), nullable=False)  # "podcast", "radio", "livestream"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("favorites", lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "created_at": self.created_at.isoformat(),
        }

class Analytics(db.Model):
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
    db.Column('audio_id', db.Integer, db.ForeignKey('audio.id'), primary_key=True)
)


class Audio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_url = db.Column(db.String(500), nullable=False)  # URL of the stored file
    duration = db.Column(db.Integer, nullable=True)  # Duration in seconds
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Many-to-Many relationship with PlaylistAudio
    playlists = db.relationship(
        'PlaylistAudio', secondary=playlist_audio_association, back_populates="audios"
    )

    user = db.relationship('User', backref=db.backref('audios', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "file_url": self.file_url,
            "duration": self.duration,
            "uploaded_at": self.uploaded_at.isoformat(),
            "playlists": [playlist.id for playlist in self.playlists],  # List of associated playlists
        }



class PlaylistAudio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Many-to-Many relationship with Audio
    audios = db.relationship(
        'Audio', secondary=playlist_audio_association, back_populates="playlists"
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
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content_id = db.Column(db.Integer, nullable=False)  # Can be audio or podcast
    content_type = db.Column(db.String(50), nullable=False)  # 'audio' or 'podcast'
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


class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_url = db.Column(db.String(500), nullable=False)  # Stored video file location
    thumbnail_url = db.Column(db.String(500), nullable=True)  # Optional thumbnail
    duration = db.Column(db.Integer, nullable=True)  # Video length in seconds
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('user_videos', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "file_url": self.file_url,
            "thumbnail_url": self.thumbnail_url,
            "duration": self.duration,
            "uploaded_at": self.uploaded_at.isoformat(),
        }


class VideoPlaylist(db.Model):
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
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)



class RadioStation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # 🔹 Public or Private
    is_public = db.Column(db.Boolean, default=True)  # ✅ Default: Public
    allowed_users = db.relationship('User', secondary='radio_access', backref='private_stations')

    # 🔹 Monetization Features
    is_subscription_based = db.Column(db.Boolean, default=False)  # ✅ Monthly Subscription Required?
    subscription_price = db.Column(db.Float, nullable=True)  # ✅ Monthly Fee
    is_ticketed = db.Column(db.Boolean, default=False)  # ✅ One-Time Ticket Required?
    ticket_price = db.Column(db.Float, nullable=True)  # ✅ Ticket Price for Entry
    followers_count = db.Column(db.Integer, default=0)  # ✅ Track Followers

    # 🔹 Live Streaming Features
    is_live = db.Column(db.Boolean, default=False)  # ✅ Live Status
    stream_url = db.Column(db.String(500), nullable=True)  # ✅ Streaming URL

    # 🔹 WebRTC & Interactive Features
    is_webrtc_enabled = db.Column(db.Boolean, default=False)  # ✅ Allow Listener Calls?
    max_listeners = db.Column(db.Integer, default=100)  # ✅ Max Concurrent Listeners

    # 🔹 Station Branding
    logo_url = db.Column(db.String(500), nullable=True)  # ✅ Station Logo
    cover_image_url = db.Column(db.String(500), nullable=True)  # ✅ Station Cover Image

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref=db.backref('radio_stations', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "is_public": self.is_public,
            "allowed_users": [user.id for user in self.allowed_users] if not self.is_public else [],
            "is_subscription_based": self.is_subscription_based,
            "subscription_price": self.subscription_price,
            "is_ticketed": self.is_ticketed,
            "ticket_price": self.ticket_price,
            "followers_count": self.followers_count,
            "is_live": self.is_live,
            "stream_url": self.stream_url,
            "is_webrtc_enabled": self.is_webrtc_enabled,
            "max_listeners": self.max_listeners,
            "logo_url": self.logo_url,
            "cover_image_url": self.cover_image_url,
            "created_at": self.created_at.isoformat()
        }

class RadioPlaylist(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, nullable=False)
    track_id = db.Column(db.Integer, nullable=False)
    station_name = db.Column(db.String(255), nullable=False)
    submission_status = db.Column(db.String(50), default="Pending")

class LiveStream(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=True)  # Optional for radio stations
    stream_key = db.Column(db.String(255), unique=True, nullable=False)  # Unique key per session
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    thumbnail_url = db.Column(db.String(500), nullable=True)  # Optional thumbnail
    is_live = db.Column(db.Boolean, default=False)  # Indicates whether the user is live
    started_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('live_streams', lazy=True))
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
    # has_live_chat = db.Column(db.Boolean, default=True)  # Enable chat functionality
    # chat_messages = db.relationship('LiveChat', backref='live_studio', lazy=True)
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
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    live_studio_id = db.Column(db.Integer, db.ForeignKey('live_studio.id'), nullable=False)  # Foreign Key added
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

      # ✅ Ensure it matches the new backref 'studio_chat'
    user = db.relationship("User", backref="chat_messages")


class PodcastEpisode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # ✅ Storage & Metadata
    file_url = db.Column(db.String(500), nullable=False)  # Audio File
    cover_art_url = db.Column(db.String(500), nullable=True)
    duration = db.Column(db.Integer, nullable=True)

    # ✅ Premium & Scheduling
    is_premium = db.Column(db.Boolean, default=False)  # Paid content
    is_published = db.Column(db.Boolean, default=False)  # Mark as live
    release_date = db.Column(db.DateTime, nullable=True)  # Scheduled release

    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('podcast_episodes', lazy=True))

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
            "uploaded_at": self.uploaded_at.isoformat()
        }

class PodcastClip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    clip_url = db.Column(db.String(255), nullable=False)
    start_time = db.Column(db.Integer, nullable=False)  # In seconds
    end_time = db.Column(db.Integer, nullable=False)
    shared_platform = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Podcast(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    host_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # ✅ Audio & Video Storage
    audio_url = db.Column(db.String(500), nullable=True)
    video_url = db.Column(db.String(500), nullable=True)
    cover_art_url = db.Column(db.String(500), nullable=True)

    # ✅ Monetization & Stripe Integration
    monetization_type = db.Column(db.String(50), default="free")  # "free", "paid", "ad-supported"
    price_per_episode = db.Column(db.Float, nullable=True, default=0.00)
    subscription_tier = db.Column(db.String(50), default="Free")
    stripe_product_id = db.Column(db.String(255), nullable=True)  # ✅ Stripe product ID
    sponsor = db.Column(db.String(255), nullable=True)  # Optional sponsor name
    donation_link = db.Column(db.String(255), nullable=True)

    # ✅ Revenue Tracking
    total_revenue = db.Column(db.Float, default=0.00)  # Total revenue from all sources
    revenue_from_subscriptions = db.Column(db.Float, default=0.00)
    revenue_from_ads = db.Column(db.Float, default=0.00)
    revenue_from_sponsorships = db.Column(db.Float, default=0.00)
    revenue_from_donations = db.Column(db.Float, default=0.00)
    stripe_transaction_ids = db.Column(db.JSON, default=[])  # Store Stripe transactions as an array

    # ✅ Engagement & Social Features
    views = db.Column(db.Integer, default=0)
    likes = db.Column(db.Integer, default=0)
    shares = db.Column(db.Integer, default=0)

    # ✅ Live Streaming Feature
    streaming_enabled = db.Column(db.Boolean, default=False)
    is_live = db.Column(db.Boolean, default=False)
    stream_url = db.Column(db.String(500), nullable=True)
    live_replay_url = db.Column(db.String(500), nullable=True)
    scheduled_time = db.Column(db.DateTime, nullable=True)

    # ✅ Episode Scheduling
    scheduled_release = db.Column(db.DateTime, nullable=True)
    exclusive_until = db.Column(db.DateTime, nullable=True)

    # ✅ Series Information
    series_name = db.Column(db.String(255), nullable=True)
    season_number = db.Column(db.Integer, nullable=True)
    episode_number = db.Column(db.Integer, nullable=True)
    ad_insertion = db.Column(db.Boolean, default=False)

    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('podcasts', lazy=True))

    # ✅ Create Stripe Product for Monetization
    def create_stripe_product(self):
        """Creates a Stripe product for the podcast."""
        if not self.stripe_product_id:
            product = stripe.Product.create(name=self.title)
            self.stripe_product_id = product["id"]
            db.session.commit()

    # ✅ Revenue Calculation Method
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
            "host_id": self.host_id,
            "title": self.title,
            "description": self.description,
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
            "uploaded_at": self.uploaded_at.isoformat(),
            # ✅ Revenue Data
            "total_revenue": self.total_revenue,
            "revenue_from_subscriptions": self.revenue_from_subscriptions,
            "revenue_from_ads": self.revenue_from_ads,
            "revenue_from_sponsorships": self.revenue_from_sponsorships,
            "revenue_from_donations": self.revenue_from_donations,
            "stripe_transaction_ids": self.stripe_transaction_ids
        }



    

class PodcastHost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, db.ForeignKey('podcast.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)


class PricingPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # "Basic", "Pro", "Premium"
    price_monthly = db.Column(db.Float, nullable=False)
    price_yearly = db.Column(db.Float, nullable=False)
    trial_days = db.Column(db.Integer, default=14)  # ✅ Free Trial Support
    includes_podcasts = db.Column(db.Boolean, default=False)  # ✅ Podcast Plan
    includes_radio = db.Column(db.Boolean, default=False)  # ✅ Radio Plan
    includes_digital_sales = db.Column(db.Boolean, default=False)  # ✅ Sell Digital Products
    includes_merch_sales = db.Column(db.Boolean, default=False)  # ✅ Sell Physical Products
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "price_monthly": self.price_monthly,
            "price_yearly": self.price_yearly,
            "trial_days": self.trial_days,
            "includes_podcasts": self.includes_podcasts,
            "includes_radio": self.includes_radio,
            "includes_digital_sales": self.includes_digital_sales,
            "includes_merch_sales": self.includes_merch_sales,
            "created_at": self.created_at.isoformat()
        }


class Subscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('pricing_plan.id'), nullable=False)  # Links to PricingPlan
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)  # Stripe Subscription ID
    start_date = db.Column(db.DateTime, default=datetime.utcnow)  # When the subscription started
    end_date = db.Column(db.DateTime, nullable=True)  # When the subscription expires
    grace_period_end = db.Column(db.DateTime, nullable=True)  # Soft expiration (e.g., 7-day grace period)
    auto_renew = db.Column(db.Boolean, default=True)  # Whether the subscription renews automatically
    billing_cycle = db.Column(db.String(20), default="monthly")  # Monthly, yearly, etc.
    status = db.Column(db.String(20), default="active")  # active, canceled, expired

    user = db.relationship('User', backref=db.backref('subscriptions', lazy=True))
    plan = db.relationship('PricingPlan', backref=db.backref('subscriptions', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "grace_period_end": self.grace_period_end.isoformat() if self.grace_period_end else None,
            "auto_renew": self.auto_renew,
            "billing_cycle": self.billing_cycle,
            "status": self.status
        }
    
class SubscriptionPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # "Podcast Only", "Radio Only", "All Access"
    price_monthly = db.Column(db.Float, nullable=False)
    price_yearly = db.Column(db.Float, nullable=False)
    features = db.Column(db.Text, nullable=True)  # List of features
    includes_podcasts = db.Column(db.Boolean, default=False)  # ✅ New field
    includes_radio = db.Column(db.Boolean, default=False)  # ✅ New field

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "price_monthly": self.price_monthly,
            "price_yearly": self.price_yearly,
            "features": self.features.split(";") if self.features else [],
            "includes_podcasts": self.includes_podcasts,
            "includes_radio": self.includes_radio,
        }


class UserSubscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plan.id'), nullable=True)  # Platform-wide plan
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=True)  # If subscribing to a station
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref=db.backref('user_subscriptions', lazy=True))
    plan = db.relationship('SubscriptionPlan', backref=db.backref('user_subscriptions', lazy=True))
    station = db.relationship('RadioStation', backref=db.backref('station_subscriptions', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "station_id": self.station_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat() if self.end_date else None
        }

class TicketPurchase(db.Model):
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



class PodcastSubscription(db.Model):
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
    __tablename__ = "track"
    id = db.Column(db.Integer, primary_key=True)
    radio_playlist_id = db.Column(db.Integer, db.ForeignKey("radio_playlist.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    artist = db.Column(db.String(255), nullable=True)
    file_url = db.Column(db.String(255), nullable=False)  # Audio file URL


class Music(db.Model):
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

class MusicLicensing(db.Model):
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



# One-Time Donations
class CreatorDonation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    supporter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Anonymous support possible
    amount = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', foreign_keys=[creator_id], backref=db.backref('donations_received', lazy=True))
    supporter = db.relationship('User', foreign_keys=[supporter_id], backref=db.backref('donations_made', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "supporter_id": self.supporter_id,
            "amount": self.amount,
            "message": self.message,
            "created_at": self.created_at.isoformat()
        }

# Ad Revenue Sharing
class AdRevenue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    revenue_amount = db.Column(db.Float, nullable=False)
    period = db.Column(db.String(50), nullable=False)  # e.g., "January 2025"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', backref=db.backref('ad_revenue', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "creator_id": self.creator_id,
            "revenue_amount": self.revenue_amount,
            "period": self.period,
            "created_at": self.created_at.isoformat()
        }
    

# Initialize Stripe
stripe.api_key = "your_stripe_secret_key"

# Creator Membership Tiers
class CreatorMembershipTier(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    content_id = db.Column(db.Integer, nullable=False)  # Can be podcast, radio, or live stream
    content_type = db.Column(db.String(50), nullable=False)  # "podcast", "radio", "livestream"
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.Integer, nullable=True)  # ✅ Now supports timestamps for podcasts
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("comments", lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content_id": self.content_id,
            "content_type": self.content_type,
            "text": self.text,
            "timestamp": self.timestamp,  # ✅ Show timestamp if it exists
            "created_at": self.created_at.isoformat(),
        }
    
class PodcastChapter(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, nullable=False)
    role = db.Column(db.String(255), nullable=False)
    available = db.Column(db.Boolean, default=True)

class LicensingOpportunity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, nullable=False)
    track_id = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default="Pending")

class IndieStation(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey('indie_station.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class LiveEvent(db.Model):
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

    # ✅ Remove backref and just define a one-to-many relationship
    tickets = db.relationship('EventTicket', lazy=True)

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
        }



class EventTicket(db.Model):
    """Represents a ticket purchase for live events."""
    __tablename__ = "event_ticket"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Who bought the ticket
    event_id = db.Column(db.Integer, db.ForeignKey('live_event.id'), nullable=False)  # Which event the ticket is for
    price_paid = db.Column(db.Float, nullable=False)
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ✅ Add back_populates and overlaps to fix warning
    event = db.relationship("LiveEvent", back_populates="tickets", overlaps="tickets")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "price_paid": self.price_paid,
            "purchased_at": self.purchased_at.isoformat(),
        }

class RadioTrack(db.Model):
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

class RadioFollower(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'), nullable=False)
    followed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "station_id": self.station_id,
            "followed_at": self.followed_at.isoformat(),
        }

class Payout(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)  # Creator or platform revenue
    revenue_type = db.Column(db.String(50), nullable=False)  # e.g., 'subscription', 'ad', 'music', 'donation'
    amount = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="revenues")  # Relate revenue to user

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "revenue_type": self.revenue_type,
            "amount": self.amount,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        }
    
# models/listening_party.py

class ListeningParty(db.Model):
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
    __tablename__ = 'listening_party_attendee'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    party_id = db.Column(db.Integer, db.ForeignKey('listening_party.id'), nullable=False)
    payment_status = db.Column(db.String(50), default='paid')  # or 'pending', 'refunded'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

class Album(db.Model):
    __tablename__ = 'album'

    id = db.Column(db.Integer, primary_key=True)
    artist_id = db.Column(db.Integer, db.ForeignKey('artist.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    release_date = db.Column(db.Date)
    cover_art_url = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Artist(db.Model):
    __tablename__ = 'artist'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    avatar_url = db.Column(db.String(255))

    albums = db.relationship('Album', backref='artist', lazy=True)
    listening_parties = db.relationship('ListeningParty', backref='artist', lazy=True)

class Purchase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'))
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "user_id": self.user_id,
            "product_id": self.product_id,
            "purchased_at": self.purchased_at.isoformat(),
        }

class RefundRequest(db.Model):
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
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Engagement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, nullable=False)
    views = db.Column(db.Integer)
    plays = db.Column(db.Integer)
    # Add more fields as needed
    
class Earnings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Float)
    adRevenue = db.Column(db.Float)
    subscriptionRevenue = db.Column(db.Float)
    donationRevenue = db.Column(db.Float)
    # Add more fields as needed

class Popularity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    podcast_id = db.Column(db.Integer, nullable=False)
    popularity_score = db.Column(db.Integer)
    # Add more fields as needed
