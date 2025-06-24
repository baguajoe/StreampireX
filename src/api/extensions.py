

from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect()

db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*")
