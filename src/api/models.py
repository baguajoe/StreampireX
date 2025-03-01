
from flask_sqlalchemy import SQLAlchemy
# from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from datetime import datetime
import stripe

db = SQLAlchemy()
# bcrypt = Bcrypt()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_premium = db.Column(db.Boolean, default=False)  # Subscription feature
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Hash password before saving
    # def set_password(self, password):
        # self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    # def check_password(self, password):
        # return bcrypt.check_password_hash(self.password_hash, password)

    def generate_token(self):
        return create_access_token(identity=self.id)

    def serialize(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "is_premium": self.is_premium,
            "created_at": self.created_at.isoformat(),
        }

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
    
    user = db.relationship('User', backref=db.backref('videos', lazy=True))

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


class LiveChat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    stream_id = db.Column(db.Integer, db.ForeignKey('live_stream.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('chat_messages', lazy=True))
    live_stream = db.relationship('LiveStream', backref=db.backref('chat_messages', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "stream_id": self.stream_id,
            "message": self.message,
            "sent_at": self.sent_at.isoformat(),
        }

class PodcastEpisode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_url = db.Column(db.String(500), nullable=False)
    duration = db.Column(db.Integer, nullable=True)
    cover_art_url = db.Column(db.String(500), nullable=True)
    is_premium = db.Column(db.Boolean, default=False)  # New field for premium access
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('podcast_episodes', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "file_url": self.file_url if not self.is_premium else "Restricted for premium users",
            "cover_art_url": self.cover_art_url,
            "is_premium": self.is_premium,
            "uploaded_at": self.uploaded_at.isoformat(),
        }


class Podcast(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cover_art_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('podcasts', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "cover_art_url": self.cover_art_url,
            "created_at": self.created_at.isoformat(),
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




class RadioStation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_live = db.Column(db.Boolean, default=False)  # True if user is live streaming
    stream_url = db.Column(db.String(500), nullable=True)  # Live stream URL
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('radio_stations', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "is_live": self.is_live,
            "stream_url": self.stream_url,
            "created_at": self.created_at.isoformat(),
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

class SubscriptionPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    price_monthly = db.Column(db.Float, nullable=False)
    price_yearly = db.Column(db.Float, nullable=False)
    features = db.Column(db.Text, nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "price_monthly": self.price_monthly,
            "price_yearly": self.price_yearly,
            "features": self.features.split(";") if self.features else []
        }

class UserSubscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plan.id'), nullable=False)
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref=db.backref('subscriptions', lazy=True))
    plan = db.relationship('SubscriptionPlan', backref=db.backref('subscriptions', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat() if self.end_date else None
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
