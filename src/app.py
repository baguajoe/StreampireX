
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_migrate import Migrate
from flask_mail import Mail, Message
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from api.routes import api
from api.models import db
from api.utils import APIException, generate_sitemap
from api.admin import setup_admin
from api.commands import setup_commands
import os
import cloudinary

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)




# Flask app setup
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../public/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# Get frontend URL from environment or fallback
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Add additional origins if needed
additional_origins = []
if os.getenv("ADDITIONAL_ORIGINS"):
    additional_origins = os.getenv("ADDITIONAL_ORIGINS").split(",")

# Combine allowed origins for CORS
allowed_origins = [FRONTEND_URL] + additional_origins
CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)

if os.getenv("FLASK_DEBUG") == "1":
    print(f"CORS enabled for origins: {allowed_origins}")

# JWT Setup
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 7 * 24 * 60 * 60 * 52  # ~1 year
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
JWTManager(app)

# Database setup
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace("postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# Flask-Mail setup
app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # Example for Gmail, use your mail server details
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = os.getenv("MAIL_USERNAME")

mail = Mail(app)

# Admin and CLI
setup_admin(app)
setup_commands(app)

# API Blueprint
app.register_blueprint(api, url_prefix='/api')

# Error Handling
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# Sitemap route (dev only)
@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# Static file serving
@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0  # disable cache
    return response

# Email function
def send_email(recipient, subject, body):
    try:
        msg = Message(subject, recipients=[recipient])
        msg.body = body
        mail.send(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise ValueError("Failed to send email.")

# SocketIO for real-time interactions
socketio = SocketIO(app)

listener_count = 0

@socketio.on('connect')
def handle_connect():
    global listener_count
    listener_count += 1
    emit('listener_count', {'count': listener_count})

@socketio.on('disconnect')
def handle_disconnect():
    global listener_count
    listener_count -= 1
    emit('listener_count', {'count': listener_count})

@socketio.on('track_time')
def track_time(data):
    # Logic to track time spent by listeners (data could contain time info)
    pass

# Entry point
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True)
