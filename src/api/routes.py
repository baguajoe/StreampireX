"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""

from flask import Flask, request, jsonify, url_for, Blueprint, send_from_directory, send_file, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, PodcastEpisode, PodcastSubscription, StreamingHistory, RadioPlaylist, RadioStation, LiveStream, LiveChat, CreatorMembershipTier, CreatorDonation, AdRevenue, SubscriptionPlan, UserSubscription, Video, VideoPlaylist, VideoPlaylistVideo, Audio, PlaylistAudio, Podcast, ShareAnalytics, Like, Favorite, FavoritePage, Comment, Notification, PricingPlan, Subscription, Product, RadioDonation, Role, RadioSubscription, MusicLicensing, PodcastHost, PodcastChapter, RadioSubmission, Collaboration, LicensingOpportunity, Track, Music, IndieStation, IndieStationTrack, IndieStationFollower, EventTicket, LiveStudio,PodcastClip, TicketPurchase, Analytics, Payout, Revenue, Payment, Order, RefundRequest, Purchase, Artist, Album, ListeningPartyAttendee, ListeningParty, Engagement, Earnings, Popularity, LiveEvent, Tip, Stream, Share, RadioFollower, VRAccessTicket, PodcastPurchase, MusicInteraction, Message, Conversation, Group, ChatMessage, UserSettings, TrackRelease, Release, Collaborator, Category, Post,Follow, Label
import cloudinary.uploader
import json
import os



from api.avatar_service import process_image_and_create_avatar


from api.utils import generate_sitemap, APIException, send_email
from sqlalchemy import func, desc
from datetime import timedelta  # for trial logic or date math
from flask_cors import CORS
from flask_apscheduler import APScheduler
from sqlalchemy.orm.exc import NoResultFound
from api.subscription_utils import get_user_plan, plan_required
from api.revenue_split import calculate_split, calculate_ad_revenue
from api.reports_utils import generate_monthly_report
from api.utils.revelator_api import submit_release_to_revelator
from rq import Queue
from redis import Redis
from api.utils.tasks import send_release_to_revelator






import uuid
import ffmpeg
import feedparser
import requests 
import whisper  # ✅ AI Transcription Support
import subprocess
import xml.etree.ElementTree as ET


# import moviepy
from moviepy import AudioFileClip, VideoFileClip
from moviepy.video.io.ffmpeg_tools import ffmpeg_extract_subclip



import stripe
import os
from flask_socketio import SocketIO
from flask_caching import Cache  # Assuming Flask-Caching is set up
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.start()

chat_api = Blueprint('chat_api', __name__)

# Initialize caching somewhere in your app setup

app = Flask(__name__)
cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})
cache.init_app(app)

scheduler = BackgroundScheduler()
scheduler.start()

# somewhere in your config or routes.py
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name="your-cloud-name",
    api_key="your-api-key",
    api_secret="your-api-secret"
)


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
    user = User.query.get(user_id)

    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    video = request.files['video']
    title = request.form.get('title', 'Untitled')
    description = request.form.get('description', '')

    if video.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # ✅ Upload to Cloudinary
        upload_result = cloudinary.uploader.upload_large(
            video,
            resource_type="video",
            folder="user_videos",
            public_id=secure_filename(video.filename).split('.')[0],
            overwrite=True
        )

        video_url = upload_result.get("secure_url")
        duration = upload_result.get("duration", 0)

        # ✅ Enforce duration limits by user role
        if user.role == 'Free' and duration > 120:
            return jsonify({"error": "Free users can only upload videos up to 2 minutes."}), 403
        elif user.role in ['Pro', 'Premium'] and duration > 1200:
            return jsonify({"error": "Video too long for Pro/Premium tier."}), 403

        # ✅ Save to DB
        new_video = Video(
            user_id=user_id,
            title=title,
            description=description,
            file_url=video_url,
            uploaded_at=datetime.utcnow()
        )
        db.session.add(new_video)
        db.session.commit()

        return jsonify({"message": "Video uploaded to Cloudinary!", "video": new_video.serialize()}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- GET VIDEOS ----------------
@api.route('/videos', methods=['GET'])
def get_videos():
    # Get query parameters for filtering and search
    search = request.args.get('search', '').strip()
    category = request.args.get('category', 'All')
    sort_by = request.args.get('sort_by', 'newest')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    # Start with your existing base query
    query = Video.query.filter_by(is_public=True)
    
    # Add search functionality
    if search:
        # Search in title, description, and uploader name
        search_filter = or_(
            Video.title.ilike(f'%{search}%'),
            Video.description.ilike(f'%{search}%') if hasattr(Video, 'description') else False,
            User.display_name.ilike(f'%{search}%'),
            User.username.ilike(f'%{search}%')
        )
        query = query.join(User).filter(search_filter)
    
    # Add category filtering (if you have categories)
    if category and category != 'All':
        if hasattr(Video, 'category_id'):
            category_obj = Category.query.filter_by(name=category).first()
            if category_obj:
                query = query.filter(Video.category_id == category_obj.id)
    
    # Add sorting options
    if sort_by == 'newest':
        query = query.order_by(desc(Video.created_at))
    elif sort_by == 'oldest':
        query = query.order_by(asc(Video.created_at))
    elif sort_by == 'popular':
        # If you have views field, otherwise use likes
        if hasattr(Video, 'views'):
            query = query.order_by(desc(Video.views))
        else:
            query = query.order_by(desc(Video.likes))
    elif sort_by == 'most_liked':
        query = query.order_by(desc(Video.likes))
    else:
        # Default to newest
        query = query.order_by(desc(Video.created_at))
    
    # Add pagination
    paginated_videos = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    # Enhanced video serialization
    videos_data = []
    for v in paginated_videos.items:
        video_data = {
            "id": v.id,
            "title": v.title,
            "file_url": v.file_url,
            "likes": v.likes,
            "created_at": v.created_at.isoformat(),
            "uploader_id": v.user_id,
            "uploader_name": v.user.display_name or v.user.username,
            
            # Add these fields if they exist in your model
            "description": getattr(v, 'description', None),
            "thumbnail_url": getattr(v, 'thumbnail_url', None),
            "duration": getattr(v, 'duration', None),
            "views": getattr(v, 'views', 0),
            "comments_count": getattr(v, 'comments_count', 0),
            
            # Add uploader avatar if available
            "uploader_avatar": getattr(v.user, 'profile_picture', None) or getattr(v.user, 'avatar_url', None),
            
            # Add category if available
            "category": v.category.name if hasattr(v, 'category') and v.category else "Other"
        }
        videos_data.append(video_data)
    
    # Return enhanced response with pagination info
    return jsonify({
        "videos": videos_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": paginated_videos.total,
            "pages": paginated_videos.pages,
            "has_next": paginated_videos.has_next,
            "has_prev": paginated_videos.has_prev
        },
        "filters": {
            "search": search,
            "category": category,
            "sort_by": sort_by
        }
    }), 200  

@api.route('/videos/categories', methods=['GET'])
def get_video_categories():
    """Get all video categories with counts"""
    
    # If you don't have categories yet, return comprehensive hardcoded ones
    if not hasattr(Video, 'category_id'):
        # Comprehensive video categories
        categories = [
            {"id": 0, "name": "All", "video_count": Video.query.filter_by(is_public=True).count()},
            
            # Music & Audio
            {"id": 1, "name": "Music", "video_count": 0},
            {"id": 2, "name": "Podcasts", "video_count": 0},
            {"id": 3, "name": "Live Concerts", "video_count": 0},
            {"id": 4, "name": "Music Videos", "video_count": 0},
            {"id": 5, "name": "DJ Sets", "video_count": 0},
            {"id": 6, "name": "Karaoke", "video_count": 0},
            
            # Health & Wellness
            {"id": 7, "name": "Meditation", "video_count": 0},
            {"id": 8, "name": "Yoga", "video_count": 0},
            {"id": 9, "name": "Fitness", "video_count": 0},
            {"id": 10, "name": "Mental Health", "video_count": 0},
            {"id": 11, "name": "Nutrition", "video_count": 0},
            {"id": 12, "name": "Sleep & Relaxation", "video_count": 0},
            
            # Education & Learning
            {"id": 13, "name": "Education", "video_count": 0},
            {"id": 14, "name": "Tutorials", "video_count": 0},
            {"id": 15, "name": "Language Learning", "video_count": 0},
            {"id": 16, "name": "Science", "video_count": 0},
            {"id": 17, "name": "History", "video_count": 0},
            {"id": 18, "name": "Philosophy", "video_count": 0},
            
            # Technology
            {"id": 19, "name": "Tech", "video_count": 0},
            {"id": 20, "name": "Programming", "video_count": 0},
            {"id": 21, "name": "AI & Machine Learning", "video_count": 0},
            {"id": 22, "name": "Web Development", "video_count": 0},
            {"id": 23, "name": "Mobile Apps", "video_count": 0},
            {"id": 24, "name": "Cybersecurity", "video_count": 0},
            
            # Entertainment
            {"id": 25, "name": "Comedy", "video_count": 0},
            {"id": 26, "name": "Movies & TV", "video_count": 0},
            {"id": 27, "name": "Anime & Manga", "video_count": 0},
            {"id": 28, "name": "Celebrity News", "video_count": 0},
            {"id": 29, "name": "Reactions", "video_count": 0},
            {"id": 30, "name": "Memes", "video_count": 0},
            
            # Gaming
            {"id": 31, "name": "Gaming", "video_count": 0},
            {"id": 32, "name": "Game Reviews", "video_count": 0},
            {"id": 33, "name": "Esports", "video_count": 0},
            {"id": 34, "name": "Game Development", "video_count": 0},
            {"id": 35, "name": "Streaming Highlights", "video_count": 0},
            
            # Lifestyle
            {"id": 36, "name": "Lifestyle", "video_count": 0},
            {"id": 37, "name": "Fashion", "video_count": 0},
            {"id": 38, "name": "Beauty", "video_count": 0},
            {"id": 39, "name": "Travel", "video_count": 0},
            {"id": 40, "name": "Food & Cooking", "video_count": 0},
            {"id": 41, "name": "Home & Garden", "video_count": 0},
            {"id": 42, "name": "Parenting", "video_count": 0},
            {"id": 43, "name": "Relationships", "video_count": 0},
            
            # Creative Arts
            {"id": 44, "name": "Art", "video_count": 0},
            {"id": 45, "name": "Photography", "video_count": 0},
            {"id": 46, "name": "Design", "video_count": 0},
            {"id": 47, "name": "Writing", "video_count": 0},
            {"id": 48, "name": "Crafts & DIY", "video_count": 0},
            {"id": 49, "name": "Architecture", "video_count": 0},
            
            # Business & Finance
            {"id": 50, "name": "Business", "video_count": 0},
            {"id": 51, "name": "Entrepreneurship", "video_count": 0},
            {"id": 52, "name": "Investing", "video_count": 0},
            {"id": 53, "name": "Cryptocurrency", "video_count": 0},
            {"id": 54, "name": "Marketing", "video_count": 0},
            {"id": 55, "name": "Personal Finance", "video_count": 0},
            
            # Sports & Activities
            {"id": 56, "name": "Sports", "video_count": 0},
            {"id": 57, "name": "Basketball", "video_count": 0},
            {"id": 58, "name": "Football", "video_count": 0},
            {"id": 59, "name": "Soccer", "video_count": 0},
            {"id": 60, "name": "Extreme Sports", "video_count": 0},
            {"id": 61, "name": "Martial Arts", "video_count": 0},
            
            # News & Politics
            {"id": 62, "name": "News", "video_count": 0},
            {"id": 63, "name": "Politics", "video_count": 0},
            {"id": 64, "name": "Current Events", "video_count": 0},
            {"id": 65, "name": "Documentary", "video_count": 0},
            
            # Spirituality & Personal Growth
            {"id": 66, "name": "Spirituality", "video_count": 0},
            {"id": 67, "name": "Personal Development", "video_count": 0},
            {"id": 68, "name": "Motivation", "video_count": 0},
            {"id": 69, "name": "Life Coaching", "video_count": 0},
            
            # Automotive
            {"id": 70, "name": "Cars & Automotive", "video_count": 0},
            {"id": 71, "name": "Car Reviews", "video_count": 0},
            {"id": 72, "name": "Motorcycles", "video_count": 0},
            
            # Animals & Nature
            {"id": 73, "name": "Animals", "video_count": 0},
            {"id": 74, "name": "Pets", "video_count": 0},
            {"id": 75, "name": "Nature", "video_count": 0},
            {"id": 76, "name": "Wildlife", "video_count": 0},
            
            # Kids & Family
            {"id": 77, "name": "Kids & Family", "video_count": 0},
            {"id": 78, "name": "Educational Kids", "video_count": 0},
            {"id": 79, "name": "Family Activities", "video_count": 0},
            
            # Special Interest
            {"id": 80, "name": "True Crime", "video_count": 0},
            {"id": 81, "name": "Conspiracy Theories", "video_count": 0},
            {"id": 82, "name": "Paranormal", "video_count": 0},
            {"id": 83, "name": "Space & Astronomy", "video_count": 0},
            {"id": 84, "name": "Mathematics", "video_count": 0},
            {"id": 85, "name": "Book Reviews", "video_count": 0},
            
            # Miscellaneous
            {"id": 86, "name": "ASMR", "video_count": 0},
            {"id": 87, "name": "Unboxing", "video_count": 0},
            {"id": 88, "name": "Product Reviews", "video_count": 0},
            {"id": 89, "name": "Challenges", "video_count": 0},
            {"id": 90, "name": "Vlogs", "video_count": 0},
            {"id": 91, "name": "Other", "video_count": 0}
        ]
        return jsonify({"categories": categories}), 200
    
    # If you have categories table, use this:
    try:
        categories = Category.query.all()
        categories_data = []
        
        # Add "All" category
        total_videos = Video.query.filter_by(is_public=True).count()
        categories_data.append({
            "id": 0,
            "name": "All",
            "video_count": total_videos
        })
        
        # Add other categories
        for category in categories:
            video_count = Video.query.filter_by(
                category_id=category.id,
                is_public=True
            ).count()
            
            categories_data.append({
                "id": category.id,
                "name": category.name,
                "video_count": video_count
            })
        
        return jsonify({"categories": categories_data}), 200
    
    except Exception as e:
        # Fallback to hardcoded categories if Category model doesn't exist
        categories = [
            {"id": 0, "name": "All", "video_count": Video.query.filter_by(is_public=True).count()},
            {"id": 1, "name": "Music", "video_count": 0},
            {"id": 2, "name": "Podcasts", "video_count": 0},
            {"id": 3, "name": "Meditation", "video_count": 0},
            {"id": 4, "name": "Fitness", "video_count": 0},
            {"id": 5, "name": "Education", "video_count": 0},
            {"id": 6, "name": "Entertainment", "video_count": 0},
            {"id": 7, "name": "Gaming", "video_count": 0},
            {"id": 8, "name": "Tech", "video_count": 0},
            {"id": 9, "name": "Art", "video_count": 0},
            {"id": 10, "name": "Other", "video_count": 0}
        ]
        return jsonify({"categories": categories}), 200

# STEP 3: Add like functionality
@api.route('/videos/<int:video_id>/like', methods=['POST'])
@jwt_required()  # Assuming you're using JWT
def like_video(video_id):
    """Like or unlike a video"""
    from flask_jwt_extended import get_jwt_identity
    
    user_id = get_jwt_identity()
    video = Video.query.get_or_404(video_id)
    
    # Simple like system (you can enhance this later with a separate likes table)
    # For now, we'll just increment/decrement the likes count
    # You could add a user_likes table to track who liked what
    
    # This is a simplified version - you'd want to track user likes properly
    video.likes += 1
    db.session.commit()
    
    return jsonify({
        "likes": video.likes,
        "message": "Video liked successfully"
    }), 200

# STEP 4: Add view tracking
@api.route('/videos/<int:video_id>/view', methods=['POST'])
def record_video_view(video_id):
    """Record a video view"""
    video = Video.query.get_or_404(video_id)
    
    # If you have a views field, increment it
    if hasattr(video, 'views'):
        video.views += 1
        db.session.commit()
        
        return jsonify({
            "views": video.views,
            "message": "View recorded"
        }), 200
    
    return jsonify({"message": "View tracking not available"}), 200

# STEP 5: Get trending videos
@api.route('/videos/trending', methods=['GET'])
def get_trending_videos():
    """Get trending videos based on likes and recent uploads"""
    from datetime import datetime, timedelta
    
    # Get videos from last 7 days, sorted by engagement
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    trending_videos = Video.query.filter(
        Video.created_at >= week_ago,
        Video.is_public == True
    ).order_by(desc(Video.likes)).limit(10).all()
    
    videos_data = []
    for v in trending_videos:
        videos_data.append({
            "id": v.id,
            "title": v.title,
            "file_url": v.file_url,
            "likes": v.likes,
            "created_at": v.created_at.isoformat(),
            "uploader_id": v.user_id,
            "uploader_name": v.user.display_name or v.user.username,
            "uploader_avatar": getattr(v.user, 'profile_picture', None) or getattr(v.user, 'avatar_url', None),
            "views": getattr(v, 'views', 0)
        })
    
    return jsonify({"trending_videos": videos_data}), 200 



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
    station_id = data.get("station_id")  # Optional for radio stations

    # If station_id is provided, handle it as a radio stream
    if station_id:
        station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
        if not station:
            return jsonify({"error": "Station not found or unauthorized"}), 403

        # Create a live stream for the radio station
        new_stream = LiveStream(
            station_id=station_id,
            stream_key=f"user_{user_id}_stream",
            is_live=True
        )
    else:
        # Create a live stream for the user
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

@api.route('/stop_stream', methods=['POST'])
@jwt_required()
def stop_stream():
    user_id = get_jwt_identity()
    stream_id = request.json.get("stream_id")

    # Find the stream in the database
    stream = LiveStream.query.filter_by(id=stream_id, user_id=user_id, is_live=True).first()

    if stream:
        stream.is_live = False
        stream.ended_at = datetime.utcnow()  # Mark when the stream ends
        db.session.commit()

        return jsonify({"message": "Live stream stopped", "stream": stream.serialize()}), 200
    else:
        return jsonify({"message": "Stream not found or already stopped"}), 404

@api.route('/update_stream', methods=['PUT'])
@jwt_required()
def update_stream():
    user_id = get_jwt_identity()
    data = request.json
    stream_id = data.get("stream_id")
    title = data.get("title")
    description = data.get("description")

    stream = LiveStream.query.filter_by(id=stream_id, user_id=user_id).first()

    if stream:
        stream.title = title
        stream.description = description
        db.session.commit()

        return jsonify({"message": "Stream updated", "stream": stream.serialize()}), 200
    else:
        return jsonify({"message": "Stream not found"}), 404
    
# Example of stream scheduling route in Flask
@api.route('/streams/schedule', methods=['POST'])
@jwt_required()
def schedule_stream():
    data = request.get_json()
    title = data.get("title")
    description = data.get("description")
    stream_time = data.get("stream_time")  # DateTime of when the stream should start
    
    # Save scheduled stream to database
    scheduled_stream = LiveStream(
        user_id=get_jwt_identity(),
        title=title,
        description=description,
        stream_time=stream_time,
        is_scheduled=True
    )
    
    db.session.add(scheduled_stream)
    db.session.commit()

    return jsonify({"message": "Stream scheduled successfully", "scheduled_stream": scheduled_stream.serialize()}), 201

# Flask route for saving a stream to a user's profile
@api.route('/streams/save', methods=['POST'])
@jwt_required()
def save_stream():
    """Save a stream to the user's profile"""
    user_id = get_jwt_identity()
    data = request.get_json()

    # Ensure stream_id is passed
    stream_id = data.get("stream_id")
    if not stream_id:
        return jsonify({"error": "Stream ID is required"}), 400

    # Retrieve the stream from the database
    stream = LiveStream.query.get(stream_id)
    if not stream:
        return jsonify({"error": "Stream not found"}), 404

    # Save the stream for the user
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Assuming you have a many-to-many relationship table `saved_streams`
    user.saved_streams.append(stream)
    db.session.commit()

    return jsonify({"message": "Stream saved to profile"}), 200



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
    from moviepy.editor import AudioFileClip, VideoFileClip
    import whisper

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    title = request.form.get('title', '').strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    # Form fields
    description = request.form.get('description', '')
    category = request.form.get('category', 'General')
    subscription_tier = request.form.get('subscription_tier', 'Free')
    is_premium = request.form.get('is_premium', 'false').lower() == 'true'
    streaming_enabled = request.form.get('streaming_enabled', 'false').lower() == 'true'
    is_profile_upload = request.form.get('profile_upload', 'false').lower() == 'true'
    scheduled_release = request.form.get('scheduled_release')
    series_name = request.form.get('series_name')
    season_number = request.form.get('season_number')

    # Handle audio file
    audio_url = None
    audio_duration = None
    if 'audio' in request.files:
        audio = request.files['audio']
        audio_filename = secure_filename(audio.filename)
        audio_path = os.path.join(AUDIO_UPLOAD_DIR, audio_filename)
        audio.save(audio_path)
        audio_url = audio_path
        try:
            audio_clip = AudioFileClip(audio_path)
            audio_duration = int(audio_clip.duration)
            audio_clip.close()
        except Exception as e:
            print(f"Audio duration error: {e}")

    # Handle video file
    video_url = None
    video_duration = None
    if 'video' in request.files:
        video = request.files['video']
        video_filename = secure_filename(video.filename)
        video_path = os.path.join(VIDEO_UPLOAD_DIR, video_filename)
        video.save(video_path)
        video_url = video_path
        try:
            video_clip = VideoFileClip(video_path)
            video_duration = int(video_clip.duration)
            video_clip.close()
        except Exception as e:
            print(f"Video duration error: {e}")

    # Cover art
    cover_art_url = None
    if 'cover_art' in request.files:
        cover = request.files['cover_art']
        cover_filename = secure_filename(cover.filename)
        cover_path = os.path.join(COVER_UPLOAD_DIR, cover_filename)
        cover.save(cover_path)
        cover_art_url = cover_path

    # Optional transcription (audio only)
    transcription = None
    if audio_url:
        try:
            model = whisper.load_model("base")
            result = model.transcribe(audio_url)
            transcription = result.get("text", "")
        except Exception as e:
            print(f"Transcription error: {e}")
            transcription = None

    # Determine episode number
    latest = Podcast.query.filter_by(host_id=user_id, series_name=series_name)\
        .order_by(Podcast.episode_number.desc()).first()
    episode_number = latest.episode_number + 1 if latest else 1

    # Stripe product
    stripe_product_id = None
    if is_premium:
        try:
            stripe_product = stripe.Product.create(name=title)
            stripe_product_id = stripe_product["id"]
        except Exception as e:
            print(f"Stripe error: {e}")

    # Save to DB
    new_podcast = Podcast(
        host_id=user_id,
        title=title,
        description=description,
        category=category,
        subscription_tier=subscription_tier,
        monetization_type="paid" if is_premium else "free",
        is_live=False,
        streaming_enabled=streaming_enabled,
        audio_url=audio_url,
        video_url=video_url,
        cover_art_url=cover_art_url,
        uploaded_at=datetime.utcnow(),
        transcription=transcription,
        duration=audio_duration or video_duration,
        episode_number=episode_number,
        stripe_product_id=stripe_product_id,
        scheduled_release=datetime.fromisoformat(scheduled_release) if scheduled_release else None,
        series_name=series_name,
        season_number=int(season_number) if season_number else None
    )

    db.session.add(new_podcast)
    db.session.commit()

    return jsonify({
        "message": "✅ Podcast uploaded successfully!",
        "redirect": "/profile" if is_profile_upload else "/podcasts",
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





# ✅ Schedule Episode for Future Release
@api.route('/podcast/<int:podcast_id>/episode/schedule', methods=['POST'])
@jwt_required()
def schedule_episode(podcast_id):
    data = request.json
    episode_id = data.get("episode_id")
    release_time = data.get("release_time")  # Format: "YYYY-MM-DD HH:MM:SS"

    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404

    try:
        scheduled_dt = datetime.strptime(release_time, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return jsonify({"error": "Invalid datetime format"}), 400

    episode.scheduled_release = scheduled_dt
    db.session.commit()

    scheduler.add_job(
        func=publish_episode,
        trigger="date",
        run_date=scheduled_dt,
        args=[episode_id],
        id=f"publish_episode_{episode_id}"
    )

    return jsonify({"message": "Episode scheduled successfully"}), 200

def publish_episode(episode_id):
    episode = PodcastEpisode.query.get(episode_id)
    if episode and not episode.is_published:
        episode.is_published = True
        db.session.commit()


# ✅ RSS Export for Podcast
@api.route('/podcast/<int:podcast_id>/rss', methods=['GET'])
def export_rss(podcast_id):
    podcast = Podcast.query.get(podcast_id)
    if not podcast:
        return jsonify({"error": "Podcast not found"}), 404

    rss = ET.Element("rss", version="2.0")
    channel = ET.SubElement(rss, "channel")
    ET.SubElement(channel, "title").text = podcast.title
    ET.SubElement(channel, "description").text = podcast.description or ""

    for episode in podcast.episodes:
        item = ET.SubElement(channel, "item")
        ET.SubElement(item, "title").text = episode.title
        ET.SubElement(item, "description").text = episode.description or ""
        ET.SubElement(item, "pubDate").text = episode.created_at.strftime("%a, %d %b %Y %H:%M:%S +0000")
        ET.SubElement(item, "enclosure", url=episode.file_url, type="audio/mpeg")

    xml_str = ET.tostring(rss, encoding='utf-8')
    return Response(xml_str, mimetype='application/xml')


# ✅ RSS Import to Create Episodes
@api.route('/podcast/<int:podcast_id>/rss/import', methods=['POST'])
@jwt_required()
def import_rss(podcast_id):
    data = request.json
    rss_url = data.get("rss_url")
    feed = feedparser.parse(rss_url)

    for entry in feed.entries:
        new_episode = PodcastEpisode(
            podcast_id=podcast_id,
            title=entry.title,
            description=getattr(entry, 'description', ''),
            file_url=entry.enclosures[0].href if entry.enclosures else None,
            is_published=True,
            created_at=datetime.utcnow()
        )
        db.session.add(new_episode)
    db.session.commit()

    return jsonify({"message": "RSS imported successfully"}), 200



# ✅ Unified Ticket Verification for VR Listening Room
@api.route('/vr/listening-room/<int:event_id>/verify', methods=['GET', 'POST'])
@jwt_required()
def verify_ticket(event_id):
    user_id = get_jwt_identity()

    # Use the unified VRAccessTicket model
    ticket = VRAccessTicket.query.filter_by(user_id=user_id, event_id=event_id).first()

    if not ticket:
        return jsonify({"access": False, "error": "No valid ticket found"}), 403

    # Optional: flag the ticket as verified
    if not ticket.is_verified:
        ticket.is_verified = True
        db.session.commit()

    return jsonify({
        "access": True,
        "avatar_url": ticket.user.avatar_url if ticket.user else None
    }), 200

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

@api.route('/radio/<int:station_id>/follow-or-grant', methods=['POST'])
@jwt_required()
def follow_or_grant(station_id):
    """
    If public: lets user follow a radio station.
    If private: allows owner to grant access to another user.
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    station = RadioStation.query.get(station_id)
    if not station:
        return jsonify({"error": "Station not found"}), 404

    # Scenario 1: Public Station - Follow
    if station.is_public:
        if user_id in [u.id for u in station.allowed_users]:
            return jsonify({"message": "Already following this station"}), 200

        station.allowed_users.append(User.query.get(user_id))
        station.followers_count += 1
        db.session.commit()

        socketio.emit(f"station-{station_id}-new-follower", {"stationId": station_id})
        return jsonify({"message": "Now following this public station!"}), 200

    # Scenario 2: Private Station - Grant access to another user
    if station.user_id != user_id:
        return jsonify({"error": "Not authorized to grant access"}), 403

    target_user_id = data.get("user_id")
    if not target_user_id:
        return jsonify({"error": "Missing user_id in request for private station"}), 400

    user_to_add = User.query.get(target_user_id)
    if not user_to_add:
        return jsonify({"error": "User not found"}), 404

    if user_to_add in station.allowed_users:
        return jsonify({"message": "User already has access to this private station"}), 200

    station.allowed_users.append(user_to_add)
    station.followers_count += 1
    db.session.commit()

    socketio.emit(f"station-{station_id}-new-follower", {"stationId": station_id, "granted_to": target_user_id})
    return jsonify({"message": "Access granted to private station!"}), 200



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



@api.route('/api/radio-stations', methods=['GET'])
def get_public_radio_stations():
    """Public endpoint to get all radio stations without authentication"""
    try:
        stations = RadioStation.query.all()
        return jsonify([station.serialize() for station in stations]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch radio stations"}), 500

@api.route('/api/radio-stations/<int:id>', methods=['GET'])
def get_radio_station_detail(id):
    station = RadioStation.query.get(id)
    if not station:
        return jsonify({"error": "Station not found"}), 404
    return jsonify(station.serialize()), 200

@api.route("/api/radio-station/<int:station_id>/playlist", methods=["GET"])
def get_radio_station_playlist(station_id):
    station = RadioStation.query.get_or_404(station_id)
    playlist_entries = RadioPlaylist.query.filter_by(station_id=station.id).all()
    result = []
    for entry in playlist_entries:
        audio = entry.audio
        result.append({
            "id": audio.id,
            "title": audio.title,
            "artist_name": audio.artist_name,
            "audio_url": audio.file_url
        })
    return jsonify(result), 200



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

    if not plan_id:
        return jsonify({"error": "Missing plan_id"}), 400

    plan = SubscriptionPlan.query.get(plan_id)
    if not plan:
        return jsonify({"error": "Plan not found"}), 404

    try:
        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': plan.name
                    },
                    'unit_amount': int(plan.price_monthly * 100),  # Stripe uses cents
                    'recurring': {
                        'interval': 'month'
                    }
                },
                'quantity': 1
            }],
            mode='subscription',
            success_url='https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://yourapp.com/cancel'
        )

        # Optionally, log intent (you can insert a pending subscription record here)
        new_sub = UserSubscription(
            user_id=user_id,
            plan_id=plan.id,
            stripe_subscription_id=None,  # Will be updated via webhook
            start_date=datetime.utcnow()
        )
        db.session.add(new_sub)
        db.session.commit()

        return jsonify({"checkout_url": session.url}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
def get_creator_ad_revenue():
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
    # Ensure that user.serialize() is correct for your User model
    return jsonify([user.serialize() for user in users]), 200

# Route to get the logged-in user's profile
@api.route("/user/profile", methods=["GET"])
@jwt_required()
def get_user_profile():
    user_id = get_jwt_identity()  # Get the current user's ID from the JWT token
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.serialize()), 200


@api.route('/public-podcasts', methods=['GET'])
def get_public_podcasts():
    podcasts = Podcast.query.all()
    return jsonify([podcast.serialize() for podcast in podcasts]), 200

# @api.route('/api/public-radio-stations', methods=['GET'])
# def get_public_radio_stations():
#     stations = RadioStation.query.all()
#     return jsonify([station.serialize() for station in stations]), 200


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
        role_id=new_role.id if new_role else role_exist.id,
        artist_name=artist_name,
        industry=industry,
        
        
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created successfully!"}), 201

@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user": user.serialize()
        }), 200

    return jsonify({"error": "Invalid email or password"}), 401

@api.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    user_id = get_jwt_identity()
    return jsonify({"user_id": user_id}), 200




@api.route('/podcasts/category/<string:category>', methods=['GET'])
def get_podcasts_by_category(category):
    podcasts = Podcast.query.filter_by(category=category).all()
    return jsonify([podcast.serialize() for podcast in podcasts]), 200

@api.route('/podcasts/categories', methods=['GET'])
def get_podcast_categories():
    try:
        # Try to get from database first
        categories = Category.query.filter_by(is_active=True).order_by(Category.sort_order, Category.name).all()
        
        if categories:
            return jsonify([cat.serialize() for cat in categories]), 200
        
        # Fallback to hardcoded list if database is empty
        categories_list = [
            {
                "id": 1,
                "name": "True Crime & Investigative Journalism",
                "slug": "true-crime-investigative-journalism",
                "description": "Deep dives into criminal cases and investigative stories",
                "icon": "🔍",
                "color": "#8B0000"
            },
            {
                "id": 2,
                "name": "Celebrity Gossip & Reality TV",
                "slug": "celebrity-gossip-reality-tv",
                "description": "Latest celebrity news and reality TV discussions",
                "icon": "⭐",
                "color": "#FF6B6B"
            },
            {
                "id": 3,
                "name": "Education & Learning",
                "slug": "education-learning",
                "description": "Educational content and skill development",
                "icon": "📚",
                "color": "#4ECDC4"
            },
            {
                "id": 4,
                "name": "Comedy & Stand-Up",
                "slug": "comedy-stand-up",
                "description": "Humor, comedy shows, and stand-up performances",
                "icon": "😂",
                "color": "#FFE66D"
            },
            {
                "id": 5,
                "name": "Tabletop & Board Games",
                "slug": "tabletop-board-games",
                "description": "Board games, RPGs, and tabletop gaming",
                "icon": "🎲",
                "color": "#95E1D3"
            },
            {
                "id": 6,
                "name": "Film & TV Reviews",
                "slug": "film-tv-reviews",
                "description": "Movie and TV show reviews and analysis",
                "icon": "🎬",
                "color": "#A8E6CF"
            },
            {
                "id": 7,
                "name": "Technology & Innovation",
                "slug": "technology-innovation",
                "description": "Latest in tech, AI, and innovation",
                "icon": "💻",
                "color": "#88D8B0"
            },
            {
                "id": 8,
                "name": "Health & Wellness",
                "slug": "health-wellness",
                "description": "Health tips, wellness, and mental health",
                "icon": "🏥",
                "color": "#FFEAA7"
            },
            {
                "id": 9,
                "name": "Business & Finance",
                "slug": "business-finance",
                "description": "Business insights and financial advice",
                "icon": "💼",
                "color": "#DDA0DD"
            },
            {
                "id": 10,
                "name": "Sports & Recreation",
                "slug": "sports-recreation",
                "description": "Sports analysis and recreational activities",
                "icon": "⚽",
                "color": "#98D8C8"
            }
        ]
        
        return jsonify(categories_list), 200
        
    except Exception as e:
        print(f"Error in get_podcast_categories: {str(e)}")
        # Return minimal fallback in case of any error
        fallback_categories = [
            {"id": 1, "name": "True Crime & Investigative Journalism", "slug": "true-crime"},
            {"id": 2, "name": "Celebrity Gossip & Reality TV", "slug": "celebrity-gossip"},
            {"id": 3, "name": "Education & Learning", "slug": "education"},
            {"id": 4, "name": "Comedy & Stand-Up", "slug": "comedy"},
            {"id": 5, "name": "Tabletop & Board Games", "slug": "tabletop-games"},
            {"id": 6, "name": "Film & TV Reviews", "slug": "film-tv-reviews"}
        ]
        return jsonify(fallback_categories), 200

# Helper function to populate database with initial categories
def seed_categories():
    """Run this once to populate your database with initial categories"""
    categories_data = [
        {"name": "True Crime & Investigative Journalism", "icon": "🔍", "color": "#8B0000"},
        {"name": "Celebrity Gossip & Reality TV", "icon": "⭐", "color": "#FF6B6B"},
        {"name": "Education & Learning", "icon": "📚", "color": "#4ECDC4"},
        {"name": "Comedy & Stand-Up", "icon": "😂", "color": "#FFE66D"},
        {"name": "Tabletop & Board Games", "icon": "🎲", "color": "#95E1D3"},
        {"name": "Film & TV Reviews", "icon": "🎬", "color": "#A8E6CF"},
        {"name": "Technology & Innovation", "icon": "💻", "color": "#88D8B0"},
        {"name": "Health & Wellness", "icon": "🏥", "color": "#FFEAA7"},
        {"name": "Business & Finance", "icon": "💼", "color": "#DDA0DD"},
        {"name": "Sports & Recreation", "icon": "⚽", "color": "#98D8C8"}
    ]
    
    for cat_data in categories_data:
        slug = cat_data["name"].lower().replace("&", "and").replace(" ", "-").replace("--", "-")
        
        existing = Category.query.filter_by(slug=slug).first()
        if not existing:
            category = Category(
                name=cat_data["name"],
                slug=slug,
                icon=cat_data["icon"],
                color=cat_data["color"],
                is_active=True
            )
            db.session.add(category)
    
    db.session.commit()
    print("Categories seeded successfully!")




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

api.route('/api/products/upload', methods=['POST'])
@jwt_required()
def upload_product():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Try both form and JSON fields
    if request.content_type and "application/json" in request.content_type:
        data = request.get_json()
        title = data.get("title")
        description = data.get("description")
        price = data.get("price")
        is_digital = data.get("is_digital", False)
        stock = data.get("stock")
        file_url = data.get("file_url")
        image_url = data.get("image_url")  # Assume already uploaded externally
    else:
        title = request.form.get("title")
        description = request.form.get("description")
        price = request.form.get("price")
        is_digital = request.form.get("is_digital") == "true"
        stock = request.form.get("stock")
        file_url = request.form.get("file_url")
        image_file = request.files.get("image")

        # Upload image if present
        if image_file:
            try:
                uploaded = cloudinary.uploader.upload(image_file)
                image_url = uploaded.get("secure_url")
            except Exception as e:
                return jsonify({"error": "Image upload failed", "details": str(e)}), 500
        else:
            image_url = None

    # Basic field validation
    if not title or not price or not image_url:
        return jsonify({"error": "Missing required fields (title, price, image)"}), 400

    product = Product(
        creator_id=user.id,
        title=title,
        description=description,
        image_url=image_url,
        file_url=file_url if is_digital else None,
        price=float(price),
        stock=int(stock) if not is_digital and stock else None,
        is_digital=is_digital,
        created_at=datetime.utcnow()
    )

    db.session.add(product)
    db.session.commit()

    return jsonify({"message": "✅ Product uploaded successfully", "product": product.serialize()}), 201

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

# ✅ Create Stripe checkout session for a product
@api.route('/marketplace/checkout', methods=['POST'])
@jwt_required()
def create_checkout():
    data = request.json
    product_id = data.get("product_id")
    product = Product.query.get(product_id)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': product.name},
                'unit_amount': int(product.price * 100),
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url='https://yourdomain.com/success',
        cancel_url='https://yourdomain.com/cancel',
    )

    return jsonify({"checkout_url": session.url}), 200


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

    if not product.is_digital and product.stock <= 0:
        return jsonify({"error": "Out of stock"}), 400

    # ✅ Use your platform-wide split for merch
    amount = product.price
    split = calculate_split(amount, "merch")

    # Simulate payment logic
    payment_successful = True

    if payment_successful:
        # Save the purchase (optional)
        new_purchase = Purchase(
            user_id=user_id,
            product_id=product.id,
            amount=amount,
            purchased_at=datetime.utcnow()
        )
        db.session.add(new_purchase)

        # Optionally: Record split in Revenue table
        revenue = Revenue(
            user_id=product.creator_id,
            revenue_type="merch",
            amount=split["creator_earnings"],
            platform_cut=split["platform_cut"],
            creator_earnings=split["creator_earnings"]
        )
        db.session.add(revenue)

        if not product.is_digital:
            product.stock -= 1

        db.session.commit()

        return jsonify({
            "message": "✅ Purchase successful!",
            "amount": amount,
            "platform_cut": split["platform_cut"],
            "creator_earnings": split["creator_earnings"],
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
    plans = PricingPlan.query.order_by(PricingPlan.price_monthly.asc()).all()
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
    

    # Handle JSON fields (e.g. social_links) passed as strings
    if "social_links" in data:
        try:
            user.social_links = json.loads(data["social_links"])
        except Exception:
            return jsonify({"error": "Invalid social_links JSON"}), 400

    # Handle videos and gallery if present
    if "videos" in data:
        try:
            videos = json.loads(data["videos"])
            if len(videos) > 10:
                return jsonify({"error": "Max 10 videos allowed"}), 400
            user.videos = videos
        except Exception:
            return jsonify({"error": "Invalid videos format"}), 400

    if "gallery" in data:
        try:
            gallery = json.loads(data["gallery"])
            if len(gallery) > 10:
                return jsonify({"error": "Max 10 images allowed"}), 400
            user.gallery = gallery
        except Exception:
            return jsonify({"error": "Invalid gallery format"}), 400

    # 📸 Handle profile picture upload
    if "profile_picture" in request.files:
        pic = request.files["profile_picture"]
        if pic.filename != "":
            filename = secure_filename(pic.filename)
            print(filename)
            pic_path = os.path.dirname(os.path.join("uploads/profile_pics", filename))
            print(pic_path)
            pic.save(pic_path)
            user.profile_picture = pic_path + "/" + filename

    # 🖼️ Handle cover photo upload
    if "cover_photo" in request.files:
        cover = request.files["cover_photo"]
        if cover.filename != "":
            filename = secure_filename(cover.filename)
            cover_path = os.path.join("uploads/cover_photos", filename)
            cover.save(cover_path)
            user.cover_photo = cover_path

    db.session.commit()
    db.session.refresh(user)
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
# @api.route('/podcasts/<int:podcast_id>/episodes', methods=['GET'])
# def get_podcast_episodes(podcast_id):
#     """Fetches all episodes for a given podcast."""
#     episodes = PodcastEpisode.query.filter_by(podcast_id=podcast_id).all()
#     return jsonify([episode.serialize() for episode in episodes]), 200

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
    user_id = get_jwt_identity()

    # Calculate total earnings for the creator
    total_earnings = db.session.query(func.sum(Revenue.amount))\
        .filter(Revenue.user_id == user_id).scalar() or 0

    # Calculate earnings breakdown by revenue type
    breakdown = db.session.query(
        Revenue.revenue_type,
        func.sum(Revenue.amount)
    ).filter(Revenue.user_id == user_id)\
     .group_by(Revenue.revenue_type).all()

    # Structure the breakdown in a dictionary for better readability
    revenue_breakdown = {rtype: float(amount) for rtype, amount in breakdown}

    return jsonify({
        "total_earnings": total_earnings,
        "breakdown": revenue_breakdown
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

@api.route('/music/<int:track_id>/purchase', methods=['POST'])
@jwt_required()
def purchase_music(track_id):
    user_id = get_jwt_identity()
    track = Music.query.get(track_id)

    if not track or not track.is_premium:
        return jsonify({"error": "Track not for sale"}), 400

    amount = track.price or 0.0

    # ✅ Revenue Split
    split = calculate_split(amount, "music")

    # ✅ Log Revenue
    revenue = Revenue(
        user_id=track.user_id,
        revenue_type="music",
        amount=split["creator_earnings"],
        platform_cut=split["platform_cut"],
        creator_earnings=split["creator_earnings"]
    )
    db.session.add(revenue)
    db.session.commit()

    # ⚠️ Replace this with real Stripe checkout flow later
    return jsonify({
        "message": "✅ Music purchased!",
        "platform_cut": split["platform_cut"],
        "creator_earnings": split["creator_earnings"],
        "download_url": track.file_url
    }), 200


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

# ✅ Start Live Stream (with Plan Check + Full Features + WebSocket Notify)
@api.route('/artist/live/start', methods=['POST'])
@jwt_required()
@plan_required("includes_live_events")
def start_live_stream():
    """Starts a live stream, supports VR/ticketing, and notifies WebSocket clients."""
    user_id = get_jwt_identity()
    data = request.get_json()

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
        has_live_chat=data.get("has_live_chat", True),
        created_at=datetime.utcnow()
    )

    db.session.add(new_stream)
    db.session.commit()

    # ✅ Notify Local WebSocket Clients
    socketio.emit("live_stream_update", {"stream_id": new_stream.id, "is_live": True})

    # ✅ Notify External WebSocket Server
    try:
        requests.post("http://localhost:5000/live-status", json={
            "stationId": user_id,
            "isLive": True
        })
    except requests.exceptions.RequestException as e:
        print(f"Error notifying WebSocket server: {e}")

    return jsonify({"message": "📡 Live stream started!", "stream": new_stream.serialize()}), 201



@api.route('/artist/live/end', methods=['POST'])
@jwt_required()
def end_live_stream():
    """Ends the user's current live stream and notifies clients."""
    user_id = get_jwt_identity()

    # Find active stream for user
    live_stream = LiveStudio.query.filter_by(user_id=user_id, is_live=True).first()
    if not live_stream:
        return jsonify({"error": "No active live stream found"}), 404

    # Update stream status
    live_stream.is_live = False
    live_stream.ended_at = datetime.utcnow()
    db.session.commit()

    # Notify WebSocket clients
    socketio.emit("live_stream_update", {
        "stream_id": live_stream.id,
        "is_live": False
    })

    # Notify external status server
    try:
        requests.post("http://localhost:5000/live-status", json={
            "stationId": user_id,
            "isLive": False
        })
    except requests.exceptions.RequestException as e:
        print(f"Error notifying WebSocket server: {e}")

    return jsonify({"message": "📴 Live stream ended."}), 200


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

@api.route('/api/artist/live-streams', methods=['GET'])
@jwt_required()
def get_my_live_streams():
    user_id = get_jwt_identity()
    streams = LiveStudio.query.filter_by(user_id=user_id).all()
    return jsonify([s.serialize() for s in streams]), 200

@api.route('/artist/live/history', methods=['GET'])
@jwt_required()
def get_live_history():
    """Returns a list of all past live streams for the authenticated artist."""
    user_id = get_jwt_identity()

    # Query only streams that have ended
    history = LiveStudio.query.filter_by(user_id=user_id).filter(LiveStudio.is_live == False).order_by(LiveStudio.ended_at.desc()).all()

    return jsonify([stream.serialize() for stream in history]), 200

@api.route('/artist/live-streams', methods=['GET'])
@jwt_required(optional=True)
def get_all_live_streams():
    streams = LiveStudio.query.filter_by(is_live=True).all()
    return jsonify([s.serialize() for s in streams]), 200


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

    # Determine amount
    amount = station.subscription_price or 0.0
    if amount <= 0:
        return jsonify({"error": "Invalid subscription price"}), 400

    # Simulated Stripe/PayPal Payment
    payment_successful = True  # ✅ Replace with real payment processing

    if not payment_successful:
        return jsonify({"error": "Payment failed"}), 402

    # ✅ Add user to allowed list
    station.allowed_users.append(User.query.get(user_id))
    station.followers_count += 1

    # ✅ Calculate revenue split
    split = calculate_split(amount, "subscription")

    # ✅ Record revenue for the station owner
    revenue = Revenue(
        user_id=station.user_id,  # Creator of the station
        revenue_type="subscription",
        amount=split["creator_earnings"],
        platform_cut=split["platform_cut"],
        creator_earnings=split["creator_earnings"]
    )
    db.session.add(revenue)

    db.session.commit()

    return jsonify({
        "message": "✅ Subscription successful!",
        "amount": amount,
        "platform_cut": split["platform_cut"],
        "creator_earnings": split["creator_earnings"]
    }), 200

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

    ticket_price = station.ticket_price or 0.0
    if ticket_price <= 0:
        return jsonify({"error": "Invalid ticket price."}), 400

    # Simulated payment logic
    payment_successful = True  # Replace with Stripe/PayPal later

    if not payment_successful:
        return jsonify({"error": "Payment failed."}), 400

    # ✅ Grant access to user
    station.allowed_users.append(User.query.get(user_id))

    # ✅ Log ticket purchase
    new_ticket = TicketPurchase(user_id=user_id, station_id=station_id, amount_paid=ticket_price)
    db.session.add(new_ticket)

    # ✅ Apply revenue split logic
    split = calculate_split(ticket_price, "event")

    revenue = Revenue(
        user_id=station.user_id,
        revenue_type="event",
        amount=split["creator_earnings"],
        platform_cut=split["platform_cut"],
        creator_earnings=split["creator_earnings"]
    )
    db.session.add(revenue)

    db.session.commit()

    return jsonify({
        "message": "🎫 Ticket purchased successfully!",
        "amount": ticket_price,
        "platform_cut": split["platform_cut"],
        "creator_earnings": split["creator_earnings"]
    }), 200

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
    query = request.args.get('q', '').strip()
    content_type = request.args.get('type', '').lower()  # "podcast" or "radio"
    sort = request.args.get('sort', '').lower()          # "latest", "popular"

    if not query:
        return jsonify({"error": "No search query provided"}), 400

    if content_type == "podcast":
        results = Podcast.query.filter(Podcast.title.ilike(f"%{query}%"))
        
        if sort == "latest":
            results = results.order_by(Podcast.created_at.desc())
        elif sort == "popular":
            results = results.order_by(Podcast.subscriber_count.desc())

        return jsonify({"podcasts": [p.serialize() for p in results.all()]}), 200

    elif content_type == "radio":
        results = RadioStation.query.filter(RadioStation.name.ilike(f"%{query}%"))
        
        if sort == "latest":
            results = results.order_by(RadioStation.created_at.desc())
        elif sort == "popular":
            results = results.order_by(RadioStation.followers_count.desc())

        return jsonify({"radio_stations": [r.serialize() for r in results.all()]}), 200

    return jsonify({"error": "Invalid content type. Use 'podcast' or 'radio'."}), 400


@api.route("/merch/purchase", methods=["POST"])
@jwt_required()
def purchase_merch():
    user_id = get_jwt_identity()
    data = request.get_json()

    product_id = data.get("product_id")
    amount = data.get("amount")

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    # 🧮 Apply revenue split
    split = calculate_split(amount, "merch")
    platform_cut = split["platform_cut"]
    creator_earnings = split["creator_earnings"]

    purchase = Purchase(
        user_id=user_id,
        product_id=product_id,
        amount=amount,
        purchased_at=datetime.utcnow(),
        platform_cut=platform_cut,
        creator_earnings=creator_earnings
    )

    db.session.add(purchase)
    db.session.commit()

    return jsonify({
        "message": "✅ Merch purchase successful",
        "platform_cut": platform_cut,
        "creator_earnings": creator_earnings
    }), 201



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
        return jsonify({"error": "No avatar URL provided"}), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Save avatar_url to the user's profile
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

@api.route("/revenue-analytics", methods=["GET"])
@jwt_required()
def get_revenue_analytics():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Check if the user is an admin
    is_admin = user.role == 'admin'

    # If not admin, filter by creator_id; if admin, no filtering
    filters = (Product.creator_id == user_id,) if not is_admin else ()

    # Calculate total revenue
    total_revenue = db.session.query(func.sum(Product.sales_revenue)).filter(*filters).scalar() or 0

    # Calculate total products sold
    total_products = Product.query.filter(*filters).count()

    # Calculate total orders
    total_orders = db.session.query(Order).filter(*filters).count()

    # Optional: Revenue by month (only available for admin or for the creator's own data)
    revenue_by_month = db.session.query(
        func.date_trunc('month', Order.created_at).label('month'),
        func.sum(Order.amount)
    ).filter(*filters).group_by('month').order_by('month').all()

    # Return the data as a JSON response
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

@api.route('/engagement/<int:content_id>', methods=['GET'])
@jwt_required(optional=True)  # Optional authentication
@cache.cached(timeout=60, query_string=True)  # Cache response for 60s per content_id
def get_full_engagement(content_id):
    try:
        engagement = Engagement.query.filter_by(content_id=content_id).first()
        if not engagement:
            raise NoResultFound(f"No engagement data found for content ID {content_id}")

        # 🔍 Replace these with real queries from your Like, Share, Comment models
        likes = Like.query.filter_by(content_id=content_id).count()
        shares = Share.query.filter_by(content_id=content_id).count()
        comments = Comment.query.filter_by(content_id=content_id).count()

        return jsonify({
            "content_id": engagement.content_id,
            "views": engagement.views,
            "plays": engagement.plays,
            "likes": likes,
            "shares": shares,
            "comments": comments
        }), 200

    except NoResultFound:
        return jsonify({"error": "No engagement data found for this content ID"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    except NoResultFound:
        return jsonify({"error": "No engagement data found for this content ID"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/earnings/<podcast_id>', methods=['GET'])
def get_earnings(podcast_id):
    try:
        earnings_data = get_earnings_data(podcast_id)  # Fetch earnings data from DB
        return jsonify(earnings_data), 200
    except NoResultFound:
        return jsonify({"error": "No earnings data found for this podcast ID"}), 404  # Not found error
    except Exception as e:
        return jsonify({"error": str(e)}), 500  # Internal server error

def get_earnings_data(podcast_id):
    """
    Retrieve earnings data for a specific podcast.
    
    Args:
        podcast_id (int): The ID of the podcast to retrieve earnings for.
    
    Returns:
        dict: A dictionary containing earnings breakdown.
    """
    earnings = Earnings.query.filter_by(podcast_id=podcast_id).first()
    
    if not earnings:
        raise ValueError(f"No earnings data found for podcast ID {podcast_id}")
    
    return {
        "podcast_id": earnings.podcast_id,
        "total_earnings": earnings.total,
        "ad_revenue": earnings.adRevenue,
        "subscription_revenue": earnings.subscriptionRevenue,
        "donation_revenue": earnings.donationRevenue
    }

@api.route('/popularity/<podcast_id>', methods=['GET'])
def get_popularity(podcast_id):
    try:
        popularity_data = get_popularity_data(podcast_id)  # Fetch popularity data from DB
        return jsonify(popularity_data), 200
    except NoResultFound:
        return jsonify({"error": "No popularity data found for this podcast ID"}), 404  # Not found error
    except Exception as e:
        return jsonify({"error": str(e)}), 500  # Internal server error

def get_popularity_data(podcast_id):
    """
    Retrieve popularity data for a specific podcast.
    
    Args:
        podcast_id (int): The ID of the podcast to retrieve popularity data for.
    
    Returns:
        dict: A dictionary containing popularity metrics.
    """
    popularity = Popularity.query.filter_by(podcast_id=podcast_id).first()
    
    if not popularity:
        raise ValueError(f"No popularity data found for podcast ID {podcast_id}")
    
    return {
        "podcast_id": popularity.podcast_id,
        "popularity_score": popularity.popularity_score
    }


# Example Flask routes

# Create Event and Generate Ticket URL

@api.route('/live-events', methods=['POST'])
@jwt_required()
def create_live_event():
    data = request.get_json()
    new_event = LiveEvent(
        artist_id=get_jwt_identity(),  # The current user (artist)
        title=data['title'],
        description=data.get('description'),
        date=data['date'],
        is_vr_enabled=data.get('is_vr_enabled', False),
        ticket_price=data.get('ticket_price'),
        stream_url=data.get('stream_url')
    )
    db.session.add(new_event)
    db.session.commit()

    # Generate a unique URL for the event
    event_url = f"/live-events/{new_event.id}/ticket"
    return jsonify({"event_url": event_url}), 201 

# Invite Friends (Generate Unique Invite Link)
@api.route('/events/invite', methods=['POST'])
@jwt_required()
def send_invite():
    data = request.get_json()
    invite_url = f"/event/{data['event_id']}/join"
    
    # Send invite to friend's email
    send_email(data['email'], "Join My Event", f"Click the link to join the event: {invite_url}")
    
    return jsonify({"message": "Invite sent!"}), 200

# --- Tip Jar ---
@api.route('/api/tips/send', methods=['POST'])
@jwt_required()
def send_tip():
    data = request.get_json()
    sender_id = get_jwt_identity()
    recipient_id = data.get('creator_id')
    amount = data.get('amount')

    if not amount or amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400

    tip = Tip(sender_id=sender_id, recipient_id=recipient_id, amount=amount)
    db.session.add(tip)
    db.session.commit()
    return jsonify({'message': 'Tip sent successfully'}), 200

@api.route('/api/tips/history', methods=['GET'])
@jwt_required()
def tip_history():
    user_id = get_jwt_identity()
    tips = Tip.query.filter_by(sender_id=user_id).all()
    return jsonify([{'id': t.id, 'amount': t.amount, 'to': t.recipient_id} for t in tips])

# --- Ad Revenue ---
@api.route('/api/creator/ad-earnings', methods=['GET'])
@jwt_required()
def ad_earnings():
    user_id = get_jwt_identity()
    earnings = AdRevenue.query.filter_by(creator_id=user_id).all()
    total = sum([e.amount for e in earnings])
    return jsonify({'total_ad_revenue': total})

# --- Creator Analytics ---
@api.route('/api/analytics/creator/<int:creator_id>', methods=['GET'])
def creator_analytics(creator_id):
    total_streams = Stream.query.filter_by(creator_id=creator_id).count()
    total_earnings = sum([p.amount for p in Purchase.query.filter_by(creator_id=creator_id).all()])
    return jsonify({
        'total_streams': total_streams,
        'total_earnings': total_earnings
    })

@api.route('/radio/<int:station_id>/follow', methods=['POST'])
@jwt_required()
def follow_radio_station(station_id):
    user_id = get_jwt_identity()
    existing = RadioFollower.query.filter_by(user_id=user_id, station_id=station_id).first()

    if existing:
        return jsonify({"message": "Already following this station"}), 200

    follow = RadioFollower(user_id=user_id, station_id=station_id)
    db.session.add(follow)

    # Optional: Increment station's follower count
    station = RadioStation.query.get(station_id)
    if station:
        station.followers_count += 1

    db.session.commit()

    socketio.emit(f"station-{station_id}-new-follower", {"stationId": station_id})
    return jsonify({"message": "Now following this station!"}), 200

@api.route('/radio/<int:station_id>/followers', methods=['GET'])
@jwt_required()
def get_station_followers(station_id):
    station = RadioStation.query.get(station_id)
    if not station:
        return jsonify({"error": "Station not found"}), 404

    # Raw SQL join to access timestamp in association table
    results = db.session.execute(
        """
        SELECT u.id, u.username, rf.followed_at
        FROM user u
        JOIN radio_followers rf ON u.id = rf.user_id
        WHERE rf.station_id = :station_id
        ORDER BY rf.followed_at DESC
        """,
        {"station_id": station_id}
    ).fetchall()

    followers = [
        {"user_id": row[0], "username": row[1], "followed_at": row[2].strftime('%Y-%m-%d %H:%M:%S')}
        for row in results
    ]

    return jsonify({"followers": followers, "total": len(followers)}), 200


@api.route('/vr/ticket/purchase', methods=['POST'])
@jwt_required()
def purchase_vr_ticket():
    user_id = get_jwt_identity()
    data = request.json
    event_id = data.get("event_id")

    if not event_id:
        return jsonify({"error": "Event ID is required"}), 400

    # Check event
    event = LiveEvent.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found"}), 404

    # Check for duplicate ticket
    existing = VRAccessTicket.query.filter_by(user_id=user_id, event_id=event_id).first()
    if existing:
        return jsonify({"message": "🎫 Ticket already exists"}), 200

    ticket_price = event.ticket_price or 0.0
    if ticket_price <= 0:
        return jsonify({"error": "This event is free or not properly priced"}), 400

    # Simulated payment (replace with Stripe/PayPal later)
    payment_successful = True
    if not payment_successful:
        return jsonify({"error": "Payment failed"}), 400

    # ✅ Grant access & save ticket
    ticket = VRAccessTicket(user_id=user_id, event_id=event_id, is_verified=True)
    db.session.add(ticket)

    # ✅ Revenue split calculation
    split = calculate_split(ticket_price, "event")
    revenue = Revenue(
        user_id=event.artist_id,
        revenue_type="event",
        amount=split["creator_earnings"],
        platform_cut=split["platform_cut"],
        creator_earnings=split["creator_earnings"]
    )
    db.session.add(revenue)

    db.session.commit()

    return jsonify({
        "message": "🎟️ VR ticket purchased successfully",
        "platform_cut": split["platform_cut"],
        "creator_earnings": split["creator_earnings"]
    }), 200

@api.route('/api/episodes/<int:episode_id>', methods=['GET'])
def get_episode(episode_id):
    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404

    return jsonify(episode.serialize()), 200

@api.route('/api/episodes/<int:episode_id>/access', methods=['GET'])
@jwt_required(optional=True)
def check_episode_access(episode_id):
    episode = PodcastEpisode.query.get(episode_id)
    
    if not episode:
        return jsonify({"error": "Episode not found"}), 404

    # Always grant access if it's not premium
    if not episode.is_premium:
        return jsonify({"access": True}), 200

    # If not logged in, no access to premium content
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"access": False}), 200

    # Check purchase record
    purchase = PodcastPurchase.query.filter_by(user_id=user_id, episode_id=episode_id).first()
    access_granted = purchase is not None

    return jsonify({"access": access_granted}), 200


@api.route('/podcast/<int:podcast_id>/purchase', methods=['POST'])
@jwt_required()
def purchase_episode(podcast_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    episode_id = data.get("episode_id")

    episode = PodcastEpisode.query.get(episode_id)
    if not episode or episode.podcast_id != podcast_id:
        return jsonify({"error": "Episode not found"}), 404

    if not episode.is_premium:
        return jsonify({"error": "This episode is free"}), 400

    # Get podcast for creator ID
    podcast = Podcast.query.get(podcast_id)
    if not podcast:
        return jsonify({"error": "Podcast not found"}), 404

    price = episode.price_per_episode or 0.0

    # ✅ Calculate revenue split
    split = calculate_split(price, "podcast")

    # ✅ Save revenue tracking now (Stripe webhook will confirm actual payment later)
    revenue = Revenue(
        user_id=podcast.host_id,
        revenue_type="podcast",
        amount=split["creator_earnings"],
        platform_cut=split["platform_cut"],
        creator_earnings=split["creator_earnings"]
    )
    db.session.add(revenue)

    # ✅ Optional: Track purchase (can later be validated via webhook)
    purchase = PodcastPurchase(user_id=user_id, episode_id=episode.id)
    db.session.add(purchase)

    db.session.commit()

    # ✅ Stripe Checkout Setup
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"{episode.title} - Podcast Episode"
                    },
                    'unit_amount': int(price * 100),  # Stripe expects cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{os.getenv('FRONTEND_URL')}/podcast/thank-you?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/podcast/cancel",
        )

        return jsonify({
            "checkout_url": checkout_session.url,
            "platform_cut": split["platform_cut"],
            "creator_earnings": split["creator_earnings"]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# ✅ Upload Merch
@api.route('/api/products/upload', methods=['POST'])
@jwt_required()
@plan_required("includes_merch_sales")
def upload_merch():
    user_id = get_jwt_identity()
    data = request.get_json()

    product = Product(
        creator_id=user_id,
        title=data["title"],
        description=data.get("description"),
        image_url=data["image_url"],
        price=float(data["price"]),
        stock=int(data.get("stock", 0)),
        is_digital=False,
        created_at=datetime.utcnow()
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "🛍️ Merch uploaded", "product": product.serialize()}), 201


# ✅ Create Podcast
@api.route('/api/podcasts/create', methods=['POST'])
@jwt_required()
@plan_required("includes_podcasts")
def create_podcast():
    user_id = get_jwt_identity()
    data = request.get_json()

    podcast = Podcast(
        user_id=user_id,
        title=data["title"],
        description=data.get("description"),
        cover_image=data.get("cover_image"),
        created_at=datetime.utcnow()
    )
    db.session.add(podcast)
    db.session.commit()
    return jsonify({"message": "🎙️ Podcast created", "podcast": podcast.serialize()}), 201



# ✅ Enable Ad Revenue
@api.route('/api/ad-revenue/enable', methods=['POST'])
@jwt_required()
@plan_required("includes_ad_revenue")
def enable_ad_revenue():
    user_id = get_jwt_identity()

    ad_rev = AdRevenue.query.filter_by(user_id=user_id).first()
    if ad_rev:
        ad_rev.enabled = True
    else:
        ad_rev = AdRevenue(user_id=user_id, enabled=True, amount=0)

    db.session.add(ad_rev)
    db.session.commit()
    return jsonify({"message": "📺 Ad revenue enabled!"}), 200

from api.reports_utils import generate_monthly_report

@api.route('/generate-report', methods=['GET'])
@jwt_required()
def generate_report():
    report_data = generate_monthly_report()
    return jsonify(report_data), 200

@api.route('/ad-revenue', methods=['POST'])
@jwt_required()
def handle_ad_revenue():
    user_id = get_jwt_identity()  # Get the logged-in user's ID
    data = request.get_json()
    ad_amount = data.get("ad_amount")  # Amount of ad revenue generated

    if not ad_amount:
        return jsonify({"error": "Ad amount is required"}), 400

    # Calculate the ad revenue split and record it in the database
    split = calculate_ad_revenue(ad_amount, user_id)

    return jsonify({
        "message": "Ad revenue processed successfully!",
        "platform_cut": split["platform_cut"],
        "creator_earnings": split["creator_earnings"]
    }), 200

@api.route('/live-ticket/purchase', methods=['POST'])
@jwt_required()
def purchase_live_ticket():
    user_id = get_jwt_identity()
    data = request.get_json()
    ticket_amount = data.get("ticket_amount")

    if not ticket_amount:
        return jsonify({"error": "Ticket amount is required"}), 400

    split = calculate_split(ticket_amount, "live_ticketing")

    # Add logic to store the split in your database or payment processing system
    return jsonify({
        "message": "Ticket purchase successful!",
        "platform_cut": split["platform_cut"],
        "creator_earnings": split["creator_earnings"]
    }), 200

from flask import request
import stripe

# Setup Stripe API
stripe.api_key = 'your_stripe_secret_key'

@api.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    endpoint_secret = 'your_stripe_endpoint_secret'

    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        return 'Signature verification failed', 400

    # Handle the event based on type
    if event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']  # Contains a stripe.Invoice object
        user_id = invoice['customer']  # Assuming 'customer' matches your user ID
        amount_paid = invoice['amount_paid'] / 100  # Convert to dollars

        # Find the user's podcast subscription and update revenue
        subscription = Subscription.query.filter_by(user_id=user_id).first()
        if subscription:
            podcast = Podcast.query.get(subscription.podcast_id)
            podcast.revenue_from_subscriptions += amount_paid  # Update podcast revenue
            podcast.calculate_revenue()  # Recalculate total revenue
            db.session.commit()

    return '', 200


@api.route('/api/radio/genres', methods=['GET'])
def get_radio_genres():
    url = "https://www.radio-browser.info/webservice/json/stations"
    response = requests.get(url)

    if response.status_code == 200:
        stations = response.json()

        # Extract unique genres from the stations list
        genres = set()
        for station in stations:
            if 'genre' in station and station['genre']:
                genre_list = station['genre'].split(',')  # Some genres might be comma-separated
                for genre in genre_list:
                    genres.add(genre.strip())  # Clean and add genre

        return jsonify(list(genres))  # Return unique genres as a list
    else:
        return jsonify({"error": "Failed to fetch data from Radio Browser API"}), 500

if __name__ == "__main__":
    app.run(debug=True)

@api.route('/radio-stations/<genre>', methods=['GET'])
def get_radio_stations_by_genre(genre):
    url = f"https://www.radio-browser.info/webservice/json/stations/bygenre/{genre}"
    response = requests.get(url)

    if response.status_code == 200:
        stations = response.json()
        return jsonify(stations)
    else:
        return jsonify({"error": "Failed to fetch stations for this genre"}), 500

@api.route('/delete_video/<int:video_id>', methods=['DELETE'])
@jwt_required()
def delete_video(video_id):
    user_id = get_jwt_identity()
    video = Video.query.filter_by(id=video_id, user_id=user_id).first()

    if not video:
        return jsonify({"error": "Video not found or not authorized"}), 404

    try:
        # Remove video file from disk
        if os.path.exists(video.file_url):
            os.remove(video.file_url)

        # Delete from database
        db.session.delete(video)
        db.session.commit()
        return jsonify({"message": "Video deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/update_video_title/<int:video_id>', methods=['PUT'])
@jwt_required()
def update_video_title(video_id):
    user_id = get_jwt_identity()
    data = request.get_json()

    video = Video.query.filter_by(id=video_id, user_id=user_id).first()
    if not video:
        return jsonify({"error": "Video not found or not authorized"}), 404

    video.title = data.get('title', video.title)
    db.session.commit()

    return jsonify({"message": "Title updated", "video": video.serialize()}), 200


@api.route('/video/<int:video_id>/comment', methods=['POST'])
@jwt_required()
def comment_video(video_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    comment = Comment(
        user_id=user_id,
        video_id=video_id,
        content_id=video_id,
        content_type="video",
        text=data.get("text")
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify(Video.query.get(video_id).serialize())

@api.route('/video/<int:video_id>/favorite', methods=['POST'])
@jwt_required()
def favorite_video(video_id):
    user_id = get_jwt_identity()
    favorite = Favorite.query.filter_by(user_id=user_id, content_id=video_id, content_type="video").first()
    if favorite:
        db.session.delete(favorite)
        db.session.commit()
        return jsonify({"message": "Removed from favorites"})
    else:
        new_fav = Favorite(user_id=user_id, content_id=video_id, content_type="video")
        db.session.add(new_fav)
        db.session.commit()
        return jsonify({"message": "Added to favorites"})

@api.route('/messages/conversation/<int:recipient_id>', methods=['POST'])
@jwt_required()
def start_or_get_conversation(recipient_id):
    user_id = get_jwt_identity()

    conversation = Conversation.query.filter(
        ((Conversation.user1_id == user_id) & (Conversation.user2_id == recipient_id)) |
        ((Conversation.user1_id == recipient_id) & (Conversation.user2_id == user_id))
    ).first()

    if not conversation:
        conversation = Conversation(user1_id=user_id, user2_id=recipient_id)
        db.session.add(conversation)
        db.session.commit()

    return jsonify({"conversation_id": conversation.id}), 200


@api.route('/messages/send', methods=['POST'])
@jwt_required()
def send_message():
    user_id = get_jwt_identity()
    data = request.get_json()
    conversation_id = data.get("conversation_id")
    content = data.get("content")

    message = Message(
        conversation_id=conversation_id,
        sender_id=user_id,
        content=content
    )
    db.session.add(message)
    db.session.commit()

    # 🔄 Optional: emit WebSocket update here

    return jsonify({"message": "Message sent"}), 201


@api.route('/messages/<int:conversation_id>', methods=['GET'])
@jwt_required()
def get_messages(conversation_id):
    messages = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.timestamp.asc()).all()
    return jsonify([{
        "id": m.id,
        "sender_id": m.sender_id,
        "content": m.content,
        "timestamp": m.timestamp.isoformat(),
        "is_read": m.is_read
    } for m in messages]), 200


@api.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = get_jwt_identity()

    conversations = Conversation.query.filter(
        (Conversation.user1_id == user_id) | (Conversation.user2_id == user_id)
    ).order_by(Conversation.created_at.desc()).all()

    result = []
    for convo in conversations:
        partner_id = convo.user2_id if convo.user1_id == user_id else convo.user1_id
        partner = User.query.get(partner_id)
        result.append({
            "conversation_id": convo.id,
            "with_user_id": partner.id,
            "with_username": partner.username,
            "created_at": convo.created_at.isoformat()
        })

    return jsonify(result), 200


@api.route('/chat/send', methods=['POST'])
@jwt_required()
def send_chat_message():
    data = request.get_json()
    user_id = get_jwt_identity()

    new_message = ChatMessage(
        room=data['room'],
        sender_id=user_id,
        recipient_id=data['to'],
        text=data['text'],
        timestamp=datetime.utcnow(),
        media_url=data.get('mediaUrl')
    )
    db.session.add(new_message)
    db.session.commit()

    return jsonify({"message": "Message saved successfully."}), 201


@api.route('/chat/history', methods=['GET'])
@jwt_required()
def get_chat_history():
    room = request.args.get('room')
    messages = ChatMessage.query.filter_by(room=room).order_by(ChatMessage.timestamp.asc()).all()

    return jsonify([{
        'from': m.sender_id,
        'to': m.recipient_id,
        'text': m.text,
        'timestamp': m.timestamp.isoformat(),
        'mediaUrl': m.media_url
    } for m in messages])

@api.route('/user/settings', methods=['GET', 'PUT'])
@jwt_required()
def user_settings():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if request.method == 'GET':
        return jsonify({
            "enableChat": user.enable_chat,
            "useAvatar": user.use_avatar,
            "enableNotifications": user.enable_notifications,
            "emailNotifications": user.email_notifications,
            "darkMode": user.dark_mode,
            "profileVisibility": user.profile_visibility
        })

    data = request.get_json()
    user.enable_chat = data.get("enableChat", user.enable_chat)
    user.use_avatar = data.get("useAvatar", user.use_avatar)
    user.enable_notifications = data.get("enableNotifications", user.enable_notifications)
    user.email_notifications = data.get("emailNotifications", user.email_notifications)
    user.dark_mode = data.get("darkMode", user.dark_mode)
    user.profile_visibility = data.get("profileVisibility", user.profile_visibility)

    db.session.commit()
    return jsonify({"msg": "Settings updated"}), 200

@api.route("/user/stream-key", methods=["GET"])
@jwt_required()
def get_stream_key():
    user = User.query.get(get_jwt_identity())
    return jsonify({ "stream_key": user.stream_key or generate_stream_key() })

@api.route('/create-avatar', methods=['POST'])
@jwt_required()
def create_avatar():
    # Check if an image was uploaded
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file = request.files['image']
    file_path = os.path.join('uploads', file.filename)

    # Save the uploaded image
    file.save(file_path)

    # Call the avatar generation function to process the image and create the avatar
    avatar_url = process_image_and_create_avatar(file_path)

    # Check if avatar URL was generated
    if avatar_url:
        # Get the current user
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if user:
            # Save the avatar URL to the user profile in the database
            user.avatar_url = avatar_url
            db.session.commit()

        return jsonify({"avatar_url": avatar_url}), 201  # Successfully created the avatar
    else:
        return jsonify({"error": "Failed to create avatar"}), 500  # Error in avatar creation

def process_image_and_create_avatar(image_path):
    """
    This function processes the image, potentially calling an avatar generation service
    like Deep3D, and returns the avatar URL.
    You need to replace this with your actual avatar generation logic.

    Args:
        image_path (str): The file path to the uploaded image.

    Returns:
        str: The URL of the created avatar.
    """
    # For example, here you would integrate Deep3D or other avatar generation services.
    try:
        # Example: Call Deep3D API (or other services) to process the image
        # For now, let's assume the avatar creation returns a URL
        avatar_url = "https://example.com/avatars/generated_avatar.png"  # Replace with real avatar URL from the service

        return avatar_url
    except Exception as e:
        print(f"Error creating avatar: {str(e)}")
        return None





@api.route('/delete-avatar', methods=['DELETE'])
def delete_avatar():
    user_id = get_jwt_identity()  # Assuming the user is authenticated via JWT

    # Retrieve the user's avatar URL or file path from the database
    avatar_url = get_user_avatar(user_id)

    if not avatar_url:
        return jsonify({"error": "Avatar not found"}), 404

    # Remove the avatar from the database
    delete_avatar_from_user_profile(user_id)

    # Optionally delete the avatar file if it's stored locally
    avatar_filename = os.path.basename(avatar_url)
    avatar_file_path = os.path.join('uploads', avatar_filename)

    if os.path.exists(avatar_file_path):
        os.remove(avatar_file_path)

    return jsonify({"message": "Avatar deleted successfully"}), 200

def get_user_avatar(user_id):
    # Retrieve the avatar URL from the database based on user_id
    # Example return value: '/uploads/avatars/user_avatar.png'
    pass

def delete_avatar_from_user_profile(user_id):
    # Remove the avatar reference from the user's profile in the database
    pass

if __name__ == '__main__':
    app.run(debug=True)



@api.route('/upload-avatar', methods=['POST'])
def upload_avatar():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = request.files['image']
    if image.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(image.filename)
    file_path = os.path.join('uploads', filename)
    image.save(file_path)

    # Call the process_image_and_create_avatar function to generate the avatar
    avatar_url = process_image_and_create_avatar(file_path)

    return jsonify({"avatar_url": avatar_url}), 201


@api.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    user.display_name = data.get("display_name", user.display_name)
    user.business_name = data.get("business_name", user.business_name)
    user.bio = data.get("bio", user.bio)
    user.social_links = data.get("social_links", user.social_links)
    user.radio_station = data.get("radio_station", user.radio_station)
    user.podcast = data.get("podcast", user.podcast)
    user.videos = data.get("videos", user.videos)
    user.profile_picture = data.get("profile_picture", user.profile_picture)
    user.cover_photo = data.get("cover_photo", user.cover_photo)

    db.session.commit()

    return jsonify({"message": "Profile updated successfully", "user": user.serialize()}), 200

# GET SETTINGS
@api.route('/api/user/settings', methods=['GET'])
@jwt_required()
def get_settings():
    user_id = get_jwt_identity()
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)
        db.session.commit()
    return jsonify(settings.to_dict())

# UPDATE SETTINGS
@api.route('/api/user/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    user_id = get_jwt_identity()
    data = request.json
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)

    for key, value in data.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
    db.session.commit()
    return jsonify(settings.to_dict())

@api.route("/api/messages/send", methods=["POST"])
@jwt_required()
def send_dm():
    data = request.json
    sender_id = get_jwt_identity()
    recipient_id = data.get("recipient_id")
    text = data.get("text")
    
    # Generate deterministic room name
    room = f"user_{min(sender_id, recipient_id)}_{max(sender_id, recipient_id)}"

    message = Message(
        room=room,
        sender_id=sender_id,
        recipient_id=recipient_id,
        text=text
    )
    db.session.add(message)
    db.session.commit()

    return jsonify({"message": "Message sent", "id": message.id}), 200

@api.route("/api/messages/<int:recipient_id>", methods=["GET"])
@jwt_required()
def get_dm(recipient_id):
    current_user = get_jwt_identity()
    room = f"user_{min(current_user, recipient_id)}_{max(current_user, recipient_id)}"

    messages = Message.query.filter_by(room=room).order_by(Message.created_at.asc()).all()
    return jsonify([
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "recipient_id": m.recipient_id,
            "text": m.text,
            "created_at": m.created_at.isoformat(),
            "is_read": m.is_read
        }
        for m in messages
    ])

@api.route('/user/earnings', methods=['GET'])
@jwt_required()
def get_user_earnings():
    user_id = get_jwt_identity()

    # Sum up all earnings
    total_earned = db.session.query(func.sum(Revenue.amount))\
        .filter(Revenue.user_id == user_id).scalar() or 0

    # Sum up all paid out
    total_paid_out = db.session.query(func.sum(Payout.amount))\
        .filter(Payout.user_id == user_id).scalar() or 0

    # Group breakdown (optional)
    breakdown = db.session.query(
        Revenue.revenue_type,
        func.sum(Revenue.amount)
    ).filter(Revenue.user_id == user_id)\
     .group_by(Revenue.revenue_type).all()

    revenue_breakdown = {rtype: float(amount) for rtype, amount in breakdown}

    return jsonify({
        "total_earned": total_earned,
        "total_paid_out": total_paid_out,
        "available_balance": total_earned - total_paid_out,
        "breakdown": revenue_breakdown
    }), 200


@api.route('/api/send-payment', methods=['POST'])
@jwt_required()
def send_payment():
    sender_id = get_jwt_identity()
    data = request.get_json()

    amount = float(data.get("amount"))
    method = data.get("method")
    recipient_id = data.get("recipient_id")
    recipient_email = data.get("recipient_email")

    # Resolve recipient by ID or email
    recipient = None
    if recipient_id:
        recipient = db.session.get(User, int(recipient_id))
    elif recipient_email:
        recipient = User.query.filter_by(email=recipient_email).first()

    if not recipient:
        return jsonify({"error": "Recipient not found"}), 404

    # Save or trigger payment
    new_payment = Payment(sender_id=sender_id, recipient_id=recipient.id, amount=amount)
    db.session.add(new_payment)
    db.session.commit()

    return jsonify({"message": f"✅ Sent ${amount} to {recipient.username or recipient.email}!"}), 200

@api.route('/api/submit-track', methods=['POST'])
def submit_track():
    try:
        title = request.form.get('title')
        artist_name = request.form.get('artistName')
        genre = request.form.get('genre')
        release_date = request.form.get('releaseDate')
        is_explicit = request.form.get('isExplicit') == 'true'
        terms_agreed = request.form.get('termsAgreed') == 'true'

        if not terms_agreed:
            return jsonify({"error": "You must agree to terms of distribution."}), 400

        audio_file = request.files['audioFile']
        cover_art = request.files['coverArt']

        audio_filename = secure_filename(audio_file.filename)
        cover_filename = secure_filename(cover_art.filename)

        audio_path = os.path.join(UPLOAD_FOLDER, audio_filename)
        cover_path = os.path.join(UPLOAD_FOLDER, cover_filename)

        audio_file.save(audio_path)
        cover_art.save(cover_path)

        new_release = TrackRelease(
            user_id=1,  # TODO: Replace with dynamic user from auth
            title=title,
            genre=genre,
            release_date=datetime.strptime(release_date, '%Y-%m-%d') if release_date else None,
            cover_url=cover_path,
            audio_url=audio_path,
            is_explicit=is_explicit,
            status='pending'
        )

        db.session.add(new_release)
        db.session.commit()

        # Optional: Send to Revelator API here
        # response = submit_release_to_revelator(new_release)

        return jsonify({"message": "Track submitted", "track_id": new_release.id}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/api/my-releases', methods=['GET'])
@jwt_required()
def get_my_releases():
    try:
        user_id = get_jwt_identity()
        releases = TrackRelease.query.filter_by(user_id=user_id).all()

        return jsonify([r.serialize() for r in releases]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/api/track/<int:track_id>', methods=['GET'])
@jwt_required()
def get_track_details(track_id):
    try:
        track = TrackRelease.query.get(track_id)
        if not track:
            return jsonify({"error": "Track not found"}), 404

        return jsonify(track.serialize()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500 
    
@api.route('/api/tracks/user', methods=['GET'])
@jwt_required()
def get_user_tracks():
    try:
        user_id = get_jwt_identity()
        tracks = TrackRelease.query.filter_by(user_id=user_id).order_by(TrackRelease.created_at.desc()).all()

        return jsonify([track.serialize() for track in tracks]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@api.route('/api/admin/tracks', methods=['GET'])
@jwt_required()
def get_all_tracks_admin():
    user_id = get_jwt_identity()
    admin_user = User.query.get(user_id)

    if not admin_user or admin_user.role != 'admin':
        return jsonify({"error": "Admin access required"}), 403

    search = request.args.get('search', '').strip().lower()
    status = request.args.get('status')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    query = TrackRelease.query

    if search:
        query = query.filter(TrackRelease.title.ilike(f"%{search}%"))

    if status:
        query = query.filter_by(status=status)

    paginated = query.order_by(TrackRelease.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)

    results = []
    for track in paginated.items:
        artist = User.query.get(track.user_id)
        track_data = track.serialize()
        track_data['artist_name'] = artist.username if artist else "Unknown"
        results.append(track_data)

    return jsonify({
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
        "tracks": results
    }), 200

@api.route('/api/create-release', methods=['POST'])
@jwt_required()
def create_release():
    import uuid  # ✅ Make sure this is at the top of your file if not already

    user_id = get_jwt_identity()
    title = request.form.get('title')
    genre = request.form.get('genre')
    release_date = request.form.get('release_date')
    explicit = request.form.get('explicit') == 'true'
    track_id = request.form.get('track_id')
    cover_art = request.files.get('cover_art')

    # ✅ Validate required fields
    if not all([title, genre, release_date, track_id, cover_art]):
        return jsonify({"error": "All fields are required."}), 400

    # ✅ Track ownership check
    track = Track.query.get(track_id)
    if not track or track.user_id != user_id:
        return jsonify({"error": "Invalid or unauthorized track ID."}), 403

    # ✅ Validate file extension
    ext = os.path.splitext(cover_art.filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png']:
        return jsonify({"error": "Cover art must be .jpg, .jpeg, or .png"}), 400

    # ✅ Save cover art with unique name
    unique_name = f"{uuid.uuid4().hex}_{secure_filename(cover_art.filename)}"
    cover_path = os.path.join("static/uploads/covers", unique_name)
    os.makedirs(os.path.dirname(cover_path), exist_ok=True)
    cover_art.save(cover_path)
    cover_url = f"/{cover_path}"

    # ✅ Save release to DB
    new_release = Release(
        user_id=user_id,
        title=title,
        genre=genre,
        release_date=release_date,
        explicit=explicit,
        cover_art_url=cover_url,
        track_id=track_id
    )
    db.session.add(new_release)
    db.session.commit()

    # ✅ Prepare payload for Revelator
    payload = {
        "title": title,
        "genre": genre,
        "release_date": release_date,
        "explicit": explicit,
        "audio_url": track.file_url,
        "cover_url": cover_url,
        "track_id": track_id,
        "artist_name": track.artist_name or "Unknown Artist"
    }

    # ✅ Queue Revelator submission task
    try:
        q = Queue(connection=Redis())
        q.enqueue(send_release_to_revelator, new_release.id, json.loads(json.dumps(payload, default=str)))
    except Exception as e:
        return jsonify({"error": f"Release saved but failed to queue submission: {str(e)}"}), 500

    return jsonify({"message": "✅ Release saved and submission enqueued!"}), 201

@api.route('/api/upload-lyrics', methods=['POST'])
@jwt_required()
def upload_lyrics():
    user_id = get_jwt_identity()
    data = request.get_json()
    track_id = data.get("track_id")
    lyrics = data.get("lyrics")

    if not all([track_id, lyrics]):
        return jsonify({"error": "Missing track ID or lyrics"}), 400

    track = Track.query.get(track_id)
    if not track or track.user_id != user_id:
        return jsonify({"error": "Unauthorized or invalid track"}), 403

    track.lyrics = lyrics
    db.session.commit()
    return jsonify({"message": "Lyrics saved"}), 200
# ✅ In routes.py
@api.route('/api/create-album', methods=['POST'])
@jwt_required()
def create_album():
    user_id = get_jwt_identity()
    title = request.form.get('title')
    genre = request.form.get('genre')
    release_date = request.form.get('release_date')
    cover_art = request.files.get('cover_art')

    # Validate required fields
    if not all([title, genre, release_date, cover_art]):
        return jsonify({"error": "All fields are required"}), 400

    # Validate cover image file extension
    ext = os.path.splitext(cover_art.filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png']:
        return jsonify({"error": "Cover art must be .jpg, .jpeg, or .png"}), 400

    # Save cover image
    unique_name = f"{uuid.uuid4().hex}_{secure_filename(cover_art.filename)}"
    cover_path = os.path.join("static/uploads/album_covers", unique_name)
    os.makedirs(os.path.dirname(cover_path), exist_ok=True)
    cover_art.save(cover_path)
    cover_url = f"/{cover_path}"

    # Create album record
    album = Album(
        user_id=user_id,
        title=title,
        genre=genre,
        release_date=datetime.strptime(release_date, "%Y-%m-%d"),
        cover_art_url=cover_url
    )
    db.session.add(album)
    db.session.commit()

    return jsonify({"message": "✅ Album created", "album_id": album.id}), 201

    # ✅ Save cover art with unique name
    from uuid import uuid4
    filename = f"{uuid4().hex}_{secure_filename(cover_art.filename)}"
    cover_path = os.path.join("static/uploads/album_covers", filename)
    os.makedirs(os.path.dirname(cover_path), exist_ok=True)
    cover_art.save(cover_path)
    cover_url = f"/{cover_path}"

    # ✅ Save album
    album = Album(
        user_id=user_id,
        title=title,
        genre=genre,
        release_date=release_date,
        cover_art_url=cover_url
    )
    db.session.add(album)
    db.session.commit()

    return jsonify({"message": "✅ Album created!", "album_id": album.id}), 201

    # handle metadata, save cover, associate user

@api.route('/api/album/<int:album_id>/add-track', methods=['POST'])
@jwt_required()
def add_track_to_album(album_id):
    """Add a track to an album"""
    user_id = get_jwt_identity()
    data = request.get_json()
    track_id = data.get("track_id")

    if not track_id:
        return jsonify({"error": "Track ID is required"}), 400

    # Validate album ownership
    album = Album.query.get(album_id)
    if not album or album.user_id != user_id:
        return jsonify({"error": "Album not found or unauthorized"}), 403

    # Validate track ownership
    track = Track.query.get(track_id)
    if not track or track.user_id != user_id:
        return jsonify({"error": "Track not found or unauthorized"}), 403

    # Check if track is already in an album
    if track.album_id and track.album_id != album_id:
        return jsonify({"error": "Track is already in another album"}), 409

    # Add track to album
    track.album_id = album_id
    db.session.commit()

    return jsonify({"message": "✅ Track added to album"}), 200


@api.route('/api/album/<int:album_id>/remove-track', methods=['POST'])
@jwt_required()
def remove_track_from_album(album_id):
    """Remove a track from an album"""
    user_id = get_jwt_identity()
    data = request.get_json()
    track_id = data.get("track_id")

    if not track_id:
        return jsonify({"error": "Track ID is required"}), 400

    # Validate album ownership
    album = Album.query.get(album_id)
    if not album or album.user_id != user_id:
        return jsonify({"error": "Album not found or unauthorized"}), 403

    # Validate track ownership and that it's in this album
    track = Track.query.get(track_id)
    if not track or track.user_id != user_id:
        return jsonify({"error": "Track not found or unauthorized"}), 403
    
    if track.album_id != album_id:
        return jsonify({"error": "Track is not in this album"}), 400

    # Remove track from album
    track.album_id = None
    db.session.commit()

    return jsonify({"message": "Track removed from album"}), 200


@api.route('/api/album/<int:album_id>', methods=['GET'])
@jwt_required()
def get_album_detail(album_id):
    """Get album details with all tracks"""
    user_id = get_jwt_identity()
    album = Album.query.get(album_id)

    if not album or album.user_id != user_id:
        return jsonify({"error": "Album not found or unauthorized"}), 403

    tracks = Track.query.filter_by(album_id=album_id).order_by(Track.created_at).all()

    return jsonify({
        "album": album.serialize(),
        "tracks": [t.serialize() for t in tracks]
    }), 200


@api.route('/api/my-albums', methods=['GET'])
@jwt_required()
def get_my_albums():
    """Get all albums for the current user"""
    user_id = get_jwt_identity()
    albums = Album.query.filter_by(user_id=user_id).order_by(Album.created_at.desc()).all()
    return jsonify([a.serialize() for a in albums]), 200


@api.route('/api/track/<int:track_id>/edit', methods=['PUT'])
@jwt_required()
def edit_track(track_id):
    """Edit track details (title, genre, description, etc.)"""
    user_id = get_jwt_identity()
    data = request.get_json()

    track = Track.query.get(track_id)
    if not track or track.user_id != user_id:
        return jsonify({"error": "Track not found or unauthorized"}), 403

    # Update only if new values are provided
    if "title" in data:
        if not data["title"]:
            return jsonify({"error": "Title cannot be empty"}), 400
        track.title = data["title"]

    if "genre" in data:
        track.genre = data["genre"]

    if "description" in data:
        track.description = data["description"]

    if "is_explicit" in data:
        track.is_explicit = data["is_explicit"]

    db.session.commit()

    return jsonify({
        "message": "✅ Track updated successfully",
        "track": track.serialize()
    }), 200



@api.route('/api/tracks/unassigned', methods=['GET'])
@jwt_required()
def get_unassigned_tracks():
    """Get all tracks that are not assigned to any album"""
    user_id = get_jwt_identity()
    tracks = Track.query.filter_by(user_id=user_id, album_id=None).order_by(Track.created_at.desc()).all()
    return jsonify([t.serialize() for t in tracks]), 200


@api.route('/api/user/top-track', methods=['GET'])
@jwt_required()
def get_top_track():
    user_id = get_jwt_identity()
    top_track = Track.query.filter_by(user_id=user_id).order_by(Track.play_count.desc()).first()

    if not top_track:
        return jsonify({"message": "No tracks found"}), 404

    return jsonify({
        "id": top_track.id,
        "title": top_track.title,
        "play_count": top_track.play_count,
        "file_url": top_track.file_url
    }), 200

@api.route('/api/user/earnings-history', methods=['GET'])
@jwt_required()
def get_earnings_history():
    user_id = get_jwt_identity()

    # Sample: daily earnings for last 30 days
    results = db.session.execute("""
        SELECT DATE(created_at) AS day, SUM(amount) as total
        FROM earnings
        WHERE user_id = :user_id
        GROUP BY day
        ORDER BY day DESC
        LIMIT 30
    """, {"user_id": user_id})

    earnings = [{"day": str(row.day), "total": float(row.total)} for row in results]
    return jsonify({"earnings": earnings})

@api.route("/home-feed", methods=["GET"])
@jwt_required()
def home_feed():
    user_id = get_jwt_identity()

    # Get followed user IDs
    followed_ids = db.session.query(Follow.followed_id).filter_by(follower_id=user_id).subquery()

    # Optionally include the user's own posts
    all_ids = db.session.query(User.id).filter(
        (User.id == user_id) | (User.id.in_(followed_ids))
    ).subquery()

    # Fetch posts from followed users (and yourself), newest first
    posts = (
        Post.query.filter(Post.author_id.in_(all_ids))
        .order_by(Post.created_at.desc())
        .limit(50)
        .all()
    )

    return jsonify([post.serialize() for post in posts]), 200

@api.route("/label-dashboard", methods=["GET"])
@jwt_required()
def label_dashboard():
    user_id = get_jwt_identity()

    # Verify the user is a label
    label_user = User.query.get(user_id)
    if not label_user or label_user.role != "Label":
        return jsonify({"error": "Not authorized as a label."}), 403

    # Get the Label account
    label = Label.query.filter_by(owner_id=user_id).first()
    if not label:
        return jsonify({"error": "Label not found."}), 404

    # Get associated artists
    artists = User.query.filter_by(label_id=label.id).all()

    return jsonify({
        "label": {
            "id": label.id,
            "name": label.name,
        },
        "artists": [
            {
                "id": artist.id,
                "username": artist.username,
                "display_name": artist.display_name,
                "bio": artist.bio,
                "profile_picture": artist.profile_picture,
            } for artist in artists
        ]
    })

@api.route("/add-artist", methods=["POST"])
@jwt_required()
def add_artist():
    user_id = get_jwt_identity()
    label = Label.query.filter_by(owner_id=user_id).first()
    if not label:
        return jsonify({"error": "Label account not found"}), 404

    data = request.get_json()
    artist_username = data.get("username")

    artist = User.query.filter_by(username=artist_username).first()
    if not artist:
        return jsonify({"error": "Artist not found"}), 404

    if artist.label_id == label.id:
        return jsonify({"error": "Artist already added to label"}), 400

    artist.label_id = label.id
    db.session.commit()

    return jsonify({"message": "Artist added successfully"})



@api.route("/api/podcast/<int:podcast_id>", methods=["GET"])
def get_podcast_detail(podcast_id):
    try:
        podcast = Podcast.query.get(podcast_id)
        if not podcast:
            return jsonify({"error": "Podcast not found"}), 404
        return jsonify(podcast.serialize()), 200
    except Exception as e:
        print(f"[ERROR] Failed to load podcast {podcast_id}: {str(e)}")
        return jsonify({"error": "Failed to load podcast details."}), 500


@api.route("/api/podcast/<int:podcast_id>/episodes", methods=["GET"])
def get_podcast_episodes(podcast_id):
    try:
        episodes = PodcastEpisode.query.filter_by(podcast_id=podcast_id).all()
        return jsonify([ep.serialize() for ep in episodes]), 200
    except Exception as e:
        print(f"[ERROR] Failed to fetch episodes for podcast {podcast_id}: {str(e)}")
        return jsonify({"error": "Failed to load episodes."}), 500



def seed_sample_podcasts():
    sample_podcasts = [
        {
            "id": 101,
            "title": "Cold Cases Uncovered",
            "description": "Exploring the dark corners of justice.",
            "category": "True Crime & Investigative Journalism",
            "cover_image_url": "https://via.placeholder.com/300x300?text=Cold+Cases",
        },
        {
            "id": 102,
            "title": "Celebrity Circuit",
            "description": "Daily pop culture recaps & drama.",
            "category": "Celebrity Gossip & Reality TV",
            "cover_image_url": "https://via.placeholder.com/300x300?text=Celebrity+Circuit",
        },
        {
            "id": 103,
            "title": "Brush & Beyond",
            "description": "Unlock your artistic side.",
            "category": "Education & Learning",
            "cover_image_url": "https://via.placeholder.com/300x300?text=Brush+Beyond",
        }
    ]

    for pod in sample_podcasts:
        existing = Podcast.query.get(pod["id"])
        if not existing:
            new_podcast = Podcast(
                id=pod["id"],
                title=pod["title"],
                description=pod["description"],
                category=pod["category"],
                cover_image_url=pod["cover_image_url"],
                created_at=datetime.utcnow()
            )
            db.session.add(new_podcast)

            # Add a test episode
            episode = PodcastEpisode(
                podcast_id=pod["id"],
                title=f"{pod['title']} – Pilot Episode",
                description="A sneak peek into the first episode.",
                file_url="https://example.com/audio/sample.mp3",
                is_published=True,
                created_at=datetime.utcnow()
            )
            db.session.add(episode)

    db.session.commit()@app.route('/seed/sample_podcasts')
def seed_sample_podcasts_route():
    seed_sample_podcasts()
    return "Sample podcasts seeded"

    print("✅ Sample podcasts seeded successfully.")  

@api.route('/seed/sample_podcasts')
def seed_sample_podcasts_route():
    seed_sample_podcasts()
    return "Sample podcasts seeded"

@api.route('/seed/sample_podcasts', methods=['GET'])
def trigger_sample_seed():
    seed_sample_podcasts()
    return jsonify({"message": "Sample podcasts seeded"}), 200



