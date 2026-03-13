import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User

collab_marketplace_bp = Blueprint('collab_marketplace', __name__)

@collab_marketplace_bp.route('/api/collab-marketplace/listings', methods=['GET'])
def list_services():
    return jsonify({'listings': [], 'message': 'Collab Marketplace coming soon'}), 200

@collab_marketplace_bp.route('/api/collab-marketplace/listings', methods=['POST'])
@jwt_required()
def create_listing():
    return jsonify({'message': 'Listing endpoint ready'}), 200
