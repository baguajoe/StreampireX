"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import  db, User, PodcastEpisode, PodcastSubscription, StreamingHistory,RadioPlaylist, RadioStation, LiveStream, LiveChat, CreatorMembershipTier,CreatorDonation, AdRevenue, SubscriptionPlan, UserSubscription, Video,VideoPlaylist, VideoPlaylistVideo, Audio, PlaylistAudio, Podcast,ShareAnalytics, Like, Favorite, Comment, Notification, PricingPlan,Subscription, Product, RadioDonation, Role, RadioSubscription, MusicLicensing, PodcastHost, PodcastChapter, RadioSubmission, Collaboration, LicensingOpportunity
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
import whisper  # ✅ AI Transcription Support
import subprocess
import moviepy
import stripe
import os


# Initialize Stripe
stripe.api_key = "your_stripe_secret_key"

api = Blueprint('api', __name__)


# ✅ Define upload directories
AUDIO_UPLOAD_DIR = "uploads/podcasts/audio"
VIDEO_UPLOAD_DIR = "uploads/podcasts/video"
CLIP_UPLOAD_DIR = "uploads/podcasts/clips"
COVER_UPLOAD_DIR = "uploads/podcasts/covers"

UPLOAD_FOLDER = "uploads/podcasts"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(AUDIO_UPLOAD_DIR, exist_ok=True)
os.makedirs(VIDEO_UPLOAD_DIR, exist_ok=True)
os.makedirs(CLIP_UPLOAD_DIR, exist_ok=True)
os.makedirs(COVER_UPLOAD_DIR, exist_ok=True)

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


@api.route('/podcast/<int:episode_id>', methods=['GET'])
def get_podcast(episode_id):
    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404
    return jsonify({"podcast_url": episode.file_url})

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
    name = data.get("name")
    description = data.get("description", "")

    if not name:
        return jsonify({"error": "Radio station name is required"}), 400

    new_station = RadioStation(user_id=user_id, name=name, description=description)
    db.session.add(new_station)
    db.session.commit()

    return jsonify({"message": "Radio station created", "station": new_station.serialize()}), 201


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

@api.route('/api/track-share', methods=['POST'])
@jwt_required()
def track_share():
    data = request.json
    user_id = get_jwt_identity()

    new_share = ShareAnalytics(
        user_id=user_id,
        content_id=data['content_id'],
        content_type=data['content_type'],
        platform=data['platform']
    )

    db.session.add(new_share)
    db.session.commit()

    return jsonify({"message": "Share tracked successfully!"}), 201

@api.route('/api/share-stats', methods=['GET'])
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

    # Create New User
    new_user = User(
        email=email,
        username=username,
        password_hash=hashed_password,
        role=role,
        artist_name=artist_name,
        own_rights=own_rights,
        industry=industry,
        profile_picture=profile_pic_url,
        sample_track=sample_track_url
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


@api.route('/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    if not is_admin(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403
    users = User.query.all()
    return jsonify([user.serialize() for user in users]), 200

@api.route('/admin/revenue', methods=['GET'])
@jwt_required()
def get_revenue():
    if not is_admin(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403

    total_earnings = db.session.query(db.func.sum(Subscription.price)).scalar() or 0
    active_subscriptions = Subscription.query.count()

    return jsonify({
        "total_earnings": total_earnings,
        "active_subscriptions": active_subscriptions
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


@api.route('/artist/store/upload', methods=['POST'])
@jwt_required()
def upload_artist_music():
    user_id = get_jwt_identity()
    data = request.json

    new_song = Product(
        creator_id=user_id,
        title=data.get("title"),
        description=data.get("description"),
        image_url=data.get("cover_art"),
        file_url=data.get("file_url"),
        price=data.get("price"),
        is_digital=True
    )

    db.session.add(new_song)
    db.session.commit()

    return jsonify({"message": "Music uploaded successfully!", "song": new_song.serialize()}), 201


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

@api.route('/track-play', methods=['POST'])
@jwt_required()
def track_play():
    """Track each time a song is streamed"""
    data = request.json
    user_id = get_jwt_identity()
    track_id = data.get("track_id")

    if not track_id:
        return jsonify({"error": "Track ID required"}), 400

    new_play = StreamingHistory(
        user_id=user_id,
        content_id=track_id,
        content_type="audio",
        listened_at=datetime.utcnow()
    )
    db.session.add(new_play)
    db.session.commit()

    return jsonify({"message": "Play tracked successfully"}), 201


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


@api.route('/profile/music/upload', methods=['POST'])
@jwt_required()
def upload_music():
    """Allows users to upload music files to their profile."""
    user_id = get_jwt_identity()
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

@api.route('/podcast/clip', methods=['POST'])
@jwt_required()
def create_clip():
    """Generates a short podcast clip"""
    data = request.json
    podcast_id = data.get("podcast_id")
    start_time = data.get("start_time")  # in seconds
    end_time = data.get("end_time")  # in seconds

    podcast = Podcast.query.get_or_404(podcast_id)
    if not podcast.audio_url:
        return jsonify({"error": "No audio found for this podcast"}), 400

    clip_filename = f"clip_{podcast_id}_{start_time}_{end_time}.mp3"
    clip_path = os.path.join("uploads/podcasts/clips", clip_filename)

    # ✅ Generate clip using FFmpeg
    command = [
        "ffmpeg",
        "-i", podcast.audio_url,
        "-ss", str(start_time),
        "-to", str(end_time),
        "-c", "copy",
        clip_path
    ]
    subprocess.run(command)

    return jsonify({"message": "Clip created", "clip_url": clip_path}), 200

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