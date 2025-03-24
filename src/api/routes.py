"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint, send_from_directory, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import  db, User, PodcastEpisode, PodcastSubscription, StreamingHistory, RadioPlaylist, RadioStation, LiveStream, LiveChat, CreatorMembershipTier,CreatorDonation, AdRevenue, SubscriptionPlan, UserSubscription, Video,VideoPlaylist, VideoPlaylistVideo, Audio, PlaylistAudio, Podcast,ShareAnalytics, Like, Favorite, Comment, Notification, PricingPlan,Subscription, Product, RadioDonation, Role, RadioSubscription, MusicLicensing, PodcastHost, PodcastChapter, RadioSubmission, Collaboration, LicensingOpportunity, Track, Music, LiveStream, IndieStation, IndieStationTrack, IndieStationFollower, EventTicket, LiveStudio, PodcastClip, TicketPurchase, Analytics, ShareAnalytics, Payout, Revenue, Payment, Order, RefundRequest, Purchase, Artist, Album, ListeningPartyAttendee, ListeningParty
from api.utils import generate_sitemap, APIException
from sqlalchemy import func, desc
from datetime import timedelta  # for trial logic or date math
from flask_cors import CORS
from flask_apscheduler import APScheduler
import uuid
import ffmpeg
import requests 
import whisper  # ✅ AI Transcription Support
import subprocess
# import moviepy
from moviepy import AudioFileClip
from moviepy.video.io.ffmpeg_tools import ffmpeg_extract_subclip

import stripe
import os
from flask_socketio import SocketIO




# Initialize Stripe
stripe.api_key = "your_stripe_secret_key"

api = Blueprint('api', __name__)

marketplace = Blueprint('marketplace', __name__)

scheduler = APScheduler()

# ✅ Define upload directories
AUDIO_UPLOAD_DIR = "uploads/podcasts/audio"
VIDEO_UPLOAD_DIR = "uploads/podcasts/video"
CLIP_UPLOAD_DIR = "uploads/podcasts/clips"
COVER_UPLOAD_DIR = "uploads/podcasts/covers"
UPLOAD_FOLDER = "uploads/music"
UPLOAD_FOLDER = "uploads/podcasts"
CLIP_FOLDER = "uploads/clips"

UPLOAD_FOLDER = "uploads/podcasts"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(AUDIO_UPLOAD_DIR, exist_ok=True)
os.makedirs(VIDEO_UPLOAD_DIR, exist_ok=True)
os.makedirs(CLIP_UPLOAD_DIR, exist_ok=True)
os.makedirs(COVER_UPLOAD_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CLIP_FOLDER, exist_ok=True)

# ✅ Load Whisper AI Model Once
whisper_model = whisper.load_model("base")

# Allow CORS requests to this API
CORS(api)

from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from flask_socketio import SocketIO
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
import os
from datetime import datetime

socketio = SocketIO(cors_allowed_origins="*")

UPLOAD_FOLDER = 'uploads/videos'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Ensure upload directory exists

# ---------------- VIDEO UPLOAD ----------------
@api.route('/upload_video', methods=['POST'])
@jwt_required()
def upload_video():
    user_id = get_jwt_identity()

    if 'video' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    video = request.files['video']
    title = request.form.get('title', 'Untitled')
    description = request.form.get('description', '')

    if video.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(video.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    video.save(file_path)

    new_video = Video(
        user_id=user_id,
        title=title,
        description=description,
        file_url=file_path,
        uploaded_at=datetime.utcnow()
    )
    db.session.add(new_video)
    db.session.commit()

    return jsonify({"message": "Video uploaded successfully", "video": new_video.serialize()}), 201

# ---------------- GET VIDEOS ----------------
@api.route('/videos', methods=['GET'])
def get_videos():
    videos = Video.query.all()
    return jsonify([video.serialize() for video in videos]), 200

# ---------------- PLAYLIST MANAGEMENT ----------------
@api.route('/create_playlist', methods=['POST'])
@jwt_required()
def create_playlist():
    user_id = get_jwt_identity()
    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"error": "Playlist name is required"}), 400

    new_playlist = VideoPlaylist(user_id=user_id, name=name)
    db.session.add(new_playlist)
    db.session.commit()

    return jsonify({"message": "Playlist created", "playlist": new_playlist.serialize()}), 201

@api.route('/playlist/add_video', methods=['POST'])
@jwt_required()
def add_video_to_playlist():
    data = request.json
    playlist_id = data.get("playlist_id")
    video_id = data.get("video_id")

    if not playlist_id or not video_id:
        return jsonify({"error": "Playlist ID and Video ID required"}), 400

    new_entry = VideoPlaylistVideo(playlist_id=playlist_id, video_id=video_id)
    db.session.add(new_entry)
    db.session.commit()

    return jsonify({"message": "Video added to playlist"}), 200

# ---------------- LIVE STREAMING ----------------
@api.route('/start_stream', methods=['POST'])
@jwt_required()
def start_stream():
    user_id = get_jwt_identity()
    data = request.json
    title = data.get("title", "Live Stream")
    description = data.get("description", "")

    new_stream = LiveStream(
        user_id=user_id,
        stream_key=f"user_{user_id}_stream",
        title=title,
        description=description,
        is_live=True,
        started_at=datetime.utcnow()
    )
    db.session.add(new_stream)
    db.session.commit()

    return jsonify({"message": "Live stream started", "stream": new_stream.serialize()}), 201

@api.route('/podcast/start_live/<int:podcast_id>', methods=['POST'])
@jwt_required()
def start_live_podcast(podcast_id):
    """Start a live podcast session"""
    user_id = get_jwt_identity()
    podcast = Podcast.query.get_or_404(podcast_id)

    if podcast.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    podcast.is_live = True
    podcast.stream_url = f"https://streampirex.com/live/{podcast_id}"  # Replace with actual streaming server URL
    db.session.commit()

    socketio.emit('podcast_live', {"podcast_id": podcast_id, "stream_url": podcast.stream_url})
    return jsonify({"message": "Live podcast started", "stream_url": podcast.stream_url}), 200


# ---------------- LIVE CHAT ----------------
@socketio.on('send_message')
def handle_message(data):
    user_id = data.get('user_id')
    stream_id = data.get('stream_id')
    message = data.get('message')

    new_message = LiveChat(user_id=user_id, stream_id=stream_id, message=message)
    db.session.add(new_message)
    db.session.commit()

    socketio.emit('receive_message', {
        "user_id": user_id,
        "stream_id": stream_id,
        "message": message
    }, broadcast=True)

@api.route('/podcast/download/<int:episode_id>', methods=['GET'])
def download_podcast_episode(episode_id):
    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404
    return jsonify({"download_url": episode.file_url})

@api.route('/upload_podcast', methods=['POST'])
@jwt_required()
def upload_podcast():
    """Unified route: Users can upload podcasts globally or to their profile."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # ✅ Ensure required fields
    title = request.form.get('title', '').strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    description = request.form.get('description', '')
    category = request.form.get('category', 'General')
    subscription_tier = request.form.get('subscription_tier', 'Free')
    is_premium = request.form.get('is_premium', 'false').lower() == 'true'
    streaming_enabled = request.form.get('streaming_enabled', 'false').lower() == 'true'
    is_profile_upload = request.form.get('profile_upload', 'false').lower() == 'true'

    # ✅ Securely handle audio file
    audio_url = None
    audio_duration = None
    if 'audio' in request.files:
        audio = request.files['audio']
        audio_filename = secure_filename(audio.filename)
        audio_path = os.path.join(AUDIO_UPLOAD_DIR, audio_filename)
        audio.save(audio_path)
        audio_url = audio_path

        # ✅ Extract duration from audio file
        try:
            audio_clip = AudioFileClip(audio_path)
            audio_duration = int(audio_clip.duration)  # Store in seconds
            audio_clip.close()
        except Exception as e:
            print(f"Error extracting audio duration: {e}")

    # ✅ Securely handle video file
    video_url = None
    video_duration = None
    if 'video' in request.files:
        video = request.files['video']
        video_filename = secure_filename(video.filename)
        video_path = os.path.join(VIDEO_UPLOAD_DIR, video_filename)
        video.save(video_path)
        video_url = video_path

        # ✅ Extract duration from video file
        try:
            video_clip = AudioFileClip(video_path)
            video_duration = int(video_clip.duration)  # Store in seconds
            video_clip.close()
        except Exception as e:
            print(f"Error extracting video duration: {e}")

    # ✅ Securely handle cover art
    cover_art_url = None
    if 'cover_art' in request.files:
        cover_art = request.files['cover_art']
        cover_filename = secure_filename(cover_art.filename)
        cover_path = os.path.join(COVER_UPLOAD_DIR, cover_filename)
        cover_art.save(cover_path)
        cover_art_url = cover_path

    # ✅ AI-Generated Transcription (Optional)
    transcription = None
    if audio_url:
        try:
            model = whisper.load_model("base")
            result = model.transcribe(audio_url)
            transcription = result["text"]
        except Exception as e:
            transcription = f"Transcription failed: {e}"

    # ✅ Assign an episode number if part of a series
    latest_episode = Podcast.query.filter_by(user_id=user_id, category=category).order_by(Podcast.episode_number.desc()).first()
    episode_number = latest_episode.episode_number + 1 if latest_episode else 1

    # ✅ Create a Stripe Product for Monetization
    stripe_product_id = None
    if is_premium:
        try:
            stripe_product = stripe.Product.create(name=title)
            stripe_product_id = stripe_product["id"]
        except Exception as e:
            print(f"Stripe product creation failed: {e}")

    # ✅ Create a new podcast entry (for global or profile uploads)
    new_podcast = Podcast(
        user_id=user_id,
        title=title,
        description=description,
        category=category,
        subscription_tier=subscription_tier,
        is_premium=is_premium,
        streaming_enabled=streaming_enabled,
        audio_url=audio_url,
        video_url=video_url,
        cover_art_url=cover_art_url,
        uploaded_at=datetime.utcnow(),
        transcription=transcription,
        duration=audio_duration or video_duration,  # ✅ Store duration
        episode_number=episode_number,  # ✅ Store episode number
        stripe_product_id=stripe_product_id  # ✅ Store Stripe product ID
    )

    db.session.add(new_podcast)
    db.session.commit()

    # ✅ Determine redirect URL (Global Page or Profile Page)
    redirect_url = "/profile" if is_profile_upload else "/podcasts"

    return jsonify({
        "message": "Podcast uploaded successfully",
        "redirect": redirect_url,
        "podcast": new_podcast.serialize()
    }), 201


@api.route('/podcast/<int:podcast_id>/episode/<int:episode_id>', methods=['GET'])
@jwt_required()
def get_podcast_episode(podcast_id, episode_id):
    user_id = get_jwt_identity()
    episode = PodcastEpisode.query.filter_by(id=episode_id, podcast_id=podcast_id).first()

    if not episode:
        return jsonify({"error": "Episode not found"}), 404

    # If the episode is premium, check if user has an active subscription
    if episode.is_premium:
        subscription = Subscription.query.filter_by(user_id=user_id).first()
        if not subscription or subscription.status != "active":
            return jsonify({"error": "You need a subscription to access this episode"}), 403

    return jsonify(episode.serialize()), 200

@api.route('/podcast/recommendations/<int:user_id>', methods=['GET'])
@jwt_required()
def get_podcast_recommendations(user_id):
    from sqlalchemy.sql import func

    # Fetch the top 3 most listened-to genres by the user
    user_genres = db.session.query(PodcastEpisode.genre, func.count(PodcastEpisode.id))\
        .join(StreamingHistory, StreamingHistory.content_id == PodcastEpisode.id)\
        .filter(StreamingHistory.user_id == user_id)\
        .group_by(PodcastEpisode.genre)\
        .order_by(func.count(PodcastEpisode.id).desc())\
        .limit(3).all()

    if not user_genres:
        return jsonify({"message": "No recommendations available yet"}), 200

    # Fetch new episodes from these genres
    recommended_episodes = PodcastEpisode.query.filter(
        PodcastEpisode.genre.in_([genre[0] for genre in user_genres])
    ).order_by(PodcastEpisode.uploaded_at.desc()).limit(10).all()

    return jsonify([ep.serialize() for ep in recommended_episodes]), 200

@api.route('/podcast/<int:podcast_id>/episode/schedule', methods=['POST'])
@jwt_required()
def schedule_episode(podcast_id):
    data = request.json
    episode_id = data.get("episode_id")
    release_time = data.get("release_time")  # Format: "YYYY-MM-DD HH:MM:SS"

    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404

    episode.scheduled_release = datetime.strptime(release_time, "%Y-%m-%d %H:%M:%S")
    db.session.commit()

    scheduler.add_job(
        func=publish_episode,
        trigger="date",
        run_date=episode.scheduled_release,
        args=[episode_id]
    )
    
    return jsonify({"message": "Episode scheduled successfully"}), 200

def publish_episode(episode_id):
    episode = PodcastEpisode.query.get(episode_id)
    if episode:
        episode.is_published = True
        db.session.commit()

@api.route('/podcast/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_podcast():
    user_id = get_jwt_identity()
    data = request.json
    podcast_id = data.get("podcast_id")

    if not podcast_id:
        return jsonify({"error": "Podcast ID required"}), 400

    new_subscription = PodcastSubscription(user_id=user_id, podcast_id=podcast_id)
    db.session.add(new_subscription)
    db.session.commit()

    return jsonify({"message": "Subscribed successfully!"}), 200

@api.route('/podcast/premium/<int:episode_id>', methods=['GET'])
@jwt_required()
def get_premium_podcast(episode_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user.is_premium:
        return jsonify({"error": "This content is for premium users only."}), 403

    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404

    return jsonify({"podcast_url": episode.file_url})


@api.route('/radio/add_audio', methods=['POST'])
@jwt_required()
def add_audio_to_radio():
    data = request.json
    station_id = data.get("station_id")
    audio_id = data.get("audio_id")

    if not station_id or not audio_id:
        return jsonify({"error": "Station ID and Audio ID required"}), 400

    new_entry = RadioPlaylist(station_id=station_id, audio_id=audio_id)
    db.session.add(new_entry)
    db.session.commit()

    return jsonify({"message": "Audio added to radio station"}), 200

@api.route('/radio/create', methods=['POST'])
@jwt_required()
def create_radio_station():
    user_id = get_jwt_identity()
    data = request.json

    new_station = RadioStation(
        user_id=user_id,
        name=data["name"],
        description=data.get("description", ""),
        is_public=data.get("is_public", True)  # ✅ Allow public/private setting
    )

    db.session.add(new_station)
    db.session.commit()

    return jsonify({"message": "Radio Station Created!", "station": new_station.serialize()}), 201

@api.route('/radio/<int:station_id>/grant-access', methods=['POST'])
@jwt_required()
def grant_access(station_id):
    user_id = get_jwt_identity()
    data = request.json
    target_user_id = data.get("user_id")

    station = RadioStation.query.get(station_id)

    if not station or station.user_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    if station.is_public:
        return jsonify({"error": "This station is already public"}), 400

    user_to_add = User.query.get(target_user_id)
    if not user_to_add:
        return jsonify({"error": "User not found"}), 404

    station.allowed_users.append(user_to_add)
    db.session.commit()

    return jsonify({"message": "Access granted to user!"}), 200


@api.route('/radio/start_stream', methods=['POST'])
@jwt_required()
def start_radio_stream():
    user_id = get_jwt_identity()
    data = request.json
    station_id = data.get("station_id")

    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 403

    new_stream = LiveStream(station_id=station_id, stream_key=f"user_{user_id}_stream", is_live=True)
    db.session.add(new_stream)
    db.session.commit()

    return jsonify({"message": "Live stream started", "stream": new_stream.serialize()}), 201



@api.route("/radio/like", methods=["POST"])
@jwt_required()
def like_radio_station():
    data = request.json
    user_id = get_jwt_identity()

    existing_like = Like.query.filter_by(
        user_id=user_id, content_id=data["station_id"], content_type="radio"
    ).first()

    if existing_like:
        db.session.delete(existing_like)
        db.session.commit()
        return jsonify({"message": "Like removed"}), 200

    new_like = Like(
        user_id=user_id,
        content_id=data["station_id"],
        content_type="radio",
    )

    db.session.add(new_like)
    db.session.commit()

    return jsonify({"message": "Radio station liked"}), 201


@api.route("/radio/comments", methods=["POST"])
@jwt_required()
def comment_on_radio():
    data = request.json
    user_id = get_jwt_identity()

    new_comment = Comment(
        user_id=user_id,
        content_id=data["station_id"],
        content_type="radio",
        text=data["text"],
    )

    db.session.add(new_comment)
    db.session.commit()

    return jsonify({"message": "Comment added"}), 201

@api.route('/radio/<int:station_id>/follow', methods=['POST'])
@jwt_required()
def follow_radio_station(station_id):
    """Allows users to follow a radio station."""
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Station not found"}), 404

    if user_id in [u.id for u in station.allowed_users]:
        return jsonify({"message": "Already following this station"}), 200

    station.allowed_users.append(User.query.get(user_id))
    station.followers_count += 1  # Increment follower count
    db.session.commit()

    # 🔴 Notify WebSocket Clients
    socketio.emit(f"station-{station_id}-new-follower", {"stationId": station_id})

    return jsonify({"message": "Now following this station!"}), 200


@api.route('/radio/track-share', methods=['POST'])
@jwt_required()
def track_radio_share():
    data = request.json
    user_id = get_jwt_identity()

    new_share = ShareAnalytics(
        user_id=user_id,
        content_id=data['station_id'],
        content_type="radio",
        platform=data['platform']
    )

    db.session.add(new_share)
    db.session.commit()

    return jsonify({"message": "Radio share tracked successfully!"}), 201

@api.route('/admin/radio-stations', methods=['GET'])
@jwt_required()
def get_all_radio_stations():
    if not is_admin(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403
    stations = RadioStation.query.all()
    return jsonify([station.serialize() for station in stations]), 200

@api.route('/admin/radio-stations/<int:station_id>', methods=['DELETE'])
@jwt_required()
def delete_radio_station(station_id):
    if not is_admin(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403
    station = RadioStation.query.get(station_id)
    if not station:
        return jsonify({"error": "Radio station not found"}), 404
    db.session.delete(station)
    db.session.commit()
    return jsonify({"message": "Radio station deleted successfully"}), 200


@api.route('/subscriptions/subscribe', methods=['POST'])
@jwt_required()
def subscribe():
    user_id = get_jwt_identity()
    data = request.json
    plan_id = data.get("plan_id")

    plan = SubscriptionPlan.query.get(plan_id)
    if not plan:
        return jsonify({"error": "Plan not found"}), 404

    # Create a Stripe checkout session
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': plan.name},
                'unit_amount': int(plan.price_monthly * 100),
            },
            'quantity': 1,
        }],
        mode='subscription',
        success_url="https://yourapp.com/success",
        cancel_url="https://yourapp.com/cancel",
    )

    return jsonify({"checkout_url": session.url}), 200

@api.route('/subscriptions/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    user_id = get_jwt_identity()
    subscription = UserSubscription.query.filter_by(user_id=user_id).first()
    if not subscription:
        return jsonify({"message": "No active subscription"}), 200
    return jsonify(subscription.serialize()), 200

@api.route('/subscriptions/cancel', methods=['POST'])
@jwt_required()
def cancel_subscription():
    user_id = get_jwt_identity()
    subscription = UserSubscription.query.filter_by(user_id=user_id).first()

    if not subscription:
        return jsonify({"error": "No active subscription found"}), 404

    # Cancel in Stripe
    stripe.Subscription.delete(subscription.stripe_subscription_id)
    db.session.delete(subscription)
    db.session.commit()

    return jsonify({"message": "Subscription canceled successfully"}), 200

# API Routes

@api.route('/creator/ad_revenue', methods=['GET'])
@jwt_required()
def get_ad_revenue():
    user_id = get_jwt_identity()
    revenue = AdRevenue.query.filter_by(creator_id=user_id).all()
    return jsonify([r.serialize() for r in revenue]), 200

# API Routes
@api.route('/creator/membership_tiers', methods=['GET'])
def get_membership_tiers():
    tiers = CreatorMembershipTier.query.all()
    return jsonify([tier.serialize() for tier in tiers]), 200

@api.route('/creator/donate', methods=['POST'])
@jwt_required()
def donate_to_creator():
    user_id = get_jwt_identity()
    data = request.json
    creator_id = data.get("creator_id")
    amount = data.get("amount")
    message = data.get("message", "")

    if not creator_id or not amount:
        return jsonify({"error": "Missing required fields"}), 400

    new_donation = CreatorDonation(creator_id=creator_id, supporter_id=user_id, amount=amount, message=message)
    db.session.add(new_donation)
    db.session.commit()

    return jsonify({"message": "Donation successful", "donation": new_donation.serialize()}), 201


@api.route('/generate_clip', methods=['POST'])
@jwt_required()
def generate_clip():
    """Create a short preview clip (1-3 min) from a podcast"""
    user_id = get_jwt_identity()
    data = request.json
    podcast_id = data.get("podcast_id")
    start_time = data.get("start_time")  # In seconds
    end_time = data.get("end_time")  # In seconds
    format_type = data.get("format", "mp4")  # mp3 or mp4

    if not podcast_id or start_time is None or end_time is None:
        return jsonify({"error": "Podcast ID, start_time, and end_time are required"}), 400

    podcast = Podcast.query.get(podcast_id)
    if not podcast:
        return jsonify({"error": "Podcast not found"}), 404

    if end_time - start_time > 180:  # 180 seconds = 3 minutes
        return jsonify({"error": "Clip length cannot exceed 3 minutes"}), 400

    clip_filename = f"clip_{uuid.uuid4()}.{format_type}"
    clip_path = os.path.join(CLIP_FOLDER, clip_filename)

    try:
        # ✅ Extract Clip using FFmpeg
        ffmpeg.input(podcast.audio_url, ss=start_time, to=end_time).output(clip_path).run(overwrite_output=True)

        new_clip = PodcastClip(
            podcast_id=podcast_id,
            user_id=user_id,
            clip_url=clip_path,
            start_time=start_time,
            end_time=end_time
        )

        db.session.add(new_clip)
        db.session.commit()

        return jsonify({
            "message": "Clip created",
            "clip_url": f"/clips/{clip_filename}",
            "full_episode_url": f"/podcast/{podcast_id}"  # ✅ Redirect CTA
        }), 201

    except Exception as e:
        return jsonify({"error": f"Clip generation failed: {str(e)}"}), 500

@api.route('/track_share', methods=['POST'])
@jwt_required()
def track_share():
    """Track when a user shares a podcast clip"""
    user_id = get_jwt_identity()
    data = request.json
    clip_id = data.get("clip_id")
    platform = data.get("platform")  # YouTube, Twitter, Instagram

    if not clip_id or not platform:
        return jsonify({"error": "Clip ID and platform are required"}), 400

    clip = PodcastClip.query.get(clip_id)
    if not clip:
        return jsonify({"error": "Clip not found"}), 404

    clip.shared_platform = platform
    db.session.commit()

    new_share = ShareAnalytics(user_id=user_id, content_id=clip_id, content_type="podcast_clip", platform=platform)
    db.session.add(new_share)
    db.session.commit()

    return jsonify({"message": "Share tracked successfully!"}), 201


# ------------------ 🎬 SERVE CLIPS ------------------
@api.route('/clips/<filename>')
def serve_clip(filename):
    """Serve generated clips"""
    return (CLIP_FOLDER, filename)

if __name__ == "__main__":
    api.run(debug=True)

@api.route('/share-stats', methods=['GET'])
@jwt_required()
def get_share_stats():
    user_id = get_jwt_identity()

    podcasts_shares = ShareAnalytics.query.filter_by(user_id=user_id, content_type="podcast").count()
    radio_shares = ShareAnalytics.query.filter_by(user_id=user_id, content_type="radio").count()
    live_shares = ShareAnalytics.query.filter_by(user_id=user_id, content_type="livestream").count()

    return jsonify({
        "podcasts": podcasts_shares,
        "radioStations": radio_shares,
        "liveStreams": live_shares
    })

@api.route('/profiles', methods=['GET'])
def get_all_profiles():
    users = User.query.all()
    return jsonify([user.serialize() for user in users]), 200
send_from_directory
@api.route("/profile", methods=["GET"])
@jwt_required()
def get_user_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.serialize()), 200


@api.route('/public-podcasts', methods=['GET'])
def get_public_podcasts():
    podcasts = Podcast.query.all()
    return jsonify([podcast.serialize() for podcast in podcasts]), 200

@api.route('/api/public-radio-stations', methods=['GET'])
def get_public_radio_stations():
    stations = RadioStation.query.all()
    return jsonify([station.serialize() for station in stations]), 200


@api.route("/like", methods=["POST"])
@jwt_required()
def like_content():
    data = request.json
    user_id = get_jwt_identity()

    existing_like = Like.query.filter_by(
        user_id=user_id, content_id=data["content_id"], content_type=data["content_type"]
    ).first()

    if existing_like:
        db.session.delete(existing_like)
        db.session.commit()
        return jsonify({"message": "Like removed"}), 200

    new_like = Like(
        user_id=user_id,
        content_id=data["content_id"],
        content_type=data["content_type"],
    )

    db.session.add(new_like)
    db.session.commit()

    return jsonify({"message": "Content liked"}), 201


@api.route("/favorite", methods=["POST"])
@jwt_required()
def add_favorite():
    data = request.json
    user_id = get_jwt_identity()

    existing_favorite = Favorite.query.filter_by(
        user_id=user_id, content_id=data["content_id"], content_type=data["content_type"]
    ).first()

    if existing_favorite:
        db.session.delete(existing_favorite)
        db.session.commit()
        return jsonify({"message": "Removed from favorites"}), 200

    new_favorite = Favorite(
        user_id=user_id,
        content_id=data["content_id"],
        content_type=data["content_type"],
    )

    db.session.add(new_favorite)
    db.session.commit()

    return jsonify({"message": "Added to favorites"}), 201

@api.route("/favorites", methods=["GET"])
@jwt_required()
def get_favorites():
    user_id = get_jwt_identity()
    favorites = Favorite.query.filter_by(user_id=user_id).all()
    return jsonify([fav.serialize() for fav in favorites]), 200

@api.route("/comments/<content_type>/<int:content_id>", methods=["GET"])
def get_comments(content_type, content_id):
    comments = Comment.query.filter_by(content_type=content_type, content_id=content_id).all()
    return jsonify([comment.serialize() for comment in comments]), 200


@api.route("/comments", methods=["POST"])
@jwt_required()
def add_comment():
    data = request.json
    user_id = get_jwt_identity()

    new_comment = Comment(
        user_id=user_id,
        content_id=data["content_id"],
        content_type=data["content_type"],
        text=data["text"],
    )

    db.session.add(new_comment)
    db.session.commit()

    # Create a notification for the content owner
    content_owner_id = User.query.filter_by(id=data["content_owner_id"]).first()
    if content_owner_id:
        new_notification = Notification(
            user_id=content_owner_id.id,
            action_user_id=user_id,
            content_id=data["content_id"],
            content_type=data["content_type"],
            message="Someone commented on your content!",
        )
        db.session.add(new_notification)
        db.session.commit()

    return jsonify({"message": "Comment added"}), 201


@api.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    notifications = Notification.query.filter_by(user_id=user_id).all()
    return jsonify([notif.serialize() for notif in notifications]), 200


@api.route("/notifications/read", methods=["POST"])
@jwt_required()
def mark_notifications_as_read():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "Notifications marked as read"}), 200

UPLOAD_FOLDER = "uploads"
PROFILE_PIC_FOLDER = os.path.join(UPLOAD_FOLDER, "profile_pictures")
TRACKS_FOLDER = os.path.join(UPLOAD_FOLDER, "sample_tracks")
os.makedirs(PROFILE_PIC_FOLDER, exist_ok=True)
os.makedirs(TRACKS_FOLDER, exist_ok=True)

@api.route("/signup", methods=["POST"])
def create_signup():
    email = request.form.get("email")
    username = request.form.get("username")
    password = request.form.get("password")
    role = request.form.get("role", "Listener")
    artist_name = request.form.get("artist_name")
    own_rights = request.form.get("own_rights")
    industry = request.form.get("industry")

    

    # Check if Email Already Exists
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User already exists"}), 400

    hashed_password = generate_password_hash(password)

    # Handle Profile Picture Upload
    profile_picture = request.files.get("profile_picture")
    profile_pic_url = None
    if profile_picture:
        filename = secure_filename(profile_picture.filename)
        file_path = os.path.join(PROFILE_PIC_FOLDER, filename)
        profile_picture.save(file_path)
        profile_pic_url = f"/uploads/profile_pictures/{filename}"

    # Handle Sample Track Upload
    sample_track = request.files.get("sample_track")
    sample_track_url = None
    if sample_track:
        filename = secure_filename(sample_track.filename)
        file_path = os.path.join(TRACKS_FOLDER, filename)
        sample_track.save(file_path)
        sample_track_url = f"/uploads/sample_tracks/{filename}"
    role_exist = Role.query.filter_by(name=role).first()
    new_role = None
    if not role_exist:
        new_role=Role(name=role)
        db.session.add(new_role)
        db.session.commit()
        db.session.refresh(new_role)

    # Create New User
    new_user = User(
        email=email,
        username=username,
        password_hash=hashed_password,
        role=new_role.id if new_role else role_exist.id,
        artist_name=artist_name,
        industry=industry,
        
        
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created successfully!"}), 201

@api.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        # token = create_access_token(identity=user.id)
        token = create_access_token(identity=str(user.id))
        return jsonify({"message": "Login successful", "access_token": token, "user": user.serialize()}), 200
    return jsonify({"error": "Invalid email or password"}), 401



@api.route('/podcasts/category/<string:category>', methods=['GET'])
def get_podcasts_by_category(category):
    podcasts = Podcast.query.filter_by(category=category).all()
    return jsonify([podcast.serialize() for podcast in podcasts]), 200

@api.route('/podcasts/categories', methods=['GET'])
def get_podcast_categories():
    categories = [
        "Technology & Innovation", "AI & Machine Learning", "Cybersecurity & Privacy",
        "Blockchain & Crypto", "Gadgets & Consumer Tech", "Coding & Software Development",
        "Business & Finance", "Entrepreneurship & Startups", "Investing & Wealth Management",
        "Marketing & Branding", "Leadership & Productivity", "E-commerce & Dropshipping",
        "Health, Wellness & Fitness", "Mental Health & Mindfulness", "Holistic Healing & Alternative Medicine",
        "Nutrition & Dieting", "Fitness & Bodybuilding", "Martial Arts & Self-Defense",
        "Music, Entertainment & Pop Culture", "Music Industry & Artist Insights", "Film & TV Reviews",
        "Hip-Hop, Rap & Urban Culture", "Comedy & Stand-Up", "Celebrity Gossip & Reality TV",
        "Gaming & Esports", "Game Development", "Esports & Competitive Gaming", "Retro & Classic Gaming",
        "VR & AR Gaming", "Tabletop & Board Games", "Education & Learning", "Self-Development & Personal Growth",
        "History & Documentary Podcasts", "Language Learning", "Philosophy & Deep Thought",
        "Science & Space Exploration", "Storytelling, Fiction & True Crime", "Audio Dramas & Fiction",
        "True Crime & Investigative Journalism", "Supernatural & Paranormal", "Horror Podcasts",
        "Urban Legends & Conspiracies", "News, Politics & Society", "Daily News & Global Affairs",
        "Politics & Government", "Social Justice & Activism", "Economy & World Markets",
        "War, Conflict & Military History", "Sports & Outdoor Adventures", "Basketball & NBA",
        "Football & NFL", "Combat Sports & UFC", "Hiking, Camping & Survival", "Extreme Sports & Adventure",
        "Lifestyle, Relationships & Culture", "Relationships & Dating", "Parenting & Family",
        "Spirituality & Conscious Living", "Fashion & Style", "Food & Cooking", "Future Categories",
        "Esoteric & Mysticism", "Pet & Animal Care", "LGBTQ+ Voices", "DIY & Home Improvement",
        "Anime & Manga"
    ]
    return jsonify(categories), 200



@api.route('/radio/categories', methods=['GET'])
def get_radio_categories():
    categories = [
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
        "Afrobeat", "Caribbean & Soca", "French Chanson", "Bollywood & Indian",
        "Lo-Fi", "Meditation & Relaxation", "ASMR & White Noise", "Gaming OSTs", "Holiday Music"
    ]
    return jsonify(categories), 200


@api.route('/members', methods=['GET'])
@jwt_required()
def get_members():
    user_id = get_jwt_identity()

    # Get all members who subscribed to this user
    subscribers = Subscription.query.filter_by(user_id=user_id).count()

    # Get total likes and comments
    total_likes = Like.query.filter_by(content_creator_id=user_id).count()
    total_comments = Comment.query.filter_by(content_creator_id=user_id).count()

    # Get earnings
    total_earnings = db.session.query(db.func.sum(Subscription.price)).filter_by(user_id=user_id).scalar() or 0

    # Get member list
    members = Subscription.query.filter_by(user_id=user_id).all()
    members_list = [{
        "id": member.user_id,
        "username": member.user.username,
        "email": member.user.email,
        "joined_at": member.start_date.isoformat()
    } for member in members]

    return jsonify({
        "members": members_list,
        "analytics": {
            "subscribers": subscribers,
            "likes": total_likes,
            "comments": total_comments,
            "earnings": total_earnings
        }
    }), 200

@api.route('/products/upload', methods=['POST'])
@jwt_required()
def upload_product():
    user_id = get_jwt_identity()
    data = request.json

    new_product = Product(
        creator_id=user_id,
        title=data.get("title"),
        description=data.get("description"),
        image_url=data.get("image_url"),
        file_url=data.get("file_url") if data.get("is_digital") else None,
        price=data.get("price"),
        stock=data.get("stock") if not data.get("is_digital") else None,
        is_digital=data.get("is_digital")
    )

    db.session.add(new_product)
    db.session.commit()

    return jsonify({"message": "Product uploaded successfully", "product": new_product.serialize()}), 201

@api.route('/products', methods=['GET'])
def get_products():
    try:
        products = Product.query.all()  # Fetch all products from the database
        result = []
        for product in products:
            result.append({
                'id': product.id,
                'title': product.title,
                'description': product.description,
                'price': product.price,
                'image_url': product.image_url,
                'creator_id': product.creator_id  # Assuming each product is linked to a creator/store
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/products/<int:id>', methods=['GET'])
def get_product(id):
    try:
        product = Product.query.get(id)
        if product:
            return jsonify(product.serialize()), 200
        return jsonify({"message": "Product not found"}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/products', methods=['POST'])
def create_product():
    try:
        data = request.get_json()
        new_product = Product(
            creator_id=data['creator_id'],
            title=data['title'],
            description=data.get('description'),
            image_url=data['image_url'],
            file_url=data.get('file_url'),
            price=data['price'],
            stock=data.get('stock'),
            is_digital=data['is_digital']
        )
        db.session.add(new_product)
        db.session.commit()
        return jsonify(new_product.serialize()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/products/<int:id>', methods=['PUT'])
def update_product(id):
    try:
        product = Product.query.get(id)
        if not product:
            return jsonify({"message": "Product not found"}), 404
        
        data = request.get_json()
        product.title = data.get('title', product.title)
        product.description = data.get('description', product.description)
        product.image_url = data.get('image_url', product.image_url)
        product.file_url = data.get('file_url', product.file_url)
        product.price = data.get('price', product.price)
        product.stock = data.get('stock', product.stock)
        product.is_digital = data.get('is_digital', product.is_digital)

        db.session.commit()
        return jsonify(product.serialize()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    try:
        product = Product.query.get(id)
        if not product:
            return jsonify({"message": "Product not found"}), 404
        
        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": "Product deleted successfully"}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@api.route('/products/buy/<int:product_id>', methods=['POST'])
@jwt_required()
def buy_product(product_id):
    user_id = get_jwt_identity()
    product = Product.query.get(product_id)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    # Check stock for physical products
    if not product.is_digital and product.stock <= 0:
        return jsonify({"error": "Out of stock"}), 400

    # Apply platform fee (same as digital products)
    platform_fee = 3.5  # 3.5% fee
    final_payout = product.price - (product.price * platform_fee / 100)

    # Simulate Payment (Replace with actual Stripe/PayPal processing)
    payment_successful = True  

    if payment_successful:
        # Reduce stock for physical products
        if not product.is_digital:
            product.stock -= 1
            db.session.commit()

        return jsonify({
            "message": "Purchase successful!",
            "original_price": product.price,
            "platform_fee": f"{platform_fee}%",
            "final_payout": final_payout,
            "download_link": product.file_url if product.is_digital else None,
            "shipping_required": not product.is_digital
        }), 200
    else:
        return jsonify({"error": "Payment failed"}), 400
    
@api.route('/subscription-plans', methods=['GET'])
def get_subscription_plans():
    plans = SubscriptionPlan.query.all()
    return jsonify([plan.serialize() for plan in plans]), 200

@api.route('/pricing-plans', methods=['GET'])
def get_pricing_plans():
    plans = PricingPlan.query.all()
    return jsonify([plan.serialize() for plan in plans]), 200

@api.route('/admin/plans', methods=['GET'])
@jwt_required()
def get_plans():
    if not is_admin(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403
    plans = PricingPlan.query.all()

def is_admin(user_id):
    """Check if the user has an Admin role."""
    user = User.query.get(user_id)
    return user and user.role and user.role.name == "Admin"

@api.route("/admin/users", methods=["GET"])
@jwt_required()
def get_users():
    """ Fetch all users for admin panel """
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 403

    users = User.query.all()
    return jsonify([user.serialize() for user in users])

@api.route("/admin/subscriptions", methods=["GET"])
@jwt_required()
def get_subscriptions():
    """ Fetch active subscriptions """
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 403

    subscriptions = Subscription.query.all()
    return jsonify([sub.serialize() for sub in subscriptions])

@api.route("/admin/revenue", methods=["GET"])
@jwt_required()
def get_admin_revenue():
    """Fetch total revenue data for platform admins or artists"""
    user_id = get_jwt_identity()
    
    if is_admin(user_id):
        # Admin revenue breakdown
        total_ad_revenue = db.session.query(db.func.sum(AdRevenue.amount)).scalar() or 0
        total_donations = db.session.query(db.func.sum(CreatorDonation.amount)).scalar() or 0
        total_music_sales = db.session.query(db.func.sum(Track.sales_revenue)).scalar() or 0
        total_merch_sales = db.session.query(db.func.sum(Product.sales_revenue)).scalar() or 0
        total_subscriptions = db.session.query(db.func.sum(Subscription.price)).scalar() or 0
        active_subscriptions = Subscription.query.count()

        total_revenue = (
            total_ad_revenue + total_donations + 
            total_music_sales + total_merch_sales + total_subscriptions
        )

        return jsonify({
            "total_earnings": total_revenue,
            "ad_revenue": total_ad_revenue,
            "donations": total_donations,
            "music_sales": total_music_sales,
            "merch_sales": total_merch_sales,
            "subscription_revenue": total_subscriptions,
            "active_subscriptions": active_subscriptions
        }), 200

    # If user is an artist, return only their revenue breakdown
    artist_donations = db.session.query(db.func.sum(CreatorDonation.amount)).filter_by(user_id=user_id).scalar() or 0
    artist_music_sales = db.session.query(db.func.sum(Track.sales_revenue)).filter_by(artist_id=user_id).scalar() or 0
    artist_merch_sales = db.session.query(db.func.sum(Product.sales_revenue)).filter_by(seller_id=user_id).scalar() or 0
    artist_subscription_earnings = db.session.query(db.func.sum(Subscription.price)).filter_by(user_id=user_id).scalar() or 0

    total_artist_revenue = (
        artist_donations + artist_music_sales + artist_merch_sales + artist_subscription_earnings
    )

    return jsonify({
        "total_earnings": total_artist_revenue,
        "donations": artist_donations,
        "music_sales": artist_music_sales,
        "merch_sales": artist_merch_sales,
        "subscription_earnings": artist_subscription_earnings
    }), 200



@api.route('/roles', methods=['GET'])
@jwt_required()
def get_roles():
    if not is_admin(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403

    roles = Role.query.all()
    return jsonify([role.serialize() for role in roles]), 200

@api.route('/roles', methods=['POST'])
@jwt_required()
def create_role():
    if not is_admin(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    if not data.get('name'):
        return jsonify({"error": "Role name required"}), 400

    new_role = Role(name=data['name'])
    db.session.add(new_role)
    db.session.commit()

    return jsonify({"message": "Role created successfully", "role": new_role.serialize()}), 201

@api.route('/radio/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_radio():
    user_id = get_jwt_identity()
    data = request.json
    station_id = data.get("station_id")

    station = RadioStation.query.get(station_id)
    if not station or not station.is_premium:
        return jsonify({"error": "Invalid or non-premium station"}), 400

    # Check if already subscribed
    existing_subscription = RadioSubscription.query.filter_by(user_id=user_id, station_id=station_id).first()
    if existing_subscription:
        return jsonify({"message": "Already subscribed"}), 200

    # Stripe Payment (Mock)
    stripe_charge = stripe.PaymentIntent.create(
        amount=int(station.subscription_price * 100),  # Convert to cents
        currency="usd",
        payment_method_types=["card"]
    )

    new_subscription = RadioSubscription(user_id=user_id, station_id=station_id)
    db.session.add(new_subscription)
    db.session.commit()

    return jsonify({"message": "Subscription successful!", "subscription": new_subscription.serialize()}), 201


@api.route('/radio/donate', methods=['POST'])
@jwt_required()
def donate_to_radio():
    user_id = get_jwt_identity()
    data = request.json
    station_id = data.get("station_id")
    amount = data.get("amount")
    message = data.get("message", "")

    if not station_id or not amount:
        return jsonify({"error": "Missing required fields"}), 400

    # Stripe Payment (Mock)
    stripe_charge = stripe.PaymentIntent.create(
        amount=int(amount * 100),
        currency="usd",
        payment_method_types=["card"]
    )

    new_donation = RadioDonation(user_id=user_id, station_id=station_id, amount=amount, message=message)
    db.session.add(new_donation)
    db.session.commit()

    return jsonify({"message": "Donation successful!", "donation": new_donation.serialize()}), 201


@api.route('/radio/ad-revenue/<int:station_id>', methods=['GET'])
@jwt_required()
def get_radio_ad_revenue(station_id):
    user_id = get_jwt_identity()
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()

    if not station:
        return jsonify({"error": "Unauthorized or station not found"}), 403

    return jsonify({"station_id": station_id, "ad_revenue": station.ad_revenue}), 200


@api.route('/profile/music/upload', methods=['POST'])
@jwt_required()
def upload_artist_music():
    """Allows only artists to upload individual music tracks to their profile."""
    user_id = get_jwt_identity()
    
    user = User.query.get(user_id)
    if not user or user.role != 'artist':
        return jsonify({"error": "Only artists can upload tracks to their profile"}), 403

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio = request.files['audio']
    title = request.form.get('title', 'Untitled')
    description = request.form.get('description', '')

    filename = secure_filename(audio.filename)
    file_path = os.path.join("uploads/music", filename)
    audio.save(file_path)

    new_audio = Audio(
        user_id=user_id,
        title=title,
        description=description,
        file_url=file_path,
        uploaded_at=datetime.utcnow()
    )

    db.session.add(new_audio)
    db.session.commit()

    return jsonify({"message": "Music uploaded successfully!", "audio": new_audio.serialize()}), 201

@api.route('/profile/dj/upload', methods=['POST'])
@jwt_required()
def upload_dj_mix():
    """Allows DJs to upload a full mix as one file OR a playlist of multiple tracks."""
    user_id = get_jwt_identity()

    user = User.query.get(user_id)
    if not user or user.role != 'dj':
        return jsonify({"error": "Only DJs can upload mixes or playlists"}), 403

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_files = request.files.getlist('audio')  # Allows multiple files
    playlist_name = request.form.get('playlist_name', 'Untitled Mix')
    
    playlist_tracks = []
    for audio in audio_files:
        filename = secure_filename(audio.filename)
        file_path = os.path.join("uploads/dj_mixes", filename)
        audio.save(file_path)

        track = Audio(
            user_id=user_id,
            title=audio.filename,
            file_url=file_path,
            uploaded_at=datetime.utcnow()
        )
        db.session.add(track)
        playlist_tracks.append(track)

    db.session.commit()

    return jsonify({
        "message": "DJ mix uploaded successfully!",
        "playlist": {
            "name": playlist_name,
            "tracks": [track.serialize() for track in playlist_tracks]
        }
    }), 201



@api.route('/licensing/submit-music', methods=['POST'])
@jwt_required()
def submit_music_for_licensing():
    user_id = get_jwt_identity()
    data = request.json

    new_licensing_entry = Product(
        creator_id=user_id,
        title=data.get("title"),
        description=data.get("description"),
        image_url=data.get("cover_art"),
        file_url=data.get("file_url"),
        price=data.get("licensing_fee"),
        is_digital=True,
    )

    db.session.add(new_licensing_entry)
    db.session.commit()

    return jsonify({"message": "Music submitted for licensing!", "music": new_licensing_entry.serialize()}), 201

@api.route('/licensing/marketplace', methods=['GET'])
@jwt_required()
def get_music_licensing_marketplace():
    user_id = get_jwt_identity()
    filter_user = request.args.get("user", default=False, type=bool)

    if filter_user:
        available_tracks = MusicLicensing.query.filter_by(user_id=user_id).all()
    else:
        available_tracks = MusicLicensing.query.filter_by(status="Pending").all()
    
    return jsonify([track.serialize() for track in available_tracks]), 200


@api.route('/licensing/request', methods=['POST'])
@jwt_required()
def request_music_license():
    user_id = get_jwt_identity()
    data = request.json

    existing_license = MusicLicensing.query.filter_by(
        track_id=data.get("track_id"),
        buyer_id=user_id
    ).first()

    if existing_license:
        return jsonify({"error": "License request already exists for this track"}), 400

    new_license_request = MusicLicensing(
        user_id=data.get("artist_id"),
        track_id=data.get("track_id"),
        license_type=data.get("license_type"),
        licensing_price=data.get("licensing_fee"),
        buyer_id=user_id,
        status="Requested"
    )

    db.session.add(new_license_request)
    db.session.commit()

    return jsonify({"message": "License request sent!", "license_request": new_license_request.serialize()}), 200

@api.route('/licensing/approve/<int:licensing_id>', methods=['POST'])
@jwt_required()
def approve_music_license(licensing_id):
    licensing_entry = MusicLicensing.query.get(licensing_id)

    if not licensing_entry:
        return jsonify({"error": "License request not found"}), 404

    licensing_entry.status = "Approved"
    licensing_entry.approved_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "License approved!", "licensing": licensing_entry.serialize()}), 200



@api.route('/licensing/checkout/<int:licensing_id>', methods=['POST'])
@jwt_required()
def create_licensing_checkout(licensing_id):
    user_id = get_jwt_identity()
    licensing_entry = MusicLicensing.query.get(licensing_id)

    if not licensing_entry:
        return jsonify({"error": "License entry not found"}), 404

    if licensing_entry.buyer_id is not None:
        return jsonify({"error": "This license has already been purchased"}), 400

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"{licensing_entry.license_type} License - {licensing_entry.track.title}"
                    },
                    'unit_amount': int(licensing_entry.licensing_price * 100),  # Convert to cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"https://yourapp.com/licensing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url="https://yourapp.com/licensing/cancel",
            metadata={"licensing_id": licensing_entry.id, "buyer_id": user_id}
        )

        return jsonify({"checkout_url": session.url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/licensing/payment-success', methods=['POST'])
def licensing_payment_success():
    payload = request.get_json()
    event = None

    try:
        event = stripe.Event.construct_from(payload, stripe.api_key)
    except ValueError as e:
        return jsonify({"error": "Invalid payload"}), 400

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        licensing_id = session['metadata']['licensing_id']
        buyer_id = session['metadata']['buyer_id']

        licensing_entry = MusicLicensing.query.get(licensing_id)

        if licensing_entry:
            licensing_entry.status = "Approved"
            licensing_entry.approved_at = datetime.utcnow()
            licensing_entry.buyer_id = buyer_id
            licensing_entry.stripe_payment_id = session['id']

            db.session.commit()
            return jsonify({"message": "Payment recorded and license approved"}), 200

    return jsonify({"error": "Unhandled event"}), 400

@api.route('/licensing/my-licenses', methods=['GET'])
@jwt_required()
def get_my_licenses():
    user_id = get_jwt_identity()
    licenses = MusicLicensing.query.filter_by(buyer_id=user_id).all()
    return jsonify([license.serialize() for license in licenses]), 200


# bmi and ascap


@api.route('/generate-royalty-report', methods=['GET'])
@jwt_required()
def generate_royalty_report():
    """Generate a royalty report for BMI/ASCAP"""
    plays = db.session.query(StreamingHistory.content_id, db.func.count(StreamingHistory.id)).group_by(StreamingHistory.content_id).all()

    report = [{"track_id": play[0], "play_count": play[1]} for play in plays]

    return jsonify({"royalty_report": report}), 200

@api.route('/calculate-royalties', methods=['POST'])
@jwt_required()
def calculate_royalties():
    """Calculate and distribute royalties to artists"""
    plays = db.session.query(
        StreamingHistory.content_id, 
        db.func.count(StreamingHistory.id)
    ).group_by(StreamingHistory.content_id).all()

    for play in plays:
        track_id, play_count = play
        track = Audio.query.get(track_id)
        artist = track.user_id
        
        royalty_per_play = 0.005  # Example rate ($0.005 per play)
        total_earnings = play_count * royalty_per_play
        
        # Save earnings to artist account
        artist_user = User.query.get(artist)
        artist_user.earnings += total_earnings
        db.session.commit()

    return jsonify({"message": "Royalties calculated and assigned."}), 200


@api.route('/upload_track', methods=['POST'])
@jwt_required()
def upload_track():
    """Allow artists to upload music with ISRC codes"""
    user_id = get_jwt_identity()
    data = request.json

    new_track = Audio(
        user_id=user_id,
        title=data.get("title"),
        file_url=data.get("file_url"),
        isrc_code=data.get("isrc"),  # Required for licensing
        uploaded_at=datetime.utcnow()
    )
    db.session.add(new_track)
    db.session.commit()

    return jsonify({"message": "Track uploaded successfully!"}), 201


@api.route('/submit-track-licensing', methods=['POST'])
@jwt_required()
def submit_track_licensing():
    """Artists submit their tracks for licensing deals"""
    user_id = get_jwt_identity()
    data = request.json
    track_id = data.get("track_id")
    price = data.get("price")

    new_licensing_entry = MusicLicensing(
        user_id=user_id,
        track_id=track_id,
        licensing_price=price,
        submitted_at=datetime.utcnow()
    )
    db.session.add(new_licensing_entry)
    db.session.commit()

    return jsonify({"message": "Track submitted for licensing!"}), 201

@api.route("/user/social-links", methods=["PUT"])
@jwt_required()
def update_social_links():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json
    user.social_links = data.get("social_links", {})

    db.session.commit()
    return jsonify({"message": "Social links updated!", "social_links": user.social_links}), 200


@api.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json

    user.business_name = data.get("business_name", user.business_name)
    user.display_name = data.get("display_name", user.display_name)
    user.radio_station = data.get("radio_station", user.radio_station)
    user.podcast = data.get("podcast", user.podcast)
    user.bio = data.get("bio", user.bio)
    
    # Update social links (Ensure JSON structure)
    if "social_links" in data:
        user.social_links = data["social_links"]

    # Update image gallery (Ensure list max 10)
    if "gallery" in data:
        if len(data["gallery"]) > 10:
            return jsonify({"error": "Max 10 images allowed in gallery"}), 400
        user.gallery = data["gallery"]

    # Update video gallery (Ensure list max 10)
    if "videos" in data:
        if len(data["videos"]) > 10:
            return jsonify({"error": "Max 10 videos allowed"}), 400
        user.videos = data["videos"]

    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "user": user.serialize()}), 200

@api.route('/user/profile/videos/upload', methods=['POST'])
@jwt_required()
def upload_profile_video():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    if 'video' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    video = request.files['video']
    filename = secure_filename(video.filename)
    file_path = os.path.join("uploads/videos", filename)

    # Limit video size (max 20MB)
    if video.content_length > 20 * 1024 * 1024:
        return jsonify({"error": "Video file is too large (Max 20MB)"}), 400

    video.save(file_path)

    # Ensure video gallery list doesn't exceed limit
    if len(user.videos) >= 10:
        return jsonify({"error": "Max 10 videos allowed"}), 400

    user.videos.append(file_path)
    db.session.commit()

    return jsonify({"message": "Video uploaded successfully", "videos": user.videos}), 200


# @api.route('/profile/music/upload', methods=['POST'])
# @jwt_required()
# def upload_music():
#     """Allows users to upload music files to their profile."""
#     user_id = get_jwt_identity()
#     if 'audio' not in request.files:
#         return jsonify({"error": "No audio file provided"}), 400

#     audio = request.files['audio']
#     title = request.form.get('title', 'Untitled')
#     description = request.form.get('description', '')

#     filename = secure_filename(audio.filename)
#     file_path = os.path.join("uploads/music", filename)
#     audio.save(file_path)

#     new_audio = Audio(
#         user_id=user_id,
#         title=title,
#         description=description,
#         file_url=file_path,
#         uploaded_at=datetime.utcnow()
#     )

#     db.session.add(new_audio)
#     db.session.commit()

#     return jsonify({"message": "Music uploaded successfully!", "audio": new_audio.serialize()}), 201


@api.route('/profile/playlists/create', methods=['POST'])
@jwt_required()
def create_playlist_profile():
    """Allows users to create a playlist on their profile."""
    user_id = get_jwt_identity()
    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"error": "Playlist name is required"}), 400

    new_playlist = PlaylistAudio(user_id=user_id, name=name)
    db.session.add(new_playlist)
    db.session.commit()

    return jsonify({"message": "Playlist created!", "playlist": new_playlist.serialize()}), 201


@api.route('/profile/radio/create', methods=['POST'])
@jwt_required()
def create_radio_station_profile():
    """Allows users to create a radio station."""
    user_id = get_jwt_identity()
    data = request.json
    name = data.get("name")
    description = data.get("description", "")

    if not name:
        return jsonify({"error": "Radio station name is required"}), 400

    new_station = RadioStation(user_id=user_id, name=name, description=description)
    db.session.add(new_station)
    db.session.commit()

    return jsonify({"message": "Radio station created!", "station": new_station.serialize()}), 201



# ✅ Upload Podcast Episode
@api.route('/podcasts/upload_episode/<int:podcast_id>', methods=['POST'])
@jwt_required()
def upload_episode(podcast_id):
    """Allows users to upload podcast episodes."""
    user_id = get_jwt_identity()
    podcast = Podcast.query.get(podcast_id)

    if not podcast or podcast.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    audio = request.files['audio']
    filename = secure_filename(audio.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    audio.save(file_path)

    new_episode = PodcastEpisode(
        podcast_id=podcast_id,
        title=request.form.get("title"),
        description=request.form.get("description"),
        file_url=file_path
    )

    db.session.add(new_episode)
    db.session.commit()

    return jsonify({"message": "Episode uploaded successfully", "episode_id": new_episode.id}), 201

# ✅ Add Podcast Collaborator (Co-Host)
@api.route('/podcasts/add_host/<int:podcast_id>', methods=['POST'])
@jwt_required()
def add_host(podcast_id):
    """Allows podcast owner to add collaborators (co-hosts)."""
    user_id = get_jwt_identity()
    podcast = Podcast.query.get(podcast_id)

    if not podcast or podcast.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    new_host = PodcastHost(podcast_id=podcast_id, user_id=data.get("user_id"))

    db.session.add(new_host)
    db.session.commit()

    return jsonify({"message": "New host added!"}), 201

# ✅ Get All Podcasts

# ✅ Get a Single Podcast
@api.route('/podcasts/<int:podcast_id>', methods=['GET'])
def get_podcast_id(podcast_id):
    """Fetches a single podcast by ID."""
    podcast = Podcast.query.get(podcast_id)
    if not podcast:
        return jsonify({"error": "Podcast not found"}), 404
    return jsonify(podcast.serialize()), 200

# ✅ Get Episodes for a Podcast
@api.route('/podcasts/<int:podcast_id>/episodes', methods=['GET'])
def get_podcast_episodes(podcast_id):
    """Fetches all episodes for a given podcast."""
    episodes = PodcastEpisode.query.filter_by(podcast_id=podcast_id).all()
    return jsonify([episode.serialize() for episode in episodes]), 200

@api.route('/episodes/upcoming', methods=['GET'])
def get_scheduled_episodes():
    future_episodes = PodcastEpisode.query.filter(PodcastEpisode.release_date > datetime.utcnow()).all()
    return jsonify([episode.serialize() for episode in future_episodes])


# ✅ Subscribe to a Podcast (For Monetization)
@api.route('/podcasts/subscribe/<int:podcast_id>', methods=['POST'])
@jwt_required()
def subscribe_to_paid_podcast(podcast_id):
    """Allows users to subscribe to a paid podcast."""
    user_id = get_jwt_identity()
    podcast = Podcast.query.get(podcast_id)

    if not podcast:
        return jsonify({"error": "Podcast not found"}), 404

    # Handle Subscription Logic (e.g., Stripe Payment)
    # TODO: Integrate Payment Gateway (Stripe, PayPal)

    return jsonify({"message": "Successfully subscribed!"}), 200

@api.route('/transcribe_podcast/<int:podcast_id>', methods=['POST'])
@jwt_required()
def transcribe_podcast(podcast_id):
    podcast = Podcast.query.get(podcast_id)
    if not podcast or not podcast.audio_url:
        return jsonify({"error": "Podcast audio not found"}), 404

    model = whisper.load_model("base")
    result = model.transcribe(podcast.audio_url)

    podcast.transcription = result["text"]
    db.session.commit()

    return jsonify({"message": "Transcription completed", "transcription": podcast.transcription}), 200

@api.route('/purchase_podcast', methods=['POST'])
@jwt_required()
def purchase_podcast():
    user_id = get_jwt_identity()
    data = request.json
    podcast_id = data.get("podcast_id")
    podcast = Podcast.query.get(podcast_id)

    if not podcast:
        return jsonify({"error": "Podcast not found"}), 404

    if podcast.price_per_episode:
        amount = podcast.price_per_episode
    else:
        return jsonify({"error": "Podcast not for sale"}), 400

    # TODO: Integrate with Stripe payment
    return jsonify({"message": "Payment processed successfully"}), 200

@api.route('/podcast/<int:podcast_id>/create_clip', methods=['POST'])
@jwt_required()
def create_clip(podcast_id):
    """Allows users to generate clips from a podcast episode."""
    user_id = get_jwt_identity()
    data = request.json
    start_time = int(data.get("start_time"))  # in seconds
    end_time = int(data.get("end_time"))  # in seconds
    format_type = data.get("format", "mp4")  # Default to MP4

    # Fetch podcast
    podcast = Podcast.query.get(podcast_id)
    if not podcast or not podcast.video_url:
        return jsonify({"error": "Podcast not found or missing video"}), 404

    # ✅ Generate clip filename
    clip_filename = f"clip_{podcast_id}_{start_time}_{end_time}.{format_type}"
    clip_path = os.path.join(CLIP_FOLDER, clip_filename)

    try:
        # ✅ Extract video clip
        ffmpeg_extract_subclip(podcast.video_url, start_time, end_time, targetname=clip_path)
    except Exception as e:
        return jsonify({"error": f"Failed to create clip: {str(e)}"}), 500

    # ✅ Return clip URL with CTA link
    clip_url = f"/clips/{clip_filename}"
    full_episode_url = f"/podcast/{podcast_id}"

    return jsonify({
        "message": "Clip created successfully",
        "clip_url": clip_url,
        "cta_link": full_episode_url
    }), 201

@api.route('/creator/earnings', methods=['GET'])
@jwt_required()
def get_creator_earnings():
    """Fetches total earnings, revenue breakdown, and listener data for a creator."""
    user_id = get_jwt_identity()
    
    earnings = db.session.query(
        func.sum(PodcastSubscription.amount).label("total_earnings"),
        func.count(PodcastSubscription.id).label("total_subscriptions")
    ).filter(PodcastSubscription.creator_id == user_id).first()

    return jsonify({
        "total_earnings": earnings.total_earnings or 0,
        "total_subscriptions": earnings.total_subscriptions or 0
    }), 200

@api.route('/podcasts/<int:podcast_id>/generate_chapters', methods=['POST'])
@jwt_required()
def generate_podcast_chapters(podcast_id):
    """Automatically generates podcast chapters using AI transcription."""
    podcast = Podcast.query.get(podcast_id)

    if not podcast or not podcast.transcription:
        return jsonify({"error": "Podcast or transcription not found"}), 404

    # ✅ AI: Auto-detect topic changes in the transcript
    transcript = podcast.transcription.split(". ")
    chapters = []
    current_time = 0

    for i, sentence in enumerate(transcript):
        # Simulate chapter detection based on AI (real implementation can use NLP)
        if len(sentence) > 50:  # If sentence is long, assume it's a new topic
            chapter = PodcastChapter(
                podcast_id=podcast_id,
                title=f"Chapter {i+1}: {sentence[:50]}...",  # Truncate title
                timestamp=current_time
            )
            db.session.add(chapter)
            chapters.append(chapter.serialize())

        # Simulate timestamp progression (this should be based on AI in real-world use)
        current_time += 30  # Assume each sentence lasts ~30 seconds

    db.session.commit()

    return jsonify({"message": "Chapters generated", "chapters": chapters}), 201

@api.route('/podcasts/<int:podcast_id>/chapters', methods=['GET'])
def get_podcast_chapters(podcast_id):
    """Fetches all chapters for a specific podcast."""
    chapters = PodcastChapter.query.filter_by(podcast_id=podcast_id).all()
    return jsonify([chapter.serialize() for chapter in chapters]), 200

@api.route('/podcasts/<int:podcast_id>/chapters', methods=['POST'])
@jwt_required()
def add_podcast_chapter(podcast_id):
    """Allows creators to manually add a chapter to a podcast."""
    user_id = get_jwt_identity()
    podcast = Podcast.query.get(podcast_id)

    if not podcast or podcast.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    title = data.get("title")
    timestamp = data.get("timestamp")

    if not title or timestamp is None:
        return jsonify({"error": "Title and timestamp are required"}), 400

    new_chapter = PodcastChapter(
        podcast_id=podcast_id,
        title=title,
        timestamp=timestamp,
        manual_edit=True  # ✅ Marked as manually added
    )

    db.session.add(new_chapter)
    db.session.commit()

    return jsonify({"message": "Chapter added", "chapter": new_chapter.serialize()}), 201

@api.route('/podcasts/chapters/<int:chapter_id>', methods=['PUT'])
@jwt_required()
def edit_podcast_chapter(chapter_id):
    """Allows creators to edit an existing chapter."""
    user_id = get_jwt_identity()
    chapter = PodcastChapter.query.get(chapter_id)

    if not chapter or chapter.podcast.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    chapter.title = data.get("title", chapter.title)
    chapter.timestamp = data.get("timestamp", chapter.timestamp)
    chapter.manual_edit = True  # ✅ Marked as manually edited

    db.session.commit()

    return jsonify({"message": "Chapter updated", "chapter": chapter.serialize()}), 200

@api.route('/podcasts/chapters/<int:chapter_id>', methods=['DELETE'])
@jwt_required()
def delete_podcast_chapter(chapter_id):
    """Allows creators to delete a chapter."""
    user_id = get_jwt_identity()
    chapter = PodcastChapter.query.get(chapter_id)

    if not chapter or chapter.podcast.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(chapter)
    db.session.commit()

    return jsonify({"message": "Chapter deleted"}), 200

@api.route('/radio_submission', methods=['POST'])
@jwt_required()
def submit_to_radio():
    data = request.json
    new_submission = RadioSubmission(
        artist_id=get_jwt_identity(),
        track_id=data['track_id'],
        station_name=data['station_name']
    )
    db.session.add(new_submission)
    db.session.commit()
    return jsonify({"message": "Track submitted to radio station"}), 201

@api.route('/collaboration', methods=['POST'])
@jwt_required()
def create_collab_listing():
    data = request.json
    new_collab = Collaboration(
        artist_id=get_jwt_identity(),
        role=data['role'],
        available=True
    )
    db.session.add(new_collab)
    db.session.commit()
    return jsonify({"message": "Collaboration listing created"}), 201

@api.route('/licensing', methods=['POST'])
@jwt_required()
def submit_to_licensing():
    data = request.json
    new_licensing = LicensingOpportunity(
        artist_id=get_jwt_identity(),
        track_id=data['track_id']
    )
    db.session.add(new_licensing)
    db.session.commit()
    return jsonify({"message": "Track submitted for licensing"}), 201

@api.route("/podcast/<username>/<podcast_id>", methods=["GET"])
def get_podcast_by_username(username, podcast_id):
    podcast = Podcast.query.filter_by(id=podcast_id, host_username=username).first()
    if not podcast:
        return jsonify({"error": "Podcast not found"}), 404
    
    episodes = PodcastEpisode.query.filter_by(podcast_id=podcast.id).all()
    episode_data = [{"id": ep.id, "title": ep.title, "audioUrl": ep.audio_url} for ep in episodes]
    
    return jsonify({
        "title": podcast.title,
        "host": podcast.host_username,
        "description": podcast.description,
        "coverImage": podcast.cover_image_url,
        "episodes": episode_data
    })

@api.route('/create-station', methods=['POST'])
@jwt_required()
def create_station():
    data = request.json
    user_id = get_jwt_identity()

    new_station = RadioStation(
        name=data["name"],
        owner_id=user_id,
        genre=data["genre"],
        description=data["description"],
        logo_url=data["logo_url"],
        banner_url=data["banner_url"]
    )
    db.session.add(new_station)
    db.session.commit()

    return jsonify({"message": "Radio station created!", "station": new_station.serialize()}), 201

class ArchivedShow(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey('radio_station.id'))
    title = db.Column(db.String(100))
    file_path = db.Column(db.String(255))

@api.route('/radio/dashboard', methods=['GET'])
def get_radio_dashboard():
    stations = RadioStation.query.filter_by(owner_id=request.args.get("user_id")).all()
    return jsonify([station.serialize() for station in stations])

@api.route('/podcast/dashboard', methods=['GET'])
def get_podcast_dashboard():
    podcasts = Podcast.query.filter_by(creator_id=request.args.get("user_id")).all()
    return jsonify([podcast.serialize() for podcast in podcasts])

@api.route('/artist/dashboard', methods=['GET'])
def get_artist_dashboard():
    tracks = Track.query.filter_by(artist_id=request.args.get("user_id")).all()
    return jsonify([track.serialize() for track in tracks])

@api.route('/delete_dashboard', methods=['POST'])
def delete_dashboard():
    user_id = request.json.get("user_id")
    
    # Delete all associated data
    RadioStation.query.filter_by(owner_id=user_id).delete()
    Podcast.query.filter_by(creator_id=user_id).delete()
    Track.query.filter_by(artist_id=user_id).delete()

    db.session.commit()
    return jsonify({"message": "Dashboard deleted successfully."})

@api.route('/music/upload', methods=['POST'])
@jwt_required()
def upload_music():
    """Allows all users to upload music files, but they are private unless added to a station."""
    user_id = get_jwt_identity()

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio = request.files['audio']
    title = request.form.get('title', 'Untitled')
    description = request.form.get('description', '')

    filename = secure_filename(audio.filename)
    file_path = os.path.join("uploads/user_music", filename)
    audio.save(file_path)

    new_audio = Audio(
        user_id=user_id,
        title=title,
        description=description,
        file_url=file_path,
        uploaded_at=datetime.utcnow(),
        is_public=False  # Default to private unless added to a station
    )

    db.session.add(new_audio)
    db.session.commit()

    return jsonify({"message": "Music uploaded successfully!", "audio": new_audio.serialize()}), 201


@api.route('/music/all', methods=['GET'])
def get_all_music():
    """Fetch all available music tracks."""
    tracks = Audio.query.all()
    return jsonify([track.serialize() for track in tracks]), 200

@api.route('/music/user', methods=['GET'])
@jwt_required()
def get_user_music():
    """Fetch all music uploaded by the authenticated user."""
    user_id = get_jwt_identity()
    tracks = Audio.query.filter_by(user_id=user_id).all()
    return jsonify([track.serialize() for track in tracks]), 200


@api.route('/music/delete/<int:track_id>', methods=['DELETE'])
@jwt_required()
def delete_music(track_id):
    """Delete a specific music track if the user owns it."""
    user_id = get_jwt_identity()
    track = Audio.query.filter_by(id=track_id, user_id=user_id).first()

    if not track:
        return jsonify({"error": "Track not found or unauthorized"}), 404

    db.session.delete(track)
    db.session.commit()

    return jsonify({"message": "Music track deleted successfully"}), 200



@api.route('/music/playlist/add', methods=['POST'])
@jwt_required()
def add_music_to_playlist():
    """Add a music track to a playlist."""
    data = request.json
    user_id = get_jwt_identity()
    playlist_id = data.get("playlist_id")
    audio_id = data.get("audio_id")

    playlist = PlaylistAudio.query.filter_by(id=playlist_id, user_id=user_id).first()
    if not playlist:
        return jsonify({"error": "Playlist not found or unauthorized"}), 404

    track = Audio.query.get(audio_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404

    playlist.audios.append(track)
    db.session.commit()

    return jsonify({"message": "Track added to playlist!", "playlist": playlist.serialize()}), 201


@api.route('/music/playlists/user', methods=['GET'])
@jwt_required()
def get_user_playlists():
    """Fetch all playlists created by the user."""
    user_id = get_jwt_identity()
    playlists = PlaylistAudio.query.filter_by(user_id=user_id).all()
    return jsonify([playlist.serialize() for playlist in playlists]), 200

@api.route('/music/playlist/remove', methods=['POST'])
@jwt_required()
def remove_music_from_playlist():
    """Remove a music track from a playlist."""
    data = request.json
    user_id = get_jwt_identity()
    playlist_id = data.get("playlist_id")
    audio_id = data.get("audio_id")

    playlist = PlaylistAudio.query.filter_by(id=playlist_id, user_id=user_id).first()
    if not playlist:
        return jsonify({"error": "Playlist not found or unauthorized"}), 404

    track = Audio.query.get(audio_id)
    if not track or track not in playlist.audios:
        return jsonify({"error": "Track not found in playlist"}), 404

    playlist.audios.remove(track)
    db.session.commit()

    return jsonify({"message": "Track removed from playlist!", "playlist": playlist.serialize()}), 200


@api.route('/music/stream/<int:track_id>', methods=['GET'])
def stream_music(track_id):
    """Returns the URL to stream a specific music track."""
    track = Audio.query.get(track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404

    return jsonify({"stream_url": track.file_url}), 200


@api.route('/radio/<int:station_id>/play', methods=['POST'])
@jwt_required()
def play_radio_music(station_id):
    """Start playing music for a radio station from a playlist."""
    user_id = get_jwt_identity()
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()

    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 404

    data = request.json
    playlist_id = data.get("playlist_id")
    playlist = PlaylistAudio.query.get(playlist_id)

    if not playlist or playlist.user_id != user_id:
        return jsonify({"error": "Playlist not found or unauthorized"}), 404

    tracks = [{"id": track.id, "title": track.title, "stream_url": track.file_url} for track in playlist.audios]

    return jsonify({
        "message": f"Playing playlist '{playlist.name}' on '{station.name}'",
        "tracks": tracks
    }), 200


# ✅ Create Indie Artist Station
@api.route('/indie-station/create', methods=['POST'])
@jwt_required()
def create_indie_station():
    user_id = get_jwt_identity()
    data = request.json
    station_name = data.get("name")

    if not station_name:
        return jsonify({"error": "Station name is required"}), 400

    existing_station = IndieStation.query.filter_by(artist_id=user_id).first()
    if existing_station:
        return jsonify({"error": "Artist already has a station"}), 400

    new_station = IndieStation(artist_id=user_id, name=station_name)
    db.session.add(new_station)
    db.session.commit()

    return jsonify({"message": "Indie station created!", "station": new_station.serialize()}), 201

# ✅ Get Indie Artist Station & Tracks
@api.route('/indie-station', methods=['GET'])
@jwt_required()
def get_indie_station():
    user_id = get_jwt_identity()
    station = IndieStation.query.filter_by(artist_id=user_id).first()

    if not station:
        return jsonify({"station": None, "tracks": [], "followers": 0})

    return jsonify({"station": station.serialize()}), 200

# ✅ Add Track to Indie Station
@api.route('/indie-station/add-track', methods=['POST'])
@jwt_required()
def add_track_to_station():
    user_id = get_jwt_identity()
    data = request.json
    track_id = data.get("track_id")

    station = IndieStation.query.filter_by(artist_id=user_id).first()
    if not station:
        return jsonify({"error": "No station found"}), 404

    new_track = IndieStationTrack(station_id=station.id, track_id=track_id)
    db.session.add(new_track)
    db.session.commit()

    return jsonify({"message": "Track added to station!", "track": new_track.serialize()}), 201

# ✅ Remove Track from Indie Station
@api.route('/indie-station/remove-track/<int:track_id>', methods=['DELETE'])
@jwt_required()
def remove_track_from_station(track_id):
    user_id = get_jwt_identity()
    station = IndieStation.query.filter_by(artist_id=user_id).first()

    if not station:
        return jsonify({"error": "No station found"}), 404

    track_entry = IndieStationTrack.query.filter_by(station_id=station.id, track_id=track_id).first()
    if not track_entry:
        return jsonify({"error": "Track not found in station"}), 404

    db.session.delete(track_entry)
    db.session.commit()

    return jsonify({"message": "Track removed from station!"}), 200


# ✅ Follow an Indie Station
@api.route('/indie-station/follow', methods=['POST'])
@jwt_required()
def follow_indie_station():
    user_id = get_jwt_identity()
    data = request.json
    station_id = data.get("station_id")

    existing_follow = IndieStationFollower.query.filter_by(user_id=user_id, station_id=station_id).first()
    if existing_follow:
        return jsonify({"message": "Already following this station"}), 200

    new_follow = IndieStationFollower(user_id=user_id, station_id=station_id)
    db.session.add(new_follow)
    db.session.commit()

    return jsonify({"message": "Successfully followed the station!"}), 201

@api.route('/artist/live/start', methods=['POST'])
@jwt_required()
def start_live_stream():
    """Starts a live stream, supports VR/ticketing, and notifies WebSocket clients."""
    user_id = get_jwt_identity()
    data = request.json

    new_stream = LiveStudio(
        user_id=user_id,
        stream_key=f"user_{user_id}_stream",
        title=data.get("title"),
        description=data.get("description"),
        is_live=True,
        is_vr_enabled=data.get("is_vr_enabled", False),
        vr_environment=data.get("vr_environment"),
        is_ticketed=data.get("is_ticketed", False),
        ticket_price=data.get("ticket_price", 0.0),
        donation_link=data.get("donation_link"),
        has_live_chat=data.get("has_live_chat", True)
    )

    db.session.add(new_stream)
    db.session.commit()

    # ✅ Notify Local WebSocket Clients
    socketio.emit("live_stream_update", {"stream_id": new_stream.id, "is_live": True})

    # ✅ Notify External WebSocket Server (if needed)
    try:
        requests.post("http://localhost:5000/live-status", json={
            "stationId": user_id,
            "isLive": True
        })
    except requests.exceptions.RequestException as e:
        print(f"Error notifying WebSocket server: {e}")

    return jsonify({"message": "Live stream started!", "stream": new_stream.serialize()}), 201


@api.route('/artist/live/end', methods=['POST'])
@jwt_required()
def end_live_stream():
    user_id = get_jwt_identity()

    live_stream = LiveStudio.query.filter_by(user_id=user_id, is_live=True).first()
    if not live_stream:
        return jsonify({"error": "No active live stream found"}), 404

    live_stream.is_live = False
    live_stream.ended_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Live stream ended."}), 200

@api.route('/artist/live-streams', methods=['GET'])
def get_live_streams():
    streams = LiveStudio.query.filter_by(is_live=True).all()
    return jsonify([stream.serialize() for stream in streams]), 200

@api.route('/artist/live/buy-ticket/<int:stream_id>', methods=['POST'])
@jwt_required()
def buy_ticket(stream_id):
    user_id = get_jwt_identity()
    stream = LiveStudio.query.get(stream_id)

    if not stream or not stream.is_ticketed:
        return jsonify({"error": "Invalid or non-ticketed stream"}), 400

    # Create a Stripe Checkout session
    checkout_session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': stream.title},
                'unit_amount': int(stream.ticket_price * 100),
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=f"{os.getenv('FRONTEND_URL')}/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{os.getenv('FRONTEND_URL')}/cancel"
    )

    return jsonify({"checkout_url": checkout_session.url}), 200

@api.route('/artist/live/earnings', methods=['GET'])
@jwt_required()
def get_live_earnings():
    user_id = get_jwt_identity()
    earnings = db.session.query(db.func.sum(LiveStudio.total_earnings)).filter(LiveStudio.user_id == user_id).scalar() or 0
    return jsonify({"total_earnings": earnings}), 200

@api.route('/radio/<int:station_id>/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_station(station_id):
    """Handles subscription purchases for premium radio stations."""
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if not station or not station.is_subscription_based:
        return jsonify({"error": "Subscription not available"}), 400

    # Simulated Stripe/PayPal Payment
    payment_successful = True  # ✅ Replace with real payment processing
    if not payment_successful:
        return jsonify({"error": "Payment failed"}), 402

    station.allowed_users.append(User.query.get(user_id))
    station.followers_count += 1
    db.session.commit()

    return jsonify({"message": "Subscription successful!"}), 200

@socketio.on('live_status_update')
def handle_live_status_update(data):
    """WebSocket: Notify all clients when a station goes live/offline."""
    station_id = data.get("stationId")
    is_live = data.get("isLive")

    station = RadioStation.query.get(station_id)
    if station:
        station.is_live = is_live
        db.session.commit()

        # 🔴 Broadcast live status update
        socketio.emit(f"station-{station_id}-live-status", {"stationId": station_id, "isLive": is_live})



@api.route('/radio/<int:station_id>/buy-ticket', methods=['POST'])
@jwt_required()
def buy_ticket_radio(station_id):
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if not station or not station.is_ticketed:
        return jsonify({"error": "This station does not sell tickets."}), 400

    # Charge user (Replace this with actual payment gateway integration)
    ticket_price = station.ticket_price
    # Process payment with Stripe/PayPal (Mocked)
    payment_successful = True  # Assume payment is successful for now

    if payment_successful:
        new_ticket = TicketPurchase(user_id=user_id, station_id=station_id, amount_paid=ticket_price)
        station.allowed_users.append(User.query.get(user_id))  # Grant access
        db.session.add(new_ticket)
        db.session.commit()
        return jsonify({"message": "Ticket purchased successfully!"}), 200
    else:
        return jsonify({"error": "Payment failed."}), 400

@api.route('/radio/<int:station_id>/access', methods=['GET'])
@jwt_required()
def check_access(station_id):
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if station.is_public or station.user_id == user_id:
        return jsonify({"message": "Access granted!"}), 200

    subscription = Subscription.query.filter_by(user_id=user_id, station_id=station_id, active=True).first()
    ticket = TicketPurchase.query.filter_by(user_id=user_id, station_id=station_id).first()

    if subscription or ticket:
        return jsonify({"message": "Access granted!"}), 200
    else:
        return jsonify({"error": "Access denied. Subscribe or buy a ticket."}), 403

@api.route('/radio/<int:station_id>/follow', methods=['POST'])
@jwt_required()
def follow_station(station_id):
    """User follows a radio station and WebSocket updates followers."""
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if not station:
        return jsonify({"error": "Radio station not found"}), 404

    # Add follower (mocked for now)
    station.followers_count += 1
    db.session.commit()

    # 🔵 Notify WebSocket
    requests.post("http://localhost:5000/new-follower", json={
        "stationId": station_id,
        "userId": user_id
    })

    return jsonify({"message": "Followed station!", "followers": station.followers_count}), 200


@api.route('/radio/<int:station_id>/now-playing', methods=['POST'])
@jwt_required()
def update_now_playing(station_id):
    """Updates currently playing track for a station."""
    user_id = get_jwt_identity()
    station = RadioStation.query.get(station_id)

    if not station or station.user_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    data = request.json
    track_title = data.get("track_title")

    # 🔄 Notify WebSocket
    requests.post("http://localhost:5000/track-update", json={
        "stationId": station_id,
        "track": {"title": track_title}
    })

    return jsonify({"message": "Now Playing updated!"}), 200

@api.route('/podcast/<int:podcast_id>/purchase', methods=['POST'])
@jwt_required()
def purchase_episode(podcast_id):
    data = request.json
    episode_id = data.get("episode_id")
    token = data.get("stripe_token")  # From frontend

    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404

    if not episode.is_premium:
        return jsonify({"error": "This episode is free"}), 400

    charge = stripe.Charge.create(
        amount=int(episode.price_per_episode * 100),
        currency="usd",
        description=f"Podcast Episode Purchase: {episode.title}",
        source=token
    )

    return jsonify({"message": "Payment successful", "charge_id": charge.id}), 200

@api.route('/recommendations/<int:user_id>', methods=['GET'])
def recommend_content(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get last listened podcast
    last_listened = user.history[-1].content_id if user.history else None

    if last_listened:
        similar_podcasts = Podcast.query.filter(
            Podcast.id != last_listened
        ).order_by(desc(Podcast.views)).limit(5).all()
    else:
        similar_podcasts = Podcast.query.order_by(desc(Podcast.views)).limit(5).all()

    return jsonify({
        "recommended_podcasts": [p.serialize() for p in similar_podcasts]
    })

@api.route('/search', methods=['GET'])
def search_content():
    query = request.args.get('q', '')
    content_type = request.args.get('type', '')  # "podcast" or "radio"

    if not query:
        return jsonify({"error": "No search query provided"}), 400

    if content_type == "podcast":
        results = Podcast.query.filter(Podcast.title.ilike(f"%{query}%")).all()
        return jsonify({"podcasts": [p.serialize() for p in results]})
    
    elif content_type == "radio":
        results = RadioStation.query.filter(RadioStation.name.ilike(f"%{query}%")).all()
        return jsonify({"radio_stations": [r.serialize() for r in results]})
    
    return jsonify({"error": "Invalid content type"}), 400

@api.route("/merch", methods=["GET"])
@jwt_required()
def get_merch():
    products = Product.query.all()
    return jsonify([product.serialize() for product in products]), 200



# 📊 Fetch Analytics Data
@api.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    user_id = get_jwt_identity()
    analytics_data = Analytics.query.filter_by(user_id=user_id).all()

    return jsonify([data.serialize() for data in analytics_data]), 200

@api.route('/track-play', methods=['POST'])
@jwt_required()
def track_play():
    data = request.json
    user_id = get_jwt_identity()

    existing_analytics = Analytics.query.filter_by(
        user_id=user_id, content_id=data["content_id"], content_type=data["content_type"]
    ).first()

    if existing_analytics:
        existing_analytics.play_count += 1
    else:
        new_analytics = Analytics(
            user_id=user_id,
            content_id=data["content_id"],
            content_type=data["content_type"],
            play_count=1,
        )
        db.session.add(new_analytics)

    db.session.commit()
    return jsonify({"message": "Play recorded"}), 200

@api.route('/track-purchase', methods=['POST'])
@jwt_required()
def track_purchase():
    data = request.json
    user_id = get_jwt_identity()

    existing_analytics = Analytics.query.filter_by(
        user_id=user_id, content_id=data["content_id"], content_type=data["content_type"]
    ).first()

    if existing_analytics:
        existing_analytics.purchase_count += 1
        existing_analytics.revenue_generated += data["amount"]
    else:
        new_analytics = Analytics(
            user_id=user_id,
            content_id=data["content_id"],
            content_type=data["content_type"],
            purchase_count=1,
            revenue_generated=data["amount"],
        )
        db.session.add(new_analytics)

    db.session.commit()
    return jsonify({"message": "Purchase recorded"}), 200

@api.route("/creator-revenue", methods=["GET"])
@jwt_required()
def get_creator_revenue():
    """ Fetch revenue data for individual creators (artists & podcasters) """
    user_id = get_jwt_identity()

    # Revenue streams for creators
    artist_donations = db.session.query(db.func.sum(CreatorDonation.amount)).filter_by(user_id=user_id).scalar() or 0
    artist_music_sales = db.session.query(db.func.sum(Track.sales_revenue)).filter_by(artist_id=user_id).scalar() or 0
    artist_merch_sales = db.session.query(db.func.sum(Product.sales_revenue)).filter_by(seller_id=user_id).scalar() or 0
    artist_subscription_earnings = db.session.query(db.func.sum(Subscription.price)).filter_by(creator_id=user_id).scalar() or 0
    total_analytics_revenue = db.session.query(db.func.sum(Analytics.revenue_generated)).filter_by(user_id=user_id).scalar() or 0
    total_ad_revenue = db.session.query(db.func.sum(AdRevenue.amount)).filter_by(user_id=user_id).scalar() or 0

    # Calculate total revenue
    total_creator_revenue = (
        artist_donations + artist_music_sales + artist_merch_sales +
        artist_subscription_earnings + total_analytics_revenue + total_ad_revenue
    )

    return jsonify({
        "total_revenue": total_creator_revenue,
        "donations": artist_donations,
        "music_sales": artist_music_sales,
        "merch_sales": artist_merch_sales,
        "subscription_earnings": artist_subscription_earnings,
        "content_revenue": total_analytics_revenue,
        "ad_revenue": total_ad_revenue
    }), 200


@api.route("/payout/request", methods=["POST"])
@jwt_required()
def request_payout():
    """ Allow a creator to request a payout """
    user_id = get_jwt_identity()
    data = request.json
    amount = data.get("amount")

    # Validate payout amount
    creator_revenue = db.session.query(db.func.sum(Revenue.amount)).filter_by(user_id=user_id).scalar() or 0
    if amount > creator_revenue:
        return jsonify({"error": "Insufficient funds"}), 400

    new_payout = Payout(
        user_id=user_id,
        amount=amount,
        status="Pending",
        requested_at=datetime.utcnow()
    )
    db.session.add(new_payout)
    db.session.commit()

    return jsonify({"message": "Payout request submitted"}), 200

@api.route("/payout/approve/<int:payout_id>", methods=["PUT"])
@jwt_required()
def approve_payout(payout_id):
    """ Approve a payout request """
    user_id = get_jwt_identity()
    if not is_admin(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    payout = Payout.query.get(payout_id)
    if not payout:
        return jsonify({"error": "Payout request not found"}), 404

    payout.status = "Approved"
    payout.processed_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Payout approved"}), 200

@api.route("/payout/reject/<int:payout_id>", methods=["PUT"])
@jwt_required()
def reject_payout(payout_id):
    """ Reject a payout request """
    user_id = get_jwt_identity()
    if not is_admin(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    payout = Payout.query.get(payout_id)
    if not payout:
        return jsonify({"error": "Payout request not found"}), 404

    payout.status = "Rejected"
    db.session.commit()

    return jsonify({"message": "Payout rejected"}), 200


# === BACKEND ===
# File: /api/routes/user.py

user_api = Blueprint("user_api", __name__)

@api.route("/save-avatar", methods=["POST"])
@jwt_required()
def save_avatar():
    """
    Save the avatar URL to the user's profile.
    This route expects a JSON payload like: { "avatar_url": "https://..." }
    """
    data = request.get_json()
    avatar_url = data.get("avatar_url")

    if not avatar_url:
        return jsonify({ "error": "No avatar URL provided" }), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({ "error": "User not found" }), 404

    user.avatar_url = avatar_url
    db.session.commit()

    return jsonify({
        "message": "Avatar URL saved successfully.",
        "avatar_url": avatar_url
    }), 200


@api.route("get-avatar", methods=["GET"])
@jwt_required()
def get_avatar():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.avatar_url:
        return jsonify({ "avatar_url": None }), 404

    return jsonify({ "avatar_url": user.avatar_url }), 200

@api.route("/artist/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({ "error": "User not found" }), 404

    return jsonify({
        "username": user.username,
        "avatar_url": user.avatar_url
    }), 200

# Flask example
@api.route("/vr-events/create", methods=["POST"])
@jwt_required()
def create_vr_event():
    # Artist creates a new event
    pass

@api.route("/vr-events/<event_id>/join", methods=["GET"])
@jwt_required()
def join_vr_event(event_id):
    # Check if user has paid
    pass

@api.route("/create-payment-intent", methods=["POST"])
@jwt_required()
def create_payment():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        amount = data.get("amount", 999)

        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            automatic_payment_methods={"enabled": True},
        )

        # Save initial record
        new_payment = Payment(
            user_id=user_id,
            amount=amount,
            payment_intent_id=intent.id,
            status="pending"
        )
        db.session.add(new_payment)
        db.session.commit()

        return jsonify({"clientSecret": intent.client_secret})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/free-trial", methods=["POST"])
@jwt_required()
def activate_free_trial():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if user.is_on_trial:
        return jsonify({"message": "Trial already activated"}), 400

    trial_days = 7
    now = datetime.utcnow()
    user.is_on_trial = True
    user.trial_start_date = now
    user.trial_end_date = now + timedelta(days=trial_days)

    db.session.commit()
    return jsonify({"message": f"Free trial activated for {trial_days} days."}), 200

@api.route("/free-trial-status", methods=["GET"])
@jwt_required()
def trial_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    trial_active = False
    now = datetime.utcnow()

    if user.is_on_trial and user.trial_end_date and user.trial_end_date > now:
        trial_active = True
    elif user.is_on_trial and user.trial_end_date and user.trial_end_date <= now:
        # Auto-deactivate trial if expired
        user.is_on_trial = False
        db.session.commit()

    return jsonify({
        "is_on_trial": user.is_on_trial,
        "trial_active": trial_active,
        "trial_ends": user.trial_end_date.strftime("%Y-%m-%d") if user.trial_end_date else None
    }), 200

@api.route("/digital-products", methods=["GET"])
def list_digital_products():
    products = Product.query.filter_by(is_digital=True).all()
    return jsonify([product.serialize() for product in products]), 200

@api.route("/download/<int:product_id>", methods=["GET"])
@jwt_required()
def download_digital_product(product_id):
    user_id = get_jwt_identity()
    product = Product.query.get(product_id)

    if not product or not product.is_digital:
        return jsonify({"message": "Product not found or not downloadable"}), 404

    # 🔐 Check purchase (assuming Purchase model exists)
    purchase = Purchase.query.filter_by(user_id=user_id, product_id=product.id).first()
    if not purchase:
        return jsonify({"message": "Access denied. You must purchase this product."}), 403

    # Local file (or return signed S3 URL)
    filepath = os.path.join("uploads/products", product.file_url)
    return send_file(filepath, as_attachment=True)

@api.route("/refund/request", methods=["POST"])
@jwt_required()
def request_refund():
    user_id = get_jwt_identity()
    data = request.json

    refund = RefundRequest(
        user_id=user_id,
        product_id=data["product_id"],
        reason=data.get("reason", "")
    )

    db.session.add(refund)
    db.session.commit()
    return jsonify({"msg": "Refund request submitted"}), 201

@api.route("/refunds", methods=["GET"])
@jwt_required()
def get_refunds():
    # Optional: Check admin privileges here
    refunds = RefundRequest.query.all()
    return jsonify([r.serialize() for r in refunds]), 200

@api.route("/refunds/<int:refund_id>", methods=["PUT"])
@jwt_required()
def update_refund(refund_id):
    # Optional: Check admin privileges
    data = request.json
    refund = RefundRequest.query.get(refund_id)

    if not refund:
        return jsonify({"msg": "Refund not found"}), 404

    refund.status = data["status"]  # "Approved" or "Rejected"
    refund.reviewed_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"msg": f"Refund {refund.status}"}), 200

@api.route('/revenue-analytics', methods=['GET'])
@jwt_required()
def get_revenue_analytics():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Filter by creator if needed
    is_admin = user.role == "admin"
    filters = (Product.creator_id == user_id,) if not is_admin else ()

    total_revenue = db.session.query(func.sum(Product.sales_revenue)).filter(*filters).scalar() or 0
    total_products = Product.query.filter(*filters).count()
    total_orders = db.session.query(Order).filter(*filters).count()

    # Optional: Revenue by month
    revenue_by_month = db.session.query(
        func.date_trunc('month', Order.created_at).label('month'),
        func.sum(Order.amount)
    ).filter(*filters).group_by('month').order_by('month').all()

    return jsonify({
        "total_revenue": round(total_revenue, 2),
        "total_products": total_products,
        "total_orders": total_orders,
        "revenue_by_month": [
            {"month": str(month), "amount": float(amount)} for month, amount in revenue_by_month
        ]
    }), 200

# Function to start recording a stream
def start_recording(stream_url, output_path):
    try:
        # Run ffmpeg command to record the stream
        cmd = [
            'ffmpeg', 
            '-i', stream_url,  # input stream URL
            '-c', 'copy',      # copy video/audio codec
            '-f', 'flv',       # output format (flv)
            output_path        # output file path
        ]
        subprocess.Popen(cmd)  # Run the command asynchronously
        print(f"Recording started for {stream_url}")
    except Exception as e:
        print(f"Error starting recording: {e}")

# Route to start recording
@api.route('/start-recording', methods=['POST'])
def start_recording_route():
    # Replace these with actual stream URL and output file path
    stream_url = "rtmp://your-server/live/streamkey"
    output_path = "/path/to/save/stream.flv"  # Change this to your desired path
    
    start_recording(stream_url, output_path)
    return jsonify({"message": "Recording started"}), 200

# Route to stop recording (you could implement this to stop the process)
@api.route('/stop-recording', methods=['POST'])
def stop_recording_route():
    # Implement logic to kill the ffmpeg process if needed (not implemented here)
    return jsonify({"message": "Recording stopped"}), 200

if __name__ == "__main__":
    api.run(debug=True)
