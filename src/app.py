# src/app.py - FIXED VERSION
# ✅ Monkey patch must come FIRST — before ANY other imports
import eventlet
eventlet.monkey_patch()

import sys
import os

# ✅ CRITICAL: Add parent directory to path BEFORE any local imports
src_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(src_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# ✅ CRITICAL: Add JWT_SECRET_KEY if missing
if not os.getenv("JWT_SECRET_KEY"):
    os.environ["JWT_SECRET_KEY"] = "your-super-secret-jwt-key-fallback-dev-only"
    print("⚠️  JWT_SECRET_KEY not found, using fallback (SET THIS IN PRODUCTION!)")

# ✅ NOW import from src - path is set up
from src.api.email_service import init_mail
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_migrate import Migrate
from flask_mail import Mail, Message as MailMessage
from flask_jwt_extended import JWTManager, decode_token, exceptions as jwt_exceptions
from flask_cors import CORS
from flask_socketio import emit, join_room
from flask_caching import Cache
from flask_apscheduler import APScheduler
import cloudinary
import click
from flask.cli import with_appcontext
from src.api.ai_mastering import ai_mastering_bp
from src.api.ai_mastering_phase3 import ai_mastering_phase3_bp
from src.api.ai_radio_dj import ai_radio_dj_bp
from src.api.ai_content_routes import ai_content_bp
from src.api.recording_studio_routes import recording_studio_bp

# Import your blueprints - use src prefix
from src.api.routes import api
from src.api.cache import cache
from src.api.models import LiveChat, User, RadioStation, PricingPlan, SonoSuiteUser, Message, Conversation, MicSimPreset, MicSimRecording
from src.api.sound_kit_models import SoundKit, SoundKitSample, SoundKitLike  # 🎛️ Sound Kit Models
from src.api.utils import APIException, generate_sitemap
from src.api.admin import setup_admin
from src.api.commands import setup_commands
from src.api.socketio import init_socketio
from src.api.extensions import db
from src.api.messages_routes import messages_bp  # Add src. prefix 
from src.api.video_editor_routes import video_editor_bp
from src.api.follow_routes import follow_bp  # ADD THIS
from src.api.video_tier_routes import video_tier_bp  # ADD THIS
from src.api.notifications import notifications_bp
from src.api.ai_mix_assistant import ai_mix_assistant_bp
from src.api.ai_stem_separation import ai_stem_separation_bp
from src.api.mic_simulator_routes import mic_simulator_bp  # 🎙️ Mic Simulator
from src.api.freesound_api import freesound_bp  # 🔊 Freesound.org Sample Browser
from src.api.sound_kit_routes import sound_kit_bp  # 🎛️ Sound Kit Management


# Rest of your code stays the same...

# ✅ Environment setup
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../public/')

# ✅ Create Flask app
app = Flask(__name__)

# Initialize scheduler
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

init_mail(app)

app.url_map.strict_slashes = False

# ✅ FIXED Configuration - Add missing JWT_SECRET_KEY
app.config.update({
    "JWT_ACCESS_TOKEN_EXPIRES": 7 * 24 * 60 * 60 * 52,  # ~1 year
    "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY", "fallback-secret-key-dev-only"),
    "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    "MAIL_SERVER": 'smtp.gmail.com',
    "MAIL_PORT": 587,
    "MAIL_USE_TLS": True,
    "MAIL_USE_SSL": False,
    "MAIL_USERNAME": os.getenv("MAIL_USERNAME"),
    "MAIL_PASSWORD": os.getenv("MAIL_PASSWORD"),
    "MAIL_DEFAULT_SENDER": os.getenv("MAIL_USERNAME"),
    "CACHE_TYPE": "SimpleCache"
})

# ✅ Database configuration
db_url = os.getenv("DATABASE_URL")
if db_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

# ✅ Initialize extensions
db.init_app(app)
JWTManager(app)
mail = Mail(app)

# ✅ Initialize cache
cache_instance = Cache(app)
cache.init_app(app)
app.cache = cache_instance

# ✅ FIXED CORS setup - Handle both HTTP and HTTPS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
additional_origins = os.getenv("ADDITIONAL_ORIGINS", "").split(",") if os.getenv("ADDITIONAL_ORIGINS") else []
allowed_origins = [FRONTEND_URL] + [origin.strip() for origin in additional_origins if origin.strip()]

# Add HTTP versions for development
http_origins = []
for origin in allowed_origins:
    if origin.startswith("https://"):
        http_origins.append(origin.replace("https://", "http://"))

all_origins = allowed_origins + http_origins

CORS(app, resources={
    r"/*": {
        "origins": all_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"]
    }
}, supports_credentials=True)

if ENV == "development":
    print(f"CORS enabled for: {all_origins}")

# ✅ Third-party service configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# ✅ Pricing initialization command
@click.command()
@with_appcontext
def init_pricing():
    """Initialize pricing plans"""
    db.create_all()
    
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
            "includes_tip_jar": False,
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
            "name": "Basic",
            "price_monthly": 11.99,
            "price_yearly": 119.00,
            "trial_days": 14,
            "includes_podcasts": False,
            "includes_radio": False,
            "includes_digital_sales": False,
            "includes_merch_sales": False,
            "includes_live_events": False,
            "includes_tip_jar": False,
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
            "name": "Pro",
            "price_monthly": 21.99,
            "price_yearly": 219.00,
            "trial_days": 14,
            "includes_podcasts": True,
            "includes_radio": True,
            "includes_digital_sales": True,
            "includes_merch_sales": False,
            "includes_live_events": True,
            "includes_tip_jar": True,
            "includes_ad_revenue": True,
            "includes_music_distribution": True,
            "sonosuite_access": True,
            "distribution_uploads_limit": 5,
            "includes_gaming_features": True,
            "includes_team_rooms": True,
            "includes_squad_finder": True,
            "includes_gaming_analytics": True,
            "includes_game_streaming": True,
            "includes_gaming_monetization": True,
            "includes_video_distribution": True,
            "video_uploads_limit": 3
        },
        {
            "name": "Premium",
            "price_monthly": 29.99,
            "price_yearly": 299.00,
            "trial_days": 14,
            "includes_podcasts": True,
            "includes_radio": True,
            "includes_digital_sales": True,
            "includes_merch_sales": True,
            "includes_live_events": True,
            "includes_tip_jar": True,
            "includes_ad_revenue": True,
            "includes_music_distribution": True,
            "sonosuite_access": True,
            "distribution_uploads_limit": -1,  # Unlimited
            "includes_gaming_features": True,
            "includes_team_rooms": True,
            "includes_squad_finder": True,
            "includes_gaming_analytics": True,
            "includes_game_streaming": True,
            "includes_gaming_monetization": True,
            "includes_video_distribution": True,
            "video_uploads_limit": -1  # Unlimited
        }
    ]
    
    for plan_data in plans_data:
        existing_plan = PricingPlan.query.filter_by(name=plan_data["name"]).first()
        if not existing_plan:
            plan = PricingPlan(**plan_data)
            db.session.add(plan)
            print(f"✅ Created {plan_data['name']} plan")
        else:
            for key, value in plan_data.items():
                setattr(existing_plan, key, value)
            print(f"✅ Updated {plan_data['name']} plan")
    
    try:
        db.session.commit()
        print("✅ All pricing plans initialized successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")

def register_commands(app):
    app.cli.add_command(init_pricing)

# ✅ Setup migrations, admin, commands
Migrate(app, db, compare_type=True)
setup_admin(app)
setup_commands(app)
register_commands(app)

# ✅ Register blueprints
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(messages_bp)
app.register_blueprint(video_editor_bp)
app.register_blueprint(follow_bp) 
app.register_blueprint(video_tier_bp, url_prefix='/api')  # ADD THIS
app.register_blueprint(notifications_bp)
app.register_blueprint(ai_mastering_bp)
app.register_blueprint(ai_mastering_phase3_bp)
app.register_blueprint(ai_radio_dj_bp)
app.register_blueprint(ai_content_bp)
app.register_blueprint(recording_studio_bp)
app.register_blueprint(ai_mix_assistant_bp)
app.register_blueprint(ai_stem_separation_bp)
app.register_blueprint(mic_simulator_bp)  # 🎙️ Mic Simulator
app.register_blueprint(freesound_bp)  # 🔊 Freesound.org Sample Browser
app.register_blueprint(sound_kit_bp)  # 🎛️ Sound Kit Management

# ✅ Initialize WebRTC SocketIO from separate module
socketio = init_socketio(app)
app.socketio = socketio

# ✅ Global variables for socket management
connected_users = {}
listener_count = 0

# ✅ Socket event handlers FOR LIVE STREAMING
@socketio.on('connect')
def on_connect(auth):
    global listener_count

    token = auth.get('token') if auth else request.args.get('token', None)
    if not token:
        print("❌ No token provided for socket connection")
        return False

    try:
        decoded = decode_token(token)
        user_identity = decoded['sub']
    except (jwt_exceptions.NoAuthorizationError, jwt_exceptions.JWTDecodeError) as e:
        print(f"❌ JWT decode error: {e}")
        return False

    connected_users[request.sid] = user_identity
    listener_count += 1
    print(f"✅ {user_identity} connected with sid={request.sid}")

    emit('welcome', {'msg': f'Hello, {user_identity}'})
    emit('listener_count', {'count': listener_count}, broadcast=True)
    
@socketio.on('disconnect')
def handle_disconnect(auth):
    global listener_count
    user_id = connected_users.pop(request.sid, None)
    listener_count = max(listener_count - 1, 0)
    print(f"❌ {user_id} disconnected (sid={request.sid})")
    emit('listener_count', {'count': listener_count}, broadcast=True)

@socketio.on('send_message')
def handle_message(data):
    sid = request.sid
    user_id = connected_users.get(sid)

    if not user_id:
        print("❌ Unauthorized socket message attempt")
        return

    stream_id = data.get('stream_id')
    message = data.get('message')
    if not stream_id or not message:
        print("❌ Missing stream_id or message")
        return

    new_message = LiveChat(user_id=user_id, message=message)
    db.session.add(new_message)
    db.session.commit()
    user = User.query.get(user_id)

    socketio.emit('receive_message', {
        "user_id": user_id,
        "stream_id": stream_id,
        "message": message,
        "username": user.username if user else "Unknown"
    })

# ✅ NEW: Socket handlers FOR DIRECT MESSAGING
@socketio.on('join_user_room')
def join_user_room():
    """Join a room for receiving direct messages"""
    user_id = connected_users.get(request.sid)
    if user_id:
        join_room(f'user_{user_id}')
        print(f"✅ User {user_id} joined their message room")

@socketio.on('send_direct_message')
def handle_direct_message(data):
    """Handle real-time direct messaging"""
    sender_id = connected_users.get(request.sid)
    if not sender_id:
        print("❌ Unauthorized direct message attempt")
        return
    
    conversation_id = data.get('conversation_id')
    content = data.get('content')
    
    if not conversation_id or not content:
        print("❌ Missing conversation_id or content")
        return
    
    try:
        # Save to database using YOUR models
        new_message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content
        )
        db.session.add(new_message)
        db.session.commit()
        
        # Get recipient from conversation
        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            print(f"❌ Conversation {conversation_id} not found")
            return
            
        recipient_id = conversation.user2_id if conversation.user1_id == sender_id else conversation.user1_id
        
        # Emit to recipient in real-time
        socketio.emit('new_message', {
            'id': new_message.id,
            'sender_id': sender_id,
            'content': content,
            'timestamp': new_message.timestamp.isoformat(),
            'conversation_id': conversation_id,
            'is_read': False
        }, room=f'user_{recipient_id}')
        
        print(f"✅ Direct message sent from {sender_id} to {recipient_id}")
        
    except Exception as e:
        print(f"❌ Error sending direct message: {e}")
        db.session.rollback()

@socketio.on_error_default
def default_error_handler(e):
    print(f"❌ SocketIO error: {e}")

# ✅ Error handlers
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# ✅ Health check endpoint
@app.route("/health")
def health():
    return jsonify({
        "ok": True, 
        "status": "healthy",
        "env": ENV,
        "port": os.getenv('PORT', '3001')
    }), 200

# ✅ Basic routes
@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

@app.route('/<path:path>')
def serve_any_other_file(path):
    if path.startswith('api/'):
        from flask import abort
        abort(404)
    
    if path.startswith("static/"):
        return send_from_directory(app.static_folder, path)

    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response

@app.before_request
def restrict_admin_to_basic_auth():
    if request.path.startswith('/admin'):
        auth = request.authorization
        expected_username = os.getenv("BA_USERNAME")
        expected_password = os.getenv("BA_PASSWORD")
        
        # Debug logging
        print(f"🔐 Admin login attempt:")
        print(f"   Expected username: '{expected_username}'")
        print(f"   Expected password: '{expected_password}'")
        print(f"   Received username: '{auth.username if auth else 'None'}'")
        print(f"   Auth object: {auth}")
        
        if not auth or not (auth.username == expected_username and auth.password == expected_password):
            return Response(
                'Could not verify your access level for that URL.\n'
                'You have to login with proper credentials', 401,
                {'WWW-Authenticate': 'Basic realm="Login Required"'})

# ✅ FIXED: Run the app with better error handling
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    
    print(f"🚀 Starting SpectraSphere on port {PORT}")
    print(f"🌍 Environment: {ENV}")
    print(f"🔗 Backend URL: {os.getenv('BACKEND_URL')}")
    print(f"🔗 Frontend URL: {os.getenv('FRONTEND_URL')}")
    print(f"🗄️  Database: {'PostgreSQL' if 'postgresql' in app.config['SQLALCHEMY_DATABASE_URI'] else 'SQLite'}")
    
    try:
        # Create tables
        with app.app_context():
            db.create_all()
            print("✅ Database tables created/verified")
    except Exception as e:
        print(f"⚠️  Database setup warning: {e}")
    
    # Run with SocketIO
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=PORT, 
        debug=ENV == "development",
        use_reloader=False  # Disable reloader to prevent issues
    )