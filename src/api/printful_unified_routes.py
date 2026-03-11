from flask import Blueprint, request, jsonify
import requests
import os
from src.api.models import db, User, Product
from flask_jwt_extended import jwt_required, get_jwt_identity

printful_unified_bp = Blueprint('printful_unified', __name__)

PRINTFUL_API_URL = "https://api.printful.com"

def get_headers(user):
    return {
        "Authorization": f"Bearer {user.printful_access_token}",
        "Content-Type": "application/json"
    }

@printful_unified_bp.route('/api/printful/catalog', methods=['GET'])
@jwt_required()
def get_catalog():
    # Fetch base products from Printful
    response = requests.get(f"{PRINTFUL_API_URL}/products")
    return jsonify(response.json()), response.status_code

@printful_unified_bp.route('/api/printful/mockup', methods=['POST'])
@jwt_required()
def generate_mockup():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json # product_id, variant_ids, imageUrl
    
    payload = {
        "variant_ids": data.get("variant_ids"),
        "format": "jpg",
        "files": [{"placement": "front", "image_url": data.get("imageUrl")}]
    }
    
    res = requests.post(
        f"{PRINTFUL_API_URL}/mockup-generator/create-task/{data.get('product_id')}",
        json=payload, headers=get_headers(user)
    )
    return jsonify(res.json()), res.status_code

@printful_unified_bp.route('/api/printful/publish', methods=['POST'])
@jwt_required()
def publish_product():
    user_id = get_jwt_identity()
    data = request.json
    
    new_product = Product(
        creator_id=user_id,
        title=data.get("title"),
        price=data.get("price"),
        image_url=data.get("mockup_url"),
        is_printful=True,
        printful_product_id=str(data.get("printful_id"))
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({"msg": "Product published to StreampireX"}), 201
