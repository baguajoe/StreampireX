"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, PodcastEpisode, PodcastSubscription, StreamingHistory, RadioPlaylist, RadioStation, LiveStream, LiveChat, CreatorMembershipTier, CreatorDonation, AdRevenue, SubscriptionPlan, UserSubscription, Video, VideoPlaylist, VideoPlaylistVideo, Audio, PlaylistAudio 
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
import stripe


# Initialize Stripe
stripe.api_key = "your_stripe_secret_key"

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import SocketIO
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from api.models import db, Video, VideoPlaylist, VideoPlaylistVideo, LiveStream, LiveChat

api = Blueprint('api', __name__)
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
    user_id = get_jwt_identity()
    if 'audio' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    audio = request.files['audio']
    title = request.form.get('title', 'Untitled')
    description = request.form.get('description', '')

    filename = secure_filename(audio.filename)
    file_path = os.path.join("uploads/podcasts", filename)
    audio.save(file_path)

    new_episode = PodcastEpisode(
        user_id=user_id,
        title=title,
        description=description,
        file_url=file_path,
        uploaded_at=datetime.utcnow()
    )
    db.session.add(new_episode)
    db.session.commit()

    return jsonify({"message": "Podcast uploaded successfully", "episode": new_episode.serialize()}), 201

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

@api.route('/subscriptions/plans', methods=['GET'])
def get_subscription_plans():
    plans = SubscriptionPlan.query.all()
    return jsonify([plan.serialize() for plan in plans]), 200

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

