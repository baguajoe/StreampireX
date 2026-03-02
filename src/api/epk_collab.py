# =============================================================================
# epk_collab.py — EPK Builder + Collab Marketplace API
# =============================================================================
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import json

epk_collab_bp = Blueprint('epk_collab', __name__)

# =============================================================================
# MODELS — Add to models.py (copy these 3 classes)
# =============================================================================
"""
# Models imported from models.py (consolidated to fix mapper registry)
from src.api.models import EPK, CollabRequest, CollabApplication
