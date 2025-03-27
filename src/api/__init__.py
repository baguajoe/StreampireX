from flask import Blueprint

# Create a Blueprint instance for your API routes
api = Blueprint('api', __name__)

# Import your routes *after* the Blueprint is created to avoid circular imports
from api import routes
