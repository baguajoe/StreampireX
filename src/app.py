# ✅ Monkey patch must come FIRST — before ANY other imports
import eventlet
eventlet.monkey_patch()

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_migrate import Migrate
from flask_mail import Mail, Message
from flask_jwt_extended import JWTManager, decode_token, exceptions as jwt_exceptions
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from api.routes import api
from api.models import db, LiveChat, User
from api.utils import APIException, generate_sitemap
from api.admin import setup_admin
from api.commands import setup_commands
import cloudinary

# ✅ Cloudinary config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# ✅ App config
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../public/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# ✅ CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
additional_origins = os.getenv("ADDITIONAL_ORIGINS", "").split(",") if os.getenv("ADDITIONAL_ORIGINS") else []
allowed_origins = [FRONTEND_URL] + additional_origins
CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)
if ENV == "development":
    print(f"CORS enabled for: {allowed_origins}")

# ✅ JWT
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 7 * 24 * 60 * 60 * 52  # ~1 year
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
JWTManager(app)

# ✅ Database
db_url = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://") if db_url else "sqlite:////tmp/test.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# ✅ Mail
app.config.update({
    'MAIL_SERVER': 'smtp.gmail.com',
    'MAIL_PORT': 587,
    'MAIL_USE_TLS': True,
    'MAIL_USE_SSL': False,
    'MAIL_USERNAME': os.getenv("MAIL_USERNAME"),
    'MAIL_PASSWORD': os.getenv("MAIL_PASSWORD"),
    'MAIL_DEFAULT_SENDER': os.getenv("MAIL_USERNAME"),
})
mail = Mail(app)

# ✅ Admin / CLI / Blueprints
setup_admin(app)
setup_commands(app)
app.register_blueprint(api, url_prefix='/api')

# ✅ Error Handling
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response

def send_email(recipient, subject, body):
    try:
        msg = Message(subject, recipients=[recipient])
        msg.body = body
        mail.send(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise ValueError("Failed to send email.")

# ✅ SocketIO setup with heartbeat
socketio = SocketIO(
    app,
    cors_allowed_origins=allowed_origins,
    ping_interval=25,  # keep-alive every 25s
    ping_timeout=60
)

connected_users = {}
listener_count = 0

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
        "username": user.username
    })

# ✅ Optional: socket error handler
@socketio.on_error_default
def default_error_handler(e):
    print(f"SocketIO error: {e}")

# ✅ Run the app with eventlet
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True)
