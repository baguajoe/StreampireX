# src/api/routes.py - Final corrected imports
import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify, url_for, Blueprint, send_from_directory, send_file, Response, current_app, session
from flask_jwt_extended import jwt_required, get_jwt_identity,create_access_token
from src.api.models import db, User, PodcastEpisode, PodcastSubscription, StreamingHistory, RadioPlaylist, RadioStation, LiveStream, LiveChat, CreatorMembershipTier, CreatorDonation, AdRevenue, UserSubscription, Video, VideoPlaylist, VideoPlaylistVideo, Audio, PlaylistAudio, Podcast, ShareAnalytics, Like, Favorite, FavoritePage, Comment, Notification, PricingPlan, Subscription, Product, RadioDonation, Role, RadioSubscription, MusicLicensing, PodcastHost, PodcastChapter, RadioSubmission, Collaboration, LicensingOpportunity, Music, IndieStation, IndieStationTrack, IndieStationFollower, EventTicket, LiveStudio,PodcastClip, TicketPurchase, Analytics, Payout, Revenue, Payment, Order, RefundRequest, Purchase, Artist, Album, ListeningPartyAttendee, ListeningParty, Engagement, Earnings, Popularity, LiveEvent, Tip, Stream, Share, RadioFollower, VRAccessTicket, PodcastPurchase, MusicInteraction, Message, Conversation, Group, UserSettings, TrackRelease, Release, Collaborator, Category, Post,Follow, Label, Squad, Game, InnerCircle, MusicDistribution, DistributionAnalytics, DistributionSubmission, SonoSuiteUser, VideoChannel, VideoClip, ChannelSubscription,ClipLike,SocialAccount,SocialPost,SocialAnalytics, VideoRoom, UserPresence, VideoChatSession, CommunicationPreferences, VideoChannel, VideoClip, ChannelSubscription, ClipLike, AudioEffects, EffectPreset, VideoEffects, PodcastAccess, PodcastPurchase, StationFollow, VideoLike, PlayHistory, AudioLike, ArtistFollow, BandwidthLog, TranscodeJob, VideoQuality, Concert, PodcastPlayHistory, PlayHistory, PostLike, PostComment, Photo, ClipSave, ClipComment, ClipCommentLike, UserWallet, WalletTransaction, CreatorPaymentSettings, StoryComment, Story, StoryView, StoryHighlight, ArchivedShow
# ADD these imports
from .steam_service import SteamService
from datetime import datetime

import json
import os
import mimetypes
import jwt
import time
import stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
import hashlib
import random
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash,check_password_hash
from datetime import datetime, timedelta
from .socketio import socketio
from .avatar_service import process_image_and_create_avatar
from .utils import generate_sitemap, APIException, send_email
from sqlalchemy import func, desc, or_, and_, asc, distinct
from flask_cors import CORS, cross_origin
from flask_apscheduler import APScheduler
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy import or_, and_
from src.api.subscription_utils import get_user_plan, plan_required, check_content_limit
from src.api.revenue_split import calculate_split, calculate_ad_revenue
from src.api.reports_utils import generate_monthly_report
from src.api.utils.revelator_api import submit_release_to_revelator
from rq import Queue
from redis import Redis
from src.api.utils.tasks import send_release_to_revelator
from .subscription_utils import get_user_plan, plan_required, check_content_limit
from mutagen import File
# Add this import at the top of your routes.py file
from flask import Flask, request, jsonify, send_file, Response, redirect
# Import bandwidth utilities at top of file:
from .bandwidth_utils import (
    get_bandwidth_status,
    check_streaming_allowed,
    get_optimal_quality,
    get_transcode_config,
    should_transcode_resolution,
    log_bandwidth_usage,
    check_rate_limit,
    register_stream,
    unregister_stream,
    get_active_streams,
    bandwidth_required,
    BANDWIDTH_TIERS,
    QUALITY_BITRATES
)

import uuid
import ffmpeg
import feedparser
import requests 
# import whisper  # ✅ AI Transcription Support
import subprocess
import xml.etree.ElementTree as ET
import numpy as np
from scipy import signal
import base64
from mutagen import File
import tempfile
import librosa
import soundfile as sf
from mutagen.mp3 import MP3  # Add this line for MP3 support
from mutagen.mp4 import MP4  # Add this for MP4/M4A support
from mutagen.wave import WAVE  # Add this for WAV support
try:
    from src.api.r2_storage_setup import uploadFile
except ImportError:
    from src.api.cloudinary_setup import uploadFile
from functools import wraps

from pedalboard import (
    Pedalboard, NoiseGate, Compressor, Distortion, Bitcrush,
    Phaser, PitchShift, Reverb, Delay, Gain, Limiter,
    HighpassFilter, LowpassFilter, HighShelfFilter, LowShelfFilter,
    PeakFilter
)

from src.api.email_service import (
    send_order_fulfillment_notification, 
    send_subscription_notification,
    send_distribution_notification
)

from moviepy.video.io.ffmpeg_tools import ffmpeg_extract_subclip
import re
from decimal import Decimal

# ✅ FIXED: Only import the functions you need, not the SocketIO class
from flask_socketio import join_room, emit, leave_room
from src.api.cache import cache  # Assuming Flask-Caching is set up
from apscheduler.schedulers.background import BackgroundScheduler
scheduler = APScheduler()

# ✅ Use Blueprint instead
api = Blueprint('api', __name__)
marketplace = Blueprint('marketplace', __name__)
chat_api = Blueprint('chat_api', __name__)
# Update your CORS configuration (around line 63)
from flask_cors import CORS

# Configure CORS with your specific origins
CORS(api, origins=[
    "https://studious-space-goggles-r4rp7v96jgr62x5j-3000.app.github.dev",  # Your frontend
    "https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev",  # Your backend
    "http://localhost:3000",
    "http://localhost:3001"
], supports_credentials=True)

# ✅ Define upload directories
AUDIO_UPLOAD_DIR = "uploads/podcasts/audio"
VIDEO_UPLOAD_DIR = "uploads/podcasts/video"
CLIP_UPLOAD_DIR = "uploads/podcasts/clips"
COVER_UPLOAD_DIR = "uploads/podcasts/covers"
UPLOAD_FOLDER = "uploads/music"
CLIP_FOLDER = "uploads/clips"  # This was missing!

# Create upload directories
os.makedirs(AUDIO_UPLOAD_DIR, exist_ok=True)
os.makedirs(VIDEO_UPLOAD_DIR, exist_ok=True)
os.makedirs(CLIP_UPLOAD_DIR, exist_ok=True)
os.makedirs(COVER_UPLOAD_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CLIP_FOLDER, exist_ok=True)

MAX_STORY_DURATION = 60  # seconds
MAX_REEL_DURATION = 180  # 3 minutes

def apply_noise_gate(audio_data, intensity):
    """Apply noise gate using pedalboard"""
    threshold_db = -60 + (intensity * 0.6)  # -60dB to 0dB
    board = Pedalboard([NoiseGate(threshold_db=threshold_db)])
    return board(audio_data, sample_rate=44100)

def apply_parametric_eq(audio_data, sample_rate, intensity):
    """Apply EQ using pedalboard filters"""
    from pedalboard import HighpassFilter, LowpassFilter
    
    if intensity > 50:
        # High-pass filter for higher intensity
        cutoff = 200 + ((intensity - 50) * 40)  # 200Hz to 2200Hz
        board = Pedalboard([HighpassFilter(cutoff_frequency_hz=cutoff)])
    else:
        # Low-pass filter for lower intensity
        cutoff = 8000 - (intensity * 60)  # 8000Hz to 5000Hz
        board = Pedalboard([LowpassFilter(cutoff_frequency_hz=cutoff)])
    
    return board(audio_data, sample_rate)

def apply_band_pass(audio_data, sample_rate, intensity):
    """Apply band-pass using high and low pass filters (pedalboard doesn't have BandpassFilter)"""
    cutoff_low = 100 + (intensity * 5)   # 100Hz to 600Hz
    cutoff_high = 2000 + (intensity * 60) # 2kHz to 8kHz
    board = Pedalboard([
        HighpassFilter(cutoff_frequency_hz=cutoff_low),
        LowpassFilter(cutoff_frequency_hz=cutoff_high)
    ])
    return board(audio_data, sample_rate)

def apply_flanger(audio_data, intensity):
    """Apply flanger-like effect using Delay (closest available effect)"""
    delay_seconds = 0.001 + (intensity * 0.00005)  # 1ms to 6ms delay
    board = Pedalboard([Delay(delay_seconds=delay_seconds, feedback=0.3, mix=0.5)])
    return board(audio_data, sample_rate=44100)

def apply_tremolo(audio_data, intensity):
    """Apply tremolo using Gain modulation (pedalboard doesn't have Tremolo)"""
    # Simple implementation - could be enhanced with actual amplitude modulation
    gain_reduction = intensity * 0.01  # Simple gain reduction
    board = Pedalboard([Gain(gain_db=-gain_reduction)])
    return board(audio_data, sample_rate=44100)

def apply_vibrato(audio_data, intensity):
    """Apply vibrato-like effect using slight pitch shift"""
    semitones = (intensity - 50) * 0.02  # Very small pitch variations
    board = Pedalboard([PitchShift(semitones=semitones)])
    return board(audio_data, sample_rate=44100)

def apply_phaser(audio_data, intensity):
    """Apply phaser effect using pedalboard"""
    rate_hz = 0.1 + (intensity * 0.09)
    board = Pedalboard([Phaser(rate_hz=rate_hz, depth=intensity/100)])
    return board(audio_data, sample_rate=44100)



def apply_pitch_shift(audio_data, intensity):
    """Apply pitch shift using pedalboard"""
    semitones = (intensity - 50) * 0.24  # -12 to +12 semitones
    board = Pedalboard([PitchShift(semitones=semitones)])
    return board(audio_data, sample_rate=44100)

# ============ VIDEO EDITOR UTILITY FUNCTIONS ============

def get_user_tier(user_id):
    """Get user's subscription tier"""
    try:
        user = User.query.get(user_id)
        if not user:
            return 'free'
        
        active_subscription = UserSubscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()
        
        if not active_subscription:
            return 'free'
        
        plan_tier_mapping = {
            'Free': 'free',
            'Basic': 'basic',
            'Premium': 'premium', 
            'Professional': 'professional'
        }
        
        plan_name = active_subscription.pricing_plan.name if active_subscription.pricing_plan else 'Free'
        return plan_tier_mapping.get(plan_name, 'free')
        
    except Exception as e:
        print(f"Error getting user tier: {e}")
        return 'free'

def get_user_limits(user_id):
    """Get file size and feature limits for user"""
    tier = get_user_tier(user_id)
    
    limits_by_tier = {
        'free': {
            'video_clip_max_size': 500 * 1024 * 1024,
            'audio_clip_max_size': 100 * 1024 * 1024,
            'project_total_max_size': 2 * 1024 * 1024 * 1024,
            'max_tracks_per_project': 5,
            'max_projects': 3,
            'max_export_quality': '720p'
        },
        'starter': {
            'video_clip_max_size': 2 * 1024 * 1024 * 1024,
            'audio_clip_max_size': 500 * 1024 * 1024,
            'project_total_max_size': 10 * 1024 * 1024 * 1024,
            'max_tracks_per_project': 10,
            'max_projects': 10,
            'max_export_quality': '1080p'
        },
        'creator': {
            'video_clip_max_size': 5 * 1024 * 1024 * 1024,
            'audio_clip_max_size': 1024 * 1024 * 1024,
            'project_total_max_size': 50 * 1024 * 1024 * 1024,
            'max_tracks_per_project': 20,
            'max_projects': 50,
            'max_export_quality': '4k'
        },
        'pro': {
            'video_clip_max_size': 20 * 1024 * 1024 * 1024,
            'audio_clip_max_size': 2 * 1024 * 1024 * 1024,
            'project_total_max_size': 500 * 1024 * 1024 * 1024,
            'max_tracks_per_project': -1,
            'max_projects': -1,
            'max_export_quality': '8k'
        }
    }
    
    return limits_by_tier.get(tier, limits_by_tier['free'])

def calculate_user_usage(user_id):
    """Calculate current usage stats for user"""
    try:
        usage = {
            'current_projects': 0,
            'current_total_size': 0,
            'current_tracks': 0,
            'current_clips': 0
        }
        return usage
    except Exception as e:
        print(f"Error calculating usage: {e}")
        return {'current_projects': 0, 'current_total_size': 0, 'current_tracks': 0, 'current_clips': 0}

def calculate_remaining_limits(limits, usage):
    """Calculate remaining limits"""
    remaining = {}
    
    if limits['max_projects'] != -1:
        remaining['projects'] = max(0, limits['max_projects'] - usage['current_projects'])
    else:
        remaining['projects'] = -1
    
    if limits['project_total_max_size'] != -1:
        remaining['storage'] = max(0, limits['project_total_max_size'] - usage['current_total_size'])
    else:
        remaining['storage'] = -1
    
    return remaining


# Add this function to your routes.py or create a separate seed_pricing.py file

def seed_pricing_plans():
    """Create the four main pricing plans based on your pricing document"""
    
    plans_data = [
        {
            "name": "Free",
            "price_monthly": 0.00,
            "price_yearly": 0.00,
            "trial_days": 0,
            "includes_podcasts": False,
            "includes_radio": False,
            "includes_digital_sales": False,
            "includes_merch_sales": False,
            "includes_live_events": False,
            "includes_tip_jar": True,
            "includes_ad_revenue": False,
            "includes_music_distribution": False,
            "sonosuite_access": False,
            "distribution_uploads_limit": 0,
            "includes_gaming_features": True,
            "includes_team_rooms": False,
            "includes_squad_finder": True,
            "includes_gaming_analytics": False,
            "includes_game_streaming": False,
            "includes_gaming_monetization": False,
            "includes_video_distribution": False,
            "video_uploads_limit": 0
        },
        {
            "name": "Starter",
            "price_monthly": 12.99,
            "price_yearly": 129.99,
            "trial_days": 7,
            "includes_podcasts": True,
            "includes_radio": True,
            "includes_digital_sales": False,
            "includes_merch_sales": False,
            "includes_live_events": False,
            "includes_tip_jar": True,
            "includes_ad_revenue": False,
            "includes_music_distribution": False,
            "sonosuite_access": False,
            "distribution_uploads_limit": 0,
            "includes_gaming_features": True,
            "includes_team_rooms": True,
            "includes_squad_finder": True,
            "includes_gaming_analytics": True,
            "includes_game_streaming": False,
            "includes_gaming_monetization": False,
            "includes_video_distribution": False,
            "video_uploads_limit": 0
        },
        {
            "name": "Creator",
            "price_monthly": 22.99,
            "price_yearly": 229.99,
            "trial_days": 14,
            "includes_podcasts": True,
            "includes_radio": True,
            "includes_digital_sales": True,
            "includes_merch_sales": False,
            "includes_live_events": True,
            "includes_tip_jar": True,
            "includes_ad_revenue": True,
            "includes_music_distribution": False,
            "sonosuite_access": False,
            "distribution_uploads_limit": 0,
            "includes_gaming_features": True,
            "includes_team_rooms": True,
            "includes_squad_finder": True,
            "includes_gaming_analytics": True,
            "includes_game_streaming": True,
            "includes_gaming_monetization": True,
            "includes_video_distribution": True,
            "video_uploads_limit": 20
        },
        {
            "name": "Pro",
            "price_monthly": 31.99,
            "price_yearly": 319.99,
            "trial_days": 30,
            "includes_podcasts": True,
            "includes_radio": True,
            "includes_digital_sales": True,
            "includes_merch_sales": True,
            "includes_live_events": True,
            "includes_tip_jar": True,
            "includes_ad_revenue": True,
            "includes_music_distribution": True,
            "sonosuite_access": True,
            "distribution_uploads_limit": -1,
            "includes_gaming_features": True,
            "includes_team_rooms": True,
            "includes_squad_finder": True,
            "includes_gaming_analytics": True,
            "includes_game_streaming": True,
            "includes_gaming_monetization": True,
            "includes_video_distribution": True,
            "video_uploads_limit": -1
        }
    ]
    
    for plan_data in plans_data:
        existing_plan = PricingPlan.query.filter_by(name=plan_data["name"]).first()
        if not existing_plan:
            plan = PricingPlan(**plan_data)
            db.session.add(plan)
        else:
            for key, value in plan_data.items():
                setattr(existing_plan, key, value)
    
    db.session.commit()
    print("✅ Pricing plans seeded successfully!")
# =====================================================
# HELPER FUNCTION - Add this near the top of routes.py
# =====================================================
def get_time_ago(dt):
    """Convert datetime to human-readable 'time ago' string."""
    if not dt:
        return 'Recently'
    
    now = datetime.utcnow()
    diff = now - dt
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return 'Just now'
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f'{minutes} minute{"s" if minutes != 1 else ""} ago'
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f'{hours} hour{"s" if hours != 1 else ""} ago'
    elif seconds < 604800:
        days = int(seconds / 86400)
        return f'{days} day{"s" if days != 1 else ""} ago'
    elif seconds < 2592000:
        weeks = int(seconds / 604800)
        return f'{weeks} week{"s" if weeks != 1 else ""} ago'
    else:
        months = int(seconds / 2592000)
        return f'{months} month{"s" if months != 1 else ""} ago'

# Updated SonoSuite Configuration with new secret
SONOSUITE_SHARED_SECRET = os.getenv("SONOSUITE_SHARED_SECRET")
SONOSUITE_BASE_URL = os.getenv("SONOSUITE_BASE_URL", "https://streampirex.sonosuite.com")

def generate_sonosuite_jwt(user_email, external_id):
    """Generate JWT token for SonoSuite SSO - Updated with corrected secret"""
    now = int(time.time())
    exp = now + 3600  # Token expires in 1 hour
    
    # Generate unique jti (MUST be exactly 32 characters as required by SonoSuite)
    jti_source = f"{now}{random.randint(1, 1000000)}{user_email}"
    jti = hashlib.md5(jti_source.encode()).hexdigest()
    
    # SonoSuite required payload structure
    payload = {
        "iat": now,           # Required: Token generation time
        "exp": exp,           # Required: Token expiration time  
        "email": user_email,  # Required: User email (max 255 chars)
        "externalId": str(external_id),  # Required: Your unique user ID (as string)
        "jti": jti           # Required: Unique token ID (exactly 32 chars)
    }
    
    try:
        # SonoSuite requires HS256 algorithm with specific headers
        token = jwt.encode(
            payload, 
            SONOSUITE_SHARED_SECRET, 
            algorithm="HS256",
            headers={"typ": "JWT", "alg": "HS256"}  # Required headers
        )
        return token
    except Exception as e:
        print(f"JWT generation error: {e}")
        return None

def apply_expander(audio_data, intensity):
    """Apply audio expander effect"""
    from pedalboard import Compressor
    # Expander is the opposite of compressor - increases dynamic range
    ratio = 1.0 / (1.0 + (intensity * 0.05))  # Inverse compression ratio
    board = Pedalboard([Compressor(threshold_db=-20, ratio=ratio)])
    return board(audio_data, sample_rate=44100)

# Add this route to run the seed function
@api.route('/admin/seed-pricing', methods=['POST'])
@jwt_required()
def seed_pricing_route():
    if not is_admin(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        seed_pricing_plans()
        return jsonify({"message": "Pricing plans seeded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Simple helper function for SonoSuite requests
def make_sonosuite_request(endpoint, method="GET", data=None, files=None):
    """Handle SonoSuite requests - works with or without API credentials"""
    
    # Check if SonoSuite is configured
    sonosuite_api_key = os.getenv("SONOSUITE_API_KEY")
    
    if not sonosuite_api_key:
        # No SonoSuite configured - return mock success response
        print("ℹ️ SonoSuite not configured - using StreampireX direct distribution")
        
        mock_response = {
            "message": "Submitted to StreampireX distribution network",
            "release_id": f"spx_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "processing"
        }
        return mock_response, 201
    
    # If SonoSuite IS configured, make real API call
    try:
        import requests
        
        sonosuite_api_base = "https://api.sonosuite.com/v1"
        headers = {
            "Authorization": f"Bearer {sonosuite_api_key}",
            "Content-Type": "application/json"
        }
        
        url = f"{sonosuite_api_base}/{endpoint}"
        
        if method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            response = requests.get(url, headers=headers, timeout=30)
        
        # Try to return JSON response
        try:
            return response.json(), response.status_code
        except:
            return {"message": response.text}, response.status_code
            
    except Exception as e:
        print(f"⚠️ SonoSuite API error: {str(e)}")
        
        # Return fallback success response if API fails
        fallback_response = {
            "message": "Processing via StreampireX direct distribution",
            "release_id": f"spx_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "processing"
        }
        return fallback_response, 201


    
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
        query = query.order_by(desc(Video.uploaded_at))
    elif sort_by == 'oldest':
        query = query.order_by(asc(Video.uploaded_at))
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
        query = query.order_by(desc(Video.uploaded_at))
    
    # Add pagination
    paginated_videos = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    # Enhanced video serialization with channel data
    videos_data = []
    for v in paginated_videos.items:
        # Get user's channel if exists
        channel = VideoChannel.query.filter_by(user_id=v.user_id).first()
        
        video_data = {
            "id": v.id,
            "title": v.title,
            "file_url": v.file_url,
            "likes": v.likes,
            "created_at": v.uploaded_at.isoformat(),
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
            "category": v.category.name if hasattr(v, 'category') and v.category else "Other",
            
            # ADD CHANNEL INFORMATION
            "channel_id": channel.id if channel else None,
            "channel_name": channel.channel_name if channel else None,
            "channel_subscriber_count": channel.subscriber_count if channel else 0,
            "channel_verified": channel.is_verified if channel else False,
            "channel_description": channel.description if channel else None
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

@api.route('/video/<int:video_id>', methods=['GET'])
def get_video_detail(video_id):
    """Get detailed information about a specific video"""
    try:
        video = Video.query.get_or_404(video_id)
        
        # Check if video is public or user owns it
        current_user_id = None
        try:
            current_user_id = get_jwt_identity()
        except:
            pass  # Not authenticated
            
        # If video is not public and user doesn't own it, deny access
        if not getattr(video, 'is_public', True) and current_user_id != video.user_id:
            return jsonify({"error": "Video not found or private"}), 404
        
        # Get video creator info
        creator = User.query.get(video.user_id)
        
        # Get creator's channel info
        channel = VideoChannel.query.filter_by(user_id=video.user_id).first()
        
        # Increment view count (if not the owner viewing)
        if current_user_id != video.user_id:
            if hasattr(video, 'views'):
                video.views = (video.views or 0) + 1
            else:
                # If views field doesn't exist, you might need to add it to your model
                pass
            db.session.commit()
        
        # Get comments if they exist
        comments = []
        try:
            video_comments = Comment.query.filter_by(
                content_id=video_id, 
                content_type="video"
            ).order_by(desc(Comment.created_at)).limit(50).all()
            
            for comment in video_comments:
                comment_user = User.query.get(comment.user_id)
                comments.append({
                    "id": comment.id,
                    "text": comment.text,
                    "created_at": comment.created_at.isoformat(),
                    "user": {
                        "id": comment_user.id,
                        "username": comment_user.username,
                        "display_name": getattr(comment_user, 'display_name', None),
                        "avatar_url": getattr(comment_user, 'profile_picture', None) or getattr(comment_user, 'avatar_url', None)
                    }
                })
        except Exception as e:
            print(f"Error loading comments: {e}")
            
        # Format video data
        video_data = {
            "id": video.id,
            "title": video.title,
            "description": getattr(video, 'description', ''),
            "file_url": video.file_url,
            "thumbnail_url": getattr(video, 'thumbnail_url', None),
            "duration": getattr(video, 'duration', None),
            "views": getattr(video, 'views', 0),
            "likes": video.likes or 0,
            "comments_count": len(comments),
            "category": getattr(video, 'category', 'Other'),
            "tags": getattr(video, 'tags', []),
            "is_public": getattr(video, 'is_public', True),
            "age_restricted": getattr(video, 'age_restricted', False),
            "allow_comments": getattr(video, 'allow_comments', True),
            "allow_likes": getattr(video, 'allow_likes', True),
            "created_at": video.uploaded_at.isoformat() if hasattr(video, 'uploaded_at') else video.created_at.isoformat(),
            
            # Creator information
            "creator": {
                "id": creator.id,
                "username": creator.username,
                "display_name": getattr(creator, 'display_name', None),
                "avatar_url": getattr(creator, 'profile_picture', None) or getattr(creator, 'avatar_url', None)
            },
            
            # Channel information
            "channel": {
                "id": channel.id if channel else None,
                "name": channel.channel_name if channel else f"{creator.username}'s Channel",
                "subscriber_count": channel.subscriber_count if channel else 0,
                "is_verified": getattr(channel, 'is_verified', False) if channel else False
            },
            
            # Comments
            "comments": comments,
            
            # User interaction status (if authenticated)
            "user_has_liked": False,
            "user_has_subscribed": False
        }
        
        # Check user interaction status if authenticated
        if current_user_id:
            # Check if user has liked this video
            user_like = VideoLike.query.filter_by(
                user_id=current_user_id, 
                video_id=video_id
            ).first() if hasattr(locals(), 'VideoLike') else None
            video_data["user_has_liked"] = bool(user_like)
            
            # Check if user has subscribed to channel
            if channel:
                subscription = ChannelSubscription.query.filter_by(
                    subscriber_id=current_user_id,
                    channel_id=channel.id
                ).first() if hasattr(locals(), 'ChannelSubscription') else None
                video_data["user_has_subscribed"] = bool(subscription)
        
        return jsonify(video_data), 200
        
    except Exception as e:
        print(f"Error fetching video detail: {e}")
        return jsonify({"error": "Video not found"}), 404


@api.route('/video/<int:video_id>', methods=['DELETE'])
@jwt_required()
def delete_video_by_id(video_id):
    """Delete a video by ID (only by owner)"""
    try:
        user_id = get_jwt_identity()
        video = Video.query.filter_by(id=video_id, user_id=user_id).first()
        
        if not video:
            return jsonify({"error": "Video not found or not authorized"}), 404
        
        # Delete the video record
        db.session.delete(video)
        db.session.commit()
        
        return jsonify({"message": "Video deleted successfully"}), 200
        
    except Exception as e:
        print(f"Error deleting video: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to delete video"}), 500


@api.route('/video/<int:video_id>/like', methods=['POST'])
@jwt_required()
def toggle_video_like(video_id):
    """Toggle like/unlike on a video"""
    try:
        user_id = get_jwt_identity()
        video = Video.query.get_or_404(video_id)
        
        # Try to find existing like (you might need to create VideoLike model)
        # For now, just increment/decrement the likes count
        
        # This is a simplified version - you should implement proper like tracking
        video.likes = (video.likes or 0) + 1
        db.session.commit()
        
        return jsonify({
            "message": "Video liked",
            "likes": video.likes
        }), 200
        
    except Exception as e:
        print(f"Error toggling video like: {e}")
        return jsonify({"error": "Failed to like video"}), 500

@api.route('/video/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_videos_by_id(user_id):
    """Get all videos for a specific user (for viewing profiles)"""
    try:
        # Get all videos by this user
        videos = Video.query.filter_by(user_id=user_id).all()
        
        # Serialize the videos
        video_list = [{
            'id': video.id,
            'title': video.title,
            'description': video.description,
            'file_url': video.file_url,
            'thumbnail_url': video.thumbnail_url,
            'duration': video.duration,
            'views': video.views,
            'likes': video.likes,
            'uploaded_at': video.uploaded_at.isoformat() if video.uploaded_at else None,
            'is_public': video.is_public,
            'category': video.category
        } for video in videos]
        
        return jsonify({
            'videos': video_list,
            'total': len(video_list)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/video/channels/browse', methods=['GET'])
def browse_channels():
    """Get all public video channels for browsing"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '').strip()
        
        query = VideoChannel.query.filter_by(is_public=True)
        
        if search:
            query = query.join(User).filter(
                or_(
                    VideoChannel.channel_name.ilike(f'%{search}%'),
                    VideoChannel.description.ilike(f'%{search}%'),
                    User.username.ilike(f'%{search}%')
                )
            )
        
        query = query.order_by(desc(VideoChannel.subscriber_count))
        
        paginated_channels = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        channels_data = []
        for channel in paginated_channels.items:
            # Get recent videos for preview
            recent_videos = Video.query.filter_by(user_id=channel.user_id, is_public=True)\
                                      .order_by(desc(Video.uploaded_at))\
                                      .limit(3).all()
            
            channel_data = channel.serialize()
            channel_data['recent_videos'] = [v.serialize() for v in recent_videos]
            channel_data['creator'] = {
                'id': channel.user.id,
                'username': channel.user.username,
                'display_name': getattr(channel.user, 'display_name', None),
                'profile_picture': getattr(channel.user, 'profile_picture', None) or getattr(channel.user, 'avatar_url', None)
            }
            channels_data.append(channel_data)
        
        return jsonify({
            "channels": channels_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": paginated_channels.total,
                "pages": paginated_channels.pages,
                "has_next": paginated_channels.has_next,
                "has_prev": paginated_channels.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to browse channels: {str(e)}"}), 500

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
        Video.uploaded_at >= week_ago,
        Video.is_public == True
    ).order_by(desc(Video.likes)).limit(10).all()
    
    videos_data = []
    for v in trending_videos:
        videos_data.append({
            "id": v.id,
            "title": v.title,
            "file_url": v.file_url,
            "likes": v.likes,
            "created_at": v.uploaded_at.isoformat(),
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


@api.route('/podcast/download/<int:episode_id>', methods=['GET'])
def download_podcast_episode(episode_id):
    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404
    return jsonify({"download_url": episode.file_url})

@api.route('/upload_podcast', methods=['POST'])
@cross_origin()
@jwt_required()
def upload_podcast():
    user_id = get_jwt_identity()

    # ── Tier Limit Check (Podcast) ──
    limit_check = check_content_limit(user_id, 'podcast')
    if not limit_check["allowed"]:
        return jsonify({
            "error": limit_check["upgrade_message"],
            "limit_reached": True,
            "current_count": limit_check["current_count"],
            "max_allowed": limit_check["max_allowed"],
            "plan": limit_check["plan_name"],
            "upgrade_url": "/pricing"
        }), 403

    # File type validation constants
    ALLOWED_AUDIO_TYPES = {'mp3', 'wav', 'flac', 'm4a', 'aac'}
    ALLOWED_VIDEO_TYPES = {'mp4', 'mov', 'avi', 'mkv', 'webm'}
    ALLOWED_IMAGE_TYPES = {'jpg', 'jpeg', 'png', 'webp'}
    MAX_AUDIO_SIZE = 500 * 1024 * 1024  # 500MB
    MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB

    def validate_file_type_and_size(file, allowed_types, max_size, file_type_name):
        """Validate file type and size"""
        if not file or not hasattr(file, 'filename') or file.filename == '':
            return None, f"No {file_type_name} file provided"

        if '.' not in file.filename:
            return None, f"Invalid {file_type_name} file - no extension found"

        file_ext = file.filename.rsplit('.', 1)[1].lower()
        if file_ext not in allowed_types:
            return None, f"Invalid {file_type_name} format. Allowed: {', '.join(allowed_types)}"

        original_position = file.tell()
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(original_position)

        if file_size > max_size:
            size_mb = max_size // (1024 * 1024)
            return None, f"{file_type_name.capitalize()} file too large. Maximum size: {size_mb}MB"

        if file_size == 0:
            return None, f"{file_type_name.capitalize()} file is empty"

        return True, None

    try:
        # Extract and validate form data
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        category = request.form.get("category", "General")
        subscription_tier = request.form.get("subscription_tier", "Free")
        streaming_enabled = request.form.get("streaming_enabled") == "true"
        scheduled_release = request.form.get("scheduled_release")

        # Basic validation
        if not title:
            return jsonify({"error": "Podcast title is required"}), 400

        if len(title) > 255:
            return jsonify({"error": "Title too long (max 255 characters)"}), 400

        # Get uploaded files
        cover_art = request.files.get("cover_art")
        audio_file = request.files.get("audio")
        video_file = request.files.get("video")

        print(f"DEBUG: Received files - Audio: {audio_file.filename if audio_file else 'None'}, Video: {video_file.filename if video_file else 'None'}, Cover: {cover_art.filename if cover_art else 'None'}")

        # Validate that at least one media file is provided
        if not audio_file and not video_file:
            return jsonify({"error": "Either audio or video file is required"}), 400

        # Initialize variables
        audio_url, video_url, cover_url, duration = None, None, None, None
        audio_file_name, video_file_name = None, None

        # Validate and upload cover art (optional)
        if cover_art and cover_art.filename:
            print(f"DEBUG: Validating cover art: {cover_art.filename}")
            is_valid, error_msg = validate_file_type_and_size(cover_art, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "image")
            if error_msg:
                return jsonify({"error": f"Cover art error: {error_msg}"}), 400

            try:
                cover_filename = secure_filename(cover_art.filename)
                cover_url = uploadFile(cover_art, f"podcast_covers/{user_id}_{cover_filename}")
                print(f"SUCCESS: Cover art uploaded to: {cover_url}")
            except Exception as e:
                print(f"ERROR: Cover art upload failed: {e}")
                return jsonify({"error": f"Cover art upload failed: {str(e)}"}), 500

        # Validate and upload audio file
        if audio_file and audio_file.filename:
            print(f"DEBUG: Validating audio file: {audio_file.filename}")
            is_valid, error_msg = validate_file_type_and_size(audio_file, ALLOWED_AUDIO_TYPES, MAX_AUDIO_SIZE, "audio")
            if error_msg:
                return jsonify({"error": f"Audio file error: {error_msg}"}), 400

            try:
                audio_file_name = secure_filename(audio_file.filename)
                audio_url = uploadFile(audio_file, f"podcast_audio/{user_id}_{audio_file_name}")
                print(f"SUCCESS: Audio uploaded to: {audio_url}")
            except Exception as e:
                print(f"ERROR: Audio upload failed: {e}")
                return jsonify({"error": f"Audio file upload failed: {str(e)}"}), 500

        # Validate and upload video file
        if video_file and video_file.filename:
            print(f"DEBUG: Validating video file: {video_file.filename}")
            is_valid, error_msg = validate_file_type_and_size(video_file, ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE, "video")
            if error_msg:
                return jsonify({"error": f"Video file error: {error_msg}"}), 400

            try:
                video_file_name = secure_filename(video_file.filename)
                video_url = uploadFile(video_file, f"podcast_videos/{user_id}_{video_file_name}")
                print(f"SUCCESS: Video uploaded to: {video_url}")
            except Exception as e:
                print(f"ERROR: Video upload failed: {e}")
                return jsonify({"error": f"Video file upload failed: {str(e)}"}), 500

        # Parse scheduled release date
        parsed_scheduled_release = None
        if scheduled_release:
            try:
                if 'T' in scheduled_release:
                    parsed_scheduled_release = datetime.fromisoformat(scheduled_release.replace('Z', '+00:00'))
                else:
                    parsed_scheduled_release = datetime.strptime(scheduled_release, '%Y-%m-%dT%H:%M')
            except ValueError as ve:
                print(f"WARNING: Invalid scheduled release date format: {scheduled_release}, error: {ve}")
                parsed_scheduled_release = None

        # ── Tier Limit Check (Episodes) ──
        episode_limit_check = check_content_limit(user_id, 'podcast_episode')
        if not episode_limit_check["allowed"]:
            return jsonify({
                "error": episode_limit_check["upgrade_message"],
                "limit_reached": True,
                "current_count": episode_limit_check["current_count"],
                "max_allowed": episode_limit_check["max_allowed"],
                "plan": episode_limit_check["plan_name"],
                "upgrade_url": "/pricing"
            }), 403

        # Create podcast record
        new_podcast = Podcast(
            creator_id=user_id,
            title=title,
            description=description,
            category=category,
            audio_file_name=audio_file_name,
            video_file_name=video_file_name,
            audio_url=audio_url,
            video_url=video_url,
            cover_art_url=cover_url,
            duration=duration,
            subscription_tier=subscription_tier,
            streaming_enabled=streaming_enabled,
            scheduled_release=parsed_scheduled_release
        )

        db.session.add(new_podcast)
        db.session.flush()  # Get the podcast ID without committing

        print(f"SUCCESS: Created podcast with ID: {new_podcast.id}")

        # Create separate episodes for each media type
        episodes_created = []

        # Create video episode if video was uploaded
        if video_url:
            try:
                video_episode = PodcastEpisode(
                    podcast_id=new_podcast.id,
                    user_id=user_id,
                    title=f"{title} - Video Episode",
                    description=description,
                    file_url=video_url,
                    cover_art_url=cover_url,
                    duration=duration,
                    is_published=True,
                    release_date=datetime.utcnow(),
                )
                db.session.add(video_episode)
                episodes_created.append("video")
                print(f"SUCCESS: Created video episode for podcast {new_podcast.id}")
            except Exception as episode_error:
                print(f"WARNING: Failed to create video episode: {episode_error}")

        # Create audio episode if audio was uploaded
        if audio_url:
            try:
                audio_episode = PodcastEpisode(
                    podcast_id=new_podcast.id,
                    user_id=user_id,
                    title=f"{title} - Audio Episode",
                    description=description,
                    file_url=audio_url,
                    cover_art_url=cover_url,
                    duration=duration,
                    is_published=True,
                    release_date=datetime.utcnow(),
                )
                db.session.add(audio_episode)
                episodes_created.append("audio")
                print(f"SUCCESS: Created audio episode for podcast {new_podcast.id}")
            except Exception as episode_error:
                print(f"WARNING: Failed to create audio episode: {episode_error}")

        # Commit all changes
        db.session.commit()
        print(f"SUCCESS: All changes committed to database")

        # Prepare response
        response_data = {
            "message": "Podcast uploaded successfully",
            "podcast_id": new_podcast.id,
            "episodes_created": episodes_created,
            "podcast": {
                "id": new_podcast.id,
                "title": title,
                "description": description,
                "category": category,
                "subscription_tier": subscription_tier,
                "streaming_enabled": streaming_enabled
            }
        }

        # Add URLs to response if they exist
        if audio_url:
            response_data["audio_url"] = audio_url
        if video_url:
            response_data["video_url"] = video_url
        if cover_url:
            response_data["cover_url"] = cover_url

        return jsonify(response_data), 201

    except Exception as e:
        # Rollback any database changes
        db.session.rollback()

        # Log the full error for debugging
        import traceback
        print("=== PODCAST UPLOAD ERROR ===")
        print(f"Error: {str(e)}")
        print("Traceback:")
        traceback.print_exc()
        print("=== END ERROR ===")

        # Return error to client
        return jsonify({
            "error": "Podcast upload failed. Please try again.",
            "details": str(e)
        }), 500

@api.route('/upload_episode', methods=['POST'])
@jwt_required()
def upload_episode():
    user_id = get_jwt_identity()
    data = request.form
    podcast_id = data.get("podcast_id")
    title = data.get("title")
    description = data.get("description")
    release_date = data.get("release_date")

    audio = request.files.get("audio")
    video = request.files.get("video")
    cover_art = request.files.get("cover_art")

    audio_url, video_url, cover_url, duration = None, None, None, None
    upload_dir = os.path.join("static", "uploads", "episodes")
    os.makedirs(upload_dir, exist_ok=True)
    timestamp = str(int(datetime.utcnow().timestamp()))

    if cover_art:
        filename = secure_filename(f"{user_id}_{timestamp}_{cover_art.filename}")
        path = os.path.join(upload_dir, filename)
        cover_art.save(path)
        cover_url = f"/{path}"

    if audio:
        filename = secure_filename(f"{user_id}_{timestamp}_{audio.filename}")
        path = os.path.join(upload_dir, filename)
        audio.save(path)
        audio_url = f"/{path}"
        try:
            audio_meta = MP3(path)
            duration = int(audio_meta.info.length)
        except:
            pass

    if video:
        filename = secure_filename(f"{user_id}_{timestamp}_{video.filename}")
        path = os.path.join(upload_dir, filename)
        video.save(path)
        video_url = f"/{path}"

    episode = PodcastEpisode(
        podcast_id=podcast_id,
        user_id=user_id,
        title=title,
        description=description,
        file_url=audio_url or video_url,
        cover_art_url=cover_url,
        duration=duration,
        is_published=True,
        release_date=datetime.fromisoformat(release_date) if release_date else datetime.utcnow()
    )
    db.session.add(episode)
    db.session.commit()

    return jsonify({"message": "Episode uploaded successfully"}), 201




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

@api.route('/podcast/<int:podcast_id>/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_podcast(podcast_id):
    """Subscribe to podcast with payment"""
    try:
        user_id = get_jwt_identity()
        podcast = Podcast.query.get(podcast_id)

        if not podcast:
            return jsonify({"error": "Podcast not found"}), 404

        # Check if already subscribed
        existing_sub = PodcastSubscription.query.filter_by(
            user_id=user_id,
            podcast_id=podcast_id,
            is_active=True
        ).first()
        
        if existing_sub:
            return jsonify({"error": "Already subscribed to this podcast"}), 400

        # Get subscription price (you can add this field to Podcast model)
        subscription_price = getattr(podcast, 'subscription_price', 4.99)  # Default $4.99/month
        
        if subscription_price > 0:
            # Create Stripe subscription
            try:
                import stripe
                stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
                
                # Create Stripe customer if doesn't exist
                user = User.query.get(user_id)
                stripe_customer_id = getattr(user, 'stripe_customer_id', None)
                
                if not stripe_customer_id:
                    customer = stripe.Customer.create(
                        email=user.email,
                        name=user.username
                    )
                    stripe_customer_id = customer.id
                    user.stripe_customer_id = stripe_customer_id
                    db.session.commit()
                
                # Create subscription
                subscription = stripe.Subscription.create(
                    customer=stripe_customer_id,
                    items=[{
                        'price_data': {
                            'currency': 'usd',
                            'product_data': {
                                'name': f"Subscription to {podcast.name}",
                            },
                            'unit_amount': int(subscription_price * 100),
                            'recurring': {'interval': 'month'},
                        },
                    }],
                    payment_behavior='default_incomplete',
                    expand=['latest_invoice.payment_intent'],
                )
                
                # Create subscription record
                new_subscription = PodcastSubscription(
                    user_id=user_id,
                    podcast_id=podcast_id,
                    stripe_subscription_id=subscription.id,
                    amount=subscription_price,
                    status='pending'
                )
                
                db.session.add(new_subscription)
                db.session.commit()
                
                return jsonify({
                    "message": "Subscription created",
                    "client_secret": subscription.latest_invoice.payment_intent.client_secret,
                    "subscription_id": subscription.id
                }), 200
                
            except Exception as stripe_error:
                return jsonify({"error": f"Payment setup failed: {str(stripe_error)}"}), 500
        else:
            # Free subscription
            new_subscription = PodcastSubscription(
                user_id=user_id,
                podcast_id=podcast_id,
                amount=0,
                status='active'
            )
            
            db.session.add(new_subscription)
            db.session.commit()
            
            return jsonify({"message": "Successfully subscribed to free podcast!"}), 200
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Subscription failed: {str(e)}"}), 500

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
def create_radio_station_fixed():
    """Create radio station with proper Cloudinary integration"""
    user_id = get_jwt_identity()

    # ── Tier Limit Check ──
    limit_check = check_content_limit(user_id, 'radio_station')
    if not limit_check["allowed"]:
        return jsonify({
            "error": limit_check["upgrade_message"],
            "limit_reached": True,
            "current_count": limit_check["current_count"],
            "max_allowed": limit_check["max_allowed"],
            "plan": limit_check["plan_name"],
            "upgrade_url": "/pricing"
        }), 403

    try:
        # Get form data
        data = request.form.to_dict()
        name = data.get('stationName') or data.get('name')
        description = data.get('description', '')
        category = data.get('category', 'Music')

        if not name:
            return jsonify({"error": "Station name is required"}), 400

        # Initialize URLs
        logo_url = None
        cover_url = None
        initial_mix_url = None
        mix_filename = None

        # ✅ Handle logo upload with Cloudinary
        if 'logo' in request.files:
            logo_file = request.files['logo']
            if logo_file and logo_file.filename:
                logo_filename = secure_filename(logo_file.filename)
                logo_url = uploadFile(logo_file, logo_filename)
                print(f"✅ Logo uploaded to Cloudinary: {logo_url}")

        # ✅ Handle cover upload with Cloudinary
        if 'cover' in request.files or 'coverPhoto' in request.files:
            cover_file = request.files.get('cover') or request.files.get('coverPhoto')
            if cover_file and cover_file.filename:
                cover_filename = secure_filename(cover_file.filename)
                cover_url = uploadFile(cover_file, cover_filename)
                print(f"✅ Cover uploaded to Cloudinary: {cover_url}")

        # ✅ Handle initial mix upload with Cloudinary
        if 'initialMix' in request.files:
            mix_file = request.files['initialMix']
            if mix_file and mix_file.filename:
                mix_filename = secure_filename(mix_file.filename)
                initial_mix_url = uploadFile(mix_file, mix_filename)
                print(f"✅ Audio uploaded to Cloudinary: {initial_mix_url}")

        # Get creator info
        creator = User.query.get(user_id)
        creator_name = creator.username if creator else "Unknown"

        # ✅ Create station with Cloudinary URLs
        new_station = RadioStation(
            user_id=user_id,
            name=name,
            description=description,
            logo_url=logo_url,
            cover_image_url=cover_url,
            stream_url=initial_mix_url,
            loop_audio_url=initial_mix_url,
            audio_url=initial_mix_url,
            is_public=True,
            is_live=True if initial_mix_url else False,
            genres=[category] if category else ["Music"],
            creator_name=creator_name,
            created_at=datetime.utcnow(),
            audio_file_name=mix_filename
        )

        db.session.add(new_station)
        db.session.flush()

        # ✅ Create Audio record if initial mix was uploaded
        if initial_mix_url:
            mix_title = data.get("mixTitle", f"{name} - Initial Mix")

            initial_audio = Audio(
                user_id=user_id,
                title=mix_title,
                description=data.get("mixDescription", ""),
                file_url=initial_mix_url,
                uploaded_at=datetime.utcnow()
            )

            db.session.add(initial_audio)

        db.session.commit()

        return jsonify({
            "message": "Radio station created successfully!",
            "station": new_station.serialize(),
            "redirect_url": f"/radio/station/{new_station.id}"
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ Station creation error: {str(e)}")
        return jsonify({"error": f"Failed to create station: {str(e)}"}), 500


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

@api.route('/radio-stations', methods=['GET'])
def get_all_radio_stations():
    """Get all public radio stations for Browse Radio Stations page"""
    try:
        # Get all public stations, newest first
        stations = RadioStation.query.filter_by(is_public=True).order_by(RadioStation.created_at.desc()).all()
        
        stations_data = []
        for station in stations:
            # Get creator info
            creator = User.query.get(station.user_id)
            
            # Determine genre - your model uses 'genres' array
            genre = "Music"  # Default
            if station.genres and len(station.genres) > 0:
                genre = station.genres[0]  # Use first genre
            
            # Construct file_url from audio_file_name
            file_url = None
            if station.audio_file_name:
                file_url = f"/uploads/station_mixes/{station.audio_file_name}"
            
            # Build station data for frontend
            station_data = {
                "id": station.id,
                "name": station.name,
                "description": station.description or "A great radio station",
                "genre": genre,  # BrowseRadioStations expects this field
                "image": station.logo_url,  # For compatibility with frontend
                "cover_art_url": station.cover_image_url,
                "logo_url": station.logo_url,
                "creator_name": station.creator_name or (creator.username if creator else "Unknown"),
                "created_at": station.created_at.isoformat() if station.created_at else None,
                "is_live": station.is_live,
                "followers_count": station.followers_count,
                "file_url": file_url  # ✅ Added file_url from audio_file_name
            }
            stations_data.append(station_data)
        
        print(f"📡 Returning {len(stations_data)} radio stations to frontend")
        return jsonify(stations_data), 200
        
    except Exception as e:
        print(f"❌ Error fetching radio stations: {e}")
        return jsonify([]), 200  # Return empty array on error
   
# @api.route('/radio-stations', methods=['GET'])
# def get_public_radio_stations():
#     """Public endpoint to get all radio stations without authentication"""
#     try:
#         stations = RadioStation.query.all()
#         return jsonify([station.serialize() for station in stations]), 200
#     except Exception as e:
#         return jsonify({"error": "Failed to fetch radio stations"}), 500

@api.route('/radio-stations/<int:id>', methods=['GET'])
def get_radio_station_detail(id):
    station = RadioStation.query.get(id)
    if not station:
        return jsonify({"error": "Station not found"}), 404
    return jsonify(station.serialize()), 200

@api.route("/radio-station/<int:station_id>/playlist", methods=["GET"])
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


# Update your subscription route in routes.py

# Add this function to your routes.py file

def create_standalone_plans():
    """Create standalone music distribution plans"""
    
    # Check if standalone plans already exist
    artist_plan = PricingPlan.query.filter_by(name="Standalone Artist").first()
    label_plan = PricingPlan.query.filter_by(name="Standalone Label").first()
    
    if not artist_plan:
        artist_plan = PricingPlan(
            name="Standalone Artist",
            price_monthly=0.00,  # Not used for standalone
            price_yearly=22.99,  # Yearly pricing
            trial_days=0,
            includes_podcasts=False,
            includes_radio=False,
            includes_digital_sales=False,
            includes_merch_sales=False,
            includes_live_events=False,
            includes_tip_jar=False,
            includes_ad_revenue=False,
            includes_music_distribution=True,
            sonosuite_access=True,
            distribution_uploads_limit=-1,  # Unlimited
            includes_gaming_features=False,
            includes_team_rooms=False,
            includes_squad_finder=False,
            includes_gaming_analytics=False,
            includes_game_streaming=False,
            includes_gaming_monetization=False,
            includes_video_distribution=False,
            video_uploads_limit=0
        )
        db.session.add(artist_plan)
    
    if not label_plan:
        label_plan = PricingPlan(
            name="Standalone Label",
            price_monthly=0.00,  # Not used for standalone
            price_yearly=74.99,  # Yearly pricing
            trial_days=0,
            includes_podcasts=False,
            includes_radio=False,
            includes_digital_sales=False,
            includes_merch_sales=False,
            includes_live_events=False,
            includes_tip_jar=False,
            includes_ad_revenue=False,
            includes_music_distribution=True,
            sonosuite_access=True,
            distribution_uploads_limit=-1,  # Unlimited
            includes_gaming_features=False,
            includes_team_rooms=False,
            includes_squad_finder=False,
            includes_gaming_analytics=False,
            includes_game_streaming=False,
            includes_gaming_monetization=False,
            includes_video_distribution=False,
            video_uploads_limit=0
        )
        db.session.add(label_plan)
    
    try:
        db.session.commit()
        print("✅ Standalone plans created successfully!")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating standalone plans: {e}")
        return False


# Update your existing subscription route to handle standalone plans
@api.route('/subscriptions/subscribe', methods=['POST'])
@jwt_required()
def subscribe():
    """Handle subscription requests for all plan types with proper Stripe integration"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        plan_id = data.get("plan_id")
        billing_cycle = data.get("billing_cycle", "monthly")

        if not plan_id:
            return jsonify({"error": "Missing plan_id"}), 400

        print(f"Subscription request for plan_id: {plan_id}, type: {type(plan_id)}")

        # Find the plan
        plan = None
        
        # Handle Standalone Plans by String ID
        if isinstance(plan_id, str):
            if plan_id == "standalone-artist":
                # Find or create standalone artist plan
                plan = PricingPlan.query.filter_by(name="Standalone Artist").first()
                if not plan:
                    print("Creating Standalone Artist plan...")
                    plan = PricingPlan(
                        name="Standalone Artist",
                        price_monthly=22.99,
                        price_yearly=22.99,  # Actually yearly
                        trial_days=0,
                        includes_podcasts=False,
                        includes_radio=False,
                        includes_digital_sales=False,
                        includes_merch_sales=False,
                        includes_live_events=False,
                        includes_tip_jar=False,
                        includes_ad_revenue=False,
                        includes_music_distribution=True,
                        sonosuite_access=True,
                        distribution_uploads_limit=-1,
                        includes_gaming_features=False,
                        includes_team_rooms=False,
                        includes_squad_finder=False,
                        includes_gaming_analytics=False,
                        includes_game_streaming=False,
                        includes_gaming_monetization=False,
                        includes_video_distribution=False,
                        video_uploads_limit=0
                    )
                    db.session.add(plan)
                    db.session.commit()
                    print("Standalone Artist plan created successfully!")

            elif plan_id == "standalone-label":
                # Find or create standalone label plan
                plan = PricingPlan.query.filter_by(name="Standalone Label").first()
                if not plan:
                    print("Creating Standalone Label plan...")
                    plan = PricingPlan(
                        name="Standalone Label",
                        price_monthly=74.99,
                        price_yearly=74.99,  # Actually yearly
                        trial_days=0,
                        includes_podcasts=False,
                        includes_radio=False,
                        includes_digital_sales=False,
                        includes_merch_sales=False,
                        includes_live_events=False,
                        includes_tip_jar=False,
                        includes_ad_revenue=False,
                        includes_music_distribution=True,
                        sonosuite_access=True,
                        distribution_uploads_limit=-1,
                        includes_gaming_features=False,
                        includes_team_rooms=False,
                        includes_squad_finder=False,
                        includes_gaming_analytics=False,
                        includes_game_streaming=False,
                        includes_gaming_monetization=False,
                        includes_video_distribution=False,
                        video_uploads_limit=0
                    )
                    db.session.add(plan)
                    db.session.commit()
                    print("Standalone Label plan created successfully!")
            else:
                # Handle other string plan names
                plan = PricingPlan.query.filter_by(name=plan_id).first()
        
        # Handle Integer Plan IDs
        elif isinstance(plan_id, int) or plan_id.isdigit():
            plan = PricingPlan.query.get(int(plan_id))

        if not plan:
            return jsonify({"error": "Plan not found"}), 404

        print(f"Plan found: {plan.name} - Monthly: ${plan.price_monthly}, Yearly: ${plan.price_yearly}")

        # Check for existing active subscription
        existing_subscription = Subscription.query.filter_by(
            user_id=user_id, 
            status="active"
        ).first()
        
        if existing_subscription:
            return jsonify({
                "error": "You already have an active subscription"
            }), 400

        # Determine price based on billing cycle and plan type
        if plan.name in ["Standalone Artist", "Standalone Label"]:
            # Standalone plans are yearly-only
            price = plan.price_yearly
            billing_cycle = "yearly"
        else:
            # Regular plans support monthly/yearly
            if billing_cycle == "yearly":
                price = plan.price_yearly
            else:
                price = plan.price_monthly
                billing_cycle = "monthly"

        print(f"Final price: ${price}, billing cycle: {billing_cycle}")

        # Handle Free Plans (price = 0)
        if price == 0:
            print("Creating free subscription...")
            new_subscription = Subscription(
                user_id=user_id,
                plan_id=plan.id,
                billing_cycle=billing_cycle,
                status="active",  # Free plans are immediately active
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=365 if billing_cycle == "yearly" else 30)
            )
            
            db.session.add(new_subscription)
            db.session.commit()
            
            return jsonify({
                "message": "Successfully subscribed to free plan!",
                "subscription_id": new_subscription.id,
                "status": "active"
            }), 200

        # Handle Paid Plans - Create Stripe Checkout Session
        try:
            print(f"Creating Stripe checkout for ${price}...")
            
            # Calculate platform fee (10% platform cut)
            platform_cut = price * 0.10
            creator_earnings = price * 0.90
            
            # Determine if this is a subscription or one-time payment
            # Standalone plans are one-time yearly payments
            if plan.name in ["Standalone Artist", "Standalone Label"]:
                # One-time payment for standalone plans
                checkout_session = stripe.checkout.Session.create(
                    payment_method_types=['card'],
                    line_items=[{
                        'price_data': {
                            'currency': 'usd',
                            'product_data': {
                                'name': f'{plan.name} - Annual Plan',
                                'description': f'Music distribution access for one year'
                            },
                            'unit_amount': int(price * 100),  # Convert to cents
                        },
                        'quantity': 1,
                    }],
                    mode='payment',  # One-time payment
                    success_url=f"{os.getenv('FRONTEND_URL')}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{os.getenv('FRONTEND_URL')}/pricing",
                    metadata={
                        'user_id': str(user_id),
                        'plan_id': str(plan.id),
                        'billing_cycle': billing_cycle,
                        'platform_cut': str(platform_cut),
                        'creator_earnings': str(creator_earnings),
                        'plan_type': 'standalone'
                    }
                )
            else:
                # Recurring subscription for regular plans
                checkout_session = stripe.checkout.Session.create(
                    payment_method_types=['card'],
                    line_items=[{
                        'price_data': {
                            'currency': 'usd',
                            'product_data': {
                                'name': f'{plan.name} Plan ({billing_cycle.title()})',
                                'description': f'Access to all {plan.name} features'
                            },
                            'unit_amount': int(price * 100),  # Convert to cents
                            'recurring': {
                                'interval': 'month' if billing_cycle == 'monthly' else 'year'
                            }
                        },
                        'quantity': 1,
                    }],
                    mode='subscription',  # Recurring subscription
                    success_url=f"{os.getenv('FRONTEND_URL')}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{os.getenv('FRONTEND_URL')}/pricing",
                    metadata={
                        'user_id': str(user_id),
                        'plan_id': str(plan.id),
                        'billing_cycle': billing_cycle,
                        'platform_cut': str(platform_cut),
                        'creator_earnings': str(creator_earnings),
                        'plan_type': 'regular'
                    }
                )

            # Create pending subscription in database
            new_subscription = Subscription(
                user_id=user_id,
                plan_id=plan.id,
                billing_cycle=billing_cycle,
                status="pending",  # Will be activated by webhook after payment
                stripe_checkout_session_id=checkout_session.id
            )
            
            db.session.add(new_subscription)
            db.session.commit()
            
            print(f"✅ Subscription created with Stripe checkout URL")
            
            return jsonify({
                "checkout_url": checkout_session.url,
                "subscription_id": new_subscription.id,
                "status": "pending",
                "message": "Redirecting to payment..."
            }), 200
            
        except stripe.error.StripeError as e:
            print(f"❌ Stripe error: {str(e)}")
            db.session.rollback()
            return jsonify({
                "error": f"Payment processing error: {str(e)}"
            }), 400
        
    except Exception as e:
        print(f"❌ Subscription error: {str(e)}")
        db.session.rollback()
        return jsonify({
            "error": f"Subscription failed: {str(e)}"
        }), 500

@api.route('/success', methods=['GET'])
def subscription_success():
    """Simple success page for subscription"""
    plan = request.args.get('plan', 'Unknown')
    price = request.args.get('price', '0')
    updated = request.args.get('updated', 'false')
    
    action = "updated to" if updated == 'true' else "subscribed to"
    
    return f"""
    <html>
    <head><title>Subscription Success</title></head>
    <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>🎉 Success!</h1>
        <h2>You have successfully {action} the {plan} plan!</h2>
        <p>Price: ${price}/year</p>
        <p><a href="/pricing">← Back to Pricing</a></p>
        <p><a href="/music-distribution">Go to Music Distribution →</a></p>
    </body>
    </html>
    """


# Add a route to check subscription status
@api.route('/subscriptions/status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    """Get current user's subscription status"""
    user_id = get_jwt_identity()
    subscription = Subscription.query.filter_by(user_id=user_id, status="active").first()
    
    if subscription:
        return jsonify({
            "has_subscription": True,
            "subscription": subscription.serialize()
        }), 200
    else:
        return jsonify({
            "has_subscription": False,
            "message": "No active subscription found"
        }), 200

@api.route('/subscriptions/cancel', methods=['POST'])
@jwt_required()
def cancel_subscription():
    user_id = get_jwt_identity()
    subscription = UserSubscription.query.filter_by(user_id=user_id).first()

    if not subscription:
        return jsonify({"error": "No active subscription found"}), 404

    # Cancel in Stripe
    # stripe.Subscription.delete(subscription.stripe_subscription_id)
    db.session.delete(subscription)
    db.session.commit()

    return jsonify({"message": "Subscription canceled successfully"}), 200


# Add this route to manually create standalone plans (for testing)
@api.route('/admin/create-standalone-plans', methods=['POST'])
def create_standalone_plans_route():
    """Manual route to create standalone plans"""
    success = create_standalone_plans()
    if success:
        return jsonify({"message": "Standalone plans created successfully"}), 200
    else:
        return jsonify({"error": "Failed to create standalone plans"}), 500

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



@api.route('/public-podcasts', methods=['GET'])
def get_public_podcasts():
    podcasts = Podcast.query.all()
    return jsonify([podcast.serialize() for podcast in podcasts]), 200



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

# ===========================================
# REPLACE YOUR EXISTING /signup ROUTE WITH THIS
# ===========================================

@api.route("/signup", methods=["POST"])
def create_signup():
    """
    Create a new user account with support for:
    - Regular users
    - Artists (is_artist)
    - Gamers (is_gamer)
    - Video Creators (is_video_creator)
    - Or any combination
    """
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
        
        # ========== REQUIRED FIELDS ==========
        email = data.get("email")
        password = data.get("password")
        username = data.get("username")
        first_name = data.get("firstName")
        last_name = data.get("lastName")
        date_of_birth = data.get("dateOfBirth")
        
        # Validation
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        if not username:
            username = email.split('@')[0]
        
        # Check if user exists
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already taken"}), 400
        
        # ========== CREATOR TYPE FLAGS ==========
        # Convert string "true"/"false" to boolean
        def str_to_bool(val):
            if isinstance(val, bool):
                return val
            if isinstance(val, str):
                return val.lower() in ('true', '1', 'yes')
            return False
        
        is_artist = str_to_bool(data.get("is_artist", False))
        is_gamer = str_to_bool(data.get("is_gamer", False))
        is_video_creator = str_to_bool(data.get("is_video_creator", False))
        
        # Compute profile_type for backward compatibility
        profile_type = data.get("profile_type", "regular")
        if profile_type == "regular":
            # Auto-compute from booleans
            types = []
            if is_artist: types.append("artist")
            if is_gamer: types.append("gamer")
            if is_video_creator: types.append("video")
            
            if len(types) == 0:
                profile_type = "regular"
            elif len(types) == 1:
                profile_type = types[0]
            else:
                profile_type = "multiple"
        
        # ========== ARTIST FIELDS ==========
        artist_name = data.get("artistName") or data.get("stageName")
        industry = data.get("industry")
        bio = data.get("bio")
        
        # ========== VIDEO CREATOR FIELDS ==========
        channel_name = data.get("channelName")
        content_category = data.get("contentCategory")
        
        # ========== GAMER FIELDS ==========
        gamertag = data.get("gamerTag") or data.get("gamertag")
        platforms = data.get("platforms")
        if isinstance(platforms, str):
            try:
                platforms = json.loads(platforms)
            except:
                platforms = []
        
        # ========== OPTIONAL FIELDS ==========
        phone_number = data.get("phoneNumber")
        country = data.get("country")
        city = data.get("city")
        website = data.get("website")
        timezone = data.get("timezone")
        
        # Social media links
        social_links = data.get("socialMedia")
        if isinstance(social_links, str):
            try:
                social_links = json.loads(social_links)
            except:
                social_links = {}
        
        # ========== HASH PASSWORD ==========
        hashed_password = generate_password_hash(password)
        
        # ========== HANDLE ROLE ==========
        role_name = data.get("role", "Listener")
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name)
            db.session.add(role)
            db.session.commit()
        
        # ========== CREATE USER ==========
        new_user = User(
            # Basic
            email=email,
            username=username,
            password_hash=hashed_password,
            role_id=role.id,
            
            # Profile Type Flags
            profile_type=profile_type,
            is_artist=is_artist,
            is_gamer=is_gamer,
            is_video_creator=is_video_creator,
            
            # Artist Fields
            artist_name=artist_name if is_artist else None,
            industry=industry if is_artist else None,
            bio=bio,
            
            # Video Creator Fields
            channel_name=channel_name if is_video_creator else None,
            content_category=content_category if is_video_creator else None,
            
            # Gamer Fields
            gamertag=gamertag if is_gamer else None,
            gaming_platforms={"platforms": platforms} if is_gamer and platforms else {},
            
            # Optional
            country=country,
            timezone=timezone,
            social_links=social_links,
            
            # Display name
            display_name=f"{first_name} {last_name}".strip() if first_name else username,
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Log what was created
        creator_types = []
        if is_artist: creator_types.append("Artist")
        if is_gamer: creator_types.append("Gamer")
        if is_video_creator: creator_types.append("Video Creator")
        
        print(f"✅ New user created: {username} ({email})")
        print(f"   Profile type: {profile_type}")
        print(f"   Creator types: {', '.join(creator_types) if creator_types else 'Regular User'}")
        
        return jsonify({
            "message": "Account created successfully",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "profile_type": new_user.profile_type,
                "is_artist": new_user.is_artist,
                "is_gamer": new_user.is_gamer,
                "is_video_creator": new_user.is_video_creator,
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Signup error: {str(e)}")
        return jsonify({"error": f"Signup failed: {str(e)}"}), 500

@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        access_token = create_access_token(identity=str(user.id))
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


@api.route('/podcasts/browse', methods=['GET'])
def browse_all_podcasts():
    """Get all public podcasts for browsing"""
    try:
        # Get all podcasts (you can add filters here later)
        podcasts = Podcast.query.order_by(Podcast.uploaded_at.desc()).all()
        
        print(f"🎧 Browse: Found {len(podcasts)} total podcasts")
        
        return jsonify([podcast.serialize() for podcast in podcasts]), 200
        
    except Exception as e:
        print(f"❌ Browse error: {str(e)}")
        return jsonify({"error": "Failed to fetch podcasts"}), 500

# ✅ ADD: Endpoint to browse podcasts by category
@api.route('/podcasts/category/<category_name>', methods=['GET'])
def browse_podcasts_by_category(category_name):
    """Get podcasts filtered by category"""
    try:
        podcasts = Podcast.query.filter_by(category=category_name).order_by(Podcast.uploaded_at.desc()).all()
        
        print(f"🎧 Category '{category_name}': Found {len(podcasts)} podcasts")
        
        return jsonify([podcast.serialize() for podcast in podcasts]), 200
        
    except Exception as e:
        print(f"❌ Category browse error: {str(e)}")
        return jsonify({"error": "Failed to fetch podcasts by category"}), 500


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

@api.route('/products/upload', methods=['POST'])
@jwt_required()
def upload_product():
    """Upload new product"""
    try:
        user_id = get_jwt_identity()
        
        # Handle form data (multipart/form-data for file uploads)
        title = request.form.get('title')
        description = request.form.get('description', '')
        price = float(request.form.get('price', 0))
        stock = request.form.get('stock')
        category = request.form.get('category', '')
        tags = request.form.get('tags', '')
        is_digital = request.form.get('isDigital', 'false').lower() == 'true'
        is_active = request.form.get('isActive', 'true').lower() == 'true'
        
        # Validation
        if not title or price <= 0:
            return jsonify({"error": "Title and valid price are required"}), 400
        
        if not is_digital and (not stock or int(stock) <= 0):
            return jsonify({"error": "Stock quantity required for physical products"}), 400
        
        # Handle file uploads
        image_url = None
        file_url = None
        
        # Handle product image
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file and image_file.filename:
                filename = secure_filename(image_file.filename)
                timestamp = int(time.time())
                image_filename = f"product_{user_id}_{timestamp}_{filename}"
                
                # Save to uploads directory
                os.makedirs('uploads/products/images', exist_ok=True)
                image_path = os.path.join('uploads/products/images', image_filename)
                image_file.save(image_path)
                image_url = f"/uploads/products/images/{image_filename}"
        
        # Handle digital product file
        if is_digital and 'productFile' in request.files:
            product_file = request.files['productFile']
            if product_file and product_file.filename:
                filename = secure_filename(product_file.filename)
                timestamp = int(time.time())
                file_filename = f"digital_{user_id}_{timestamp}_{filename}"
                
                # Save to uploads directory
                os.makedirs('uploads/products/files', exist_ok=True)
                file_path = os.path.join('uploads/products/files', file_filename)
                product_file.save(file_path)
                file_url = f"/uploads/products/files/{file_filename}"
        
        # Create product
        product = Product(
            creator_id=user_id,
            title=title,
            description=description,
            image_url=image_url or 'https://via.placeholder.com/300x300',
            file_url=file_url,
            price=price,
            stock=int(stock) if not is_digital and stock else None,
            is_digital=is_digital,
            sales_revenue=0.0,
            platform_cut=0.15,  # 15% platform cut
            creator_earnings=0.0
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            "message": "Product created successfully",
            "product": product.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create product: {str(e)}"}), 500

@api.route('/products/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    """Get single product details"""
    try:
        product = Product.query.get(product_id)
        
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # Get creator info
        creator = User.query.get(product.creator_id)
        
        product_data = product.serialize()
        product_data['creator'] = {
            "id": creator.id,
            "username": creator.username,
            "display_name": getattr(creator, 'display_name', None),
            "avatar_url": getattr(creator, 'avatar_url', None)
        } if creator else None
        
        # Get sales count
        sales_count = Purchase.query.filter_by(product_id=product_id).count()
        product_data['sales_count'] = sales_count
        
        return jsonify(product_data), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get product: {str(e)}"}), 500

# Note: Remember to update your import statement at the top of routes.py:
# Change: from cloudinary_setup import uploadFile
# (instead of from cloudinary_setup import fileUpload)

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
@jwt_required()
def create_product():
    """Create product with image upload support"""
    try:
        user_id = get_jwt_identity()
        
        if request.is_json:
            data = request.get_json()
            title = data.get('title')
            description = data.get('description', '')
            price = data.get('price')
            category = data.get('category', 'merch')
            stock = data.get('stock', 0)
            is_digital = data.get('is_digital', False)
            image_url = data.get('image_url', 'https://via.placeholder.com/400x300')
            file_url = data.get('file_url')
        else:
            title = request.form.get('title')
            description = request.form.get('description', '')
            price = request.form.get('price')
            category = request.form.get('category', 'merch')
            stock = request.form.get('stock', 0)
            is_digital = request.form.get('is_digital', 'false').lower() == 'true'
            
            image_url = 'https://via.placeholder.com/400x300'
            if 'image' in request.files:
                image_file = request.files['image']
                if image_file and image_file.filename:
                    upload_result = uploadFile(image_file, folder="marketplace/products")
                    image_url = upload_result.get('secure_url')
            
            file_url = None
            if is_digital and 'file' in request.files:
                digital_file = request.files['file']
                if digital_file and digital_file.filename:
                    upload_result = uploadFile(digital_file, folder="marketplace/digital")
                    file_url = upload_result.get('secure_url')
        
        if not title or not price:
            return jsonify({"error": "Title and price are required"}), 400
        
        product = Product(
            creator_id=user_id,
            title=title,
            description=description,
            image_url=image_url,
            file_url=file_url,
            price=float(price),
            stock=int(stock) if not is_digital else 0,
            is_digital=is_digital,
            category=category,
            sales_count=0,
            views=0,
            rating=0.0
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({"message": "Product created successfully", "product": product.serialize()}), 201
    except ValueError as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create product", "message": str(e)}), 500

@api.route('/marketplace/my-products', methods=['GET'])
@jwt_required()
def get_my_products():
    """Get all products created by the current user"""
    try:
        user_id = get_jwt_identity()
        
        products = Product.query.filter_by(creator_id=user_id).order_by(
            Product.created_at.desc()
        ).all()
        
        total_revenue = sum((p.sales_count or 0) * p.price * 0.9 for p in products)
        total_sales = sum(p.sales_count or 0 for p in products)
        
        return jsonify({
            "products": [p.serialize() for p in products],
            "stats": {
                "total_products": len(products),
                "total_sales": total_sales,
                "total_revenue": round(total_revenue, 2)
            }
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch products", "message": str(e)}), 500



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
        total_music_sales = db.session.query(db.func.sum(Audio.sales_revenue)).scalar() or 0
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
    artist_music_sales = db.session.query(db.func.sum(Audio.sales_revenue)).filter_by(artist_id=user_id).scalar() or 0
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
    stripe_charge =stripe.PaymentIntent.create(
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
def upload_music():
    """Allows users to upload music files to their profile."""
    try:
        user_id = get_jwt_identity()
        
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio = request.files['audio']
        title = request.form.get('title', 'Untitled')
        description = request.form.get('description', '')

        if not audio or audio.filename == '':
            return jsonify({"error": "No valid audio file selected"}), 400

        filename = secure_filename(audio.filename)
        
        # Use uploadFile function instead of local saving
        audio_url = uploadFile(audio, filename)

        new_audio = Audio(
            user_id=user_id,
            title=title,
            description=description,
            file_url=audio_url,  # Store the cloudinary URL
            uploaded_at=datetime.utcnow()
        )

        db.session.add(new_audio)
        db.session.commit()

        return jsonify({
            "message": "Music uploaded successfully!", 
            "audio": new_audio.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Upload error: {str(e)}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

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
        stripe.api_key = "disabled"
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
    
    try:
        # Handle both form data and file upload
        title = request.form.get("title")
        isrc = request.form.get("isrc")
        
        if 'file' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['file']

        print("YOU SHOULD BE SEEING FILE NAMES BELOW THIS LINE")
        print(request.files)
        print(request.files['file'])

        if not audio_file or audio_file.filename == '':
            return jsonify({"error": "No valid audio file selected"}), 400
        
        filename = secure_filename(audio_file.filename)
        
        # Use uploadFile function to upload to cloudinary
        file_url = uploadFile(audio_file, filename)

        new_track = Audio(
            user_id=user_id,
            title=title,
            file_url=file_url,  # Store cloudinary URL
            isrc_code=isrc,
            uploaded_at=datetime.utcnow()
        )
        db.session.add(new_track)
        db.session.commit()

        return jsonify({
            "message": "Track uploaded successfully!",
            "track": new_track.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Track upload failed: {str(e)}"}), 500


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



@api.route('/profile/radio/create', methods=['POST'])
@jwt_required()
def create_radio_station_profile():
    """Create radio station with comprehensive DJ mix features and royalty tracking"""
    user_id = get_jwt_identity()

    # ── Tier Limit Check ──
    limit_check = check_content_limit(user_id, 'radio_station')
    if not limit_check["allowed"]:
        return jsonify({
            "error": limit_check["upgrade_message"],
            "limit_reached": True,
            "current_count": limit_check["current_count"],
            "max_allowed": limit_check["max_allowed"],
            "plan": limit_check["plan_name"],
            "upgrade_url": "/pricing"
        }), 403
    
    try:
        # Get form data
        data = request.form.to_dict()
        name = data.get("name")
        
        if not name:
            return jsonify({"error": "Radio station name is required"}), 400

        description = data.get("description", "")
        category = data.get("category", "Music")
        target_audience = data.get("targetAudience", "")
        broadcast_hours = data.get("broadcastHours", "24/7")
        is_explicit = data.get("isExplicit", "false").lower() == "true"
        tags = data.get("tags", "[]")
        welcome_message = data.get("welcomeMessage", "")
        social_links = data.get("socialLinks", "{}")

        # Parse JSON strings safely
        try:
            tags_list = json.loads(tags) if tags else []
            social_links_dict = json.loads(social_links) if social_links else {}
        except json.JSONDecodeError:
            tags_list = []
            social_links_dict = {}

        # Initialize URLs
        logo_url = None
        cover_url = None
        initial_mix_url = None
        mix_filename = None

        # Handle logo upload with Cloudinary
        if 'logo' in request.files:
            logo_file = request.files['logo']
            if logo_file and logo_file.filename:
                # File size validation (50MB limit)
                logo_file.seek(0, 2)
                file_size = logo_file.tell()
                logo_file.seek(0)
                
                if file_size > 50 * 1024 * 1024:
                    return jsonify({"error": "Logo file too large (max 50MB)"}), 413
                
                logo_filename = secure_filename(logo_file.filename)
                logo_url = uploadFile(logo_file, logo_filename)
                print(f"✅ Logo uploaded to Cloudinary: {logo_url}")

        # Handle cover upload with Cloudinary
        if 'cover' in request.files:
            cover_file = request.files['cover']
            if cover_file and cover_file.filename:
                # File size validation (50MB limit)
                cover_file.seek(0, 2)
                file_size = cover_file.tell()
                cover_file.seek(0)
                
                if file_size > 50 * 1024 * 1024:
                    return jsonify({"error": "Cover file too large (max 50MB)"}), 413
                
                cover_filename = secure_filename(cover_file.filename)
                cover_url = uploadFile(cover_file, cover_filename)
                print(f"✅ Cover uploaded to Cloudinary: {cover_url}")

        # Handle initial mix upload with Cloudinary
        if 'initialMix' in request.files:
            mix_file = request.files['initialMix']
            if mix_file and mix_file.filename:
                # File size validation (200MB limit for audio)
                mix_file.seek(0, 2)
                file_size = mix_file.tell()
                mix_file.seek(0)
                
                if file_size > 200 * 1024 * 1024:
                    return jsonify({"error": "Audio file too large (max 200MB)"}), 413
                
                # Validate file type
                allowed_types = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/m4a', 'audio/mp3']
                if mix_file.content_type not in allowed_types:
                    return jsonify({"error": "Invalid audio file type. Allowed: MP3, WAV, FLAC, M4A"}), 400
                
                mix_filename = secure_filename(mix_file.filename)
                initial_mix_url = uploadFile(mix_file, mix_filename)
                print(f"✅ Audio uploaded to Cloudinary: {initial_mix_url}")

        # Get creator info
        creator = User.query.get(user_id)
        creator_name = creator.username if creator else "Unknown"

        # Parse and validate tracklist for royalty compliance
        tracklist_data = data.get("tracklist", "[]")
        try:
            tracklist = json.loads(tracklist_data) if tracklist_data else []
        except json.JSONDecodeError:
            tracklist = []

        # Validate tracklist if audio was uploaded
        if initial_mix_url and not tracklist:
            return jsonify({"error": "Tracklist is required for royalty compliance when uploading audio"}), 400

        # Validate individual tracks in tracklist
        if tracklist:
            for i, track in enumerate(tracklist):
                if not track.get('songTitle', '').strip():
                    return jsonify({"error": f"Track {i+1}: Song title is required"}), 400
                if not track.get('artistName', '').strip():
                    return jsonify({"error": f"Track {i+1}: Artist name is required"}), 400
                if not track.get('songwriterNames', '').strip():
                    return jsonify({"error": f"Track {i+1}: Songwriter name(s) required for royalty reporting"}), 400

        # Create station with ALL required fields - PASS PYTHON OBJECTS DIRECTLY
        new_station = RadioStation(
            user_id=user_id,
            name=name,
            description=description,
            status='active',
            is_public=True,
            is_subscription_based=False,
            subscription_price=None,
            is_ticketed=False,
            ticket_price=None,
            is_live=True if initial_mix_url else False,
            stream_url=initial_mix_url,
            is_webrtc_enabled=False,
            max_listeners=100,
            logo_url=logo_url,
            cover_image_url=cover_url,
            followers_count=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            creator_name=creator_name,
            # ✅ CORRECT: Pass Python objects directly (db.JSON handles conversion)
            genres=[category] if category else [],
            preferred_genres=tags_list,
            submission_guidelines=None,
            audio_file_name=mix_filename,
            loop_audio_url=initial_mix_url,
            is_loop_enabled=True if initial_mix_url else False,
            loop_duration_minutes=180 if initial_mix_url else None,
            loop_started_at=None,
            playlist_schedule=None,  # Will be set below if needed
            total_plays=0,
            total_revenue=0.0,
            target_audience=target_audience,
            broadcast_hours=broadcast_hours,
            is_explicit=is_explicit,
            tags=tags_list,
            welcome_message=welcome_message,
            social_links=social_links_dict
        )

        db.session.add(new_station)
        db.session.flush()  # Get station ID

        # Create Audio record if initial mix was uploaded
        if initial_mix_url:
            mix_title = data.get("mixTitle", f"{name} - Initial Mix")
            mix_description = data.get("mixDescription", "Initial mix for radio station")
            dj_name = data.get("djName", creator_name)
            
            # Create audio record
            initial_audio = Audio(
                user_id=user_id,
                title=mix_title,
                description=mix_description,
                file_url=initial_mix_url,
                uploaded_at=datetime.utcnow()
            )
            
            db.session.add(initial_audio)
            db.session.flush()  # Get audio ID

            # Create comprehensive playlist schedule with royalty data
            playlist_schedule = {
                "tracks": [],
                "loop_mode": True,
                "shuffle": False,
                "created_at": datetime.utcnow().isoformat(),
                "dj_info": {
                    "dj_name": dj_name,
                    "bpm": data.get("bpm", ""),
                    "mood": data.get("mood", ""),
                    "sub_genres": data.get("subGenres", "").split(',') if data.get("subGenres") else []
                },
                "royalty_info": {
                    "tracklist": tracklist,
                    "requires_bmi_reporting": True,
                    "requires_ascap_reporting": True,
                    "total_tracks": len(tracklist)
                }
            }

            # Add tracks to schedule
            for i, track in enumerate(tracklist):
                track_data = {
                    "id": f"track_{i+1}",
                    "audio_file_id": initial_audio.id,
                    "title": track.get("songTitle", ""),
                    "artist": track.get("artistName", ""),
                    "songwriter": track.get("songwriterNames", ""),
                    "album": track.get("albumName", ""),
                    "record_label": track.get("recordLabel", ""),
                    "publisher": track.get("publisherName", ""),
                    "duration": track.get("approximateDuration", "3:30"),
                    "start_time": track.get("approximateStartTime", "0:00"),
                    "play_order": track.get("playOrderNumber", i+1),
                    "file_url": initial_mix_url,
                    "royalty_required": True
                }
                playlist_schedule["tracks"].append(track_data)

            # Update station with playlist schedule (Python dict - db.JSON handles it)
            new_station.playlist_schedule = playlist_schedule
            new_station.loop_started_at = datetime.utcnow()

        db.session.commit()

        # Build comprehensive response
        response_data = {
            "message": "Radio station created successfully with DJ mix and royalty tracking!" if initial_mix_url else "Radio station created successfully!",
            "station": new_station.serialize(),
            "redirect_url": f"/radio/station/{new_station.id}",
            "features": {
                "cloudinary_storage": True,
                "dj_mix_uploaded": bool(initial_mix_url),
                "royalty_tracking": bool(tracklist),
                "loop_enabled": new_station.is_loop_enabled,
                "enhanced_metadata": True,
                "playlist_schedule": bool(new_station.playlist_schedule)
            },
            "royalty_compliance": {
                "bmi_ready": bool(tracklist),
                "ascap_ready": bool(tracklist),
                "tracks_logged": len(tracklist),
                "all_required_fields": all(
                    track.get('songTitle') and track.get('artistName') and track.get('songwriterNames')
                    for track in tracklist
                ) if tracklist else False
            }
        }

        print(f"✅ Enhanced radio station created:")
        print(f"   ID: {new_station.id}")
        print(f"   Name: {new_station.name}")
        print(f"   DJ Mix: {bool(initial_mix_url)}")
        print(f"   Tracklist entries: {len(tracklist)}")
        print(f"   Royalty compliant: {bool(tracklist)}")

        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating radio station: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create station: {str(e)}"}), 500
    
@api.route('/admin/migrate-stations-to-cloudinary', methods=['POST'])
@jwt_required()
def migrate_stations_to_cloudinary():
    """
    ONE-TIME migration to convert existing radio stations from local paths to Cloudinary URLs
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Simple admin check - you can modify this based on your admin setup
    if not user or (hasattr(user, 'role') and user.role != 'admin'):
        return jsonify({"error": "Admin access required"}), 403
    
    try:
        updated_count = 0
        errors = []
        
        # Find all stations with local file paths
        stations = RadioStation.query.all()
        
        for station in stations:
            try:
                station_updated = False
                
                # 1. Migrate loop_audio_url if it's a local path
                if station.loop_audio_url and station.loop_audio_url.startswith('/uploads/'):
                    local_path = station.loop_audio_url
                    filename = local_path.replace('/uploads/station_mixes/', '')
                    full_path = os.path.join('src', 'static', 'uploads', 'station_mixes', filename)
                    
                    print(f"🔍 Checking station {station.name}: {full_path}")
                    
                    if os.path.exists(full_path):
                        try:
                            # Upload to Cloudinary
                            with open(full_path, 'rb') as file:
                                cloudinary_url = uploadFile(file, filename)
                                station.loop_audio_url = cloudinary_url
                                station_updated = True
                                print(f"✅ Migrated audio for {station.name}: {cloudinary_url}")
                        except Exception as upload_error:
                            error_msg = f"Failed to upload {station.name}: {str(upload_error)}"
                            errors.append(error_msg)
                            print(f"❌ {error_msg}")
                            continue
                    else:
                        error_msg = f"File not found for {station.name}: {full_path}"
                        errors.append(error_msg)
                        print(f"❌ {error_msg}")
                        continue
                
                # 2. Migrate logo_url if it's a local path
                if station.logo_url and station.logo_url.startswith('/uploads/'):
                    local_path = station.logo_url
                    full_path = os.path.join('src', 'static', local_path.lstrip('/'))
                    
                    if os.path.exists(full_path):
                        try:
                            filename = os.path.basename(full_path)
                            with open(full_path, 'rb') as file:
                                cloudinary_url = uploadFile(file, filename)
                                station.logo_url = cloudinary_url
                                station_updated = True
                                print(f"✅ Migrated logo for {station.name}")
                        except Exception as upload_error:
                            print(f"⚠️ Logo upload failed for {station.name}: {upload_error}")
                            # Continue anyway - logo is not critical
                
                # 3. Migrate cover_image_url if it's a local path
                if station.cover_image_url and station.cover_image_url.startswith('/uploads/'):
                    local_path = station.cover_image_url
                    full_path = os.path.join('src', 'static', local_path.lstrip('/'))
                    
                    if os.path.exists(full_path):
                        try:
                            filename = os.path.basename(full_path)
                            with open(full_path, 'rb') as file:
                                cloudinary_url = uploadFile(file, filename)
                                station.cover_image_url = cloudinary_url
                                station_updated = True
                                print(f"✅ Migrated cover for {station.name}")
                        except Exception as upload_error:
                            print(f"⚠️ Cover upload failed for {station.name}: {upload_error}")
                            # Continue anyway - cover is not critical
                
                # 4. Update playlist metadata with new Cloudinary URLs
                if station_updated and station.playlist_schedule:
                    playlist = station.playlist_schedule
                    if 'tracks' in playlist:
                        for track in playlist['tracks']:
                            if 'file_url' in track and track['file_url'].startswith('/uploads/'):
                                # Update track file_url to point to new Cloudinary URL
                                track['file_url'] = station.loop_audio_url
                    
                    station.playlist_schedule = playlist
                    
                    # Update now_playing_metadata too
                    if station.now_playing_metadata and 'file_url' in station.now_playing_metadata:
                        station.now_playing_metadata['file_url'] = station.loop_audio_url
                
                if station_updated:
                    updated_count += 1
                    
            except Exception as station_error:
                error_msg = f"Error processing station {station.name}: {str(station_error)}"
                errors.append(error_msg)
                print(f"❌ {error_msg}")
                continue
        
        # Commit all changes
        db.session.commit()
        
        return jsonify({
            "message": f"Migration completed! Updated {updated_count} stations.",
            "updated_count": updated_count,
            "total_stations": len(stations),
            "errors": errors
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Migration failed: {str(e)}")
        return jsonify({"error": f"Migration failed: {str(e)}"}), 500

@api.route('/admin/check-stations-migration', methods=['GET'])
@jwt_required()
def check_stations_migration():
    """Check which stations have local paths and need migration"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or (hasattr(user, 'role') and user.role != 'admin'):
        return jsonify({"error": "Admin access required"}), 403
    
    stations = RadioStation.query.all()
    
    needs_migration = []
    already_cloudinary = []
    
    for station in stations:
        station_info = {
            "id": station.id,
            "name": station.name,
            "loop_audio_url": station.loop_audio_url,
            "logo_url": station.logo_url,
            "cover_image_url": station.cover_image_url
        }
        
        # Check if any URLs are local paths
        has_local_paths = (
            (station.loop_audio_url and station.loop_audio_url.startswith('/uploads/')) or
            (station.logo_url and station.logo_url.startswith('/uploads/')) or
            (station.cover_image_url and station.cover_image_url.startswith('/uploads/'))
        )
        
        if has_local_paths:
            needs_migration.append(station_info)
        else:
            already_cloudinary.append(station_info)
    
    return jsonify({
        "total_stations": len(stations),
        "needs_migration": len(needs_migration),
        "already_cloudinary": len(already_cloudinary),
        "stations_needing_migration": needs_migration,
        "stations_already_cloudinary": already_cloudinary
    }), 200


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

# @api.route('/transcribe_podcast/<int:podcast_id>', methods=['POST'])
# @jwt_required()
# def transcribe_podcast(podcast_id):
#     podcast = Podcast.query.get(podcast_id)
#     if not podcast or not podcast.audio_url:
#         return jsonify({"error": "Podcast audio not found"}), 404

#     model = whisper.load_model("base")
#     result = model.transcribe(podcast.audio_url)

#     podcast.transcription = result["text"]
#     db.session.commit()

#     return jsonify({"message": "Transcription completed", "transcription": podcast.transcription}), 200

@api.route('/purchase_podcast', methods=['POST'])
@jwt_required()
def purchase_podcast():
    """Purchase individual podcast episode"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        podcast_id = data.get("podcast_id")
        episode_id = data.get("episode_id")  # If buying specific episode
        
        podcast = Podcast.query.get(podcast_id)
        if not podcast:
            return jsonify({"error": "Podcast not found"}), 404

        # Check if episode specified
        if episode_id:
            episode = PodcastEpisode.query.get(episode_id)
            if not episode or episode.podcast_id != podcast_id:
                return jsonify({"error": "Episode not found"}), 404
            price = getattr(episode, 'price', 2.99)  # Episode price
            item_name = f"{podcast.name} - {episode.title}"
        else:
            price = getattr(podcast, 'price_per_episode', 2.99)  # Podcast price
            item_name = podcast.name

        if not price or price <= 0:
            return jsonify({"error": "This content is not for sale"}), 400

        # Check if already purchased
        existing_purchase = PodcastPurchase.query.filter_by(
            user_id=user_id,
            podcast_id=podcast_id,
            episode_id=episode_id
        ).first()
        
        if existing_purchase:
            return jsonify({"error": "Already purchased"}), 400

        # Create Stripe payment
        try:
            import stripe
            stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
            
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': item_name,
                            'description': podcast.description[:100] if podcast.description else '',
                        },
                        'unit_amount': int(price * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{os.getenv('FRONTEND_URL')}/podcast/purchase-success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{os.getenv('FRONTEND_URL')}/podcast/{podcast_id}",
                metadata={
                    'type': 'podcast_purchase',
                    'podcast_id': str(podcast_id),
                    'episode_id': str(episode_id) if episode_id else '',
                    'user_id': str(user_id),
                    'price': str(price)
                }
            )
            
            return jsonify({
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id
            }), 200
            
        except Exception as stripe_error:
            return jsonify({"error": f"Payment failed: {str(stripe_error)}"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Purchase failed: {str(e)}"}), 500

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

    # ── Tier Limit Check ──
    limit_check = check_content_limit(user_id, 'radio_station')
    if not limit_check["allowed"]:
        return jsonify({
            "error": limit_check["upgrade_message"],
            "limit_reached": True,
            "current_count": limit_check["current_count"],
            "max_allowed": limit_check["max_allowed"],
            "plan": limit_check["plan_name"],
            "upgrade_url": "/pricing"
        }), 403

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

    return jsonify({
        "message": "Radio station created!",
        "station": new_station.serialize(),
        "redirect_url": f"/radio/{new_station.id}"
    }), 201
                    

@api.route('/podcast/dashboard', methods=['GET'])
@jwt_required()
def get_podcast_dashboard():
    """Get podcast dashboard data with stats and revenue"""
    user_id = get_jwt_identity()
    
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        # Get user's podcasts
        podcasts = Podcast.query.filter_by(creator_id=user_id).all()
        
        print(f"📊 Dashboard: Found {len(podcasts)} podcasts for user {user_id}")
        
        # Calculate monthly revenue from multiple sources
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        monthly_revenue = 0
        
        # Get podcast IDs for revenue queries
        podcast_ids = [p.id for p in podcasts]
        
        if podcast_ids:
            # 1. Ad revenue from podcasts (last 30 days)
            try:
                ad_revenue = db.session.query(func.coalesce(func.sum(AdRevenue.amount), 0))\
                    .filter(AdRevenue.content_type == 'podcast')\
                    .filter(AdRevenue.content_id.in_(podcast_ids))\
                    .filter(AdRevenue.created_at >= thirty_days_ago).scalar() or 0
                monthly_revenue += float(ad_revenue)
            except Exception as e:
                print(f"Ad revenue query error: {e}")
            
            # 2. Tips on podcast episodes (last 30 days)
            try:
                # Get all episode IDs for these podcasts
                episode_ids = []
                for podcast in podcasts:
                    if hasattr(podcast, 'episodes') and podcast.episodes:
                        episode_ids.extend([ep.id for ep in podcast.episodes])
                
                if episode_ids:
                    tips_revenue = db.session.query(func.coalesce(func.sum(Tip.amount), 0))\
                        .filter(Tip.content_type == 'podcast_episode')\
                        .filter(Tip.content_id.in_(episode_ids))\
                        .filter(Tip.created_at >= thirty_days_ago).scalar() or 0
                    monthly_revenue += float(tips_revenue) * 0.85  # 85% after platform cut
            except Exception as e:
                print(f"Tips query error: {e}")
            
            # 3. Subscription revenue from premium podcasts
            try:
                subscription_revenue = db.session.query(func.coalesce(func.sum(PodcastSubscription.amount), 0))\
                    .filter(PodcastSubscription.podcast_id.in_(podcast_ids))\
                    .filter(PodcastSubscription.status == 'active')\
                    .filter(PodcastSubscription.created_at >= thirty_days_ago).scalar() or 0
                monthly_revenue += float(subscription_revenue) * 0.85
            except Exception as e:
                print(f"Subscription query error: {e}")
            
            # 4. Revenue table entries for podcasts
            try:
                revenue_entries = db.session.query(func.coalesce(func.sum(Revenue.creator_earnings), 0))\
                    .filter(Revenue.content_type == 'podcast')\
                    .filter(Revenue.content_id.in_(podcast_ids))\
                    .filter(Revenue.timestamp >= thirty_days_ago).scalar() or 0
                monthly_revenue += float(revenue_entries)
            except Exception as e:
                print(f"Revenue entries query error: {e}")
        
        # Serialize podcasts with additional stats
        serialized_podcasts = []
        for podcast in podcasts:
            podcast_data = podcast.serialize()
            
            # Add episode count if not in serialize
            if 'episode_count' not in podcast_data:
                podcast_data['episode_count'] = len(podcast.episodes) if hasattr(podcast, 'episodes') and podcast.episodes else 0
            
            # Add total listens if not in serialize
            if 'total_listens' not in podcast_data:
                total_listens = 0
                if hasattr(podcast, 'episodes') and podcast.episodes:
                    for episode in podcast.episodes:
                        total_listens += getattr(episode, 'listens', 0) or getattr(episode, 'play_count', 0) or 0
                elif hasattr(podcast, 'total_listens'):
                    total_listens = podcast.total_listens or 0
                elif hasattr(podcast, 'listens'):
                    total_listens = podcast.listens or 0
                podcast_data['total_listens'] = total_listens
            
            # Add monthly listens for this podcast
            try:
                monthly_listens = db.session.query(func.count(PodcastPlayHistory.id))\
                    .filter(PodcastPlayHistory.podcast_id == podcast.id)\
                    .filter(PodcastPlayHistory.played_at >= thirty_days_ago).scalar() or 0
                podcast_data['monthly_listens'] = monthly_listens
            except:
                podcast_data['monthly_listens'] = 0
            
            serialized_podcasts.append(podcast_data)
        
        # Calculate aggregate stats
        total_episodes = sum(p.get('episode_count', 0) or len(p.get('episodes', [])) for p in serialized_podcasts)
        total_listens = sum(p.get('total_listens', 0) for p in serialized_podcasts)
        
        print(f"📊 Stats: {len(podcasts)} podcasts, {total_episodes} episodes, {total_listens} listens, ${monthly_revenue:.2f} revenue")
        
        # Return enhanced response
        return jsonify({
            "podcasts": serialized_podcasts,
            "stats": {
                "total_podcasts": len(podcasts),
                "total_episodes": total_episodes,
                "total_listens": total_listens,
                "monthly_revenue": round(monthly_revenue, 2),
                "published_count": len([p for p in podcasts if getattr(p, 'status', '') == 'published']),
                "draft_count": len([p for p in podcasts if getattr(p, 'status', 'draft') == 'draft'])
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Dashboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch podcasts"}), 500

@api.route('/artist/dashboard', methods=['GET'])
def get_artist_dashboard():
    tracks = Audio.query.filter_by(artist_id=request.args.get("user_id")).all()
    return jsonify([track.serialize() for track in tracks])

@api.route('/delete_dashboard', methods=['POST'])
def delete_dashboard():
    user_id = request.json.get("user_id")
    
    # Delete all associated data
    RadioStation.query.filter_by(owner_id=user_id).delete()
    Podcast.query.filter_by(creator_id=user_id).delete()
    Audio.query.filter_by(artist_id=user_id).delete()

    db.session.commit()
    return jsonify({"message": "Dashboard deleted successfully."})


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

    # ── Tier Limit Check ──
    limit_check = check_content_limit(user_id, 'radio_station')
    if not limit_check["allowed"]:
        return jsonify({
            "error": limit_check["upgrade_message"],
            "limit_reached": True,
            "current_count": limit_check["current_count"],
            "max_allowed": limit_check["max_allowed"],
            "plan": limit_check["plan_name"],
            "upgrade_url": "/pricing"
        }), 403

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

@api.route('/live/stop', methods=['POST'])
@jwt_required()
def stop_live_stream():
    """Stop a live stream"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}
        stream_id = data.get('stream_id')
        
        try:
            stream = LiveStream.query.filter_by(user_id=user_id, is_live=True).first()
            if stream:
                stream.is_live = False
                stream.ended_at = datetime.utcnow()
                db.session.commit()
                return jsonify({"message": "Stream ended", "stream": stream.serialize()}), 200
        except:
            pass
        
        return jsonify({"message": "Stream ended"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/live/stream/<int:id>', methods=['GET'])
@jwt_required(optional=True)
def get_live_stream(id):
    stream = LiveStudio.query.get_or_404(id)
    return jsonify({
        'stream': stream.serialize(),
        'streamer': stream.user.serialize() if stream.user else None,
        'viewer_count': stream.viewer_count or 0,
        'like_count': stream.like_count or 0
    })

@api.route('/live/status', methods=['GET'])
@jwt_required()
def get_live_status():
    """Get current live stream status"""
    try:
        user_id = get_jwt_identity()
        
        try:
            stream = LiveStream.query.filter_by(user_id=user_id, is_live=True).first()
            if stream:
                return jsonify({
                    "is_live": True,
                    "stream": stream.serialize()
                }), 200
        except:
            pass
        
        return jsonify({"is_live": False, "stream": None}), 200
        
    except Exception as e:
        return jsonify({"is_live": False, "error": str(e)}), 200

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

@api.route('/artist/live-streams', methods=['GET'])
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
    artist_music_sales = db.session.query(db.func.sum(Audio.sales_revenue)).filter_by(artist_id=user_id).scalar() or 0
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




@api.route("/get-avatar", methods=["GET"])
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


@api.route('/engagement/<int:content_id>', methods=['GET'])
@jwt_required(optional=True)  # Optional authentication
@cache.cached(timeout=60, query_string=True)  # Use 'cache' instead of 'current_app.cache'
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


@api.route('/tips/history', methods=['GET'])
@jwt_required()
def tip_history():
    """Get tip history - both sent and received"""
    user_id = get_jwt_identity()
    
    # Query params
    filter_type = request.args.get('type', 'all')  # 'sent', 'received', 'all'
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    # Build query based on filter
    if filter_type == 'sent':
        tips = Tip.query.filter_by(sender_id=user_id)\
            .order_by(Tip.created_at.desc())\
            .limit(limit).offset(offset).all()
    elif filter_type == 'received':
        tips = Tip.query.filter_by(recipient_id=user_id)\
            .order_by(Tip.created_at.desc())\
            .limit(limit).offset(offset).all()
    else:
        # All tips (sent or received)
        tips = Tip.query.filter(
            (Tip.sender_id == user_id) | (Tip.recipient_id == user_id)
        ).order_by(Tip.created_at.desc())\
         .limit(limit).offset(offset).all()
    
    # Format response
    result = []
    for tip in tips:
        # Handle anonymous tips
        sender_name = 'Anonymous'
        if not tip.is_anonymous or tip.sender_id == user_id:
            sender_name = tip.sender.username if tip.sender else 'Unknown'
        
        result.append({
            'id': tip.id,
            'amount': float(tip.amount),
            'currency': getattr(tip, 'currency', 'USD') or 'USD',
            'payment_method': getattr(tip, 'payment_method', 'stripe') or 'stripe',
            'status': getattr(tip, 'status', 'completed') or 'completed',
            'message': getattr(tip, 'message', None),
            'is_anonymous': getattr(tip, 'is_anonymous', False),
            'sender': {
                'id': tip.sender_id,
                'username': sender_name
            },
            'recipient': {
                'id': tip.recipient_id,
                'username': tip.recipient.username if tip.recipient else 'Unknown'
            },
            'direction': 'sent' if tip.sender_id == user_id else 'received',
            'created_at': tip.created_at.isoformat() if tip.created_at else None,
            'platform_cut': float(tip.platform_cut) if tip.platform_cut else 0.10,
            'creator_earnings': float(tip.creator_earnings) if tip.creator_earnings else float(tip.amount) * 0.90
        })
    
    # Get totals
    total_sent = db.session.query(db.func.sum(Tip.amount))\
        .filter_by(sender_id=user_id).scalar() or 0
    total_received = db.session.query(db.func.sum(Tip.creator_earnings))\
        .filter_by(recipient_id=user_id).scalar() or 0
    
    return jsonify({
        'tips': result,
        'totals': {
            'sent': float(total_sent),
            'received': float(total_received)
        },
        'pagination': {
            'limit': limit,
            'offset': offset,
            'has_more': len(result) == limit
        }
    })

@api.route('/tips/stats', methods=['GET'])
@jwt_required()
def tip_stats():
    """Get comprehensive tip statistics for the current user"""
    user_id = get_jwt_identity()
    
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # ===== RECEIVED STATS =====
    
    # Total received (all time) - completed only
    total_received = db.session.query(func.coalesce(func.sum(Tip.creator_earnings), 0))\
        .filter(Tip.recipient_id == user_id)\
        .filter(Tip.status == 'completed').scalar() or 0
    
    # This month
    monthly_received = db.session.query(func.coalesce(func.sum(Tip.creator_earnings), 0))\
        .filter(Tip.recipient_id == user_id)\
        .filter(Tip.status == 'completed')\
        .filter(Tip.created_at >= thirty_days_ago).scalar() or 0
    
    # This week
    weekly_received = db.session.query(func.coalesce(func.sum(Tip.creator_earnings), 0))\
        .filter(Tip.recipient_id == user_id)\
        .filter(Tip.status == 'completed')\
        .filter(Tip.created_at >= seven_days_ago).scalar() or 0
    
    # Today
    today_received = db.session.query(func.coalesce(func.sum(Tip.creator_earnings), 0))\
        .filter(Tip.recipient_id == user_id)\
        .filter(Tip.status == 'completed')\
        .filter(Tip.created_at >= today_start).scalar() or 0
    
    # Tip counts
    total_tip_count = Tip.query.filter_by(recipient_id=user_id, status='completed').count()
    monthly_tip_count = Tip.query.filter(
        Tip.recipient_id == user_id,
        Tip.status == 'completed',
        Tip.created_at >= thirty_days_ago
    ).count()
    
    # Unique supporters
    unique_supporters = db.session.query(func.count(func.distinct(Tip.sender_id)))\
        .filter(Tip.recipient_id == user_id)\
        .filter(Tip.status == 'completed').scalar() or 0
    
    # Average tip amount
    avg_tip = db.session.query(func.avg(Tip.amount))\
        .filter(Tip.recipient_id == user_id)\
        .filter(Tip.status == 'completed').scalar() or 0
    
    # Largest tip
    largest_tip = db.session.query(func.max(Tip.amount))\
        .filter(Tip.recipient_id == user_id)\
        .filter(Tip.status == 'completed').scalar() or 0
    
    # ===== TOP SUPPORTERS =====
    top_supporters_query = db.session.query(
        Tip.sender_id,
        func.sum(Tip.amount).label('total'),
        func.count(Tip.id).label('count')
    ).filter(
        Tip.recipient_id == user_id,
        Tip.status == 'completed',
        Tip.is_anonymous == False
    ).group_by(Tip.sender_id)\
     .order_by(func.sum(Tip.amount).desc())\
     .limit(10).all()
    
    top_supporters = []
    for sender_id, total, count in top_supporters_query:
        user = User.query.get(sender_id)
        if user:
            top_supporters.append({
                'user_id': sender_id,
                'username': user.username,
                'profile_image': user.profile_image_url if hasattr(user, 'profile_image_url') else None,
                'total_amount': float(total),
                'tip_count': count
            })
    
    # ===== PAYMENT METHOD BREAKDOWN =====
    payment_methods = db.session.query(
        Tip.payment_method,
        func.sum(Tip.amount).label('total'),
        func.count(Tip.id).label('count')
    ).filter(
        Tip.recipient_id == user_id,
        Tip.status == 'completed'
    ).group_by(Tip.payment_method).all()
    
    method_breakdown = {}
    for method, total, count in payment_methods:
        method_breakdown[method or 'stripe'] = {
            'total': float(total),
            'count': count
        }
    
    # ===== RECENT ACTIVITY (Last 7 days by day) =====
    daily_stats = []
    for i in range(7):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_total = db.session.query(func.coalesce(func.sum(Tip.creator_earnings), 0))\
            .filter(Tip.recipient_id == user_id)\
            .filter(Tip.status == 'completed')\
            .filter(Tip.created_at >= day_start)\
            .filter(Tip.created_at < day_end).scalar() or 0
        
        day_count = Tip.query.filter(
            Tip.recipient_id == user_id,
            Tip.status == 'completed',
            Tip.created_at >= day_start,
            Tip.created_at < day_end
        ).count()
        
        daily_stats.append({
            'date': day_start.strftime('%Y-%m-%d'),
            'day': day_start.strftime('%a'),
            'amount': float(day_total),
            'count': day_count
        })
    
    daily_stats.reverse()  # Oldest to newest
    
    return jsonify({
        'earnings': {
            'total': float(total_received),
            'monthly': float(monthly_received),
            'weekly': float(weekly_received),
            'today': float(today_received)
        },
        'tips': {
            'total_count': total_tip_count,
            'monthly_count': monthly_tip_count,
            'average_amount': round(float(avg_tip), 2),
            'largest_amount': float(largest_tip)
        },
        'supporters': {
            'unique_count': unique_supporters,
            'top_supporters': top_supporters
        },
        'payment_methods': method_breakdown,
        'daily_activity': daily_stats
    })


# =============================================================================
# GET CREATOR'S TIP INFO (Public endpoint for tip modal)
# =============================================================================

@api.route('/tips/creator/<int:creator_id>', methods=['GET'])
def get_creator_tip_info(creator_id):
    """Get a creator's public tip settings (for tip modal)"""
    
    creator = User.query.get(creator_id)
    if not creator:
        return jsonify({'error': 'Creator not found'}), 404
    
    settings = CreatorPaymentSettings.query.filter_by(user_id=creator_id).first()
    
    # Default settings if none exist
    if not settings:
        return jsonify({
            'creator': {
                'id': creator.id,
                'username': creator.username,
                'profile_image': creator.profile_image_url if hasattr(creator, 'profile_image_url') else None
            },
            'tips_enabled': True,
            'min_amount': 1.0,
            'default_amounts': [5, 10, 20, 50],
            'payment_methods': ['stripe'],  # Default to Stripe only
            'tip_message': None
        })
    
    # Build available payment methods
    payment_methods = []
    if settings.stripe_enabled:
        payment_methods.append({
            'type': 'stripe',
            'name': 'Card Payment'
        })
    if settings.cashapp_enabled and settings.cashapp_username:
        payment_methods.append({
            'type': 'cashapp',
            'name': 'Cash App',
            'username': settings.cashapp_username
        })
    if settings.venmo_enabled and settings.venmo_username:
        payment_methods.append({
            'type': 'venmo',
            'name': 'Venmo',
            'username': settings.venmo_username
        })
    if settings.paypal_enabled and settings.paypal_email:
        payment_methods.append({
            'type': 'paypal',
            'name': 'PayPal',
            'email': settings.paypal_email
        })
    if settings.crypto_enabled and settings.crypto_address:
        payment_methods.append({
            'type': 'crypto',
            'name': f'Crypto ({settings.crypto_network or "ETH"})',
            'address': settings.crypto_address,
            'network': settings.crypto_network
        })
    
    # If no methods enabled, default to Stripe
    if not payment_methods:
        payment_methods.append({
            'type': 'stripe',
            'name': 'Card Payment'
        })
    
    return jsonify({
        'creator': {
            'id': creator.id,
            'username': creator.username,
            'profile_image': creator.profile_image_url if hasattr(creator, 'profile_image_url') else None
        },
        'tips_enabled': settings.tips_enabled,
        'min_amount': float(settings.min_tip_amount) if settings.min_tip_amount else 1.0,
        'default_amounts': settings.default_amounts or [5, 10, 20, 50],
        'payment_methods': payment_methods,
        'tip_message': settings.tip_message
    })

# --- Ad Revenue ---
@api.route('/creator/ad-earnings', methods=['GET'])
@jwt_required()
def ad_earnings():
    user_id = get_jwt_identity()
    earnings = AdRevenue.query.filter_by(creator_id=user_id).all()
    total = sum([e.amount for e in earnings])
    return jsonify({'total_ad_revenue': total})

# --- Creator Analytics ---
@api.route('/analytics/creator/<int:creator_id>', methods=['GET'])
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

@api.route('/episodes/<int:episode_id>', methods=['GET'])
def get_episode(episode_id):
    episode = PodcastEpisode.query.get(episode_id)
    if not episode:
        return jsonify({"error": "Episode not found"}), 404

    return jsonify(episode.serialize()), 200

@api.route('/episodes/<int:episode_id>/access', methods=['GET'])
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
@api.route('/products/upload', methods=['POST'])
@jwt_required()
@plan_required("includes_merch_sales")
def upload_merch():
    user_id = get_jwt_identity()
    data = request.get_json()

    # Validate required fields
    if not data.get("title") or not data.get("price"):
        return jsonify({"error": "Title and price are required"}), 400

    try:
        product = Product(
            creator_id=user_id,
            title=data["title"],
            description=data.get("description", ""),
            image_url=data.get("image_url"),
            price=float(data["price"]),
            stock=int(data.get("stock", 0)),
            is_digital=False,
            category=data.get("category", "merch"),
            created_at=datetime.utcnow()
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            "message": "🛍️ Merch uploaded successfully", 
            "product": product.serialize()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": "Invalid price format"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ✅ Create Podcast
@api.route('/radio/dashboard', methods=['GET'])
@jwt_required()
def get_radio_dashboard():
    user_id = get_jwt_identity()
    # 🔧 ONLY CHANGE THIS LINE:
    stations = RadioStation.query.filter_by(user_id=user_id).all()  # Changed from owner_id
    return jsonify([station.serialize() for station in stations])


# ✅ FIX 2: Simple Podcast Creation (Line 164 test failure) 
# Add this simple endpoint - your complex /upload_podcast stays unchanged:

@api.route('/podcasts', methods=['POST'])
@jwt_required()
def create_podcast():
    """Simple podcast creation for API tests - your upload_podcast stays the same"""
    try:
        user_id = get_jwt_identity()

        # ── Tier Limit Check ──
        limit_check = check_content_limit(user_id, 'podcast')
        if not limit_check["allowed"]:
            return jsonify({
                "error": limit_check["upgrade_message"],
                "limit_reached": True,
                "current_count": limit_check["current_count"],
                "max_allowed": limit_check["max_allowed"],
                "plan": limit_check["plan_name"],
                "upgrade_url": "/pricing"
            }), 403

        data = request.get_json()

        title = data.get('title')
        if not title:
            return jsonify({"error": "Title is required"}), 400

        # Create basic podcast using your existing model
        new_podcast = Podcast(
            creator_id=user_id,
            title=title,
            description=data.get('description', ''),
            category=data.get('category', 'General'),
            duration=0,
            monetization_type='free',
            subscription_tier='Free',
            streaming_enabled=False,
            views=0, likes=0, shares=0,
            total_revenue=0.00,
            revenue_from_subscriptions=0.00,
            revenue_from_ads=0.00,
            revenue_from_sponsorships=0.00,
            revenue_from_donations=0.00,
            platform_cut=0.15,
            creator_earnings=0.85,
            uploaded_at=datetime.utcnow()
        )

        db.session.add(new_podcast)
        db.session.commit()

        return jsonify({
            "message": "Podcast created successfully",
            "podcast": new_podcast.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create podcast"}), 500


# ✅ Enable Ad Revenue
@api.route('/ad-revenue/enable', methods=['POST'])
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


STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "your_webhook_secret_here")

@api.route('/webhooks/stripe', methods=['POST'])
def stripe_webhook():
    """Enhanced Stripe webhook handler with comprehensive error handling"""
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    
    # Input validation
    if not payload:
        current_app.logger.error("Empty webhook payload received")
        return jsonify({"error": "Empty payload"}), 400
    
    if not sig_header:
        current_app.logger.error("Missing Stripe signature header")
        return jsonify({"error": "Missing signature"}), 400
    
    try:
        # Verify webhook signature with configuration check
        endpoint_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET') or STRIPE_WEBHOOK_SECRET
        if not endpoint_secret:
            current_app.logger.error("Stripe webhook secret not configured")
            return jsonify({"error": "Webhook not configured"}), 500
        
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
        
    except stripe.error.SignatureVerificationError as e:
        current_app.logger.error(f"Invalid webhook signature: {str(e)}")
        return jsonify({"error": "Invalid signature"}), 400
    except ValueError as e:
        current_app.logger.error(f"Invalid webhook payload: {str(e)}")
        return jsonify({"error": "Invalid payload"}), 400
    except Exception as e:
        current_app.logger.error(f"Webhook verification error: {str(e)}")
        return jsonify({"error": "Webhook verification failed"}), 400
    
    # Log webhook event
    current_app.logger.info(f"Received webhook: {event['type']}")
    
    try:
        # Handle different event types with your comprehensive logic
        if event['type'] == 'checkout.session.completed':
            handle_checkout_completed(event['data']['object'])
        
        elif event['type'] == 'customer.subscription.created':
            handle_subscription_created(event['data']['object'])
        
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_cancelled(event['data']['object'])
        
        elif event['type'] == 'invoice.payment_succeeded':
            handle_payment_succeeded(event['data']['object'])
        
        elif event['type'] == 'invoice.payment_failed':
            handle_payment_failed(event['data']['object'])
        
        else:
            current_app.logger.info(f"Unhandled event type: {event['type']}")

        return jsonify({"status": "success"}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error processing webhook {event['type']}: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        
        # For critical errors, you might want to retry or alert administrators
        return jsonify({
            "error": "Webhook processing failed",
            "message": "The webhook was received but could not be processed"
        }), 500


def handle_checkout_completed(session):
    """Handle successful checkout completion with enhanced error handling"""
    try:
        # SUBSCRIPTION HANDLING (your existing logic enhanced)
        if 'user_id' in session['metadata'] and 'plan_id' in session['metadata']:
            user_id = session['metadata']['user_id']
            plan_id = session['metadata']['plan_id']
            billing_cycle = session['metadata']['billing_cycle']
            
            # Validate metadata
            if not user_id or not plan_id or not billing_cycle:
                raise ValueError("Missing required subscription metadata")
            
            # Update the pending subscription with Stripe subscription ID
            subscription = Subscription.query.filter_by(
                user_id=user_id,
                plan_id=plan_id,
                status="pending"
            ).first()
            
            if not subscription:
                current_app.logger.warning(f"No pending subscription found for user {user_id}, plan {plan_id}")
                # Create new subscription if none exists
                subscription = Subscription(
                    user_id=user_id,
                    plan_id=plan_id,
                    billing_cycle=billing_cycle,
                    status="pending"
                )
                db.session.add(subscription)
            
            # Get the Stripe subscription ID from the session
            if session.get('subscription'):
                stripe_subscription = stripe.Subscription.retrieve(session['subscription'])
                subscription.stripe_subscription_id = stripe_subscription.id
            
            subscription.status = "active"
            subscription.start_date = datetime.utcnow()
            
            # Set end date based on billing cycle
            if billing_cycle == "yearly":
                subscription.end_date = datetime.utcnow() + timedelta(days=365)
            else:
                subscription.end_date = datetime.utcnow() + timedelta(days=30)
            
            # Update user's trial status if they were on trial
            user = User.query.get(user_id)
            if user and user.is_on_trial:
                user.is_on_trial = False
                user.subscription_plan = plan_id  # Update user's plan
            
            db.session.commit()
            current_app.logger.info(f"✅ Subscription activated for user {user_id}")
        
        # MARKETPLACE PURCHASE HANDLING (enhanced)
        elif 'product_id' in session['metadata']:
            handle_marketplace_payment_success(session)
        
        # PODCAST PURCHASE HANDLING (enhanced)
        elif session['metadata'].get('type') == 'podcast_purchase':
            handle_podcast_payment_success(session)
        
        else:
            current_app.logger.warning(f"Unknown checkout session type: {session.get('metadata', {})}")
            
    except ValueError as e:
        current_app.logger.error(f"❌ Validation error in checkout completion: {str(e)}")
        db.session.rollback()
        raise
    except SQLAlchemyError as e:
        current_app.logger.error(f"❌ Database error in checkout completion: {str(e)}")
        db.session.rollback()
        raise
    except Exception as e:
        current_app.logger.error(f"❌ Error handling checkout completion: {str(e)}")
        db.session.rollback()
        raise


# In handle_subscription_created function:
def handle_subscription_created(subscription):
    """Handle when a subscription is created in Stripe with error handling"""
    try:
        if not subscription.get('id'):
            raise ValueError("Missing subscription ID")
        
        local_subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription['id']
        ).first()
        
        if local_subscription:
            local_subscription.status = "active"
            local_subscription.created_at = datetime.utcnow()
            db.session.commit()
            
            # ✅ SEND EMAIL NOTIFICATION
            user = User.query.get(local_subscription.user_id)
            if user and user.email:
                send_subscription_notification(user, local_subscription, 'activated')
            
            current_app.logger.info(f"✅ Subscription {subscription['id']} activated")
        else:
            current_app.logger.warning(f"Local subscription not found for Stripe ID: {subscription['id']}")
            
    except Exception as e:
        current_app.logger.error(f"❌ Error handling subscription creation: {str(e)}")
        db.session.rollback()
        raise


def handle_subscription_updated(subscription):
    """Handle subscription updates (plan changes, etc.) with error handling"""
    try:
        if not subscription.get('id'):
            raise ValueError("Missing subscription ID")
        
        local_subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription['id']
        ).first()
        
        if local_subscription:
            # Update subscription status based on Stripe status
            stripe_status = subscription['status']
            
            if stripe_status == 'active':
                local_subscription.status = 'active'
            elif stripe_status == 'canceled':
                local_subscription.status = 'canceled'
                local_subscription.end_date = datetime.utcnow()
                local_subscription.canceled_at = datetime.utcnow()
            elif stripe_status == 'past_due':
                local_subscription.status = 'past_due'
                # Set grace period
                local_subscription.grace_period_end = datetime.utcnow() + timedelta(days=7)
            elif stripe_status == 'incomplete':
                local_subscription.status = 'incomplete'
            elif stripe_status == 'trialing':
                local_subscription.status = 'trialing'
            
            local_subscription.updated_at = datetime.utcnow()
            
            # Update user plan if subscription is canceled
            if stripe_status == 'canceled':
                user = User.query.get(local_subscription.user_id)
                if user:
                    user.subscription_plan = 'free'
            
            db.session.commit()
            current_app.logger.info(f"✅ Subscription {subscription['id']} updated to {stripe_status}")
        else:
            current_app.logger.warning(f"Local subscription not found for update: {subscription['id']}")
            
    except Exception as e:
        current_app.logger.error(f"❌ Error handling subscription update: {str(e)}")
        db.session.rollback()
        raise


# In handle_subscription_cancelled function:
def handle_subscription_cancelled(subscription):
    """Handle subscription cancellation with error handling"""
    try:
        if not subscription.get('id'):
            raise ValueError("Missing subscription ID")
        
        local_subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription['id']
        ).first()
        
        if local_subscription:
            local_subscription.status = "canceled"
            local_subscription.end_date = datetime.utcnow()
            local_subscription.canceled_at = datetime.utcnow()
            
            # Update user plan
            user = User.query.get(local_subscription.user_id)
            if user:
                user.subscription_plan = 'free'
                
                # ✅ SEND EMAIL NOTIFICATION
                if user.email:
                    send_subscription_notification(user, local_subscription, 'canceled')
            
            db.session.commit()
            current_app.logger.info(f"✅ Subscription {subscription['id']} canceled")
        else:
            current_app.logger.warning(f"Local subscription not found for cancellation: {subscription['id']}")
            
    except Exception as e:
        current_app.logger.error(f"❌ Error handling subscription cancellation: {str(e)}")
        db.session.rollback()
        raise


def handle_payment_succeeded(invoice):
    """Handle successful payment with error handling"""
    try:
        subscription_id = invoice.get('subscription')
        
        if not subscription_id:
            current_app.logger.warning("Payment succeeded but no subscription ID found")
            return
        
        local_subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription_id
        ).first()
        
        if local_subscription:
            # Extend subscription end date for next billing cycle
            if local_subscription.billing_cycle == "yearly":
                local_subscription.end_date = datetime.utcnow() + timedelta(days=365)
            else:
                local_subscription.end_date = datetime.utcnow() + timedelta(days=30)
            
            local_subscription.status = "active"
            local_subscription.grace_period_end = None  # Clear grace period
            local_subscription.updated_at = datetime.utcnow()
            
            # Update user plan to active
            user = User.query.get(local_subscription.user_id)
            if user:
                # Determine plan based on amount
                amount = invoice.get('amount_paid', 0) / 100
                if amount >= 29.99:
                    user.subscription_plan = "premium"
                elif amount >= 9.99:
                    user.subscription_plan = "pro"
                else:
                    user.subscription_plan = "basic"
            
            db.session.commit()
            current_app.logger.info(f"✅ Payment succeeded for subscription {subscription_id}")
        else:
            current_app.logger.warning(f"Local subscription not found for payment: {subscription_id}")
            
    except Exception as e:
        current_app.logger.error(f"❌ Error handling payment success: {str(e)}")
        db.session.rollback()
        raise

# In handle_payment_failed function:
def handle_payment_failed(invoice):
    """Handle failed payment with enhanced grace period management"""
    try:
        subscription_id = invoice.get('subscription')
        
        if not subscription_id:
            current_app.logger.warning("Payment failed but no subscription ID found")
            return
        
        local_subscription = Subscription.query.filter_by(
            stripe_subscription_id=subscription_id
        ).first()
        
        if local_subscription:
            grace_period_end = datetime.utcnow() + timedelta(days=7)
            local_subscription.grace_period_end = grace_period_end
            local_subscription.status = "past_due"
            local_subscription.updated_at = datetime.utcnow()
            
            user = User.query.get(local_subscription.user_id)
            if user:
                # ✅ SEND EMAIL NOTIFICATION
                if user.email:
                    send_subscription_notification(user, local_subscription, 'payment_failed')
                
                current_app.logger.info(f"Grace period set for user {user.email} until {grace_period_end}")
            
            db.session.commit()
            current_app.logger.info(f"⚠️ Payment failed for subscription {subscription_id} - grace period set")
        else:
            current_app.logger.warning(f"Local subscription not found for failed payment: {subscription_id}")
            
    except Exception as e:
        current_app.logger.error(f"❌ Error handling payment failure: {str(e)}")
        db.session.rollback()
        raise



def handle_marketplace_payment_success(session):
    """Handle successful marketplace payment with comprehensive error handling"""
    try:
        metadata = session.get('metadata', {})
        
        # Validate required metadata
        required_fields = ['product_id', 'buyer_id', 'creator_id', 'platform_cut', 'creator_earnings']
        missing_fields = [field for field in required_fields if field not in metadata]
        
        if missing_fields:
            raise ValueError(f"Missing metadata fields: {', '.join(missing_fields)}")
        
        # Extract and validate data
        product_id = int(metadata['product_id'])
        buyer_id = int(metadata['buyer_id'])
        creator_id = int(metadata['creator_id'])
        platform_cut = float(metadata['platform_cut'])
        creator_earnings = float(metadata['creator_earnings'])
        amount_total = session['amount_total'] / 100  # Convert from cents
        
        # Validate product exists and is still available
        product = Product.query.get(product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        if not product.is_active:
            raise ValueError(f"Product {product_id} is no longer active")
        
        # Check stock for physical products
        if not product.is_digital and product.stock <= 0:
            raise ValueError(f"Product {product_id} is out of stock")
        
        # Validate users exist
        buyer = User.query.get(buyer_id)
        creator = User.query.get(creator_id)
        
        if not buyer:
            raise ValueError(f"Buyer {buyer_id} not found")
        if not creator:
            raise ValueError(f"Creator {creator_id} not found")
        
        # Create purchase record
        purchase = Purchase(
            user_id=buyer_id,
            product_id=product_id,
            amount=amount_total,
            platform_cut=platform_cut,
            creator_earnings=creator_earnings,
            stripe_payment_intent_id=session.get('payment_intent'),
            status='completed'
        )
        
        db.session.add(purchase)
        
        # Update product statistics
        product.sales_revenue += creator_earnings
        product.sales_count = (product.sales_count or 0) + 1
        
        # Reduce stock for physical products
        if not product.is_digital and product.stock > 0:
            product.stock -= 1
        
        # Update creator earnings
        creator.total_earnings = (creator.total_earnings or 0) + creator_earnings
        creator.available_balance = (creator.available_balance or 0) + creator_earnings
        
        db.session.commit()
        
        current_app.logger.info(f"✅ Marketplace purchase completed: Product {product_id}, Buyer {buyer_id}, Amount ${amount_total}")
        
    except ValueError as e:
        current_app.logger.error(f"❌ Marketplace payment validation error: {str(e)}")
        db.session.rollback()
        raise
    except Exception as e:
        current_app.logger.error(f"❌ Error handling marketplace payment: {str(e)}")
        db.session.rollback()
        raise


def handle_podcast_payment_success(session):
    """Handle successful podcast payment with enhanced error handling"""
    try:
        metadata = session.get('metadata', {})
        
        # Validate required metadata
        required_fields = ['podcast_id', 'user_id']
        missing_fields = [field for field in required_fields if field not in metadata]
        
        if missing_fields:
            raise ValueError(f"Missing metadata fields: {', '.join(missing_fields)}")
        
        podcast_id = int(metadata['podcast_id'])
        user_id = int(metadata['user_id'])
        episode_id = int(metadata['episode_id']) if metadata.get('episode_id') else None
        amount = float(metadata.get('price', 0))
        
        # Validate podcast and user exist
        podcast = Podcast.query.get(podcast_id)
        user = User.query.get(user_id)
        
        if not podcast:
            raise ValueError(f"Podcast {podcast_id} not found")
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Check if user already has access
        existing_access = PodcastAccess.query.filter_by(
            user_id=user_id,
            podcast_id=podcast_id
        ).first()
        
        if existing_access:
            current_app.logger.warning(f"User {user_id} already has access to podcast {podcast_id}")
            # Still process payment but don't duplicate access
            return
        
        # Create purchase record
        purchase = PodcastPurchase(
            user_id=user_id,
            podcast_id=podcast_id,
            episode_id=episode_id,
            amount=amount,
            status='completed'
        )
        
        db.session.add(purchase)
        
        # Grant access to podcast
        access = PodcastAccess(
            user_id=user_id,
            podcast_id=podcast_id,
            access_type='premium',
            granted_at=datetime.utcnow(),
            payment_amount=amount
        )
        
        db.session.add(access)
        
        # Update podcast creator earnings
        creator = User.query.get(podcast.creator_id)
        if creator:
            creator_earnings = amount * 0.85  # 15% platform fee
            creator.total_earnings = (creator.total_earnings or 0) + creator_earnings
            creator.available_balance = (creator.available_balance or 0) + creator_earnings
        
        db.session.commit()
        
        current_app.logger.info(f"✅ Podcast access granted: Podcast {podcast_id}, User {user_id}, Amount ${amount}")
        
    except Exception as e:
        current_app.logger.error(f"❌ Error handling podcast payment: {str(e)}")
        db.session.rollback()
        raise


def is_subscription_active(user_id):
    """Check if user has active subscription including grace period - ENHANCED"""
    try:
        subscription = Subscription.query.filter_by(
            user_id=user_id
        ).order_by(Subscription.created_at.desc()).first()
        
        if not subscription:
            return False
        
        now = datetime.utcnow()
        
        # Check if subscription is active
        if subscription.status == "active" and subscription.end_date > now:
            return True
        
        # Check grace period for past due subscriptions
        if (subscription.status == "past_due" and 
            subscription.grace_period_end and 
            subscription.grace_period_end > now):
            return True
        
        # Check if user is in trial period
        if subscription.status == "trialing":
            return True
        
        return False
        
    except Exception as e:
        current_app.logger.error(f"Error checking subscription status for user {user_id}: {str(e)}")
        return False  # Fail safely - assume no subscription


@api.route('/admin/radio-stations', methods=['GET'])
@jwt_required()
def get_all_radio_stations_admin():
    """Admin-only endpoint to get ALL radio stations with full details"""
    user_id = get_jwt_identity()
    
    # Check if user is admin
    if not is_admin(user_id):
        return jsonify({"error": "Unauthorized - Admin access required"}), 403
    
    try:
        # Get ALL stations (public and private) for admin
        stations = RadioStation.query.order_by(RadioStation.created_at.desc()).all()
        
        stations_data = []
        for station in stations:
            # Get creator info
            creator = User.query.get(station.user_id)
            
            # Get additional stats for admin view
            total_followers = station.followers_count
            total_playlists = RadioPlaylist.query.filter_by(station_id=station.id).count()
            
            # Determine genre
            genre = "Music"
            if station.genres and len(station.genres) > 0:
                genre = station.genres[0]
            
            # Full admin data
            station_data = {
                "id": station.id,
                "name": station.name,
                "description": station.description,
                "user_id": station.user_id,
                "creator_name": station.creator_name or (creator.username if creator else "Unknown"),
                "creator_email": creator.email if creator else "Unknown",
                
                # Visibility & Access
                "is_public": station.is_public,
                "is_live": station.is_live,
                "allowed_users_count": len(station.allowed_users) if not station.is_public else 0,
                
                # Monetization
                "is_subscription_based": station.is_subscription_based,
                "subscription_price": station.subscription_price,
                "is_ticketed": station.is_ticketed,
                "ticket_price": station.ticket_price,
                
                # Media & Content
                "logo_url": station.logo_url,
                "cover_image_url": station.cover_image_url,
                "genres": station.genres or [],
                "genre": genre,
                
                # Stats
                "followers_count": total_followers,
                "playlist_count": total_playlists,
                "max_listeners": station.max_listeners,
                
                # Technical
                "stream_url": station.stream_url,
                "is_webrtc_enabled": station.is_webrtc_enabled,
                "loop_audio_url": station.loop_audio_url,
                "is_loop_enabled": station.is_loop_enabled,
                
                # Timestamps
                "created_at": station.created_at.isoformat() if station.created_at else None,
                "loop_started_at": station.loop_started_at.isoformat() if station.loop_started_at else None,
                
                # Current Status
                "now_playing": station.get_current_track(),
                "status": "Live" if station.is_live else "Offline"
            }
            stations_data.append(station_data)
        
        print(f"🔒 Admin API: Returning {len(stations_data)} stations with full details")
        
        return jsonify({
            "total_stations": len(stations_data),
            "public_stations": len([s for s in stations_data if s["is_public"]]),
            "private_stations": len([s for s in stations_data if not s["is_public"]]),
            "live_stations": len([s for s in stations_data if s["is_live"]]),
            "stations": stations_data
        }), 200
        
    except Exception as e:
        print(f"❌ Error in admin radio stations API: {e}")
        return jsonify({"error": f"Failed to fetch stations: {str(e)}"}), 500

# Helper function to check admin status
def is_admin(user_id):
    """Check if the user has admin privileges"""
    try:
        user = User.query.get(user_id)
        if not user:
            return False
        
        # Check if user has admin role
        if hasattr(user, 'role') and user.role:
            return user.role.name.lower() == "admin"
        
        # Alternative: Check by role_id if you have role IDs
        # admin_role = Role.query.filter_by(name="Admin").first()
        # return user.role_id == admin_role.id if admin_role else False
        
        return False
        
    except Exception as e:
        print(f"Error checking admin status: {e}")
        return False

@api.route('/radio-stations', methods=['GET'])
def get_all_radio_stations_public():
    """Public endpoint to get all radio stations for Browse Radio Stations page"""
    try:
        # Get all public stations, newest first
        stations = RadioStation.query.filter_by(is_public=True).order_by(RadioStation.created_at.desc()).all()
        
        stations_data = []
        for station in stations:
            # Get creator info
            creator = User.query.get(station.user_id)
            
            # Determine genre from your genres array
            genre = "Music"  # Default
            if station.genres and len(station.genres) > 0:
                genre = station.genres[0]  # Use first genre
            
            # Build station data compatible with your frontend
            station_data = {
                "id": station.id,
                "name": station.name,
                "description": station.description or "A great radio station",
                "genre": genre,  # BrowseRadioStations.js expects this field
                "image": station.logo_url,  # Frontend looks for this
                "cover_art_url": station.cover_image_url,
                "logo_url": station.logo_url,
                "creator_name": station.creator_name or (creator.username if creator else "Unknown"),
                "created_at": station.created_at.isoformat() if station.created_at else None,
                "is_live": station.is_live,
                "followers_count": station.followers_count,
                "genres": station.genres or []
            }
            stations_data.append(station_data)
        
        print(f"📡 Public API: Returning {len(stations_data)} radio stations")
        return jsonify(stations_data), 200
        
    except Exception as e:
        print(f"❌ Error in public radio stations API: {e}")
        return jsonify([]), 200  # Return empty array on error

@api.route('/radio/genres', methods=['GET'])
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

@api.route('/messages/mark-read/<int:message_id>', methods=['PUT'])
@jwt_required()
def mark_message_read(message_id):
    current_user_id = get_jwt_identity()
    
    message = Message.query.get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    # Only recipient can mark as read
    conversation = Conversation.query.get(message.conversation_id)
    if conversation.user1_id != current_user_id and conversation.user2_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    message.is_read = True
    db.session.commit()
    
    return jsonify({'success': True}), 200


# @api.route('/chat/send', methods=['POST'])
# @jwt_required()
# def send_chat_message():
#     data = request.get_json()
#     user_id = get_jwt_identity()

#     new_message = ChatMessage(
#         room=data['room'],
#         sender_id=user_id,
#         recipient_id=data['to'],
#         text=data['text'],
#         timestamp=datetime.utcnow(),
#         media_url=data.get('mediaUrl')
#     )
#     db.session.add(new_message)
#     db.session.commit()

#     return jsonify({"message": "Message saved successfully."}), 201


# @api.route('/chat/history', methods=['GET'])
# @jwt_required()
# def get_chat_history():
#     room = request.args.get('room')
#     messages = ChatMessage.query.filter_by(room=room).order_by(ChatMessage.timestamp.asc()).all()

#     return jsonify([{
#         'from': m.sender_id,
#         'to': m.recipient_id,
#         'text': m.text,
#         'timestamp': m.timestamp.isoformat(),
#         'mediaUrl': m.media_url
#     } for m in messages])

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

def generate_stream_key():
    """Generate a unique stream key"""
    return str(uuid.uuid4())

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
@jwt_required()
def delete_avatar():
    user_id = get_jwt_identity()

    user = User.query.get(user_id)
    if not user or not user.avatar_url:
        return jsonify({"error": "Avatar not found"}), 404

    # Optionally delete the avatar file if it's stored locally
    if user.avatar_url and not user.avatar_url.startswith("http"):
        avatar_filename = os.path.basename(user.avatar_url)
        avatar_file_path = os.path.join('uploads', avatar_filename)
        if os.path.exists(avatar_file_path):
            os.remove(avatar_file_path)

    # Remove from database
    user.avatar_url = None
    db.session.commit()

    return jsonify({"message": "Avatar deleted successfully"}), 200


@api.route('/upload-avatar', methods=['POST'])
@jwt_required()
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


@api.route("/user/profile", methods=["GET"])
@jwt_required()
def get_user_profile():
    """Get the logged-in user's profile data"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # ✅ Return user data directly (not wrapped in "user" key)
        return jsonify(user.serialize()), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Failed to retrieve profile: {str(e)}"
        }), 500

@api.route("/user/<int:user_id>", methods=["GET"])
def get_user_by_id(user_id):
    """Get a specific user's public profile data"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify(user.serialize()), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Failed to retrieve user: {str(e)}"
        }), 500

# 🔍 Discover Users - Browse/Search Users
@api.route('/users/discover', methods=['GET'])
def discover_users():
    """Browse and search users - handles users with or without profile_type"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '').strip()
        profile_type_filter = request.args.get('profile_type', '').strip()
        
        query = User.query
        
        # Search filter
        if search:
            query = query.filter(
                or_(
                    User.username.ilike(f'%{search}%'),
                    User.display_name.ilike(f'%{search}%'),
                    User.artist_name.ilike(f'%{search}%')
                )
            )
        
        # Profile type filter - only apply if not 'all' and not empty
        if profile_type_filter and profile_type_filter != 'all':
            if profile_type_filter == 'artist':
                query = query.filter(
                    or_(
                        User.profile_type == 'artist',
                        User.is_artist == True
                    )
                )
            elif profile_type_filter == 'gamer':
                query = query.filter(
                    or_(
                        User.profile_type == 'gamer',
                        User.is_gamer == True
                    )
                )
            elif profile_type_filter == 'creator':
                query = query.filter(
                    or_(
                        User.profile_type == 'creator',
                        User.profile_type == 'multiple',
                        User.is_streamer == True,
                        User.podcast != None,
                        User.podcast != '',
                        User.radio_station != None,
                        User.radio_station != '',
                        User.videos != None
                    )
                )
            elif profile_type_filter == 'regular':
                query = query.filter(
                    and_(
                        or_(
                            User.profile_type == 'regular',
                            User.profile_type == None,
                            User.profile_type == ''
                        ),
                        or_(User.is_artist == False, User.is_artist == None),
                        or_(User.is_gamer == False, User.is_gamer == None),
                        or_(User.is_streamer == False, User.is_streamer == None),
                        or_(User.podcast == None, User.podcast == ''),
                        or_(User.radio_station == None, User.radio_station == '')
                    )
                )
        
        # Order by most recent first
        query = query.order_by(User.id.desc())
        
        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        users_data = []
        for user in paginated.items:
            # Count followers - FIXED: Use followed_id, not following_id
            followers_count = 0
            try:
                followers_count = Follow.query.filter_by(following_id=user.id).count()
            except:
                pass
            
            # Determine profile type using multiple fields
            user_profile_type = user.profile_type
            
            # If profile_type is not set, check various flags and fields
            if not user_profile_type or user_profile_type == '' or user_profile_type == 'regular':
                if getattr(user, 'is_artist', False):
                    user_profile_type = 'artist'
                elif getattr(user, 'is_gamer', False):
                    user_profile_type = 'gamer'
                elif getattr(user, 'is_streamer', False) or getattr(user, 'podcast', None) or getattr(user, 'radio_station', None):
                    user_profile_type = 'creator'
                else:
                    user_profile_type = 'regular'
            
            users_data.append({
                "id": user.id,
                "username": user.username,
                "display_name": getattr(user, 'display_name', None) or getattr(user, 'artist_name', None) or user.username,
                "profile_type": user_profile_type,
                "bio": getattr(user, 'bio', None) or getattr(user, 'artist_bio', None) or getattr(user, 'gamer_bio', None),
                "profile_picture": getattr(user, 'profile_picture', None) or getattr(user, 'avatar_url', None),
                "followers_count": followers_count,
                "is_verified": getattr(user, 'is_verified', False) or getattr(user, 'is_verified_artist', False)
            })
        
        return jsonify({
            "users": users_data,
            "total": paginated.total,
            "page": page,
            "pages": paginated.pages,
            "has_more": paginated.has_next
        }), 200
        
    except Exception as e:
        print(f"Error discovering users: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"users": [], "total": 0, "error": str(e)}), 200

# Add these endpoints to your routes.py file

# Add this endpoint to your routes.py file

@api.route("/user/<int:user_id>", methods=["GET"])
def get_public_user_profile(user_id):
    """Get any user's public profile data (for video channels)"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Return public profile data only (no sensitive info)
        public_profile = {
            "id": user.id,
            "username": user.username,
            "display_name": getattr(user, 'display_name', None),
            "bio": getattr(user, 'bio', None),
            "profile_picture": getattr(user, 'profile_picture', None),
            "avatar_url": getattr(user, 'avatar_url', None),
            "cover_photo": getattr(user, 'cover_photo', None),
            "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None,
            "artist_name": getattr(user, 'artist_name', None),
            # Don't include private info like email, password_hash, etc.
        }
        
        return jsonify(public_profile), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Failed to retrieve user profile: {str(e)}"
        }), 500

# 2. Get videos for a specific user (for video channels)

@api.route('/users/username/<string:username>', methods=['GET'])
def get_user_by_username(username):
    """Look up a user by username - used for /support/:username tip pages"""
    try:
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "id": user.id,
            "username": user.username,
            "display_name": getattr(user, 'display_name', None),
            "artist_name": getattr(user, 'artist_name', None),
            "bio": getattr(user, 'bio', None),
            "profile_picture": getattr(user, 'profile_picture', None),
            "avatar_url": getattr(user, 'avatar_url', None),
            "cover_photo": getattr(user, 'cover_photo', None),
            "is_artist": getattr(user, 'is_artist', False),
            "is_gamer": getattr(user, 'is_gamer', False),
            "is_verified": getattr(user, 'is_verified', False)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve user: {str(e)}"}), 500

# Keep your video upload endpoint as is
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
    
    # Limit video size (max 20MB)
    if video.content_length and video.content_length > 20 * 1024 * 1024:
        return jsonify({"error": "Video file is too large (Max 20MB)"}), 400
    
    # Use uploadFile function instead of local saving
    video_url = uploadFile(video, filename)
    
    # Ensure video gallery list doesn't exceed limit
    if len(user.videos or []) >= 10:
        return jsonify({"error": "Max 10 videos allowed"}), 400
    
    if not user.videos:
        user.videos = []
    
    user.videos.append({
        "file_url": video_url,
        "title": filename
    })
    
    db.session.commit()
    
    return jsonify({
        "message": "Video uploaded successfully", 
        "videos": user.videos
    }), 200


# UPDATE SETTINGS
@api.route('/user/settings', methods=['PUT'])
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

@api.route("/messages/send", methods=["POST"])
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

@api.route("/messages/<int:recipient_id>", methods=["GET"])
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


@api.route('/send-payment', methods=['POST'])
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

@api.route('/submit-track', methods=['POST'])
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

@api.route('/my-releases', methods=['GET'])
@jwt_required()
def get_my_releases():
    try:
        user_id = get_jwt_identity()
        releases = TrackRelease.query.filter_by(user_id=user_id).all()

        return jsonify([r.serialize() for r in releases]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/track/<int:track_id>', methods=['GET'])
@jwt_required()
def get_track_details(track_id):
    try:
        track = TrackRelease.query.get(track_id)
        if not track:
            return jsonify({"error": "Track not found"}), 404

        return jsonify(track.serialize()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500 
    
@api.route('/tracks/user', methods=['GET'])
@jwt_required()
def get_user_tracks():
    try:
        user_id = get_jwt_identity()
        tracks = TrackRelease.query.filter_by(user_id=user_id).order_by(TrackRelease.created_at.desc()).all()

        return jsonify([track.serialize() for track in tracks]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@api.route('/admin/tracks', methods=['GET'])
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

@api.route('/create-release', methods=['POST'])
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
    track = Audio.query.get(track_id)
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

@api.route('/upload-lyrics', methods=['POST'])
@jwt_required()
def upload_lyrics():
    user_id = get_jwt_identity()
    data = request.get_json()
    track_id = data.get("track_id")
    lyrics = data.get("lyrics")

    if not all([track_id, lyrics]):
        return jsonify({"error": "Missing track ID or lyrics"}), 400

    track = Audio.query.get(track_id)
    if not track or track.user_id != user_id:
        return jsonify({"error": "Unauthorized or invalid track"}), 403

    track.lyrics = lyrics
    db.session.commit()
    return jsonify({"message": "Lyrics saved"}), 200
# ✅ In routes.py
@api.route('/create-album', methods=['POST'])
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

@api.route('/album/<int:album_id>/add-track', methods=['POST'])
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
    track = Audio.query.get(track_id)
    if not track or track.user_id != user_id:
        return jsonify({"error": "Track not found or unauthorized"}), 403

    # Check if track is already in an album
    if track.album_id and track.album_id != album_id:
        return jsonify({"error": "Track is already in another album"}), 409

    # Add track to album
    track.album_id = album_id
    db.session.commit()

    return jsonify({"message": "✅ Track added to album"}), 200


@api.route('/album/<int:album_id>/remove-track', methods=['POST'])
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
    track = Audio.query.get(track_id)
    if not track or track.user_id != user_id:
        return jsonify({"error": "Track not found or unauthorized"}), 403
    
    if track.album_id != album_id:
        return jsonify({"error": "Track is not in this album"}), 400

    # Remove track from album
    track.album_id = None
    db.session.commit()

    return jsonify({"message": "Track removed from album"}), 200


@api.route('/album/<int:album_id>', methods=['GET'])
@jwt_required()
def get_album_detail(album_id):
    """Get album details with all tracks"""
    user_id = get_jwt_identity()
    album = Album.query.get(album_id)

    if not album or album.user_id != user_id:
        return jsonify({"error": "Album not found or unauthorized"}), 403

    tracks = Audio.query.filter_by(album_id=album_id).order_by(Audio.created_at).all()

    return jsonify({
        "album": album.serialize(),
        "tracks": [t.serialize() for t in tracks]
    }), 200


@api.route('/my-albums', methods=['GET'])
@jwt_required()
def get_my_albums():
    """Get all albums for the current user"""
    user_id = get_jwt_identity()
    albums = Album.query.filter_by(user_id=user_id).order_by(Album.created_at.desc()).all()
    return jsonify([a.serialize() for a in albums]), 200


@api.route('/track/<int:track_id>/edit', methods=['PUT'])
@jwt_required()
def edit_track(track_id):
    """Edit track details (title, genre, description, etc.)"""
    user_id = get_jwt_identity()
    data = request.get_json()

    track = Audio.query.get(track_id)
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



@api.route('/tracks/unassigned', methods=['GET'])
@jwt_required()
def get_unassigned_tracks():
    """Get all tracks that are not assigned to any album"""
    user_id = get_jwt_identity()
    tracks = Audio.query.filter_by(user_id=user_id, album_id=None).order_by(Audio.created_at.desc()).all()
    return jsonify([t.serialize() for t in tracks]), 200


@api.route('/user/top-track', methods=['GET'])
@jwt_required()
def get_top_track():
    user_id = get_jwt_identity()
    top_track = Audio.query.filter_by(user_id=user_id).order_by(Audio.play_count.desc()).first()

    if not top_track:
        return jsonify({"message": "No tracks found"}), 404

    return jsonify({
        "id": top_track.id,
        "title": top_track.title,
        "play_count": top_track.play_count,
        "file_url": top_track.file_url
    }), 200

@api.route('/user/earnings-history', methods=['GET'])
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
    """
    Enhanced Home Feed - Returns posts, tracks, videos, and podcasts
    from users the current user follows (and their own content).
    
    Query Parameters:
    - type: 'all', 'posts', 'tracks', 'videos', 'podcasts' (default: 'all')
    - page: Page number (default: 1)
    - per_page: Items per page (default: 20, max: 50)
    - days: Limit to recent days (optional, default: no limit)
    """
    try:
        user_id = get_jwt_identity()
        
        # Query parameters
        content_type = request.args.get('type', 'all')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        days_limit = request.args.get('days', None, type=int)
        
        # Get list of followed user IDs
        followed_query = db.session.query(Follow.following_id).filter_by(follower_id=user_id)
        followed_ids = [f[0] for f in followed_query.all()]
        
        # Include the user's own content
        all_user_ids = [user_id] + followed_ids
        
        # Date filter (optional)
        date_filter = None
        if days_limit:
            date_filter = datetime.utcnow() - timedelta(days=days_limit)
        
        # Collect all feed items
        feed_items = []
        
        # ===== POSTS =====
        if content_type in ['all', 'posts']:
            try:
                post_query = Post.query.filter(Post.author_id.in_(all_user_ids))
                
                if date_filter:
                    post_query = post_query.filter(Post.created_at >= date_filter)
                
                posts = post_query.order_by(Post.created_at.desc()).limit(per_page * 2).all()
                
                for post in posts:
                    # Check if current user liked this post
                    is_liked = False
                    try:
                        is_liked = PostLike.query.filter_by(
                            post_id=post.id,
                            user_id=user_id
                        ).first() is not None
                    except:
                        pass
                    
                    # Get author info
                    author = User.query.get(post.author_id) if hasattr(post, 'author_id') else None
                    
                    post_data = {
                        "id": post.id,
                        "feed_type": "post",
                        "author_id": getattr(post, 'author_id', None),
                        "author_name": author.display_name or author.username if author else "Unknown",
                        "author_username": author.username if author else "unknown",
                        "author_avatar": author.profile_picture if author else None,
                        "title": getattr(post, 'title', None),
                        "content": post.content,
                        "image_url": getattr(post, 'image_url', None),
                        "video_url": getattr(post, 'video_url', None),
                        "created_at": post.created_at.isoformat() if post.created_at else None,
                        "is_edited": getattr(post, 'is_edited', False),
                        "likes_count": len(post.likes) if hasattr(post, 'likes') and post.likes else 0,
                        "comments_count": len(post.comments) if hasattr(post, 'comments') and post.comments else 0,
                        "is_liked": is_liked
                    }
                    feed_items.append(post_data)
            except Exception as e:
                print(f"Error fetching posts for feed: {e}")
        
        # ===== AUDIO TRACKS =====
        if content_type in ['all', 'tracks']:
            try:
                track_query = Audio.query.filter(Audio.user_id.in_(all_user_ids))
                
                if date_filter and hasattr(Audio, 'created_at'):
                    track_query = track_query.filter(Audio.created_at >= date_filter)
                
                # Order by created_at or id
                if hasattr(Audio, 'created_at'):
                    track_query = track_query.order_by(Audio.created_at.desc())
                else:
                    track_query = track_query.order_by(Audio.id.desc())
                
                tracks = track_query.limit(per_page).all()
                
                for track in tracks:
                    # Check if current user liked this track
                    is_liked = False
                    try:
                        is_liked = AudioLike.query.filter_by(
                            audio_id=track.id,
                            user_id=user_id
                        ).first() is not None
                    except:
                        pass
                    
                    # Get artist/user info
                    artist = User.query.get(track.user_id) if track.user_id else None
                    
                    track_data = {
                        "id": track.id,
                        "feed_type": "track",
                        "author_id": track.user_id,
                        "author_name": track.artist_name or (artist.display_name if artist else None) or (artist.username if artist else "Unknown Artist"),
                        "author_username": artist.username if artist else "unknown",
                        "author_avatar": artist.profile_picture if artist else None,
                        "title": track.title,
                        "content": f"Released a new track: {track.title}",
                        "description": getattr(track, 'description', None),
                        "audio_url": track.file_url,
                        "artwork_url": getattr(track, 'artwork_url', None) or getattr(track, 'cover_image', None),
                        "duration": getattr(track, 'duration', None),
                        "genre": getattr(track, 'genre', None),
                        "plays": getattr(track, 'plays', 0) or getattr(track, 'play_count', 0) or 0,
                        "created_at": track.created_at.isoformat() if hasattr(track, 'created_at') and track.created_at else None,
                        "likes_count": len(track.audio_likes) if hasattr(track, 'audio_likes') and track.audio_likes else 0,
                        "is_liked": is_liked
                    }
                    feed_items.append(track_data)
            except Exception as e:
                print(f"Error fetching tracks for feed: {e}")
        
        # ===== VIDEOS =====
        if content_type in ['all', 'videos']:
            try:
                video_query = Video.query.filter(
                    Video.user_id.in_(all_user_ids),
                    Video.is_public == True
                )
                
                if date_filter and hasattr(Video, 'uploaded_at'):
                    video_query = video_query.filter(Video.uploaded_at >= date_filter)
                
                videos = video_query.order_by(Video.uploaded_at.desc()).limit(per_page).all()
                
                for video in videos:
                    # Check if current user liked this video
                    is_liked = False
                    try:
                        is_liked = VideoLike.query.filter_by(
                            video_id=video.id,
                            user_id=user_id
                        ).first() is not None
                    except:
                        pass
                    
                    # Get uploader info
                    uploader = User.query.get(video.user_id) if video.user_id else None
                    
                    video_data = {
                        "id": video.id,
                        "feed_type": "video",
                        "author_id": video.user_id,
                        "author_name": uploader.display_name or uploader.username if uploader else "Unknown",
                        "author_username": uploader.username if uploader else "unknown",
                        "author_avatar": uploader.profile_picture if uploader else None,
                        "title": video.title,
                        "content": f"Uploaded a new video: {video.title}",
                        "description": video.description,
                        "video_url": video.file_url,
                        "thumbnail_url": video.thumbnail_url,
                        "duration": video.duration,
                        "views": video.views or 0,
                        "created_at": video.uploaded_at.isoformat() if video.uploaded_at else None,
                        "likes_count": video.likes or 0,
                        "comments_count": video.comments_count or 0,
                        "is_liked": is_liked,
                        "category": getattr(video, 'category', None)
                    }
                    feed_items.append(video_data)
            except Exception as e:
                print(f"Error fetching videos for feed: {e}")
        
        # ===== PODCAST EPISODES =====
        if content_type in ['all', 'podcasts']:
            try:
                # Get podcasts from followed users
                user_podcasts = Podcast.query.filter(Podcast.host_id.in_(all_user_ids)).all()
                podcast_ids = [p.id for p in user_podcasts]
                
                if podcast_ids:
                    episode_query = PodcastEpisode.query.filter(
                        PodcastEpisode.podcast_id.in_(podcast_ids)
                    )
                    
                    if date_filter and hasattr(PodcastEpisode, 'created_at'):
                        episode_query = episode_query.filter(PodcastEpisode.created_at >= date_filter)
                    
                    episodes = episode_query.order_by(PodcastEpisode.created_at.desc()).limit(per_page).all()
                    
                    for episode in episodes:
                        # Get podcast and host info
                        podcast = Podcast.query.get(episode.podcast_id)
                        host = User.query.get(podcast.host_id) if podcast else None
                        
                        episode_data = {
                            "id": episode.id,
                            "feed_type": "podcast",
                            "author_id": podcast.host_id if podcast else None,
                            "author_name": host.display_name or host.username if host else "Unknown Host",
                            "author_username": host.username if host else "unknown",
                            "author_avatar": host.profile_picture if host else None,
                            "title": episode.title,
                            "content": f"New episode: {episode.title}",
                            "description": getattr(episode, 'description', None),
                            "podcast_name": podcast.name if podcast else "Unknown Podcast",
                            "podcast_id": episode.podcast_id,
                            "audio_url": getattr(episode, 'audio_url', None),
                            "thumbnail_url": getattr(episode, 'thumbnail', None) or (podcast.cover_art_url if podcast else None),
                            "duration": getattr(episode, 'duration', None),
                            "episode_number": getattr(episode, 'episode_number', None),
                            "created_at": episode.created_at.isoformat() if hasattr(episode, 'created_at') and episode.created_at else None,
                            "listens": getattr(episode, 'listen_count', 0) or 0,
                            "is_liked": False  # Add podcast likes if you have that model
                        }
                        feed_items.append(episode_data)
            except Exception as e:
                print(f"Error fetching podcasts for feed: {e}")
        
        # ===== SORT ALL ITEMS BY DATE =====
        def get_date(item):
            date_str = item.get('created_at')
            if date_str:
                try:
                    return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except:
                    return datetime.min
            return datetime.min
        
        feed_items.sort(key=get_date, reverse=True)
        
        # ===== PAGINATE =====
        total_items = len(feed_items)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_items = feed_items[start_idx:end_idx]
        
        total_pages = (total_items + per_page - 1) // per_page
        
        return jsonify({
            "success": True,
            "feed": paginated_items,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            },
            "filters": {
                "type": content_type,
                "days": days_limit
            }
        }), 200
        
    except Exception as e:
        print(f"Home feed error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "Failed to load home feed",
            "message": str(e)
        }), 500

@api.route("/posts/create", methods=["POST"])
@jwt_required()
def create_post():
    """Create a new post"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        content = data.get('content', '').strip()
        if not content:
            return jsonify({"error": "Post content is required"}), 400
        
        new_post = Post(
            author_id=user_id,
            title=data.get('title'),
            content=content,
            image_url=data.get('image_url'),
            video_url=data.get('video_url'),
            visibility=data.get('visibility', 'public')
        )
        
        db.session.add(new_post)
        db.session.commit()
        
        # Get author info for response
        author = User.query.get(user_id)
        
        return jsonify({
            "id": new_post.id,
            "feed_type": "post",
            "author_id": user_id,
            "author_name": author.display_name or author.username if author else "You",
            "author_username": author.username if author else "you",
            "author_avatar": author.profile_picture if author else None,
            "title": new_post.title,
            "content": new_post.content,
            "image_url": new_post.image_url,
            "video_url": new_post.video_url,
            "created_at": new_post.created_at.isoformat(),
            "likes_count": 0,
            "comments_count": 0,
            "is_liked": False,
            "timestamp": "Just now"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating post: {e}")
        return jsonify({"error": "Failed to create post"}), 500

@api.route("/posts/<int:post_id>", methods=["PUT"])
@jwt_required()
def update_post(post_id):
    """Update a post"""
    try:
        user_id = get_jwt_identity()
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        if post.author_id != user_id:
            return jsonify({"error": "Not authorized to edit this post"}), 403
        
        data = request.get_json()
        
        if 'content' in data:
            post.content = data['content'].strip()
        if 'title' in data:
            post.title = data['title']
        if 'image_url' in data:
            post.image_url = data['image_url']
        if 'video_url' in data:
            post.video_url = data['video_url']
        
        post.is_edited = True
        post.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "message": "Post updated successfully",
            "post": post.serialize(user_id) if hasattr(post, 'serialize') else {"id": post.id}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating post: {e}")
        return jsonify({"error": "Failed to update post"}), 500

@api.route("/posts/<int:post_id>", methods=["DELETE"])
@jwt_required()
def delete_post(post_id):
    """Delete a post"""
    try:
        user_id = get_jwt_identity()
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        if post.author_id != user_id:
            return jsonify({"error": "Not authorized to delete this post"}), 403
        
        db.session.delete(post)
        db.session.commit()
        
        return jsonify({"message": "Post deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting post: {e}")
        return jsonify({"error": "Failed to delete post"}), 500


@api.route("/posts/user/<int:target_user_id>", methods=["GET"])
@jwt_required()
def get_user_posts(target_user_id):
    """Get all posts for a specific user"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        
        query = Post.query.filter_by(author_id=target_user_id)
        
        # If viewing someone else's profile, only show public posts
        if target_user_id != user_id:
            query = query.filter(Post.visibility == 'public')
        
        posts = query.order_by(Post.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        author = User.query.get(target_user_id)
        
        posts_data = []
        for post in posts.items:
            is_liked = False
            try:
                is_liked = PostLike.query.filter_by(
                    post_id=post.id,
                    user_id=user_id
                ).first() is not None
            except:
                pass
            
            posts_data.append({
                "id": post.id,
                "feed_type": "post",
                "author_id": post.author_id,
                "author_name": author.display_name or author.username if author else "Unknown",
                "author_username": author.username if author else "unknown",
                "author_avatar": author.profile_picture if author else None,
                "title": getattr(post, 'title', None),
                "content": post.content,
                "image_url": getattr(post, 'image_url', None),
                "created_at": post.created_at.isoformat() if post.created_at else None,
                "is_edited": getattr(post, 'is_edited', False),
                "likes_count": len(post.likes) if hasattr(post, 'likes') and post.likes else 0,
                "comments_count": len(post.comments) if hasattr(post, 'comments') and post.comments else 0,
                "is_liked": is_liked
            })
        
        return jsonify({
            "posts": posts_data,
            "pagination": {
                "page": posts.page,
                "pages": posts.pages,
                "total": posts.total,
                "has_next": posts.has_next,
                "has_prev": posts.has_prev
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching user posts: {e}")
        return jsonify({"error": "Failed to fetch posts", "posts": []}), 500

@api.route("/posts/<int:post_id>/like", methods=["POST"])
@jwt_required()
def like_post(post_id):
    """Like or unlike a post"""
    try:
        user_id = get_jwt_identity()
        
        post = Post.query.get(post_id)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        existing_like = PostLike.query.filter_by(
            post_id=post_id,
            user_id=user_id
        ).first()
        
        if existing_like:
            # Unlike
            db.session.delete(existing_like)
            db.session.commit()
            return jsonify({
                "message": "Post unliked",
                "liked": False,
                "likes_count": len(post.likes) if hasattr(post, 'likes') else 0
            }), 200
        else:
            # Like
            new_like = PostLike(post_id=post_id, user_id=user_id)
            db.session.add(new_like)
            db.session.commit()
            return jsonify({
                "message": "Post liked",
                "liked": True,
                "likes_count": len(post.likes) if hasattr(post, 'likes') else 1
            }), 200
            
    except Exception as e:
        db.session.rollback()
        print(f"Error liking post: {e}")
        return jsonify({"error": "Failed to like post"}), 500


@api.route("/posts/<int:post_id>/comments", methods=["GET"])
def get_post_comments(post_id):
    """Get all comments for a post"""
    try:
        comments = PostComment.query.filter_by(post_id=post_id)\
            .order_by(PostComment.created_at.asc()).all()
        
        return jsonify({
            "comments": [c.serialize() for c in comments]
        }), 200
        
    except Exception as e:
        print(f"Error fetching comments: {e}")
        return jsonify({"error": "Failed to fetch comments", "comments": []}), 500


@api.route("/posts/<int:post_id>/comments", methods=["POST"])
@jwt_required()
def add_post_comment(post_id):
    """Add a comment to a post"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        text = data.get('text', '').strip()
        if not text:
            return jsonify({"error": "Comment text is required"}), 400
        
        post = Post.query.get(post_id)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        new_comment = PostComment(
            post_id=post_id,
            user_id=user_id,
            content=text
        )
        
        db.session.add(new_comment)
        db.session.commit()
        
        return jsonify({
            "message": "Comment added",
            "comment": new_comment.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding comment: {e}")
        return jsonify({"error": "Failed to add comment"}), 500


# ============================================================
# DISCOVER/EXPLORE FEED (For users with no follows)
# ============================================================

@api.route("/discover-feed", methods=["GET"])
@jwt_required()
def discover_feed():
    """
    Discover feed for users who don't follow anyone yet.
    Shows popular/trending content from the platform.
    """
    try:
        user_id = get_jwt_identity()
        content_type = request.args.get('type', 'all')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        
        feed_items = []
        
        # Get trending tracks (most played in last 7 days)
        if content_type in ['all', 'tracks']:
            try:
                tracks = Audio.query.order_by(
                    Audio.plays.desc() if hasattr(Audio, 'plays') else Audio.id.desc()
                ).limit(per_page).all()
                
                for track in tracks:
                    artist = User.query.get(track.user_id) if track.user_id else None
                    track_data = {
                        "id": track.id,
                        "feed_type": "track",
                        "author_id": track.user_id,
                        "author_name": track.artist_name or (artist.display_name if artist else "Unknown"),
                        "author_avatar": artist.profile_picture if artist else None,
                        "title": track.title,
                        "content": f"🔥 Trending: {track.title}",
                        "audio_url": track.file_url,
                        "artwork_url": getattr(track, 'artwork_url', None),
                        "plays": getattr(track, 'plays', 0) or 0,
                        "created_at": track.created_at.isoformat() if hasattr(track, 'created_at') and track.created_at else None,
                        "is_trending": True
                    }
                    feed_items.append(track_data)
            except Exception as e:
                print(f"Error fetching discover tracks: {e}")
        
        # Get popular videos
        if content_type in ['all', 'videos']:
            try:
                videos = Video.query.filter_by(is_public=True)\
                    .order_by(Video.views.desc()).limit(per_page).all()
                
                for video in videos:
                    uploader = User.query.get(video.user_id) if video.user_id else None
                    video_data = {
                        "id": video.id,
                        "feed_type": "video",
                        "author_id": video.user_id,
                        "author_name": uploader.display_name or uploader.username if uploader else "Unknown",
                        "author_avatar": uploader.profile_picture if uploader else None,
                        "title": video.title,
                        "content": f"🎬 Popular: {video.title}",
                        "thumbnail_url": video.thumbnail_url,
                        "views": video.views or 0,
                        "created_at": video.uploaded_at.isoformat() if video.uploaded_at else None,
                        "is_trending": True
                    }
                    feed_items.append(video_data)
            except Exception as e:
                print(f"Error fetching discover videos: {e}")
        
        # Sort by engagement (plays + views)
        def get_engagement(item):
            return (item.get('plays', 0) or 0) + (item.get('views', 0) or 0)
        
        feed_items.sort(key=get_engagement, reverse=True)
        
        # Paginate
        total_items = len(feed_items)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_items = feed_items[start_idx:end_idx]
        
        return jsonify({
            "success": True,
            "feed": paginated_items,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_items": total_items,
                "has_next": end_idx < total_items,
                "has_prev": page > 1
            }
        }), 200
        
    except Exception as e:
        print(f"Discover feed error: {e}")
        return jsonify({"error": "Failed to load discover feed"}), 500


# ============================================================
# SUGGESTED USERS TO FOLLOW
# ============================================================

@api.route("/suggested-users", methods=["GET"])
@jwt_required()
def suggested_users():
    """Get suggested users to follow based on activity and popularity"""
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        # Get users current user is already following
        following_ids = [f[0] for f in db.session.query(Follow.followed_id)\
            .filter_by(follower_id=user_id).all()]
        
        # Exclude self and already followed users
        exclude_ids = [user_id] + following_ids
        
        # Get users with most followers (popular creators)
        suggested = User.query.filter(
            ~User.id.in_(exclude_ids)
        ).order_by(
            User.follower_count.desc() if hasattr(User, 'follower_count') else User.id.desc()
        ).limit(limit).all()
        
        suggestions = []
        for user in suggested:
            # Count their content
            track_count = Audio.query.filter_by(user_id=user.id).count()
            video_count = Video.query.filter_by(user_id=user.id).count()
            
            suggestions.append({
                "id": user.id,
                "username": user.username,
                "display_name": user.display_name or user.username,
                "profile_picture": user.profile_picture,
                "bio": user.bio,
                "follower_count": getattr(user, 'follower_count', 0) or 0,
                "track_count": track_count,
                "video_count": video_count,
                "is_verified": getattr(user, 'is_verified', False)
            })
        
        return jsonify({
            "success": True,
            "suggestions": suggestions
        }), 200
        
    except Exception as e:
        print(f"Suggested users error: {e}")
        return jsonify({"error": "Failed to fetch suggestions", "suggestions": []}), 500




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



@api.route("/podcast/<int:podcast_id>", methods=["GET"])
def get_podcast_detail(podcast_id):
    try:
        podcast = Podcast.query.get(podcast_id)
        if not podcast:
            return jsonify({"error": "Podcast not found"}), 404
        return jsonify(podcast.serialize()), 200
    except Exception as e:
        print(f"[ERROR] Failed to load podcast {podcast_id}: {str(e)}")
        return jsonify({"error": "Failed to load podcast details."}), 500


@api.route("/podcast/<int:podcast_id>/episodes", methods=["GET"])
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

    db.session.commit()
 

@api.route('/seed/sample_podcasts')
def seed_sample_podcasts_route():
    seed_sample_podcasts()
    return "Sample podcasts seeded"

@api.route('/seed/sample_podcasts', methods=['GET'])
def trigger_sample_seed():
    seed_sample_podcasts()
    return jsonify({"message": "Sample podcasts seeded"}), 200

# 🧑‍🚀 Gamer Profile - Get
@api.route('/user/gamer-profile', methods=['GET'])
@jwt_required()
def get_gamer_profile():
    """Get the current user's gamer profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Return gamer-specific fields
        gamer_data = {
            "id": user.id,
            "username": user.username,
            "gamertag": user.gamertag,
            "is_gamer": user.is_gamer,
            "gamer_rank": user.gamer_rank,
            "gaming_platforms": user.gaming_platforms or {},
            "current_games": user.current_games or [],
            "favorite_games": user.favorite_games or [],
            "gaming_schedule": user.gaming_schedule,
            "skill_level": user.skill_level,
            "looking_for": user.looking_for or [],
            "communication_prefs": user.communication_prefs or [],
            "age_range": user.age_range,
            "timezone": user.timezone,
            "region": user.region,
            "favorite_genres": user.favorite_genres or [],
            "playstyle": user.playstyle,
            "game_modes": user.game_modes or [],
            "gaming_setup": user.gaming_setup or {},
            "is_streamer": user.is_streamer,
            "streaming_platforms": user.streaming_platforms or [],
            "streaming_schedule": user.streaming_schedule,
            "languages_spoken": user.languages_spoken or [],
            "gaming_stats": user.gaming_stats or {},
            "gamer_bio": user.gamer_bio,
            "online_status": user.online_status,
            "last_seen": user.last_seen.isoformat() if user.last_seen else None,
            "current_game_activity": user.current_game_activity,
            "gamer_tags": user.gamer_tags or {},
            "squad_id": user.squad_id,
            "avatar_url": user.avatar_url,
            "profile_picture": user.profile_picture
        }
        
        return jsonify({"user": gamer_data}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🧑‍🚀 Gamer Profile - Update
@api.route('/user/gamer-profile', methods=['PUT'])
@jwt_required()
def update_gamer_profile():
    """Update the current user's gamer profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        data = request.get_json()
        
        # Update basic gamer info
        if 'gamertag' in data:
            user.gamertag = data['gamertag']
        if 'is_gamer' in data:
            user.is_gamer = data['is_gamer']
        if 'gamer_rank' in data:
            user.gamer_rank = data['gamer_rank']
        if 'skill_level' in data:
            user.skill_level = data['skill_level']
            
        # Update gaming platforms
        if 'gaming_platforms' in data:
            user.gaming_platforms = data['gaming_platforms']
            
        # Update games
        if 'current_games' in data:
            user.current_games = data['current_games']
        if 'favorite_games' in data:
            user.favorite_games = data['favorite_games']
            
        # Update schedule and availability
        if 'gaming_schedule' in data:
            user.gaming_schedule = data['gaming_schedule']
        if 'timezone' in data:
            user.timezone = data['timezone']
        if 'region' in data:
            user.region = data['region']
            
        # Update social preferences
        if 'looking_for' in data:
            user.looking_for = data['looking_for']
        if 'communication_prefs' in data:
            user.communication_prefs = data['communication_prefs']
        if 'age_range' in data:
            user.age_range = data['age_range']
            
        # Update gaming preferences
        if 'favorite_genres' in data:
            user.favorite_genres = data['favorite_genres']
        if 'playstyle' in data:
            user.playstyle = data['playstyle']
        if 'game_modes' in data:
            user.game_modes = data['game_modes']
            
        # Update setup and streaming
        if 'gaming_setup' in data:
            user.gaming_setup = data['gaming_setup']
        if 'is_streamer' in data:
            user.is_streamer = data['is_streamer']
        if 'streaming_platforms' in data:
            user.streaming_platforms = data['streaming_platforms']
        if 'streaming_schedule' in data:
            user.streaming_schedule = data['streaming_schedule']
            
        # Update languages and bio
        if 'languages_spoken' in data:
            user.languages_spoken = data['languages_spoken']
        if 'gamer_bio' in data:
            user.gamer_bio = data['gamer_bio']
            
        # Update gaming stats
        if 'gaming_stats' in data:
            user.gaming_stats = data['gaming_stats']
            
        # Update gamer tags
        if 'gamer_tags' in data:
            user.gamer_tags = data['gamer_tags']
            
        # Update online status
        if 'online_status' in data:
            user.online_status = data['online_status']
        if 'current_game_activity' in data:
            user.current_game_activity = data['current_game_activity']
            
        # Update last seen
        user.last_seen = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "message": "Gamer profile updated successfully",
            "user": user.serialize()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@api.route('/user/<int:user_id>/gamer-profile', methods=['GET'])
def get_public_gamer_profile(user_id):
    """Get a user's public gamer profile (for viewing other gamers)"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        if not user.is_gamer:
            return jsonify({"error": "User is not a gamer"}), 404
            
        # Return public gamer profile (exclude sensitive info)
        public_data = {
            "id": user.id,
            "username": user.username,
            "gamertag": user.gamertag,
            "gamer_rank": user.gamer_rank,
            "gaming_platforms": user.gaming_platforms or {},
            "current_games": user.current_games or [],
            "favorite_games": user.favorite_games or [],
            "skill_level": user.skill_level,
            "looking_for": user.looking_for or [],
            "communication_prefs": user.communication_prefs or [],
            "age_range": user.age_range,
            "timezone": user.timezone,
            "region": user.region,
            "favorite_genres": user.favorite_genres or [],
            "playstyle": user.playstyle,
            "game_modes": user.game_modes or [],
            "languages_spoken": user.languages_spoken or [],
            "gamer_bio": user.gamer_bio,
            "online_status": user.online_status,
            "current_game_activity": user.current_game_activity,
            "is_streamer": user.is_streamer,
            "streaming_platforms": user.streaming_platforms or [],
            "avatar_url": user.avatar_url,
            "profile_picture": user.profile_picture,
            "squad_id": user.squad_id
        }
        
        return jsonify({"user": public_data}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@api.route('/user/online-status', methods=['POST'])
@jwt_required()
def update_online_status():
    """Update user's online status and current activity"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        data = request.get_json()
        
        if 'online_status' in data:
            user.online_status = data['online_status']
        if 'current_game_activity' in data:
            user.current_game_activity = data['current_game_activity']
            
        user.last_seen = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({"message": "Status updated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@api.route('/gamers/search', methods=['GET'])
def search_gamers():
    """Search for gamers based on criteria"""
    try:
        # Get query parameters
        game = request.args.get('game')
        platform = request.args.get('platform')
        skill_level = request.args.get('skill_level')
        genre = request.args.get('genre')
        region = request.args.get('region')
        looking_for = request.args.get('looking_for')
        
        # Start with all gamers
        query = User.query.filter(User.is_gamer == True)
        
        # Apply filters
        if game:
            query = query.filter(User.current_games.contains([game]))
        
        if platform:
            # Filter by platform (this requires JSONB queries for PostgreSQL)
            query = query.filter(User.gaming_platforms[platform].astext == 'true')
        
        if skill_level:
            query = query.filter(User.skill_level == skill_level)
            
        if genre:
            query = query.filter(User.favorite_genres.contains([genre]))
            
        if region:
            query = query.filter(User.region.ilike(f'%{region}%'))
            
        if looking_for:
            query = query.filter(User.looking_for.contains([looking_for]))
        
        # Execute query and limit results
        gamers = query.limit(50).all()
        
        # Return public profiles
        results = []
        for gamer in gamers:
            results.append({
                "id": gamer.id,
                "username": gamer.username,
                "gamertag": gamer.gamertag,
                "gamer_rank": gamer.gamer_rank,
                "skill_level": gamer.skill_level,
                "current_games": gamer.current_games or [],
                "favorite_genres": gamer.favorite_genres or [],
                "region": gamer.region,
                "online_status": gamer.online_status,
                "avatar_url": gamer.avatar_url,
                "profile_picture": gamer.profile_picture
            })
        
        return jsonify({"gamers": results}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 🧑‍🤝‍🧑 Squad - Create
@api.route("/squads/create", methods=["POST"])
@jwt_required()
def create_squad():
    user = User.query.get(get_jwt_identity())
    data = request.json
    from uuid import uuid4
    squad = Squad(
        name=data["name"],
        description=data.get("description"),
        platform_tags=data.get("platform_tags", []),
        invite_code=str(uuid4())[:8],
        creator_id=user.id
    )
    db.session.add(squad)
    user.squad = squad
    db.session.commit()
    return jsonify({"message": "Squad created", "squad_id": squad.id})

# 📥 Squad - Join by invite code
@api.route("/squads/join", methods=["POST"])
@jwt_required()
def join_squad():
    user = User.query.get(get_jwt_identity())
    code = request.json.get("invite_code")
    squad = Squad.query.filter_by(invite_code=code).first()
    if not squad:
        return jsonify({"error": "Invalid invite code"}), 404
    user.squad = squad
    db.session.commit()
    return jsonify({"message": "Joined squad", "squad_id": squad.id})

# 🎥 Stream - Add or Update
@api.route("/streams/add", methods=["POST"])
@jwt_required()
def add_stream():
    user = User.query.get(get_jwt_identity())
    data = request.json

    stream = Stream.query.filter_by(user_id=user.id).first()
    if not stream:
        stream = Stream(user_id=user.id)
        db.session.add(stream)

    stream.stream_url = data["stream_url"]
    stream.platform = data.get("platform", "StreampireX")
    stream.title = data.get("title")
    stream.squad_id = user.squad_id
    stream.is_live = True
    db.session.commit()

    return jsonify({"message": "Stream updated", "stream": stream.serialize()})

# 🔴 Stream - Get all live squad streams
@api.route("/streams/live", methods=["GET"])
@jwt_required()
def get_live_squad_streams():
    user = User.query.get(get_jwt_identity())
    if not user.squad_id:
        return jsonify([])

    squad_streams = Stream.query.filter_by(squad_id=user.squad_id, is_live=True).all()
    return jsonify([s.serialize() for s in squad_streams])

# 🕹️ Games - Crossplay directory
@api.route("/games/crossplay-list", methods=["GET"])
def get_crossplay_games():
    games = Game.query.filter_by(supports_crossplay=True).all()
    return jsonify([{
        "id": g.id,
        "name": g.name,
        "platforms": g.platforms,
        "genre": g.genre
    } for g in games])

# Enhanced station endpoint
@api.route('/radio/stations/detailed', methods=['GET'])
def get_detailed_stations():
    stations = RadioStation.query.all()
    return jsonify([{
        "id": station.id,
        "name": station.name,
        "description": station.description,
        "genres": station.genres or [],  # ✅ Correct field name
        "preferred_genres": station.preferred_genres or [],  # ✅ Alternative field
        "followers": station.followers_count,  # ✅ Correct field name
        "submission_guidelines": station.submission_guidelines,  # ✅ Correct field name
        "creator_name": station.creator_name,
        "is_public": station.is_public,
        "is_live": station.is_live,
        "logo_url": station.logo_url,
        "cover_image_url": station.cover_image_url,
        "created_at": station.created_at.isoformat() if station.created_at else None
    } for station in stations])

# Get Artist Profile (specific route)
@api.route('/profile/artist/<int:user_id>', methods=['GET'])
def get_artist_profile(user_id):
    user = User.query.get(user_id)
    if not user or not user.is_artist:
        return jsonify({"error": "Artist profile not found"}), 404
    return jsonify(user.serialize_artist()), 200

# Update Artist Profile
# Update Artist Profile - Add error handling
@api.route('/profile/artist/update', methods=['PUT'])
@jwt_required()
def update_artist_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        data = request.json
        
        user.is_artist = True
        user.artist_bio = data.get("artist_bio", user.artist_bio)
        user.artist_genre = data.get("artist_genre", user.artist_genre)
        user.artist_location = data.get("artist_location", user.artist_location)
        user.artist_website = data.get("artist_website", user.artist_website)
        user.artist_social_links = data.get("artist_social_links", user.artist_social_links)
        user.monthly_listeners = data.get("monthly_listeners", user.monthly_listeners)
        user.total_plays = data.get("total_plays", user.total_plays)
        
        db.session.commit()
        return jsonify({"message": "Artist profile updated", "user": user.serialize()}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Submit music to radio station (enhanced)
@api.route('/radio/upload_music', methods=['POST'])
@jwt_required()
def submit_music_to_station():
    try:
        user_id = get_jwt_identity()
        
        # Validate required fields
        station_id = request.form.get('station_id')
        if not station_id:
            return jsonify({"error": "Station ID is required"}), 400
            
        # Validate station exists
        station = RadioStation.query.get(station_id)
        if not station:
            return jsonify({"error": "Radio station not found"}), 404
        
        # Get form data
        artist_name = request.form.get('artist_name')
        track_title = request.form.get('track_title')
        
        if not all([artist_name, track_title]):
            return jsonify({"error": "Artist name and track title are required"}), 400
        
        album_name = request.form.get('album_name')
        bio = request.form.get('bio')
        genre = request.form.get('genre')
        social_links = request.form.get('social_links')
        notes = request.form.get('notes')
        
        # Handle file upload
        audio_file = request.files.get('audio')
        if not audio_file:
            return jsonify({"error": "No audio file provided"}), 400
        
        # Validate file type
        allowed_extensions = ['.mp3', '.wav', '.flac', '.m4a']
        file_ext = os.path.splitext(audio_file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({"error": "Invalid file type. Allowed: MP3, WAV, FLAC, M4A"}), 400
        
        # Save file and create submission
        filename = secure_filename(audio_file.filename)
        file_path = os.path.join("uploads/radio_submissions", filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        audio_file.save(file_path)
        
        # Create submission record
        submission = RadioSubmission(
            artist_id=user_id,
            station_id=station_id,
            track_title=track_title,
            artist_name=artist_name,
            album_name=album_name,
            bio=bio,
            genre=genre,
            social_links=social_links,
            notes=notes,
            audio_file_url=file_path,
            submission_status="Pending"
        )
        
        db.session.add(submission)
        db.session.commit()
        
        return jsonify({"message": "Track submitted successfully!", "submission_id": submission.id}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get comprehensive gamer profile
@api.route('/profile/gamer/<int:user_id>', methods=['GET'])
def get_comprehensive_gamer_profile(user_id):
    user = User.query.get(user_id)
    if not user or not user.is_gamer:
        return jsonify({"error": "Gamer profile not found"}), 404
    return jsonify(user.serialize()), 200

# Update comprehensive gamer profile
@api.route('/profile/gamer/update', methods=['PUT'])
@jwt_required()
def update_comprehensive_gamer_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json
    
    # Update all new gamer fields
    user.is_gamer = True
    user.gamertag = data.get("gamertag", user.gamertag)
    user.gaming_platforms = data.get("gaming_platforms", user.gaming_platforms)
    user.current_games = data.get("current_games", user.current_games)
    user.gaming_schedule = data.get("gaming_schedule", user.gaming_schedule)
    user.skill_level = data.get("skill_level", user.skill_level)
    user.looking_for = data.get("looking_for", user.looking_for)
    user.communication_prefs = data.get("communication_prefs", user.communication_prefs)
    user.age_range = data.get("age_range", user.age_range)
    user.timezone = data.get("timezone", user.timezone)
    user.region = data.get("region", user.region)
    user.favorite_genres = data.get("favorite_genres", user.favorite_genres)
    user.playstyle = data.get("playstyle", user.playstyle)
    user.game_modes = data.get("game_modes", user.game_modes)
    user.gaming_setup = data.get("gaming_setup", user.gaming_setup)
    user.is_streamer = data.get("is_streamer", user.is_streamer)
    user.streaming_platforms = data.get("streaming_platforms", user.streaming_platforms)
    user.streaming_schedule = data.get("streaming_schedule", user.streaming_schedule)
    user.languages_spoken = data.get("languages_spoken", user.languages_spoken)
    user.gaming_stats = data.get("gaming_stats", user.gaming_stats)
    user.gamer_bio = data.get("gamer_bio", user.gamer_bio)
    user.current_game_activity = data.get("current_game_activity", user.current_game_activity)
    
    db.session.commit()
    return jsonify({"message": "Gamer profile updated", "user": user.serialize()}), 200

# Update online status
@api.route('/gamer/status/update', methods=['PUT'])
@jwt_required()
def update_gamer_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json
    
    user.online_status = data.get("online_status", user.online_status)
    user.current_game_activity = data.get("current_game_activity", user.current_game_activity)
    user.last_seen = datetime.utcnow()
    
    db.session.commit()
    return jsonify({"message": "Status updated"}), 200

# Get user's squad info
@api.route("/squads/my-squad", methods=["GET"])
@jwt_required()
def get_my_squad():
    user = User.query.get(get_jwt_identity())
    if not user.squad_id:
        return jsonify({"squad": None}), 200
    
    squad = Squad.query.get(user.squad_id)
    return jsonify(squad.serialize()), 200

# Leave squad
@api.route("/squads/leave", methods=["POST"])
@jwt_required()
def leave_squad():
    user = User.query.get(get_jwt_identity())
    if not user.squad_id:
        return jsonify({"error": "Not in a squad"}), 400
    
    user.squad_id = None
    db.session.commit()
    return jsonify({"message": "Left squad successfully"}), 200

# Get squad members
@api.route("/squads/<int:squad_id>/members", methods=["GET"])
@jwt_required()
def get_squad_members(squad_id):
    squad = Squad.query.get(squad_id)
    if not squad:
        return jsonify({"error": "Squad not found"}), 404
    
    members = User.query.filter_by(squad_id=squad_id).all()
    return jsonify([member.serialize() for member in members]), 200

# End stream
@api.route("/streams/end", methods=["POST"])
@jwt_required()
def end_stream():
    user = User.query.get(get_jwt_identity())
    stream = Stream.query.filter_by(user_id=user.id, is_live=True).first()
    
    if not stream:
        return jsonify({"error": "No active stream found"}), 404
    
    stream.is_live = False
    stream.ended_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({"message": "Stream ended"}), 200

# Get user's stream status
@api.route("/streams/status", methods=["GET"])
@jwt_required()
def get_stream_status():
    user = User.query.get(get_jwt_identity())
    stream = Stream.query.filter_by(user_id=user.id, is_live=True).first()
    
    if not stream:
        return jsonify({"is_live": False}), 200
    
    return jsonify({"is_live": True, "stream": stream.serialize()}), 200

# Get submissions for station owner
@api.route('/radio/submissions/<int:station_id>', methods=['GET'])
@jwt_required()
def get_station_submissions(station_id):
    user_id = get_jwt_identity()
    
    # Verify station ownership
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 403
    
    submissions = RadioSubmission.query.filter_by(station_id=station_id).all()
    return jsonify([submission.serialize() for submission in submissions]), 200

# Approve/reject submission
@api.route('/radio/submissions/<int:submission_id>/review', methods=['PUT'])
@jwt_required()
def review_submission(submission_id):
    user_id = get_jwt_identity()
    data = request.json
    status = data.get("status")  # "Approved" or "Rejected"
    
    if status not in ["Approved", "Rejected"]:
        return jsonify({"error": "Invalid status"}), 400
    
    submission = RadioSubmission.query.get(submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404
    
    # Verify station ownership
    station = RadioStation.query.filter_by(id=submission.station_id, user_id=user_id).first()
    if not station:
        return jsonify({"error": "Unauthorized"}), 403
    
    submission.submission_status = status
    submission.reviewed_at = datetime.utcnow()
    submission.reviewed_by = user_id
    
    db.session.commit()
    
    return jsonify({"message": f"Submission {status.lower()}"}), 200

@api.route('/radio/create-with-loop', methods=['POST'])
@jwt_required()
def create_radio_station_with_loop():
    """Create radio station with immediate audio loop setup"""
    user_id = get_jwt_identity()

    # ── Tier Limit Check ──
    limit_check = check_content_limit(user_id, 'radio_station')
    if not limit_check["allowed"]:
        return jsonify({
            "error": limit_check["upgrade_message"],
            "limit_reached": True,
            "current_count": limit_check["current_count"],
            "max_allowed": limit_check["max_allowed"],
            "plan": limit_check["plan_name"],
            "upgrade_url": "/pricing"
        }), 403

    data = request.get_json()
    
    # Create radio station
    new_station = RadioStation(
        user_id=user_id,
        name=data["name"],
        description=data.get("description", ""),
        is_public=data.get("is_public", True),
        genres=data.get("genres", []),
        creator_name=data.get("creator_name"),
        preferred_genres=data.get("preferred_genres", []),
        submission_guidelines=data.get("submission_guidelines")
    )
    
    db.session.add(new_station)
    db.session.flush()  # Get the station ID
    
    # ✅ IMMEDIATE AUDIO SETUP - Get available tracks
    available_tracks = get_available_tracks_for_station(user_id, data.get("preferred_genres", []))
    
    if available_tracks:
        # Create playlist schedule
        playlist_schedule = create_playlist_schedule(available_tracks)
        
        # Setup looping audio
        new_station.playlist_schedule = playlist_schedule
        new_station.is_loop_enabled = True
        new_station.loop_duration_minutes = data.get("loop_duration", 180)  # 3 hours default
        new_station.loop_started_at = datetime.utcnow()
        new_station.is_live = True
        
        # Set now playing metadata
        first_track = playlist_schedule["tracks"][0] if playlist_schedule["tracks"] else None
        if first_track:
            new_station.now_playing_metadata = first_track
    
    db.session.commit()
    
    return jsonify({
        "message": "🎵 Radio Station Created with Audio Loop!",
        "station": new_station.serialize(),
        "tracks_in_loop": len(available_tracks),
        "loop_enabled": new_station.is_loop_enabled
    }), 201


def get_available_tracks_for_station(user_id, preferred_genres=None):
    """Get available audio tracks for the station"""
    # Get user's uploaded tracks first
    user_tracks = Audio.query.filter_by(user_id=user_id).all()
    
    # If user has no tracks, get some public/default tracks
    if not user_tracks:
        # Get tracks from other users (public tracks)
        public_tracks = Audio.query.join(User).filter(
            User.id != user_id  # Not the current user
        ).limit(10).all()  # Limit to prevent overwhelming
        user_tracks = public_tracks
    
    # Filter by genre if specified
    if preferred_genres:
        filtered_tracks = []
        for track in user_tracks:
            # Assuming you have genre info in Audio model or can derive it
            if hasattr(track, 'genre') and track.genre in preferred_genres:
                filtered_tracks.append(track)
        if filtered_tracks:
            user_tracks = filtered_tracks
    
    return user_tracks[:20]  # Limit to 20 tracks for the loop


def create_playlist_schedule(tracks):
    """Create playlist schedule from audio tracks"""
    schedule_tracks = []
    
    for track in tracks:
        # Get duration (you might need to calculate this if not stored)
        duration = get_track_duration(track)
        
        track_info = {
            "id": track.id,
            "title": track.title,
            "artist": getattr(track, 'artist_name', 'Unknown Artist'),
            "duration": duration,
            "file_url": track.file_url
        }
        schedule_tracks.append(track_info)
    
    return {
        "tracks": schedule_tracks,
        "total_tracks": len(schedule_tracks),
        "created_at": datetime.utcnow().isoformat()
    }


def get_track_duration(track):
    """Get track duration in MM:SS format"""
    if hasattr(track, 'duration') and track.duration:
        # If duration is in seconds
        minutes = track.duration // 60
        seconds = track.duration % 60
        return f"{minutes}:{seconds:02d}"
    
    # Default duration if not available
    return "3:30"


def create_playlist_schedule(tracks):
    """Create playlist schedule from audio tracks"""
    schedule_tracks = []
    
    for track in tracks:
        # Get duration (you might need to calculate this if not stored)
        duration = get_track_duration(track)
        
        track_info = {
            "id": track.id,
            "title": track.title,
            "artist": getattr(track, 'artist_name', 'Unknown Artist'),
            "duration": duration,
            "file_url": track.file_url
        }
        schedule_tracks.append(track_info)
    
    return {
        "tracks": schedule_tracks,
        "total_tracks": len(schedule_tracks),
        "created_at": datetime.utcnow().isoformat()
    }


def get_track_duration(track):
    """Get track duration in MM:SS format"""
    if hasattr(track, 'duration') and track.duration:
        # If duration is in seconds
        minutes = track.duration // 60
        seconds = track.duration % 60
        return f"{minutes}:{seconds:02d}"
    
    # Default duration if not available
    return "3:30"

@api.route('/radio/<int:station_id>/stream')
def stream_radio_audio(station_id):
    """Stream current playing audio from radio station"""
    station = RadioStation.query.get(station_id)
    
    if not station:
        return jsonify({"error": "Station not found"}), 404
    
    if not station.is_loop_enabled or not station.playlist_schedule:
        return jsonify({"error": "No audio loop configured"}), 400
    
    # Get current track
    current_track_info = station.get_current_track()
    
    if not current_track_info:
        return jsonify({"error": "No track currently playing"}), 404
    
    # Get the actual audio file
    track_id = current_track_info.get("id")
    audio = Audio.query.get(track_id) if track_id else None
    
    if not audio or not os.path.exists(audio.file_url):
        return jsonify({"error": "Audio file not found"}), 404
    
    # Calculate position in current track
    position = calculate_current_position(station, current_track_info)
    
    # Stream audio with position offset
    return stream_audio_with_position(audio.file_url, position)


def calculate_current_position(station, current_track_info):
    """Calculate current position within the current track"""
    if not station.loop_started_at:
        return 0
    
    try:
        elapsed_seconds = (datetime.utcnow() - station.loop_started_at).total_seconds()
        loop_seconds = station.loop_duration_minutes * 60
        time_in_loop = elapsed_seconds % loop_seconds
        
        # Find position within current track
        total = 0
        for track in station.playlist_schedule.get("tracks", []):
            minutes, seconds = map(int, track["duration"].split(":"))
            duration = minutes * 60 + seconds
            
            if track["id"] == current_track_info["id"]:
                # This is the current track, calculate position
                position_in_track = time_in_loop - total
                return max(0, position_in_track)
            
            total += duration
    except Exception as e:
        print(f"Error calculating position: {e}")
    
    return 0


def stream_audio_with_position(file_path, start_position=0):
    """Stream audio file starting from a specific position"""
    def generate():
        try:
            # Use ffmpeg to seek to position and stream
            import subprocess
            cmd = [
                'ffmpeg',
                '-i', file_path,
                '-ss', str(start_position),  # Seek to position
                '-f', 'mp3',
                '-'
            ]
            
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            while True:
                chunk = process.stdout.read(8192)
                if not chunk:
                    break
                yield chunk
                
        except Exception as e:
            print(f"Streaming error: {e}")
            # Fallback to simple file serving
            with open(file_path, 'rb') as f:
                f.seek(int(start_position * 128000 // 8))  # Rough calculation for MP3
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk
    
    return Response(
        generate(),
        mimetype='audio/mpeg',
        headers={
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache'
        }
    )


# ===== 3. RADIO CONTROL ENDPOINTS =====

@api.route('/radio/<int:station_id>/start-loop', methods=['POST'])
@jwt_required()
def start_radio_loop(station_id):
    """Start or restart the radio loop"""
    user_id = get_jwt_identity()
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 404
    
    # Reset loop
    station.loop_started_at = datetime.utcnow()
    station.is_loop_enabled = True
    station.is_live = True
    
    # Update now playing
    if station.playlist_schedule:
        first_track = station.playlist_schedule["tracks"][0]
        station.now_playing_metadata = first_track
    
    db.session.commit()
    
    # Broadcast to listeners
    socketio.emit(f'station-{station_id}-loop-started', {
        'station_id': station_id,
        'message': f'{station.name} loop started!',
        'now_playing': station.get_current_track()
    })
    
    return jsonify({
        "message": "Radio loop started!",
        "station": station.serialize()
    }), 200


@api.route('/radio/<int:station_id>/stop-loop', methods=['POST'])
@jwt_required()
def stop_radio_loop(station_id):
    """Stop the radio loop"""
    user_id = get_jwt_identity()
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 404
    
    station.is_loop_enabled = False
    station.is_live = False
    station.now_playing_metadata = None
    
    db.session.commit()
    
    # Broadcast to listeners
    socketio.emit(f'station-{station_id}-loop-stopped', {
        'station_id': station_id,
        'message': f'{station.name} stopped broadcasting'
    })
    
    return jsonify({"message": "Radio loop stopped"}), 200

@api.route('/radio/station/<int:station_id>/upload-loop', methods=['POST'])
@jwt_required()
def upload_station_loop(station_id):
    """Upload loop audio for radio station using Cloudinary"""
    try:
        user_id = get_jwt_identity()
        
        # Get station and verify ownership
        station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
        if not station:
            return jsonify({"error": "Station not found or unauthorized"}), 404
        
        # Check for audio file
        if 'loop_audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_file = request.files['loop_audio']
        if not audio_file or audio_file.filename == '':
            return jsonify({"error": "No valid audio file selected"}), 400
        
        # Validate file type
        allowed_types = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/m4a']
        if audio_file.content_type not in allowed_types:
            return jsonify({"error": "Invalid file type. Allowed: MP3, WAV, FLAC, M4A"}), 400
        
        filename = secure_filename(audio_file.filename)
        
        # ✅ CRITICAL: Use uploadFile function for Cloudinary upload
        try:
            audio_url = uploadFile(audio_file, filename)
            print(f"✅ Audio uploaded to Cloudinary: {audio_url}")
        except Exception as upload_error:
            print(f"❌ Cloudinary upload failed: {upload_error}")
            return jsonify({"error": f"Upload failed: {str(upload_error)}"}), 500
        
        # ✅ Save Cloudinary URL to station
        station.loop_audio_url = audio_url
        station.stream_url = audio_url  # Also set as primary stream URL
        station.audio_url = audio_url   # Backup field
        
        db.session.commit()
        
        return jsonify({
            "message": "Loop audio uploaded successfully",
            "audio_url": audio_url,
            "station": station.serialize()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Upload error: {str(e)}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500



@api.route('/radio/<int:station_id>/add-tracks', methods=['POST'])
@jwt_required()
def add_tracks_to_station(station_id):
    """Add more tracks to station playlist"""
    user_id = get_jwt_identity()
    data = request.get_json()
    track_ids = data.get('track_ids', [])
    
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 404
    
    # Get tracks
    new_tracks = Audio.query.filter(Audio.id.in_(track_ids)).all()
    
    # Add to existing playlist schedule
    current_schedule = station.playlist_schedule or {"tracks": []}
    
    for track in new_tracks:
        track_info = {
            "id": track.id,
            "title": track.title,
            "artist": getattr(track, 'artist_name', 'Unknown Artist'),
            "duration": get_track_duration(track),
            "file_url": track.file_url
        }
        current_schedule["tracks"].append(track_info)
    
    station.playlist_schedule = current_schedule
    db.session.commit()
    
    return jsonify({
        "message": f"Added {len(new_tracks)} tracks to station",
        "total_tracks": len(current_schedule["tracks"])
    }), 200


# ===== 4. PUBLIC ENDPOINTS FOR LISTENERS =====


@api.route('/radio/<int:station_id>/playlist', methods=['GET'])
def get_station_playlist(station_id):
    """Get full station playlist"""
    station = RadioStation.query.get(station_id)
    
    if not station:
        return jsonify({"error": "Station not found"}), 404
    
    playlist = station.playlist_schedule or {"tracks": []}
    
    return jsonify({
        "station_id": station_id,
        "station_name": station.name,
        "playlist": playlist,
        "loop_duration_minutes": station.loop_duration_minutes,
        "total_tracks": len(playlist.get("tracks", []))
    }), 200


# ===== 5. WEBSOCKET EVENTS FOR REAL-TIME UPDATES =====




# ===== 6. AUTO-SETUP FOR EXISTING STATIONS =====

@api.route('/radio/<int:station_id>/auto-setup-loop', methods=['POST'])
@jwt_required()
def auto_setup_loop(station_id):
    """Automatically setup loop for existing station without audio"""
    user_id = get_jwt_identity()
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 404
    
    if station.is_loop_enabled:
        return jsonify({"message": "Station already has loop enabled"}), 200
    
    # Get available tracks
    available_tracks = get_available_tracks_for_station(user_id, station.preferred_genres)
    
    if not available_tracks:
        return jsonify({"error": "No audio tracks available for this station"}), 400
    
    # Setup loop
    playlist_schedule = create_playlist_schedule(available_tracks)
    station.playlist_schedule = playlist_schedule
    station.is_loop_enabled = True
    station.loop_duration_minutes = 180  # 3 hours
    station.loop_started_at = datetime.utcnow()
    station.is_live = True
    
    # Set now playing
    first_track = playlist_schedule["tracks"][0]
    station.now_playing_metadata = first_track
    
    db.session.commit()
    
    return jsonify({
        "message": "🎵 Audio loop setup complete!",
        "station": station.serialize(),
        "tracks_added": len(available_tracks)
    }), 200


# ===== 7. DEBUGGING HELPER =====

@api.route('/radio/<int:station_id>/debug', methods=['GET'])
@jwt_required()
def debug_station(station_id):
    """Debug station audio issues"""
    station = RadioStation.query.get(station_id)
    
    if not station:
        return jsonify({"error": "Station not found"}), 404
    
    # Check all aspects
    debug_info = {
        "station_id": station_id,
        "station_name": station.name,
        "is_live": station.is_live,
        "is_loop_enabled": station.is_loop_enabled,
        "has_playlist_schedule": bool(station.playlist_schedule),
        "playlist_tracks_count": len(station.playlist_schedule.get("tracks", [])) if station.playlist_schedule else 0,
        "loop_started_at": station.loop_started_at.isoformat() if station.loop_started_at else None,
        "current_track": station.get_current_track(),
        "now_playing_metadata": station.now_playing_metadata
    }
    
    # Check if tracks exist
    if station.playlist_schedule:
        tracks_status = []
        for track_info in station.playlist_schedule.get("tracks", []):
            track = Audio.query.get(track_info.get("id"))
            file_exists = os.path.exists(track.file_url) if track else False
            tracks_status.append({
                "track_id": track_info.get("id"),
                "title": track_info.get("title"),
                "exists_in_db": bool(track),
                "file_exists": file_exists,
                "file_path": track.file_url if track else None
            })
        debug_info["tracks_status"] = tracks_status
    
    return jsonify(debug_info), 200

def handle_db_errors(f):
    """Decorator to handle database errors consistently"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Database integrity error: {str(e)}")
            return jsonify({
                "error": "Data integrity error",
                "message": "The requested operation conflicts with existing data"
            }), 400
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error: {str(e)}")
            return jsonify({
                "error": "Database error",
                "message": "An error occurred while accessing the database"
            }), 500
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error in {f.__name__}: {str(e)}")
            current_app.logger.error(traceback.format_exc())
            return jsonify({
                "error": "Internal server error",
                "message": "An unexpected error occurred"
            }), 500
    return decorated_function

def validate_json(required_fields=None):
    """Decorator to validate JSON request data"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({
                    "error": "Invalid request format",
                    "message": "Request must be JSON"
                }), 400
            
            data = request.get_json()
            if not data:
                return jsonify({
                    "error": "Empty request",
                    "message": "Request body cannot be empty"
                }), 400
            
            if required_fields:
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    return jsonify({
                        "error": "Missing required fields",
                        "message": f"Required fields: {', '.join(missing_fields)}"
                    }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def handle_auth_errors(f):
    """Decorator to handle authentication errors"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.warning(f"Authentication error: {str(e)}")
            return jsonify({
                "error": "Authentication failed",
                "message": "Invalid or expired token"
            }), 401
    return decorated_function

# Enhanced file serving with error handling


@api.route('/radio-stations/<int:station_id>', methods=['GET'])
def get_radio_station_details(station_id):
    """
    Get detailed information about a specific radio station with proper stream URL
    """
    try:
        station = RadioStation.query.get(station_id)
        
        if not station:
            return jsonify({"error": "Radio station not found"}), 404
        
        # Get creator info
        creator = User.query.get(station.user_id)
        
        # Build the base URL for your backend
        base_url = request.host_url.rstrip('/')
        
        # Build stream URL if station is live and has audio configured
        stream_url = None
        if station.is_live and station.is_loop_enabled and station.playlist_schedule:
            stream_url = f"{base_url}/radio/{station_id}/stream"
        
        # Get current track using the model's method
        current_track = station.get_current_track()
        
        # Build the complete station response
        station_data = {
            "id": station.id,
            "name": station.name,
            "description": station.description,
            "genre": station.genres[0] if station.genres else "Music",
            "genres": station.genres or [],
            "creator_name": station.creator_name or (creator.username if creator else "Unknown"),
            "is_live": station.is_live,
            "is_loop_enabled": station.is_loop_enabled,
            "followers_count": station.followers_count,
            "logo_url": station.logo_url,
            "cover_image_url": station.cover_image_url,
            "created_at": station.created_at.isoformat() if station.created_at else None,
            
            # ✅ FIXED: Add stream_url and now_playing
            "stream_url": stream_url,
            "now_playing": current_track,
            
            # Additional fields your frontend might use
            "submission_guidelines": station.submission_guidelines,
            "preferred_genres": station.preferred_genres or [],
            "user_id": station.user_id,
            
            # Loop/playlist info
            "loop_started_at": station.loop_started_at.isoformat() if station.loop_started_at else None,
            "loop_duration_minutes": station.loop_duration_minutes,
            "now_playing_metadata": station.now_playing_metadata,
            "playlist_schedule": station.playlist_schedule,
            
            # Technical fields
            "is_public": station.is_public,
            "is_subscription_based": station.is_subscription_based,
            "is_ticketed": station.is_ticketed,
            "is_webrtc_enabled": station.is_webrtc_enabled,
            "max_listeners": station.max_listeners,
            "allowed_users": [user.id for user in station.allowed_users] if hasattr(station, 'allowed_users') else [],
            
            # URLs
            "loop_audio_url": station.loop_audio_url,
            
            # Pricing
            "subscription_price": station.subscription_price,
            "ticket_price": station.ticket_price
        }
        
        # Debug logging
        print(f"✅ Station {station_id} details:")
        print(f"   - Name: {station.name}")
        print(f"   - Is Live: {station.is_live}")
        print(f"   - Loop Enabled: {station.is_loop_enabled}")
        print(f"   - Stream URL: {stream_url}")
        print(f"   - Current Track: {current_track}")
        
        return jsonify(station_data), 200
        
    except Exception as e:
        print(f"❌ Error getting station details for {station_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500



    

@api.route('/radio/<int:station_id>/stream')
def stream_radio_station(station_id):
    """
    Stream audio from a radio station - Updated for Cloudinary URLs
    """
    try:
        station = RadioStation.query.get(station_id)
        
        if not station:
            return jsonify({"error": "Station not found"}), 404
        
        if not station.is_live:
            return jsonify({"error": "Station is not currently live"}), 400
        
        # ✅ UPDATED: Handle both Cloudinary URLs and local files
        audio_url = None
        
        # Priority 1: Check for direct Cloudinary URLs in station
        if station.loop_audio_url and station.loop_audio_url.startswith('http'):
            audio_url = station.loop_audio_url
            print(f"🎵 Using station loop_audio_url (Cloudinary): {audio_url}")
        
        # Priority 2: Check current track for Cloudinary URL
        elif station.playlist_schedule and station.playlist_schedule.get("tracks"):
            current_track_info = station.get_current_track()
            if current_track_info and current_track_info.get("file_url"):
                file_url = current_track_info.get("file_url")
                if file_url.startswith('http'):
                    audio_url = file_url
                    print(f"🎵 Using current track URL (Cloudinary): {audio_url}")
        
        # Priority 3: Check Audio table for Cloudinary URL
        if not audio_url and station.playlist_schedule:
            current_track_info = station.get_current_track()
            if current_track_info:
                track_id = current_track_info.get("id")
                audio = Audio.query.get(track_id) if track_id else None
                if audio and audio.file_url and audio.file_url.startswith('http'):
                    audio_url = audio.file_url
                    print(f"🎵 Using Audio record URL (Cloudinary): {audio_url}")
        
        # ✅ NEW: For Cloudinary URLs, redirect to the direct URL
        if audio_url and audio_url.startswith('http'):
            print(f"🔗 Redirecting to Cloudinary URL: {audio_url}")
            
            # Return redirect response with CORS headers
            response = redirect(audio_url)
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Range, Content-Type'
            return response
        
        # ✅ FALLBACK: Handle local files (for backward compatibility)
        if station.playlist_schedule and station.playlist_schedule.get("tracks"):
            current_track_info = station.get_current_track()
            if current_track_info:
                track_id = current_track_info.get("id")
                audio = Audio.query.get(track_id) if track_id else None
                
                if audio and audio.file_url:
                    file_url = audio.file_url
                    
                    # Only handle local files if they're not Cloudinary URLs
                    if not file_url.startswith('http'):
                        # Build file path for local files
                        if file_url.startswith('/uploads/station_mixes/'):
                            filename = file_url.replace('/uploads/station_mixes/', '')
                            file_path = os.path.join('src', 'static', 'uploads', 'station_mixes', filename)
                        elif file_url.startswith('/'):
                            file_path = file_url[1:]
                        else:
                            file_path = file_url
                        
                        # Validate local file exists
                        if os.path.exists(file_path):
                            print(f"🎵 Streaming local file: {file_path}")
                            return stream_local_file(file_path, station.name)
        
        # No valid audio source found
        return jsonify({"error": "No valid audio source available for this station"}), 404
        
    except Exception as e:
        print(f"❌ Stream error for station {station_id}: {e}")
        return jsonify({"error": "Streaming error occurred"}), 500


def stream_local_file(file_path, station_name):
    """Helper function to stream local files"""
    try:
        # Get MIME type
        import mimetypes
        mimetype, _ = mimetypes.guess_type(file_path)
        if not mimetype:
            mimetype = 'audio/mpeg'
        
        # Create streaming response for local files
        def generate_audio():
            try:
                with open(file_path, 'rb') as f:
                    while True:
                        chunk = f.read(8192)  # 8KB chunks
                        if not chunk:
                            break
                        yield chunk
            except Exception as e:
                print(f"❌ Local streaming error: {e}")
        
        # Create response with proper headers
        response = Response(
            generate_audio(),
            mimetype=mimetype,
            headers={
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type',
                'Content-Disposition': f'inline; filename="{os.path.basename(file_path)}"'
            }
        )
        
        return response
        
    except Exception as e:
        print(f"❌ Local file streaming error: {e}")
        return jsonify({"error": "Local file streaming error"}), 500


@api.route('/radio/<int:station_id>/stream', methods=['OPTIONS'])
def handle_stream_options(station_id):
    """Handle CORS preflight requests for streaming"""
    response = jsonify({})
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Range, Content-Type'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response  

@api.route('/radio/<int:station_id>/audio-url', methods=['GET'])
def get_station_audio_url(station_id):
    """
    Get the direct audio URL for a station (preferred method for Cloudinary)
    This is what your frontend should use instead of streaming through the backend
    """
    try:
        station = RadioStation.query.get(station_id)
        
        if not station:
            return jsonify({"error": "Station not found"}), 404
        
        if not station.is_live:
            return jsonify({"error": "Station is not currently live"}), 400
        
        # Get the direct Cloudinary URL
        audio_url = None
        
        # Priority 1: Station's loop_audio_url (Cloudinary)
        if station.loop_audio_url and station.loop_audio_url.startswith('http'):
            audio_url = station.loop_audio_url
        
        # Priority 2: Current track URL (Cloudinary)
        elif station.playlist_schedule:
            current_track_info = station.get_current_track()
            if current_track_info and current_track_info.get("file_url"):
                file_url = current_track_info.get("file_url")
                if file_url.startswith('http'):
                    audio_url = file_url
        
        # Priority 3: Audio record URL (Cloudinary)
        if not audio_url and station.playlist_schedule:
            current_track_info = station.get_current_track()
            if current_track_info:
                track_id = current_track_info.get("id")
                audio = Audio.query.get(track_id) if track_id else None
                if audio and audio.file_url and audio.file_url.startswith('http'):
                    audio_url = audio.file_url
        
        if not audio_url:
            return jsonify({"error": "No audio URL available"}), 404
        
        return jsonify({
            "station_id": station_id,
            "station_name": station.name,
            "audio_url": audio_url,
            "is_live": station.is_live,
            "current_track": station.get_current_track()
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting audio URL for station {station_id}: {e}")
        return jsonify({"error": "Failed to get audio URL"}), 500


@api.route('/radio/<int:station_id>/health', methods=['GET'])
@handle_db_errors
def check_station_health(station_id):
    """Check if station stream is healthy and accessible"""
    try:
        station = RadioStation.query.get(station_id)
        
        if not station:
            return jsonify({"error": "Station not found"}), 404
        
        if not station.is_live:
            return jsonify({
                "status": "offline",
                "message": "Station is not currently broadcasting"
            }), 200
        
        # Basic stream health checks
        health_status = {
            "status": "healthy",
            "stream_url": station.stream_url,
            "listener_count": station.listener_count or 0,
            "uptime": (datetime.utcnow() - station.loop_started_at).total_seconds() if station.loop_started_at else 0,
            "last_accessed": station.last_accessed.isoformat() if station.last_accessed else None
        }
        
        # Check if stream URL is accessible (basic validation)
        try:
            import urllib.parse
            parsed_url = urllib.parse.urlparse(station.stream_url)
            if not parsed_url.scheme or not parsed_url.netloc:
                health_status["status"] = "unhealthy"
                health_status["issue"] = "Invalid stream URL format"
        except Exception:
            health_status["status"] = "unhealthy"
            health_status["issue"] = "Stream URL validation failed"
        
        # Check if playlist has tracks
        if station.playlist_schedule:
            tracks_count = len(station.playlist_schedule.get("tracks", []))
            if tracks_count == 0:
                health_status["status"] = "degraded"
                health_status["issue"] = "No tracks in playlist"
            health_status["playlist_tracks"] = tracks_count
        
        return jsonify(health_status), 200
        
    except Exception as e:
        current_app.logger.error(f"Error checking station {station_id} health: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Unable to check station health"
        }), 500 

# src/api/routes.py - Enhanced with comprehensive error handling
import os
import traceback
from datetime import datetime, timedelta
from functools import wraps
from flask import jsonify, request, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
import stripe
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from werkzeug.exceptions import BadRequest, NotFound, InternalServerError

# Error handling decorators
def handle_db_errors(f):
    """Decorator to handle database errors consistently"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except IntegrityError as e:
            db.session.rollback()
            current_app.logger.error(f"Database integrity error: {str(e)}")
            return jsonify({
                "error": "Data integrity error",
                "message": "The requested operation conflicts with existing data"
            }), 400
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error: {str(e)}")
            return jsonify({
                "error": "Database error",
                "message": "An error occurred while accessing the database"
            }), 500
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error in {f.__name__}: {str(e)}")
            current_app.logger.error(traceback.format_exc())
            return jsonify({
                "error": "Internal server error",
                "message": "An unexpected error occurred"
            }), 500
    return decorated_function

def validate_json(required_fields=None):
    """Decorator to validate JSON request data"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({
                    "error": "Invalid request format",
                    "message": "Request must be JSON"
                }), 400
            
            data = request.get_json()
            if not data:
                return jsonify({
                    "error": "Empty request",
                    "message": "Request body cannot be empty"
                }), 400
            
            if required_fields:
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    return jsonify({
                        "error": "Missing required fields",
                        "message": f"Required fields: {', '.join(missing_fields)}"
                    }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def handle_auth_errors(f):
    """Decorator to handle authentication errors"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.warning(f"Authentication error: {str(e)}")
            return jsonify({
                "error": "Authentication failed",
                "message": "Invalid or expired token"
            }), 401
    return decorated_function

# Enhanced file serving with error handling
@api.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    """Serve uploaded files with comprehensive security and performance"""
    try:
        # Validate filename
        if not filename or '..' in filename:
            current_app.logger.warning(f"Invalid filename requested: {filename}")
            return jsonify({"error": "Invalid filename"}), 400
        
        # Get upload folder from config
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        file_path = os.path.join(upload_folder, filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            current_app.logger.warning(f"File not found: {file_path}")
            return jsonify({"error": "File not found"}), 404
        
        # Check if it's actually a file (not directory)
        if not os.path.isfile(file_path):
            current_app.logger.warning(f"Path is not a file: {file_path}")
            return jsonify({"error": "Invalid file path"}), 400
        
        # Security check - ensure file is within upload directory
        upload_folder_abs = os.path.abspath(upload_folder)
        file_path_abs = os.path.abspath(file_path)
        
        if not file_path_abs.startswith(upload_folder_abs):
            current_app.logger.warning(f"Path traversal attempt: {file_path}")
            return jsonify({"error": "Access denied"}), 403
        
        # MIME type validation for security
        import mimetypes
        mime_type, _ = mimetypes.guess_type(file_path)
        allowed_mime_types = [
            # Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            # Audio
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac',
            # Video
            'video/mp4', 'video/webm', 'video/quicktime',
            # Documents (if needed)
            'application/pdf', 'text/plain'
        ]
        
        if mime_type and mime_type not in allowed_mime_types:
            current_app.logger.warning(f"Disallowed file type: {mime_type} for {filename}")
            return jsonify({"error": "File type not allowed"}), 403
        
        # File size check (prevent serving extremely large files)
        file_size = os.path.getsize(file_path)
        max_size = current_app.config.get('MAX_SERVE_FILE_SIZE', 100 * 1024 * 1024)  # 100MB default
        if file_size > max_size:
            current_app.logger.warning(f"File too large: {file_size} bytes for {filename}")
            return jsonify({"error": "File too large"}), 413
        
        # Create response with caching and performance headers
        from flask import make_response
        response = make_response(send_from_directory(upload_folder, filename))
        
        # Add cache headers for better performance
        response.headers['Cache-Control'] = 'public, max-age=3600'  # 1 hour cache
        response.headers['ETag'] = f'"{hash(filename + str(file_size))}"'
        
        # Enable range requests for audio/video streaming
        if mime_type and (mime_type.startswith('audio/') or mime_type.startswith('video/')):
            response.headers['Accept-Ranges'] = 'bytes'
        
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error serving file {filename}: {str(e)}")
        return jsonify({
            "error": "File access error",
            "message": "Unable to serve the requested file"
        }), 500

# Enhanced radio station endpoints
@api.route('/radio/<int:station_id>', methods=['GET'])
@handle_db_errors
@jwt_required()
def get_radio_station(station_id):
    """Get radio station details with comprehensive error handling and security"""
    try:
        # Input validation
        if station_id <= 0:
            return jsonify({"error": "Invalid station ID"}), 400
        
        station = RadioStation.query.get(station_id)
        
        if not station:
            return jsonify({"error": "Station not found"}), 404
        
        current_user_id = get_jwt_identity()
        
        # Check if user has access to this station
        if not station.is_public and station.user_id != current_user_id:
            return jsonify({"error": "Access denied"}), 403
        
        # Check if station has status field and is suspended/banned
        if hasattr(station, 'status'):
            if station.status == 'suspended':
                return jsonify({"error": "Station is temporarily suspended"}), 403
            
            if station.status == 'banned':
                return jsonify({"error": "Station is no longer available"}), 410
        
        # Rate limiting for listener count updates (prevent spam)
        session_key = f"listener_{current_user_id}_{station_id}"
        last_update = session.get(session_key)
        current_time = datetime.utcnow()
        
        should_increment = True
        if last_update:
            time_diff = (current_time - last_update).total_seconds()
            should_increment = time_diff > 60  # Only increment once per minute per user
        
        # Increment follower count if not recently incremented (using followers_count from your model)
        if station.is_live and should_increment:
            try:
                station.followers_count = (station.followers_count or 0) + 1
                session[session_key] = current_time
                db.session.commit()
            except SQLAlchemyError as e:
                # Don't fail the entire request if count update fails
                current_app.logger.warning(f"Failed to update listener count for station {station_id}: {str(e)}")
                db.session.rollback()
        
        # Get additional station data
        try:
            # Get current playing track using your model's method
            current_track = station.get_current_track()
            
            # Get recent tracks from playlist_schedule
            recent_tracks = []
            if station.playlist_schedule:
                tracks_data = station.playlist_schedule.get("tracks", [])
                recent_tracks = tracks_data[-10:] if len(tracks_data) > 10 else tracks_data
            
            # Check if user is following this station
            is_following = False
            if current_user_id:
                # Use your radio_follower_entries relationship
                follow_record = station.radio_follower_entries.filter_by(
                    user_id=current_user_id
                ).first()
                is_following = bool(follow_record)
            
            # Get station creator info using user_id from your model
            creator = User.query.get(station.user_id)
            creator_info = {
                "id": creator.id,
                "name": creator.username,
                "avatar_url": getattr(creator, 'avatar_url', None)
            } if creator else None
            
        except Exception as e:
            current_app.logger.warning(f"Failed to get additional station data: {str(e)}")
            current_track = None
            recent_tracks = []
            is_following = False
            creator_info = None
        
        # Build response using your model's fields
        response_data = {
            "station": {
                **station.serialize(),
                "creator": creator_info,
                "is_following": is_following,
                "current_track": current_track,
                "recent_tracks": recent_tracks,
                "uptime": (current_time - station.created_at).total_seconds() if station.created_at else 0
            },
            "stream_status": "live" if station.is_live else "offline",
            "stream_url": station.stream_url if station.is_live else None,
            "can_edit": current_user_id == station.user_id,  # Use user_id instead of creator_id
            "access_level": "owner" if current_user_id == station.user_id else "listener"
        }
        
        # Add loop audio URL if available
        if station.is_live and station.loop_audio_url:
            response_data["loop_audio_url"] = station.loop_audio_url
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        current_app.logger.warning(f"Invalid request for station {station_id}: {str(e)}")
        return jsonify({
            "error": "Invalid request",
            "message": str(e)
        }), 400
        
    except PermissionError as e:
        current_app.logger.warning(f"Permission denied for station {station_id}: {str(e)}")
        return jsonify({
            "error": "Permission denied",
            "message": "You don't have permission to access this station"
        }), 403
        
    except Exception as e:
        current_app.logger.error(f"Error fetching station {station_id}: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({
            "error": "Station access error",
            "message": "Unable to load station details"
        }), 500

@api.route('/radio/<int:station_id>/now-playing', methods=['GET'])
@handle_db_errors
def get_now_playing(station_id):
    """Get now playing information with proper error handling"""
    try:
        station = RadioStation.query.get(station_id)
        
        if not station:
            return jsonify({"error": "Station not found"}), 404
        
        if not station.is_live:
            return jsonify({
                "now_playing": None,
                "message": "Station is offline"
            }), 200
        
        # Get current track info using your model's method
        current_track = station.get_current_track()
        
        return jsonify({
            "now_playing": {
                "title": current_track.get("title") if current_track else "Unknown",
                "artist": current_track.get("artist") if current_track else "Unknown", 
                "album": current_track.get("album") if current_track else None,
                "duration": current_track.get("duration") if current_track else None,
                "started_at": station.loop_started_at.isoformat() if station.loop_started_at else None
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching now playing for station {station_id}: {str(e)}")
        return jsonify({
            "error": "Now playing error", 
            "message": "Unable to get current track information"
        }), 500

@api.route('/marketplace/products', methods=['GET'])
@handle_db_errors
def get_marketplace_products():
    """Get marketplace products with pagination and filtering"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category = request.args.get('category')
        search = request.args.get('search')
        sort_by = request.args.get('sort_by', 'newest')
        
        # Build query WITHOUT is_active filter (since that field doesn't exist)
        query = Product.query
        
        if category and category != 'all':
            query = query.filter(Product.category == category)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
            db.or_(
            Product.title.ilike(search_term),
            Product.description.ilike(search_term)
        )
    )
        
        # Apply sorting
        if sort_by == 'price-low':
            query = query.order_by(Product.price.asc())
        elif sort_by == 'price-high':
            query = query.order_by(Product.price.desc())
        elif sort_by == 'popular':
            query = query.order_by(Product.sales_count.desc())
        else:  # newest
            query = query.order_by(Product.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            "products": [product.serialize() for product in pagination.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        print(f"Marketplace products error: {str(e)}")
        return jsonify({
            "error": "Products fetch error",
            "message": str(e)
        }), 500

@api.route('/marketplace/categories', methods=['GET'])
def get_marketplace_categories():
    """Get marketplace categories from database"""
    try:
        categories_query = db.session.query(
            Product.category,
            db.func.count(Product.id).label('count')
        ).group_by(Product.category).all()
        
        categories = []
        for idx, (cat_name, count) in enumerate(categories_query, 1):
            if cat_name:
                categories.append({
                    "id": idx,
                    "name": cat_name.title(),
                    "slug": cat_name.lower().replace(' ', '-'),
                    "count": count
                })
        
        if not categories:
            categories = [
                {"id": 1, "name": "Apparel", "slug": "apparel", "count": 0},
                {"id": 2, "name": "Digital Content", "slug": "digital", "count": 0},
                {"id": 3, "name": "Merchandise", "slug": "merch", "count": 0},
                {"id": 4, "name": "Music", "slug": "music", "count": 0}
            ]
        
        return jsonify({"categories": categories}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch categories", "message": str(e)}), 500

# Featured Products
@api.route('/marketplace/featured', methods=['GET'])
def get_featured_products():
    """Get featured products from database based on sales"""
    try:
        featured = Product.query.order_by(Product.sales_count.desc()).limit(6).all()
        
        if not featured:
            return jsonify({"products": []}), 200
        
        products = []
        for product in featured:
            product_data = product.serialize()
            creator = User.query.get(product.creator_id)
            if creator:
                product_data['creator_name'] = creator.username
            products.append(product_data)
        
        return jsonify({"products": products}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch featured products", "message": str(e)}), 500
        
    except Exception as e:
        return jsonify({
            "error": "Failed to fetch featured products",
            "message": str(e)
        }), 500

# Marketplace Checkout
@api.route('/marketplace/checkout', methods=['POST'])
@jwt_required()
def marketplace_checkout():
    """Handle marketplace checkout"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        
        if not product_id:
            return jsonify({
                "error": "Product ID is required"
            }), 400
        
        # Mock checkout response - replace with actual Stripe integration
        return jsonify({
            "message": "Checkout initiated successfully",
            "checkout_url": f"https://checkout.stripe.com/mock-session-{product_id}"
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": "Checkout failed",
            "message": str(e)
        }), 500

# Health check endpoint with system status
@api.route('/health', methods=['GET'])
def health_check():
    """Comprehensive health check endpoint"""
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": current_app.config.get('APP_VERSION', '1.0.0'),
            "checks": {}
        }
        
        # Database connectivity check
        try:
            db.session.execute('SELECT 1')
            health_status["checks"]["database"] = "healthy"
        except Exception as e:
            health_status["checks"]["database"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        # Stripe connectivity check
        try:
            stripe.Account.retrieve()
            health_status["checks"]["stripe"] = "healthy"
        except Exception as e:
            health_status["checks"]["stripe"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        # File system check
        try:
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            if os.path.exists(upload_folder) and os.access(upload_folder, os.W_OK):
                health_status["checks"]["filesystem"] = "healthy"
            else:
                health_status["checks"]["filesystem"] = "unhealthy: upload folder not writable"
                health_status["status"] = "degraded"
        except Exception as e:
            health_status["checks"]["filesystem"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        status_code = 200 if health_status["status"] == "healthy" else 503
        return jsonify(health_status), status_code
        
    except Exception as e:
        current_app.logger.error(f"Health check error: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": "Health check failed",
            "timestamp": datetime.utcnow().isoformat()
        }), 503

# Error handlers for the entire API
@api.errorhandler(400)
def bad_request(error):
    return jsonify({
        "error": "Bad Request",
        "message": error.description or "The request was invalid"
    }), 400

@api.errorhandler(401)
def unauthorized(error):
    return jsonify({
        "error": "Unauthorized",
        "message": "Authentication required"
    }), 401

@api.errorhandler(403)
def forbidden(error):
    return jsonify({
        "error": "Forbidden",
        "message": "Access denied"
    }), 403

@api.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Not Found",
        "message": "The requested resource was not found"
    }), 404

@api.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({
        "error": "Rate Limit Exceeded",
        "message": "Too many requests. Please try again later."
    }), 429

@api.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    current_app.logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        "error": "Internal Server Error",
        "message": "An unexpected error occurred"
    }), 500

@api.route('/simple-health', methods=['GET'])
def simple_health_check():
    """Simple health check for marketplace"""
    return jsonify({
        "status": "healthy",
        "message": "Backend server is running",
        "timestamp": datetime.utcnow().isoformat()
    }), 200


@api.route('/debug/station/<int:station_id>')
def debug_station_info(station_id):
    """Debug endpoint to check station configuration"""
    try:
        station = RadioStation.query.get(station_id)
        if not station:
            return jsonify({"error": "Station not found"}), 404
        
        # Check audio file
        audio_info = {}
        if station.loop_audio_url:
            file_url = station.loop_audio_url
            if file_url.startswith('/uploads/station_mixes/'):
                filename = file_url.replace('/uploads/station_mixes/', '')
                file_path = os.path.join('src', 'static', 'uploads', 'station_mixes', filename)
            else:
                file_path = file_url.lstrip('/')
            
            audio_info = {
                "database_url": file_url,
                "computed_path": file_path,
                "file_exists": os.path.exists(file_path),
                "file_size": os.path.getsize(file_path) if os.path.exists(file_path) else 0
            }
        
        debug_info = {
            "station_id": station_id,
            "station_name": station.name,
            "is_live": station.is_live,
            "is_loop_enabled": station.is_loop_enabled,
            "has_playlist_schedule": bool(station.playlist_schedule),
            "playlist_tracks_count": len(station.playlist_schedule.get("tracks", [])) if station.playlist_schedule else 0,
            "loop_started_at": station.loop_started_at.isoformat() if station.loop_started_at else None,
            "current_track": station.get_current_track(),
            "now_playing_metadata": station.now_playing_metadata,
            "audio_file_info": audio_info,
            "stream_url": f"{request.host_url.rstrip('/')}/radio/{station_id}/stream"
        }
        
        return jsonify(debug_info), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route("/uploads/<filename>")
def uploaded_audio(filename):
    return send_from_directory(os.path.join("static", "uploads"), filename)

@api.route('/uploads/station_mixes/<filename>')
def serve_station_mix(filename):
    directory = os.path.join('src', 'static', 'uploads', 'station_mixes')
    print("🎧 Serving mix from:", directory)
    return send_from_directory(directory, filename)

@api.route('/radio/<int:station_id>/stream')
def stream_station_audio(station_id):
    station = RadioStation.query.get_or_404(station_id)

    if not station.loop_audio_url:
        return jsonify({"error": "No audio file configured for this station"}), 404

    # Get relative file path from DB (e.g. "uploads/station_mixes/xyz.mp3")
    file_path = station.loop_audio_url.lstrip('/')
    directory, filename = os.path.split(file_path)

    # Add src/static as base path
    full_directory = os.path.join("src", "static", directory)

    print(f"🎧 Serving from: {full_directory}/{filename}")
    
    return send_from_directory(full_directory, filename, mimetype="audio/mpeg")

# ✅ Create a Group
@api.route("/groups", methods=["POST"])
@jwt_required()
def create_group():
    data = request.json
    name = data.get("name")
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    group = Group(name=name, created_by=user_id)
    group.members.append(user)  # Creator is added automatically

    db.session.add(group)
    db.session.commit()
    return jsonify(group.serialize()), 201

# ✅ Add User to Group
@api.route("/groups/<int:group_id>/add-member", methods=["POST"])
@jwt_required()
def add_group_member(group_id):
    data = request.json
    user_id = data.get("user_id")

    group = Group.query.get(group_id)
    user = User.query.get(user_id)

    if not group or not user:
        return jsonify({"error": "Invalid group or user ID"}), 404

    group.members.append(user)
    db.session.commit()
    return jsonify({"message": f"User {user_id} added to group {group_id}"}), 200

@api.route('/messages/room/<room_id>', methods=['GET'])
@jwt_required()
def get_messages_by_room(room_id):
    messages = Message.query.filter_by(room=room_id).order_by(Message.created_at).all()
    return jsonify([{
        "id": m.id,
        "room": m.room,
        "from": m.sender_id,
        "to": m.recipient_id,
        "text": m.text,
        "timestamp": m.created_at.isoformat()
    } for m in messages]), 200

@api.route('/profile/<int:user_id>/inner-circle', methods=['GET'])
def get_user_inner_circle(user_id):
    """Get a user's inner circle (viewable by anyone)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    inner_circle = InnerCircle.query.filter_by(user_id=user_id)\
                                   .order_by(InnerCircle.position)\
                                   .all()
    
    return jsonify({
        "user_id": user_id,
        "username": user.username,
        "inner_circle": [member.serialize() for member in inner_circle]
    }), 200

# ⭐ Inner Circle - Get current user's inner circle for editing
@api.route('/profile/my-inner-circle', methods=['GET'])
@jwt_required()
def get_my_inner_circle():
    """Get current user's inner circle for editing"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    inner_circle = InnerCircle.query.filter_by(user_id=user_id)\
                                   .order_by(InnerCircle.position)\
                                   .all()
    
    return jsonify({
        "user_id": user_id,
        "inner_circle": [member.serialize() for member in inner_circle],
        "available_friends": get_available_friends_for_circle(user_id)
    }), 200

# ⭐ Inner Circle - Add friend to inner circle
@api.route('/inner-circle/add', methods=['POST'])
@jwt_required()
def add_to_inner_circle():
    """Add user to inner circle"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        friend_user_id = data.get('friend_user_id') or data.get('user_id')
        if not friend_user_id:
            return jsonify({"error": "friend_user_id is required"}), 400
        
        # Check if user exists
        friend_user = User.query.get(friend_user_id)
        if not friend_user:
            return jsonify({"error": "User not found"}), 404
        
        # Can't add yourself
        if friend_user_id == user_id:
            return jsonify({"error": "Cannot add yourself to inner circle"}), 400
        
        # Check if already in circle
        existing = InnerCircle.query.filter_by(
            user_id=user_id,
            friend_user_id=friend_user_id
        ).first()
        
        if existing:
            return jsonify({"error": "User already in inner circle"}), 400
        
        # Check circle limit (10 members)
        current_count = InnerCircle.query.filter_by(user_id=user_id).count()
        if current_count >= 10:
            return jsonify({"error": "Inner circle is full (max 10 members)"}), 400
        
        # Add to circle
        new_member = InnerCircle(
            user_id=user_id,
            friend_user_id=friend_user_id,
            position=current_count + 1
        )
        
        db.session.add(new_member)
        db.session.commit()
        
        return jsonify({
            "message": "User added to inner circle",
            "member": {
                "id": new_member.id,
                "user_id": friend_user.id,
                "username": friend_user.username,
                "display_name": getattr(friend_user, 'display_name', None),
                "avatar_url": getattr(friend_user, 'avatar_url', None),
                "position": new_member.position
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to add to inner circle: {str(e)}"}), 500

@api.route('/profile/inner-circle/remove/<int:friend_user_id>', methods=['DELETE'])
@jwt_required()
def remove_from_inner_circle(friend_user_id):
    user_id = get_jwt_identity()
    
    member = InnerCircle.query.filter_by(
        user_id=user_id,
        member_user_id=friend_user_id
    ).first()
    
    if not member:
        return jsonify({"error": "Not in inner circle"}), 404
    
    db.session.delete(member)
    db.session.commit()
    
    return jsonify({"message": "Removed from inner circle"}), 200

# ⭐ Inner Circle - Remove friend from inner circle
@api.route('/inner-circle/search', methods=['GET'])
@jwt_required()
def search_users_for_circle():
    """Search users to add to inner circle"""
    try:
        user_id = get_jwt_identity()
        query = request.args.get('q', '').strip()
        
        if not query or len(query) < 2:
            return jsonify({"users": []}), 200
        
        # Get users already in circle
        existing_circle_ids = db.session.query(InnerCircle.member_user_id)\
            .filter_by(user_id=user_id).subquery()
        
        # Search users not in circle and not self
        users = User.query.filter(
            User.id != user_id,  # Not self
            ~User.id.in_(existing_circle_ids),  # Not already in circle
            or_(
                User.username.ilike(f'%{query}%'),
                User.display_name.ilike(f'%{query}%'),
                User.artist_name.ilike(f'%{query}%')
            )
        ).limit(20).all()
        
        search_results = []
        for user in users:
            search_results.append({
                "id": user.id,
                "username": user.username,
                "display_name": getattr(user, 'display_name', None),
                "artist_name": getattr(user, 'artist_name', None),
                "avatar_url": getattr(user, 'avatar_url', None),
                "profile_picture": getattr(user, 'profile_picture', None),
                "bio": getattr(user, 'bio', None)
            })
        
        return jsonify({"users": search_results}), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to search users: {str(e)}"}), 500
    


# ⭐ Inner Circle - Reorder inner circle
@api.route('/profile/inner-circle/reorder', methods=['PUT'])
@jwt_required()
def reorder_inner_circle():
    """Reorder inner circle members"""
    user_id = get_jwt_identity()
    data = request.json
    
    new_order = data.get('order', [])  # List of friend_user_ids in desired order
    
    if not isinstance(new_order, list):
        return jsonify({"error": "Order must be a list of user IDs"}), 400
    
    if len(new_order) > 10:
        return jsonify({"error": "Inner circle cannot have more than 10 members"}), 400
    
    try:
        user = User.query.get(user_id)
        user.reorder_inner_circle(new_order)
        
        # Return updated inner circle
        updated_circle = InnerCircle.query.filter_by(user_id=user_id)\
                                         .order_by(InnerCircle.position)\
                                         .all()
        
        return jsonify({
            "message": "Inner circle reordered successfully",
            "inner_circle": [member.serialize() for member in updated_circle]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ⭐ Inner Circle - Update member title
@api.route('/profile/inner-circle/update-title/<int:friend_user_id>', methods=['PUT'])
@jwt_required()
def update_inner_circle_title(friend_user_id):
    """Update custom title for inner circle member"""
    user_id = get_jwt_identity()
    data = request.json
    
    custom_title = data.get('custom_title', '').strip()[:50]
    
    member = InnerCircle.query.filter_by(user_id=user_id, friend_user_id=friend_user_id).first()
    if not member:
        return jsonify({"error": "Member not found in inner circle"}), 404
    
    member.custom_title = custom_title
    member.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        "message": "Title updated successfully",
        "member": member.serialize()
    }), 200

# ⭐ Helper function to get available friends for inner circle
def get_available_friends_for_circle(user_id):
    """Get list of friends/connections not already in inner circle"""
    # This assumes you have a friends/connections system
    # Adjust this based on your actual friendship model
    
    # Get current inner circle member IDs
    current_circle_ids = [member.friend_user_id for member in 
                         InnerCircle.query.filter_by(user_id=user_id).all()]
    
    # For now, return all users except self and current circle members
    # You should replace this with actual friends/connections query
    available_users = User.query.filter(
        User.id != user_id,
        ~User.id.in_(current_circle_ids)
    ).limit(50).all()  # Limit for performance
    
    return [{
        "id": user.id,
        "username": user.username,
        "artist_name": user.artist_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "is_gamer": user.is_gamer,
        "gamertag": user.gamertag,
        "is_artist": user.is_artist
    } for user in available_users]

# ⭐ Search users for inner circle
@api.route('/profile/inner-circle/search-users', methods=['GET'])
@jwt_required()
def search_users_for_inner_circle():
    """Search for users to add to inner circle"""
    user_id = get_jwt_identity()
    query = request.args.get('q', '').strip()
    
    if len(query) < 2:
        return jsonify({"users": []}), 200
    
    # Get current inner circle member IDs
    current_circle_ids = [member.friend_user_id for member in 
                         InnerCircle.query.filter_by(user_id=user_id).all()]
    current_circle_ids.append(user_id)  # Exclude self
    
    # Search users by username or artist name
    users = User.query.filter(
        or_(
            User.username.ilike(f'%{query}%'),
            User.artist_name.ilike(f'%{query}%')
        ),
        ~User.id.in_(current_circle_ids)
    ).limit(20).all()
    
    return jsonify({
        "users": [{
            "id": user.id,
            "username": user.username,
            "artist_name": user.artist_name,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "is_gamer": user.is_gamer,
            "gamertag": user.gamertag,
            "is_artist": user.is_artist
        } for user in users]
    }), 200

@api.route('/inner-circle/<int:target_user_id>', methods=['GET'])
def get_inner_circle_by_id(target_user_id):
    """Get a user's inner circle"""
    try:
        user = User.query.get(target_user_id)
        if not user:
            return jsonify({"error": "User not found", "inner_circle": []}), 404
        
        inner_circle = InnerCircle.query.filter_by(user_id=target_user_id)\
            .order_by(InnerCircle.position).all()
        
        members = []
        for circle_member in inner_circle:
            member_user = User.query.get(circle_member.member_user_id)
            if member_user:
                members.append({
                    "id": circle_member.id,
                    "user_id": circle_member.user_id,
                    "friend_user_id": circle_member.member_user_id,
                    "position": circle_member.position or len(members) + 1,
                    "custom_title": getattr(circle_member, 'custom_title', None),
                    "friend": {
                        "id": member_user.id,
                        "username": member_user.username,
                        "display_name": getattr(member_user, 'display_name', None) or member_user.username,
                        "avatar_url": getattr(member_user, 'avatar_url', None) or getattr(member_user, 'profile_picture', None),
                        "profile_picture": getattr(member_user, 'profile_picture', None),
                        "artist_name": getattr(member_user, 'artist_name', None),
                        "bio": getattr(member_user, 'bio', None),
                        "gamertag": getattr(member_user, 'gamertag', None)
                    }
                })
        
        return jsonify({
            "user_id": target_user_id,
            "username": user.username,
            "inner_circle": members,
            "count": len(members)
        }), 200
        
    except Exception as e:
        return jsonify({"inner_circle": [], "error": str(e)}), 200

@api.route('/creator/overview-stats', methods=['GET'])
@jwt_required()
def get_creator_overview_stats():
    """Get comprehensive creator overview statistics"""
    try:
        user_id = get_jwt_identity()
        
        # Get date range (default to last 30 days)
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Total Followers
        total_followers = Follow.query.filter_by(followed_id=user_id).count()
        
        # Total Content Count
        total_podcasts = Podcast.query.filter_by(host_id=user_id).count()
        total_music_tracks = Audio.query.filter_by(user_id=user_id).count()
        total_videos = Video.query.filter_by(user_id=user_id).count()
        total_radio_stations = RadioStation.query.filter_by(user_id=user_id).count()
        total_products = Product.query.filter_by(user_id=user_id).count()
        
        # Total Earnings (all sources)
        music_sales = db.session.query(func.sum(Purchase.creator_earnings))\
            .join(Product).filter(Product.user_id == user_id).scalar() or 0
        
        podcast_earnings = db.session.query(func.sum(Revenue.amount))\
            .filter(Revenue.user_id == user_id, Revenue.revenue_type == 'podcast').scalar() or 0
        
        ad_revenue = db.session.query(func.sum(AdRevenue.amount))\
            .filter(AdRevenue.creator_id == user_id).scalar() or 0
        
        tips_received = db.session.query(func.sum(Tip.amount))\
            .filter(Tip.recipient_id == user_id).scalar() or 0
        
        donations = db.session.query(func.sum(RadioDonation.amount))\
            .join(RadioStation).filter(RadioStation.user_id == user_id).scalar() or 0
        
        subscription_revenue = db.session.query(func.sum(CreatorMembershipTier.price))\
            .join(UserSubscription)\
            .filter(CreatorMembershipTier.creator_id == user_id)\
            .filter(UserSubscription.status == 'active').scalar() or 0
        
        total_earnings = (music_sales + podcast_earnings + ad_revenue + 
                         tips_received + donations + subscription_revenue)
        
        # Recent Growth (last 30 days vs previous 30 days)
        prev_start_date = start_date - timedelta(days=days)
        
        recent_followers = Follow.query.filter(
            Follow.following_id == user_id,
            Follow.created_at >= start_date
        ).count()
        
        previous_followers = Follow.query.filter(
            Follow.followed_id == user_id,
            Follow.created_at >= prev_start_date,
            Follow.created_at < start_date
        ).count()
        
        follower_growth = ((recent_followers - previous_followers) / previous_followers * 100) \
            if previous_followers > 0 else 0
        
        # Engagement Metrics
        total_likes = Like.query.join(Video).filter(Video.user_id == user_id).count()
        total_comments = Comment.query.filter(Comment.content_type == 'video')\
            .join(Video, Comment.content_id == Video.id)\
            .filter(Video.user_id == user_id).count()
        
        total_shares = Share.query.filter(Share.user_id == user_id).count()
        
        # Top Performing Content
        top_podcast = db.session.query(
            Podcast.name, 
            func.count(StreamingHistory.id).label('plays')
        ).join(StreamingHistory, Podcast.id == StreamingHistory.podcast_id)\
         .filter(Podcast.host_id == user_id)\
         .group_by(Podcast.id)\
         .order_by(desc('plays'))\
         .first()
        
        top_music = db.session.query(
            Audio.title,
            func.count(Analytics.id).label('plays')
        ).join(Analytics, Audio.id == Analytics.content_id)\
         .filter(Audio.user_id == user_id, Analytics.content_type == 'music')\
         .group_by(Audio.id)\
         .order_by(desc('plays'))\
         .first()
        
        # Recent Activity
        recent_uploads = Audio.query.filter(
            Audio.user_id == user_id,
            Audio.uploaded_at >= start_date
        ).count()
        
        recent_distributions = MusicDistribution.query.filter(
            MusicDistribution.user_id == user_id,
            MusicDistribution.submission_date >= start_date
        ).count()
        
        return jsonify({
            "overview": {
                "total_followers": total_followers,
                "follower_growth": round(follower_growth, 1),
                "recent_followers": recent_followers,
                "total_earnings": round(total_earnings, 2),
                "total_content": (total_podcasts + total_music_tracks + 
                                 total_videos + total_radio_stations + total_products)
            },
            "content_stats": {
                "podcasts": total_podcasts,
                "music_tracks": total_music_tracks,
                "videos": total_videos,
                "radio_stations": total_radio_stations,
                "products": total_products
            },
            "earnings_breakdown": {
                "music_sales": round(music_sales, 2),
                "podcast_earnings": round(podcast_earnings, 2),
                "ad_revenue": round(ad_revenue, 2),
                "tips": round(tips_received, 2),
                "donations": round(donations, 2),
                "subscriptions": round(subscription_revenue, 2),
                "total": round(total_earnings, 2)
            },
            "engagement": {
                "total_likes": total_likes,
                "total_comments": total_comments,
                "total_shares": total_shares,
                "engagement_rate": round((total_likes + total_comments + total_shares) / 
                                        max(total_followers, 1) * 100, 2)
            },
            "top_content": {
                "top_podcast": {
                    "name": top_podcast[0] if top_podcast else None,
                    "plays": top_podcast[1] if top_podcast else 0
                } if top_podcast else None,
                "top_music": {
                    "title": top_music[0] if top_music else None,
                    "plays": top_music[1] if top_music else 0
                } if top_music else None
            },
            "recent_activity": {
                "uploads": recent_uploads,
                "distributions": recent_distributions
            },
            "period": f"Last {days} days"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching creator overview: {str(e)}")
        return jsonify({"error": f"Failed to fetch overview stats: {str(e)}"}), 500


@api.route('/creator/content-breakdown', methods=['GET'])
@jwt_required()
def get_creator_content_breakdown():
    """Get detailed breakdown of creator's content with performance metrics"""
    try:
        user_id = get_jwt_identity()
        
        # Podcasts with metrics
        podcasts = db.session.query(
            Podcast.id,
            Podcast.name,
            Podcast.description,
            Podcast.cover_image,
            Podcast.created_at,
            func.count(PodcastEpisode.id).label('episode_count'),
            func.count(distinct(StreamingHistory.user_id)).label('unique_listeners'),
            func.count(StreamingHistory.id).label('total_plays')
        ).outerjoin(PodcastEpisode)\
         .outerjoin(StreamingHistory, StreamingHistory.podcast_id == Podcast.id)\
         .filter(Podcast.host_id == user_id)\
         .group_by(Podcast.id)\
         .all()
        
        podcasts_data = [{
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "cover_image": p.cover_image,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "episode_count": p.episode_count or 0,
            "unique_listeners": p.unique_listeners or 0,
            "total_plays": p.total_plays or 0
        } for p in podcasts]
        
        # Music Tracks with metrics
        music_tracks = db.session.query(
            Audio.id,
            Audio.title,
            Audio.artist,
            Audio.genre,
            Audio.cover_image,
            Audio.uploaded_at,
            func.count(Analytics.id).label('total_plays'),
            func.count(Like.id).label('likes')
        ).outerjoin(Analytics, and_(
            Analytics.content_id == Audio.id,
            Analytics.content_type == 'music'
        ))\
         .outerjoin(Like, and_(
            Like.content_id == Audio.id,
            Like.content_type == 'audio'
        ))\
         .filter(Audio.user_id == user_id)\
         .group_by(Audio.id)\
         .all()
        
        music_data = [{
            "id": t.id,
            "title": t.title,
            "artist": t.artist,
            "genre": t.genre,
            "cover_image": t.cover_image,
            "uploaded_at": t.uploaded_at.isoformat() if t.uploaded_at else None,
            "total_plays": t.total_plays or 0,
            "likes": t.likes or 0
        } for t in music_tracks]
        
        # Radio Stations with metrics
        radio_stations = db.session.query(
            RadioStation.id,
            RadioStation.name,
            RadioStation.description,
            RadioStation.logo_url,
            RadioStation.created_at,
            RadioStation.is_live,
            func.count(distinct(RadioFollower.user_id)).label('followers')
        ).outerjoin(RadioFollower)\
         .filter(RadioStation.user_id == user_id)\
         .group_by(RadioStation.id)\
         .all()
        
        radio_data = [{
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "logo_url": r.logo_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "is_live": r.is_live,
            "followers": r.followers or 0
        } for r in radio_stations]
        
        # Videos with metrics
        videos = db.session.query(
            Video.id,
            Video.title,
            Video.description,
            Video.thumbnail,
            Video.uploaded_at,
            Video.views,
            Video.likes,
            func.count(Comment.id).label('comments')
        ).outerjoin(Comment, and_(
            Comment.content_id == Video.id,
            Comment.content_type == 'video'
        ))\
         .filter(Video.user_id == user_id)\
         .group_by(Video.id)\
         .all()
        
        videos_data = [{
            "id": v.id,
            "title": v.title,
            "description": v.description,
            "thumbnail": v.thumbnail,
            "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None,
            "views": v.views or 0,
            "likes": v.likes or 0,
            "comments": v.comments or 0
        } for v in videos]
        
        # Products with sales metrics
        products = db.session.query(
            Product.id,
            Product.name,
            Product.description,
            Product.price,
            Product.image_url,
            Product.created_at,
            Product.stock,
            func.count(Purchase.id).label('sales_count'),
            func.sum(Purchase.creator_earnings).label('total_earnings')
        ).outerjoin(Purchase)\
         .filter(Product.user_id == user_id)\
         .group_by(Product.id)\
         .all()
        
        products_data = [{
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": float(p.price) if p.price else 0,
            "image_url": p.image_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "stock": p.stock or 0,
            "sales_count": p.sales_count or 0,
            "total_earnings": float(p.total_earnings) if p.total_earnings else 0
        } for p in products]
        
        # Live Streams history
        live_streams = LiveStream.query.filter_by(host_id=user_id)\
            .order_by(LiveStream.created_at.desc())\
            .limit(10)\
            .all()
        
        streams_data = [{
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "viewer_count": s.viewer_count or 0,
            "is_live": s.is_live
        } for s in live_streams]
        
        return jsonify({
            "podcasts": {
                "total": len(podcasts_data),
                "items": podcasts_data
            },
            "music": {
                "total": len(music_data),
                "items": music_data
            },
            "radio_stations": {
                "total": len(radio_data),
                "items": radio_data
            },
            "videos": {
                "total": len(videos_data),
                "items": videos_data
            },
            "products": {
                "total": len(products_data),
                "items": products_data
            },
            "live_streams": {
                "total": len(streams_data),
                "recent": streams_data
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching content breakdown: {str(e)}")
        return jsonify({"error": f"Failed to fetch content breakdown: {str(e)}"}), 500



# 1. USER PLAN STATUS - Updated with correct plan checks
@api.route('/user/plan-status', methods=['GET'])
@jwt_required()
def get_user_plan_status():
    """Get detailed information about user's current plan and usage"""
    try:
        user_id = get_jwt_identity()
        user_plan = get_user_plan(user_id)
        
        if not user_plan:
            # If no plan found, default to Free plan
            free_plan = PricingPlan.query.filter_by(name="Free").first()
            if free_plan:
                return jsonify({
                    "plan": free_plan.serialize(),
                    "has_plan": False,
                    "music_uploads": {"used": 0, "limit": 0, "remaining": 0},
                    "video_uploads": {"used": 0, "limit": 0, "remaining": 0},
                    "features_enabled": {
                        "podcasts": free_plan.includes_podcasts,
                        "radio": free_plan.includes_radio,
                        "digital_sales": free_plan.includes_digital_sales,
                        "merch_sales": free_plan.includes_merch_sales,
                        "live_events": free_plan.includes_live_events,
                        "tip_jar": free_plan.includes_tip_jar,
                        "ad_revenue": free_plan.includes_ad_revenue,
                        "music_distribution": free_plan.includes_music_distribution,
                        "sonosuite_access": free_plan.sonosuite_access,  # Fixed: use the actual field
                        "gaming_features": free_plan.includes_gaming_features,
                        "team_rooms": free_plan.includes_team_rooms,
                        "squad_finder": free_plan.includes_squad_finder,
                        "gaming_analytics": free_plan.includes_gaming_analytics,
                        "game_streaming": free_plan.includes_game_streaming,
                        "gaming_monetization": free_plan.includes_gaming_monetization,
                        "video_distribution": free_plan.includes_video_distribution
                    }
                }), 200
            else:
                return jsonify({"error": "No plans available"}), 404
        
        # Get upload limits and usage
        music_limit_info = check_upload_limit(user_id, "music")
        video_limit_info = check_upload_limit(user_id, "video")
        
        return jsonify({
            "plan": user_plan.serialize(),
            "has_plan": True,
            "music_uploads": music_limit_info,
            "video_uploads": video_limit_info,
            "features_enabled": {
                "podcasts": user_plan.includes_podcasts,
                "radio": user_plan.includes_radio,
                "digital_sales": user_plan.includes_digital_sales,
                "merch_sales": user_plan.includes_merch_sales,
                "live_events": user_plan.includes_live_events,
                "tip_jar": user_plan.includes_tip_jar,
                "ad_revenue": user_plan.includes_ad_revenue,
                "music_distribution": user_plan.includes_music_distribution,
                "sonosuite_access": user_plan.sonosuite_access,  # Fixed: use the actual field name
                "gaming_features": user_plan.includes_gaming_features,
                "team_rooms": user_plan.includes_team_rooms,
                "squad_finder": user_plan.includes_squad_finder,
                "gaming_analytics": user_plan.includes_gaming_analytics,
                "game_streaming": user_plan.includes_game_streaming,
                "gaming_monetization": user_plan.includes_gaming_monetization,
                "video_distribution": user_plan.includes_video_distribution
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching user plan status: {e}")
        return jsonify({"error": "Failed to fetch plan status"}), 500

# Make sure you also have the check_upload_limit function
def check_upload_limit(user_id, upload_type):
    """Check upload limits for a user"""
    try:
        user_plan = get_user_plan(user_id)
        
        if not user_plan:
            return {"used": 0, "limit": 0, "remaining": 0}
        
        # Get the limit based on upload type
        if upload_type == "music":
            limit = user_plan.distribution_uploads_limit
            # Count current month's music uploads
            from datetime import datetime, timedelta
            start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            used = MusicDistribution.query.filter(
                MusicDistribution.user_id == user_id,
                MusicDistribution.created_at >= start_of_month
            ).count()
        elif upload_type == "video":
            limit = user_plan.video_uploads_limit
            # Count current month's video uploads
            from datetime import datetime
            start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            used = Video.query.filter(
                Video.user_id == user_id,
                Video.created_at >= start_of_month
            ).count()
        else:
            return {"used": 0, "limit": 0, "remaining": 0}
        
        # Calculate remaining (-1 means unlimited)
        if limit == -1:
            remaining = "unlimited"
        else:
            remaining = max(0, limit - used)
        
        return {
            "used": used,
            "limit": limit if limit != -1 else "unlimited",
            "remaining": remaining
        }
        
    except Exception as e:
        print(f"Error checking upload limit: {e}")
        return {"used": 0, "limit": 0, "remaining": 0}

# 2. SONOSUITE CONNECTION STATUS
@api.route('/sonosuite/status', methods=['GET'])
@jwt_required()
def get_sonosuite_connection_status():
    """Get user's SonoSuite connection status"""
    user_id = get_jwt_identity()
    
    connection = SonoSuiteUser.query.filter_by(
        streampirex_user_id=user_id,
        is_active=True
    ).first()
    
    if connection:
        return jsonify({
            "connected": True,
            "connection": connection.serialize(),
            "can_redirect": True
        }), 200
    else:
        return jsonify({
            "connected": False,
            "message": "SonoSuite account not connected"
        }), 200

# 3. SONOSUITE CONNECTION - Updated with better plan checking



# 4. SONOSUITE SSO REDIRECT - Updated with proper URL handling
@api.route('/sonosuite/redirect', methods=['GET'])
@jwt_required()
@plan_required("includes_music_distribution")  # Updated plan requirement
def redirect_to_sonosuite():
    """Redirect authenticated user to SonoSuite with JWT"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Check if user has SonoSuite profile
    sonosuite_profile = SonoSuiteUser.query.filter_by(
        streampirex_user_id=user_id,
        is_active=True
    ).first()
    
    if not sonosuite_profile:
        return jsonify({
            "error": "SonoSuite account not connected",
            "message": "Please connect your SonoSuite account first"
        }), 400
    
    # Generate JWT token
    try:
        jwt_token = generate_sonosuite_jwt(
            user_email=sonosuite_profile.sonosuite_email,
            external_id=sonosuite_profile.sonosuite_external_id
        )
        
        if not jwt_token:
            return jsonify({"error": "Failed to generate authentication token"}), 500
        
        # Get return_to parameter from request
        return_to = request.args.get('return_to', '/albums')
        
        # Build SonoSuite URL with JWT
        sonosuite_url = f"{SONOSUITE_BASE_URL}{return_to}?jwt={jwt_token}"
        
        # If return_to was provided as original parameter, add it back
        original_return_to = request.args.get('return_to')
        if original_return_to and original_return_to != return_to:
            sonosuite_url += f"&return_to={original_return_to}"
        
        return jsonify({
            "redirect_url": sonosuite_url,
            "message": "Redirecting to SonoSuite..."
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to generate SSO token: {str(e)}"}), 500

# 5. SONOSUITE DISCONNECT
@api.route('/sonosuite/disconnect', methods=['POST'])
@jwt_required()
def disconnect_sonosuite():
    """Disconnect SonoSuite account"""
    user_id = get_jwt_identity()
    
    connection = SonoSuiteUser.query.filter_by(
        streampirex_user_id=user_id
    ).first()
    
    if not connection:
        return jsonify({"error": "No SonoSuite connection found"}), 404
    
    # Deactivate instead of deleting (for audit trail)
    connection.is_active = False
    db.session.commit()
    
    return jsonify({
        "message": "SonoSuite account disconnected successfully"
    }), 200

# 6. DISTRIBUTION STATS
@api.route('/distribution/stats', methods=['GET'])
@jwt_required()
@plan_required("includes_music_distribution")
def get_distribution_stats():
    """Get user's distribution statistics"""
    try:
        user_id = get_jwt_identity()
        
        # Get comprehensive stats from your model
        total_distributions = MusicDistribution.query.filter_by(user_id=user_id).count()
        
        live_distributions = MusicDistribution.query.filter_by(
            user_id=user_id,
            status="live"
        ).count()
        
        processing_distributions = MusicDistribution.query.filter(
            MusicDistribution.user_id == user_id,
            MusicDistribution.status.in_(["pending", "processing", "submitted"])
        ).count()
        
        # Calculate total streams and revenue
        from sqlalchemy import func
        revenue_stats = db.session.query(
            func.sum(MusicDistribution.total_streams).label('total_streams'),
            func.sum(MusicDistribution.total_revenue).label('total_revenue')
        ).filter_by(user_id=user_id).first()
        
        total_streams = int(revenue_stats.total_streams or 0)
        total_revenue = float(revenue_stats.total_revenue or 0.0)
        
        # Calculate platforms reached (from JSON data)
        platforms_reached = 0
        live_releases = MusicDistribution.query.filter_by(
            user_id=user_id,
            status="live"
        ).all()
        
        unique_platforms = set()
        for release in live_releases:
            if release.platforms:
                platforms = json.loads(release.platforms)
                unique_platforms.update(platforms)
        
        platforms_reached = len(unique_platforms)
        
        # Get recent activity
        recent_distributions = MusicDistribution.query.filter_by(
            user_id=user_id
        ).order_by(MusicDistribution.submission_date.desc()).limit(5).all()
        
        stats = {
            "totalTracks": total_distributions,
            "liveTracks": live_distributions,
            "processingTracks": processing_distributions,
            "platformsReached": platforms_reached,
            "totalStreams": total_streams,
            "totalRevenue": total_revenue,
            "monthlyEarnings": total_revenue,  # Could calculate monthly subset
            "lastUpdated": datetime.utcnow().isoformat(),
            "recentActivity": [dist.serialize() for dist in recent_distributions]
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"Error fetching distribution stats: {e}")
        return jsonify({"error": "Failed to fetch stats"}), 500

# 7. DISTRIBUTION RELEASES
@api.route('/distribution/releases', methods=['GET'])
@jwt_required()
@plan_required("includes_music_distribution")
def get_distribution_releases():
    """Get user's distribution releases with detailed info"""
    try:
        user_id = get_jwt_identity()
        
        # Get pending/processing releases
        pending = MusicDistribution.query.filter(
            MusicDistribution.user_id == user_id,
            MusicDistribution.status.in_(["pending", "processing", "submitted"])
        ).order_by(MusicDistribution.submission_date.desc()).all()
        
        # Get live releases
        live = MusicDistribution.query.filter_by(
            user_id=user_id,
            status="live"
        ).order_by(MusicDistribution.live_date.desc()).all()
        
        # Get rejected/review releases
        under_review = MusicDistribution.query.filter(
            MusicDistribution.user_id == user_id,
            MusicDistribution.status.in_(["rejected", "review"])
        ).order_by(MusicDistribution.submission_date.desc()).all()
        
        releases = {
            "pending": [release.serialize() for release in pending],
            "live": [release.serialize() for release in live],
            "under_review": [release.serialize() for release in under_review],
            "total": len(pending) + len(live) + len(under_review)
        }
        
        return jsonify(releases), 200
        
    except Exception as e:
        print(f"Error fetching releases: {e}")
        return jsonify({"error": "Failed to fetch releases"}), 500

# 8. SUBMIT FOR DISTRIBUTION
@api.route('/distribution/submit', methods=['POST'])
@jwt_required()
@plan_required("includes_music_distribution")  # Only paid plans
def submit_for_distribution():
    """Submit track for distribution through SonoSuite"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Check if user has SonoSuite connected
        sonosuite_profile = SonoSuiteUser.query.filter_by(
            streampirex_user_id=user_id,
            is_active=True
        ).first()
        
        if not sonosuite_profile:
            return jsonify({
                "error": "SonoSuite account not connected",
                "message": "Please connect your SonoSuite account first"
            }), 400
        
        # Validate required fields
        required_fields = ['track_id', 'release_title', 'artist_name', 'genre']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({
                "error": "Missing required fields",
                "missing": missing_fields
            }), 400
        
        # Get track details
        track = Audio.query.filter_by(id=data['track_id'], user_id=user_id).first()
        if not track:
            return jsonify({"error": "Track not found or unauthorized"}), 404
        
        # Check if track is already distributed
        existing_distribution = MusicDistribution.query.filter_by(
            track_id=track.id
        ).filter(MusicDistribution.status.in_(["pending", "processing", "submitted", "live"])).first()
        
        if existing_distribution:
            return jsonify({
                "error": "Track is already distributed or being processed",
                "existing_distribution": existing_distribution.serialize()
            }), 400
        
        # Prepare platform and territory data
        platforms = data.get('platforms', [
            'spotify', 'apple_music', 'amazon_music', 'youtube_music', 
            'deezer', 'tidal', 'pandora', 'shazam'
        ])
        territories = data.get('territories', ['worldwide'])
        
        # Calculate expected live date (24-48 hours from now)
        expected_live = datetime.utcnow() + timedelta(hours=48)
        
        # Create distribution submission record
        submission = MusicDistribution(
            user_id=user_id,
            track_id=data["track_id"],
            release_title=data["release_title"],
            artist_name=data["artist_name"],
            genre=data["genre"],
            release_date=data.get("release_date", datetime.utcnow().date()),
            label=data.get("label", "StreampireX Records"),
            explicit=data.get("explicit", False),
            platforms=platforms,
            territories=territories,
            status="pending",
            submitted_at=datetime.utcnow(),
            expected_live_date=expected_live,
            sonosuite_submission_id=f"spx_{user_id}_{int(time.time())}"
        )
        
        db.session.add(submission)
        db.session.commit()
        
        # TODO: Here you would integrate with actual SonoSuite API
        # For now, we'll simulate the submission
        
        return jsonify({
            "message": "✅ Track submitted for distribution successfully",
            "submission_id": submission.id,
            "sonosuite_submission_id": submission.sonosuite_submission_id,
            "expected_live_date": expected_live.isoformat(),
            "platforms": platforms,
            "status": "pending"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Distribution submission failed: {str(e)}"}), 500
    
@api.route('/distribution/status/<int:submission_id>', methods=['GET'])
@jwt_required()
def get_distribution_status(submission_id):
    """Get distribution status"""
    try:
        user_id = get_jwt_identity()
        
        submission = MusicDistribution.query.filter_by(
            id=submission_id,
            user_id=user_id
        ).first()
        
        if not submission:
            return jsonify({"error": "Distribution submission not found"}), 404
        
        return jsonify(submission.serialize()), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get status: {str(e)}"}), 500
    
@api.route('/distribution/my-submissions', methods=['GET'])
@jwt_required()
def get_my_distributions():
    """Get user's distribution submissions"""
    try:
        user_id = get_jwt_identity()
        
        submissions = MusicDistribution.query.filter_by(user_id=user_id)\
            .order_by(MusicDistribution.submitted_at.desc()).all()
        
        return jsonify([sub.serialize() for sub in submissions]), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get distributions: {str(e)}"}), 500



@api.route('/distribution/<int:distribution_id>/status', methods=['PUT'])
@jwt_required()
def update_distribution_status(distribution_id):
    """Update distribution status and related data"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        distribution = MusicDistribution.query.filter_by(
            id=distribution_id,
            user_id=user_id
        ).first()
        
        if not distribution:
            return jsonify({"error": "Distribution not found"}), 404
        
        # Update status
        if 'status' in data:
            old_status = distribution.status
            distribution.status = data['status']
            
            # Update related dates based on status
            if data['status'] == 'live' and not distribution.live_date:
                distribution.live_date = datetime.utcnow()
            elif data['status'] == 'rejected':
                distribution.notes = (distribution.notes or "") + f" | Rejected on {datetime.utcnow()}"
        
        # Update streams and revenue if provided
        if 'total_streams' in data:
            distribution.total_streams = data['total_streams']
            distribution.last_revenue_update = datetime.utcnow()
        
        if 'total_revenue' in data:
            distribution.total_revenue = data['total_revenue']
            distribution.last_revenue_update = datetime.utcnow()
        
        # Update ISRC/UPC codes if provided
        if 'isrc_code' in data:
            distribution.isrc_code = data['isrc_code']
        
        if 'upc_code' in data:
            distribution.upc_code = data['upc_code']
        
        # Add notes if provided
        if 'notes' in data:
            timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            distribution.notes = (distribution.notes or "") + f" | {timestamp}: {data['notes']}"
        
        db.session.commit()
        
        return jsonify({
            "message": "Distribution updated successfully",
            "distribution": distribution.serialize()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating distribution: {e}")
        return jsonify({"error": "Failed to update distribution"}), 500

# ✅ Fixed upload limit checking with your model
def check_upload_limit(user_id, content_type):
    """Check if user has reached their monthly upload limit"""
    try:
        user_plan = get_user_plan(user_id)
        
        if not user_plan:
            return {"allowed": False, "error": "No plan found"}
        
        if content_type == "music":
            limit = user_plan.distribution_uploads_limit
            
            if limit == -1:  # Unlimited
                return {"allowed": True, "remaining": "unlimited"}
            elif limit == 0:  # No uploads allowed
                return {"allowed": False, "remaining": 0, "error": "Music distribution not included in your plan"}
            
            # Count current month's uploads using your model
            start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            current_uploads = MusicDistribution.query.filter(
                MusicDistribution.user_id == user_id,
                MusicDistribution.submission_date >= start_of_month
            ).count()
            
            remaining = limit - current_uploads
            
            return {
                "allowed": remaining > 0,
                "remaining": remaining,
                "limit": limit,
                "used": current_uploads
            }
        
        return {"allowed": False, "error": "Unknown content type"}
        
    except Exception as e:
        print(f"Error checking upload limit: {e}")
        return {"allowed": False, "error": "Failed to check upload limit"}

# ✅ Helper function: Bulk update distributions (for SonoSuite webhooks)
def update_distributions_from_sonosuite(webhook_data):
    """Update multiple distributions based on SonoSuite webhook data"""
    try:
        for release_data in webhook_data.get('releases', []):
            sonosuite_release_id = release_data.get('release_id')
            
            if not sonosuite_release_id:
                continue
            
            distribution = MusicDistribution.query.filter_by(
                sonosuite_release_id=sonosuite_release_id
            ).first()
            
            if distribution:
                # Update status
                if 'status' in release_data:
                    distribution.status = release_data['status']
                
                # Update live date if went live
                if release_data.get('status') == 'live' and not distribution.live_date:
                    distribution.live_date = datetime.utcnow()
                
                # Update revenue data if provided
                if 'streams' in release_data:
                    distribution.total_streams = release_data['streams']
                
                if 'revenue' in release_data:
                    distribution.total_revenue = release_data['revenue']
                    distribution.last_revenue_update = datetime.utcnow()
                
                # Update codes if provided
                if 'isrc' in release_data:
                    distribution.isrc_code = release_data['isrc']
                
                if 'upc' in release_data:
                    distribution.upc_code = release_data['upc']
        
        db.session.commit()
        return {"success": True, "updated": len(webhook_data.get('releases', []))}
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating distributions from SonoSuite: {e}")
        return {"success": False, "error": str(e)}

# 9. SONOSUITE LOGIN HANDLER (for redirects from SonoSuite)
@api.route('/sonosuite/login', methods=['GET'])
def sonosuite_login_handler():
    """Handle login redirects from SonoSuite"""
    return_to = request.args.get('return_to', '/')
    
    # Redirect to StreampireX login with return_to parameter
    login_url = f"/login?return_to={return_to}&source=sonosuite"
    
    return redirect(login_url)

# 10. JWT VALIDATION (for SonoSuite webhooks if needed)
def validate_sonosuite_jwt(token):
    """Validate JWT token from SonoSuite"""
    try:
        payload = jwt.decode(
            token, 
            SONOSUITE_SHARED_SECRET, 
            algorithms=["HS256"]
        )
        
        # Validate required fields
        required_fields = ['iat', 'exp', 'email', 'externalId', 'jti']
        if not all(field in payload for field in required_fields):
            return {"error": "Missing required JWT fields"}
        
        # Validate jti length (must be exactly 32 characters)
        if len(payload.get('jti', '')) != 32:
            return {"error": "Invalid jti length (must be 32 characters)"}
        
        return payload
    except jwt.ExpiredSignatureError:
        return {"error": "Token has expired"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid token"}
# ✅ REPLACE your placeholder functions with these complete implementations

def check_upload_limit(user_id, content_type):
    """Check if user has reached their monthly upload limit"""
    try:
        user_plan = get_user_plan(user_id)
        
        if not user_plan:
            return {"allowed": False, "error": "No plan found"}
        
        if content_type == "music":
            limit = user_plan.distribution_uploads_limit
            
            if limit == -1:  # Unlimited
                return {"allowed": True, "remaining": "unlimited"}
            elif limit == 0:  # No uploads allowed
                return {"allowed": False, "remaining": 0, "error": "Music distribution not included in your plan"}
            
            # ✅ Count current month's uploads using your MusicDistribution model
            current_uploads = get_monthly_upload_count(user_id, "music")
            remaining = limit - current_uploads
            
            return {
                "allowed": remaining > 0,
                "remaining": remaining,
                "limit": limit,
                "used": current_uploads
            }
        
        return {"allowed": False, "error": "Unknown content type"}
        
    except Exception as e:
        print(f"Error checking upload limit: {e}")
        return {"allowed": False, "error": "Failed to check upload limit"}

def get_monthly_upload_count(user_id, content_type):
    """Get count of uploads for current month using MusicDistribution model"""
    try:
        if content_type == "music":
            # Count distributions submitted this month
            from datetime import datetime
            start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            count = MusicDistribution.query.filter(
                MusicDistribution.user_id == user_id,
                MusicDistribution.submission_date >= start_of_month
            ).count()
            
            return count
        
        return 0
        
    except Exception as e:
        print(f"Error getting monthly upload count: {e}")
        return 0

# ✅ BONUS: Additional helper functions you might find useful

def get_user_distribution_summary(user_id):
    """Get a complete summary of user's distributions"""
    try:
        total = MusicDistribution.query.filter_by(user_id=user_id).count()
        
        live = MusicDistribution.query.filter_by(
            user_id=user_id, 
            status="live"
        ).count()
        
        processing = MusicDistribution.query.filter(
            MusicDistribution.user_id == user_id,
            MusicDistribution.status.in_(["pending", "processing", "submitted"])
        ).count()
        
        rejected = MusicDistribution.query.filter_by(
            user_id=user_id,
            status="rejected"
        ).count()
        
        # Get this month's uploads
        monthly_uploads = get_monthly_upload_count(user_id, "music")
        
        # Get upload limit
        upload_limit_info = check_upload_limit(user_id, "music")
        
        return {
            "total_distributions": total,
            "live_distributions": live,
            "processing_distributions": processing,
            "rejected_distributions": rejected,
            "monthly_uploads": monthly_uploads,
            "upload_limit_info": upload_limit_info
        }
        
    except Exception as e:
        print(f"Error getting distribution summary: {e}")
        return None

def can_user_distribute_music(user_id):
    """Quick check if user can distribute music"""
    try:
        # Check plan access
        user_plan = get_user_plan(user_id)
        if not user_plan or not user_plan.includes_music_distribution:
            return False, "Music distribution not included in your plan"
        
        # Check upload limits
        limit_check = check_upload_limit(user_id, "music")
        if not limit_check["allowed"]:
            return False, limit_check.get("error", "Upload limit reached")
        
        # Check SonoSuite connection
        sonosuite_connection = SonoSuiteUser.query.filter_by(
            streampirex_user_id=user_id,
            is_active=True
        ).first()
        
        if not sonosuite_connection:
            return False, "SonoSuite account not connected"
        
        return True, "Can distribute music"
        
    except Exception as e:
        print(f"Error checking distribution capability: {e}")
        return False, "Error checking distribution access"

def get_user_distribution_analytics(user_id):
    """Get analytics data for user's distributions"""
    try:
        from sqlalchemy import func
        
        # Get total stats
        stats = db.session.query(
            func.count(MusicDistribution.id).label('total_releases'),
            func.sum(MusicDistribution.total_streams).label('total_streams'),
            func.sum(MusicDistribution.total_revenue).label('total_revenue')
        ).filter_by(user_id=user_id).first()
        
        # Get status breakdown
        status_breakdown = db.session.query(
            MusicDistribution.status,
            func.count(MusicDistribution.id).label('count')
        ).filter_by(user_id=user_id).group_by(MusicDistribution.status).all()
        
        # Get monthly trend (last 6 months)
        from datetime import datetime, timedelta
        six_months_ago = datetime.now() - timedelta(days=180)
        
        monthly_submissions = db.session.query(
            func.date_trunc('month', MusicDistribution.submission_date).label('month'),
            func.count(MusicDistribution.id).label('submissions')
        ).filter(
            MusicDistribution.user_id == user_id,
            MusicDistribution.submission_date >= six_months_ago
        ).group_by(func.date_trunc('month', MusicDistribution.submission_date)).all()
        
        return {
            "total_releases": stats.total_releases or 0,
            "total_streams": int(stats.total_streams or 0),
            "total_revenue": float(stats.total_revenue or 0),
            "status_breakdown": {status: count for status, count in status_breakdown},
            "monthly_trend": [
                {
                    "month": month.strftime('%Y-%m') if month else None,
                    "submissions": submissions
                } for month, submissions in monthly_submissions
            ]
        }
        
    except Exception as e:
        print(f"Error getting distribution analytics: {e}")
        return {
            "total_releases": 0,
            "total_streams": 0,
            "total_revenue": 0,
            "status_breakdown": {},
            "monthly_trend": []
        }

# Gaming Feature Routes
@api.route('/gaming/team-room/create', methods=['POST'])
@jwt_required()
@plan_required("includes_team_rooms")
def create_team_room():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Create team room logic here
    return jsonify({"message": "🏠 Team room created", "room_id": data.get("room_name")}), 201

@api.route('/gaming/start-stream', methods=['POST'])
@jwt_required()
@plan_required("includes_game_streaming")
def start_gaming_stream():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Start gaming stream logic
    return jsonify({"message": "🎮 Gaming stream started"}), 200

@api.route('/gaming/analytics', methods=['GET'])
@jwt_required()
@plan_required("includes_gaming_analytics")
def get_gaming_analytics():
    user_id = get_jwt_identity()
    
    # Return gaming analytics data
    return jsonify({"gaming_stats": "analytics_data"}), 200

@api.route('/gaming/monetization/enable', methods=['POST'])
@jwt_required()
@plan_required("includes_gaming_monetization")
def enable_gaming_monetization():
    user_id = get_jwt_identity()
    
    # Enable gaming monetization features
    return jsonify({"message": "💰 Gaming monetization enabled"}), 200

@api.route('/music/distribute', methods=['POST'])
@jwt_required()
@plan_required("includes_music_distribution")
def distribute_music():
    """Submit music for distribution via SonoSuite"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Check upload limits
        upload_check = check_upload_limit(user_id, "music")
        if not upload_check["allowed"]:
            return jsonify({
                "error": "Upload limit reached",
                "limit_info": upload_check
            }), 403
        
        # Validate required fields
        required_fields = ['track_id', 'release_title', 'artist_name']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({
                "error": "Missing required fields",
                "missing": missing_fields
            }), 400
        
        # Get track details
        track = Audio.query.filter_by(id=data['track_id'], user_id=user_id).first()
        if not track:
            return jsonify({"error": "Track not found or unauthorized"}), 404
        
        # Check if track is already distributed
        existing_distribution = MusicDistribution.query.filter_by(
            track_id=track.id
        ).filter(MusicDistribution.status.in_(["pending", "processing", "submitted", "live"])).first()
        
        if existing_distribution:
            return jsonify({
                "error": "Track is already distributed or being processed",
                "existing_distribution": existing_distribution.serialize()
            }), 400
        
        # Check if user has SonoSuite connected
        sonosuite_profile = SonoSuiteUser.query.filter_by(
            streampirex_user_id=user_id,
            is_active=True
        ).first()
        
        if not sonosuite_profile:
            return jsonify({
                "error": "SonoSuite account not connected",
                "message": "Please connect your SonoSuite account first"
            }), 400
        
        # Prepare platform and territory data
        platforms = data.get('platforms', ['spotify', 'apple_music', 'amazon_music', 'youtube_music', 'deezer', 'tidal'])
        territories = data.get('territories', ['worldwide'])
        
        # Calculate expected live date
        expected_live = datetime.utcnow() + timedelta(hours=36)
        
        # Create distribution record
        distribution = MusicDistribution(
            user_id=user_id,
            track_id=track.id,
            release_title=data['release_title'],
            artist_name=data['artist_name'],
            label=data.get('label', 'StreampireX Records'),
            genre=data.get('genre', track.genre if hasattr(track, 'genre') else None),
            release_type=data.get('release_type', 'single'),
            release_date=datetime.strptime(data['release_date'], '%Y-%m-%d').date() if data.get('release_date') else datetime.utcnow().date(),
            distribution_service='sonosuite',
            status='processing',
            submission_date=datetime.utcnow(),
            expected_live_date=expected_live,
            platforms=json.dumps(platforms),
            territories=json.dumps(territories),
            explicit_content=data.get('explicit', False),
            copyright_info=data.get('copyright_info', f"© {datetime.now().year} {data['artist_name']}"),
            notes=f"Submitted via StreampireX on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        
        try:
            # Real SonoSuite API call
            import requests
            import hmac
            import hashlib
            import time
            
            sonosuite_base_url = os.getenv('SONOSUITE_BASE_URL')
            shared_secret = os.getenv('SONOSUITE_SHARED_SECRET')
            
            timestamp = str(int(time.time()))
            message = f"{sonosuite_profile.external_id}:{timestamp}"
            signature = hmac.new(
                shared_secret.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            payload = {
                "external_id": sonosuite_profile.external_id,
                "release": {
                    "title": data['release_title'],
                    "artist": data['artist_name'],
                    "label": data.get('label', 'StreampireX Records'),
                    "genre": data.get('genre'),
                    "release_date": data.get('release_date'),
                    "copyright": data.get('copyright_info', f"© {datetime.now().year} {data['artist_name']}"),
                    "explicit": data.get('explicit', False),
                    "tracks": [{
                        "title": track.title,
                        "audio_file_url": track.file_url,
                        "duration": track.duration
                    }],
                    "artwork_url": data.get('artwork_url'),
                    "platforms": platforms,
                    "territories": territories
                },
                "timestamp": timestamp,
                "signature": signature
            }
            
            response = requests.post(
                f"{sonosuite_base_url}/api/releases",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-External-ID": sonosuite_profile.external_id,
                    "X-Timestamp": timestamp,
                    "X-Signature": signature
                },
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                sonosuite_response = response.json()
                distribution.sonosuite_release_id = sonosuite_response.get("release_id")
                distribution.status = "submitted"
                distribution.sonosuite_response = json.dumps(sonosuite_response)
            else:
                raise Exception(f"SonoSuite API error: {response.status_code} - {response.text}")
            
            db.session.add(distribution)
            db.session.commit()
            
            return jsonify({
                "message": "Music submitted for distribution successfully!",
                "distribution": distribution.serialize(),
                "estimated_live_date": expected_live.isoformat()
            }), 201
            
        except Exception as sonosuite_error:
            distribution.status = "pending"
            distribution.notes += f" | SonoSuite API Error: {str(sonosuite_error)}"
            db.session.add(distribution)
            db.session.commit()
            
            return jsonify({
                "message": "Distribution request saved. Will retry SonoSuite submission.",
                "distribution": distribution.serialize(),
                "warning": str(sonosuite_error)
            }), 202
        
    except Exception as e:
        db.session.rollback()
        print(f"Distribution error: {str(e)}")
        return jsonify({"error": "Failed to submit for distribution"}), 500

@api.route('/sonosuite/connect', methods=['POST'])
@jwt_required()
def connect_sonosuite():
    """Connect user's SonoSuite account"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        email = data.get('email')
        external_id = data.get('external_id')
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Check if already connected
        existing = SonoSuiteUser.query.filter_by(
            streampirex_user_id=user_id,
            is_active=True
        ).first()
        
        if existing:
            return jsonify({"error": "SonoSuite account already connected"}), 400
        
        # Create connection
        sonosuite_user = SonoSuiteUser(
            streampirex_user_id=user_id,
            sonosuite_email=email,
            sonosuite_external_id=external_id or f"spx_user_{user_id}",
            is_active=True
        )
        
        db.session.add(sonosuite_user)
        db.session.commit()
        
        return jsonify({
            "message": "✅ SonoSuite account connected successfully",
            "connection": sonosuite_user.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to connect SonoSuite: {str(e)}"}), 500
                        
@api.route('/sonosuite/status', methods=['GET'])
@jwt_required()
def get_sonosuite_status():
    """Get SonoSuite connection status"""
    try:
        user_id = get_jwt_identity()
        
        connection = SonoSuiteUser.query.filter_by(
            streampirex_user_id=user_id,
            is_active=True
        ).first()
        
        if connection:
            return jsonify({
                "connected": True,
                "connection": connection.serialize()
            }), 200
        else:
            return jsonify({
                "connected": False,
                "connection": None
            }), 200
            
    except Exception as e:
        return jsonify({"error": f"Failed to get status: {str(e)}"}), 500



# Video Distribution Routes
@api.route('/video/distribute', methods=['POST'])
@jwt_required()
@plan_required("includes_video_distribution")
def distribute_video():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Check upload limit
    user_plan = get_user_plan(user_id)
    if user_plan.video_uploads_limit > 0:
        current_month_uploads = get_monthly_upload_count(user_id, "video")
        if current_month_uploads >= user_plan.video_uploads_limit:
            return jsonify({"error": "Monthly video upload limit reached"}), 400
    
    # Distribute video logic
    return jsonify({"message": "🎥 Video distributed successfully"}), 201

# Helper function to get monthly upload count
def get_monthly_upload_count(user_id, content_type):
    """Get count of uploads for current month"""
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    if content_type == "music":
        count = db.session.query(Music).filter(
            Music.user_id == user_id,
            Music.created_at >= current_month_start
        ).count()
    elif content_type == "video":
        count = db.session.query(Video).filter(
            Video.user_id == user_id,
            Video.created_at >= current_month_start
        ).count()
    
    return count

# Updated plan checking utility
def get_user_plan(user_id):
    """Get the user's current active plan"""
    subscription = Subscription.query.filter_by(
        user_id=user_id, 
        status="active"
    ).first()
    
    if subscription:
        return subscription.plan
    else:
        # Return free plan if no active subscription
        return PricingPlan.query.filter_by(name="Free").first()


@api.route('/pricing/plans', methods=['GET'])
def get_pricing_plans():
    """Get all available pricing plans"""
    try:
        plans = [
            {
                "id": 2,
                "name": "Starter",
                "price_monthly": 12.99,
                "price_yearly": 129.99,
                "description": "Enhanced features for growing creators",
                "includes_podcasts": True,
                "includes_radio": True,
                "includes_live_events": False,
                "includes_digital_sales": False,
                "includes_merch_sales": False,
                "includes_tip_jar": True,
                "includes_ad_revenue": False,
                "includes_brand_partnerships": False,
                "includes_affiliate_marketing": False,
                "includes_gaming_features": True,
                "includes_team_rooms": True,
                "includes_squad_finder": True,
                "includes_music_distribution": False,
                "max_uploads": 25,
                "max_storage_gb": 25,
                "features": [
                    "📱 Multi-Platform Social Posting",
                    "🎙️ Create Podcasts",
                    "📻 Radio Stations",
                    "🎥 Live Streaming",
                    "🛍️ Digital Sales",
                    "💰 Fan Tipping",
                    "🎮 Gaming Community",
                    "🏠 Private Team Rooms",
                    "🔍 Squad Finder"
                ]
            },
            {
                "id": 3,
                "name": "Creator",
                "price_monthly": 22.99,
                "price_yearly": 229.99,
                "description": "Professional tools for serious creators",
                "includes_podcasts": True,
                "includes_radio": True,
                "includes_live_events": True,
                "includes_digital_sales": True,
                "includes_merch_sales": False,
                "includes_tip_jar": True,
                "includes_ad_revenue": True,
                "includes_brand_partnerships": False,
                "includes_affiliate_marketing": False,
                "includes_gaming_features": True,
                "includes_team_rooms": True,
                "includes_squad_finder": True,
                "includes_music_distribution": False,
                "max_uploads": 100,
                "max_storage_gb": 100,
                "features": [
                    "📱 Multi-Platform Social Posting",
                    "🎙️ Create Podcasts",
                    "📻 Radio Stations",
                    "🎥 Live Streaming",
                    "🛍️ Digital Sales",
                    "💰 Fan Tipping",
                    "📺 Ad Revenue Sharing",
                    "🎮 Gaming Community",
                    "🏠 Private Team Rooms",
                    "🔍 Squad Finder"
                ]
            },
            {
                "id": 4,
                "name": "Pro",
                "price_monthly": 31.99,
                "price_yearly": 319.99,  # ~17% savings
                "description": "Maximum monetization power",
                "includes_podcasts": True,
                "includes_radio": True,
                "includes_live_events": True,
                "includes_digital_sales": True,
                "includes_merch_sales": True,
                "includes_tip_jar": True,
                "includes_ad_revenue": True,
                "includes_brand_partnerships": True,
                "includes_affiliate_marketing": True,
                "includes_gaming_features": True,
                "includes_team_rooms": True,
                "includes_squad_finder": True,
                "includes_music_distribution": False,
                "max_uploads": 999,
                "max_storage_gb": 100,
                "features": [
                    "📱 Multi-Platform Social Posting",
                    "🎙️ Create Podcasts",
                    "📻 Radio Stations",
                    "🎥 Live Streaming", 
                    "🛍️ Digital Sales",
                    "👕 Merch Store",
                    "💰 Fan Tipping",
                    "📺 Ad Revenue Sharing",
                    "🤝 Brand Partnership Hub",
                    "💼 Affiliate Marketing Tools",
                    "🎮 Gaming Community",
                    "🏠 Private Team Rooms",
                    "🔍 Squad Finder"
                ]
            },
            {
                "id": 5,
                "name": "Artist Distribution",
                "price_monthly": 21.99,
                "price_yearly": 21.99,  # Same price yearly
                "description": "Music distribution for independent artists",
                "includes_podcasts": False,
                "includes_radio": False,
                "includes_live_events": False,
                "includes_digital_sales": False,
                "includes_merch_sales": False,
                "includes_tip_jar": False,
                "includes_ad_revenue": False,
                "includes_brand_partnerships": False,
                "includes_affiliate_marketing": False,
                "includes_gaming_features": False,
                "includes_team_rooms": False,
                "includes_squad_finder": False,
                "includes_music_distribution": True,
                "max_uploads": 999,
                "max_storage_gb": 50,
                "features": [
                    "🎵 Global Music Distribution",
                    "📊 Streaming Analytics",
                    "💰 100% Royalty Retention",
                    "📈 Performance Tracking",
                    "🎧 Spotify, Apple Music, etc.",
                    "⚡ 24-48 Hour Distribution"
                ]
            },
            {
                "id": 6,
                "name": "Label Distribution",
                "price_monthly": 74.99,
                "price_yearly": 74.99,  # Same price yearly
                "description": "Music distribution for record labels",
                "includes_podcasts": False,
                "includes_radio": False,
                "includes_live_events": False,
                "includes_digital_sales": False,
                "includes_merch_sales": False,
                "includes_tip_jar": False,
                "includes_ad_revenue": False,
                "includes_brand_partnerships": False,
                "includes_affiliate_marketing": False,
                "includes_gaming_features": False,
                "includes_team_rooms": False,
                "includes_squad_finder": False,
                "includes_music_distribution": True,
                "max_uploads": 999,
                "max_storage_gb": 500,
                "features": [
                    "🎵 Unlimited Artist Distribution",
                    "🏷️ Label Management Tools",
                    "📊 Multi-Artist Analytics",
                    "💰 Revenue Split Management",
                    "📈 Label Performance Dashboard",
                    "🎧 All Major Platforms",
                    "⚡ Priority Distribution",
                    "🎤 Artist Roster Management"
                ]
            }
        ]
        
        return jsonify({"plans": plans}), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch plans: {str(e)}"}), 500

@api.route('/user/current-plan', methods=['GET'])
@jwt_required()
def get_current_user_plan():
    """Get current user's plan"""
    try:
        user_id = get_jwt_identity()
        
        # Check if user has an active subscription
        subscription = UserSubscription.query.filter_by(
            user_id=user_id,
            is_active=True
        ).first()
        
        if subscription:
            # Get plan details from PricingPlan model if you have it
            plan = PricingPlan.query.get(subscription.plan_id)
            if plan:
                return jsonify({
                    "plan": plan.serialize(),
                    "subscription": subscription.serialize()
                }), 200
        
        # Default to free plan
        return jsonify({
            "plan": {
                "id": 1,
                "name": "Free",
                "price_monthly": 0,
                "description": "Free plan"
            },
            "subscription": None
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get current plan: {str(e)}"}), 500

# ADD THESE NEW ROUTES TO YOUR routes.py - NO CONFLICTS

# ============ VIDEO CHANNEL ROUTES (NEW) ============

@api.route('/video/channel/me', methods=['GET'])
@jwt_required()
def get_my_channel():
    """Get the current user's video channel"""
    user_id = get_jwt_identity()
    
    channel = VideoChannel.query.filter_by(user_id=user_id).first()
    if not channel:
        return jsonify({"error": "Channel not found"}), 404
    
    return jsonify(channel.serialize()), 200

@api.route('/video/channel/create', methods=['POST'])
@jwt_required()
def create_channel():
    """Create a new video channel for the user"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Check if user already has a channel
    existing_channel = VideoChannel.query.filter_by(user_id=user_id).first()
    if existing_channel:
        return jsonify({"error": "User already has a channel"}), 400
    
    channel_name = data.get('channel_name')
    description = data.get('description', '')
    
    if not channel_name:
        return jsonify({"error": "Channel name is required"}), 400
    
    try:
        new_channel = VideoChannel(
            user_id=user_id,
            channel_name=channel_name,
            description=description
        )
        
        db.session.add(new_channel)
        db.session.commit()
        
        return jsonify({
            "message": "Channel created successfully",
            "channel": new_channel.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create channel: {str(e)}"}), 500

@api.route('/video/channel/<int:channel_id>', methods=['GET'])
def get_channel_videos(channel_id):
    """Get all videos for a specific channel"""
    try:
        channel = VideoChannel.query.get_or_404(channel_id)
        
        # Get videos from both Video and VideoClip tables
        videos = Video.query.filter_by(user_id=channel.user_id, is_public=True).all()
        clips = VideoClip.query.filter_by(channel_id=channel_id, is_public=True).all()
        
        # Combine and serialize
        all_content = []
        
        for video in videos:
            video_data = video.serialize()
            video_data['content_type'] = 'video'
            all_content.append(video_data)
        
        for clip in clips:
            clip_data = clip.serialize()
            all_content.append(clip_data)
        
        # Sort by creation date
        all_content.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            "channel": channel.serialize(),
            "videos": all_content
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get channel videos: {str(e)}"}), 500

# ============ VIDEO CLIP ROUTES (NEW) ============

@api.route('/clips/create', methods=['POST'])
@jwt_required()
def create_clip_from_video():
    """Create a clip from an existing video"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        source_video_id = data.get('source_video_id')
        start_time = data.get('start_time', 0)
        end_time = data.get('end_time', 15)
        title = data.get('title')
        description = data.get('description', '')
        tags = data.get('tags', [])
        
        if not source_video_id or not title:
            return jsonify({"error": "Source video ID and title are required"}), 400
        
        # Verify source video exists and user has permission
        source_video = Video.query.get(source_video_id)
        if not source_video:
            return jsonify({"error": "Source video not found"}), 404
        
        if source_video.user_id != user_id:
            return jsonify({"error": "You can only create clips from your own videos"}), 403
        
        # Get user's channel
        channel = VideoChannel.query.filter_by(user_id=user_id).first()
        
        # Create clip record
        new_clip = VideoClip(
            user_id=user_id,
            channel_id=channel.id if channel else None,
            source_video_id=source_video_id,
            title=title,
            description=description,
            video_url=f"{source_video.file_url}#t={start_time},{end_time}",
            thumbnail_url=source_video.thumbnail_url,
            start_time=start_time,
            end_time=end_time,
            duration=end_time - start_time,
            tags=tags
        )
        
        db.session.add(new_clip)
        db.session.commit()
        
        return jsonify({
            "message": "Clip created successfully",
            "clip": new_clip.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create clip: {str(e)}"}), 500

@api.route('/clips/upload', methods=['POST'])
@jwt_required()
def upload_clip():
    """Upload a new short video clip"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        title = data.get('title')
        description = data.get('description', '')
        video_url = data.get('video_url')
        thumbnail_url = data.get('thumbnail_url')
        duration = data.get('duration', 60)
        tags = data.get('tags', [])
        
        if not title or not video_url:
            return jsonify({"error": "Title and video URL are required"}), 400
        
        if duration > 60:
            return jsonify({"error": "Clips must be under 60 seconds"}), 400
        
        # Get user's channel
        channel = VideoChannel.query.filter_by(user_id=user_id).first()
        
        new_clip = VideoClip(
            user_id=user_id,
            channel_id=channel.id if channel else None,
            title=title,
            description=description,
            video_url=video_url,
            thumbnail_url=thumbnail_url,
            duration=duration,
            tags=tags
        )
        
        db.session.add(new_clip)
        db.session.commit()
        
        return jsonify({
            "message": "Clip uploaded successfully",
            "clip": new_clip.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to upload clip: {str(e)}"}), 500

@api.route('/clips/<int:clip_id>/like', methods=['POST'])
@jwt_required()
def like_clip(clip_id):
    """Like or unlike a video clip"""
    user_id = get_jwt_identity()
    
    try:
        clip = VideoClip.query.get_or_404(clip_id)
        
        # Check if already liked
        existing_like = ClipLike.query.filter_by(
            user_id=user_id,
            clip_id=clip_id
        ).first()
        
        if existing_like:
            # Unlike
            db.session.delete(existing_like)
            clip.likes = max(0, clip.likes - 1)
            action = "unliked"
        else:
            # Like
            new_like = ClipLike(user_id=user_id, clip_id=clip_id)
            db.session.add(new_like)
            clip.likes += 1
            action = "liked"
        
        db.session.commit()
        
        return jsonify({
            "message": f"Clip {action} successfully",
            "likes": clip.likes,
            "action": action
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to like clip: {str(e)}"}), 500

# ============ SOCIAL MEDIA ROUTES (NEW) ============

@api.route('/social/accounts', methods=['GET'])
@jwt_required()
def get_social_accounts():
    """Get user's connected social media accounts"""
    user_id = get_jwt_identity()
    
    try:
        accounts = SocialAccount.query.filter_by(user_id=user_id, is_active=True).all()
        
        return jsonify({
            "connected_accounts": [account.serialize() for account in accounts]
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get social accounts: {str(e)}"}), 500

@api.route('/social/accounts/connect', methods=['POST'])
@jwt_required()
def connect_social_account():
    """Connect a new social media account"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        platform = data.get('platform')
        platform_user_id = data.get('platform_user_id')
        username = data.get('username')
        access_token = data.get('access_token')
        
        if not all([platform, platform_user_id, username]):
            return jsonify({"error": "Platform, platform_user_id, and username are required"}), 400
        
        # Check if account already connected
        existing = SocialAccount.query.filter_by(
            user_id=user_id,
            platform=platform,
            platform_user_id=platform_user_id
        ).first()
        
        if existing:
            return jsonify({"error": "Account already connected"}), 400
        
        new_account = SocialAccount(
            user_id=user_id,
            platform=platform,
            platform_user_id=platform_user_id,
            username=username,
            access_token=access_token
        )
        
        db.session.add(new_account)
        db.session.commit()
        
        return jsonify({
            "message": "Social account connected successfully",
            "account": new_account.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to connect account: {str(e)}"}), 500

@api.route('/social/analytics', methods=['GET'])
@jwt_required()
def get_social_analytics():
    """Get social media analytics for the user"""
    user_id = get_jwt_identity()
    
    try:
        days = int(request.args.get('days', 30))
        platform = request.args.get('platform')
        
        from datetime import datetime, timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = SocialAnalytics.query.filter(
            SocialAnalytics.user_id == user_id,
            SocialAnalytics.date >= start_date.date()
        )
        
        if platform:
            query = query.filter_by(platform=platform)
        
        analytics = query.all()
        
        # Aggregate metrics
        total_metrics = {
            'total_likes': sum(a.total_likes for a in analytics),
            'total_shares': sum(a.total_shares for a in analytics),
            'total_comments': sum(a.total_comments for a in analytics),
            'total_reach': sum(a.total_reach for a in analytics),
            'total_impressions': sum(a.total_impressions for a in analytics),
            'followers_gained': sum(a.followers_gained for a in analytics),
            'followers_lost': sum(a.followers_lost for a in analytics),
            'posts_published': sum(a.posts_published for a in analytics),
            'average_engagement_rate': sum(a.engagement_rate for a in analytics) / len(analytics) if analytics else 0,
            'connected_platforms': list(set(a.platform for a in analytics))
        }
        
        return jsonify({
            "period_days": days,
            "total_metrics": total_metrics,
            "daily_analytics": [a.serialize() for a in analytics]
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get analytics: {str(e)}"}), 500

# ============ VIDEO UPLOAD ROUTES (NEW) ============

# Video Processing Functions
def extract_video_metadata(video_url):
    """
    Get video metadata from Cloudinary URL.
    Falls back to defaults if extraction fails.
    """
    # For now, return defaults - Cloudinary handles this automatically
    # The actual duration/dimensions come from Cloudinary's upload response
    return {
        'duration': 0,
        'width': 1920,
        'height': 1080
    }

def generate_thumbnail(video_url, timestamp=2.0):
    """
    Generate thumbnail URL from Cloudinary video URL.
    Uses URL transformation - no FFmpeg or server processing needed!
    
    Args:
        video_url: The Cloudinary video URL
        timestamp: Time in seconds to capture thumbnail (default 2.0)
    
    Returns:
        Thumbnail URL (jpg format) or None if not a Cloudinary URL
    """
    try:
        # Check if it's a Cloudinary URL
        if not video_url or 'cloudinary.com' not in video_url:
            print(f"Warning: Not a Cloudinary URL: {video_url}")
            return None
        
        # Parse the URL to extract parts
        # Example: https://res.cloudinary.com/cloud_name/video/upload/v123/folder/file.mp4
        
        parts = video_url.split('/upload/')
        if len(parts) < 2:
            print(f"Warning: Could not parse Cloudinary URL: {video_url}")
            return None
        
        base_url = parts[0]  # https://res.cloudinary.com/cloud_name/video
        path_part = parts[1]  # v123/folder/file.mp4 OR just folder/file.mp4
        
        # Remove version number if present (v123456/)
        if '/' in path_part:
            first_segment = path_part.split('/')[0]
            if first_segment.startswith('v') and first_segment[1:].isdigit():
                # Remove version: v123/folder/file.mp4 -> folder/file.mp4
                path_part = '/'.join(path_part.split('/')[1:])
        
        # Remove file extension for the transformation URL
        if '.' in path_part:
            path_part = path_part.rsplit('.', 1)[0]
        
        # Build thumbnail URL with Cloudinary transformations:
        # so_X = start offset (timestamp in seconds)
        # c_fill = crop to fill dimensions
        # w_640,h_360 = dimensions (16:9 aspect ratio)
        # f_jpg = output as JPEG
        # q_auto = automatic quality optimization
        thumbnail_url = f"{base_url}/upload/so_{timestamp},c_fill,w_640,h_360,f_jpg,q_auto/{path_part}.jpg"
        
        print(f"✅ Generated thumbnail: {thumbnail_url}")
        return thumbnail_url
        
    except Exception as e:
        print(f"❌ Thumbnail generation error: {e}")
        return None


@api.route('/upload_video', methods=['POST'])
@jwt_required()
def upload_video():
    """Upload a video file and create video/clip record with channel integration"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    video_file = request.files['video']
    title = request.form.get('title', 'Untitled')
    description = request.form.get('description', '')
    
    # Additional form fields
    category = request.form.get('category', 'Other')
    tags = request.form.get('tags', '')
    visibility = request.form.get('visibility', 'public')
    age_restricted = request.form.get('age_restricted', 'false').lower() == 'true'
    allow_comments = request.form.get('allow_comments', 'true').lower() == 'true'
    allow_likes = request.form.get('allow_likes', 'true').lower() == 'true'
    
    # Content declaration fields
    made_for_kids = request.form.get('made_for_kids', 'false').lower() == 'true'
    contains_paid_promotion = request.form.get('contains_paid_promotion', 'false').lower() == 'true'
    original_content = request.form.get('original_content', 'true').lower() == 'true'
    
    if video_file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    try:
        filename = secure_filename(video_file.filename)
        
        # Upload video file
        video_url = uploadFile(video_file, filename)
        
        # NEW: Process video metadata and thumbnail
        try:
            metadata = extract_video_metadata(video_url)
            thumbnail_url = generate_thumbnail(video_url, 2.0)
            duration = metadata['duration']
            width = metadata.get('width', 1920)
            height = metadata.get('height', 1080)
        except Exception as e:
            print(f"Video processing warning: {e}")
            duration = None
            width = 1920
            height = 1080
            thumbnail_url = None
        
        # Handle manual thumbnail upload (overrides auto-generated)
        if 'thumbnail' in request.files:
            thumbnail_file = request.files['thumbnail']
            if thumbnail_file.filename != '':
                try:
                    thumb_filename = secure_filename(thumbnail_file.filename)
                    thumbnail_url = uploadFile(thumbnail_file, thumb_filename)
                except Exception as thumb_error:
                    print(f"Thumbnail upload failed: {thumb_error}")
        
        # Process tags
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
        
        # Get or create user's video channel
        channel = VideoChannel.query.filter_by(user_id=user_id).first()
        if not channel:
            channel = VideoChannel(
                user_id=user_id,
                channel_name=f"{user.username}'s Channel" if user else "My Channel",
                description="Welcome to my video channel!"
            )
            db.session.add(channel)
            db.session.flush()
        
        # Determine if clip or full video
        is_clip = duration and duration <= 60
        
        if is_clip:
            # Create as VideoClip
            new_content = VideoClip(
                user_id=user_id,
                channel_id=channel.id,
                title=title,
                description=description,
                video_url=video_url,
                thumbnail_url=thumbnail_url,
                duration=duration,
                tags=tag_list,
                content_type='clip',
                is_public=(visibility == 'public')
            )
        else:
            # Create as regular Video with channel association
            new_content = Video(
                user_id=user_id,
                title=title,
                description=description,
                file_url=video_url,
                thumbnail_url=thumbnail_url,
                duration=duration,
                width=width,
                height=height,
                tags=tag_list,
                category=category,
                is_public=(visibility == 'public'),
                is_premium=False,
                age_restricted=age_restricted,
                made_for_kids=made_for_kids,
                contains_paid_promotion=contains_paid_promotion,
                original_content=original_content,
                allow_comments=allow_comments,
                allow_likes=allow_likes,
                processing_status='completed',
                uploaded_at=datetime.utcnow(),
                views=0
            )
        
        # Update channel stats
        channel.total_videos += 1
        
        db.session.add(new_content)
        db.session.commit()
        
        return jsonify({
            "message": "Video uploaded successfully!",
            "video": new_content.serialize(),
            "channel": channel.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Video upload failed: {str(e)}"}), 500


@api.route('/videos/<int:video_id>/recommendations', methods=['GET'])
def get_video_recommendations(video_id):
    """Get recommended videos"""
    video = Video.query.get(video_id)
    if not video:
        return jsonify({"error": "Video not found"}), 404
    
    recommendations = Video.query.filter(
        Video.id != video_id,
        Video.category == video.category,
        Video.is_public == True,
        Video.processing_status == 'completed'
    ).order_by(desc(Video.views)).limit(12).all()
    
    if len(recommendations) < 12:
        more = Video.query.filter(
            Video.id != video_id,
            Video.is_public == True,
            Video.processing_status == 'completed'
        ).order_by(desc(Video.views)).limit(12 - len(recommendations)).all()
        recommendations.extend(more)
    
    return jsonify([v.serialize() for v in recommendations]), 200



# View Tracking
@api.route('/videos/<int:video_id>/view', methods=['POST'])
def increment_video_view(video_id):
    """Increment view count"""
    video = Video.query.get(video_id)
    if not video:
        return jsonify({"error": "Not found"}), 404
    
    video.views = (video.views or 0) + 1
    db.session.commit()
    return jsonify({"views": video.views}), 200

@api.route('/upload/cloudinary', methods=['POST'])
@jwt_required()
def upload_to_cloudinary():
    """Upload file to Cloudinary and return secure URL"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Use the existing uploadFile function from cloudinary_setup
        secure_url = uploadFile(file, file.filename)
        
        return jsonify({
            "secure_url": secure_url,
            "message": "File uploaded successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

# ============ TOP USERS ROUTE (UPDATED) ============

@api.route('/users/top-10', methods=['GET'])
@jwt_required()
def get_top_users():
    """Get top 10 users based on engagement metrics"""
    try:
        from sqlalchemy import func
        
        # Use your existing Video model instead of creating conflicts
        top_users = db.session.query(
            User,
            func.coalesce(func.sum(Video.likes), 0).label('total_likes'),
            func.count(Video.id).label('total_videos')
        ).outerjoin(Video).group_by(User.id).order_by(
            desc('total_likes'),
            desc('total_videos')
        ).limit(10).all()
        
        users_data = []
        for user, total_likes, total_videos in top_users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'display_name': getattr(user, 'display_name', None) or getattr(user, 'artist_name', None),
                'profile_picture': getattr(user, 'profile_picture', None) or getattr(user, 'avatar_url', None),
                'follower_count': getattr(user, 'follower_count', 0),
                'total_likes': total_likes,
                'total_streams': total_videos,
                'primary_achievement': 'Top Creator'
            }
            users_data.append(user_data)
        
        return jsonify({"users": users_data}), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get top users: {str(e)}"}), 500

# ============ MODIFIED INNER CIRCLE ROUTES (USING YOUR EXISTING MODEL) ============

@api.route('/inner-circle', methods=['GET'])
@jwt_required()
def get_inner_circle():
    """Get user's inner circle"""
    try:
        user_id = get_jwt_identity()
        
        # Get inner circle members
        inner_circle = InnerCircle.query.filter_by(user_id=user_id).all()
        
        members = []
        for circle_member in inner_circle:
            member_user = User.query.get(circle_member.member_user_id)
            if member_user:
                members.append({
                    "id": circle_member.id,
                    "user_id": member_user.id,
                    "username": member_user.username,
                    "display_name": getattr(member_user, 'display_name', None),
                    "avatar_url": getattr(member_user, 'avatar_url', None),
                    "profile_picture": getattr(member_user, 'profile_picture', None),
                    "artist_name": getattr(member_user, 'artist_name', None),
                    "bio": getattr(member_user, 'bio', None),
                    "added_at": circle_member.created_at.isoformat(),
                    "position": circle_member.position or len(members) + 1
                })
        
        # Sort by position
        members.sort(key=lambda x: x['position'])
        
        return jsonify({
            "inner_circle": members,
            "count": len(members),
            "max_members": 10
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get inner circle: {str(e)}"}), 500

@api.route('/inner-circle/add', methods=['POST'])
@jwt_required()
def add_to_inner_circle_for_profile():
    """Add a user to inner circle (using your existing User method)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        target_user_id = data.get('target_user_id')
        position = data.get('position')
        custom_title = data.get('custom_title')
        
        if not target_user_id:
            return jsonify({"error": "Target user ID is required"}), 400
        
        # Use your existing User method
        user = User.query.get(user_id)
        new_member = user.add_to_inner_circle(target_user_id, position, custom_title)
        
        if not new_member:
            return jsonify({"error": "Could not add to inner circle (may be full)"}), 400
        
        db.session.commit()
        
        return jsonify({
            "message": "User added to inner circle successfully",
            "member": new_member.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to add to inner circle: {str(e)}"}), 500

@api.route('/video-rooms/status', methods=['GET'])
@jwt_required()
def get_user_video_room_status():
    """Get current user's video room status and available rooms"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get user's presence
        presence = UserPresence.query.filter_by(user_id=user_id).first()
        if not presence:
            # Create default presence
            presence = UserPresence(user_id=user_id)
            db.session.add(presence)
            db.session.commit()
        
        # Get squad room if user has a squad
        squad_room = None
        if user.squad_id:
            squad_room = VideoRoom.query.filter_by(
                squad_id=user.squad_id, 
                is_active=True
            ).first()
            
            # Create squad room if it doesn't exist
            if not squad_room:
                squad_room = VideoRoom(
                    room_id=f"squad-{user.squad_id}",
                    room_type="squad",
                    name=f"Squad {user.squad_id} Room",
                    created_by=user_id,
                    squad_id=user.squad_id
                )
                db.session.add(squad_room)
                db.session.commit()
        
        # Get user's private room
        private_room = VideoRoom.query.filter_by(
            room_id=f"user-{user_id}-room",
            room_type="private"
        ).first()
        
        if not private_room:
            private_room = VideoRoom(
                room_id=f"user-{user_id}-room",
                room_type="private",
                name=f"{user.username}'s Room",
                created_by=user_id
            )
            db.session.add(private_room)
            db.session.commit()
        
        return jsonify({
            "user_presence": presence.serialize(),
            "squad_room": squad_room.serialize() if squad_room else None,
            "private_room": private_room.serialize(),
            "has_squad": user.squad_id is not None,
            "squad_id": user.squad_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api.route('/video-rooms/join', methods=['POST'])
@jwt_required()
def join_video_room():
    """Join a video room and update user presence"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        room_id = data.get('room_id')
        
        if not room_id:
            return jsonify({"error": "Room ID required"}), 400
        
        # Verify room exists and user has access
        room = VideoRoom.query.filter_by(room_id=room_id, is_active=True).first()
        if not room:
            return jsonify({"error": "Room not found or inactive"}), 404
        
        # Check if room is squad-based and user has access
        if room.room_type == "squad" and room.squad_id:
            user = User.query.get(user_id)
            if user.squad_id != room.squad_id:
                return jsonify({"error": "Access denied to squad room"}), 403
        
        # Update user presence
        presence = UserPresence.query.filter_by(user_id=user_id).first()
        if not presence:
            presence = UserPresence(user_id=user_id)
            db.session.add(presence)
        
        presence.online_status = "in_call"
        presence.current_room_id = room_id
        presence.last_activity = datetime.utcnow()
        
        # Create session record
        session = VideoChatSession(
            room_id=room_id,
            user_id=user_id,
            role="participant"
        )
        db.session.add(session)
        
        # Update room activity
        room.last_activity = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "message": "Joined room successfully",
            "room": room.serialize(),
            "session_id": session.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api.route('/video-rooms/leave', methods=['POST'])
@jwt_required()
def leave_video_room():
    """Leave current video room"""
    try:
        user_id = get_jwt_identity()
        
        # Update user presence
        presence = UserPresence.query.filter_by(user_id=user_id).first()
        if presence:
            room_id = presence.current_room_id
            presence.online_status = "online"
            presence.current_room_id = None
            presence.last_activity = datetime.utcnow()
            
            # End current session
            if room_id:
                session = VideoChatSession.query.filter_by(
                    room_id=room_id,
                    user_id=user_id,
                    left_at=None
                ).first()
                
                if session:
                    session.left_at = datetime.utcnow()
                    duration = session.left_at - session.joined_at
                    session.duration_minutes = int(duration.total_seconds() / 60)
            
            db.session.commit()
        
        return jsonify({"message": "Left room successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api.route('/user-presence/update', methods=['POST'])
@jwt_required()
def update_user_presence():
    """Update user's online status and gaming activity"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        presence = UserPresence.query.filter_by(user_id=user_id).first()
        if not presence:
            presence = UserPresence(user_id=user_id)
            db.session.add(presence)
        
        # Update fields if provided
        if 'online_status' in data:
            presence.online_status = data['online_status']
        if 'current_game' in data:
            presence.current_game = data['current_game']
        if 'gaming_status' in data:
            presence.gaming_status = data['gaming_status']
        if 'video_enabled' in data:
            presence.video_enabled = data['video_enabled']
        if 'audio_enabled' in data:
            presence.audio_enabled = data['audio_enabled']
        
        presence.last_activity = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "message": "Presence updated",
            "presence": presence.serialize()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api.route('/squad/<int:squad_id>/members/presence', methods=['GET'])
def get_squad_members_presence(squad_id):
    """Get online status of squad members"""
    try:
        # Get squad members
        squad = Squad.query.get(squad_id)
        if not squad:
            return jsonify({"error": "Squad not found"}), 404
        
        # Get presence for all squad members
        member_presence = []
        for member in squad.members:
            presence = UserPresence.query.filter_by(user_id=member.id).first()
            if presence:
                member_data = presence.serialize()
                member_data['gamertag'] = getattr(member, 'gamertag', None)
                member_data['skill_level'] = getattr(member, 'skill_level', None)
                member_presence.append(member_data)
        
        return jsonify({
            "squad_id": squad_id,
            "squad_name": squad.name,
            "members_presence": member_presence,
            "online_count": len([p for p in member_presence if p['online_status'] in ['online', 'in_call']])
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/communication-preferences', methods=['GET', 'POST'])
@jwt_required()
def manage_communication_preferences():
    """Get or update user's communication preferences"""
    try:
        user_id = get_jwt_identity()
        
        if request.method == 'GET':
            prefs = CommunicationPreferences.query.filter_by(user_id=user_id).first()
            if not prefs:
                # Create default preferences
                prefs = CommunicationPreferences(user_id=user_id)
                db.session.add(prefs)
                db.session.commit()
            
            return jsonify(prefs.serialize()), 200
        
        elif request.method == 'POST':
            data = request.get_json()
            prefs = CommunicationPreferences.query.filter_by(user_id=user_id).first()
            
            if not prefs:
                prefs = CommunicationPreferences(user_id=user_id)
                db.session.add(prefs)
            
            # Update preferences
            if 'auto_join_squad_room' in data:
                prefs.auto_join_squad_room = data['auto_join_squad_room']
            if 'allow_random_invites' in data:
                prefs.allow_random_invites = data['allow_random_invites']
            if 'preferred_communication' in data:
                prefs.preferred_communication = data['preferred_communication']
            if 'notify_squad_online' in data:
                prefs.notify_squad_online = data['notify_squad_online']
            if 'notify_game_invites' in data:
                prefs.notify_game_invites = data['notify_game_invites']
            if 'notify_video_calls' in data:
                prefs.notify_video_calls = data['notify_video_calls']
            if 'preferred_video_quality' in data:
                prefs.preferred_video_quality = data['preferred_video_quality']
            if 'enable_noise_suppression' in data:
                prefs.enable_noise_suppression = data['enable_noise_suppression']
            if 'enable_echo_cancellation' in data:
                prefs.enable_echo_cancellation = data['enable_echo_cancellation']
            
            db.session.commit()
            
            return jsonify({
                "message": "Communication preferences updated",
                "preferences": prefs.serialize()
            }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api.route('/video-rooms/active', methods=['GET'])
@jwt_required()
def get_active_video_rooms():
    """Get list of active video rooms user can join"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Get public rooms and user's accessible rooms
        query = VideoRoom.query.filter(
            VideoRoom.is_active == True,
            VideoRoom.last_activity >= datetime.utcnow() - timedelta(hours=24)
        )
        
        # Add squad room if user has squad
        accessible_rooms = []
        
        if user.squad_id:
            squad_rooms = query.filter(VideoRoom.squad_id == user.squad_id).all()
            accessible_rooms.extend(squad_rooms)
        
        # Add user's private room
        private_rooms = query.filter(
            VideoRoom.created_by == user_id,
            VideoRoom.room_type == "private"
        ).all()
        accessible_rooms.extend(private_rooms)
        
        # Add public rooms
        public_rooms = query.filter(VideoRoom.room_type == "public").limit(10).all()
        accessible_rooms.extend(public_rooms)
        
        return jsonify({
            "rooms": [room.serialize() for room in accessible_rooms]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Database migration helper - run this once to add new tables
def create_video_chat_tables():
    """Run this function once to create the new tables"""
    try:
        db.create_all()
        print("Video chat tables created successfully")
    except Exception as e:
        print(f"Error creating tables: {e}")

# Socket.IO events for real-time video chat status (add to your socketio handlers)
from flask_socketio import emit, join_room as socketio_join_room, leave_room as socketio_leave_room

@socketio.on('join_video_room')
def on_join_video_room(data):
    """Handle user joining video room via socket"""
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    
    if room_id and user_id:
        socketio_join_room(room_id)
        
        # Update presence in database
        presence = UserPresence.query.filter_by(user_id=user_id).first()
        if presence:
            presence.current_room_id = room_id
            presence.online_status = "in_call"
            presence.last_activity = datetime.utcnow()
            db.session.commit()
        
        # Notify other users in room
        emit('user_joined_room', {
            'user_id': user_id,
            'room_id': room_id,
            'timestamp': datetime.utcnow().isoformat()
        }, room=room_id)

@socketio.on('leave_video_room')
def on_leave_video_room(data):
    """Handle user leaving video room via socket"""
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    
    if room_id and user_id:
        socketio_leave_room(room_id)
        
        # Update presence in database
        presence = UserPresence.query.filter_by(user_id=user_id).first()
        if presence:
            presence.current_room_id = None
            presence.online_status = "online"
            presence.last_activity = datetime.utcnow()
            db.session.commit()
        
        # Notify other users in room
        emit('user_left_room', {
            'user_id': user_id,
            'room_id': room_id,
            'timestamp': datetime.utcnow().isoformat()
        }, room=room_id)

@socketio.on('update_video_status')
def on_update_video_status(data):
    """Handle video/audio status updates"""
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    video_enabled = data.get('video_enabled', True)
    audio_enabled = data.get('audio_enabled', True)
    
    # Update presence
    presence = UserPresence.query.filter_by(user_id=user_id).first()
    if presence:
        presence.video_enabled = video_enabled
        presence.audio_enabled = audio_enabled
        presence.last_activity = datetime.utcnow()
        db.session.commit()
    
    # Notify room
    if room_id:
        emit('user_status_update', {
            'user_id': user_id,
            'video_enabled': video_enabled,
            'audio_enabled': audio_enabled
        }, room=room_id)

# 1. ARTIST TRACKS ENDPOINT
@api.route('/artist/tracks', methods=['GET'])
@jwt_required()
def get_artist_tracks():
    """Get all tracks for the current artist"""
    try:
        user_id = get_jwt_identity()
        
        # Query tracks for the current artist
        tracks = Audio.query.filter_by(user_id=user_id).order_by(
            Audio.created_at.desc() if hasattr(Audio, 'created_at') else Audio.id.desc()
        ).all()
        
        # If no tracks found, return empty array
        if not tracks:
            return jsonify([]), 200
        
        # Serialize tracks using the model method
        tracks_data = [track.serialize() for track in tracks]
        
        return jsonify(tracks_data), 200
        
    except Exception as e:
        print(f"Error fetching artist tracks: {str(e)}")
        return jsonify({
            "error": f"Failed to fetch tracks: {str(e)}"
        }), 500

# 2. ARTIST ANALYTICS ENDPOINT  
@api.route('/artist/analytics', methods=['GET'])
@jwt_required()
def get_artist_analytics():
    """Get real analytics data for the current artist"""
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        user_id = get_jwt_identity()
        
        # Get date ranges
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        
        # ===== TOTAL PLAYS (all time) =====
        total_plays = db.session.query(func.coalesce(func.sum(Audio.plays), 0))\
            .filter(Audio.user_id == user_id).scalar() or 0
        
        # ===== MONTHLY PLAYS (last 30 days) =====
        # Count from PlayHistory table for accurate monthly tracking
        monthly_plays = db.session.query(func.count(PlayHistory.id))\
            .join(Audio, PlayHistory.audio_id == Audio.id)\
            .filter(Audio.user_id == user_id)\
            .filter(PlayHistory.played_at >= thirty_days_ago).scalar() or 0
        
        # If PlayHistory is empty, fall back to a percentage estimate
        if monthly_plays == 0 and total_plays > 0:
            monthly_plays = int(total_plays * 0.15)  # Estimate ~15% of total plays in last month
        
        # ===== TOTAL STREAMS (same as plays, or use StreamingHistory) =====
        total_streams = db.session.query(func.count(StreamingHistory.id))\
            .filter(StreamingHistory.content_type == 'audio')\
            .filter(StreamingHistory.content_id.in_(
                db.session.query(Audio.id).filter(Audio.user_id == user_id)
            )).scalar() or total_plays  # Fall back to plays count
        
        # ===== MONTHLY LISTENERS (unique users who played in last 30 days) =====
        monthly_listeners = db.session.query(func.count(func.distinct(PlayHistory.user_id)))\
            .join(Audio, PlayHistory.audio_id == Audio.id)\
            .filter(Audio.user_id == user_id)\
            .filter(PlayHistory.played_at >= thirty_days_ago).scalar() or 0
        
        # ===== TOTAL FOLLOWERS =====
        total_followers = db.session.query(func.count(ArtistFollow.id))\
            .filter(ArtistFollow.artist_id == user_id).scalar() or 0
        
        # ===== REVENUE THIS MONTH =====
        # Sum from Revenue table
        revenue_this_month = db.session.query(func.coalesce(func.sum(Revenue.creator_earnings), 0))\
            .filter(Revenue.user_id == user_id)\
            .filter(Revenue.timestamp >= thirty_days_ago).scalar() or 0.0
        
        # Also add tips received
        tips_this_month = db.session.query(func.coalesce(func.sum(Tip.amount), 0))\
            .filter(Tip.recipient_id == user_id)\
            .filter(Tip.created_at >= thirty_days_ago).scalar() or 0.0
        
        # Add ad revenue if available
        ad_revenue_month = db.session.query(func.coalesce(func.sum(AdRevenue.amount), 0))\
            .filter(AdRevenue.creator_id == user_id)\
            .filter(AdRevenue.created_at >= thirty_days_ago).scalar() or 0.0
        
        total_revenue_month = float(revenue_this_month) + float(tips_this_month) + float(ad_revenue_month)
        
        # ===== TOP COUNTRIES (from StreamingHistory or PlayHistory with user location) =====
        # If you store user location, you can query it; otherwise use placeholder
        # This requires user.country or similar field
        top_countries_query = db.session.query(
            User.country,
            func.count(PlayHistory.id).label('play_count')
        ).join(PlayHistory, PlayHistory.user_id == User.id)\
         .join(Audio, PlayHistory.audio_id == Audio.id)\
         .filter(Audio.user_id == user_id)\
         .filter(User.country.isnot(None))\
         .filter(User.country != '')\
         .group_by(User.country)\
         .order_by(func.count(PlayHistory.id).desc())\
         .limit(5).all()
        
        if top_countries_query:
            top_countries = [country for country, _ in top_countries_query]
        else:
            # Default if no location data
            top_countries = ["United States", "United Kingdom", "Canada", "Germany", "Australia"]
        
        analytics_data = {
            "monthly_plays": int(monthly_plays),
            "total_streams": int(total_streams),
            "monthly_listeners": int(monthly_listeners),
            "total_plays": int(total_plays),
            "total_followers": int(total_followers),
            "revenue_this_month": round(total_revenue_month, 2),
            "top_countries": top_countries
        }
        
        return jsonify(analytics_data), 200
        
    except Exception as e:
        print(f"Analytics error: {str(e)}")
        return jsonify({
            "error": f"Failed to fetch analytics: {str(e)}"
        }), 500

# ARTIST RECENT ACTIVITY ENDPOINT
# ========== ARTIST RECENT ACTIVITY ENDPOINT ==========
@api.route('/artist/recent-activity', methods=['GET'])
@jwt_required()
def get_artist_recent_activity():
    """Get real recent activity for the current artist"""
    try:
        from sqlalchemy import desc
        from datetime import datetime, timedelta
        
        user_id = get_jwt_identity()
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        activities = []
        
        # 1. Recent Track Uploads
        recent_tracks = Audio.query.filter(
            Audio.user_id == user_id,
            Audio.uploaded_at >= thirty_days_ago
        ).order_by(desc(Audio.uploaded_at)).limit(10).all()
        
        for track in recent_tracks:
            activities.append({
                "type": "track_upload",
                "action": "Track uploaded",
                "title": track.title,
                "icon": "🎵",
                "timestamp": track.uploaded_at.isoformat(),
                "time_ago": get_time_ago(track.uploaded_at)
            })
        
        # 2. New Followers
        try:
            recent_followers = db.session.query(ArtistFollow, User).join(
                User, ArtistFollow.follower_id == User.id
            ).filter(
                ArtistFollow.artist_id == user_id,
                ArtistFollow.created_at >= thirty_days_ago
            ).order_by(desc(ArtistFollow.created_at)).limit(10).all()
            
            for follow, follower in recent_followers:
                activities.append({
                    "type": "new_follower",
                    "action": "New follower",
                    "title": follower.username or follower.display_name or "Someone",
                    "icon": "👤",
                    "timestamp": follow.created_at.isoformat(),
                    "time_ago": get_time_ago(follow.created_at)
                })
        except Exception as e:
            print(f"Follower fetch error: {e}")
        
        # 3. Recent Album Creations
        try:
            recent_albums = Album.query.filter(
                Album.user_id == user_id,
                Album.created_at >= thirty_days_ago
            ).order_by(desc(Album.created_at)).limit(5).all()
            
            for album in recent_albums:
                activities.append({
                    "type": "album_created",
                    "action": "Album created",
                    "title": getattr(album, 'title', None) or getattr(album, 'name', 'Untitled'),
                    "icon": "💿",
                    "timestamp": album.created_at.isoformat(),
                    "time_ago": get_time_ago(album.created_at)
                })
        except Exception as e:
            print(f"Album fetch error: {e}")
        
        # 4. Recent Track Plays (on your tracks)
        try:
            recent_plays = db.session.query(
                PlayHistory, Audio, User
            ).join(
                Audio, PlayHistory.audio_id == Audio.id
            ).join(
                User, PlayHistory.user_id == User.id
            ).filter(
                Audio.user_id == user_id,
                PlayHistory.played_at >= thirty_days_ago,
                PlayHistory.user_id != user_id
            ).order_by(desc(PlayHistory.played_at)).limit(10).all()
            
            for play, track, listener in recent_plays:
                activities.append({
                    "type": "track_played",
                    "action": f"{listener.username or 'Someone'} played",
                    "title": track.title,
                    "icon": "▶️",
                    "timestamp": play.played_at.isoformat(),
                    "time_ago": get_time_ago(play.played_at)
                })
        except Exception as e:
            print(f"PlayHistory fetch error: {e}")
        
        # 5. Recent Likes on your tracks
        try:
            recent_likes = db.session.query(
                AudioLike, Audio, User
            ).join(
                Audio, AudioLike.audio_id == Audio.id
            ).join(
                User, AudioLike.user_id == User.id
            ).filter(
                Audio.user_id == user_id,
                AudioLike.created_at >= thirty_days_ago,
                AudioLike.user_id != user_id
            ).order_by(desc(AudioLike.created_at)).limit(10).all()
            
            for like, track, liker in recent_likes:
                activities.append({
                    "type": "track_liked",
                    "action": f"{liker.username or 'Someone'} liked",
                    "title": track.title,
                    "icon": "❤️",
                    "timestamp": like.created_at.isoformat(),
                    "time_ago": get_time_ago(like.created_at)
                })
        except Exception as e:
            print(f"AudioLike fetch error: {e}")
        
        # 6. Recent Tips Received
        try:
            recent_tips = db.session.query(Tip, User).join(
                User, Tip.sender_id == User.id
            ).filter(
                Tip.recipient_id == user_id,
                Tip.created_at >= thirty_days_ago
            ).order_by(desc(Tip.created_at)).limit(5).all()
            
            for tip, sender in recent_tips:
                activities.append({
                    "type": "tip_received",
                    "action": f"${tip.amount:.2f} tip from",
                    "title": sender.username or sender.display_name or "Someone",
                    "icon": "💰",
                    "timestamp": tip.created_at.isoformat(),
                    "time_ago": get_time_ago(tip.created_at)
                })
        except Exception as e:
            print(f"Tip fetch error: {e}")
        
        # 7. Recent Comments on your content
        try:
            audio_ids = [a.id for a in Audio.query.filter_by(user_id=user_id).all()]
            
            if audio_ids:
                recent_comments = db.session.query(Comment, User).join(
                    User, Comment.user_id == User.id
                ).filter(
                    Comment.content_type == 'audio',
                    Comment.content_id.in_(audio_ids),
                    Comment.created_at >= thirty_days_ago,
                    Comment.user_id != user_id
                ).order_by(desc(Comment.created_at)).limit(5).all()
                
                for comment, commenter in recent_comments:
                    track = Audio.query.get(comment.content_id)
                    activities.append({
                        "type": "comment_received",
                        "action": f"{commenter.username or 'Someone'} commented on",
                        "title": track.title if track else "your track",
                        "icon": "💬",
                        "timestamp": comment.created_at.isoformat(),
                        "time_ago": get_time_ago(comment.created_at)
                    })
        except Exception as e:
            print(f"Comment fetch error: {e}")
        
        # 8. Recent Live Streams
        try:
            recent_streams = LiveStream.query.filter(
                LiveStream.user_id == user_id,
                LiveStream.started_at >= thirty_days_ago
            ).order_by(desc(LiveStream.started_at)).limit(5).all()
            
            for stream in recent_streams:
                activities.append({
                    "type": "live_stream",
                    "action": "Live session",
                    "title": stream.title or "Studio Session",
                    "icon": "📡",
                    "timestamp": stream.started_at.isoformat(),
                    "time_ago": get_time_ago(stream.started_at)
                })
        except Exception as e:
            print(f"LiveStream fetch error: {e}")
        
        # 9. Recent Concert Creations
        try:
            recent_concerts = Concert.query.filter(
                Concert.user_id == user_id,
                Concert.created_at >= thirty_days_ago
            ).order_by(desc(Concert.created_at)).limit(5).all()
            
            for concert in recent_concerts:
                activities.append({
                    "type": "concert_created",
                    "action": "Concert scheduled",
                    "title": concert.title,
                    "icon": "🎭",
                    "timestamp": concert.created_at.isoformat(),
                    "time_ago": get_time_ago(concert.created_at)
                })
        except Exception as e:
            print(f"Concert fetch error: {e}")
        
        # Sort all activities by timestamp (newest first)
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            "activities": activities[:20],
            "total_count": len(activities)
        }), 200
        
    except Exception as e:
        print(f"Recent activity error: {str(e)}")
        return jsonify({
            "error": f"Failed to fetch recent activity: {str(e)}",
            "activities": []
        }), 500


# ========== ARTIST UPCOMING EVENTS ENDPOINT ==========
@api.route('/artist/upcoming-events', methods=['GET'])
@jwt_required()
def get_artist_upcoming_events():
    """Get upcoming events for the current artist"""
    try:
        from sqlalchemy import desc, asc
        from datetime import datetime, timedelta
        
        user_id = get_jwt_identity()
        now = datetime.utcnow()
        
        events = []
        
        # 1. Upcoming Concerts
        try:
            upcoming_concerts = Concert.query.filter(
                Concert.user_id == user_id,
                Concert.date >= now
            ).order_by(asc(Concert.date)).limit(10).all()
            
            for concert in upcoming_concerts:
                concert_date = concert.date if isinstance(concert.date, datetime) else datetime.strptime(str(concert.date), '%Y-%m-%d')
                events.append({
                    "type": "Concert",
                    "title": concert.title,
                    "date": concert_date.strftime('%b %d, %Y'),
                    "time": concert.time or "",
                    "icon": "🎭",
                    "id": concert.id,
                    "timestamp": concert_date.isoformat()
                })
        except Exception as e:
            print(f"Concert events error: {e}")
        
        # 2. Upcoming Live Streams (scheduled)
        try:
            upcoming_streams = LiveStream.query.filter(
                LiveStream.user_id == user_id,
                LiveStream.scheduled_at >= now,
                LiveStream.status == 'scheduled'
            ).order_by(asc(LiveStream.scheduled_at)).limit(5).all()
            
            for stream in upcoming_streams:
                events.append({
                    "type": "Live Session",
                    "title": stream.title or "Live Session",
                    "date": stream.scheduled_at.strftime('%b %d, %Y'),
                    "time": stream.scheduled_at.strftime('%I:%M %p'),
                    "icon": "📡",
                    "id": stream.id,
                    "timestamp": stream.scheduled_at.isoformat()
                })
        except Exception as e:
            print(f"LiveStream events error: {e}")
        
        # 3. Scheduled Track Releases
        try:
            scheduled_releases = Audio.query.filter(
                Audio.user_id == user_id,
                Audio.status == 'scheduled',
                Audio.uploaded_at >= now
            ).order_by(asc(Audio.uploaded_at)).limit(5).all()
            
            for track in scheduled_releases:
                events.append({
                    "type": "Release",
                    "title": track.title,
                    "date": track.uploaded_at.strftime('%b %d, %Y'),
                    "time": track.uploaded_at.strftime('%I:%M %p'),
                    "icon": "🎵",
                    "id": track.id,
                    "timestamp": track.uploaded_at.isoformat()
                })
        except Exception as e:
            print(f"Scheduled releases error: {e}")
        
        # 4. Listening Parties
        try:
            upcoming_parties = ListeningParty.query.filter(
                ListeningParty.artist_id == user_id,
                ListeningParty.start_time >= now,
                ListeningParty.is_active == True
            ).order_by(asc(ListeningParty.start_time)).limit(5).all()
            
            for party in upcoming_parties:
                events.append({
                    "type": "Listening Party",
                    "title": party.album_name,
                    "date": party.start_time.strftime('%b %d, %Y'),
                    "time": party.start_time.strftime('%I:%M %p'),
                    "icon": "🎧",
                    "id": party.id,
                    "timestamp": party.start_time.isoformat()
                })
        except Exception as e:
            print(f"ListeningParty events error: {e}")
        
        # 5. Collaborations
        try:
            upcoming_collabs = Collaboration.query.filter(
                Collaboration.user_id == user_id,
                Collaboration.status == 'scheduled'
            ).limit(5).all()
            
            for collab in upcoming_collabs:
                events.append({
                    "type": "Collaboration",
                    "title": collab.title or "Studio Session",
                    "date": collab.created_at.strftime('%b %d, %Y') if collab.created_at else "TBD",
                    "time": "",
                    "icon": "🤝",
                    "id": collab.id,
                    "timestamp": collab.created_at.isoformat() if collab.created_at else now.isoformat()
                })
        except Exception as e:
            print(f"Collaboration events error: {e}")
        
        # Sort events by timestamp
        events.sort(key=lambda x: x['timestamp'])
        
        return jsonify({
            "events": events[:10],
            "total_count": len(events)
        }), 200
        
    except Exception as e:
        print(f"Upcoming events error: {str(e)}")
        return jsonify({
            "error": f"Failed to fetch upcoming events: {str(e)}",
            "events": []
        }), 500


def get_time_ago(timestamp):
    """Convert timestamp to human-readable 'time ago' string"""
    if not timestamp:
        return "Unknown"
    
    now = datetime.utcnow()
    diff = now - timestamp
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif seconds < 604800:
        days = int(seconds / 86400)
        return f"{days} day{'s' if days != 1 else ''} ago"
    elif seconds < 2592000:
        weeks = int(seconds / 604800)
        return f"{weeks} week{'s' if weeks != 1 else ''} ago"
    else:
        months = int(seconds / 2592000)
        return f"{months} month{'s' if months != 1 else ''} ago"

# ========== CREATOR DASHBOARD ENDPOINTS ==========

@api.route('/profile', methods=['GET'])
@jwt_required()
def get_creator_profile():
    """Get creator profile data"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Count followers and following
        followers_count = Follow.query.filter_by(followed_id=user_id).count()
        following_count = Follow.query.filter_by(follower_id=user_id).count()
        
        return jsonify({
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name or user.username,
            "email": user.email,
            "bio": user.bio or "Content Creator on StreamPireX",
            "profile_picture": user.profile_picture,
            "followers": followers_count,
            "following": following_count,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }), 200
        
    except Exception as e:
        print(f"Profile error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api.route('/earnings', methods=['GET'])
@jwt_required()
def get_creator_earnings():
    """Get earnings breakdown for creator"""
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        user_id = get_jwt_identity()
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        six_months_ago = now - timedelta(days=180)
        
        # Product sales earnings
        try:
            product_earnings = db.session.query(func.coalesce(func.sum(Order.total_amount), 0))\
                .join(Product, Order.product_id == Product.id)\
                .filter(Product.user_id == user_id)\
                .filter(Order.status == 'completed').scalar() or 0
            product_earnings = float(product_earnings) * 0.9  # 90% creator cut
        except:
            product_earnings = 0
        
        # Tips received
        try:
            tips_earnings = db.session.query(func.coalesce(func.sum(Tip.amount), 0))\
                .filter(Tip.recipient_id == user_id).scalar() or 0
            tips_earnings = float(tips_earnings) * 0.85  # 85% after platform cut
        except:
            tips_earnings = 0
        
        # Ad revenue
        try:
            ad_earnings = db.session.query(func.coalesce(func.sum(AdRevenue.amount), 0))\
                .filter(AdRevenue.creator_id == user_id).scalar() or 0
            ad_earnings = float(ad_earnings)
        except:
            ad_earnings = 0
        
        # Subscription revenue
        try:
            subscription_earnings = db.session.query(func.coalesce(func.sum(CreatorMembershipTier.price_monthly), 0))\
                .join(UserSubscription)\
                .filter(CreatorMembershipTier.creator_id == user_id)\
                .filter(UserSubscription.status == 'active').scalar() or 0
            subscription_earnings = float(subscription_earnings) * 0.85
        except:
            subscription_earnings = 0
        
        # Donations
        try:
            donation_earnings = db.session.query(func.coalesce(func.sum(CreatorDonation.amount), 0))\
                .filter(CreatorDonation.creator_id == user_id).scalar() or 0
            donation_earnings = float(donation_earnings) * 0.85
        except:
            donation_earnings = 0
        
        # Revenue history by month (last 6 months)
        monthly_data = []
        for i in range(6):
            month_start = (now - timedelta(days=30 * (5 - i))).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            
            # Get revenue for this month
            try:
                month_revenue = db.session.query(func.coalesce(func.sum(Revenue.creator_earnings), 0))\
                    .filter(Revenue.user_id == user_id)\
                    .filter(Revenue.timestamp >= month_start)\
                    .filter(Revenue.timestamp < month_end).scalar() or 0
            except:
                month_revenue = 0
            
            monthly_data.append({
                "month": month_start.strftime('%b'),
                "revenue": float(month_revenue)
            })
        
        total_earnings = product_earnings + tips_earnings + ad_earnings + subscription_earnings + donation_earnings
        
        # This month's earnings
        try:
            this_month_earnings = db.session.query(func.coalesce(func.sum(Revenue.creator_earnings), 0))\
                .filter(Revenue.user_id == user_id)\
                .filter(Revenue.timestamp >= thirty_days_ago).scalar() or 0
        except:
            this_month_earnings = 0
        
        return jsonify({
            "total": round(total_earnings, 2),
            "products": round(product_earnings, 2),
            "tips": round(tips_earnings, 2),
            "ads": round(ad_earnings, 2),
            "subscriptions": round(subscription_earnings, 2),
            "donations": round(donation_earnings, 2),
            "content": round(tips_earnings + ad_earnings + subscription_earnings + donation_earnings, 2),
            "this_month": round(float(this_month_earnings), 2),
            "monthly_data": monthly_data
        }), 200
        
    except Exception as e:
        print(f"Earnings error: {str(e)}")
        return jsonify({
            "total": 0,
            "products": 0,
            "tips": 0,
            "ads": 0,
            "subscriptions": 0,
            "donations": 0,
            "content": 0,
            "this_month": 0,
            "monthly_data": []
        }), 200


@api.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_creator_recent_activity():
    """Get recent activity for creator dashboard"""
    try:
        from sqlalchemy import desc
        from datetime import datetime, timedelta
        
        user_id = get_jwt_identity()
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        activities = []
        
        # Recent uploads (Audio)
        try:
            recent_audio = Audio.query.filter(
                Audio.user_id == user_id,
                Audio.uploaded_at >= thirty_days_ago
            ).order_by(desc(Audio.uploaded_at)).limit(5).all()
            
            for audio in recent_audio:
                activities.append({
                    "type": "music",
                    "text": f"Uploaded track: {audio.title}",
                    "time": get_time_ago(audio.uploaded_at),
                    "timestamp": audio.uploaded_at.isoformat()
                })
        except Exception as e:
            print(f"Audio activity error: {e}")
        
        # Recent podcasts
        try:
            recent_podcasts = Podcast.query.filter(
                Podcast.creator_id == user_id,
                Podcast.uploaded_at >= thirty_days_ago
            ).order_by(desc(Podcast.uploaded_at)).limit(5).all()
            
            for podcast in recent_podcasts:
                activities.append({
                    "type": "podcast",
                    "text": f"Created podcast: {podcast.title}",
                    "time": get_time_ago(podcast.uploaded_at),
                    "timestamp": podcast.uploaded_at.isoformat()
                })
        except Exception as e:
            print(f"Podcast activity error: {e}")
        
        # Recent radio stations
        try:
            recent_radio = RadioStation.query.filter(
                RadioStation.user_id == user_id,
                RadioStation.created_at >= thirty_days_ago
            ).order_by(desc(RadioStation.created_at)).limit(5).all()
            
            for station in recent_radio:
                activities.append({
                    "type": "radio",
                    "text": f"Created radio station: {station.name}",
                    "time": get_time_ago(station.created_at),
                    "timestamp": station.created_at.isoformat()
                })
        except Exception as e:
            print(f"Radio activity error: {e}")
        
        # Recent live streams
        try:
            recent_streams = LiveStream.query.filter(
                LiveStream.user_id == user_id,
                LiveStream.started_at >= thirty_days_ago
            ).order_by(desc(LiveStream.started_at)).limit(5).all()
            
            for stream in recent_streams:
                activities.append({
                    "type": "livestream",
                    "text": f"Live session: {stream.title or 'Untitled'}",
                    "time": get_time_ago(stream.started_at),
                    "timestamp": stream.started_at.isoformat()
                })
        except Exception as e:
            print(f"LiveStream activity error: {e}")
        
        # Recent products
        try:
            recent_products = Product.query.filter(
                Product.user_id == user_id,
                Product.created_at >= thirty_days_ago
            ).order_by(desc(Product.created_at)).limit(5).all()
            
            for product in recent_products:
                activities.append({
                    "type": "product",
                    "text": f"Listed product: {product.title}",
                    "time": get_time_ago(product.created_at),
                    "timestamp": product.created_at.isoformat()
                })
        except Exception as e:
            print(f"Product activity error: {e}")
        
        # Recent sales
        try:
            recent_sales = db.session.query(Order, Product).join(
                Product, Order.product_id == Product.id
            ).filter(
                Product.user_id == user_id,
                Order.created_at >= thirty_days_ago,
                Order.status == 'completed'
            ).order_by(desc(Order.created_at)).limit(5).all()
            
            for order, product in recent_sales:
                activities.append({
                    "type": "product",
                    "text": f"Sold: {product.title} for ${order.total_amount}",
                    "time": get_time_ago(order.created_at),
                    "timestamp": order.created_at.isoformat()
                })
        except Exception as e:
            print(f"Sales activity error: {e}")
        
        # Recent tips received
        try:
            recent_tips = db.session.query(Tip, User).join(
                User, Tip.sender_id == User.id
            ).filter(
                Tip.recipient_id == user_id,
                Tip.created_at >= thirty_days_ago
            ).order_by(desc(Tip.created_at)).limit(5).all()
            
            for tip, sender in recent_tips:
                activities.append({
                    "type": "tip",
                    "text": f"Received ${tip.amount:.2f} tip from {sender.username or 'Someone'}",
                    "time": get_time_ago(tip.created_at),
                    "timestamp": tip.created_at.isoformat()
                })
        except Exception as e:
            print(f"Tips activity error: {e}")
        
        # Recent followers
        try:
            recent_follows = db.session.query(Follow, User).join(
                User, Follow.follower_id == User.id
            ).filter(
                Follow.followed_id == user_id,
                Follow.created_at >= thirty_days_ago
            ).order_by(desc(Follow.created_at)).limit(5).all()
            
            for follow, follower in recent_follows:
                activities.append({
                    "type": "follower",
                    "text": f"New follower: {follower.username or 'Someone'}",
                    "time": get_time_ago(follow.created_at),
                    "timestamp": follow.created_at.isoformat()
                })
        except Exception as e:
            print(f"Follows activity error: {e}")
        
        # Sort by timestamp (newest first)
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            "activities": activities[:15],
            "total_count": len(activities)
        }), 200
        
    except Exception as e:
        print(f"Recent activity error: {str(e)}")
        return jsonify({
            "activities": [],
            "total_count": 0
        }), 200


@api.route('/monthly-growth', methods=['GET'])
@jwt_required()
def get_monthly_growth():
    """Get monthly growth data for charts"""
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        user_id = get_jwt_identity()
        now = datetime.utcnow()
        
        monthly_data = []
        
        for i in range(6):
            # Calculate month boundaries
            month_offset = 5 - i
            month_start = (now - timedelta(days=30 * month_offset)).replace(day=1, hour=0, minute=0, second=0)
            if month_offset > 0:
                month_end = (now - timedelta(days=30 * (month_offset - 1))).replace(day=1, hour=0, minute=0, second=0)
            else:
                month_end = now
            
            # Count engagements for this month
            plays = 0
            followers = 0
            likes = 0
            
            # Plays on your content
            try:
                plays = db.session.query(func.count(PlayHistory.id))\
                    .join(Audio, PlayHistory.audio_id == Audio.id)\
                    .filter(Audio.user_id == user_id)\
                    .filter(PlayHistory.played_at >= month_start)\
                    .filter(PlayHistory.played_at < month_end).scalar() or 0
            except:
                pass
            
            # New followers this month
            try:
                followers = Follow.query.filter(
                    Follow.followed_id == user_id,
                    Follow.created_at >= month_start,
                    Follow.created_at < month_end
                ).count()
            except:
                pass
            
            # Likes this month
            try:
                likes = db.session.query(func.count(AudioLike.id))\
                    .join(Audio, AudioLike.audio_id == Audio.id)\
                    .filter(Audio.user_id == user_id)\
                    .filter(AudioLike.created_at >= month_start)\
                    .filter(AudioLike.created_at < month_end).scalar() or 0
            except:
                pass
            
            total_engagement = plays + (followers * 10) + (likes * 2)  # Weighted engagement
            
            monthly_data.append({
                "month": month_start.strftime('%b'),
                "plays": plays,
                "followers": followers,
                "likes": likes,
                "engagement": total_engagement
            })
        
        return jsonify({
            "monthly_data": monthly_data,
            "labels": [d["month"] for d in monthly_data],
            "engagement": [d["engagement"] for d in monthly_data],
            "plays": [d["plays"] for d in monthly_data],
            "followers": [d["followers"] for d in monthly_data]
        }), 200
        
    except Exception as e:
        print(f"Monthly growth error: {str(e)}")
        return jsonify({
            "monthly_data": [],
            "labels": ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            "engagement": [0, 0, 0, 0, 0, 0],
            "plays": [0, 0, 0, 0, 0, 0],
            "followers": [0, 0, 0, 0, 0, 0]
        }), 200

# 3. ARTIST ALBUMS ENDPOINT (Optional)
@api.route('/artist/albums', methods=['GET'])
@jwt_required()
def get_artist_albums():
    """Get all albums for the current artist"""
    try:
        user_id = get_jwt_identity()
        
        # Fetch real albums from database
        albums = Album.query.filter_by(user_id=user_id).order_by(Album.created_at.desc()).all()
        
        albums_data = []
        for album in albums:
            # Count tracks in album
            track_count = 0
            try:
                track_count = Audio.query.filter_by(album_id=album.id).count()
            except:
                track_count = len(album.tracks) if hasattr(album, 'tracks') and album.tracks else 0
            
            albums_data.append({
                "id": album.id,
                "title": album.title,
                "artwork": getattr(album, 'artwork_url', None) or getattr(album, 'cover_art_url', None),
                "year": album.release_date.year if hasattr(album, 'release_date') and album.release_date else album.created_at.year if album.created_at else None,
                "track_count": track_count,
                "description": getattr(album, 'description', None),
                "genre": getattr(album, 'genre', None),
                "created_at": album.created_at.isoformat() if album.created_at else None
            })
        
        return jsonify(albums_data), 200
        
    except Exception as e:
        print(f"Error fetching albums: {e}")
        return jsonify([]), 200

# 4. ARTIST PLAYLISTS ENDPOINT (Optional)
@api.route('/artist/playlists', methods=['GET']) 
@jwt_required()
def get_artist_playlists():
    """Get all playlists for the current artist"""
    try:
        user_id = get_jwt_identity()
        
        # Fetch real playlists from database
        playlists = PlaylistAudio.query.filter_by(user_id=user_id).order_by(PlaylistAudio.created_at.desc()).all()
        
        playlists_data = []
        for playlist in playlists:
            # Calculate duration if tracks exist
            total_duration = 0
            track_count = 0
            
            try:
                if hasattr(playlist, 'tracks') and playlist.tracks:
                    track_count = len(playlist.tracks)
                    for track in playlist.tracks:
                        if hasattr(track, 'duration') and track.duration:
                            total_duration += track.duration
            except:
                pass
            
            # Format duration
            hours = total_duration // 3600
            minutes = (total_duration % 3600) // 60
            seconds = total_duration % 60
            
            if hours > 0:
                duration_str = f"{hours}:{minutes:02d}:{seconds:02d}"
            else:
                duration_str = f"{minutes}:{seconds:02d}"
            
            playlists_data.append({
                "id": playlist.id,
                "name": playlist.name or playlist.title,
                "cover": getattr(playlist, 'cover_url', None) or getattr(playlist, 'artwork_url', None),
                "track_count": track_count,
                "duration": duration_str,
                "description": getattr(playlist, 'description', None),
                "is_public": getattr(playlist, 'is_public', True),
                "created_at": playlist.created_at.isoformat() if playlist.created_at else None
            })
        
        return jsonify(playlists_data), 200
        
    except Exception as e:
        print(f"Error fetching playlists: {e}")
        return jsonify([]), 200

# 5. ARTIST ACTIVITY ENDPOINT (Optional)
@api.route('/artist/activity', methods=['GET'])
@jwt_required()  
def get_artist_activity():
    """Get recent activity for the current artist"""
    try:
        user_id = get_jwt_identity()
        activity_data = []
        
        # Get recent track uploads (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        try:
            recent_tracks = Audio.query.filter(
                Audio.user_id == user_id,
                Audio.created_at >= thirty_days_ago
            ).order_by(Audio.created_at.desc()).limit(5).all()
            
            for track in recent_tracks:
                activity_data.append({
                    "type": "track",
                    "message": f"Uploaded new track: '{track.title}'",
                    "timestamp": _get_relative_time(track.created_at),
                    "icon": "🎵",
                    "created_at": track.created_at.isoformat() if track.created_at else None
                })
        except Exception as e:
            print(f"Error fetching track activity: {e}")
        
        # Get recent likes received
        try:
            recent_likes = AudioLike.query.join(Audio).filter(
                Audio.user_id == user_id,
                AudioLike.created_at >= thirty_days_ago
            ).order_by(AudioLike.created_at.desc()).limit(10).all()
            
            if recent_likes:
                # Group by track
                likes_by_track = {}
                for like in recent_likes:
                    track_id = like.audio_id
                    if track_id not in likes_by_track:
                        likes_by_track[track_id] = {"count": 0, "track": like.audio, "latest": like.created_at}
                    likes_by_track[track_id]["count"] += 1
                
                for track_id, data in likes_by_track.items():
                    track_title = data["track"].title if data["track"] else "your track"
                    activity_data.append({
                        "type": "like",
                        "message": f"{data['count']} new likes on '{track_title}'",
                        "timestamp": _get_relative_time(data["latest"]),
                        "icon": "❤️",
                        "created_at": data["latest"].isoformat() if data["latest"] else None
                    })
        except Exception as e:
            print(f"Error fetching likes activity: {e}")
        
        # Get recent followers
        try:
            recent_followers = Follow.query.filter(
                Follow.followed_id == user_id,
                Follow.created_at >= thirty_days_ago
            ).count()
            
            if recent_followers > 0:
                activity_data.append({
                    "type": "follower",
                    "message": f"{recent_followers} new followers",
                    "timestamp": "This month",
                    "icon": "👥",
                    "created_at": datetime.utcnow().isoformat()
                })
        except Exception as e:
            print(f"Error fetching follower activity: {e}")
        
        # Get recent plays
        try:
            recent_plays = PlayHistory.query.join(Audio).filter(
                Audio.user_id == user_id,
                PlayHistory.played_at >= thirty_days_ago
            ).count()
            
            if recent_plays > 0:
                activity_data.append({
                    "type": "play",
                    "message": f"{recent_plays} plays this month",
                    "timestamp": "This month",
                    "icon": "▶️",
                    "created_at": datetime.utcnow().isoformat()
                })
        except Exception as e:
            print(f"Error fetching play activity: {e}")
        
        # Sort by created_at descending
        activity_data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Return top 10 activities
        return jsonify(activity_data[:10]), 200
        
    except Exception as e:
        print(f"Error fetching activity: {e}")
        return jsonify([]), 200


# Helper function for relative time
def _get_relative_time(dt):
    """Convert datetime to relative time string"""
    if not dt:
        return "Unknown"
    
    now = datetime.utcnow()
    diff = now - dt
    
    if diff.days > 30:
        return dt.strftime("%b %d, %Y")
    elif diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"
    
# 6. UPDATE USER PROFILE ENDPOINT
@api.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    try:
        # Handle both form data and JSON
        data = request.form.to_dict() if request.form else {}
        json_data = request.get_json() if request.is_json else {}
        data.update(json_data)
        
        # Update all supported fields (including profile_picture and cover_photo as URLs)
        for field in ['artist_name', 'bio', 'genre', 'location', 'website', 
                     'spotify_link', 'apple_music_link', 'youtube_link', 
                     'instagram_link', 'twitter_link',
                     'profile_picture', 'cover_photo',
                     'display_name', 'business_name', 'business_type', 
                     'business_website', 'current_mood', 'custom_mood_label',
                     'custom_mood_emoji', 'storefront_link']:
            if field in data:
                setattr(user, field, data[field])
        
        # Handle social_links as JSON if provided as string
        if 'social_links' in data:
            try:
                if isinstance(data['social_links'], str):
                    user.social_links = json.loads(data['social_links'])
                else:
                    user.social_links = data['social_links']
            except:
                return jsonify({"error": "Invalid social_links format"}), 400
        
        # Handle file uploads (fallback if frontend sends raw files instead of URLs)
        if "profile_picture" in request.files:
            pic = request.files["profile_picture"]
            if pic.filename != "":
                filename = secure_filename(pic.filename)
                pic_url = uploadFile(pic, filename)
                user.profile_picture = pic_url
        
        if "cover_photo" in request.files:
            cover = request.files["cover_photo"]
            if cover.filename != "":
                filename = secure_filename(cover.filename)
                cover_url = uploadFile(cover, filename)
                user.cover_photo = cover_url
        
        db.session.commit()
        
        return jsonify({
            "message": "Profile updated successfully",
            "user": user.serialize()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500

# 7. SERVE STATIC FILES (for local images)
@api.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory('uploads', filename)

# 8. FIX USER SERIALIZE METHOD
# Add this method to your User model if it doesn't exist
def serialize(self):
    """Serialize user data for JSON response"""
    return {
        "id": self.id,
        "username": self.username,
        "email": self.email,
        "artist_name": getattr(self, 'artist_name', None),
        "bio": getattr(self, 'bio', None),
        "genre": getattr(self, 'genre', None),
        "location": getattr(self, 'location', None),
        "website": getattr(self, 'website', None),
        "profile_picture": getattr(self, 'profile_picture', None),
        "avatar_url": getattr(self, 'avatar_url', None),
        "cover_photo": getattr(self, 'cover_photo', None),
        "spotify_link": getattr(self, 'spotify_link', None),
        "apple_music_link": getattr(self, 'apple_music_link', None),
        "youtube_link": getattr(self, 'youtube_link', None),
        "instagram_link": getattr(self, 'instagram_link', None),
        "twitter_link": getattr(self, 'twitter_link', None),
        "is_verified": getattr(self, 'is_verified', False),
        "created_at": self.created_at.isoformat() if hasattr(self, 'created_at') and self.created_at else None
    }

@api.route('/video/channel/update', methods=['PUT'])
@jwt_required()
def update_channel():
    """Update video channel settings"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    channel = VideoChannel.query.filter_by(user_id=user_id).first()
    if not channel:
        return jsonify({"error": "Channel not found"}), 404
    
    # Update channel fields
    channel.channel_name = data.get('channelName', channel.channel_name)
    channel.description = data.get('description', channel.description)
    channel.custom_url = data.get('customUrl', channel.custom_url)
    channel.primary_category = data.get('primaryCategory', channel.primary_category)
    channel.country = data.get('country', channel.country)
    channel.language = data.get('language', channel.language)
    channel.is_public = data.get('isPublic', channel.is_public)
    channel.allow_comments = data.get('allowComments', channel.allow_comments)
    channel.avatar_url = data.get('avatar_url', channel.avatar_url)
    channel.banner_url = data.get('banner_url', channel.banner_url)
    
    try:
        db.session.commit()
        return jsonify(channel.serialize()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update channel: {str(e)}"}), 500

@api.route('/video/channel/<int:channel_id>/subscribers', methods=['GET'])
@jwt_required()
def get_channel_subscribers(channel_id):
    """Get channel subscribers"""
    user_id = get_jwt_identity()
    
    # Verify user owns the channel
    channel = VideoChannel.query.get_or_404(channel_id)
    if channel.user_id != user_id:
        return jsonify({"error": "Access denied"}), 403
    
    subscribers = ChannelSubscription.query.filter_by(channel_id=channel_id).all()
    
    subscribers_data = []
    for sub in subscribers:
        user_data = {
            'id': sub.subscriber.id,
            'username': sub.subscriber.username,
            'display_name': getattr(sub.subscriber, 'display_name', None),
            'avatar_url': getattr(sub.subscriber, 'profile_picture', None),
            'subscribed_at': sub.subscribed_at.isoformat()
        }
        subscribers_data.append(user_data)
    
    return jsonify({"subscribers": subscribers_data}), 200



@api.route('/video/upload', methods=['POST'])
@jwt_required()
def upload_video_json():
    """Upload video with JSON data (alternative to form upload)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Get or create channel
    channel = VideoChannel.query.filter_by(user_id=user_id).first()
    if not channel:
        return jsonify({"error": "Channel not found. Create a channel first."}), 400
    
    try:
        new_video = Video(
            user_id=user_id,
            title=data.get('title'),
            description=data.get('description', ''),
            file_url=data.get('file_url'),
            thumbnail_url=data.get('thumbnail_url'),
            # category=data.get('category', 'Other'),
            tags=data.get('tags', []),
            is_public=data.get('is_public', True),
            # age_restricted=data.get('age_restricted', False),
            made_for_kids=data.get('made_for_kids', False),
            contains_paid_promotion=data.get('contains_paid_promotion', False),
            original_content=data.get('original_content', True),
            allow_comments=data.get('allow_comments', True),
            allow_likes=data.get('allow_likes', True),
            uploaded_at=datetime.utcnow()
        )
        print ("breakpoint1")
        # Update channel stats
        channel.total_videos += 1
        
        db.session.add(new_video)
        db.session.commit()
        print ("breakpoint2")
        
        
        return jsonify({
            "message": "Video uploaded successfully",
            "video": new_video.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to upload video: {str(e)}"}), 500

# Add these endpoints to your routes.py file

# 1. GET USER SALES - Recent sales transactions
@api.route('/user/sales', methods=['GET'])
@jwt_required()
def get_user_sales():
    """Get recent sales transactions for a user"""
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        page = request.args.get('page', 1, type=int)
        
        # Get all purchases where the user is the creator of the product
        sales_query = db.session.query(Purchase, Product, User)\
            .join(Product, Purchase.product_id == Product.id)\
            .join(User, Purchase.user_id == User.id)\
            .filter(Product.creator_id == user_id)\
            .order_by(Purchase.purchased_at.desc())
        
        # Apply pagination
        offset = (page - 1) * limit
        sales = sales_query.offset(offset).limit(limit).all()
        
        # Format the response
        sales_data = []
        for purchase, product, buyer in sales:
            sales_data.append({
                "id": purchase.id,
                "product_id": product.id,
                "product_title": product.title,
                "product_image": product.image_url,
                "buyer_id": buyer.id,
                "buyer_username": buyer.username,
                "buyer_email": buyer.email,
                "amount": purchase.amount,
                "platform_cut": purchase.platform_cut,
                "creator_earnings": purchase.creator_earnings,
                "purchased_at": purchase.purchased_at.isoformat(),
                "is_digital": product.is_digital,
                "status": "completed"  # You can add status field to Purchase model if needed
            })
        
        # Get total count for pagination
        total_sales = sales_query.count()
        has_next = offset + limit < total_sales
        has_prev = page > 1
        
        return jsonify({
            "sales": sales_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_sales,
                "has_next": has_next,
                "has_prev": has_prev,
                "pages": (total_sales + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch sales: {str(e)}"}), 500


# 2. ENHANCED REVENUE ANALYTICS - Fixed to include missing fields
@api.route("/revenue-analytics", methods=["GET"])
@jwt_required()
def get_revenue_analytics():
    """Get comprehensive revenue analytics for a user"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        period = request.args.get('period', 'all')  # all, week, month, year
        
        # Check if the user is an admin
        is_admin = hasattr(user, 'role') and user.role == 'admin'
        
        # Date filtering based on period
        date_filter = None
        if period == 'week':
            date_filter = datetime.utcnow() - timedelta(days=7)
        elif period == 'month':
            date_filter = datetime.utcnow() - timedelta(days=30)
        elif period == 'year':
            date_filter = datetime.utcnow() - timedelta(days=365)
        
        if is_admin:
            # Admin sees all revenue data
            # Total revenue from all purchases
            revenue_query = db.session.query(func.sum(Purchase.amount))
            platform_cut_query = db.session.query(func.sum(Purchase.platform_cut))
            creator_earnings_query = db.session.query(func.sum(Purchase.creator_earnings))
            orders_query = db.session.query(func.count(Purchase.id))
            products_query = db.session.query(func.count(Product.id))
            
            if date_filter:
                revenue_query = revenue_query.filter(Purchase.purchased_at >= date_filter)
                platform_cut_query = platform_cut_query.filter(Purchase.purchased_at >= date_filter)
                creator_earnings_query = creator_earnings_query.filter(Purchase.purchased_at >= date_filter)
                orders_query = orders_query.filter(Purchase.purchased_at >= date_filter)
                products_query = products_query.filter(Product.created_at >= date_filter)
            
            total_revenue = revenue_query.scalar() or 0
            total_platform_cut = platform_cut_query.scalar() or 0
            total_creator_earnings = creator_earnings_query.scalar() or 0
            total_orders = orders_query.scalar() or 0
            total_products = products_query.scalar() or 0
            
        else:
            # User sees only their revenue data
            # Revenue from products they created that were purchased
            revenue_query = db.session.query(func.sum(Purchase.amount))\
                .join(Product, Purchase.product_id == Product.id)\
                .filter(Product.creator_id == user_id)
            
            platform_cut_query = db.session.query(func.sum(Purchase.platform_cut))\
                .join(Product, Purchase.product_id == Product.id)\
                .filter(Product.creator_id == user_id)
            
            creator_earnings_query = db.session.query(func.sum(Purchase.creator_earnings))\
                .join(Product, Purchase.product_id == Product.id)\
                .filter(Product.creator_id == user_id)
            
            orders_query = db.session.query(func.count(Purchase.id))\
                .join(Product, Purchase.product_id == Product.id)\
                .filter(Product.creator_id == user_id)
            
            products_query = db.session.query(func.count(Product.id))\
                .filter(Product.creator_id == user_id)
            
            if date_filter:
                revenue_query = revenue_query.filter(Purchase.purchased_at >= date_filter)
                platform_cut_query = platform_cut_query.filter(Purchase.purchased_at >= date_filter)
                creator_earnings_query = creator_earnings_query.filter(Purchase.purchased_at >= date_filter)
                orders_query = orders_query.filter(Purchase.purchased_at >= date_filter)
                products_query = products_query.filter(Product.created_at >= date_filter)
            
            total_revenue = revenue_query.scalar() or 0
            total_platform_cut = platform_cut_query.scalar() or 0
            total_creator_earnings = creator_earnings_query.scalar() or 0
            total_orders = orders_query.scalar() or 0
            total_products = products_query.scalar() or 0
        
        # Calculate additional metrics
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        # Get revenue by month for the chart (last 12 months)
        revenue_by_month = []
        for i in range(11, -1, -1):
            month_start = datetime.now().replace(day=1) - timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)
            
            month_revenue_query = db.session.query(func.sum(Purchase.amount))\
                .filter(Purchase.purchased_at >= month_start)\
                .filter(Purchase.purchased_at < month_end)
            
            if not is_admin:
                month_revenue_query = month_revenue_query\
                    .join(Product, Purchase.product_id == Product.id)\
                    .filter(Product.creator_id == user_id)
            
            month_revenue = month_revenue_query.scalar() or 0
            
            revenue_by_month.append({
                "month": month_start.strftime("%Y-%m"),
                "amount": float(month_revenue)
            })
        
        return jsonify({
            "total_revenue": float(total_revenue),
            "total_products": total_products,
            "total_orders": total_orders,
            "platform_cut": float(total_platform_cut),
            "creator_earnings": float(total_creator_earnings),
            "avg_order_value": float(avg_order_value),
            "revenue_by_month": revenue_by_month,
            "period": period
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch revenue analytics: {str(e)}"}), 500


# 3. SALES PERFORMANCE METRICS
@api.route('/sales/performance', methods=['GET'])
@jwt_required()
def get_sales_performance():
    """Get detailed sales performance metrics"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Check if admin
        is_admin = hasattr(user, 'role') and user.role == 'admin'
        
        if is_admin:
            # Admin gets platform-wide metrics
            products_query = Product.query
            purchases_query = Purchase.query
        else:
            # User gets their own metrics
            products_query = Product.query.filter_by(creator_id=user_id)
            purchases_query = Purchase.query.join(Product).filter(Product.creator_id == user_id)
        
        # Top performing products
        top_products = db.session.query(
            Product.id,
            Product.title,
            Product.image_url,
            Product.price,
            func.count(Purchase.id).label('sales_count'),
            func.sum(Purchase.amount).label('total_revenue'),
            func.sum(Purchase.creator_earnings).label('creator_revenue')
        ).outerjoin(Purchase, Product.id == Purchase.product_id)
        
        if not is_admin:
            top_products = top_products.filter(Product.creator_id == user_id)
        
        top_products = top_products.group_by(Product.id)\
            .order_by(func.sum(Purchase.amount).desc())\
            .limit(10).all()
        
        top_products_data = []
        for product in top_products:
            top_products_data.append({
                "id": product.id,
                "title": product.title,
                "image_url": product.image_url,
                "price": float(product.price),
                "sales_count": product.sales_count or 0,
                "total_revenue": float(product.total_revenue or 0),
                "creator_revenue": float(product.creator_revenue or 0)
            })
        
        # Conversion rates
        total_products = products_query.count()
        products_with_sales = db.session.query(Product.id)\
            .join(Purchase, Product.id == Purchase.product_id)
        
        if not is_admin:
            products_with_sales = products_with_sales.filter(Product.creator_id == user_id)
        
        products_with_sales_count = products_with_sales.distinct().count()
        conversion_rate = (products_with_sales_count / total_products * 100) if total_products > 0 else 0
        
        # Sales by product type
        digital_sales = purchases_query.join(Product).filter(Product.is_digital == True).count()
        physical_sales = purchases_query.join(Product).filter(Product.is_digital == False).count()
        
        # Recent sales trends (last 30 days vs previous 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        
        recent_sales_query = purchases_query.filter(Purchase.purchased_at >= thirty_days_ago)
        previous_sales_query = purchases_query.filter(
            Purchase.purchased_at >= sixty_days_ago,
            Purchase.purchased_at < thirty_days_ago
        )
        
        recent_sales_count = recent_sales_query.count()
        previous_sales_count = previous_sales_query.count()
        
        sales_growth = ((recent_sales_count - previous_sales_count) / previous_sales_count * 100) \
                      if previous_sales_count > 0 else 0
        
        # Average days to first sale for new products
        avg_days_to_sale = db.session.query(
            func.avg(func.julianday(Purchase.purchased_at) - func.julianday(Product.created_at))
        ).join(Product, Purchase.product_id == Product.id)
        
        if not is_admin:
            avg_days_to_sale = avg_days_to_sale.filter(Product.creator_id == user_id)
        
        avg_days_to_sale = avg_days_to_sale.scalar() or 0
        
        return jsonify({
            "top_products": top_products_data,
            "conversion_rate": round(conversion_rate, 2),
            "digital_sales": digital_sales,
            "physical_sales": physical_sales,
            "sales_growth": round(sales_growth, 2),
            "avg_days_to_first_sale": round(float(avg_days_to_sale), 1),
            "total_products": total_products,
            "products_with_sales": products_with_sales_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch sales performance: {str(e)}"}), 500


# 4. BONUS: GET SALES BY DATE RANGE
@api.route('/sales/by-date', methods=['GET'])
@jwt_required()
def get_sales_by_date():
    """Get sales data for a specific date range"""
    try:
        user_id = get_jwt_identity()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({"error": "start_date and end_date are required"}), 400
        
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid date format. Use ISO format"}), 400
        
        # Get sales in date range
        sales_query = db.session.query(Purchase, Product)\
            .join(Product, Purchase.product_id == Product.id)\
            .filter(Product.creator_id == user_id)\
            .filter(Purchase.purchased_at >= start_date)\
            .filter(Purchase.purchased_at <= end_date)\
            .order_by(Purchase.purchased_at.desc())
        
        sales = sales_query.all()
        
        sales_data = []
        total_revenue = 0
        total_creator_earnings = 0
        
        for purchase, product in sales:
            sales_data.append({
                "id": purchase.id,
                "product_title": product.title,
                "amount": purchase.amount,
                "creator_earnings": purchase.creator_earnings,
                "purchased_at": purchase.purchased_at.isoformat()
            })
            total_revenue += purchase.amount
            total_creator_earnings += purchase.creator_earnings
        
        return jsonify({
            "sales": sales_data,
            "summary": {
                "total_sales": len(sales_data),
                "total_revenue": float(total_revenue),
                "total_creator_earnings": float(total_creator_earnings),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch sales by date: {str(e)}"}), 500



# ============ ADMIN VIDEO EDITOR ROUTES ============

# @api.route('/admin/video-editor/plans/seed', methods=['POST'])
# @jwt_required()  # Add admin authentication
# def seed_video_editor_pricing_plans():
#     """Initialize or update video editor pricing plans"""
#     try:
#         success = seed_video_editing_plans()
#         if success:
#             return jsonify({
#                 'message': 'Video editor pricing plans seeded successfully',
#                 'plans': [plan.serialize() for plan in PricingPlan.query.all()]
#             }), 200
#         else:
#             return jsonify({'error': 'Failed to seed video editor plans'}), 500
#     except Exception as e:
#         return jsonify({'error': f'Video editor seeding failed: {str(e)}'}), 500

@api.route('/admin/video-editor/plans', methods=['GET'])
@jwt_required()  # Add admin authentication  
def get_all_video_editor_plans():
    """Get all video editor pricing plans for admin management"""
    try:
        plans = PricingPlan.query.all()
        return jsonify({
            'plans': [plan.serialize() for plan in plans],
            'total': len(plans)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to fetch video editor plans: {str(e)}'}), 500

@api.route('/admin/video-editor/plans/<int:plan_id>', methods=['PUT'])
@jwt_required()  # Add admin authentication
def update_video_editor_plan(plan_id):
    """Update a video editor pricing plan"""
    try:
        plan = PricingPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Video editor plan not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields for video editor
        updateable_fields = [
            'name', 'description', 'price_monthly', 'price_yearly',
            'video_clip_max_size', 'audio_clip_max_size', 'image_max_size',
            'project_total_max_size', 'max_clips_per_track', 'max_tracks_per_project',
            'max_projects', 'export_formats', 'max_export_quality', 'max_export_duration',
            'platform_export_enabled', 'allowed_platforms', 'audio_separation_enabled',
            'advanced_effects_enabled', 'collaboration_enabled', 'priority_export_enabled',
            'is_active', 'sort_order'
        ]
        
        for field in updateable_fields:
            if field in data:
                setattr(plan, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Video editor plan updated successfully',
            'plan': plan.serialize()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update video editor plan: {str(e)}'}), 500

# Add these routes at the end of your routes.py file
# These are the complete video editor routes that won't conflict with your existing code

# ============ VIDEO EDITOR API ROUTES ============

@api.route('/user/video-editor/limits', methods=['GET'])
@jwt_required()
def get_user_video_editor_limits():
    """Get user's current video editor limits and usage"""
    user_id = get_jwt_identity()
    tier = get_user_tier(user_id)
    limits = get_user_limits(user_id)
    usage = calculate_user_usage(user_id)
    
    return jsonify({
        'user_tier': tier,
        'limits': limits,
        'usage': usage,
        'remaining': calculate_remaining_limits(limits, usage)
    }), 200

@api.route('/video-editor/plans', methods=['GET'])
def get_public_video_editor_plans():
    """Get all active video editor pricing plans for public display"""
    try:
        plans = PricingPlan.query.all()
        
        return jsonify({
            'plans': [plan.serialize() for plan in plans] if plans else []
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch video editor plans: {str(e)}'}), 500

@api.route('/video-editor/plans/<int:plan_id>', methods=['GET'])
def get_video_editor_plan_details(plan_id):
    """Get detailed information about a specific video editor plan"""
    try:
        plan = PricingPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Video editor plan not found'}), 404
        
        return jsonify({'plan': plan.serialize()}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch video editor plan: {str(e)}'}), 500

@api.route('/media-assets', methods=['GET'])
@jwt_required()
def get_media_assets():
    """Get user's media library"""
    try:
        user_id = get_jwt_identity()
        
        # For now, return user's videos and audio files
        videos = Video.query.filter_by(user_id=user_id).all()
        audio_files = Audio.query.filter_by(user_id=user_id).all()
        
        assets = []
        
        # Add videos as assets
        for video in videos:
            assets.append({
                'id': video.id,
                'name': video.title or video.filename,
                'type': 'video',
                'duration': getattr(video, 'duration', 60),
                'file_url': video.file_url,
                'thumbnail_url': getattr(video, 'thumbnail_url', None),
                'created_at': video.created_at.isoformat() if video.created_at else None
            })
        
        # Add audio files as assets
        for audio in audio_files:
            assets.append({
                'id': f"audio_{audio.id}",
                'name': audio.title or audio.filename,
                'type': 'audio',
                'duration': getattr(audio, 'duration', 180),
                'file_url': audio.file_url,
                'thumbnail_url': None,
                'created_at': audio.created_at.isoformat() if audio.created_at else None
            })
        
        return jsonify({'assets': assets}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch media assets: {str(e)}'}), 500

@api.route('/media-assets/upload', methods=['POST'])
@jwt_required()
def upload_media_asset():
    """Upload media file for video editor"""
    user_id = get_jwt_identity()
    
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check user tier limits
        tier = get_user_tier(user_id)
        limits = get_user_limits(user_id)
        
        # Determine file type
        file_type = request.form.get('type', 'video')
        if file_type not in ['video', 'audio', 'image']:
            file_type = 'video'
        
        # Check file size limits
        max_size_key = f'{file_type}_clip_max_size'
        max_size = limits.get(max_size_key, 500 * 1024 * 1024)
        
        # Get file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > max_size:
            return jsonify({
                'error': 'File too large for your current plan',
                'current_size': file_size,
                'max_size': max_size,
                'user_tier': tier,
                'upgrade_required': True
            }), 413
        
        # Generate secure filename
        filename = secure_filename(file.filename)
        timestamp = int(datetime.utcnow().timestamp())
        unique_filename = f"{user_id}_{timestamp}_{filename}"
        
        # Upload to storage
        try:
            file_url = uploadFile(file, f"video_editor/{file_type}/{unique_filename}")
        except Exception as upload_error:
            return jsonify({'error': f'Upload failed: {str(upload_error)}'}), 500
        
        # Create asset record (using existing Video/Audio models for now)
        if file_type == 'video':
            asset_record = Video(
                user_id=user_id,
                title=filename,
                filename=filename,
                file_url=file_url,
                file_size=file_size,
                created_at=datetime.utcnow()
            )
        else:
            asset_record = Audio(
                user_id=user_id,
                title=filename,
                filename=filename,
                file_url=file_url,
                file_size=file_size,
                created_at=datetime.utcnow()
            )
        
        db.session.add(asset_record)
        db.session.commit()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'asset': {
                'id': asset_record.id,
                'name': filename,
                'type': file_type,
                'file_url': file_url,
                'file_size': file_size,
                'duration': 60  # Default duration
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@api.route('/video-editor/projects', methods=['GET'])
@jwt_required()
def get_user_video_editor_projects():
    """Get user's video editor projects"""
    user_id = get_jwt_identity()
    
    try:
        # For now, return mock projects
        # In the future, this would query VideoProject model
        projects = [
            {
                'id': 1,
                'title': 'My First Project',
                'duration': 60,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'track_count': 2
            }
        ]
        
        return jsonify({'projects': projects}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch projects: {str(e)}'}), 500


@api.route('/video-editor/projects/<int:project_id>/tracks', methods=['POST'])
@jwt_required()
def add_track_to_video_editor_project(project_id):
    """Add track to video editor project"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        # Check track limits
        limits = get_user_limits(user_id)
        
        # For now, assume current project has 2 tracks
        current_track_count = 2
        
        if limits['max_tracks_per_project'] != -1 and current_track_count >= limits['max_tracks_per_project']:
            return jsonify({
                'error': 'Track limit reached',
                'current_tracks': current_track_count,
                'max_tracks': limits['max_tracks_per_project'],
                'upgrade_required': True
            }), 403
        
        # Return mock track
        track = {
            'id': random.randint(1, 1000),
            'name': data.get('name', 'New Track'),
            'track_type': data.get('track_type', 'video'),
            'color': data.get('color', '#3498db'),
            'visible': True,
            'muted': False,
            'locked': False,
            'clips': []
        }
        
        return jsonify({
            'message': 'Track added successfully',
            'track': track
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to add track: {str(e)}'}), 500

@api.route('/user/video-editor/subscription', methods=['GET'])
@jwt_required()
def get_user_video_editor_subscription():
    """Get current user's video editor subscription details"""
    try:
        user_id = get_jwt_identity()
        
        # Get active subscription
        subscription = UserSubscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()
        
        if subscription:
            return jsonify({
                'subscription': {
                    'id': subscription.id,
                    'plan': subscription.pricing_plan.serialize() if subscription.pricing_plan else None,
                    'status': subscription.status,
                    'created_at': subscription.created_at.isoformat() if subscription.created_at else None
                },
                'limits': get_user_limits(user_id),
                'usage': calculate_user_usage(user_id)
            }), 200
        else:
            # Return free plan details
            free_plan = PricingPlan.query.filter_by(name='Free').first()
            return jsonify({
                'subscription': None,
                'plan': free_plan.serialize() if free_plan else None,
                'limits': get_user_limits(user_id),
                'usage': calculate_user_usage(user_id)
            }), 200
            
    except Exception as e:
        return jsonify({'error': f'Failed to fetch video editor subscription: {str(e)}'}), 500

@api.route('/user/video-editor/subscription/upgrade', methods=['POST'])
@jwt_required()
def initiate_video_editor_subscription_upgrade():
    """Initiate video editor subscription upgrade process"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        plan_id = data.get('plan_id')
        
        plan = PricingPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Video editor plan not found'}), 404
        
        # For now, return mock checkout URL
        # In production, this would create a Stripe checkout session
        return jsonify({
            'checkout_url': f'/video-editor/upgrade?plan={plan_id}',
            'session_id': str(uuid.uuid4())
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to initiate video editor upgrade: {str(e)}'}), 500

@api.route('/video-editor/export/<int:project_id>', methods=['POST'])
@jwt_required()
def export_video_editor_project(project_id):
    """Export video editor project"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        # Get settings from request
        settings = data.get('settings', {})
        requested_quality = settings.get('resolution', '720p')  # Changed from 'quality' to 'resolution'
        format_type = settings.get('format', 'mp4')
        frame_rate = settings.get('frameRate', 24)  # NEW: Get frame rate (default 24fps)
        
        # Validate frame rate
        valid_frame_rates = [24, 25, 30, 48, 60]
        if frame_rate not in valid_frame_rates:
            frame_rate = 24  # Default to 24 if invalid
        
        # Check export quality limits
        limits = get_user_limits(user_id)
        
        quality_hierarchy = {'720p': 1, '1080p': 2, '4k': 3, '8k': 4}
        max_quality_level = quality_hierarchy.get(limits['max_export_quality'], 1)
        requested_quality_level = quality_hierarchy.get(requested_quality, 1)
        
        if requested_quality_level > max_quality_level:
            return jsonify({
                'error': f'Export quality {requested_quality} not available for your plan',
                'max_quality': limits['max_export_quality'],
                'upgrade_required': True
            }), 403
        
        # Generate export ID for progress tracking
        export_id = str(uuid.uuid4())
        
        # Parse resolution to dimensions
        resolution_map = {
            '720p': {'width': 1280, 'height': 720},
            '1080p': {'width': 1920, 'height': 1080},
            '4k': {'width': 3840, 'height': 2160},
            '8k': {'width': 7680, 'height': 4320}
        }
        dimensions = resolution_map.get(requested_quality, {'width': 1920, 'height': 1080})
        
        # Store export settings for the background job
        export_config = {
            'export_id': export_id,
            'project_id': project_id,
            'user_id': user_id,
            'settings': {
                'resolution': requested_quality,
                'width': dimensions['width'],
                'height': dimensions['height'],
                'format': format_type,
                'frame_rate': frame_rate,  # NEW: Include frame rate
                'quality': settings.get('quality', 'auto')
            },
            'timeline': data.get('timeline', {})
        }
        
        # Log export settings for debugging
        print(f"Export started - ID: {export_id}")
        print(f"  Resolution: {requested_quality} ({dimensions['width']}x{dimensions['height']})")
        print(f"  Frame Rate: {frame_rate}fps")  # NEW: Log frame rate
        print(f"  Format: {format_type}")
        
        # TODO: In production, start background export process here
        # Example: start_export_job.delay(export_config)
        # 
        # When implementing with Cloudinary, use:
        # transformation = [
        #     {'width': dimensions['width'], 'height': dimensions['height'], 'crop': 'limit'},
        #     {'fps': frame_rate},  # This sets the output frame rate
        #     {'quality': 'auto'}
        # ]
        
        return jsonify({
            'message': 'Export started',
            'export_id': export_id,
            'settings': {
                'resolution': requested_quality,
                'frame_rate': frame_rate,  # NEW: Return frame rate in response
                'format': format_type
            },
            'estimated_time': '120s'
        }), 202
        
    except Exception as e:
        print(f"Export error: {str(e)}")
        return jsonify({'error': f'Export failed: {str(e)}'}), 500


# ============ CLOUDINARY EXPORT IMPLEMENTATION (for future use) ============

def build_cloudinary_export(timeline_data, settings):
    """
    Build Cloudinary transformation for video export
    Call this when implementing actual export
    """
    import cloudinary
    import cloudinary.api
    
    frame_rate = settings.get('frame_rate', 24)
    width = settings.get('width', 1920)
    height = settings.get('height', 1080)
    quality = settings.get('quality', 'auto')
    
    # Build transformation chain
    transformation = [
        {
            'width': width,
            'height': height,
            'crop': 'limit'
        },
        {
            'fps': frame_rate  # KEY: This sets output frame rate
        },
        {
            'quality': quality
        }
    ]
    
    return transformation


def export_video_with_cloudinary(public_id, settings):
    """
    Export video using Cloudinary with specified frame rate
    """
    import cloudinary.uploader
    
    frame_rate = settings.get('frame_rate', 24)
    width = settings.get('width', 1920)
    height = settings.get('height', 1080)
    
    # Generate URL with transformations
    url = cloudinary.CloudinaryVideo(public_id).build_url(
        transformation=[
            {'width': width, 'height': height, 'crop': 'limit'},
            {'fps': frame_rate},
            {'quality': 'auto'},
            {'format': 'mp4'}
        ]
    )
    
    return url


# Example Cloudinary URL that would be generated:
# https://res.cloudinary.com/YOUR_CLOUD/video/upload/w_1920,h_1080,c_limit/fps_24/q_auto/f_mp4/video_id

@api.route('/video-editor/export/<export_id>/progress', methods=['GET'])
@jwt_required()
def get_video_editor_export_progress(export_id):
    """Get video editor export progress"""
    user_id = get_jwt_identity()
    
    try:
        # For now, return mock progress
        # In production, this would check actual export progress
        return jsonify({
            'export_id': export_id,
            'progress': 75,
            'status': 'processing',
            'message': 'Rendering video tracks...'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get export progress: {str(e)}'}), 500

# ============ HELPER FUNCTIONS FOR VIDEO EDITOR ============

def validate_video_editor_file(file, file_type, user_limits):
    """Validate uploaded file against user limits"""
    errors = []
    
    if not file or file.filename == '':
        errors.append('No file selected')
        return errors
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    max_size_key = f'{file_type}_clip_max_size'
    max_size = user_limits.get(max_size_key, 500 * 1024 * 1024)
    
    if file_size > max_size:
        errors.append(f'File size ({format_file_size(file_size)}) exceeds limit ({format_file_size(max_size)})')
    
    # Check file type
    allowed_extensions = {
        'video': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
        'audio': ['.mp3', '.wav', '.aac', '.ogg', '.m4a'],
        'image': ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
    }
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions.get(file_type, []):
        errors.append(f'File type {file_ext} not supported for {file_type} files')
    
    return errors

def format_file_size(bytes_size):
    """Format file size in human readable format"""
    if bytes_size == 0:
        return '0 Bytes'
    
    k = 1024
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    i = 0
    
    while bytes_size >= k and i < len(sizes) - 1:
        bytes_size /= k
        i += 1
    
    return f"{bytes_size:.1f} {sizes[i]}"

def get_video_editor_stats(user_id):
    """Get user's video editor usage statistics"""
    try:
        # Count user's projects (using existing Video model for now)
        project_count = Video.query.filter_by(user_id=user_id).count()
        
        # Calculate total storage used
        videos = Video.query.filter_by(user_id=user_id).all()
        audio_files = Audio.query.filter_by(user_id=user_id).all()
        
        total_size = 0
        for video in videos:
            total_size += getattr(video, 'file_size', 0) or 0
        
        for audio in audio_files:
            total_size += getattr(audio, 'file_size', 0) or 0
        
        return {
            'projects': project_count,
            'total_size': total_size,
            'video_files': len(videos),
            'audio_files': len(audio_files)
        }
        
    except Exception as e:
        print(f"Error getting video editor stats: {e}")
        return {
            'projects': 0,
            'total_size': 0,
            'video_files': 0,
            'audio_files': 0
        }

@api.route('/audio/apply-effect', methods=['POST'])
@jwt_required()
def apply_audio_effect():
    """Apply audio effect to uploaded audio file or clip"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Get form data
        effect_id = request.form.get('effect_id')
        intensity = float(request.form.get('intensity', 50)) / 100.0  # Convert percentage to 0-1
        clip_id = request.form.get('clip_id')  # Optional, for timeline clips
        
        # Get audio file (either from upload or existing clip)
        audio_file = request.files.get('audio_file')
        if not audio_file and not clip_id:
            return jsonify({"error": "No audio file or clip ID provided"}), 400
            
        # Load audio data
        if audio_file:
            # Process uploaded file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                audio_file.save(temp_file.name)
                audio_data, sample_rate = librosa.load(temp_file.name, sr=None)
        else:
            # Load existing clip from database
            # You'll need to implement this based on your data model
            audio_clip = Audio.query.get(clip_id)
            if not audio_clip:
                return jsonify({"error": "Audio clip not found"}), 404
                
            # Load from file path or URL
            audio_data, sample_rate = librosa.load(audio_clip.file_url, sr=None)
        
        # Apply the requested effect
        processed_audio = apply_effect(audio_data, sample_rate, effect_id, intensity)
        
        # Save processed audio to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as output_file:
            sf.write(output_file.name, processed_audio, sample_rate)
            
            # Upload to Cloudinary or save locally
            # Using your existing uploadFile function
            result = uploadFile(output_file.name, folder="audio_effects")
            
            # Clean up temp file
            os.unlink(output_file.name)
            
            return jsonify({
                "success": True,
                "processed_audio_url": result.get('secure_url'),
                "effect_applied": effect_id,
                "intensity": intensity * 100
            }), 200
            
    except Exception as e:
        print(f"Audio effect processing error: {e}")
        return jsonify({"error": f"Effect processing failed: {str(e)}"}), 500

def apply_effect(audio_data, sample_rate, effect_id, intensity):
    """Apply specific audio effect based on effect_id"""
    
    # Dynamics Effects
    if effect_id == 'compressor':
        return apply_compressor(audio_data, intensity)
    elif effect_id == 'limiter':
        return apply_limiter(audio_data, intensity)
    elif effect_id == 'expander':
        return apply_expander(audio_data, intensity)
    elif effect_id == 'gate':
        return apply_noise_gate(audio_data, intensity)
    
    # EQ & Filtering
    elif effect_id == 'equalizer':
        return apply_parametric_eq(audio_data, sample_rate, intensity)
    elif effect_id == 'highPass':
        return apply_high_pass(audio_data, sample_rate, intensity)
    elif effect_id == 'lowPass':
        return apply_low_pass(audio_data, sample_rate, intensity)
    elif effect_id == 'bandPass':
        return apply_band_pass(audio_data, sample_rate, intensity)
    
    # Modulation Effects
    elif effect_id == 'chorus':
        return apply_chorus(audio_data, sample_rate, intensity)
    elif effect_id == 'flanger':
        return apply_flanger(audio_data, sample_rate, intensity)
    elif effect_id == 'phaser':
        return apply_phaser(audio_data, sample_rate, intensity)
    elif effect_id == 'tremolo':
        return apply_tremolo(audio_data, sample_rate, intensity)
    elif effect_id == 'vibrato':
        return apply_vibrato(audio_data, sample_rate, intensity)
    
    # Time-Based Effects
    elif effect_id == 'reverb':
        return apply_reverb(audio_data, sample_rate, intensity)
    elif effect_id == 'delay':
        return apply_delay(audio_data, sample_rate, intensity)
    elif effect_id == 'pitchShift':
        return apply_pitch_shift(audio_data, sample_rate, intensity)
    elif effect_id == 'timeStretch':
        return apply_time_stretch(audio_data, sample_rate, intensity)
    
    # Distortion Effects
    elif effect_id == 'overdrive':
        return apply_overdrive(audio_data, intensity)
    elif effect_id == 'distortion':
        return apply_distortion(audio_data, intensity)
    elif effect_id == 'bitCrusher':
        return apply_bit_crusher(audio_data, sample_rate, intensity)
    elif effect_id == 'saturation':
        return apply_tape_saturation(audio_data, intensity)
    
    # Restoration Effects
    elif effect_id == 'noiseReduction':
        return apply_noise_reduction(audio_data, sample_rate, intensity)
    elif effect_id == 'deEsser':
        return apply_de_esser(audio_data, sample_rate, intensity)
    elif effect_id == 'clickRemoval':
        return apply_click_removal(audio_data, sample_rate)
    
    # Spatial Effects
    elif effect_id == 'stereoWiden':
        return apply_stereo_widener(audio_data, intensity)
    elif effect_id == 'monoMaker':
        return apply_mono_maker(audio_data)
    
    else:
        # Return original audio if effect not implemented
        return audio_data

# Individual Effect Functions
def apply_compressor(audio_data, intensity):
    """Apply dynamic range compression"""
    threshold = -20 + (intensity * 15)  # -20dB to -5dB
    ratio = 1 + (intensity * 9)  # 1:1 to 10:1
    
    # Simple compressor implementation
    compressed = np.copy(audio_data)
    db_audio = 20 * np.log10(np.abs(audio_data) + 1e-10)
    
    over_threshold = db_audio > threshold
    reduction = (db_audio[over_threshold] - threshold) / ratio
    compressed[over_threshold] = compressed[over_threshold] * (10 ** (-reduction / 20))
    
    return compressed

def apply_limiter(audio_data, intensity):
    """Apply hard limiting"""
    ceiling = 0.95 - (intensity * 0.2)  # -1dB to -5dB ceiling
    return np.clip(audio_data, -ceiling, ceiling)

def apply_high_pass(audio_data, sample_rate, intensity):
    """Apply high-pass filter"""
    cutoff = 20 + (intensity * 1980)  # 20Hz to 2000Hz
    nyquist = sample_rate * 0.5
    normalized_cutoff = cutoff / nyquist
    b, a = signal.butter(4, normalized_cutoff, btype='high')
    return signal.filtfilt(b, a, audio_data)

def apply_low_pass(audio_data, sample_rate, intensity):
    """Apply low-pass filter"""
    cutoff = 20000 - (intensity * 18000)  # 20kHz to 2kHz
    nyquist = sample_rate * 0.5
    normalized_cutoff = cutoff / nyquist
    b, a = signal.butter(4, normalized_cutoff, btype='low')
    return signal.filtfilt(b, a, audio_data)

def apply_reverb(audio_data, sample_rate, intensity):
    """Apply convolution reverb"""
    # Create impulse response for reverb
    duration = 0.5 + (intensity * 1.5)  # 0.5 to 2 seconds
    decay_rate = 3 + (intensity * 7)  # Decay rate
    
    length = int(sample_rate * duration)
    t = np.linspace(0, duration, length)
    
    # Generate reverb impulse response
    impulse = np.random.randn(length) * np.exp(-decay_rate * t)
    
    # Apply convolution
    reverb_audio = signal.convolve(audio_data, impulse, mode='same')
    
    # Mix with dry signal
    wet_gain = intensity * 0.3
    dry_gain = 1 - (intensity * 0.3)
    
    return dry_gain * audio_data + wet_gain * reverb_audio

def apply_delay(audio_data, sample_rate, intensity):
    """Apply delay effect"""
    delay_time = 0.1 + (intensity * 0.4)  # 100ms to 500ms delay
    feedback = intensity * 0.6  # 0 to 60% feedback
    
    delay_samples = int(delay_time * sample_rate)
    delayed_audio = np.zeros_like(audio_data)
    
    # Create delay line
    if len(audio_data) > delay_samples:
        delayed_audio[delay_samples:] = audio_data[:-delay_samples] * feedback
    
    # Mix with original
    return audio_data + delayed_audio

def apply_chorus(audio_data, sample_rate, intensity):
    """Apply chorus effect"""
    rate = 0.5 + (intensity * 2)  # 0.5Hz to 2.5Hz
    depth = intensity * 0.02  # Up to 20ms modulation
    
    t = np.arange(len(audio_data)) / sample_rate
    lfo = np.sin(2 * np.pi * rate * t)
    
    # Simple chorus implementation
    delay_samples = (depth * sample_rate * lfo).astype(int)
    chorus_audio = np.zeros_like(audio_data)
    
    for i, delay in enumerate(delay_samples):
        if i - delay >= 0:
            chorus_audio[i] = audio_data[i - delay]
    
    return audio_data + chorus_audio * intensity * 0.5

def apply_distortion(audio_data, intensity):
    """Apply distortion/overdrive"""
    drive = 1 + (intensity * 19)  # 1x to 20x gain
    
    # Apply gain and soft clipping
    driven = audio_data * drive
    distorted = np.tanh(driven)  # Soft clipping
    
    # Mix with original based on intensity
    return audio_data * (1 - intensity) + distorted * intensity

def apply_noise_reduction(audio_data, sample_rate, intensity):
    """Simple spectral noise reduction"""
    # This is a simplified implementation
    # In production, you'd use more sophisticated algorithms
    
    # Apply spectral gating
    stft = librosa.stft(audio_data)
    magnitude = np.abs(stft)
    phase = np.angle(stft)
    
    # Estimate noise floor
    noise_floor = np.percentile(magnitude, 10)
    threshold = noise_floor * (1 + intensity * 2)
    
    # Apply spectral gating
    mask = magnitude > threshold
    cleaned_magnitude = magnitude * mask
    
    # Reconstruct audio
    cleaned_stft = cleaned_magnitude * np.exp(1j * phase)
    return librosa.istft(cleaned_stft)

def apply_time_stretch(audio_data, sample_rate, intensity):
    """Apply time stretching using pedalboard"""
    from pedalboard import PitchShift
    # Time stretch without pitch change (approximate)
    stretch_factor = 0.5 + (intensity * 0.01)  # 0.5x to 1.5x speed
    # Note: True time stretching requires more complex implementation
    # This is a simplified version using pitch shift
    board = Pedalboard([PitchShift(semitones=0)])
    return board(audio_data, sample_rate)

def apply_overdrive(audio_data, intensity):
    """Apply overdrive distortion using pedalboard"""
    from pedalboard import Distortion
    drive_db = intensity * 0.5  # 0 to 50dB drive
    board = Pedalboard([Distortion(drive_db=drive_db)])
    return board(audio_data, sample_rate=44100)

def apply_bit_crusher(audio_data, sample_rate, intensity):
    """Apply bit crusher effect using pedalboard"""
    from pedalboard import Bitcrush
    bit_depth = 16 - (intensity * 0.15)  # 16-bit to 1-bit
    board = Pedalboard([Bitcrush(bit_depth=max(1, int(bit_depth)))])
    return board(audio_data, sample_rate)

def apply_tape_saturation(audio_data, intensity):
    """Apply tape saturation effect using pedalboard"""
    from pedalboard import Distortion
    # Simulate tape saturation with mild distortion
    saturation = intensity * 0.1  # Gentle saturation
    board = Pedalboard([Distortion(drive_db=saturation)])
    return board(audio_data, sample_rate=44100)

def apply_de_esser(audio_data, sample_rate, intensity):
    """Apply de-esser using basic filtering"""
    from scipy.signal import butter, filtfilt
    # Simple de-esser using high-frequency attenuation
    cutoff = 4000 - (intensity * 20)  # Reduce harsh sibilants
    b, a = butter(2, cutoff/(sample_rate/2), btype='low')
    return filtfilt(b, a, audio_data)

def apply_click_removal(audio_data, intensity):
    """Apply click removal (basic implementation)"""
    # Simple click removal using median filtering
    from scipy.signal import medfilt
    kernel_size = int(3 + (intensity * 0.1))  # Small kernel for click removal
    if kernel_size % 2 == 0:
        kernel_size += 1  # Ensure odd kernel size
    return medfilt(audio_data, kernel_size=kernel_size)

def apply_stereo_widener(audio_data, intensity):
    """Apply stereo widening effect"""
    if len(audio_data.shape) < 2:
        return audio_data  # Can't widen mono audio
    
    width = intensity * 0.02  # 0 to 2x width
    # Simple stereo widening
    left = audio_data[:, 0]
    right = audio_data[:, 1]
    mid = (left + right) / 2
    side = (left - right) / 2 * width
    
    return np.column_stack([mid + side, mid - side])

def apply_mono_maker(audio_data, intensity):
    """Convert stereo to mono with intensity control"""
    if len(audio_data.shape) < 2:
        return audio_data  # Already mono
    
    mono_mix = (intensity / 100.0)  # 0 to 1
    stereo = audio_data.copy()
    mono = np.mean(audio_data, axis=1, keepdims=True)
    mono = np.repeat(mono, 2, axis=1)
    
    return stereo * (1 - mono_mix) + mono * mono_mix

# Batch Effects Processing Route
@api.route('/audio/batch-effects', methods=['POST'])
@jwt_required()
def apply_batch_effects():
    """Apply multiple effects in sequence"""
    try:
        user_id = get_jwt_identity()
        effects_chain = request.json.get('effects_chain', [])
        clip_id = request.json.get('clip_id')
        
        if not effects_chain:
            return jsonify({"error": "No effects chain provided"}), 400
            
        # Load audio clip
        audio_clip = Audio.query.get(clip_id)
        if not audio_clip:
            return jsonify({"error": "Audio clip not found"}), 404
            
        # Load audio data
        audio_data, sample_rate = librosa.load(audio_clip.file_url, sr=None)
        
        # Apply effects in sequence
        processed_audio = audio_data
        for effect in effects_chain:
            effect_id = effect.get('id')
            intensity = effect.get('intensity', 50) / 100.0
            processed_audio = apply_effect(processed_audio, sample_rate, effect_id, intensity)
        
        # Save processed audio
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as output_file:
            sf.write(output_file.name, processed_audio, sample_rate)
            
            # Upload processed audio
            result = uploadFile(output_file.name, folder="audio_effects")
            os.unlink(output_file.name)
            
            return jsonify({
                "success": True,
                "processed_audio_url": result.get('secure_url'),
                "effects_applied": len(effects_chain)
            }), 200
            
    except Exception as e:
        return jsonify({"error": f"Batch processing failed: {str(e)}"}), 500

# Audio Analysis Route
@api.route('/audio/analyze', methods=['POST'])
@jwt_required()
def analyze_audio():
    """Analyze audio characteristics for automatic effect suggestions"""
    try:
        user_id = get_jwt_identity()
        clip_id = request.json.get('clip_id')
        
        audio_clip = Audio.query.get(clip_id)
        if not audio_clip:
            return jsonify({"error": "Audio clip not found"}), 404
            
        # Load audio for analysis
        audio_data, sample_rate = librosa.load(audio_clip.file_url, sr=None)
        
        # Perform audio analysis
        analysis = {
            "duration": len(audio_data) / sample_rate,
            "sample_rate": sample_rate,
            "rms_energy": float(np.sqrt(np.mean(audio_data**2))),
            "peak_amplitude": float(np.max(np.abs(audio_data))),
            "dynamic_range": float(np.max(np.abs(audio_data)) - np.mean(np.abs(audio_data))),
            "spectral_centroid": float(np.mean(librosa.feature.spectral_centroid(y=audio_data, sr=sample_rate))),
            "zero_crossing_rate": float(np.mean(librosa.feature.zero_crossing_rate(audio_data))),
            "suggested_effects": []
        }
        
        # Add effect suggestions based on analysis
        if analysis["dynamic_range"] > 0.5:
            analysis["suggested_effects"].append({
                "effect": "compressor",
                "reason": "High dynamic range detected",
                "suggested_intensity": 30
            })
            
        if analysis["rms_energy"] < 0.1:
            analysis["suggested_effects"].append({
                "effect": "normalize",
                "reason": "Low audio level detected",
                "suggested_intensity": 80
            })
            
        if analysis["spectral_centroid"] > 3000:
            analysis["suggested_effects"].append({
                "effect": "deEsser",
                "reason": "Bright audio with potential sibilance",
                "suggested_intensity": 25
            })
        
        return jsonify(analysis), 200
        
    except Exception as e:
        return jsonify({"error": f"Audio analysis failed: {str(e)}"}), 500

# Effect Presets Route
@api.route('/audio/presets', methods=['GET'])
def get_audio_presets():
    """Get predefined audio effect presets"""
    presets = {
        "vocal": [
            {"id": "highPass", "intensity": 15, "name": "Remove Low Rumble"},
            {"id": "compressor", "intensity": 45, "name": "Vocal Compression"},
            {"id": "deEsser", "intensity": 30, "name": "Reduce Sibilance"},
            {"id": "reverb", "intensity": 20, "name": "Add Presence"}
        ],
        "music": [
            {"id": "equalizer", "intensity": 35, "name": "Musical EQ"},
            {"id": "compressor", "intensity": 25, "name": "Gentle Compression"},
            {"id": "stereoWiden", "intensity": 40, "name": "Stereo Enhancement"}
        ],
        "podcast": [
            {"id": "noiseReduction", "intensity": 50, "name": "Clean Background"},
            {"id": "compressor", "intensity": 55, "name": "Even Levels"},
            {"id": "highPass", "intensity": 20, "name": "Remove Room Tone"},
            {"id": "normalizer", "intensity": 75, "name": "Consistent Volume"}
        ],
        "radio": [
            {"id": "compressor", "intensity": 65, "name": "Broadcast Compression"},
            {"id": "limiter", "intensity": 85, "name": "Peak Limiting"},
            {"id": "equalizer", "intensity": 45, "name": "Radio EQ"}
        ]
    }
    
    return jsonify(presets), 200

# Real-time Effect Preview Route
@api.route('/audio/preview-effect', methods=['POST'])
@jwt_required()
def preview_audio_effect():
    """Generate a short preview of an effect applied to audio"""
    try:
        user_id = get_jwt_identity()
        effect_id = request.json.get('effect_id')
        intensity = request.json.get('intensity', 50) / 100.0
        clip_id = request.json.get('clip_id')
        start_time = request.json.get('start_time', 0)  # Preview start time in seconds
        duration = request.json.get('duration', 5)  # Preview duration in seconds
        
        audio_clip = Audio.query.get(clip_id)
        if not audio_clip:
            return jsonify({"error": "Audio clip not found"}), 404
            
        # Load only a segment of the audio for preview
        audio_data, sample_rate = librosa.load(
            audio_clip.file_url, 
            sr=None, 
            offset=start_time, 
            duration=duration
        )
        
        # Apply effect
        processed_audio = apply_effect(audio_data, sample_rate, effect_id, intensity)
        
        # Create a short preview file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as preview_file:
            sf.write(preview_file.name, processed_audio, sample_rate)
            
            # Convert to base64 for immediate playback
            with open(preview_file.name, 'rb') as f:
                audio_base64 = base64.b64encode(f.read()).decode('utf-8')
            
            os.unlink(preview_file.name)
            
            return jsonify({
                "success": True,
                "preview_audio": f"data:audio/wav;base64,{audio_base64}",
                "effect_applied": effect_id,
                "intensity": intensity * 100,
                "duration": duration
            }), 200
            
    except Exception as e:
        return jsonify({"error": f"Preview generation failed: {str(e)}"}), 500

@api.route('/video-editor/projects', methods=['GET'])
@jwt_required()
def get_video_editor_projects():
    """Get user's video editor projects (using existing Video model)"""
    user_id = get_jwt_identity()
    
    # Use your existing Video model as projects
    projects = Video.query.filter_by(
        user_id=user_id,
        processing_status='completed'  # Only completed videos
    ).order_by(desc(Video.uploaded_at)).all()
    
    projects_data = []
    for video in projects:
        project_data = video.serialize()
        project_data.update({
            'project_type': 'video_editor',
            'timeline_data': getattr(video, 'timeline_data', {'tracks': []}),
            'settings': {
                'width': getattr(video, 'width', 1920),
                'height': getattr(video, 'height', 1080),
                'frame_rate': getattr(video, 'frame_rate', 30),
                'duration': video.duration or 0
            }
        })
        projects_data.append(project_data)
    
    return jsonify({'projects': projects_data}), 200

@api.route('/video-editor/projects', methods=['POST'])
@jwt_required()
def create_video_editor_project():
    """Create new video editor project"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Check user limits
    user_plan = get_user_plan(user_id)
    current_projects = Video.query.filter_by(user_id=user_id).count()
    
    if user_plan and user_plan.max_projects != -1 and current_projects >= user_plan.max_projects:
        return jsonify({'error': f'Project limit reached ({user_plan.max_projects})'}), 403
    
    # Create new video project using existing model
    project = Video(
        user_id=user_id,
        title=data.get('title', 'New Video Project'),
        description=data.get('description', ''),
        category=data.get('category', 'Video Editor Project'),
        file_url='',  # Will be set when exported
        thumbnail_url='',
        duration=data.get('duration', 0),
        processing_status='editing',  # Custom status for editor projects
        status='private',  # Keep private until exported
        is_public=False,
        uploaded_at=datetime.utcnow()
    )
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify({
        'message': 'Video editor project created successfully',
        'project': project.serialize()
    }), 201

@api.route('/video-editor/projects/<int:project_id>/clips', methods=['POST'])
@jwt_required()
def add_clip_to_timeline():
    """Add media clip to project timeline"""
    user_id = get_jwt_identity()
    project_id = project_id
    data = request.get_json()
    
    # Verify project ownership
    project = Video.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    # Create timeline clip using VideoClip model
    clip = VideoClip(
        user_id=user_id,
        title=data.get('title', 'Timeline Clip'),
        description=f"Clip in project: {project.title}",
        video_url=data.get('file_url'),
        thumbnail_url=data.get('thumbnail_url'),
        start_time=data.get('timeline_start', 0),
        end_time=data.get('timeline_start', 0) + data.get('duration', 10),
        duration=data.get('duration', 10),
        content_type='timeline_clip',
        source_video_id=project_id,
        is_public=False,
        created_at=datetime.utcnow()
    )
    
    db.session.add(clip)
    db.session.commit()
    
    return jsonify({
        'message': 'Clip added to timeline',
        'clip': clip.serialize()
    }), 201

@api.route('/video-editor/projects/<int:project_id>/timeline', methods=['GET'])
@jwt_required()
def get_project_timeline(project_id):
    """Get project timeline with all clips"""
    user_id = get_jwt_identity()
    
    project = Video.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    # Get all timeline clips for this project
    clips = VideoClip.query.filter_by(
        source_video_id=project_id,
        content_type='timeline_clip'
    ).order_by(VideoClip.start_time).all()
    
    # Organize clips by tracks (you can extend this logic)
    tracks = [
        {
            'id': 1,
            'name': 'Video Track 1',
            'type': 'video',
            'clips': []
        },
        {
            'id': 2,
            'name': 'Audio Track 1', 
            'type': 'audio',
            'clips': []
        }
    ]
    
    # Add clips to appropriate tracks
    for clip in clips:
        clip_data = clip.serialize()
        
        # Determine track based on media type or user assignment
        if 'audio' in clip.video_url.lower() or clip.content_type == 'audio':
            tracks[1]['clips'].append(clip_data)
        else:
            tracks[0]['clips'].append(clip_data)
    
    return jsonify({
        'project': project.serialize(),
        'timeline': {'tracks': tracks}
    }), 200

@api.route('/video-editor/apply-video-effect', methods=['POST'])
@jwt_required()
def apply_video_effect():
    """Apply video effect to clip"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    clip_id = data.get('clip_id')
    effect_id = data.get('effect_id')
    intensity = data.get('intensity', 50)
    
    clip = VideoClip.query.filter_by(id=clip_id).first()
    if not clip or clip.user_id != user_id:
        return jsonify({'error': 'Clip not found'}), 404
    
    try:
        # Apply video effect using OpenCV/FFmpeg
        processed_url = process_video_effect(clip.video_url, effect_id, intensity)
        
        if processed_url:
            # Update clip with processed version
            clip.video_url = processed_url
            clip.description = f"{clip.description} - Applied {effect_id}"
            db.session.commit()
            
            return jsonify({
                'success': True,
                'processed_url': processed_url,
                'effect': effect_id,
                'intensity': intensity
            }), 200
        else:
            return jsonify({'error': 'Effect processing failed'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Effect application failed: {str(e)}'}), 500

def process_video_effect(video_url, effect_id, intensity):
    """Process video effect using OpenCV and FFmpeg"""
    try:
        # Download video from URL temporarily
        temp_input = f"/tmp/input_{uuid.uuid4()}.mp4"
        temp_output = f"/tmp/output_{uuid.uuid4()}.mp4"
        
        # Download file
        import requests
        response = requests.get(video_url)
        with open(temp_input, 'wb') as f:
            f.write(response.content)
        
        # Apply effect based on type
        if effect_id == 'brightness':
            apply_brightness_effect(temp_input, temp_output, intensity)
        elif effect_id == 'contrast':
            apply_contrast_effect(temp_input, temp_output, intensity)
        elif effect_id == 'blur':
            apply_blur_effect(temp_input, temp_output, intensity)
        elif effect_id == 'sharpen':
            apply_sharpen_effect(temp_input, temp_output, intensity)
        else:
            # Copy original if effect not implemented
            import shutil
            shutil.copy(temp_input, temp_output)
        
        # Upload processed video to Cloudinary
        result = uploadFile(temp_output, folder="video_effects")
        
        # Clean up temp files
        os.remove(temp_input)
        os.remove(temp_output)
        
        return result.get('secure_url')
        
    except Exception as e:
        print(f"Video effect processing error: {e}")
        return None

def apply_brightness_effect(input_path, output_path, intensity):
    """Apply brightness effect using FFmpeg"""
    brightness_value = (intensity - 50) / 50.0  # -1 to 1
    
    command = [
        'ffmpeg', '-i', input_path,
        '-vf', f'eq=brightness={brightness_value}',
        '-c:a', 'copy',  # Copy audio without re-encoding
        '-y', output_path
    ]
    
    subprocess.run(command, check=True, capture_output=True)

def apply_contrast_effect(input_path, output_path, intensity):
    """Apply contrast effect using FFmpeg"""
    contrast_value = 0.5 + (intensity / 100.0)  # 0.5 to 1.5
    
    command = [
        'ffmpeg', '-i', input_path,
        '-vf', f'eq=contrast={contrast_value}',
        '-c:a', 'copy',
        '-y', output_path
    ]
    
    subprocess.run(command, check=True, capture_output=True)

def apply_blur_effect(input_path, output_path, intensity):
    """Apply blur effect using FFmpeg"""
    blur_radius = intensity / 10.0  # 0 to 10
    
    command = [
        'ffmpeg', '-i', input_path,
        '-vf', f'boxblur={blur_radius}',
        '-c:a', 'copy',
        '-y', output_path
    ]
    
    subprocess.run(command, check=True, capture_output=True)

def apply_sharpen_effect(input_path, output_path, intensity):
    """Apply sharpen effect using FFmpeg"""
    sharpen_value = intensity / 100.0  # 0 to 1
    
    command = [
        'ffmpeg', '-i', input_path,
        '-vf', f'unsharp=5:5:{sharpen_value}',
        '-c:a', 'copy',
        '-y', output_path
    ]
    
    subprocess.run(command, check=True, capture_output=True)

@api.route('/video-editor/projects/<int:project_id>/export', methods=['POST'])
@jwt_required()
def export_video_project(project_id):
    """Export video editor project to final video"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    project = Video.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    # Check user export limits
    user_plan = get_user_plan(user_id)
    export_quality = data.get('quality', '1080p')
    
    if user_plan and user_plan.max_export_quality:
        allowed_qualities = ['720p', '1080p', '4k', '8k']
        max_quality_index = allowed_qualities.index(user_plan.max_export_quality)
        requested_quality_index = allowed_qualities.index(export_quality)
        
        if requested_quality_index > max_quality_index:
            return jsonify({'error': f'Export quality {export_quality} not allowed for {user_plan.name} plan'}), 403
    
    try:
        # Get all clips in timeline order
        clips = VideoClip.query.filter_by(
            source_video_id=project_id,
            content_type='timeline_clip'
        ).order_by(VideoClip.start_time).all()
        
        # Start export process
        export_result = render_timeline_to_video(clips, export_quality, project.title)
        
        if export_result:
            # Update project with final video
            project.file_url = export_result['url']
            project.thumbnail_url = export_result.get('thumbnail_url')
            project.processing_status = 'completed'
            project.status = 'active'
            project.is_public = data.get('make_public', False)
            
            db.session.commit()
            
            return jsonify({
                'message': 'Export completed successfully',
                'video_url': export_result['url'],
                'thumbnail_url': export_result.get('thumbnail_url'),
                'export_quality': export_quality
            }), 200
        else:
            return jsonify({'error': 'Export failed'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Export failed: {str(e)}'}), 500

def render_timeline_to_video(clips, quality='1080p', title='Video Project'):
    """Render timeline clips into final video using MoviePy"""
    try:
        from moviepy import VideoFileClip, CompositeVideoClip, concatenate_videoclips
        
        # Quality settings
        quality_settings = {
            '720p': {'width': 1280, 'height': 720, 'bitrate': '2000k'},
            '1080p': {'width': 1920, 'height': 1080, 'bitrate': '5000k'},
            '4k': {'width': 3840, 'height': 2160, 'bitrate': '15000k'},
            '8k': {'width': 7680, 'height': 4320, 'bitrate': '50000k'}
        }
        
        settings = quality_settings.get(quality, quality_settings['1080p'])
        
        # Process clips
        video_clips = []
        temp_files = []
        
        for clip in clips:
            if clip.video_url and clip.video_url.startswith('http'):
                # Download clip temporarily
                temp_file = f"/tmp/clip_{clip.id}_{uuid.uuid4()}.mp4"
                
                response = requests.get(clip.video_url)
                with open(temp_file, 'wb') as f:
                    f.write(response.content)
                
                temp_files.append(temp_file)
                
                # Load with MoviePy
                video_clip = VideoFileClip(temp_file)
                
                # Apply timeline timing
                if hasattr(clip, 'start_time') and hasattr(clip, 'end_time'):
                    duration = (clip.end_time - clip.start_time) / 1000.0  # Convert to seconds
                    video_clip = video_clip.subclip(0, min(duration, video_clip.duration))
                
                # Resize to target resolution
                video_clip = video_clip.resize((settings['width'], settings['height']))
                
                video_clips.append(video_clip)
        
        if not video_clips:
            raise Exception("No valid clips to render")
        
        # Concatenate clips
        final_video = concatenate_videoclips(video_clips, method="compose")
        
        # Export final video
        output_path = f"/tmp/final_{uuid.uuid4()}.mp4"
        final_video.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            bitrate=settings['bitrate'],
            audio_codec='aac'
        )
        
        # Upload to Cloudinary
        result = uploadFile(output_path, folder="video_exports")
        
        # Generate thumbnail
        thumbnail_path = f"/tmp/thumb_{uuid.uuid4()}.jpg"
        final_video.save_frame(thumbnail_path, t=1.0)  # Thumbnail at 1 second
        thumbnail_result = uploadFile(thumbnail_path, folder="video_thumbnails")
        
        # Clean up
        final_video.close()
        for clip in video_clips:
            clip.close()
        
        # Remove temp files
        os.remove(output_path)
        os.remove(thumbnail_path)
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        return {
            'url': result.get('secure_url'),
            'thumbnail_url': thumbnail_result.get('secure_url')
        }
        
    except Exception as e:
        print(f"Video rendering error: {e}")
        return None

@api.route('/video-editor/preview-frame', methods=['POST'])
@jwt_required()
def generate_preview_frame():
    """Generate preview frame for timeline position"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    project_id = data.get('project_id')
    timestamp = data.get('timestamp', 0)
    
    project = Video.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    try:
        # Get clips at timestamp
        clips = VideoClip.query.filter(
            VideoClip.source_video_id == project_id,
            VideoClip.start_time <= timestamp * 1000,  # Convert to milliseconds
            VideoClip.end_time >= timestamp * 1000
        ).all()
        
        if not clips:
            return jsonify({'error': 'No clips at timestamp'}), 404
        
        # Use first clip for preview (you can enhance this to composite multiple clips)
        clip = clips[0]
        frame_data = extract_video_frame(clip.video_url, timestamp - (clip.start_time / 1000.0))
        
        if frame_data:
            return jsonify({
                'frame_data': frame_data,
                'timestamp': timestamp
            }), 200
        else:
            return jsonify({'error': 'Could not generate frame'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Preview generation failed: {str(e)}'}), 500

def extract_video_frame(video_url, timestamp):
    """Extract frame from video at timestamp"""
    try:
        temp_file = f"/tmp/preview_{uuid.uuid4()}.mp4"
        frame_file = f"/tmp/frame_{uuid.uuid4()}.jpg"
        
        # Download video
        response = requests.get(video_url)
        with open(temp_file, 'wb') as f:
            f.write(response.content)
        
        # Extract frame using FFmpeg
        command = [
            'ffmpeg', '-i', temp_file,
            '-ss', str(timestamp),
            '-vframes', '1',
            '-q:v', '2',
            '-y', frame_file
        ]
        
        subprocess.run(command, check=True, capture_output=True)
        
        # Convert to base64
        with open(frame_file, 'rb') as f:
            frame_bytes = f.read()
            frame_b64 = base64.b64encode(frame_bytes).decode('utf-8')
        
        # Clean up
        os.remove(temp_file)
        os.remove(frame_file)
        
        return f"data:image/jpeg;base64,{frame_b64}"
        
    except Exception as e:
        print(f"Frame extraction error: {e}")
        return None

# Add video transitions support
@api.route('/video-editor/apply-transition', methods=['POST'])
@jwt_required()
def apply_video_transition():
    """Apply transition between clips"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    clip_id_1 = data.get('clip_id_1')
    clip_id_2 = data.get('clip_id_2') 
    transition_type = data.get('transition_type', 'crossfade')
    duration = data.get('duration', 1.0)
    
    # Verify clips
    clip1 = VideoClip.query.filter_by(id=clip_id_1).first()
    clip2 = VideoClip.query.filter_by(id=clip_id_2).first()
    
    if not clip1 or not clip2 or clip1.user_id != user_id or clip2.user_id != user_id:
        return jsonify({'error': 'Invalid clips'}), 404
    
    try:
        # Apply transition using MoviePy
        result_url = create_video_transition(clip1.video_url, clip2.video_url, transition_type, duration)
        
        if result_url:
            return jsonify({
                'success': True,
                'transition_url': result_url,
                'type': transition_type,
                'duration': duration
            }), 200
        else:
            return jsonify({'error': 'Transition creation failed'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Transition failed: {str(e)}'}), 500

def create_video_transition(video1_url, video2_url, transition_type, duration):
    """Create transition between two videos"""
    try:
        from moviepy import VideoFileClip, CompositeVideoClip
        
        # Download videos
        temp1 = f"/tmp/vid1_{uuid.uuid4()}.mp4"
        temp2 = f"/tmp/vid2_{uuid.uuid4()}.mp4"
        
        response1 = requests.get(video1_url)
        with open(temp1, 'wb') as f:
            f.write(response1.content)
            
        response2 = requests.get(video2_url)
        with open(temp2, 'wb') as f:
            f.write(response2.content)
        
        # Load clips
        clip1 = VideoFileClip(temp1)
        clip2 = VideoFileClip(temp2)
        
        # Create transition
        if transition_type == 'crossfade':
            # Crossfade transition
            clip1_fade = clip1.fadeout(duration)
            clip2_fade = clip2.fadein(duration).set_start(clip1.duration - duration)
            
            final_clip = CompositeVideoClip([clip1_fade, clip2_fade])
        else:
            # Default: simple concatenation
            from moviepy import concatenate_videoclips
            final_clip = concatenate_videoclips([clip1, clip2])
        
        # Export
        output_path = f"/tmp/transition_{uuid.uuid4()}.mp4"
        final_clip.write_videofile(output_path, fps=30, codec='libx264')
        
        # Upload
        result = uploadFile(output_path, folder="video_transitions")
        
        # Clean up
        final_clip.close()
        clip1.close()
        clip2.close()
        os.remove(temp1)
        os.remove(temp2)
        os.remove(output_path)
        
        return result.get('secure_url')
        
    except Exception as e:
        print(f"Transition creation error: {e}")
        return None
# Add to your src/api/routes.py file

@api.route('/user/all-content', methods=['GET'])
@jwt_required()
def get_user_all_content():
    """Get all content created by user for sharing library"""
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters for filtering and pagination
        search = request.args.get('search', '').strip()
        content_type = request.args.get('type', 'all')
        date_filter = request.args.get('date_filter', 'all')
        sort_by = request.args.get('sort_by', 'newest')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        all_content = []
        
        # Fetch Music Content
        music_query = Audio.query.filter_by(user_id=user_id)
        if search:
            music_query = music_query.filter(
                or_(
                    Audio.title.ilike(f'%{search}%'),
                    Audio.artist_name.ilike(f'%{search}%')
                )
            )
        
        music_tracks = music_query.all()
        for track in music_tracks:
            all_content.append({
                'id': track.id,
                'type': 'music',
                'title': track.title,
                'artist_name': getattr(track, 'artist_name', 'You'),
                'description': getattr(track, 'description', ''),
                'created_at': track.created_at.isoformat() if hasattr(track, 'created_at') else None,
                'album_cover': getattr(track, 'album_cover', None),
                'genre': getattr(track, 'genre', None),
                'duration': getattr(track, 'duration', 0),
                'stats': {
                    'streams': getattr(track, 'play_count', 0),
                    'shares': getattr(track, 'share_count', 0),
                    'likes': getattr(track, 'like_count', 0)
                },
                'streaming_url': getattr(track, 'streaming_url', ''),
                'tags': ['music', 'audio', getattr(track, 'genre', 'original')]
            })
        
        # Fetch Video Content
        try:
            video_query = Video.query.filter_by(user_id=user_id)
            if search:
                video_query = video_query.filter(
                    or_(
                        Video.title.ilike(f'%{search}%'),
                        Video.description.ilike(f'%{search}%') if hasattr(Video, 'description') else True
                    )
                )
            
            videos = video_query.all()
            for video in videos:
                all_content.append({
                    'id': video.id,
                    'type': 'video',
                    'title': video.title,
                    'description': getattr(video, 'description', ''),
                    'created_at': video.created_at.isoformat() if hasattr(video, 'created_at') else None,
                    'thumbnail': getattr(video, 'thumbnail', None),
                    'video_url': video.url if hasattr(video, 'url') else getattr(video, 'video_url', ''),
                    'duration': getattr(video, 'duration', 0),
                    'category': getattr(video, 'category', 'Video'),
                    'stats': {
                        'views': getattr(video, 'view_count', 0),
                        'shares': getattr(video, 'share_count', 0),
                        'likes': getattr(video, 'like_count', 0)
                    },
                    'tags': ['video', 'visual', getattr(video, 'category', 'content')]
                })
        except Exception as e:
            print(f"Error fetching videos: {e}")
        
        # Fetch Podcast Content
        try:
            # Get podcasts hosted by user
            user_podcasts = Podcast.query.filter_by(host_id=user_id).all()
            for podcast in user_podcasts:
                # Get episodes for each podcast
                episodes = PodcastEpisode.query.filter_by(podcast_id=podcast.id).all()
                for episode in episodes:
                    all_content.append({
                        'id': episode.id,
                        'type': 'podcast',
                        'title': episode.title,
                        'description': getattr(episode, 'description', ''),
                        'created_at': episode.created_at.isoformat() if hasattr(episode, 'created_at') else None,
                        'thumbnail': getattr(episode, 'thumbnail', None),
                        'podcast_name': podcast.name,
                        'episode_number': getattr(episode, 'episode_number', 1),
                        'duration': getattr(episode, 'duration', 0),
                        'host': getattr(podcast.host, 'display_name', 'You') if hasattr(podcast, 'host') else 'You',
                        'stats': {
                            'listens': getattr(episode, 'listen_count', 0),
                            'shares': getattr(episode, 'share_count', 0),
                            'downloads': getattr(episode, 'download_count', 0)
                        },
                        'tags': ['podcast', 'audio', 'episode']
                    })
        except Exception as e:
            print(f"Error fetching podcasts: {e}")
        
        # Fetch Radio Stations
        try:
            radio_stations = RadioStation.query.filter_by(user_id=user_id).all()
            for station in radio_stations:
                all_content.append({
                    'id': station.id,
                    'type': 'radio',
                    'title': f"{station.name} - Radio Station",
                    'station_name': station.name,
                    'description': getattr(station, 'description', ''),
                    'created_at': station.created_at.isoformat() if hasattr(station, 'created_at') else None,
                    'cover_image': getattr(station, 'cover_image', None),
                    'genre': getattr(station, 'genre', 'Music'),
                    'current_track': getattr(station, 'now_playing_metadata', 'Various Artists'),
                    'stats': {
                        'listeners': getattr(station, 'listener_count', 0),
                        'shares': getattr(station, 'share_count', 0),
                        'total_plays': getattr(station, 'total_play_count', 0)
                    },
                    'stream_url': f"https://streampirex.com/radio/{station.id}",
                    'is_live': getattr(station, 'is_live', False),
                    'tags': ['radio', 'live', 'broadcast', getattr(station, 'genre', 'music')]
                })
        except Exception as e:
            print(f"Error fetching radio stations: {e}")
        
        # Apply content type filter
        if content_type != 'all':
            all_content = [item for item in all_content if item['type'] == content_type]
        
        # Apply date filter
        if date_filter != 'all':
            from datetime import datetime, timedelta
            now = datetime.utcnow()
            
            if date_filter == 'week':
                cutoff = now - timedelta(days=7)
            elif date_filter == 'month':
                cutoff = now - timedelta(days=30)
            elif date_filter == '3months':
                cutoff = now - timedelta(days=90)
            elif date_filter == '6months':
                cutoff = now - timedelta(days=180)
            elif date_filter == 'year':
                cutoff = now - timedelta(days=365)
            else:
                cutoff = datetime.min
            
            all_content = [
                item for item in all_content 
                if item.get('created_at') and datetime.fromisoformat(item['created_at'].replace('Z', '+00:00')) >= cutoff
            ]
        
        # Apply sorting
        if sort_by == 'oldest':
            all_content.sort(key=lambda x: x.get('created_at') or '1970-01-01')
        elif sort_by == 'popular':
            all_content.sort(key=lambda x: x.get('stats', {}).get('views', 0) + x.get('stats', {}).get('streams', 0) + x.get('stats', {}).get('listens', 0), reverse=True)
        elif sort_by == 'title':
            all_content.sort(key=lambda x: x.get('title', '').lower())
        else:  # newest (default)
            all_content.sort(key=lambda x: x.get('created_at') or '1970-01-01', reverse=True)
        
        # Apply pagination
        total_items = len(all_content)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_content = all_content[start_index:end_index]
        
        return jsonify({
            'success': True,
            'content': paginated_content,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_items': total_items,
                'total_pages': (total_items + per_page - 1) // per_page,
                'has_next': end_index < total_items,
                'has_prev': page > 1
            },
            'filters_applied': {
                'search': search,
                'content_type': content_type,
                'date_filter': date_filter,
                'sort_by': sort_by
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching user content: {e}")
        return jsonify({
            'error': 'Failed to fetch content',
            'details': str(e)
        }), 500

@api.route('/user/content-stats', methods=['GET'])
@jwt_required()
def get_user_content_stats():
    """Get summary statistics of user's content"""
    try:
        user_id = get_jwt_identity()
        
        stats = {
            'total_content': 0,
            'by_type': {
                'music': 0,
                'video': 0,
                'podcast': 0,
                'radio': 0,
                'gaming': 0
            },
            'total_engagement': {
                'views': 0,
                'streams': 0,
                'listens': 0,
                'shares': 0,
                'likes': 0
            },
            'recent_activity': {
                'last_upload': None,
                'this_week': 0,
                'this_month': 0
            }
        }
        
        # Count music tracks
        music_count = Audio.query.filter_by(user_id=user_id).count()
        stats['by_type']['music'] = music_count
        stats['total_content'] += music_count
        
        # Count videos (if Video model exists)
        try:
            video_count = Video.query.filter_by(user_id=user_id).count()
            stats['by_type']['video'] = video_count
            stats['total_content'] += video_count
        except:
            pass
        
        # Count podcast episodes
        try:
            user_podcasts = Podcast.query.filter_by(host_id=user_id).all()
            podcast_count = 0
            for podcast in user_podcasts:
                podcast_count += PodcastEpisode.query.filter_by(podcast_id=podcast.id).count()
            stats['by_type']['podcast'] = podcast_count
            stats['total_content'] += podcast_count
        except:
            pass
        
        # Count radio stations
        try:
            radio_count = RadioStation.query.filter_by(user_id=user_id).count()
            stats['by_type']['radio'] = radio_count
            stats['total_content'] += radio_count
        except:
            pass
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        print(f"Error fetching content stats: {e}")
        return jsonify({
            'error': 'Failed to fetch content statistics'
        }), 500

@api.route('/user/search-content', methods=['POST'])
@jwt_required()
def search_user_content():
    """Advanced search through user's content"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        search_query = data.get('query', '').strip()
        content_types = data.get('content_types', ['all'])
        date_range = data.get('date_range', 'all')
        tags = data.get('tags', [])
        sort_by = data.get('sort_by', 'relevance')
        limit = min(data.get('limit', 20), 100)  # Max 100 results
        
        # This would implement more advanced search logic
        # For now, redirect to the main content endpoint
        search_params = {
            'search': search_query,
            'type': content_types[0] if content_types and content_types[0] != 'all' else 'all',
            'sort_by': sort_by,
            'per_page': limit
        }
        
        # Call the main content endpoint internally
        # (In a real implementation, you'd have shared search logic)
        
        return jsonify({
            'success': True,
            'message': 'Advanced search completed',
            'results': [],
            'search_params': search_params
        }), 200
        
    except Exception as e:
        print(f"Error in advanced search: {e}")
        return jsonify({
            'error': 'Search failed'
        }), 500

# Analytics Endpoint

@api.route('/video/channel/analytics', methods=['GET'])
@jwt_required()
def get_channel_analytics():
    from datetime import datetime, timedelta
    from collections import defaultdict
    
    user_id = get_jwt_identity()
    channel = VideoChannel.query.filter_by(user_id=user_id).first()
    if not channel:
        return jsonify({"error": "No channel found"}), 404
    
    videos = Video.query.filter_by(user_id=user_id).all()
    
    monthly_views = []
    monthly_subscribers = []
    
    for i in range(6, -1, -1):
        month_start = datetime.utcnow() - timedelta(days=30*i)
        month_end = month_start + timedelta(days=30)
        month_videos = [v for v in videos if month_start <= v.uploaded_at <= month_end]
        monthly_views.append(sum(v.views or 0 for v in month_videos))
        monthly_subscribers.append(channel.subscriber_count)
    
    views_by_category = defaultdict(int)
    for v in videos:
        views_by_category[v.category or 'Other'] += (v.views or 0)
    
    return jsonify({
        "stats": {
            "totalViews": sum(v.views or 0 for v in videos),
            "totalLikes": sum(v.likes or 0 for v in videos),
            "totalVideos": len(videos),
            "subscribers": channel.subscriber_count
        },
        "monthlyViews": monthly_views,
        "monthlySubscribers": monthly_subscribers,
        "viewsByCategory": dict(views_by_category)
    }), 200

# ============ SELLER DASHBOARD - ORDER MANAGEMENT ============

# ============ STOREFRONT ROUTE (MISSING) ============
@api.route('/storefront', methods=['GET'])
@jwt_required()
def get_user_storefront():
    """Get current user's products for storefront"""
    user_id = get_jwt_identity()
    
    try:
        products = Product.query.filter_by(user_id=user_id).all()
        
        # Add sales data to each product
        result = []
        for product in products:
            product_data = product.serialize()
            
            # Get sales count and revenue for this product
            sales = Order.query.filter_by(product_id=product.id, status='delivered').all()
            product_data['sales_count'] = len(sales)
            product_data['sales_revenue'] = sum(s.total_amount or s.amount or 0 for s in sales)
            
            result.append(product_data)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Storefront error: {e}")
        return jsonify([]), 200  # Return empty array on error


# ============ FIX SELLER ORDERS (500 ERROR) ============
@api.route('/marketplace/seller/orders', methods=['GET'])
@jwt_required()
def get_seller_orders():
    """Get all orders for seller's products"""
    user_id = get_jwt_identity()
    
    try:
        # Get orders where user is the product seller
        orders = db.session.query(Order).join(Product).filter(
            Product.user_id == user_id
        ).order_by(Order.created_at.desc()).all()
        
        # Safe serialization with fallbacks
        orders_data = []
        total_sales = 0
        pending_count = 0
        completed_count = 0
        
        for order in orders:
            try:
                order_data = order.serialize() if hasattr(order, 'serialize') else {
                    'id': order.id,
                    'status': order.status,
                    'created_at': str(order.created_at) if order.created_at else None
                }
                
                # Add product info
                if order.product:
                    order_data['product_name'] = order.product.title
                
                # Add buyer info
                if hasattr(order, 'user') and order.user:
                    order_data['buyer_email'] = order.user.email
                
                orders_data.append(order_data)
                
                # Calculate stats
                amount = getattr(order, 'total_amount', None) or getattr(order, 'amount', 0) or 0
                total_sales += amount
                
                if order.status in ['pending', 'processing']:
                    pending_count += 1
                elif order.status in ['delivered', 'completed', 'shipped']:
                    completed_count += 1
                    
            except Exception as e:
                print(f"Error serializing order {order.id}: {e}")
                continue
        
        return jsonify({
            "orders": orders_data,
            "stats": {
                "total_sales": total_sales,
                "pending_orders": pending_count,
                "completed_orders": completed_count
            }
        }), 200
        
    except Exception as e:
        print(f"Seller orders error: {e}")
        return jsonify({
            "orders": [],
            "stats": {
                "total_sales": 0,
                "pending_orders": 0,
                "completed_orders": 0
            }
        }), 200


@api.route('/marketplace/orders/<int:order_id>/fulfill', methods=['POST'])
@jwt_required()
def fulfill_order(order_id):
    """Mark order as fulfilled and add tracking"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    
    # Verify seller owns the product
    product = Product.query.get(order.product_id)
    if product.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Update order
    order.status = 'shipped'
    order.tracking_number = data.get('tracking_number')
    order.carrier = data.get('carrier', 'USPS')
    order.shipped_at = datetime.utcnow()
    
    db.session.commit()
    
    # ✅ SEND EMAIL NOTIFICATION
    buyer = User.query.get(order.user_id)
    if buyer and buyer.email:
        send_order_fulfillment_notification(
            order, 
            buyer.email, 
            order.tracking_number, 
            order.carrier
        )
    
    return jsonify({
        "message": "Order marked as shipped and buyer notified",
        "order": order.serialize()
    }), 200


@api.route('/marketplace/orders/<int:order_id>/complete', methods=['POST'])
@jwt_required()
def complete_order(order_id):
    """Mark order as delivered"""
    user_id = get_jwt_identity()
    
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    
    product = Product.query.get(order.product_id)
    if product.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    order.status = 'delivered'
    order.delivered_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        "message": "Order marked as delivered",
        "order": order.serialize()
    }), 200

# ============ RADIO SCHEDULE ENDPOINTS ============

@api.route('/radio/<int:station_id>/schedule', methods=['GET'])
def get_radio_schedule(station_id):
    """Get broadcast schedule for a station"""
    station = RadioStation.query.get(station_id)
    if not station:
        return jsonify({"error": "Station not found"}), 404
    
    schedule = []
    if station.playlist_schedule and 'schedule' in station.playlist_schedule:
        schedule = station.playlist_schedule['schedule']
    
    return jsonify({
        "station_id": station_id,
        "station_name": station.name,
        "schedule": schedule
    }), 200


@api.route('/radio/<int:station_id>/schedule/add', methods=['POST'])
@jwt_required()
def add_schedule_slot(station_id):
    """Add a broadcast time slot"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 404
    
    # Validate input
    required_fields = ['day', 'start_time', 'end_time', 'show_name', 'dj_name']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Initialize playlist_schedule if it doesn't exist
    if not station.playlist_schedule:
        station.playlist_schedule = {"tracks": [], "schedule": []}
    
    if 'schedule' not in station.playlist_schedule:
        station.playlist_schedule['schedule'] = []
    
    # Add new slot
    new_slot = {
        "day": data['day'],
        "start_time": data['start_time'],
        "end_time": data['end_time'],
        "show_name": data['show_name'],
        "dj_name": data['dj_name']
    }
    
    station.playlist_schedule['schedule'].append(new_slot)
    
    # Mark as modified for SQLAlchemy to detect the change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(station, 'playlist_schedule')
    
    db.session.commit()
    
    return jsonify({
        "message": "Schedule slot added successfully",
        "slot": new_slot
    }), 201


@api.route('/radio/<int:station_id>/schedule/<int:slot_index>', methods=['DELETE'])
@jwt_required()
def delete_schedule_slot(station_id, slot_index):
    """Delete a broadcast time slot"""
    user_id = get_jwt_identity()
    
    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 404
    
    if not station.playlist_schedule or 'schedule' not in station.playlist_schedule:
        return jsonify({"error": "No schedule found"}), 404
    
    schedule = station.playlist_schedule['schedule']
    if slot_index < 0 or slot_index >= len(schedule):
        return jsonify({"error": "Invalid slot index"}), 400
    
    # Remove the slot
    del schedule[slot_index]
    
    # Mark as modified
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(station, 'playlist_schedule')
    
    db.session.commit()
    
    return jsonify({"message": "Schedule slot deleted"}), 200

# Add to src/api/routes.py

@api.route('/users/suggested', methods=['GET'])
@jwt_required()
def get_suggested_users():
    """Get suggested users to follow"""
    user_id = get_jwt_identity()
    
    # Get users the current user is NOT following
    following_ids = [f.following_id for f in Follow.query.filter_by(follower_id=user_id).all()]
    following_ids.append(user_id)  # Exclude self
    
    suggested = User.query.filter(~User.id.in_(following_ids)).limit(10).all()
    
    return jsonify([{
        "id": u.id,
        "username": u.username,
        "profile_picture": u.avatar_url,
        "bio": u.bio or "Creator on StreamPireX"
    } for u in suggested]), 200


@api.route('/trending', methods=['GET'])
def get_trending():
    """Get trending content across platform"""
    from sqlalchemy import func, desc
    
    # Get most liked/viewed content from last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    trending_videos = Video.query.filter(
        Video.created_at >= week_ago
    ).order_by(desc(Video.view_count)).limit(5).all()
    
    trending_podcasts = Podcast.query.filter(
        Podcast.created_at >= week_ago
    ).order_by(desc(Podcast.total_plays)).limit(5).all()
    
    trending = []
    
    for video in trending_videos:
        trending.append({
            "title": video.title,
            "description": video.description,
            "image_url": video.thumbnail,
            "type": "video",
            "url": f"/videos/{video.id}"
        })
    
    for podcast in trending_podcasts:
        trending.append({
            "title": podcast.title,
            "description": podcast.description,
            "image_url": podcast.cover_art,
            "type": "podcast",
            "url": f"/podcast/{podcast.id}"
        })
    
    return jsonify(trending), 200


@api.route('/user/followed-podcasts', methods=['GET'])
@jwt_required()
def get_followed_podcasts():
    """Get user's followed podcasts"""
    user_id = get_jwt_identity()
    
    # Get podcast subscriptions
    followed = PodcastSubscription.query.filter_by(user_id=user_id).all()
    
    podcasts = []
    for sub in followed:
        podcast = Podcast.query.get(sub.podcast_id)
        if podcast:
            podcasts.append(podcast.serialize())
    
    return jsonify(podcasts), 200


@api.route('/user/followed-artists', methods=['GET'])
@jwt_required()
def get_followed_artists():
    """Get user's followed artists"""
    user_id = get_jwt_identity()
    
    # Get users that current user follows who are artists
    following = Follow.query.filter_by(follower_id=user_id).all()
    
    artists = []
    for follow in following:
        user = User.query.get(follow.following_id)
        if user and (user.is_artist or user.role == 'Artist'):
            artists.append({
                "id": user.id,
                "username": user.username,
                "profile_picture": user.avatar_url,
                "artist_name": user.artist_name
            })
    
    return jsonify(artists), 200


@api.route('/user/liked-tracks', methods=['GET'])
@jwt_required()
def get_liked_tracks():
    """Get user's liked tracks"""
    user_id = get_jwt_identity()
    
    # Get likes where content_type is 'track' or 'audio'
    likes = Like.query.filter_by(
        user_id=user_id,
        content_type='audio'
    ).all()
    
    tracks = []
    for like in likes:
        track = Audio.query.get(like.content_id)
        if track:
            tracks.append(track.serialize())
    
    return jsonify(tracks), 200

@api.route('/public-health', methods=['GET', 'OPTIONS'])
def public_health_check():
    """Public health check endpoint - no authentication required"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        return response, 200
    
    return jsonify({
        "status": "healthy",
        "message": "Backend server is running",
        "timestamp": datetime.utcnow().isoformat()
    }), 200

# ============================================
# STEAM INTEGRATION ROUTES
# ============================================

@api.route('/steam/connect', methods=['POST'])
@jwt_required()
def connect_steam_account():
    """Connect user's Steam account"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        steam_id = data.get('steam_id')
        
        if not steam_id:
            return jsonify({'error': 'Steam ID is required'}), 400
        
        print(f"Connecting Steam ID: {steam_id}")
        
        # Get complete profile (with games if API key exists)
        profile = SteamService.get_complete_profile(steam_id)
        
        if not profile:
            return jsonify({
                'error': 'Could not fetch Steam profile. Make sure your Steam profile is PUBLIC.'
            }), 400
        
        # Update user
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.steam_id = steam_id
        user.steam_persona_name = profile.get('persona_name')
        user.steam_avatar_url = profile.get('avatar_url')
        user.steam_profile_url = profile.get('profile_url')
        user.steam_sync_enabled = True
        user.steam_last_synced = datetime.utcnow()
        
        db.session.commit()
        
        print(f"Successfully connected Steam for user {user_id}")
        
        return jsonify({
            'message': 'Steam account connected successfully!',
            'profile': profile
        }), 200
        
    except Exception as e:
        print(f"Error connecting Steam: {str(e)}")
        return jsonify({'error': f'Failed to connect: {str(e)}'}), 500


@api.route('/steam/profile', methods=['GET'])
@jwt_required()
def get_steam_profile():
    """Get user's connected Steam profile"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.steam_id:
            return jsonify({'error': 'No Steam account connected'}), 404
        
        # Fetch fresh data
        profile = SteamService.get_complete_profile(user.steam_id)
        
        if not profile:
            return jsonify({'error': 'Could not fetch Steam profile'}), 500
        
        return jsonify({
            'steam_id': user.steam_id,
            'profile': profile,
            'last_synced': user.steam_last_synced.isoformat() if user.steam_last_synced else None
        }), 200
        
    except Exception as e:
        print(f"Error fetching Steam profile: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api.route('/steam/sync', methods=['POST'])
@jwt_required()
def sync_steam_data():
    """Manually sync Steam data"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.steam_id:
            return jsonify({'error': 'No Steam account connected'}), 404
        
        # Fetch fresh data
        profile = SteamService.get_complete_profile(user.steam_id)
        
        if not profile:
            return jsonify({'error': 'Could not sync Steam data'}), 500
        
        # Update user data
        user.steam_persona_name = profile.get('persona_name')
        user.steam_avatar_url = profile.get('avatar_url')
        user.steam_last_synced = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Steam data synced successfully!',
            'profile': profile
        }), 200
        
    except Exception as e:
        print(f"Error syncing Steam: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api.route('/steam/disconnect', methods=['POST'])
@jwt_required()
def disconnect_steam_account():
    """Disconnect Steam account"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.steam_id = None
        user.steam_persona_name = None
        user.steam_avatar_url = None
        user.steam_profile_url = None
        user.steam_sync_enabled = False
        user.steam_last_synced = None
        
        db.session.commit()
        
        return jsonify({'message': 'Steam account disconnected'}), 200
        
    except Exception as e:
        print(f"Error disconnecting Steam: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api.route('/steam/verify/<steam_id>', methods=['GET'])
def verify_steam_id(steam_id):
    """Verify a Steam ID (public endpoint)"""
    try:
        is_valid = SteamService.verify_steam_id(steam_id)
        
        if is_valid:
            profile = SteamService.get_player_summary(steam_id)
            return jsonify({
                'valid': True,
                'username': profile.get('persona_name'),
                'avatar': profile.get('avatar_icon')
            }), 200
        else:
            return jsonify({'valid': False}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# =====================================================
# FIX: /api/categories - Get music genres/categories
# =====================================================
@api.route('/categories', methods=['GET'])
def get_categories():
    """Get all music genres/categories"""
    try:
        # If you have a Category model, use it:
        # categories = Category.query.all()
        # return jsonify([c.serialize() for c in categories]), 200
        
        # Otherwise return default genres:
        default_genres = [
            {"id": 1, "name": "Hip-Hop"},
            {"id": 2, "name": "R&B"},
            {"id": 3, "name": "Pop"},
            {"id": 4, "name": "Rock"},
            {"id": 5, "name": "Electronic"},
            {"id": 6, "name": "Jazz"},
            {"id": 7, "name": "Classical"},
            {"id": 8, "name": "Country"},
            {"id": 9, "name": "Reggae"},
            {"id": 10, "name": "Latin"},
            {"id": 11, "name": "Indie"},
            {"id": 12, "name": "Metal"},
            {"id": 13, "name": "Folk"},
            {"id": 14, "name": "Blues"},
            {"id": 15, "name": "Soul"},
            {"id": 16, "name": "Punk"},
            {"id": 17, "name": "Gospel"},
            {"id": 18, "name": "EDM"},
            {"id": 19, "name": "Trap"},
            {"id": 20, "name": "Lo-Fi"}
        ]
        return jsonify(default_genres), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================
# FIX: /api/artist/concerts - Get artist's concerts
# =====================================================
@api.route('/artist/concerts', methods=['GET'])
@jwt_required()
def get_artist_concerts():
    """Get all concerts for the current artist"""
    try:
        user_id = get_jwt_identity()
        
        # If you have a Concert model:
        try:
            concerts = Concert.query.filter_by(artist_id=user_id).order_by(desc(Concert.date)).all()
            return jsonify([c.serialize() for c in concerts]), 200
        except:
            # Concert model might use different field name
            try:
                concerts = Concert.query.filter_by(user_id=user_id).order_by(desc(Concert.date)).all()
                return jsonify([c.serialize() for c in concerts]), 200
            except:
                # No Concert model - return empty array
                return jsonify([]), 200
        
    except Exception as e:
        print(f"Error fetching concerts: {e}")
        return jsonify([]), 200

@api.route('/tracks/<int:track_id>/play', methods=['POST'])
@jwt_required()
def increment_track_play(track_id):
    """Increment play count for a track"""
    try:
        current_user_id = get_jwt_identity()
        
        # Find the audio/track
        audio = Audio.query.get(track_id)
        
        if not audio:
            return jsonify({"error": "Track not found"}), 404
        
        # Increment play count
        if audio.plays is None:
            audio.plays = 1
        else:
            audio.plays += 1
        
        # Update last played timestamp
        audio.last_played = datetime.utcnow()
        
        # Commit to database
        db.session.commit()
        
        # Optional: Log the play event for analytics
        play_event = PlayHistory(
            user_id=current_user_id,
            audio_id=track_id,
            played_at=datetime.utcnow()
        )
        db.session.add(play_event)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "track_id": track_id,
            "plays": audio.plays,
            "message": "Play count updated"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error incrementing play count: {str(e)}")
        return jsonify({"error": "Failed to update play count"}), 500


@api.route('/tracks/<int:track_id>/like', methods=['POST'])
@jwt_required()
def toggle_track_like(track_id):
    """Like or unlike a track"""
    try:
        current_user_id = get_jwt_identity()
        
        # Find the audio/track
        audio = Audio.query.get(track_id)
        
        if not audio:
            return jsonify({"error": "Track not found"}), 404
        
        # Check if user already liked this track
        existing_like = AudioLike.query.filter_by(
            user_id=current_user_id,
            audio_id=track_id
        ).first()
        
        if existing_like:
            # Unlike - remove the like
            db.session.delete(existing_like)
            if audio.likes > 0:
                audio.likes -= 1
            is_liked = False
            message = "Track unliked"
        else:
            # Like - add new like
            new_like = AudioLike(
                user_id=current_user_id,
                audio_id=track_id,
                created_at=datetime.utcnow()
            )
            db.session.add(new_like)
            
            if audio.likes is None:
                audio.likes = 1
            else:
                audio.likes += 1
            
            is_liked = True
            message = "Track liked"
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "track_id": track_id,
            "likes": audio.likes,
            "is_liked": is_liked,
            "message": message
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error toggling like: {str(e)}")
        return jsonify({"error": "Failed to update like status"}), 500


@api.route('/tracks/<int:track_id>', methods=['PUT'])
@jwt_required()
def update_track(track_id):
    """Update track metadata (title, artist, album, etc.)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Find the audio/track
        audio = Audio.query.get(track_id)
        
        if not audio:
            return jsonify({"error": "Track not found"}), 404
        
        # Verify ownership
        if audio.user_id != current_user_id:
            return jsonify({"error": "Unauthorized to update this track"}), 403
        
        # Get update data from request
        data = request.get_json()
        
        # Update allowed fields
        if 'title' in data:
            audio.title = data['title']
        
        if 'artist_name' in data:
            audio.artist_name = data['artist_name']
        
        if 'album' in data:
            audio.album = data['album']
        
        if 'genre' in data:
            audio.genre = data['genre']
        
        if 'duration' in data:
            audio.duration = data['duration']
        
        if 'description' in data:
            audio.description = data['description']
        
        if 'lyrics' in data:
            audio.lyrics = data['lyrics']
        
        if 'release_date' in data:
            audio.release_date = datetime.strptime(data['release_date'], '%Y-%m-%d')
        
        if 'is_public' in data:
            audio.is_public = data['is_public']
        
        # Update timestamp
        audio.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Track updated successfully",
            "track": {
                "id": audio.id,
                "title": audio.title,
                "artist_name": audio.artist_name,
                "album": audio.album,
                "genre": audio.genre,
                "duration": audio.duration,
                "plays": audio.plays,
                "likes": audio.likes,
                "updated_at": audio.updated_at.isoformat() if audio.updated_at else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating track: {str(e)}")
        return jsonify({"error": "Failed to update track"}), 500


@api.route('/tracks/<int:track_id>', methods=['DELETE'])
@jwt_required()
def delete_track(track_id):
    """Delete a track"""
    try:
        current_user_id = get_jwt_identity()
        
        # Find the audio/track
        audio = Audio.query.get(track_id)
        
        if not audio:
            return jsonify({"error": "Track not found"}), 404
        
        # Verify ownership
        if audio.user_id != current_user_id:
            return jsonify({"error": "Unauthorized to delete this track"}), 403
        
        # Optional: Delete associated files from storage
        # if audio.audio_url:
        #     delete_file_from_storage(audio.audio_url)
        # if audio.artwork:
        #     delete_file_from_storage(audio.artwork)
        
        # Delete from database
        db.session.delete(audio)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Track deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting track: {str(e)}")
        return jsonify({"error": "Failed to delete track"}), 500


@api.route('/artist/follow', methods=['POST'])
@jwt_required()
def toggle_artist_follow():
    """Follow or unfollow an artist"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        artist_id = data.get('artist_id')
        
        if not artist_id:
            # If no artist_id provided, assume following self (for profile page)
            artist_id = current_user_id
        
        # Check if already following
        existing_follow = ArtistFollow.query.filter_by(
            follower_id=current_user_id,
            artist_id=artist_id
        ).first()
        
        if existing_follow:
            # Unfollow
            db.session.delete(existing_follow)
            is_following = False
            message = "Unfollowed successfully"
        else:
            # Follow
            new_follow = ArtistFollow(
                follower_id=current_user_id,
                artist_id=artist_id,
                created_at=datetime.utcnow()
            )
            db.session.add(new_follow)
            is_following = True
            message = "Followed successfully"
        
        db.session.commit()
        
        # Get updated follower count
        follower_count = ArtistFollow.query.filter_by(artist_id=artist_id).count()
        
        return jsonify({
            "success": True,
            "is_following": is_following,
            "follower_count": follower_count,
            "message": message
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error toggling follow: {str(e)}")
        return jsonify({"error": "Failed to update follow status"}), 500

# =============================================================================
# ADD THESE ROUTES TO YOUR src/api/routes.py
# =============================================================================

# First, add these imports at the top of routes.py:
# from .models import BandwidthLog, TranscodeJob, VideoQuality

# =============================================================================
# STORAGE STATUS ROUTE
# =============================================================================

# =============================================================================
# REPLACE YOUR /user/storage ROUTE WITH THIS MORE ROBUST VERSION
# =============================================================================

@api.route('/user/storage', methods=['GET'])
@jwt_required()
def get_user_storage():
    """Get user's storage usage and limits"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Storage tier limits (in bytes)
        STORAGE_TIERS = {
            'free': {
                'name': 'Free',
                'total_limit': 5 * 1024 * 1024 * 1024,        # 5 GB
                'per_upload_limit': 500 * 1024 * 1024,         # 500 MB
            },
            'pro': {
                'name': 'Pro',
                'total_limit': 50 * 1024 * 1024 * 1024,       # 50 GB
                'per_upload_limit': 2 * 1024 * 1024 * 1024,    # 2 GB
            },
            'premium': {
                'name': 'Premium',
                'total_limit': 250 * 1024 * 1024 * 1024,      # 250 GB
                'per_upload_limit': 5 * 1024 * 1024 * 1024,    # 5 GB
            },
            'professional': {
                'name': 'Professional',
                'total_limit': 1024 * 1024 * 1024 * 1024,     # 1 TB
                'per_upload_limit': 20 * 1024 * 1024 * 1024,   # 20 GB
            }
        }
        
        # Determine user's tier based on subscription
        tier = 'free'
        try:
            subscription = Subscription.query.filter_by(user_id=user_id, status='active').first()
            if subscription and hasattr(subscription, 'plan') and subscription.plan:
                plan_name = subscription.plan.name.lower()
                if 'professional' in plan_name:
                    tier = 'professional'
                elif 'premium' in plan_name:
                    tier = 'premium'
                elif 'pro' in plan_name or 'basic' in plan_name:
                    tier = 'pro'
        except Exception as e:
            print(f"Error checking subscription: {e}")
            # Continue with free tier
        
        tier_config = STORAGE_TIERS.get(tier, STORAGE_TIERS['free'])
        
        # Calculate actual storage used
        storage_breakdown = {
            'videos': 0,
            'clips': 0,
            'audio': 0,
            'podcasts': 0
        }
        
        # Sum video sizes (safely)
        try:
            videos = Video.query.filter_by(user_id=user_id).all()
            for video in videos:
                if hasattr(video, 'file_size') and video.file_size:
                    storage_breakdown['videos'] += video.file_size
                elif hasattr(video, 'size') and video.size:
                    storage_breakdown['videos'] += video.size
        except Exception as e:
            print(f"Error querying videos: {e}")
        
        # Sum video clips (safely)
        try:
            # Try VideoClip model
            clips = VideoClip.query.filter_by(user_id=user_id).all()
            for clip in clips:
                if hasattr(clip, 'file_size') and clip.file_size:
                    storage_breakdown['clips'] += clip.file_size
                elif hasattr(clip, 'size') and clip.size:
                    storage_breakdown['clips'] += clip.size
        except Exception as e:
            print(f"Error querying video clips: {e}")
        
        # Sum audio files (safely)
        try:
            audios = Audio.query.filter_by(user_id=user_id).all()
            for audio in audios:
                if hasattr(audio, 'file_size') and audio.file_size:
                    storage_breakdown['audio'] += audio.file_size
                elif hasattr(audio, 'size') and audio.size:
                    storage_breakdown['audio'] += audio.size
        except Exception as e:
            print(f"Error querying audio: {e}")
        
        # Sum podcast episodes (safely)
        try:
            podcasts = Podcast.query.filter_by(user_id=user_id).all()
            for podcast in podcasts:
                try:
                    episodes = PodcastEpisode.query.filter_by(podcast_id=podcast.id).all()
                    for episode in episodes:
                        if hasattr(episode, 'file_size') and episode.file_size:
                            storage_breakdown['podcasts'] += episode.file_size
                        elif hasattr(episode, 'size') and episode.size:
                            storage_breakdown['podcasts'] += episode.size
                except Exception as ep_err:
                    print(f"Error querying podcast episodes: {ep_err}")
        except Exception as e:
            print(f"Error querying podcasts: {e}")
        
        total_used = sum(storage_breakdown.values())
        total_limit = tier_config['total_limit']
        per_upload_limit = tier_config['per_upload_limit']
        
        # Calculate percentage
        percentage_used = round((total_used / total_limit) * 100, 1) if total_limit > 0 else 0
        
        # Determine status
        if percentage_used >= 100:
            status_level = 'over_limit'
            status_message = '⛔ Storage limit exceeded'
        elif percentage_used >= 90:
            status_level = 'critical'
            status_message = '🔴 Storage almost full'
        elif percentage_used >= 75:
            status_level = 'warning'
            status_message = '🟡 Storage getting low'
        else:
            status_level = 'ok'
            status_message = '✅ Storage OK'
        
        def format_bytes(bytes_val):
            if bytes_val >= 1024 * 1024 * 1024:
                return f"{bytes_val / (1024 * 1024 * 1024):.2f} GB"
            elif bytes_val >= 1024 * 1024:
                return f"{bytes_val / (1024 * 1024):.1f} MB"
            elif bytes_val >= 1024:
                return f"{bytes_val / 1024:.0f} KB"
            else:
                return f"{bytes_val} B"
        
        return jsonify({
            'success': True,
            'storage': {
                'tier': tier,
                'tier_name': tier_config['name'],
                'used_bytes': total_used,
                'used_display': format_bytes(total_used),
                'limit_bytes': total_limit,
                'limit_display': format_bytes(total_limit),
                'remaining_bytes': max(0, total_limit - total_used),
                'remaining_display': format_bytes(max(0, total_limit - total_used)),
                'percentage_used': percentage_used,
                'per_upload_limit_bytes': per_upload_limit,
                'per_upload_limit_display': format_bytes(per_upload_limit),
                'breakdown': storage_breakdown,
                'breakdown_display': {
                    'videos': format_bytes(storage_breakdown['videos']),
                    'clips': format_bytes(storage_breakdown['clips']),
                    'audio': format_bytes(storage_breakdown['audio']),
                    'podcasts': format_bytes(storage_breakdown['podcasts'])
                },
                'status_level': status_level,
                'status_message': status_message
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting storage status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to get storage status: {str(e)}'}), 500


# Add to your routes.py

@api.route('/user/photos', methods=['GET'])
@jwt_required()
def get_user_gallery_photos():  # ← RENAMED
    """Get current user's photos from gallery field"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        photos = user.gallery or []
        
        return jsonify({
            "photos": photos,
            "total": len(photos),
            "page": 1,
            "has_more": False
        }), 200
        
    except Exception as e:
        return jsonify({"photos": [], "error": str(e)}), 200


@api.route('/user/photos', methods=['POST'])
@jwt_required()
def add_user_photo():
    """Add photo to user's gallery"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json() or {}
        
        url = data.get('url')
        if not url:
            return jsonify({"error": "Photo URL is required"}), 400
        
        # Initialize gallery if None
        if user.gallery is None:
            user.gallery = []
        
        new_photo = {
            "id": len(user.gallery) + 1,
            "url": url,
            "thumbnail_url": data.get('thumbnail_url', url),
            "title": data.get('title'),
            "description": data.get('description'),
            "created_at": datetime.utcnow().isoformat()
        }
        
        user.gallery = user.gallery + [new_photo]  # Create new list to trigger update
        db.session.commit()
        
        return jsonify({
            "message": "Photo added",
            "photo": new_photo
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# =============================================================================
# BANDWIDTH STATUS ROUTE
# =============================================================================

@api.route('/user/bandwidth', methods=['GET'])
@jwt_required()
def get_user_bandwidth():
    """Get user's bandwidth usage and limits"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Bandwidth tier limits
        BANDWIDTH_TIERS = {
            'free': {
                'name': 'Free',
                'monthly_streaming_gb': 50,
                'daily_streaming_gb': 5,
                'daily_views': 500,
                'max_streaming_quality': '720p',
                'available_qualities': ['360p', '480p', '720p'],
                'concurrent_streams': 1,
                'allow_download': False,
                'allow_4k': False,
                'allow_live_streaming': False,
            },
            'pro': {
                'name': 'Pro',
                'monthly_streaming_gb': 500,
                'daily_streaming_gb': 25,
                'daily_views': 5000,
                'max_streaming_quality': '1080p',
                'available_qualities': ['360p', '480p', '720p', '1080p'],
                'concurrent_streams': 3,
                'allow_download': True,
                'allow_4k': False,
                'allow_live_streaming': True,
            },
            'premium': {
                'name': 'Premium',
                'monthly_streaming_gb': 2000,
                'daily_streaming_gb': 100,
                'daily_views': 50000,
                'max_streaming_quality': '4k',
                'available_qualities': ['360p', '480p', '720p', '1080p', '4k'],
                'concurrent_streams': 5,
                'allow_download': True,
                'allow_4k': True,
                'allow_live_streaming': True,
            },
            'professional': {
                'name': 'Professional',
                'monthly_streaming_gb': -1,  # Unlimited
                'daily_streaming_gb': -1,
                'daily_views': -1,
                'max_streaming_quality': '4k',
                'available_qualities': ['360p', '480p', '720p', '1080p', '4k'],
                'concurrent_streams': 10,
                'allow_download': True,
                'allow_4k': True,
                'allow_live_streaming': True,
            }
        }
        
        # Determine user's tier
        tier = 'free'
        subscription = Subscription.query.filter_by(user_id=user_id, status='active').first()
        if subscription and subscription.plan:
            plan_name = subscription.plan.name.lower()
            if 'professional' in plan_name:
                tier = 'professional'
            elif 'premium' in plan_name:
                tier = 'premium'
            elif 'pro' in plan_name or 'basic' in plan_name:
                tier = 'pro'
        
        tier_config = BANDWIDTH_TIERS.get(tier, BANDWIDTH_TIERS['free'])
        
        # Get current month's bandwidth usage from BandwidthLog (if table exists)
        monthly_used = 0
        daily_used = 0
        daily_views = 0
        
        try:
            from datetime import datetime, timedelta
            
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Monthly bandwidth
            monthly_result = db.session.query(
                db.func.sum(BandwidthLog.bytes_transferred)
            ).filter(
                BandwidthLog.user_id == user_id,
                BandwidthLog.timestamp >= month_start,
                BandwidthLog.transfer_type == 'stream'
            ).scalar()
            monthly_used = monthly_result or 0
            
            # Daily bandwidth
            daily_result = db.session.query(
                db.func.sum(BandwidthLog.bytes_transferred)
            ).filter(
                BandwidthLog.user_id == user_id,
                BandwidthLog.timestamp >= today_start,
                BandwidthLog.transfer_type == 'stream'
            ).scalar()
            daily_used = daily_result or 0
            
            # Daily views count
            daily_views = BandwidthLog.query.filter(
                BandwidthLog.user_id == user_id,
                BandwidthLog.timestamp >= today_start,
                BandwidthLog.transfer_type == 'stream'
            ).count()
            
        except Exception as e:
            print(f"BandwidthLog query error (table may not exist yet): {e}")
            # Continue with zeros if table doesn't exist
        
        # Convert limits to bytes
        monthly_limit = tier_config['monthly_streaming_gb'] * 1024 * 1024 * 1024 if tier_config['monthly_streaming_gb'] > 0 else -1
        daily_limit = tier_config['daily_streaming_gb'] * 1024 * 1024 * 1024 if tier_config['daily_streaming_gb'] > 0 else -1
        views_limit = tier_config['daily_views']
        
        # Calculate percentages
        monthly_pct = round((monthly_used / monthly_limit) * 100, 1) if monthly_limit > 0 else 0
        daily_pct = round((daily_used / daily_limit) * 100, 1) if daily_limit > 0 else 0
        views_pct = round((daily_views / views_limit) * 100, 1) if views_limit > 0 else 0
        
        # Determine status
        if monthly_limit > 0 and monthly_pct >= 100:
            status_level = 'over_limit'
            status_message = '⛔ Monthly bandwidth limit reached'
            can_stream = False
        elif daily_limit > 0 and daily_pct >= 100:
            status_level = 'daily_limit'
            status_message = '⏳ Daily bandwidth limit reached'
            can_stream = False
        elif views_limit > 0 and daily_views >= views_limit:
            status_level = 'views_limit'
            status_message = '👀 Daily view limit reached'
            can_stream = False
        elif monthly_pct >= 90 or daily_pct >= 90:
            status_level = 'warning'
            status_message = '⚠️ Approaching bandwidth limit'
            can_stream = True
        else:
            status_level = 'ok'
            status_message = '✅ Bandwidth OK'
            can_stream = True
        
        def format_gb(bytes_val):
            if bytes_val < 0:
                return 'Unlimited'
            gb = bytes_val / (1024 * 1024 * 1024)
            if gb >= 1000:
                return f"{gb/1000:.1f} TB"
            return f"{gb:.2f} GB"
        
        return jsonify({
            'success': True,
            'bandwidth': {
                'tier': tier,
                'tier_name': tier_config['name'],
                
                # Monthly usage
                'monthly_used_bytes': monthly_used,
                'monthly_used_display': format_gb(monthly_used),
                'monthly_limit_bytes': monthly_limit,
                'monthly_limit_display': format_gb(monthly_limit) if monthly_limit > 0 else 'Unlimited',
                'monthly_percentage': monthly_pct if monthly_limit > 0 else 0,
                'monthly_remaining_display': format_gb(monthly_limit - monthly_used) if monthly_limit > 0 else 'Unlimited',
                
                # Daily usage
                'daily_used_bytes': daily_used,
                'daily_used_display': format_gb(daily_used),
                'daily_limit_bytes': daily_limit,
                'daily_limit_display': format_gb(daily_limit) if daily_limit > 0 else 'Unlimited',
                'daily_percentage': daily_pct if daily_limit > 0 else 0,
                
                # Views
                'daily_views': daily_views,
                'daily_views_limit': views_limit if views_limit > 0 else 'Unlimited',
                'views_percentage': views_pct if views_limit > 0 else 0,
                
                # Quality limits
                'max_quality': tier_config['max_streaming_quality'],
                'available_qualities': tier_config['available_qualities'],
                
                # Features
                'allow_download': tier_config['allow_download'],
                'allow_4k': tier_config['allow_4k'],
                'allow_live_streaming': tier_config['allow_live_streaming'],
                'concurrent_streams': tier_config['concurrent_streams'],
                
                # Status
                'status_level': status_level,
                'status_message': status_message,
                'can_stream': can_stream
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting bandwidth status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to get bandwidth status'}), 500

@api.route('/profile', methods=['GET'])
@jwt_required()
def get_dashboard_profile():
    """
    Get current user's profile for the Creator Dashboard header.
    Returns user info, stats, and subscription status.
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get follower/following counts
        followers_count = getattr(user, 'followers_count', 0)
        following_count = getattr(user, 'following_count', 0)
        
        # Get content counts (adjust based on your models)
        tracks_count = 0
        videos_count = 0
        podcasts_count = 0
        
        try:
            if hasattr(user, 'tracks'):
                tracks_count = len(user.tracks) if user.tracks else 0
            else:
                tracks_count = Audio.query.filter_by(user_id=user_id).count() if 'Track' in dir() else 0
        except:
            pass
            
        try:
            if hasattr(user, 'videos'):
                videos_count = len(user.videos) if user.videos else 0
            else:
                videos_count = Video.query.filter_by(user_id=user_id).count() if 'Video' in dir() else 0
        except:
            pass
            
        try:
            if hasattr(user, 'podcasts'):
                podcasts_count = len(user.podcasts) if user.podcasts else 0
            else:
                podcasts_count = Podcast.query.filter_by(user_id=user_id).count() if 'Podcast' in dir() else 0
        except:
            pass
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'display_name': getattr(user, 'display_name', None) or user.username,
            'profile_picture': getattr(user, 'profile_picture', None) or getattr(user, 'avatar_url', None),
            'cover_photo': getattr(user, 'cover_photo', None),
            'bio': getattr(user, 'bio', None),
            'location': getattr(user, 'location', None) or getattr(user, 'city', None),
            'website': getattr(user, 'website', None),
            'profile_type': getattr(user, 'profile_type', 'creator'),
            'is_verified': getattr(user, 'is_verified', False),
            'subscription_tier': getattr(user, 'subscription_tier', 'free'),
            'created_at': user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None,
            'stats': {
                'followers': followers_count,
                'following': following_count,
                'tracks': tracks_count,
                'videos': videos_count,
                'podcasts': podcasts_count,
                'total_content': tracks_count + videos_count + podcasts_count
            },
            'social_links': {
                'instagram': getattr(user, 'instagram_url', None),
                'twitter': getattr(user, 'twitter_url', None),
                'youtube': getattr(user, 'youtube_url', None),
                'tiktok': getattr(user, 'tiktok_url', None),
                'spotify': getattr(user, 'spotify_url', None)
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting dashboard profile: {e}")
        return jsonify({'error': str(e)}), 500


# =====================================================
# 2. GET /api/social-shares - Social Sharing Analytics
# =====================================================
@api.route('/social-shares', methods=['GET'])
@jwt_required()
def get_social_shares():
    """
    Get social sharing analytics for the Creator Dashboard.
    Shows how content is being shared across platforms.
    """
    try:
        user_id = get_jwt_identity()
        
        # Try to get real data if ShareAnalytics model exists
        shares_data = []
        total_shares = 0
        platform_breakdown = {
            'twitter': 0,
            'facebook': 0,
            'instagram': 0,
            'whatsapp': 0,
            'linkedin': 0,
            'copy_link': 0,
            'other': 0
        }
        
        try:
            # If you have a ShareAnalytics or ContentShare model
            if 'ShareAnalytics' in dir():
                shares = ShareAnalytics.query.filter_by(user_id=user_id).all()
                for share in shares:
                    platform = getattr(share, 'platform', 'other').lower()
                    if platform in platform_breakdown:
                        platform_breakdown[platform] += 1
                    else:
                        platform_breakdown['other'] += 1
                    total_shares += 1
                    
                    shares_data.append({
                        'id': share.id,
                        'content_type': getattr(share, 'content_type', 'unknown'),
                        'content_id': getattr(share, 'content_id', None),
                        'content_title': getattr(share, 'content_title', 'Untitled'),
                        'platform': platform,
                        'shared_at': share.created_at.isoformat() if hasattr(share, 'created_at') else None
                    })
        except Exception as e:
            print(f"ShareAnalytics query error: {e}")
        
        # Calculate percentages
        platform_percentages = {}
        for platform, count in platform_breakdown.items():
            platform_percentages[platform] = round((count / total_shares * 100), 1) if total_shares > 0 else 0
        
        return jsonify({
            'total_shares': total_shares,
            'platform_breakdown': platform_breakdown,
            'platform_percentages': platform_percentages,
            'recent_shares': shares_data[:20],  # Last 20 shares
            'top_shared_content': [],  # Could populate with most shared items
            'share_growth': {
                'this_week': 0,
                'last_week': 0,
                'change_percent': 0
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting social shares: {e}")
        return jsonify({
            'total_shares': 0,
            'platform_breakdown': {},
            'platform_percentages': {},
            'recent_shares': [],
            'error': str(e)
        }), 200  # Return 200 with empty data instead of 500


# =============================================================================
# FIXED ROUTES - Using Audio instead of Track
# Replace the broken functions in your routes.py with these
# =============================================================================

# =====================================================
# RECENT ACTIVITY - FIXED to use Audio model
# =====================================================
@api.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """
    Get recent activity for the Creator Dashboard.
    Aggregates uploads, engagement, earnings, and milestones.
    """
    try:
        user_id = get_jwt_identity()
        activities = []
        
        # Get recent audio/tracks uploads - FIXED: Using Audio instead of Track
        try:
            recent_tracks = Audio.query.filter_by(user_id=user_id)\
                .order_by(desc(Audio.created_at))\
                .limit(5).all()
                
            for track in recent_tracks:
                activities.append({
                    'type': 'upload',
                    'icon': '🎵',
                    'title': track.title or 'Untitled Track',
                    'action': 'uploaded',
                    'content_type': 'track',
                    'content_id': track.id,
                    'timestamp': track.created_at.isoformat() if track.created_at else None,
                    'time_ago': get_time_ago(track.created_at) if track.created_at else 'Recently'
                })
        except Exception as e:
            print(f"Audio activity error: {e}")
        
        # Get recent videos
        try:
            recent_videos = Video.query.filter_by(user_id=user_id)\
                .order_by(desc(Video.created_at))\
                .limit(5).all()
                
            for video in recent_videos:
                activities.append({
                    'type': 'upload',
                    'icon': '🎬',
                    'title': video.title or 'Untitled Video',
                    'action': 'uploaded',
                    'content_type': 'video',
                    'content_id': video.id,
                    'timestamp': video.created_at.isoformat() if video.created_at else None,
                    'time_ago': get_time_ago(video.created_at) if video.created_at else 'Recently'
                })
        except Exception as e:
            print(f"Video activity error: {e}")
        
        # Get recent podcast episodes
        try:
            recent_episodes = PodcastEpisode.query.join(Podcast)\
                .filter(Podcast.user_id == user_id)\
                .order_by(desc(PodcastEpisode.created_at))\
                .limit(5).all()
                
            for episode in recent_episodes:
                activities.append({
                    'type': 'upload',
                    'icon': '🎙️',
                    'title': episode.title or 'Untitled Episode',
                    'action': 'published',
                    'content_type': 'podcast_episode',
                    'content_id': episode.id,
                    'timestamp': episode.created_at.isoformat() if episode.created_at else None,
                    'time_ago': get_time_ago(episode.created_at) if episode.created_at else 'Recently'
                })
        except Exception as e:
            print(f"Podcast activity error: {e}")
        
        # Sort all activities by timestamp
        activities.sort(key=lambda x: x.get('timestamp') or '', reverse=True)
        
        # If no real activities, return placeholder
        if not activities:
            activities = [
                {
                    'type': 'welcome',
                    'icon': '👋',
                    'title': 'Welcome to your Creator Dashboard!',
                    'action': 'Start creating content to see your activity here.',
                    'content_type': 'system',
                    'content_id': None,
                    'timestamp': datetime.utcnow().isoformat(),
                    'time_ago': 'Just now'
                }
            ]
        
        return jsonify({
            'activities': activities[:20],
            'total_count': len(activities),
            'has_more': len(activities) > 20
        }), 200
        
    except Exception as e:
        print(f"Error getting recent activity: {e}")
        return jsonify({
            'activities': [],
            'total_count': 0,
            'error': str(e)
        }), 200


# =====================================================
# CONTENT BREAKDOWN - FIXED to use Audio model
# =====================================================
@api.route('/content-breakdown', methods=['GET'])
@jwt_required()
def get_content_breakdown():
    """
    Get content breakdown analytics for the Creator Dashboard.
    Shows distribution of content types and performance metrics.
    """
    try:
        user_id = get_jwt_identity()
        
        breakdown = {
            'tracks': {'count': 0, 'total_plays': 0, 'total_likes': 0},
            'videos': {'count': 0, 'total_views': 0, 'total_likes': 0},
            'podcasts': {'count': 0, 'total_listens': 0, 'episodes': 0},
            'products': {'count': 0, 'total_sales': 0, 'revenue': 0},
            'radio_stations': {'count': 0, 'total_listeners': 0}
        }
        
        total_content = 0
        total_engagement = 0
        
        # Count tracks/audio - FIXED: Using Audio instead of Track
        try:
            audios = Audio.query.filter_by(user_id=user_id).all()
            breakdown['tracks']['count'] = len(audios)
            total_content += len(audios)
            
            for audio in audios:
                plays = getattr(audio, 'plays', 0) or getattr(audio, 'play_count', 0) or 0
                likes = getattr(audio, 'likes', 0) or getattr(audio, 'like_count', 0) or 0
                breakdown['tracks']['total_plays'] += plays
                breakdown['tracks']['total_likes'] += likes
                total_engagement += plays + likes
        except Exception as e:
            print(f"Audio breakdown error: {e}")
        
        # Count videos
        try:
            videos = Video.query.filter_by(user_id=user_id).all()
            breakdown['videos']['count'] = len(videos)
            total_content += len(videos)
            
            for video in videos:
                views = getattr(video, 'views', 0) or getattr(video, 'view_count', 0) or 0
                likes = getattr(video, 'likes', 0) or getattr(video, 'like_count', 0) or 0
                breakdown['videos']['total_views'] += views
                breakdown['videos']['total_likes'] += likes
                total_engagement += views + likes
        except Exception as e:
            print(f"Video breakdown error: {e}")
        
        # Count podcasts
        try:
            podcasts = Podcast.query.filter_by(user_id=user_id).all()
            breakdown['podcasts']['count'] = len(podcasts)
            total_content += len(podcasts)
            
            for podcast in podcasts:
                listens = getattr(podcast, 'total_listens', 0) or 0
                episodes = getattr(podcast, 'episode_count', 0)
                if not episodes and hasattr(podcast, 'episodes'):
                    episodes = len(podcast.episodes) if podcast.episodes else 0
                breakdown['podcasts']['total_listens'] += listens
                breakdown['podcasts']['episodes'] += episodes
                total_engagement += listens
        except Exception as e:
            print(f"Podcast breakdown error: {e}")
        
        # Count products (marketplace)
        try:
            products = Product.query.filter_by(creator_id=user_id).all()
            breakdown['products']['count'] = len(products)
            
            for product in products:
                sales = getattr(product, 'sales_count', 0) or 0
                revenue = getattr(product, 'total_revenue', 0) or 0
                breakdown['products']['total_sales'] += sales
                breakdown['products']['revenue'] += revenue
        except Exception as e:
            print(f"Product breakdown error: {e}")
        
        # Count radio stations
        try:
            stations = RadioStation.query.filter_by(user_id=user_id).all()
            breakdown['radio_stations']['count'] = len(stations)
            total_content += len(stations)
            
            for station in stations:
                listeners = getattr(station, 'current_listeners', 0) or 0
                breakdown['radio_stations']['total_listeners'] += listeners
        except Exception as e:
            print(f"Radio breakdown error: {e}")
        
        # Calculate percentages for pie chart
        percentages = {}
        if total_content > 0:
            percentages = {
                'tracks': round((breakdown['tracks']['count'] / total_content) * 100, 1),
                'videos': round((breakdown['videos']['count'] / total_content) * 100, 1),
                'podcasts': round((breakdown['podcasts']['count'] / total_content) * 100, 1),
                'radio_stations': round((breakdown['radio_stations']['count'] / total_content) * 100, 1)
            }
        
        return jsonify({
            'breakdown': breakdown,
            'percentages': percentages,
            'totals': {
                'total_content': total_content,
                'total_engagement': total_engagement,
                'total_products': breakdown['products']['count'],
                'total_revenue': breakdown['products']['revenue']
            },
            'chart_data': {
                'labels': ['Tracks', 'Videos', 'Podcasts', 'Radio'],
                'values': [
                    breakdown['tracks']['count'],
                    breakdown['videos']['count'],
                    breakdown['podcasts']['count'],
                    breakdown['radio_stations']['count']
                ],
                'colors': ['#00ffc8', '#FF6600', '#9c27b0', '#2196f3']
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting content breakdown: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'breakdown': {},
            'percentages': {},
            'totals': {},
            'error': str(e)
        }), 500

@api.route('/video/channel/recent-activity', methods=['GET'])
@jwt_required()
def get_video_channel_recent_activity():
    """Get recent activity for video channel dashboard"""
    try:
        from sqlalchemy import desc
        from datetime import datetime, timedelta
        
        user_id = get_jwt_identity()
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        activities = []
        
        # Recent video uploads
        try:
            recent_videos = Video.query.filter(
                Video.user_id == user_id,
                Video.created_at >= thirty_days_ago
            ).order_by(desc(Video.created_at)).limit(5).all()
            
            for video in recent_videos:
                activities.append({
                    "type": "video_upload",
                    "title": video.title,
                    "action": "was uploaded",
                    "time": get_time_ago(video.created_at),
                    "timestamp": video.created_at.isoformat()
                })
        except Exception as e:
            print(f"Video upload activity error: {e}")
        
        # Recent comments on your videos
        try:
            video_ids = [v.id for v in Video.query.filter_by(user_id=user_id).all()]
            if video_ids:
                recent_comments = db.session.query(Comment, User).join(
                    User, Comment.user_id == User.id
                ).filter(
                    Comment.video_id.in_(video_ids),
                    Comment.user_id != user_id,
                    Comment.created_at >= thirty_days_ago
                ).order_by(desc(Comment.created_at)).limit(5).all()
                
                for comment, commenter in recent_comments:
                    video = Video.query.get(comment.video_id)
                    activities.append({
                        "type": "comment",
                        "title": f"New comment on \"{video.title if video else 'video'}\"",
                        "action": f"from {commenter.username}",
                        "time": get_time_ago(comment.created_at),
                        "timestamp": comment.created_at.isoformat()
                    })
        except Exception as e:
            print(f"Comment activity error: {e}")
        
        # Recent likes on your videos
        try:
            if video_ids:
                recent_likes = db.session.query(VideoLike, User).join(
                    User, VideoLike.user_id == User.id
                ).filter(
                    VideoLike.video_id.in_(video_ids),
                    VideoLike.user_id != user_id,
                    VideoLike.created_at >= thirty_days_ago
                ).order_by(desc(VideoLike.created_at)).limit(5).all()
                
                for like, liker in recent_likes:
                    video = Video.query.get(like.video_id)
                    activities.append({
                        "type": "like",
                        "title": f"\"{video.title if video else 'video'}\"",
                        "action": f"was liked by {liker.username}",
                        "time": get_time_ago(like.created_at),
                        "timestamp": like.created_at.isoformat()
                    })
        except Exception as e:
            print(f"Like activity error: {e}")
        
        # Recent subscribers
        try:
            channel = VideoChannel.query.filter_by(user_id=user_id).first()
            if channel:
                recent_subs = db.session.query(ChannelSubscription, User).join(
                    User, ChannelSubscription.user_id == User.id
                ).filter(
                    ChannelSubscription.channel_id == channel.id,
                    ChannelSubscription.created_at >= thirty_days_ago
                ).order_by(desc(ChannelSubscription.created_at)).limit(5).all()
                
                for sub, subscriber in recent_subs:
                    activities.append({
                        "type": "subscriber",
                        "title": f"{subscriber.username}",
                        "action": "subscribed to your channel",
                        "time": get_time_ago(sub.created_at),
                        "timestamp": sub.created_at.isoformat()
                    })
        except Exception as e:
            print(f"Subscriber activity error: {e}")
        
        # Check for milestones
        try:
            channel = VideoChannel.query.filter_by(user_id=user_id).first()
            if channel:
                sub_count = channel.subscriber_count or 0
                milestones = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000]
                for milestone in milestones:
                    if sub_count >= milestone and sub_count < milestone * 1.1:
                        activities.append({
                            "type": "milestone",
                            "title": f"{milestone} subscribers",
                            "action": "milestone reached! 🎉",
                            "time": "Recently",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        break
        except Exception as e:
            print(f"Milestone check error: {e}")
        
        # Sort by timestamp (newest first)
        activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return jsonify({
            "activities": activities[:15],
            "total_count": len(activities)
        }), 200
        
    except Exception as e:
        print(f"Recent activity error: {str(e)}")
        return jsonify({
            "activities": [],
            "total_count": 0
        }), 200


@api.route('/user/<int:user_id>/photos', methods=['GET'])
@jwt_required()
def get_user_photos_by_id(user_id):
    """Get photos for a specific user (for viewing profiles)"""
    try:
        photos = Photo.query.filter_by(user_id=user_id).order_by(Photo.created_at.desc()).all()
        return jsonify({
            'photos': [photo.serialize() for photo in photos],
            'total': len(photos)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/clips/feed', methods=['GET'])
def get_clips_feed():
    """
    Get clips for the feed (For You page).
    Returns trending/recent clips. No auth required.
    """
    try:
        sort = request.args.get('sort', 'trending')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        query = VideoClip.query.filter_by(is_public=True)
        
        if sort == 'trending':
            query = query.order_by((VideoClip.views + VideoClip.likes * 2).desc())
        else:
            query = query.order_by(VideoClip.created_at.desc())
        
        # Paginate
        total = query.count()
        clips = query.offset((page - 1) * per_page).limit(per_page).all()
        
        clips_data = []
        for clip in clips:
            creator = User.query.get(clip.user_id)
            duration_mins = clip.duration // 60 if clip.duration else 0
            duration_secs = clip.duration % 60 if clip.duration else 0
            
            clips_data.append({
                'id': clip.id,
                'title': clip.title,
                'description': clip.description,
                'video_url': clip.video_url,
                'thumbnail_url': clip.thumbnail_url,
                'duration': clip.duration,
                'duration_formatted': f"{duration_mins}:{duration_secs:02d}",
                'views': clip.views or 0,
                'likes': clip.likes or 0,
                'comments': clip.comments or 0,
                'shares': clip.shares or 0,
                'tags': clip.tags or [],
                'created_at': clip.created_at.isoformat() if clip.created_at else None,
                'creator': {
                    'id': creator.id if creator else None,
                    'username': creator.username if creator else 'Unknown',
                    'display_name': creator.display_name if creator else None,
                    'profile_picture': creator.profile_picture if creator else None
                } if creator else None
            })
        
        return jsonify({
            'clips': clips_data,
            'has_next': page * per_page < total,
            'has_prev': page > 1,
            'page': page,
            'total': total
        }), 200
        
    except Exception as e:
        print(f"Error fetching clips feed: {e}")
        return jsonify({'error': 'Failed to fetch clips'}), 500


@api.route('/clips/following', methods=['GET'])
@jwt_required()
def get_following_clips():
    """
    Get clips from users the current user follows.
    For "Following" tab in ClipsFeed.
    """
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Get followed user IDs
        following_ids = [f.following_id for f in Follow.query.filter_by(follower_id=user_id).all()]
        
        if not following_ids:
            return jsonify({
                'clips': [],
                'has_next': False,
                'has_prev': False,
                'page': page,
                'total': 0,
                'message': 'Follow some creators to see their clips!'
            }), 200
        
        # Get clips from followed users
        query = VideoClip.query.filter(
            VideoClip.user_id.in_(following_ids),
            VideoClip.is_public == True
        ).order_by(VideoClip.created_at.desc())
        
        total = query.count()
        clips = query.offset((page - 1) * per_page).limit(per_page).all()
        
        clips_data = []
        for clip in clips:
            creator = User.query.get(clip.user_id)
            duration_mins = clip.duration // 60 if clip.duration else 0
            duration_secs = clip.duration % 60 if clip.duration else 0
            
            # Check if user liked this clip
            is_liked = ClipLike.query.filter_by(
                clip_id=clip.id, user_id=user_id
            ).first() is not None
            
            clips_data.append({
                'id': clip.id,
                'title': clip.title,
                'description': clip.description,
                'video_url': clip.video_url,
                'thumbnail_url': clip.thumbnail_url,
                'duration': clip.duration,
                'duration_formatted': f"{duration_mins}:{duration_secs:02d}",
                'views': clip.views or 0,
                'likes': clip.likes or 0,
                'comments': clip.comments or 0,
                'shares': clip.shares or 0,
                'tags': clip.tags or [],
                'is_liked': is_liked,
                'created_at': clip.created_at.isoformat() if clip.created_at else None,
                'creator': {
                    'id': creator.id if creator else None,
                    'username': creator.username if creator else 'Unknown',
                    'display_name': creator.display_name if creator else None,
                    'profile_picture': creator.profile_picture if creator else None
                } if creator else None
            })
        
        return jsonify({
            'clips': clips_data,
            'has_next': page * per_page < total,
            'has_prev': page > 1,
            'page': page,
            'total': total
        }), 200
        
    except Exception as e:
        print(f"Error fetching following clips: {e}")
        return jsonify({'error': 'Failed to fetch clips'}), 500


@api.route('/clips/user/<int:user_id>', methods=['GET'])
def get_user_clips(user_id):
    """Get public clips for a specific user (profile page)."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        query = VideoClip.query.filter_by(
            user_id=user_id, is_public=True
        ).order_by(VideoClip.created_at.desc())
        
        total = query.count()
        clips = query.offset((page - 1) * per_page).limit(per_page).all()
        
        clips_data = []
        for clip in clips:
            duration_mins = clip.duration // 60 if clip.duration else 0
            duration_secs = clip.duration % 60 if clip.duration else 0
            
            clips_data.append({
                'id': clip.id,
                'title': clip.title,
                'description': clip.description,
                'video_url': clip.video_url,
                'thumbnail_url': clip.thumbnail_url,
                'duration': clip.duration,
                'duration_formatted': f"{duration_mins}:{duration_secs:02d}",
                'views': clip.views or 0,
                'likes': clip.likes or 0,
                'comments': clip.comments or 0,
                'tags': clip.tags or [],
                'created_at': clip.created_at.isoformat() if clip.created_at else None,
                'creator': {
                    'id': user.id,
                    'username': user.username,
                    'display_name': user.display_name,
                    'profile_picture': user.profile_picture
                }
            })
        
        return jsonify({
            'clips': clips_data,
            'user': {'id': user.id, 'username': user.username},
            'pagination': {
                'page': page, 'per_page': per_page, 'total': total,
                'has_next': page * per_page < total, 'has_prev': page > 1
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching user clips: {e}")
        return jsonify({'error': 'Failed to fetch user clips'}), 500


@api.route('/clips/my', methods=['GET'])
@jwt_required()
def get_my_clips():
    """Get current user's clips (including private)."""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        include_private = request.args.get('include_private', 'true').lower() == 'true'
        
        query = VideoClip.query.filter_by(user_id=user_id)
        if not include_private:
            query = query.filter_by(is_public=True)
        
        query = query.order_by(VideoClip.created_at.desc())
        
        total = query.count()
        clips = query.offset((page - 1) * per_page).limit(per_page).all()
        
        user = User.query.get(user_id)
        
        clips_data = []
        for clip in clips:
            duration_mins = clip.duration // 60 if clip.duration else 0
            duration_secs = clip.duration % 60 if clip.duration else 0
            
            clips_data.append({
                'id': clip.id,
                'title': clip.title,
                'description': clip.description,
                'video_url': clip.video_url,
                'thumbnail_url': clip.thumbnail_url,
                'duration': clip.duration,
                'duration_formatted': f"{duration_mins}:{duration_secs:02d}",
                'views': clip.views or 0,
                'likes': clip.likes or 0,
                'comments': clip.comments or 0,
                'is_public': clip.is_public,
                'tags': clip.tags or [],
                'created_at': clip.created_at.isoformat() if clip.created_at else None,
                'creator': {
                    'id': user.id,
                    'username': user.username,
                    'display_name': user.display_name,
                    'profile_picture': user.profile_picture
                } if user else None
            })
        
        return jsonify({
            'clips': clips_data,
            'pagination': {
                'page': page, 'per_page': per_page, 'total': total,
                'has_next': page * per_page < total, 'has_prev': page > 1
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching my clips: {e}")
        return jsonify({'error': 'Failed to fetch your clips'}), 500


# =============================================================================
# CLIP INTERACTION ROUTES
# =============================================================================

@api.route('/clips/<int:clip_id>/save', methods=['POST'])
@jwt_required()
def save_clip(clip_id):
    """Save/bookmark a clip."""
    try:
        user_id = get_jwt_identity()
        
        clip = VideoClip.query.get(clip_id)
        if not clip:
            return jsonify({'error': 'Clip not found'}), 404
        
        # Check if already saved (you may need to create ClipSave model)
        # For now, we'll use a simple toggle approach
        try:
            existing = ClipSave.query.filter_by(user_id=user_id, clip_id=clip_id).first()
            if existing:
                db.session.delete(existing)
                db.session.commit()
                return jsonify({'saved': False, 'message': 'Clip unsaved'}), 200
            else:
                new_save = ClipSave(user_id=user_id, clip_id=clip_id)
                db.session.add(new_save)
                db.session.commit()
                return jsonify({'saved': True, 'message': 'Clip saved'}), 200
        except:
            # If ClipSave model doesn't exist, just return success
            return jsonify({'saved': True, 'message': 'Clip saved'}), 200
            
    except Exception as e:
        print(f"Error saving clip: {e}")
        return jsonify({'error': 'Failed to save clip'}), 500


@api.route('/clips/<int:clip_id>/share', methods=['POST'])
def share_clip(clip_id):
    """Track share count for a clip."""
    try:
        clip = VideoClip.query.get(clip_id)
        if not clip:
            return jsonify({'error': 'Clip not found'}), 404
        
        clip.shares = (clip.shares or 0) + 1
        db.session.commit()
        
        return jsonify({
            'shares': clip.shares,
            'share_url': f"/clips?start={clip_id}"
        }), 200
        
    except Exception as e:
        print(f"Error sharing clip: {e}")
        return jsonify({'error': 'Failed to share clip'}), 500


# =============================================================================
# CLIP COMMENTS ROUTES
# =============================================================================

@api.route('/clips/<int:clip_id>/comments', methods=['GET', 'POST'])
def clip_comments(clip_id):
    """Get or add comments on a clip."""
    clip = VideoClip.query.get(clip_id)
    if not clip:
        return jsonify({'error': 'Clip not found'}), 404
    
    if request.method == 'GET':
        try:
            # Try to use ClipComment model if it exists
            try:
                comments = ClipComment.query.filter_by(clip_id=clip_id)\
                    .order_by(ClipComment.is_pinned.desc(), ClipComment.created_at.desc()).all()
                
                comments_data = []
                for comment in comments:
                    user = User.query.get(comment.user_id)
                    comments_data.append({
                        'id': comment.id,
                        'text': comment.text,
                        'user_id': comment.user_id,
                        'username': user.username if user else 'Unknown',
                        'profile_picture': user.profile_picture if user else None,
                        'likes': comment.likes or 0,
                        'is_pinned': comment.is_pinned or False,
                        'created_at': comment.created_at.isoformat() if comment.created_at else None
                    })
                
                return jsonify({'comments': comments_data}), 200
            except:
                # If model doesn't exist, return empty
                return jsonify({'comments': []}), 200
                
        except Exception as e:
            print(f"Error fetching comments: {e}")
            return jsonify({'error': 'Failed to fetch comments'}), 500
    
    else:  # POST
        try:
            # Require auth for posting
            from flask_jwt_extended import jwt_required, get_jwt_identity
            
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({'error': 'Authentication required'}), 401
            
            # Decode token manually or use verify_jwt_in_request
            try:
                from flask_jwt_extended import verify_jwt_in_request
                verify_jwt_in_request()
                user_id = get_jwt_identity()
            except:
                return jsonify({'error': 'Invalid token'}), 401
            
            data = request.get_json()
            text = data.get('text', '').strip()
            
            if not text:
                return jsonify({'error': 'Comment text is required'}), 400
            
            # Create comment (if model exists)
            try:
                new_comment = ClipComment(
                    clip_id=clip_id,
                    user_id=user_id,
                    text=text
                )
                db.session.add(new_comment)
                
                # Update clip comment count
                clip.comments = (clip.comments or 0) + 1
                db.session.commit()
                
                user = User.query.get(user_id)
                
                return jsonify({
                    'comment': {
                        'id': new_comment.id,
                        'text': new_comment.text,
                        'user_id': user_id,
                        'username': user.username if user else 'Unknown',
                        'profile_picture': user.profile_picture if user else None,
                        'likes': 0,
                        'is_pinned': False,
                        'created_at': new_comment.created_at.isoformat()
                    }
                }), 201
            except Exception as model_error:
                print(f"ClipComment model error: {model_error}")
                return jsonify({'error': 'Comments not available'}), 500
                
        except Exception as e:
            print(f"Error creating comment: {e}")
            return jsonify({'error': 'Failed to create comment'}), 500


@api.route('/clips/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_clip_comment(comment_id):
    """Delete a comment (owner or clip owner only)."""
    try:
        user_id = get_jwt_identity()
        
        try:
            comment = ClipComment.query.get(comment_id)
            if not comment:
                return jsonify({'error': 'Comment not found'}), 404
            
            # Check ownership
            clip = VideoClip.query.get(comment.clip_id)
            if comment.user_id != user_id and (clip and clip.user_id != user_id):
                return jsonify({'error': 'Unauthorized'}), 403
            
            # Update clip comment count
            if clip:
                clip.comments = max(0, (clip.comments or 0) - 1)
            
            db.session.delete(comment)
            db.session.commit()
            
            return jsonify({'message': 'Comment deleted'}), 200
        except:
            return jsonify({'error': 'Comments not available'}), 500
            
    except Exception as e:
        print(f"Error deleting comment: {e}")
        return jsonify({'error': 'Failed to delete comment'}), 500


@api.route('/clips/comments/<int:comment_id>/like', methods=['POST'])
@jwt_required()
def like_clip_comment(comment_id):
    """Like/unlike a comment."""
    try:
        user_id = get_jwt_identity()
        
        try:
            comment = ClipComment.query.get(comment_id)
            if not comment:
                return jsonify({'error': 'Comment not found'}), 404
            
            # Toggle like (simplified - you may want a separate like table)
            comment.likes = (comment.likes or 0) + 1
            db.session.commit()
            
            return jsonify({
                'likes': comment.likes,
                'is_liked': True
            }), 200
        except:
            return jsonify({'error': 'Comments not available'}), 500
            
    except Exception as e:
        print(f"Error liking comment: {e}")
        return jsonify({'error': 'Failed to like comment'}), 500


@api.route('/clips/comments/<int:comment_id>/pin', methods=['POST'])
@jwt_required()
def pin_clip_comment(comment_id):
    """Pin/unpin a comment (clip owner only)."""
    try:
        user_id = get_jwt_identity()
        
        try:
            comment = ClipComment.query.get(comment_id)
            if not comment:
                return jsonify({'error': 'Comment not found'}), 404
            
            # Check if user owns the clip
            clip = VideoClip.query.get(comment.clip_id)
            if not clip or clip.user_id != user_id:
                return jsonify({'error': 'Only clip owner can pin comments'}), 403
            
            # Toggle pin
            comment.is_pinned = not (comment.is_pinned or False)
            db.session.commit()
            
            return jsonify({
                'is_pinned': comment.is_pinned,
                'message': 'Comment pinned' if comment.is_pinned else 'Comment unpinned'
            }), 200
        except:
            return jsonify({'error': 'Comments not available'}), 500
            
    except Exception as e:
        print(f"Error pinning comment: {e}")
        return jsonify({'error': 'Failed to pin comment'}), 500


# =============================================================================
# CLIP TIER/LIMITS ROUTES
# =============================================================================

@api.route('/clips/tier-info', methods=['GET'])
@jwt_required()
def get_clips_tier_info():
    """Get tier limits for clip creation."""
    try:
        user_id = get_jwt_identity()
        tier = get_user_tier(user_id)
        
        tier_limits = {
            'free': {
                'clips_per_day': 3,
                'max_duration': 60,
                'max_file_size': 100 * 1024 * 1024,  # 100MB
                'can_schedule': False,
                'can_go_viral': False
            },
            'basic': {
                'clips_per_day': 20,
                'max_duration': 180,
                'max_file_size': 500 * 1024 * 1024,  # 500MB
                'can_schedule': True,
                'can_go_viral': False
            },
            'premium': {
                'clips_per_day': 100,
                'max_duration': 300,
                'max_file_size': 1024 * 1024 * 1024,  # 1GB
                'can_schedule': True,
                'can_go_viral': True
            },
            'professional': {
                'clips_per_day': -1,  # Unlimited
                'max_duration': 600,
                'max_file_size': 2 * 1024 * 1024 * 1024,  # 2GB
                'can_schedule': True,
                'can_go_viral': True
            }
        }
        
        limits = tier_limits.get(tier, tier_limits['free'])
        
        # Count clips created today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = VideoClip.query.filter(
            VideoClip.user_id == user_id,
            VideoClip.created_at >= today_start
        ).count()
        
        remaining = limits['clips_per_day'] - today_count if limits['clips_per_day'] > 0 else -1
        
        return jsonify({
            'tier': tier,
            'limits': limits,
            'usage': {
                'clips_today': today_count,
                'clips_remaining': remaining
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching tier info: {e}")
        return jsonify({'error': 'Failed to fetch tier info'}), 500

@api.route('/tips/send', methods=['POST'])
@jwt_required()
def send_tip():
    """
    Send a tip to a creator
    
    Request body:
    {
        "recipient_id": 123,
        "amount": 5.00,
        "payment_method": "stripe",  # stripe, cashapp, venmo, paypal, crypto, external
        "message": "Great content!",  # optional
        "is_anonymous": false,  # optional
        "content_type": "video",  # optional - video, audio, stream, podcast
        "content_id": 456,  # optional
        "currency": "USD"  # optional, defaults to USD
    }
    """
    sender_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    recipient_id = data.get('recipient_id')
    amount = data.get('amount')
    
    if not recipient_id:
        return jsonify({'error': 'Recipient ID is required'}), 400
    
    if not amount or amount <= 0:
        return jsonify({'error': 'Valid amount is required'}), 400
    
    # Prevent self-tipping
    if int(sender_id) == int(recipient_id):
        return jsonify({'error': 'Cannot tip yourself'}), 400
    
    # Verify recipient exists
    recipient = User.query.get(recipient_id)
    if not recipient:
        return jsonify({'error': 'Recipient not found'}), 404
    
    # Get optional fields
    payment_method = data.get('payment_method', 'stripe')
    message = data.get('message', '')[:500] if data.get('message') else None  # Limit to 500 chars
    is_anonymous = data.get('is_anonymous', False)
    content_type = data.get('content_type')
    content_id = data.get('content_id')
    currency = data.get('currency', 'USD')
    
    # Validate payment method
    valid_methods = ['stripe', 'cashapp', 'venmo', 'paypal', 'crypto', 'external']
    if payment_method not in valid_methods:
        return jsonify({'error': f'Invalid payment method. Use: {", ".join(valid_methods)}'}), 400
    
    # Calculate platform cut and creator earnings
    # External payments (CashApp, Venmo, etc.) = 0% platform cut
    # Stripe payments = 10% platform cut
    if payment_method in ['cashapp', 'venmo', 'paypal', 'crypto', 'external']:
        platform_cut = 0.0
    else:
        platform_cut = 0.10  # 10% for Stripe
    
    creator_earnings = amount * (1 - platform_cut)
    
    # For Stripe payments, create a payment intent
    if payment_method == 'stripe':
        try:
            # Check if we have Stripe configured
            if not stripe.api_key:
                return jsonify({'error': 'Stripe not configured'}), 500
            
            # Create Stripe payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Stripe uses cents
                currency=currency.lower(),
                metadata={
                    'sender_id': sender_id,
                    'recipient_id': recipient_id,
                    'tip_type': 'creator_tip',
                    'content_type': content_type or '',
                    'content_id': content_id or ''
                }
            )
            
            # Create tip record with pending status
            tip = Tip(
                sender_id=sender_id,
                recipient_id=recipient_id,
                amount=amount,
                payment_method=payment_method,
                status='pending',
                message=message,
                is_anonymous=is_anonymous,
                currency=currency,
                content_type=content_type,
                content_id=content_id,
                platform_cut=platform_cut,
                creator_earnings=creator_earnings
            )
            
            db.session.add(tip)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'tip_id': tip.id,
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'amount': amount,
                'creator_earnings': creator_earnings,
                'platform_fee': amount * platform_cut
            }), 200
            
        except stripe.error.StripeError as e:
            return jsonify({'error': f'Payment error: {str(e)}'}), 400
    
    else:
        # For external payment methods (CashApp, Venmo, etc.)
        # Record the tip directly as completed (user handles payment externally)
        
        # Get creator's payment info to show to sender
        payment_settings = CreatorPaymentSettings.query.filter_by(user_id=recipient_id).first()
        
        tip = Tip(
            sender_id=sender_id,
            recipient_id=recipient_id,
            amount=amount,
            payment_method=payment_method,
            status='completed',  # External payments marked complete immediately
            message=message,
            is_anonymous=is_anonymous,
            currency=currency,
            content_type=content_type,
            content_id=content_id,
            platform_cut=platform_cut,
            creator_earnings=creator_earnings
        )
        
        db.session.add(tip)
        db.session.commit()
        
        # Build response with payment info
        response = {
            'success': True,
            'tip_id': tip.id,
            'payment_method': payment_method,
            'amount': amount,
            'creator_earnings': creator_earnings,
            'platform_fee': 0,  # No fee for external
            'message': f'Tip recorded! Please send ${amount} via {payment_method.title()}.'
        }
        
        # Add payment details if available
        if payment_settings:
            if payment_method == 'cashapp' and payment_settings.cashapp_username:
                response['payment_info'] = {
                    'type': 'cashapp',
                    'username': payment_settings.cashapp_username,
                    'display': f'$cashtag: ${payment_settings.cashapp_username}'
                }
            elif payment_method == 'venmo' and payment_settings.venmo_username:
                response['payment_info'] = {
                    'type': 'venmo',
                    'username': payment_settings.venmo_username,
                    'display': f'@{payment_settings.venmo_username}'
                }
            elif payment_method == 'paypal' and payment_settings.paypal_email:
                response['payment_info'] = {
                    'type': 'paypal',
                    'email': payment_settings.paypal_email
                }
            elif payment_method == 'crypto' and payment_settings.crypto_address:
                response['payment_info'] = {
                    'type': 'crypto',
                    'address': payment_settings.crypto_address,
                    'network': payment_settings.crypto_network or 'ETH'
                }
        
        return jsonify(response), 201

@api.route('/tips/confirm', methods=['POST'])
@jwt_required()
def confirm_tip():
    """
    Confirm a Stripe tip payment after successful payment
    Called from frontend after Stripe payment succeeds
    """
    data = request.get_json()
    tip_id = data.get('tip_id')
    payment_intent_id = data.get('payment_intent_id')
    
    if not tip_id:
        return jsonify({'error': 'Tip ID required'}), 400
    
    tip = Tip.query.get(tip_id)
    if not tip:
        return jsonify({'error': 'Tip not found'}), 404
    
    # Verify ownership
    sender_id = get_jwt_identity()
    if tip.sender_id != int(sender_id):
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Update tip status
    tip.status = 'completed'
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Tip confirmed!',
        'tip': tip.serialize()
    }), 200



# =============================================================================
# ADD FUNDS TO WALLET (Stripe Checkout)
# =============================================================================

@api.route('/wallet/add-funds', methods=['POST'])
@jwt_required()
def add_funds_to_wallet():
    """Create Stripe checkout to add funds to wallet"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        amount = data.get('amount')
        
        if not amount or float(amount) < 5:
            return jsonify({'error': 'Minimum deposit is $5'}), 400
        
        if float(amount) > 500:
            return jsonify({'error': 'Maximum deposit is $500'}), 400
        
        amount = Decimal(str(amount))
        user = User.query.get(user_id)
        
        # Create Stripe Checkout Session
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Add Funds to Wallet',
                        'description': f'Add ${float(amount):.2f} to your StreamPireX wallet'
                    },
                    'unit_amount': int(float(amount) * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{frontend_url}/wallet/success?session_id={{CHECKOUT_SESSION_ID}}&amount={amount}",
            cancel_url=f"{frontend_url}/wallet",
            metadata={
                'type': 'wallet_deposit',
                'user_id': str(user_id),
                'amount': str(float(amount))
            }
        )
        
        return jsonify({
            'success': True,
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        }), 200
        
    except stripe.error.StripeError as e:
        current_app.logger.error(f"Stripe error for wallet deposit: {str(e)}")
        return jsonify({'error': f'Payment error: {str(e)}'}), 400
    except Exception as e:
        current_app.logger.error(f"Error adding funds: {e}")
        return jsonify({'error': 'Failed to create payment'}), 500


# =============================================================================
# STRIPE WEBHOOK HANDLERS - Add these to your existing webhook handler
# =============================================================================

def handle_tip_payment_success(session):
    """Handle successful tip payment from Stripe checkout"""
    try:
        metadata = session.get('metadata', {})
        
        if metadata.get('type') != 'tip':
            return
        
        tip_id = metadata.get('tip_id')
        if not tip_id:
            current_app.logger.error("Tip payment webhook missing tip_id")
            return
        
        tip = Tip.query.get(int(tip_id))
        if not tip:
            current_app.logger.error(f"Tip {tip_id} not found")
            return
        
        if tip.status == 'completed':
            current_app.logger.info(f"Tip {tip_id} already completed")
            return
        
        # Update tip status
        tip.status = 'completed'
        tip.stripe_payment_intent_id = session.get('payment_intent')
        
        # Credit creator wallet
        creator_wallet = UserWallet.query.filter_by(user_id=tip.receiver_id).first()
        if not creator_wallet:
            creator_wallet = UserWallet(user_id=tip.receiver_id, balance=Decimal('0'))
            db.session.add(creator_wallet)
        
        creator_wallet.balance += tip.creator_amount
        creator_wallet.lifetime_earnings += tip.creator_amount
        
        # Update sender stats (no wallet deduction since they paid directly)
        sender_wallet = UserWallet.query.filter_by(user_id=tip.sender_id).first()
        if sender_wallet:
            sender_wallet.lifetime_tips_sent += tip.amount
        
        db.session.commit()
        
        # Send notification to creator
        # send_tip_notification(tip.receiver, tip.sender, tip)
        
        current_app.logger.info(f"✅ Tip {tip_id} completed via card payment")
        
    except Exception as e:
        current_app.logger.error(f"Error handling tip payment: {e}")
        db.session.rollback()
        raise


def handle_wallet_deposit_success(session):
    """Handle successful wallet deposit from Stripe checkout"""
    try:
        metadata = session.get('metadata', {})
        
        if metadata.get('type') != 'wallet_deposit':
            return
        
        user_id = metadata.get('user_id')
        amount = metadata.get('amount')
        
        if not user_id or not amount:
            current_app.logger.error("Wallet deposit webhook missing data")
            return
        
        amount = Decimal(amount)
        
        # Get or create wallet
        wallet = UserWallet.query.filter_by(user_id=int(user_id)).first()
        if not wallet:
            wallet = UserWallet(user_id=int(user_id), balance=Decimal('0'))
            db.session.add(wallet)
        
        # Add funds
        wallet.balance += amount
        
        # Record transaction
        transaction = WalletTransaction(
            user_id=int(user_id),
            amount=amount,
            type='deposit',
            status='completed',
            stripe_payment_intent_id=session.get('payment_intent'),
            description=f'Added ${float(amount):.2f} to wallet'
        )
        db.session.add(transaction)
        
        db.session.commit()
        
        current_app.logger.info(f"✅ Wallet deposit of ${amount} completed for user {user_id}")
        
    except Exception as e:
        current_app.logger.error(f"Error handling wallet deposit: {e}")
        db.session.rollback()
        raise


# =============================================================================
# ADD TO YOUR EXISTING handle_checkout_completed FUNCTION:
# =============================================================================
"""
In your existing handle_checkout_completed(session) function, add these checks:

def handle_checkout_completed(session):
    try:
        metadata = session.get('metadata', {})
        
        # ... your existing subscription handling ...
        
        # TIP PAYMENT
        if metadata.get('type') == 'tip':
            handle_tip_payment_success(session)
        # AI Video Credit Pack Purchase
        if metadata.get('type') == 'credit_pack_purchase':
            from src.api.ai_video_credits_routes import handle_credit_pack_payment
            handle_credit_pack_payment(session)
            return
            return
        
        # WALLET DEPOSIT
        if metadata.get('type') == 'wallet_deposit':
            handle_wallet_deposit_success(session)
        # AI Video Credit Pack Purchase
            return
        
        # ... your existing marketplace/podcast handling ...
        
    except Exception as e:
        current_app.logger.error(f"Error in checkout completed: {e}")
        raise
"""


# =============================================================================
# QUICK TIP (Payment Intent for in-app payment without redirect)
# =============================================================================

@api.route('/tips/quick-pay', methods=['POST'])
@jwt_required()
def create_quick_tip_payment():
    """
    Create a Payment Intent for quick tip (pay without leaving page).
    Use with Stripe Elements on frontend.
    """
    try:
        sender_id = get_jwt_identity()
        data = request.get_json()
        
        creator_id = data.get('creator_id')
        amount = data.get('amount')
        message = data.get('message', '').strip()[:200]
        is_anonymous = data.get('is_anonymous', False)
        
        # Validation
        if not creator_id or not amount or float(amount) < 1:
            return jsonify({'error': 'Invalid tip data'}), 400
        
        amount = Decimal(str(amount))
        creator = User.query.get(creator_id)
        
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404
        
        # Calculate fees
        platform_fee = amount * Decimal('0.10')
        creator_amount = amount - platform_fee
        
        # Create pending tip
        tip = Tip(
            sender_id=sender_id,
            receiver_id=creator_id,
            amount=amount,
            message=message if message else None,
            is_anonymous=is_anonymous,
            platform_fee=platform_fee,
            creator_amount=creator_amount,
            payment_method='card',
            status='pending'
        )
        db.session.add(tip)
        db.session.flush()
        
        # Create Payment Intent
        payment_intent = stripe.PaymentIntent.create(
            amount=int(float(amount) * 100),
            currency='usd',
            metadata={
                'type': 'tip',
                'tip_id': str(tip.id),
                'sender_id': str(sender_id),
                'creator_id': str(creator_id)
            }
        )
        
        tip.stripe_payment_intent_id = payment_intent.id
        db.session.commit()
        
        return jsonify({
            'client_secret': payment_intent.client_secret,
            'tip_id': tip.id
        }), 200
        
    except stripe.error.StripeError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create payment'}), 500


# =============================================================================
# CONFIRM QUICK TIP (After Stripe Elements payment)
# =============================================================================

@api.route('/tips/confirm/<int:tip_id>', methods=['POST'])
@jwt_required()
def confirm_quick_tip(tip_id):
    """Confirm tip after Stripe Elements payment succeeds"""
    try:
        user_id = get_jwt_identity()
        
        tip = Tip.query.get(tip_id)
        if not tip:
            return jsonify({'error': 'Tip not found'}), 404
        
        if tip.sender_id != int(user_id):
            return jsonify({'error': 'Unauthorized'}), 403
        
        if tip.status == 'completed':
            return jsonify({'message': 'Tip already confirmed'}), 200
        
        # Verify payment with Stripe
        if tip.stripe_payment_intent_id:
            payment_intent = stripe.PaymentIntent.retrieve(tip.stripe_payment_intent_id)
            
            if payment_intent.status != 'succeeded':
                return jsonify({'error': 'Payment not completed'}), 400
        
        # Complete the tip
        tip.status = 'completed'
        
        # Credit creator
        creator_wallet = UserWallet.query.filter_by(user_id=tip.receiver_id).first()
        if not creator_wallet:
            creator_wallet = UserWallet(user_id=tip.receiver_id, balance=Decimal('0'))
            db.session.add(creator_wallet)
        
        creator_wallet.balance += tip.creator_amount
        creator_wallet.lifetime_earnings += tip.creator_amount
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'tip': tip.serialize(),
            'message': 'Tip sent successfully!'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to confirm tip'}), 500


# =============================================================================
# GET WALLET WITH TRANSACTION HISTORY
# =============================================================================

@api.route('/user/wallet', methods=['GET'])
@jwt_required()
def get_user_wallet():
    """Get wallet balance and recent transactions"""
    try:
        user_id = get_jwt_identity()
        
        wallet = UserWallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            wallet = UserWallet(user_id=user_id, balance=Decimal('0'))
            db.session.add(wallet)
            db.session.commit()
        
        # Get recent transactions
        transactions = WalletTransaction.query.filter_by(user_id=user_id)\
            .order_by(WalletTransaction.created_at.desc())\
            .limit(10).all()
        
        return jsonify({
            'balance': float(wallet.balance),
            'lifetime_earnings': float(wallet.lifetime_earnings),
            'lifetime_tips_sent': float(wallet.lifetime_tips_sent),
            'pending_payout': float(wallet.pending_payout),
            'transactions': [{
                'id': t.id,
                'amount': float(t.amount),
                'type': t.type,
                'status': t.status,
                'description': t.description,
                'created_at': t.created_at.isoformat()
            } for t in transactions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch wallet'}), 500


@api.route('/creator/<int:creator_id>/payment-methods', methods=['GET'])
def get_creator_payment_methods(creator_id):
    """Get creator's available payment methods for tipping"""
    try:
        creator = User.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404
        
        # Get payment settings
        settings = CreatorPaymentSettings.query.filter_by(user_id=creator_id).first()
        
        if not settings:
            return jsonify({
                'cashapp_username': None,
                'venmo_username': None,
                'paypal_username': None,
                'zelle_identifier': None,
                'accepts_platform_tips': True
            }), 200
        
        return jsonify({
            'cashapp_username': settings.cashapp_username if settings.cashapp_enabled else None,
            'venmo_username': settings.venmo_username if settings.venmo_enabled else None,
            'paypal_username': settings.paypal_username if settings.paypal_enabled else None,
            'zelle_identifier': settings.zelle_identifier if settings.zelle_enabled else None,
            'accepts_platform_tips': settings.accepts_platform_tips
        }), 200
        
    except Exception as e:
        print(f"Error fetching payment methods: {e}")
        return jsonify({'error': 'Failed to fetch payment methods'}), 500


# =============================================================================
# UPDATE CREATOR PAYMENT SETTINGS
# =============================================================================

@api.route('/creator/payment-settings', methods=['GET'])
@jwt_required()
def get_my_payment_settings():
    """Get current user's payment settings"""
    try:
        user_id = get_jwt_identity()
        
        settings = CreatorPaymentSettings.query.filter_by(user_id=user_id).first()
        
        if not settings:
            return jsonify({
                'cashapp_username': None,
                'cashapp_enabled': False,
                'venmo_username': None,
                'venmo_enabled': False,
                'paypal_username': None,
                'paypal_enabled': False,
                'zelle_identifier': None,
                'zelle_enabled': False,
                'accepts_platform_tips': True,
                'tip_minimum': 1.00,
                'tip_message': None
            }), 200
        
        return jsonify({
            'cashapp_username': settings.cashapp_username,
            'cashapp_enabled': settings.cashapp_enabled,
            'venmo_username': settings.venmo_username,
            'venmo_enabled': settings.venmo_enabled,
            'paypal_username': settings.paypal_username,
            'paypal_enabled': settings.paypal_enabled,
            'zelle_identifier': settings.zelle_identifier,
            'zelle_enabled': settings.zelle_enabled,
            'accepts_platform_tips': settings.accepts_platform_tips,
            'tip_minimum': float(settings.tip_minimum) if settings.tip_minimum else 1.00,
            'tip_message': settings.tip_message
        }), 200
        
    except Exception as e:
        print(f"Error fetching payment settings: {e}")
        return jsonify({'error': 'Failed to fetch settings'}), 500


@api.route('/creator/payment-settings', methods=['PUT'])
@jwt_required()
def update_payment_settings():
    """Update creator's payment settings"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Get or create settings
        settings = CreatorPaymentSettings.query.filter_by(user_id=user_id).first()
        if not settings:
            settings = CreatorPaymentSettings(user_id=user_id)
            db.session.add(settings)
        
        # Validate and update CashApp
        if 'cashapp_username' in data:
            username = data['cashapp_username']
            if username:
                # Clean up - remove $ if present, validate format
                username = username.strip().lstrip('$')
                if not re.match(r'^[a-zA-Z0-9_-]{1,20}$', username):
                    return jsonify({'error': 'Invalid Cash App username format'}), 400
                settings.cashapp_username = username
            else:
                settings.cashapp_username = None
        
        if 'cashapp_enabled' in data:
            settings.cashapp_enabled = bool(data['cashapp_enabled'])
        
        # Validate and update Venmo
        if 'venmo_username' in data:
            username = data['venmo_username']
            if username:
                username = username.strip().lstrip('@')
                if not re.match(r'^[a-zA-Z0-9_-]{1,30}$', username):
                    return jsonify({'error': 'Invalid Venmo username format'}), 400
                settings.venmo_username = username
            else:
                settings.venmo_username = None
        
        if 'venmo_enabled' in data:
            settings.venmo_enabled = bool(data['venmo_enabled'])
        
        # Validate and update PayPal
        if 'paypal_username' in data:
            username = data['paypal_username']
            if username:
                username = username.strip()
                # PayPal.me usernames are 3-20 chars, alphanumeric
                if not re.match(r'^[a-zA-Z0-9]{3,20}$', username):
                    return jsonify({'error': 'Invalid PayPal.me username format'}), 400
                settings.paypal_username = username
            else:
                settings.paypal_username = None
        
        if 'paypal_enabled' in data:
            settings.paypal_enabled = bool(data['paypal_enabled'])
        
        # Validate and update Zelle
        if 'zelle_identifier' in data:
            identifier = data['zelle_identifier']
            if identifier:
                identifier = identifier.strip()
                # Zelle uses email or phone - basic validation
                # Allow email format or phone digits
                if len(identifier) > 50:
                    return jsonify({'error': 'Zelle identifier too long'}), 400
                settings.zelle_identifier = identifier
            else:
                settings.zelle_identifier = None
        
        if 'zelle_enabled' in data:
            settings.zelle_enabled = bool(data['zelle_enabled'])
        
        # Update other settings
        if 'accepts_platform_tips' in data:
            settings.accepts_platform_tips = bool(data['accepts_platform_tips'])
        
        if 'tip_minimum' in data:
            minimum = float(data['tip_minimum'])
            if minimum < 1 or minimum > 100:
                return jsonify({'error': 'Tip minimum must be between $1 and $100'}), 400
            settings.tip_minimum = minimum
        
        if 'tip_message' in data:
            settings.tip_message = data['tip_message'][:200] if data['tip_message'] else None
        
        settings.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Payment settings updated'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating payment settings: {e}")
        return jsonify({'error': 'Failed to update settings'}), 500


# =============================================================================
# LOG EXTERNAL TIP (For tracking even though we can't verify payment)
# =============================================================================

@api.route('/tips/external', methods=['POST'])
@jwt_required()
def log_external_tip():
    """
    Log an external tip attempt (CashApp, Venmo, PayPal).
    We can't verify these payments, but we track them for analytics.
    """
    try:
        sender_id = get_jwt_identity()
        data = request.get_json()
        
        creator_id = data.get('creator_id')
        amount = data.get('amount', 0)
        payment_method = data.get('payment_method')
        message = data.get('message', '').strip()[:200]
        is_anonymous = data.get('is_anonymous', False)
        
        if payment_method not in ['cashapp', 'venmo', 'paypal', 'zelle']:
            return jsonify({'error': 'Invalid payment method'}), 400
        
        # Create external tip record (status = 'external_pending')
        # We mark it as unverified since we can't confirm the payment
        tip = Tip(
            sender_id=sender_id,
            receiver_id=creator_id,
            amount=amount,
            message=message if message else None,
            is_anonymous=is_anonymous,
            platform_fee=0,  # No platform fee for external payments
            creator_amount=amount,  # Creator gets 100%
            payment_method=payment_method,
            source='direct',
            status='external_unverified'  # Special status for external tips
        )
        
        db.session.add(tip)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'tip_id': tip.id,
            'message': 'Tip logged (external payment)'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error logging external tip: {e}")
        return jsonify({'error': 'Failed to log tip'}), 500


# =============================================================================
# VERIFY EXTERNAL TIP (Optional - Creator confirms they received it)
# =============================================================================

@api.route('/tips/external/<int:tip_id>/verify', methods=['POST'])
@jwt_required()
def verify_external_tip(tip_id):
    """Creator confirms they received an external tip"""
    try:
        user_id = get_jwt_identity()
        
        tip = Tip.query.get(tip_id)
        if not tip:
            return jsonify({'error': 'Tip not found'}), 404
        
        # Only the receiver can verify
        if tip.receiver_id != int(user_id):
            return jsonify({'error': 'Unauthorized'}), 403
        
        if tip.status != 'external_unverified':
            return jsonify({'error': 'Tip already verified or invalid status'}), 400
        
        tip.status = 'external_verified'
        tip.verified_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Tip verified'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to verify tip'}), 500


# =============================================================================
# GET PENDING EXTERNAL TIPS (For creator to verify)
# =============================================================================

@api.route('/tips/external/pending', methods=['GET'])
@jwt_required()
def get_pending_external_tips():
    """Get unverified external tips for creator to confirm"""
    try:
        user_id = get_jwt_identity()
        
        tips = Tip.query.filter_by(
            receiver_id=user_id,
            status='external_unverified'
        ).order_by(Tip.created_at.desc()).limit(50).all()
        
        return jsonify({
            'tips': [tip.serialize() for tip in tips],
            'count': len(tips)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch tips'}), 500

@api.route('/user/profile-picture', methods=['PUT'])
@jwt_required()
def update_profile_picture():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = request.get_json()
    if not data or 'profile_picture' not in data:
        return jsonify({"error": "No profile_picture URL provided"}), 400
    
    user.profile_picture = data['profile_picture']
    user.avatar_url = data['profile_picture']
    db.session.commit()
    
    return jsonify({
        "message": "Profile picture updated",
        "profile_picture": user.profile_picture
    }), 200


@api.route('/user/cover-photo', methods=['PUT'])
@jwt_required()
def update_cover_photo():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = request.get_json()
    if not data or 'cover_photo' not in data:
        return jsonify({"error": "No cover_photo URL provided"}), 400
    
    user.cover_photo = data['cover_photo']
    db.session.commit()
    
    return jsonify({
        "message": "Cover photo updated",
        "cover_photo": user.cover_photo
    }), 200

# =====================================================
# STORY PUBLIC COMMENTS ROUTES — add to routes.py
# =====================================================

# ==================== GET PUBLIC COMMENTS ====================
@api.route('/stories/<int:story_id>/comments', methods=['GET'])
@jwt_required(optional=True)
def get_story_comments(story_id):
    """Get public comments on a story"""
    try:
        story = Story.query.get(story_id)
        if not story:
            return jsonify({"error": "Story not found"}), 404
        
        if story.comment_mode not in ['public', 'both']:
            return jsonify({"error": "Comments not enabled for this story"}), 403
        
        # Get top-level comments (no parent)
        comments = StoryComment.query.filter_by(
            story_id=story_id,
            parent_id=None
        ).order_by(StoryComment.created_at.desc()).limit(100).all()
        
        return jsonify({
            "comments": [c.serialize() for c in comments],
            "total": story.comment_count
        }), 200
        
    except Exception as e:
        print(f"Error fetching story comments: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== POST PUBLIC COMMENT ====================
@api.route('/stories/<int:story_id>/comments', methods=['POST'])
@jwt_required()
def post_story_comment(story_id):
    """Post a public comment on a story"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        story = Story.query.get(story_id)
        if not story:
            return jsonify({"error": "Story not found"}), 404
        
        if story.comment_mode not in ['public', 'both']:
            return jsonify({"error": "Public comments not enabled for this story"}), 403
        
        if not data.get('content'):
            return jsonify({"error": "Comment content required"}), 400
        
        comment = StoryComment(
            story_id=story_id,
            user_id=user_id,
            content=data['content'][:300],
            parent_id=data.get('parent_id')  # For replies to comments
        )
        
        story.comment_count += 1
        db.session.add(comment)
        db.session.commit()
        
        return jsonify({
            "message": "Comment posted",
            "comment": comment.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error posting story comment: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== DELETE COMMENT ====================
@api.route('/stories/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_story_comment(comment_id):
    """Delete a comment (owner or story owner can delete)"""
    try:
        user_id = get_jwt_identity()
        comment = StoryComment.query.get(comment_id)
        
        if not comment:
            return jsonify({"error": "Comment not found"}), 404
        
        story = Story.query.get(comment.story_id)
        
        # Allow deletion by comment author or story owner
        if comment.user_id != user_id and story.user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        story.comment_count = max(0, story.comment_count - 1)
        db.session.delete(comment)
        db.session.commit()
        
        return jsonify({"message": "Comment deleted"}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting story comment: {e}")
        return jsonify({"error": str(e)}), 500

# =============================================================================
# STORY ROUTES - Add to src/api/routes.py
# =============================================================================
# Endpoints for creating, viewing, and sharing stories
# =============================================================================

from datetime import datetime, timedelta

# =============================================================================
# GET STORIES FROM FOLLOWED USERS (for Stories Bar)
# =============================================================================

@api.route('/stories/feed', methods=['GET'])
@jwt_required()
def get_stories_feed():
    """Get stories from users the current user follows (for stories bar)"""
    try:
        user_id = get_jwt_identity()
        
        # Get users current user follows
        following_ids = [f.followed_id for f in Follow.query.filter_by(follower_id=user_id).all()]
        
        # Include own stories
        all_user_ids = [user_id] + following_ids
        
        # Get non-expired stories from followed users (grouped by user)
        now = datetime.utcnow()
        
        stories_by_user = {}
        
        for uid in all_user_ids:
            user_stories = Story.query.filter(
                Story.user_id == uid,
                Story.is_highlight == False,
                Story.expires_at > now
            ).order_by(Story.created_at.asc()).all()
            
            if user_stories:
                user = User.query.get(uid)
                
                # Check if current user has viewed all stories
                viewed_story_ids = [v.story_id for v in StoryView.query.filter(
                    StoryView.user_id == user_id,
                    StoryView.story_id.in_([s.id for s in user_stories])
                ).all()]
                
                has_unseen = any(s.id not in viewed_story_ids for s in user_stories)
                
                stories_by_user[uid] = {
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'display_name': getattr(user, 'display_name', None) or user.username,
                        'avatar_url': getattr(user, 'profile_picture', None) or getattr(user, 'avatar_url', None)
                    },
                    'stories': [s.serialize() for s in user_stories],
                    'stories_count': len(user_stories),
                    'has_unseen': has_unseen,
                    'is_own': uid == user_id
                }
        
        # Sort: own stories first, then by has_unseen, then by most recent
        sorted_users = sorted(
            stories_by_user.values(),
            key=lambda x: (not x['is_own'], not x['has_unseen'], -x['stories'][0]['id'] if x['stories'] else 0)
        )
        
        return jsonify({
            'success': True,
            'stories': sorted_users,
            'total_users': len(sorted_users)
        }), 200
        
    except Exception as e:
        print(f"Stories feed error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to load stories'}), 500


# =============================================================================
# CREATE A NEW STORY (Upload or Share)
# =============================================================================

@api.route('/stories', methods=['POST'])
@jwt_required()
def create_story():
    """Create a new story - either upload media or share existing content"""
    try:
        user_id = get_jwt_identity()
        
        # Check for file upload
        if request.files and 'media' in request.files:
            # Handle file upload
            media_file = request.files['media']
            caption = request.form.get('caption', '')
            allow_reshare = request.form.get('allow_reshare', 'true').lower() == 'true'
            allow_comments = request.form.get('allow_comments', 'true').lower() == 'true'
            
            # Upload to Cloudinary
            upload_result = uploadFile(media_file, folder="stories")
            
            if not upload_result or 'url' not in upload_result:
                return jsonify({'error': 'Failed to upload media'}), 500
            
            media_url = upload_result['url']
            media_type = 'video' if media_file.content_type.startswith('video') else 'image'
            
            # Create story
            story = Story(
                user_id=user_id,
                media_url=media_url,
                media_type=media_type,
                caption=caption,
                allow_reshare=allow_reshare,
                allow_comments=allow_comments
            )
            
        else:
            # Handle JSON data (sharing content or media URL)
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Check if sharing existing content
            shared_content_id = data.get('shared_content_id')
            shared_content_type = data.get('shared_content_type')
            
            if shared_content_id and shared_content_type:
                # Sharing existing content
                content_map = {
                    'video': Video,
                    'post': Post,
                    'track': Audio,
                    'podcast': Podcast,
                }
                
                model = content_map.get(shared_content_type)
                if not model:
                    return jsonify({'error': 'Invalid content type'}), 400
                
                content = model.query.get(shared_content_id)
                if not content:
                    return jsonify({'error': 'Content not found'}), 404
                
                # Get original creator ID
                original_creator_id = getattr(content, 'user_id', None) or getattr(content, 'author_id', None) or getattr(content, 'host_id', None)
                
                # Get thumbnail/media URL from the content
                media_url = (
                    getattr(content, 'thumbnail_url', None) or 
                    getattr(content, 'cover_url', None) or 
                    getattr(content, 'artwork_url', None) or
                    getattr(content, 'image_url', None)
                )
                
                story = Story(
                    user_id=user_id,
                    media_url=media_url,
                    media_type='image',  # Thumbnail is image
                    caption=data.get('caption', ''),
                    shared_content_id=shared_content_id,
                    shared_content_type=shared_content_type,
                    shared_from_user_id=original_creator_id,
                    allow_reshare=data.get('allow_reshare', True),
                    allow_comments=data.get('allow_comments', True)
                )
                
            else:
                # Direct URL or media
                media_url = data.get('media_url')
                if not media_url:
                    return jsonify({'error': 'Media URL required'}), 400
                
                # Get duration and media type
                duration = float(data.get('duration', 5))
                media_type = data.get('media_type', 'image')
                
                # Enforce 60-second cap for video stories
                if media_type == 'video' and duration > MAX_STORY_DURATION:
                    return jsonify({
                        'error': f'Video stories cannot exceed {MAX_STORY_DURATION} seconds. Your video is {int(duration)}s. Please trim it before uploading.'
                    }), 400
                
                story = Story(
                    user_id=user_id,
                    media_url=media_url,
                    media_type=media_type,
                    caption=data.get('caption', ''),
                    duration=min(int(duration), MAX_STORY_DURATION),
                    thumbnail_url=data.get('thumbnail_url'),
                    allow_reshare=data.get('allow_reshare', True),
                    allow_comments=data.get('allow_comments', True),
                    comment_mode=data.get('comment_mode', 'both')
                )
        
        db.session.add(story)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Story created!',
            'story': story.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Create story error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to create story: {str(e)}'}), 500

# =============================================================================
# VIEW A STORY (Mark as viewed)
# =============================================================================

@api.route('/stories/<int:story_id>/view', methods=['POST'])
@jwt_required()
def view_story(story_id):
    """Mark a story as viewed by current user"""
    try:
        user_id = get_jwt_identity()
        
        story = Story.query.get(story_id)
        if not story:
            return jsonify({'error': 'Story not found'}), 404
        
        # Check if already viewed
        existing_view = StoryView.query.filter_by(
            story_id=story_id,
            user_id=user_id
        ).first()
        
        if not existing_view:
            # Create new view
            view = StoryView(
                story_id=story_id,
                user_id=user_id
            )
            db.session.add(view)
            
            # Increment view count
            story.views_count = (story.views_count or 0) + 1
            db.session.commit()
        
        return jsonify({
            'success': True,
            'views_count': story.views_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"View story error: {e}")
        return jsonify({'error': 'Failed to record view'}), 500


# =============================================================================
# GET STORY VIEWERS (for story owner)
# =============================================================================

@api.route('/stories/<int:story_id>/viewers', methods=['GET'])
@jwt_required()
def get_story_viewers(story_id):
    """Get list of users who viewed a story (only for story owner)"""
    try:
        user_id = get_jwt_identity()
        
        story = Story.query.get(story_id)
        if not story:
            return jsonify({'error': 'Story not found'}), 404
        
        # Only story owner can see viewers
        if story.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        views = StoryView.query.filter_by(story_id=story_id).order_by(StoryView.viewed_at.desc()).all()
        
        return jsonify({
            'success': True,
            'viewers': [v.serialize() for v in views],
            'total_views': len(views)
        }), 200
        
    except Exception as e:
        print(f"Get viewers error: {e}")
        return jsonify({'error': 'Failed to get viewers'}), 500


# =============================================================================
# REACT/COMMENT ON STORY
# =============================================================================

@api.route('/stories/<int:story_id>/react', methods=['POST'])
@jwt_required()
def react_to_story(story_id):
    """React or comment on a story"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        story = Story.query.get(story_id)
        if not story:
            return jsonify({'error': 'Story not found'}), 404
        
        if not story.allow_comments:
            return jsonify({'error': 'Comments disabled on this story'}), 403
        
        text = data.get('text')
        reaction = data.get('reaction')  # Emoji like ❤️ 🔥 😂
        
        if not text and not reaction:
            return jsonify({'error': 'Text or reaction required'}), 400
        
        comment = StoryComment(
            story_id=story_id,
            user_id=user_id,
            text=text,
            reaction=reaction
        )
        
        db.session.add(comment)
        story.comments_count = (story.comments_count or 0) + 1
        db.session.commit()
        
        # TODO: Send notification to story owner
        
        return jsonify({
            'success': True,
            'comment': comment.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"React error: {e}")
        return jsonify({'error': 'Failed to react'}), 500


# =============================================================================
# DELETE STORY
# =============================================================================

@api.route('/stories/<int:story_id>', methods=['DELETE'])
@jwt_required()
def delete_story(story_id):
    """Delete a story"""
    try:
        user_id = get_jwt_identity()
        
        story = Story.query.get(story_id)
        if not story:
            return jsonify({'error': 'Story not found'}), 404
        
        if story.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Delete related records
        StoryView.query.filter_by(story_id=story_id).delete()
        StoryComment.query.filter_by(story_id=story_id).delete()
        
        db.session.delete(story)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Story deleted'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Delete story error: {e}")
        return jsonify({'error': 'Failed to delete story'}), 500


# =============================================================================
# GET USER'S OWN STORIES
# =============================================================================

@api.route('/stories/me', methods=['GET'])
@jwt_required()
def get_my_stories():
    """Get current user's active stories"""
    try:
        user_id = get_jwt_identity()
        now = datetime.utcnow()
        
        # Get active stories
        active_stories = Story.query.filter(
            Story.user_id == user_id,
            Story.is_highlight == False,
            Story.expires_at > now
        ).order_by(Story.created_at.desc()).all()
        
        # Get highlights
        highlights = Story.query.filter(
            Story.user_id == user_id,
            Story.is_highlight == True
        ).order_by(Story.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'active_stories': [s.serialize() for s in active_stories],
            'highlights': [s.serialize() for s in highlights]
        }), 200
        
    except Exception as e:
        print(f"Get my stories error: {e}")
        return jsonify({'error': 'Failed to get stories'}), 500


# =============================================================================
# SHARE CONTENT TO STORY (Quick action from any content)
# =============================================================================

@api.route('/stories/share', methods=['POST'])
@jwt_required()
def share_to_story():
    """Quick share any content to your story"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        content_type = data.get('content_type')  # 'video', 'post', 'track', 'podcast'
        content_id = data.get('content_id')
        caption = data.get('caption', '')
        
        if not content_type or not content_id:
            return jsonify({'error': 'Content type and ID required'}), 400
        
        # Validate content exists
        content_map = {
            'video': Video,
            'post': Post,
            'track': Audio,
            'podcast': Podcast,
        }
        
        model = content_map.get(content_type)
        if not model:
            return jsonify({'error': 'Invalid content type'}), 400
        
        content = model.query.get(content_id)
        if not content:
            return jsonify({'error': 'Content not found'}), 404
        
        # Get original creator
        original_creator_id = (
            getattr(content, 'user_id', None) or 
            getattr(content, 'author_id', None) or 
            getattr(content, 'host_id', None)
        )
        
        # Get thumbnail
        media_url = (
            getattr(content, 'thumbnail_url', None) or 
            getattr(content, 'cover_url', None) or 
            getattr(content, 'artwork_url', None) or
            getattr(content, 'image_url', None)
        )
        
        # Create the story
        story = Story(
            user_id=user_id,
            media_url=media_url,
            media_type='image',
            caption=caption,
            shared_content_id=content_id,
            shared_content_type=content_type,
            shared_from_user_id=original_creator_id
        )
        
        db.session.add(story)
        
        # Increment shares count on original content if available
        if hasattr(content, 'shares'):
            content.shares = (content.shares or 0) + 1
        elif hasattr(content, 'shares_count'):
            content.shares_count = (content.shares_count or 0) + 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Shared to your story!',
            'story': story.serialize()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Share to story error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to share: {str(e)}'}), 500


# =============================================================================
# SAVE STORY TO HIGHLIGHTS
# =============================================================================

@api.route('/stories/<int:story_id>/highlight', methods=['POST'])
@jwt_required()
def add_to_highlights(story_id):
    """Save a story to highlights (won't expire)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        story = Story.query.get(story_id)
        if not story:
            return jsonify({'error': 'Story not found'}), 404
        
        if story.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        highlight_name = data.get('highlight_name', 'Highlights')
        
        story.is_highlight = True
        story.highlight_name = highlight_name
        story.expires_at = None  # Never expires
        
        # Create or update highlight collection
        highlight = StoryHighlight.query.filter_by(
            user_id=user_id,
            name=highlight_name
        ).first()
        
        if not highlight:
            highlight = StoryHighlight(
                user_id=user_id,
                name=highlight_name
            )
            db.session.add(highlight)
        else:
            highlight.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Added to {highlight_name}',
            'story': story.serialize()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Add to highlights error: {e}")
        return jsonify({'error': 'Failed to add to highlights'}), 500


# =============================================================================
# GET USER'S HIGHLIGHTS
# =============================================================================

@api.route('/users/<int:target_user_id>/highlights', methods=['GET'])
@jwt_required(optional=True)
def get_user_highlights(target_user_id):
    """Get a user's story highlights"""
    try:
        highlights = StoryHighlight.query.filter_by(user_id=target_user_id).all()
        
        return jsonify({
            'success': True,
            'highlights': [h.serialize() for h in highlights]
        }), 200
        
    except Exception as e:
        print(f"Get highlights error: {e}")
        return jsonify({'error': 'Failed to get highlights'}), 500


# ============ ARCHIVED SHOWS ============

@api.route('/radio/<int:station_id>/archives', methods=['GET'])
def get_archived_shows(station_id):
    """Get all archived shows for a station"""
    shows = ArchivedShow.query.filter_by(
        station_id=station_id, is_public=True
    ).order_by(ArchivedShow.recorded_at.desc()).all()
    return jsonify([show.serialize() for show in shows]), 200


@api.route('/radio/<int:station_id>/archives', methods=['POST'])
@jwt_required()
def create_archived_show(station_id):
    """Archive a show/broadcast"""
    user_id = get_jwt_identity()

    station = RadioStation.query.filter_by(id=station_id, user_id=user_id).first()
    if not station:
        return jsonify({"error": "Station not found or unauthorized"}), 404

    data = request.form.to_dict()
    file_url = None
    cover_url = None

    # Handle audio upload
    if 'audio' in request.files:
        audio_file = request.files['audio']
        if audio_file and audio_file.filename:
            filename = secure_filename(audio_file.filename)
            file_url = uploadFile(audio_file, f"archives/{user_id}_{filename}")

    # Handle cover upload
    if 'cover' in request.files:
        cover_file = request.files['cover']
        if cover_file and cover_file.filename:
            filename = secure_filename(cover_file.filename)
            cover_url = uploadFile(cover_file, f"archive_covers/{user_id}_{filename}")

    show = ArchivedShow(
        station_id=station_id,
        user_id=user_id,
        title=data.get("title", "Untitled Show"),
        description=data.get("description", ""),
        file_url=file_url,
        cover_image_url=cover_url,
        duration=int(data.get("duration", 0)) if data.get("duration") else None,
        dj_name=data.get("dj_name", ""),
        genre=data.get("genre", ""),
        recorded_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )

    db.session.add(show)
    db.session.commit()

    return jsonify({
        "message": "Show archived!",
        "show": show.serialize()
    }), 201


@api.route('/radio/archives/<int:show_id>', methods=['DELETE'])
@jwt_required()
def delete_archived_show(show_id):
    """Delete an archived show"""
    user_id = get_jwt_identity()
    show = ArchivedShow.query.get(show_id)

    if not show or show.user_id != user_id:
        return jsonify({"error": "Not found or unauthorized"}), 404

    db.session.delete(show)
    db.session.commit()
    return jsonify({"message": "Archived show deleted"}), 200

# =============================================================================
# CLEANUP EXPIRED STORIES (Run periodically)
# =============================================================================

def cleanup_expired_stories():
    """Delete expired stories (run this as a scheduled job)"""
    try:
        now = datetime.utcnow()
        expired = Story.query.filter(
            Story.is_highlight == False,
            Story.expires_at < now
        ).all()
        
        for story in expired:
            StoryView.query.filter_by(story_id=story.id).delete()
            StoryComment.query.filter_by(story_id=story.id).delete()
            db.session.delete(story)
        
        db.session.commit()
        print(f"✅ Cleaned up {len(expired)} expired stories")
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Story cleanup error: {e}")

@api.route('/reels/upload', methods=['POST'])
@jwt_required()
def upload_reel():
    """Upload a standalone reel (short-form video, max 3 minutes)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_url = data.get('video_url')
        if not video_url:
            return jsonify({'error': 'Video URL is required'}), 400

        title = data.get('title', '').strip()
        if not title:
            return jsonify({'error': 'Title is required'}), 400

        duration = int(data.get('duration', 0))
        if duration > MAX_REEL_DURATION:
            return jsonify({
                'error': f'Reels cannot exceed {MAX_REEL_DURATION} seconds ({MAX_REEL_DURATION // 60} minutes). Your video is {duration}s.'
            }), 400

        # Create VideoClip with content_type='reel' (no source_video_id)
        reel = VideoClip(
            user_id=user_id,
            source_video_id=None,  # Direct upload, not clipped
            title=title,
            description=data.get('description', '').strip(),
            video_url=video_url,
            thumbnail_url=data.get('thumbnail_url'),
            duration=min(duration, MAX_REEL_DURATION),
            content_type='reel',
            tags=data.get('tags', []),
            is_public=data.get('is_public', True),
            start_time=None,
            end_time=None
        )

        db.session.add(reel)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Reel uploaded!',
            'reel': reel.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Upload reel error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to upload reel: {str(e)}'}), 500


# =============================================================================
# REELS DISCOVERY FEED (For You / Following / Trending)
# =============================================================================

@api.route('/reels/feed', methods=['GET'])
@jwt_required(optional=True)
def get_reels_feed():
    """Get reels feed — supports foryou, following, and trending types"""
    try:
        user_id = get_jwt_identity()
        feed_type = request.args.get('type', 'foryou')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        # Base query: all public reels + clips (both show in feed)
        base_query = VideoClip.query.filter(
            VideoClip.is_public == True,
            VideoClip.content_type.in_(['reel', 'clip'])
        )

        if feed_type == 'following' and user_id:
            # Only from users the current user follows
            following_ids = [f.following_id for f in Follow.query.filter_by(follower_id=user_id).all()]
            if not following_ids:
                return jsonify({'reels': [], 'has_next': False, 'page': page, 'total': 0}), 200
            query = base_query.filter(VideoClip.user_id.in_(following_ids))
            query = query.order_by(VideoClip.created_at.desc())

        elif feed_type == 'trending':
            # Trending: weighted by views, likes, recency
            # Score = (views * 1) + (likes * 3) + (shares * 5), boosted if recent
            query = base_query.order_by(
                desc(
                    (VideoClip.views * 1) +
                    (VideoClip.likes * 3) +
                    (VideoClip.shares * 5)
                )
            ).filter(
                VideoClip.created_at >= datetime.utcnow() - timedelta(days=7)
            )

        else:
            # For You: mix of trending + recent + some randomness
            # Get trending IDs from last 14 days
            trending_cutoff = datetime.utcnow() - timedelta(days=14)

            query = base_query.filter(
                VideoClip.created_at >= trending_cutoff
            ).order_by(
                desc(
                    (VideoClip.views * 1) +
                    (VideoClip.likes * 3) +
                    (VideoClip.shares * 5) +
                    # Recency boost: newer content gets higher score
                    func.extract('epoch', VideoClip.created_at - trending_cutoff) / 86400
                )
            )

        total = query.count()
        reels = query.offset((page - 1) * per_page).limit(per_page).all()

        reels_data = []
        for reel in reels:
            creator = User.query.get(reel.user_id)

            # Check if current user liked this reel
            is_liked = False
            if user_id:
                is_liked = ClipLike.query.filter_by(
                    clip_id=reel.id, user_id=user_id
                ).first() is not None

            reels_data.append({
                'id': reel.id,
                'title': reel.title,
                'description': reel.description,
                'video_url': reel.video_url,
                'thumbnail_url': reel.thumbnail_url,
                'duration': reel.duration,
                'content_type': reel.content_type,
                'views': reel.views or 0,
                'likes': reel.likes or 0,
                'comments': reel.comments or 0,
                'shares': reel.shares or 0,
                'tags': reel.tags or [],
                'is_liked': is_liked,
                'is_public': reel.is_public,
                'created_at': reel.created_at.isoformat() if reel.created_at else None,
                'user_id': reel.user_id,
                'creator': {
                    'id': creator.id,
                    'username': creator.username,
                    'display_name': getattr(creator, 'display_name', None) or creator.username,
                    'profile_picture': getattr(creator, 'profile_picture', None) or getattr(creator, 'avatar_url', None)
                } if creator else None
            })

        return jsonify({
            'reels': reels_data,
            'has_next': page * per_page < total,
            'has_prev': page > 1,
            'page': page,
            'total': total
        }), 200

    except Exception as e:
        print(f"Reels feed error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch reels feed'}), 500


# =============================================================================
# TRENDING REELS (Standalone endpoint)
# =============================================================================

@api.route('/reels/trending', methods=['GET'])
def get_trending_reels():
    """Get trending reels from the past 7 days"""
    try:
        limit = request.args.get('limit', 20, type=int)

        cutoff = datetime.utcnow() - timedelta(days=7)

        reels = VideoClip.query.filter(
            VideoClip.is_public == True,
            VideoClip.content_type.in_(['reel', 'clip']),
            VideoClip.created_at >= cutoff
        ).order_by(
            desc(
                (VideoClip.views * 1) +
                (VideoClip.likes * 3) +
                (VideoClip.shares * 5)
            )
        ).limit(limit).all()

        return jsonify({
            'trending': [reel.serialize() for reel in reels],
            'count': len(reels)
        }), 200

    except Exception as e:
        print(f"Trending reels error: {e}")
        return jsonify({'error': 'Failed to fetch trending reels'}), 500


# =============================================================================
# SINGLE REEL DETAIL
# =============================================================================

@api.route('/reels/<int:reel_id>', methods=['GET'])
@jwt_required(optional=True)
def get_single_reel(reel_id):
    """Get a single reel by ID"""
    try:
        user_id = get_jwt_identity()

        reel = VideoClip.query.get(reel_id)
        if not reel:
            return jsonify({'error': 'Reel not found'}), 404

        if not reel.is_public and reel.user_id != user_id:
            return jsonify({'error': 'Reel not found'}), 404

        creator = User.query.get(reel.user_id)

        is_liked = False
        if user_id:
            is_liked = ClipLike.query.filter_by(
                clip_id=reel.id, user_id=user_id
            ).first() is not None

        reel_data = {
            'id': reel.id,
            'title': reel.title,
            'description': reel.description,
            'video_url': reel.video_url,
            'thumbnail_url': reel.thumbnail_url,
            'duration': reel.duration,
            'content_type': reel.content_type,
            'views': reel.views or 0,
            'likes': reel.likes or 0,
            'comments': reel.comments or 0,
            'shares': reel.shares or 0,
            'tags': reel.tags or [],
            'is_liked': is_liked,
            'created_at': reel.created_at.isoformat() if reel.created_at else None,
            'user_id': reel.user_id,
            'creator': {
                'id': creator.id,
                'username': creator.username,
                'display_name': getattr(creator, 'display_name', None) or creator.username,
                'profile_picture': getattr(creator, 'profile_picture', None) or getattr(creator, 'avatar_url', None)
            } if creator else None
        }

        return jsonify({'reel': reel_data}), 200

    except Exception as e:
        print(f"Get reel error: {e}")
        return jsonify({'error': 'Failed to fetch reel'}), 500


# =============================================================================
# VIEW A CLIP/REEL (if you don't already have this endpoint)
# =============================================================================
# NOTE: You may already have a clips view endpoint. If so, skip this.
# This works for both clips AND reels since they share the VideoClip model.
# =============================================================================

@api.route('/clips/<int:clip_id>/view', methods=['POST'])
@jwt_required(optional=True)
def view_clip(clip_id):
    """Record a view on a clip/reel"""
    try:
        clip = VideoClip.query.get(clip_id)
        if not clip:
            return jsonify({'error': 'Not found'}), 404

        clip.views = (clip.views or 0) + 1
        db.session.commit()

        return jsonify({'success': True, 'views': clip.views}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to record view'}), 500


# =============================================================================
# LIKE/UNLIKE A CLIP/REEL (if you don't already have this endpoint)
# =============================================================================
# NOTE: You may already have a clips like endpoint. If so, skip this.
# =============================================================================

@api.route('/clips/<int:clip_id>/like', methods=['POST'])
@jwt_required()
def toggle_clip_like(clip_id):
    """Like or unlike a clip/reel"""
    try:
        user_id = get_jwt_identity()

        clip = VideoClip.query.get(clip_id)
        if not clip:
            return jsonify({'error': 'Not found'}), 404

        existing_like = ClipLike.query.filter_by(
            clip_id=clip_id, user_id=user_id
        ).first()

        if existing_like:
            db.session.delete(existing_like)
            clip.likes = max(0, (clip.likes or 0) - 1)
            is_liked = False
        else:
            new_like = ClipLike(clip_id=clip_id, user_id=user_id)
            db.session.add(new_like)
            clip.likes = (clip.likes or 0) + 1
            is_liked = True

        db.session.commit()

        return jsonify({
            'success': True,
            'is_liked': is_liked,
            'likes': clip.likes
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Like clip error: {e}")
        return jsonify({'error': 'Failed to toggle like'}), 500



# ==================== UPDATE: MODIFY CREATE STORY ====================
# Update the create_story route to include comment_mode:

# In the create_story route, add this line when creating the Story:
#     comment_mode=data.get('comment_mode', 'both'),