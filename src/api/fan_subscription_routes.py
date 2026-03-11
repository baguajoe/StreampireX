import os, uuid, stripe
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from .models import db, User

fan_sub_bp = Blueprint('fan_subscriptions', __name__)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

class FanSubscriptionTier(db.Model):
    __tablename__ = 'fan_subscription_tiers'
    id            = db.Column(db.Integer, primary_key=True)
    creator_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name          = db.Column(db.String(100), nullable=False)
    price         = db.Column(db.Float, nullable=False)
    description   = db.Column(db.Text)
    perks         = db.Column(db.Text)  # JSON list of perks
    stripe_price_id = db.Column(db.String(200))
    active        = db.Column(db.Boolean, default=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

class FanSubscription(db.Model):
    __tablename__ = 'fan_subscriptions'
    id            = db.Column(db.Integer, primary_key=True)
    fan_id        = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    creator_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    tier_id       = db.Column(db.Integer, db.ForeignKey('fan_subscription_tiers.id'), nullable=False)
    stripe_sub_id = db.Column(db.String(200))
    status        = db.Column(db.String(50), default='active')
    started_at    = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at    = db.Column(db.DateTime)

def tier_to_dict(t):
    import json
    return {
        'id': t.id, 'name': t.name, 'price': t.price,
        'description': t.description,
        'perks': json.loads(t.perks) if t.perks else [],
        'stripe_price_id': t.stripe_price_id,
        'active': t.active,
    }

# GET /api/fan-subs/tiers/<creator_id>
@fan_sub_bp.route('/api/fan-subs/tiers/<int:creator_id>', methods=['GET'])
def get_tiers(creator_id):
    tiers = FanSubscriptionTier.query.filter_by(creator_id=creator_id, active=True).all()
    return jsonify([tier_to_dict(t) for t in tiers]), 200

# POST /api/fan-subs/tiers  — creator creates a tier
@fan_sub_bp.route('/api/fan-subs/tiers', methods=['POST'])
@jwt_required()
def create_tier():
    import json
    user_id = get_jwt_identity()
    data    = request.get_json()
    name    = data.get('name', 'Fan Tier')
    price   = float(data.get('price', 5.00))
    desc    = data.get('description', '')
    perks   = data.get('perks', [])

    stripe_price_id = None
    try:
        product = stripe.Product.create(name=f"{name} — StreamPireX Fan Tier")
        sp = stripe.Price.create(
            product=product.id,
            unit_amount=int(price * 100),
            currency='usd',
            recurring={'interval': 'month'},
        )
        stripe_price_id = sp.id
    except Exception as e:
        pass  # Stripe optional — still save tier

    tier = FanSubscriptionTier(
        creator_id=user_id, name=name, price=price,
        description=desc, perks=json.dumps(perks),
        stripe_price_id=stripe_price_id,
    )
    db.session.add(tier)
    db.session.commit()
    return jsonify({'success': True, 'tier': tier_to_dict(tier)}), 201

# DELETE /api/fan-subs/tiers/<tier_id>
@fan_sub_bp.route('/api/fan-subs/tiers/<int:tier_id>', methods=['DELETE'])
@jwt_required()
def delete_tier(tier_id):
    user_id = get_jwt_identity()
    tier = FanSubscriptionTier.query.get_or_404(tier_id)
    if tier.creator_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    tier.active = False
    db.session.commit()
    return jsonify({'success': True}), 200

# POST /api/fan-subs/subscribe
@fan_sub_bp.route('/api/fan-subs/subscribe', methods=['POST'])
@jwt_required()
def subscribe():
    fan_id   = get_jwt_identity()
    data     = request.get_json()
    tier_id  = data.get('tier_id')
    pm_id    = data.get('payment_method_id')  # Stripe PM from frontend

    tier = FanSubscriptionTier.query.get_or_404(tier_id)
    fan  = User.query.get(fan_id)

    existing = FanSubscription.query.filter_by(
        fan_id=fan_id, tier_id=tier_id, status='active').first()
    if existing:
        return jsonify({'error': 'Already subscribed'}), 400

    stripe_sub_id = None
    try:
        if pm_id and tier.stripe_price_id:
            customer = stripe.Customer.create(email=fan.email)
            stripe.PaymentMethod.attach(pm_id, customer=customer.id)
            stripe.Customer.modify(customer.id,
                invoice_settings={'default_payment_method': pm_id})
            sub = stripe.Subscription.create(
                customer=customer.id,
                items=[{'price': tier.stripe_price_id}],
            )
            stripe_sub_id = sub.id
    except Exception as e:
        pass

    fan_sub = FanSubscription(
        fan_id=fan_id, creator_id=tier.creator_id,
        tier_id=tier_id, stripe_sub_id=stripe_sub_id,
    )
    db.session.add(fan_sub)
    db.session.commit()
    return jsonify({'success': True, 'message': f'Subscribed to {tier.name}!'}), 201

# GET /api/fan-subs/my-subscriptions
@fan_sub_bp.route('/api/fan-subs/my-subscriptions', methods=['GET'])
@jwt_required()
def my_subscriptions():
    fan_id = get_jwt_identity()
    subs = FanSubscription.query.filter_by(fan_id=fan_id, status='active').all()
    result = []
    for s in subs:
        tier    = FanSubscriptionTier.query.get(s.tier_id)
        creator = User.query.get(s.creator_id)
        result.append({
            'id': s.id, 'tier': tier_to_dict(tier) if tier else {},
            'creator': {'id': creator.id, 'username': creator.username} if creator else {},
            'started_at': s.started_at.isoformat(),
        })
    return jsonify(result), 200

# GET /api/fan-subs/my-fans  — creator sees their fans
@fan_sub_bp.route('/api/fan-subs/my-fans', methods=['GET'])
@jwt_required()
def my_fans():
    creator_id = get_jwt_identity()
    subs = FanSubscription.query.filter_by(creator_id=creator_id, status='active').all()
    result = []
    for s in subs:
        fan  = User.query.get(s.fan_id)
        tier = FanSubscriptionTier.query.get(s.tier_id)
        result.append({
            'fan': {'id': fan.id, 'username': fan.username, 'profile_picture': getattr(fan, 'profile_picture', None)} if fan else {},
            'tier': tier_to_dict(tier) if tier else {},
            'since': s.started_at.isoformat(),
        })
    return jsonify({'fans': result, 'total': len(result)}), 200
