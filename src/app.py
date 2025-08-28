# src/app.py
# ✅ Monkey patch must come FIRST — before ANY other imports
import eventlet
eventlet.monkey_patch()
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Access the SonoSuite config variables
SONOSUITE_SHARED_SECRET = os.getenv("SONOSUITE_SHARED_SECRET")
SONOSUITE_BASE_URL = os.getenv("SONOSUITE_BASE_URL", "https://streampirex.sonosuite.com")

src_dir = os.path.dirname(os.path.abspath(__file__))
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from flask import Flask, request, jsonify, send_from_directory, Response
from flask_migrate import Migrate
from flask_mail import Mail, Message
from flask_jwt_extended import JWTManager, decode_token, exceptions as jwt_exceptions
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_caching import Cache
from flask_apscheduler import APScheduler
import cloudinary
import click
from flask.cli import with_appcontext

# ✅ Create socketio instance here (not importing from api module)
socketio = SocketIO()

# Import your blueprints - FIXED: Remove the conflicting socketio import
from api.routes import api
from api.cache import cache
from api.models import db, LiveChat, User, RadioStation,PricingPlan, SonoSuiteUser
from api.utils import APIException, generate_sitemap
from api.admin import setup_admin
from api.commands import setup_commands

# ✅ Environment setup
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../public/')

# ✅ Create Flask app
app = Flask(__name__)

# Initialize scheduler with the app
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

from dotenv import load_dotenv
load_dotenv()

app.url_map.strict_slashes = False

# ✅ Configuration
app.config.update({
    "JWT_ACCESS_TOKEN_EXPIRES": 7 * 24 * 60 * 60 * 52,  # ~1 year
    "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY"),
    "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    "MAIL_SERVER": 'smtp.gmail.com',
    "MAIL_PORT": 587,
    "MAIL_USE_TLS": True,
    "MAIL_USE_SSL": False,
    "MAIL_USERNAME": os.getenv("MAIL_USERNAME"),
    "MAIL_PASSWORD": os.getenv("MAIL_PASSWORD"),
    "MAIL_DEFAULT_SENDER": os.getenv("MAIL_USERNAME"),
    "CACHE_TYPE": "SimpleCache"  # Fix the cache warning
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

# ✅ Initialize cache - FIXED: Use the config from app.config
cache_instance = Cache(app)
cache.init_app(app)
app.cache = cache_instance  # Make cache available to routes

# ✅ CORS setup
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
additional_origins = os.getenv("ADDITIONAL_ORIGINS", "").split(",") if os.getenv("ADDITIONAL_ORIGINS") else []
allowed_origins = [FRONTEND_URL] + [origin for origin in additional_origins if origin]

CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)
if ENV == "development":
    print(f"CORS enabled for: {allowed_origins}")

# ✅ Third-party service configuration
# Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

@click.command()
@with_appcontext
def init_pricing():
    """Initialize pricing plans with your exact pricing structure"""
    
    # Create tables if they don't exist
    db.create_all()
    
    # Clear existing plans (optional - remove if you want to keep existing data)
    # PricingPlan.query.delete()
    
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
            # Update existing plan
            for key, value in plan_data.items():
                setattr(existing_plan, key, value)
            print(f"✅ Updated {plan_data['name']} plan")
    
    try:
        db.session.commit()
        print("✅ All pricing plans initialized successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")

# Register the command
def register_commands(app):
    app.cli.add_command(init_pricing)

# ✅ Setup migrations, admin, commands
Migrate(app, db, compare_type=True)
setup_admin(app)
setup_commands(app)
register_commands(app)


# ✅ Register blueprints
app.register_blueprint(api, url_prefix='/api')

# ✅ SocketIO setup - FIXED: Use the socketio instance created above
socketio.init_app(
    app,
    cors_allowed_origins=allowed_origins,
    ping_interval=25,
    ping_timeout=60
)

# ✅ Make socketio available to other modules
app.socketio = socketio

# ✅ Global variables for socket management
connected_users = {}
listener_count = 0

# ✅ Socket event handlers
@socketio.on('connect')
def on_connect(auth):
    global listener_count

    token = auth.get('token') if auth else request.args.get('token', None)
    if not token:
        return False

    try:
        decoded = decode_token(token)
        user_identity = decoded['sub']
    except (jwt_exceptions.NoAuthorizationError, jwt_exceptions.JWTDecodeError):
        return False

    connected_users[request.sid] = user_identity
    listener_count += 1
    print(f"{user_identity} connected with sid={request.sid}")

    emit('welcome', {'msg': f'hello, {user_identity}'})
    emit('listener_count', {'count': listener_count}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():  # Remove any parameters here
    global listener_count
    user_id = connected_users.pop(request.sid, None)
    listener_count = max(listener_count - 1, 0)
    print(f"{user_id} disconnected (sid={request.sid})")
    emit('listener_count', {'count': listener_count}, broadcast=True)

# Add these WebRTC socket event handlers after your existing handlers

@socketio.on('join_webrtc_room')
def on_join_webrtc_room(data):
    """Handle users joining WebRTC rooms"""
    from flask_socketio import join_room, emit
    room_id = data.get('roomId')
    user_id = data.get('userId')
    user_name = data.get('userName')
    
    join_room(f'webrtc_{room_id}')
    
    # Notify other users in the room
    emit('user-joined', {
        'userId': user_id,
        'userName': user_name
    }, room=f'webrtc_{room_id}', include_self=False)
    
    print(f"User {user_name} joined WebRTC room: {room_id}")

@socketio.on('leave_webrtc_room')
def on_leave_webrtc_room(room_id):
    """Handle users leaving WebRTC rooms"""
    from flask_socketio import leave_room, emit
    
    user_id = connected_users.get(request.sid)
    leave_room(f'webrtc_{room_id}')
    
    # Notify other users in the room
    emit('user-left', {
        'userId': user_id
    }, room=f'webrtc_{room_id}')
    
    print(f"User {user_id} left WebRTC room: {room_id}")

@socketio.on('webrtc-offer')
def on_webrtc_offer(data):
    """Handle WebRTC offers"""
    from flask_socketio import emit
    room_id = data.get('roomId')
    offer = data.get('offer')
    from_user = data.get('from')
    
    emit('webrtc-offer', {
        'offer': offer,
        'from': from_user
    }, room=f'webrtc_{room_id}', include_self=False)

@socketio.on('webrtc-answer')
def on_webrtc_answer(data):
    """Handle WebRTC answers"""
    from flask_socketio import emit
    room_id = data.get('roomId')
    answer = data.get('answer')
    from_user = data.get('from')
    
    emit('webrtc-answer', {
        'answer': answer,
        'from': from_user
    }, room=f'webrtc_{room_id}', include_self=False)

@socketio.on('webrtc-ice-candidate')
def on_webrtc_ice_candidate(data):
    """Handle WebRTC ICE candidates"""
    from flask_socketio import emit
    room_id = data.get('roomId')
    candidate = data.get('candidate')
    from_user = data.get('from')
    
    emit('webrtc-ice-candidate', {
        'candidate': candidate,
        'from': from_user
    }, room=f'webrtc_{room_id}', include_self=False)

@socketio.on('send_message')
def handle_message(data):
    sid = request.sid
    user_id = connected_users.get(sid)

    if not user_id:
        print("Unauthorized socket message attempt")
        return

    stream_id = data.get('stream_id')
    message = data.get('message')
    if not stream_id or not message:
        print("Missing stream_id or message")
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

@socketio.on('live_status_update')
def handle_live_status_update(data):
    """Handle live status updates for radio stations"""
    station_id = data.get("stationId")
    is_live = data.get("isLive")
    
    # Update station in database
    station = RadioStation.query.get(station_id)
    if station:
        station.is_live = is_live
        db.session.commit()
        
        # Broadcast to all clients listening to this station
        socketio.emit('station_status_update', {
            'station_id': station_id,
            'is_live': is_live,
            'station_name': station.name
        }, room=f'radio_station_{station_id}')

@socketio.on('join_radio_station')
def on_join_radio_station(data):
    """User joins radio station for real-time updates"""
    from flask_socketio import join_room
    station_id = data.get('station_id')
    join_room(f'radio_station_{station_id}')
    
    # Send current status
    station = RadioStation.query.get(station_id)
    if station:
        emit('radio_status_update', {
            'station': station.serialize() if hasattr(station, 'serialize') else {'id': station.id, 'name': station.name},
            'now_playing': getattr(station, 'now_playing_metadata', None),
            'listener_count': listener_count
        })

@socketio.on_error_default
def default_error_handler(e):
    print(f"SocketIO error: {e}")

# ✅ Error handlers
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# ✅ Basic routes
@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

@app.route('/<path:path>')
def serve_any_other_file(path):
    # Don't serve frontend for API routes
    if path.startswith('api/'):
        from flask import abort
        abort(404)
    
    # Don't override requests to Flask static assets
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
        print(os.getenv("BA_USERNAME"))
        auth = request.authorization
        if not auth or not (auth.username == os.getenv("BA_USERNAME") and auth.password == os.getenv("BA_PASSWORD")):
            return Response(
            'Could not verify your access level for that URL.\n'
            'You have to login with proper credentials', 401,
            {'WWW-Authenticate': 'Basic realm="Login Required"'})
        
# Usage: flask init-pricing

# ✅ Run the app
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True)