# src/app.py
# ✅ Monkey patch must come FIRST — before ANY other imports
import eventlet
eventlet.monkey_patch()
import sys
import os

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

# ✅ Create socketio instance here (not importing from api module)
socketio = SocketIO()

# Import your blueprints - FIXED: Remove the conflicting socketio import
from api.routes import api
from api.cache import cache
from api.models import db, LiveChat, User, RadioStation
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

# ✅ Setup migrations, admin, commands
Migrate(app, db, compare_type=True)
setup_admin(app)
setup_commands(app)

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
def handle_disconnect():
    global listener_count
    user_id = connected_users.pop(request.sid, None)
    listener_count = max(listener_count - 1, 0)
    print(f"{user_id} disconnected (sid={request.sid})")
    emit('listener_count', {'count': listener_count}, broadcast=True)

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

# ✅ Run the app
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True)