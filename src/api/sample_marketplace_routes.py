"""
sample_marketplace_routes.py
StreamPireX — Sample Pack Marketplace API Routes

Endpoints:
  GET  /api/marketplace/packs              — browse/search packs
  POST /api/marketplace/packs              — creator uploads a new pack (multipart)
  GET  /api/marketplace/packs/<id>         — pack detail + presigned preview URLs
  POST /api/marketplace/packs/<id>/purchase — Stripe checkout for paid pack
  GET  /api/marketplace/my-library         — user's purchased/downloaded packs
  GET  /api/marketplace/my-packs           — creator's own packs + revenue stats
  DELETE /api/marketplace/packs/<id>       — creator deletes their pack

Storage: Zip files → R2 (streampirex-media/marketplace/<pack_id>/)
Platform fee: 10% StreamPireX, 90% creator
"""

import os
import uuid
import json
from datetime import datetime

import boto3
from botocore.client import Config
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from src.api.models import db, User, Subscription  # adjust import path as needed

marketplace_bp = Blueprint('marketplace', __name__)

# ---------------------------------------------------------------------------
# R2 client
# ---------------------------------------------------------------------------
R2_ENDPOINT   = os.environ.get('R2_ENDPOINT_URL', '')
R2_KEY        = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET     = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET     = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')
PLATFORM_FEE  = 0.10  # 10%

# s3 init moved to lazy loader
def get_s3():
    import os
    return boto3.client("s3", endpoint_url=os.environ.get("R2_ENDPOINT"), aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID"), aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY"), region_name="auto"),
    region_name='auto',
)

def r2_presigned_url(key, expiry=3600):
    try:
        return s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': R2_BUCKET, 'Key': key},
            ExpiresIn=expiry,
        )
    except Exception:
        return None

# ---------------------------------------------------------------------------
# In-memory store (replace with MarketplacePack DB model in production)
# ---------------------------------------------------------------------------
# DB model skeleton — add to your models.py:
#
# class MarketplacePack(db.Model):
#     __tablename__ = 'marketplace_packs'
#     id          = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     creator_id  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     name        = db.Column(db.String(128), nullable=False)
#     description = db.Column(db.Text)
#     genre       = db.Column(db.String(64))
#     mood        = db.Column(db.String(64))
#     price_usd   = db.Column(db.Float, default=0.0)
#     r2_key      = db.Column(db.String(256))        # zip file path in R2
#     preview_key = db.Column(db.String(256))        # preview audio path in R2
#     sample_count= db.Column(db.Integer, default=0)
#     downloads   = db.Column(db.Integer, default=0)
#     status      = db.Column(db.String(32), default='pending')  # pending|active|rejected
#     created_at  = db.Column(db.DateTime, default=datetime.utcnow)
#
# class MarketplacePurchase(db.Model):
#     __tablename__ = 'marketplace_purchases'
#     id         = db.Column(db.Integer, primary_key=True)
#     user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     pack_id    = db.Column(db.String(36), db.ForeignKey('marketplace_packs.id'), nullable=False)
#     amount_usd = db.Column(db.Float)
#     stripe_pi  = db.Column(db.String(128))
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ---------------------------------------------------------------------------
# GET /api/marketplace/packs
# ---------------------------------------------------------------------------
@marketplace_bp.route('/api/marketplace/packs', methods=['GET'])
def list_packs():
    genre  = request.args.get('genre')
    mood   = request.args.get('mood')
    search = request.args.get('q', '').lower()
    price  = request.args.get('price')  # 'free' | 'paid'
    sort   = request.args.get('sort', 'popular')
    page   = int(request.args.get('page', 1))
    limit  = min(int(request.args.get('limit', 20)), 50)

    # Replace with real DB query:
    # query = MarketplacePack.query.filter_by(status='active')
    # if genre: query = query.filter_by(genre=genre)
    # ...
    # packs = query.paginate(page=page, per_page=limit)

    return jsonify({
        'packs': [],  # replace with serialized query results
        'page': page,
        'total': 0,
    }), 200


# ---------------------------------------------------------------------------
# POST /api/marketplace/packs  (multipart/form-data)
# ---------------------------------------------------------------------------
@marketplace_bp.route('/api/marketplace/packs', methods=['POST'])
@jwt_required()
def create_pack():
    user_id = get_jwt_identity()
    name        = request.form.get('name', '').strip()
    description = request.form.get('description', '')
    genre       = request.form.get('genre', 'Other')
    mood        = request.form.get('mood', '')
    price_usd   = float(request.form.get('price', 0))
    zip_file    = request.files.get('file')

    if not name or not zip_file:
        return jsonify({'error': 'name and file are required'}), 400

    if price_usd < 0:
        return jsonify({'error': 'Price cannot be negative'}), 400

    pack_id = str(uuid.uuid4())
    r2_key  = f'marketplace/{pack_id}/pack.zip'

    try:
        s3.upload_fileobj(
            zip_file,
            R2_BUCKET,
            r2_key,
            ExtraArgs={'ContentType': 'application/zip'},
        )
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

    # Save to DB:
    # pack = MarketplacePack(id=pack_id, creator_id=user_id, name=name, ...)
    # db.session.add(pack)
    # db.session.commit()

    return jsonify({
        'message': 'Pack submitted for review',
        'pack_id': pack_id,
    }), 201


# ---------------------------------------------------------------------------
# GET /api/marketplace/packs/<pack_id>
# ---------------------------------------------------------------------------
@marketplace_bp.route('/api/marketplace/packs/<pack_id>', methods=['GET'])
def get_pack(pack_id):
    # pack = MarketplacePack.query.get_or_404(pack_id)
    # preview_url = r2_presigned_url(pack.preview_key) if pack.preview_key else None
    return jsonify({'pack_id': pack_id, 'preview_url': None}), 200


# ---------------------------------------------------------------------------
# POST /api/marketplace/packs/<pack_id>/purchase
# ---------------------------------------------------------------------------
@marketplace_bp.route('/api/marketplace/packs/<pack_id>/purchase', methods=['POST'])
@jwt_required()
def purchase_pack(pack_id):
    user_id = get_jwt_identity()

    # pack = MarketplacePack.query.get_or_404(pack_id)
    # if pack.price_usd == 0:  handle free download directly
    # else: create Stripe PaymentIntent

    # Free pack:
    # purchase = MarketplacePurchase(user_id=user_id, pack_id=pack_id, amount_usd=0)
    # db.session.add(purchase)
    # pack.downloads += 1
    # db.session.commit()
    # download_url = r2_presigned_url(pack.r2_key, expiry=300)

    # Paid pack (Stripe):
    # import stripe; stripe.api_key = os.environ['STRIPE_SECRET_KEY']
    # intent = stripe.PaymentIntent.create(
    #     amount=int(pack.price_usd * 100),
    #     currency='usd',
    #     metadata={'pack_id': pack_id, 'user_id': user_id},
    # )
    # return jsonify({'client_secret': intent.client_secret})

    return jsonify({
        'message': 'Purchase flow — wire Stripe here',
        'pack_id': pack_id,
        'platform_fee_pct': PLATFORM_FEE,
        'creator_pct': 1 - PLATFORM_FEE,
    }), 200


# ---------------------------------------------------------------------------
# GET /api/marketplace/my-library
# ---------------------------------------------------------------------------
@marketplace_bp.route('/api/marketplace/my-library', methods=['GET'])
@jwt_required()
def my_library():
    user_id = get_jwt_identity()
    # purchases = MarketplacePurchase.query.filter_by(user_id=user_id).all()
    # pack_ids = [p.pack_id for p in purchases]
    # packs = MarketplacePack.query.filter(MarketplacePack.id.in_(pack_ids)).all()
    return jsonify({'packs': []}), 200


# ---------------------------------------------------------------------------
# GET /api/marketplace/my-packs  (creator dashboard)
# ---------------------------------------------------------------------------
@marketplace_bp.route('/api/marketplace/my-packs', methods=['GET'])
@jwt_required()
def my_packs():
    user_id = get_jwt_identity()
    # packs = MarketplacePack.query.filter_by(creator_id=user_id).all()
    # total_revenue = sum(p.price_usd * (1 - PLATFORM_FEE) * ... downloads ... for p in packs)
    return jsonify({'packs': [], 'total_revenue': 0.0}), 200


# ---------------------------------------------------------------------------
# DELETE /api/marketplace/packs/<pack_id>
# ---------------------------------------------------------------------------
@marketplace_bp.route('/api/marketplace/packs/<pack_id>', methods=['DELETE'])
@jwt_required()
def delete_pack(pack_id):
    user_id = get_jwt_identity()
    # pack = MarketplacePack.query.get_or_404(pack_id)
    # if str(pack.creator_id) != str(user_id): return 403
    # s3.delete_object(Bucket=R2_BUCKET, Key=pack.r2_key)
    # db.session.delete(pack)
    # db.session.commit()
    return jsonify({'message': 'Pack deleted'}), 200
