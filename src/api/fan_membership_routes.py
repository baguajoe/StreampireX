from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from .models import db, User, CreatorMembershipTier, UserSubscription
import stripe
import os

fan_membership_bp = Blueprint('fan_membership', __name__)

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')


# ── Creator: manage tiers ──────────────────────────────────────────────────

@fan_membership_bp.route('/api/creator/membership/tiers', methods=['GET'])
@jwt_required()
def get_my_tiers():
    user_id = get_jwt_identity()
    tiers = CreatorMembershipTier.query.filter_by(creator_id=user_id).all()
    return jsonify([t.serialize() for t in tiers])


@fan_membership_bp.route('/api/creator/membership/tiers', methods=['POST'])
@jwt_required()
def create_tier():
    user_id = get_jwt_identity()
    data = request.get_json()

    tier = CreatorMembershipTier(
        creator_id=user_id,
        name=data.get('name', 'Fan Tier'),
        description=data.get('description', ''),
        price=float(data.get('price', 4.99)),
        color=data.get('color', '#00ffc8'),
        perks=data.get('perks', '[]') if isinstance(data.get('perks'), str) else str(data.get('perks', '[]')),
    )

    # Create Stripe recurring price
    try:
        product = stripe.Product.create(name=f"{data.get('name')} — Creator Membership")
        price_obj = stripe.Price.create(
            unit_amount=int(float(data.get('price', 4.99)) * 100),
            currency='usd',
            recurring={'interval': 'month'},
            product=product.id,
        )
        tier.stripe_price_id = price_obj.id
    except Exception as e:
        print(f"Stripe tier creation error: {e}")

    db.session.add(tier)
    db.session.commit()
    return jsonify(tier.serialize()), 201


@fan_membership_bp.route('/api/creator/membership/tiers/<int:tier_id>', methods=['PUT'])
@jwt_required()
def update_tier(tier_id):
    user_id = get_jwt_identity()
    tier = CreatorMembershipTier.query.filter_by(id=tier_id, creator_id=user_id).first_or_404()
    data = request.get_json()

    tier.name = data.get('name', tier.name)
    tier.description = data.get('description', tier.description)
    tier.color = data.get('color', tier.color)
    tier.perks = data.get('perks', tier.perks) if isinstance(data.get('perks'), str) else str(data.get('perks', tier.perks))

    db.session.commit()
    return jsonify(tier.serialize())


@fan_membership_bp.route('/api/creator/membership/tiers/<int:tier_id>', methods=['DELETE'])
@jwt_required()
def delete_tier(tier_id):
    user_id = get_jwt_identity()
    tier = CreatorMembershipTier.query.filter_by(id=tier_id, creator_id=user_id).first_or_404()
    db.session.delete(tier)
    db.session.commit()
    return jsonify({'message': 'Tier deleted'})


@fan_membership_bp.route('/api/creator/membership/subscribers', methods=['GET'])
@jwt_required()
def get_subscribers():
    user_id = get_jwt_identity()
    subs = UserSubscription.query.filter_by(creator_id=user_id, status='active').all()
    result = []
    for s in subs:
        fan = User.query.get(s.user_id)
        tier = CreatorMembershipTier.query.get(s.tier_id) if s.tier_id else None
        result.append({
            'id': s.id,
            'fan_name': fan.username if fan else 'Unknown',
            'fan_id': s.user_id,
            'tier_name': tier.name if tier else 'Unknown',
            'tier_id': s.tier_id,
            'status': s.status,
            'created_at': s.created_at.isoformat() if s.created_at else None,
        })
    return jsonify({'subscribers': result, 'count': len(result)})


@fan_membership_bp.route('/api/creator/membership/revenue', methods=['GET'])
@jwt_required()
def get_membership_revenue():
    user_id = get_jwt_identity()
    subs = UserSubscription.query.filter_by(creator_id=user_id, status='active').all()
    monthly = 0.0
    for s in subs:
        tier = CreatorMembershipTier.query.get(s.tier_id) if s.tier_id else None
        if tier:
            monthly += float(tier.price) * 0.9  # 90% creator share
    return jsonify({'monthly_revenue': round(monthly, 2), 'subscriber_count': len(subs)})


# ── Fan: browse & subscribe ────────────────────────────────────────────────

@fan_membership_bp.route('/api/fan/membership/<int:creator_id>/tiers', methods=['GET'])
def get_creator_tiers(creator_id):
    tiers = CreatorMembershipTier.query.filter_by(creator_id=creator_id).all()
    return jsonify([t.serialize() for t in tiers])


@fan_membership_bp.route('/api/fan/membership/<int:creator_id>/my', methods=['GET'])
@jwt_required()
def get_my_subscription(creator_id):
    user_id = get_jwt_identity()
    sub = UserSubscription.query.filter_by(
        user_id=user_id, creator_id=creator_id, status='active'
    ).first()
    if not sub:
        return jsonify({'subscribed': False})
    tier = CreatorMembershipTier.query.get(sub.tier_id) if sub.tier_id else None
    return jsonify({
        'subscribed': True,
        'tier': tier.serialize() if tier else None,
        'created_at': sub.created_at.isoformat() if sub.created_at else None,
    })


@fan_membership_bp.route('/api/fan/membership/subscribe', methods=['POST'])
@jwt_required()
def subscribe():
    user_id = get_jwt_identity()
    data = request.get_json()
    tier_id = data.get('tier_id')
    payment_method_id = data.get('payment_method_id')

    tier = CreatorMembershipTier.query.get_or_404(tier_id)

    # Check not already subscribed
    existing = UserSubscription.query.filter_by(
        user_id=user_id, creator_id=tier.creator_id, status='active'
    ).first()
    if existing:
        return jsonify({'error': 'Already subscribed'}), 400

    stripe_subscription_id = None

    # Create Stripe subscription if price exists
    if tier.stripe_price_id and payment_method_id:
        try:
            fan = User.query.get(user_id)
            # Get or create Stripe customer
            customer = stripe.Customer.create(
                email=fan.email,
                payment_method=payment_method_id,
                invoice_settings={'default_payment_method': payment_method_id},
            )
            stripe_sub = stripe.Subscription.create(
                customer=customer.id,
                items=[{'price': tier.stripe_price_id}],
                expand=['latest_invoice.payment_intent'],
            )
            stripe_subscription_id = stripe_sub.id
        except stripe.error.StripeError as e:
            return jsonify({'error': str(e)}), 400

    sub = UserSubscription(
        user_id=user_id,
        creator_id=tier.creator_id,
        tier_id=tier_id,
        status='active',
        created_at=datetime.utcnow(),
        stripe_subscription_id=stripe_subscription_id,
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify({'message': 'Subscribed successfully', 'subscription_id': sub.id}), 201


@fan_membership_bp.route('/api/fan/membership/cancel', methods=['POST'])
@jwt_required()
def cancel_subscription():
    user_id = get_jwt_identity()
    data = request.get_json()
    creator_id = data.get('creator_id')

    sub = UserSubscription.query.filter_by(
        user_id=user_id, creator_id=creator_id, status='active'
    ).first_or_404()

    # Cancel in Stripe
    if hasattr(sub, 'stripe_subscription_id') and sub.stripe_subscription_id:
        try:
            stripe.Subscription.delete(sub.stripe_subscription_id)
        except Exception as e:
            print(f"Stripe cancel error: {e}")

    sub.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Subscription cancelled'})