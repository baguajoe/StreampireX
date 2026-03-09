"""
collab_marketplace_routes.py
StreamPireX — Hire-a-Pro Collab Marketplace API Routes

Endpoints:
  GET  /api/collab-marketplace/services             — browse/search services
  POST /api/collab-marketplace/services             — creator lists a service
  GET  /api/collab-marketplace/services/<id>        — service detail
  PUT  /api/collab-marketplace/services/<id>        — creator updates their service
  DELETE /api/collab-marketplace/services/<id>      — creator removes service
  POST /api/collab-marketplace/book/<service_id>    — buyer books a service
  GET  /api/collab-marketplace/my-orders            — buyer's order history
  GET  /api/collab-marketplace/my-services          — creator's listings + revenue
  PATCH /api/collab-marketplace/orders/<id>/status  — creator updates order status

Platform fee: 15% StreamPireX, 85% creator
Payments: Stripe (escrow released on delivery confirmation)
"""

import os
import uuid
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

# from models import db, User
# from models import CollabService, CollabOrder  # add to models.py

collab_marketplace_bp = Blueprint('collab_marketplace', __name__)

R2_BUCKET = os.environ.get("R2_BUCKET_NAME", "streampirex-media")
PLATFORM_FEE = 0.10

def get_s3():
    import boto3
    from botocore.client import Config
    return boto3.client(
        's3',
        endpoint_url=os.environ.get('R2_ENDPOINT_URL') or os.environ.get('R2_ENDPOINT', ''),
        aws_access_key_id=os.environ.get('R2_ACCESS_KEY_ID', ''),
        aws_secret_access_key=os.environ.get('R2_SECRET_ACCESS_KEY', ''),
        config=Config(signature_version='s3v4'),
        region_name='auto',
    )



# ---------------------------------------------------------------------------
# DB Model skeletons — add to models.py
# ---------------------------------------------------------------------------
# class CollabService(db.Model):
#     __tablename__ = 'collab_services'
#     id           = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     creator_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     title        = db.Column(db.String(200), nullable=False)
#     role         = db.Column(db.String(64))         # Producer, Mix Engineer, etc.
#     genre        = db.Column(db.String(64))
#     bio          = db.Column(db.Text)
#     price_usd    = db.Column(db.Float, nullable=False)
#     turnaround   = db.Column(db.Integer)            # days
#     includes     = db.Column(db.JSON)               # list of strings
#     portfolio    = db.Column(db.JSON)               # list of R2 URLs
#     rating       = db.Column(db.Float, default=0.0)
#     review_count = db.Column(db.Integer, default=0)
#     online       = db.Column(db.Boolean, default=False)
#     active       = db.Column(db.Boolean, default=True)
#     created_at   = db.Column(db.DateTime, default=datetime.utcnow)
#
# class CollabOrder(db.Model):
#     __tablename__ = 'collab_orders'
#     id           = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     service_id   = db.Column(db.String(36), db.ForeignKey('collab_services.id'))
#     buyer_id     = db.Column(db.Integer, db.ForeignKey('user.id'))
#     creator_id   = db.Column(db.Integer, db.ForeignKey('user.id'))
#     amount_usd   = db.Column(db.Float)
#     platform_fee = db.Column(db.Float)
#     creator_gets = db.Column(db.Float)
#     note         = db.Column(db.Text)
#     status       = db.Column(db.String(32), default='pending')
#                   # pending | in_progress | delivered | complete | cancelled
#     stripe_pi    = db.Column(db.String(128))
#     due_date     = db.Column(db.DateTime)
#     created_at   = db.Column(db.DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# GET /api/collab-marketplace/services
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/services', methods=['GET'])
def list_services():
    role   = request.args.get('role')
    genre  = request.args.get('genre')
    min_p  = request.args.get('min_price', type=float)
    max_p  = request.args.get('max_price', type=float)
    sort   = request.args.get('sort', 'rating')   # rating | price | turnaround | reviews
    search = request.args.get('q', '').lower()
    page   = int(request.args.get('page', 1))
    limit  = min(int(request.args.get('limit', 20)), 50)

    # query = CollabService.query.filter_by(active=True)
    # if role:  query = query.filter_by(role=role)
    # if genre: query = query.filter_by(genre=genre)
    # if min_p: query = query.filter(CollabService.price_usd >= min_p)
    # if max_p: query = query.filter(CollabService.price_usd <= max_p)
    # if sort == 'rating':     query = query.order_by(CollabService.rating.desc())
    # elif sort == 'price':    query = query.order_by(CollabService.price_usd.asc())
    # elif sort == 'reviews':  query = query.order_by(CollabService.review_count.desc())
    # services = query.paginate(page=page, per_page=limit)

    return jsonify({'services': [], 'page': page, 'total': 0}), 200


# ---------------------------------------------------------------------------
# POST /api/collab-marketplace/services
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/services', methods=['POST'])
@jwt_required()
def create_service():
    user_id = get_jwt_identity()
    data = request.get_json()

    required = ['title', 'role', 'price_usd']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if float(data['price_usd']) < 5:
        return jsonify({'error': 'Minimum price is $5'}), 400

    service_id = str(uuid.uuid4())
    # service = CollabService(
    #     id=service_id, creator_id=user_id,
    #     title=data['title'], role=data['role'],
    #     genre=data.get('genre'), bio=data.get('bio'),
    #     price_usd=float(data['price_usd']),
    #     turnaround=int(data.get('turnaround', 7)),
    #     includes=data.get('includes', []),
    # )
    # db.session.add(service)
    # db.session.commit()

    return jsonify({'message': 'Service listed', 'service_id': service_id}), 201


# ---------------------------------------------------------------------------
# GET /api/collab-marketplace/services/<service_id>
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/services/<service_id>', methods=['GET'])
def get_service(service_id):
    # service = CollabService.query.get_or_404(service_id)
    return jsonify({'service_id': service_id}), 200


# ---------------------------------------------------------------------------
# PUT /api/collab-marketplace/services/<service_id>
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/services/<service_id>', methods=['PUT'])
@jwt_required()
def update_service(service_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    # service = CollabService.query.get_or_404(service_id)
    # if str(service.creator_id) != str(user_id): return jsonify({'error': 'Forbidden'}), 403
    # for field in ['title','bio','price_usd','turnaround','includes','genre']:
    #     if field in data: setattr(service, field, data[field])
    # db.session.commit()
    return jsonify({'message': 'Service updated'}), 200


# ---------------------------------------------------------------------------
# DELETE /api/collab-marketplace/services/<service_id>
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/services/<service_id>', methods=['DELETE'])
@jwt_required()
def delete_service(service_id):
    user_id = get_jwt_identity()
    # service = CollabService.query.get_or_404(service_id)
    # if str(service.creator_id) != str(user_id): return jsonify({'error': 'Forbidden'}), 403
    # service.active = False  # soft delete
    # db.session.commit()
    return jsonify({'message': 'Service removed'}), 200


# ---------------------------------------------------------------------------
# POST /api/collab-marketplace/book/<service_id>
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/book/<service_id>', methods=['POST'])
@jwt_required()
def book_service(service_id):
    buyer_id = get_jwt_identity()
    data = request.get_json() or {}
    note = data.get('note', '')

    # service = CollabService.query.get_or_404(service_id)
    # if str(service.creator_id) == str(buyer_id):
    #     return jsonify({'error': 'Cannot book your own service'}), 400

    # Platform fee calculation
    # amount     = service.price_usd
    # fee        = round(amount * PLATFORM_FEE, 2)
    # creator    = round(amount * (1 - PLATFORM_FEE), 2)

    # Stripe PaymentIntent
    # import stripe; stripe.api_key = os.environ['STRIPE_SECRET_KEY']
    # intent = stripe.PaymentIntent.create(
    #     amount=int(amount * 100),
    #     currency='usd',
    #     metadata={'service_id': service_id, 'buyer_id': buyer_id},
    # )

    # order = CollabOrder(
    #     id=str(uuid.uuid4()),
    #     service_id=service_id, buyer_id=buyer_id,
    #     creator_id=service.creator_id,
    #     amount_usd=amount, platform_fee=fee, creator_gets=creator,
    #     note=note, stripe_pi=intent.id,
    # )
    # db.session.add(order)
    # db.session.commit()

    return jsonify({
        'message': 'Booking initiated — wire Stripe client_secret to frontend',
        'platform_fee_pct': PLATFORM_FEE,
        'creator_pct': 1 - PLATFORM_FEE,
        # 'client_secret': intent.client_secret,
    }), 201


# ---------------------------------------------------------------------------
# GET /api/collab-marketplace/my-orders
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/my-orders', methods=['GET'])
@jwt_required()
def my_orders():
    buyer_id = get_jwt_identity()
    # orders = CollabOrder.query.filter_by(buyer_id=buyer_id).order_by(CollabOrder.created_at.desc()).all()
    return jsonify({'orders': []}), 200


# ---------------------------------------------------------------------------
# GET /api/collab-marketplace/my-services  (creator view)
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/my-services', methods=['GET'])
@jwt_required()
def my_services():
    creator_id = get_jwt_identity()
    # services = CollabService.query.filter_by(creator_id=creator_id, active=True).all()
    # orders   = CollabOrder.query.filter_by(creator_id=creator_id).all()
    # total_revenue = sum(o.creator_gets for o in orders if o.status == 'complete')
    return jsonify({'services': [], 'total_revenue': 0.0, 'pending_orders': 0}), 200


# ---------------------------------------------------------------------------
# PATCH /api/collab-marketplace/orders/<order_id>/status
# ---------------------------------------------------------------------------
@collab_marketplace_bp.route('/api/collab-marketplace/orders/<order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    new_status = data.get('status')

    valid_statuses = ['in_progress', 'delivered', 'complete', 'cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400

    # order = CollabOrder.query.get_or_404(order_id)
    # if str(order.creator_id) != str(user_id) and str(order.buyer_id) != str(user_id):
    #     return jsonify({'error': 'Forbidden'}), 403
    # order.status = new_status
    # if new_status == 'complete':
    #     # Release Stripe escrow / transfer to creator
    #     pass
    # db.session.commit()

    return jsonify({'message': f'Order status updated to {new_status}'}), 200
