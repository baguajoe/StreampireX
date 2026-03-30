# =============================================================================
# seller_routes.py — Seller Onboarding + Profile + Store Management
# =============================================================================
# Register in app.py:
#   from api.seller_routes import seller_bp
#   app.register_blueprint(seller_bp)
# =============================================================================

import os
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, User
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func

seller_bp = Blueprint('seller', __name__)

# =============================================================================
# SellerProfile model (inline for simplicity — move to models.py if preferred)
# =============================================================================
class SellerProfile(db.Model):
    __tablename__ = 'seller_profiles'

    id                  = Column(Integer, primary_key=True)
    user_id             = Column(Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    display_name        = Column(String(100))
    bio                 = Column(Text)
    banner_url          = Column(String(500))
    avatar_url          = Column(String(500))

    # store types — JSON array e.g. ["beats","stems","plugins","merch","physical","digital"]
    store_types         = Column(JSON, default=[])

    # onboarding state
    onboarding_complete = Column(Boolean, default=False)
    stripe_connected    = Column(Boolean, default=False)
    stripe_account_id   = Column(String(100))

    # stats cache
    total_sales         = Column(db.Float, default=0.0)
    total_orders        = Column(Integer, default=0)
    total_products      = Column(Integer, default=0)
    rating              = Column(db.Float, default=0.0)
    review_count        = Column(Integer, default=0)

    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, onupdate=func.now())

    def to_dict(self):
        return {
            'id':                  self.id,
            'user_id':             self.user_id,
            'display_name':        self.display_name,
            'bio':                 self.bio,
            'banner_url':          self.banner_url,
            'avatar_url':          self.avatar_url,
            'store_types':         self.store_types or [],
            'onboarding_complete': self.onboarding_complete,
            'stripe_connected':    self.stripe_connected,
            'total_sales':         self.total_sales,
            'total_orders':        self.total_orders,
            'total_products':      self.total_products,
            'rating':              self.rating,
            'review_count':        self.review_count,
        }

# =============================================================================
# STORE TYPE DEFINITIONS
# =============================================================================
STORE_TYPES = {
    'beats': {
        'id':          'beats',
        'label':       'Beat Producer',
        'icon':        '🥁',
        'description': 'Sell beats with licensing tiers (Basic, Exclusive, Unlimited)',
        'upload_types':['mp3', 'wav', 'zip'],
        'route':       '/sell-beats',
        'browse':      '/beat-store',
        'requires_stripe': True,
    },
    'stems': {
        'id':          'stems',
        'label':       'Stem Seller',
        'icon':        '🎵',
        'description': 'Sell stem packs and isolated tracks',
        'upload_types':['wav', 'zip'],
        'route':       '/sell-stems',
        'browse':      '/browse-stems',
        'requires_stripe': True,
    },
    'plugins': {
        'id':          'plugins',
        'label':       'Plugin / Asset Developer',
        'icon':        '🔌',
        'description': 'Sell VST, WAM, VFX plugins, Blender addons, presets, LUTs, DAW templates',
        'upload_types':['zip', 'vst', 'dll', 'component', 'js', 'json'],
        'route':       '/plugin-store',
        'browse':      '/plugin-store',
        'requires_stripe': True,
    },
    '3d_assets': {
        'id':          '3d_assets',
        'label':       '3D Asset Creator',
        'icon':        '🧊',
        'description': 'Sell 3D models, rigs, textures, HDRI, scene files (GLB, OBJ, FBX, Blend)',
        'upload_types':['glb', 'obj', 'fbx', 'blend', 'zip', 'hdr', 'png', 'jpg'],
        'route':       '/3d-asset-store',
        'browse':      '/3d-asset-store',
        'requires_stripe': True,
    },
    'vfx': {
        'id':          'vfx',
        'label':       'VFX / Motion Creator',
        'icon':        '🎬',
        'description': 'Sell After Effects templates, motion graphics, LUTs, transitions, overlays',
        'upload_types':['zip', 'aep', 'mogrt', 'cube', 'mp4', 'mov'],
        'route':       '/vfx-store',
        'browse':      '/vfx-store',
        'requires_stripe': True,
    },
    'digital': {
        'id':          'digital',
        'label':       'Digital Creator',
        'icon':        '💾',
        'description': 'Sell any downloadable: sample packs, presets, PDFs, courses, art files',
        'upload_types':['zip', 'pdf', 'mp3', 'wav', 'jpg', 'png', 'any'],
        'route':       '/digital-products',
        'browse':      '/digital-products',
        'requires_stripe': True,
    },
    'merch': {
        'id':          'merch',
        'label':       'Merch Creator',
        'icon':        '👕',
        'description': 'Design and sell print-on-demand merch. We handle printing and shipping.',
        'upload_types':['png', 'jpg', 'svg'],
        'route':       '/merch-designer',
        'browse':      '/merch-store',
        'requires_stripe': True,
        'requires_merch_connect': True,
    },
    'physical': {
        'id':          'physical',
        'label':       'Physical Seller',
        'icon':        '🏪',
        'description': 'Sell physical items you ship yourself. You handle fulfillment.',
        'upload_types':['jpg', 'png'],
        'route':       '/storefront',
        'browse':      '/marketplace',
        'requires_stripe': True,
    },
}

# =============================================================================
# GET /api/seller/store-types — list all available store types
# =============================================================================
@seller_bp.route('/api/seller/store-types', methods=['GET'])
def get_store_types():
    return jsonify({'store_types': list(STORE_TYPES.values())})

# =============================================================================
# GET /api/seller/profile — get current user's seller profile
# =============================================================================
@seller_bp.route('/api/seller/profile', methods=['GET'])
@jwt_required()
def get_seller_profile():
    user_id = int(get_jwt_identity())
    profile = SellerProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({'profile': None, 'onboarding_complete': False})
    return jsonify({'profile': profile.to_dict(), 'onboarding_complete': profile.onboarding_complete})

# =============================================================================
# POST /api/seller/onboard — complete seller onboarding
# =============================================================================
@seller_bp.route('/api/seller/onboard', methods=['POST'])
@jwt_required()
def onboard_seller():
    user_id = int(get_jwt_identity())
    data    = request.get_json(force=True) or {}

    store_types  = data.get('store_types', [])
    display_name = data.get('display_name', '')
    bio          = data.get('bio', '')
    banner_url   = data.get('banner_url', '')
    avatar_url   = data.get('avatar_url', '')

    if not store_types:
        return jsonify({'error': 'Select at least one store type'}), 400

    # validate store types
    valid = [s for s in store_types if s in STORE_TYPES]
    if not valid:
        return jsonify({'error': 'No valid store types selected'}), 400

    profile = SellerProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = SellerProfile(user_id=user_id)
        db.session.add(profile)

    profile.store_types         = valid
    profile.display_name        = display_name
    profile.bio                 = bio
    profile.banner_url          = banner_url
    profile.avatar_url          = avatar_url
    profile.onboarding_complete = True

    db.session.commit()

    return jsonify({
        'message':  'Seller profile created successfully',
        'profile':  profile.to_dict(),
        'next_steps': _get_next_steps(profile),
    })

# =============================================================================
# PUT /api/seller/profile — update seller profile
# =============================================================================
@seller_bp.route('/api/seller/profile', methods=['PUT'])
@jwt_required()
def update_seller_profile():
    user_id = int(get_jwt_identity())
    data    = request.get_json(force=True) or {}
    profile = SellerProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        return jsonify({'error': 'Seller profile not found'}), 404

    for field in ['display_name', 'bio', 'banner_url', 'avatar_url', 'store_types']:
        if field in data:
            setattr(profile, field, data[field])

    db.session.commit()
    return jsonify({'profile': profile.to_dict()})

# =============================================================================
# GET /api/seller/dashboard — unified dashboard data across all stores
# =============================================================================
@seller_bp.route('/api/seller/dashboard', methods=['GET'])
@jwt_required()
def get_seller_dashboard():
    user_id = int(get_jwt_identity())
    profile = SellerProfile.query.filter_by(user_id=user_id).first()

    if not profile or not profile.onboarding_complete:
        return jsonify({'onboarding_required': True})

    # aggregate stats across all store types
    dashboard = {
        'profile':       profile.to_dict(),
        'store_types':   [STORE_TYPES[s] for s in (profile.store_types or []) if s in STORE_TYPES],
        'stats': {
            'total_sales':    profile.total_sales,
            'total_orders':   profile.total_orders,
            'total_products': profile.total_products,
            'rating':         profile.rating,
            'review_count':   profile.review_count,
        },
        'quick_links': _get_quick_links(profile),
        'next_steps':  _get_next_steps(profile),
    }

    return jsonify(dashboard)

# =============================================================================
# POST /api/seller/stripe-connect — initiate Stripe Connect onboarding
# =============================================================================
@seller_bp.route('/api/seller/stripe-connect', methods=['POST'])
@jwt_required()
def stripe_connect():
    user_id = int(get_jwt_identity())
    profile = SellerProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({'error': 'Complete seller onboarding first'}), 400

    try:
        import stripe
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

        account = stripe.Account.create(
            type='express',
            capabilities={
                'transfers': {'requested': True},
                'card_payments': {'requested': True},
            }
        )

        profile.stripe_account_id = account.id
        db.session.commit()

        frontend_url = os.getenv('FRONTEND_URL', 'https://streampirex.com')
        link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f'{frontend_url}/seller-dashboard?stripe=refresh',
            return_url=f'{frontend_url}/seller-dashboard?stripe=complete',
            type='account_onboarding',
        )

        return jsonify({'url': link.url})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# GET /api/seller/stripe-status — check Stripe Connect status
# =============================================================================
@seller_bp.route('/api/seller/stripe-status', methods=['GET'])
@jwt_required()
def stripe_status():
    user_id = int(get_jwt_identity())
    profile = SellerProfile.query.filter_by(user_id=user_id).first()
    if not profile or not profile.stripe_account_id:
        return jsonify({'connected': False})

    try:
        import stripe
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        account = stripe.Account.retrieve(profile.stripe_account_id)
        connected = account.get('charges_enabled', False)
        if connected and not profile.stripe_connected:
            profile.stripe_connected = True
            db.session.commit()
        return jsonify({'connected': connected, 'account_id': profile.stripe_account_id})
    except Exception as e:
        return jsonify({'connected': False, 'error': str(e)})

# =============================================================================
# GET /api/seller/public/:user_id — public seller profile
# =============================================================================
@seller_bp.route('/api/seller/public/<int:user_id>', methods=['GET'])
def get_public_seller(user_id):
    profile = SellerProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({'error': 'Seller not found'}), 404
    return jsonify({'profile': profile.to_dict()})

# =============================================================================
# helpers
# =============================================================================
def _get_quick_links(profile):
    links = []
    for st in (profile.store_types or []):
        if st in STORE_TYPES:
            s = STORE_TYPES[st]
            links.append({'label': f'Manage {s["label"]}', 'route': s['route'], 'icon': s['icon']})
    return links

def _get_next_steps(profile):
    steps = []
    if not profile.stripe_connected:
        steps.append({'label': 'Connect Stripe to receive payouts', 'action': 'stripe_connect', 'priority': 'high'})
    if not profile.avatar_url:
        steps.append({'label': 'Add a profile photo', 'action': 'edit_profile', 'priority': 'medium'})
    if not profile.bio:
        steps.append({'label': 'Write a seller bio', 'action': 'edit_profile', 'priority': 'medium'})
    if 'merch' in (profile.store_types or []):
        steps.append({'label': 'Connect your merch account', 'action': 'merch_connect', 'priority': 'high'})
    return steps
