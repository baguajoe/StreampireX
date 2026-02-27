# =============================================================================
# UNIVERSAL AI CREDIT SYSTEM — ai_credits_routes.py
# =============================================================================
# Expands the existing VideoCredit system into a universal AI credit system
# that covers ALL paid API features (voice cloning, TTS, content gen, etc.)
#
# REPLACES: src/api/ai_video_credits_routes.py
# SAVE AS:  src/api/ai_credits_routes.py
#
# Register in app.py:
#   from api.ai_credits_routes import ai_credits_bp
#   app.register_blueprint(ai_credits_bp)
#
# WHAT CHANGED from ai_video_credits_routes.py:
#   - Renamed VideoCredit → AICredit (new model, migration needed)
#   - Added AI_FEATURE_COSTS map for per-feature pricing
#   - Added universal /api/ai/credits/use endpoint
#   - Added usage tracking per feature type
#   - Added R2 storage cost tracking
#   - Kept full backward compat with existing video generation
#   - Stripe credit packs now buy universal AI credits
# =============================================================================

import os
import json
import stripe
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func

from .models import db, User, Subscription, PricingPlan

ai_credits_bp = Blueprint('ai_credits', __name__)

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')


# =============================================================================
# AI FEATURE COST MAP — credits consumed per use
# =============================================================================
# Features that call PAID external APIs cost credits.
# Features that run locally (browser/server open source) cost 0.
# =============================================================================

AI_FEATURE_COSTS = {
    # ── Paid API Features (cost credits) ──────────────────────────────────
    'ai_video_generation':    10,   # Replicate API (Kling/Runway)
    'voice_clone_create':      5,   # ElevenLabs — create voice clone
    'voice_clone_tts':         2,   # ElevenLabs — text-to-speech with cloned voice
    'ai_radio_dj_tts':         1,   # ElevenLabs — radio DJ speech segment
    'ai_podcast_intro':        2,   # ElevenLabs — podcast intro/outro generation
    'ai_video_narration':      3,   # ElevenLabs — video narration TTS
    'ai_content_generation':   1,   # OpenAI/Claude — social posts, bios, descriptions
    'ai_auto_captions':        2,   # OpenAI Whisper API — speech-to-text
    'ai_lyrics_generation':    1,   # OpenAI/Claude — lyric writing
    'ai_image_generation':     3,   # DALL-E / Stable Diffusion
    'ai_thumbnail_enhance':    1,   # AI-enhanced thumbnail (API-based)

    # ── Free Features (0 credits, run locally) ────────────────────────────
    'stem_separation':         0,   # Demucs — runs on server (open source)
    'ai_mix_assistant':        0,   # librosa analysis — runs on server
    'silence_detection':       0,   # ffmpeg — runs on server
    'ai_thumbnail_extract':    0,   # ffmpeg frame extraction — free
    'key_finder':              0,   # Local audio analysis
    'audio_to_midi':           0,   # Local pitch detection (browser)
    'pitch_correction':        0,   # Local processing (browser)
    'background_removal':      0,   # Canvas-based (browser)
    'scene_detection':         0,   # Histogram analysis (browser)
    'audio_ducking':           0,   # Web Audio API (browser)
    'motion_tracking':         0,   # Canvas template matching (browser)
    'ai_beat_detection':       0,   # Local onset detection
    'vocal_tuner':             0,   # PhaseVocoder (browser)
}

# Features requiring a minimum tier (regardless of credits)
AI_FEATURE_MIN_TIER = {
    'ai_video_generation':    'starter',
    'voice_clone_create':     'creator',
    'voice_clone_tts':        'creator',
    'ai_radio_dj_tts':        'creator',
    'ai_podcast_intro':       'starter',
    'ai_video_narration':     'starter',
    'ai_content_generation':  'starter',
    'ai_auto_captions':       'starter',
    'ai_lyrics_generation':   'starter',
    'ai_image_generation':    'starter',
    'ai_thumbnail_enhance':   'starter',
    'stem_separation':        'free',
    'ai_mix_assistant':       'starter',
    'silence_detection':      'free',
    'ai_thumbnail_extract':   'free',
    'key_finder':             'free',
    'audio_to_midi':          'free',
    'pitch_correction':       'free',
    'background_removal':     'free',
    'scene_detection':        'free',
    'audio_ducking':          'free',
    'motion_tracking':        'free',
    'ai_beat_detection':      'free',
    'vocal_tuner':            'free',
}


# =============================================================================
# CREDIT PACKS — Stripe purchasable (universal AI credits)
# =============================================================================

CREDIT_PACKS = {
    'starter': {
        'id': 'starter', 'name': 'Starter Pack', 'credits': 25,
        'price': 4.99, 'per_credit': 0.20, 'savings': None,
        'popular': False, 'icon': '⚡',
    },
    'creator': {
        'id': 'creator', 'name': 'Creator Pack', 'credits': 75,
        'price': 11.99, 'per_credit': 0.16, 'savings': '20% off',
        'popular': True, 'icon': '🎥',
    },
    'studio': {
        'id': 'studio', 'name': 'Studio Pack', 'credits': 200,
        'price': 24.99, 'per_credit': 0.12, 'savings': '38% off',
        'popular': False, 'icon': '🎬',
    },
    'unlimited': {
        'id': 'unlimited', 'name': 'Unlimited Pack', 'credits': 500,
        'price': 49.99, 'per_credit': 0.10, 'savings': '50% off',
        'popular': False, 'icon': '🚀',
    },
}

TIER_FREE_CREDITS = {
    'free': 0, 'starter': 50, 'creator': 200, 'pro': 1000,
}

DAILY_LIMITS = {
    'ai_video_generation':    {'free': 0, 'starter': 3, 'creator': 10, 'pro': 50},
    'voice_clone_create':     {'free': 0, 'starter': 0, 'creator': 2, 'pro': 10},
    'voice_clone_tts':        {'free': 0, 'starter': 0, 'creator': 20, 'pro': 100},
    'ai_radio_dj_tts':        {'free': 0, 'starter': 0, 'creator': 50, 'pro': 500},
    'ai_content_generation':  {'free': 0, 'starter': 10, 'creator': 50, 'pro': 200},
    'ai_auto_captions':       {'free': 0, 'starter': 3, 'creator': 10, 'pro': 50},
    'ai_image_generation':    {'free': 0, 'starter': 5, 'creator': 20, 'pro': 100},
}

TIER_ORDER = {'free': 0, 'starter': 1, 'creator': 2, 'pro': 3}


# =============================================================================
# DATABASE MODELS — Add to models.py or keep here
# =============================================================================

class AICredit(db.Model):
    """Universal AI credit balance — replaces VideoCredit"""
    __tablename__ = 'ai_credits'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    balance = db.Column(db.Integer, default=0, nullable=False)
    monthly_free_credits = db.Column(db.Integer, default=0)
    monthly_credits_used = db.Column(db.Integer, default=0)
    monthly_reset_date = db.Column(db.DateTime)
    total_purchased = db.Column(db.Integer, default=0)
    total_used = db.Column(db.Integer, default=0)
    total_spent = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def has_credits(self, amount=1):
        return self.balance >= amount

    def deduct(self, amount=1):
        if self.balance >= amount:
            self.balance -= amount
            self.monthly_credits_used += amount
            self.total_used += amount
            self.updated_at = datetime.utcnow()
            return True
        return False

    def add(self, amount):
        self.balance += amount
        self.total_purchased += amount
        self.updated_at = datetime.utcnow()

    def refund(self, amount=1):
        self.balance += amount
        self.total_used = max(0, self.total_used - amount)
        self.monthly_credits_used = max(0, self.monthly_credits_used - amount)

    def reset_monthly(self, free_credits):
        self.monthly_free_credits = free_credits
        self.monthly_credits_used = 0
        self.balance += free_credits
        self.monthly_reset_date = datetime.utcnow()

    def serialize(self):
        return {
            'balance': self.balance,
            'monthly_free_credits': self.monthly_free_credits,
            'monthly_credits_used': self.monthly_credits_used,
            'monthly_reset_date': self.monthly_reset_date.isoformat() if self.monthly_reset_date else None,
            'total_purchased': self.total_purchased,
            'total_used': self.total_used,
            'total_spent': round(self.total_spent, 2),
        }


class AICreditUsage(db.Model):
    """Track every AI credit deduction for analytics"""
    __tablename__ = 'ai_credit_usage'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    feature = db.Column(db.String(50), nullable=False)
    credits_used = db.Column(db.Integer, nullable=False)
    metadata_json = db.Column(db.Text)
    storage_provider = db.Column(db.String(20))     # 'r2', 'cloudinary', 'local'
    storage_url = db.Column(db.String(500))
    storage_size_bytes = db.Column(db.BigInteger)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            'id': self.id, 'feature': self.feature,
            'credits_used': self.credits_used,
            'storage_provider': self.storage_provider,
            'storage_url': self.storage_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class CreditPackPurchase(db.Model):
    """Track Stripe credit pack purchases"""
    __tablename__ = 'credit_pack_purchases'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pack_id = db.Column(db.String(20), nullable=False)
    pack_name = db.Column(db.String(50))
    credits_amount = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    stripe_checkout_session_id = db.Column(db.String(200))
    stripe_payment_intent_id = db.Column(db.String(200))
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    def serialize(self):
        return {
            'id': self.id, 'pack_id': self.pack_id,
            'pack_name': self.pack_name, 'credits': self.credits_amount,
            'price': self.price, 'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# MIGRATION SQL
# =============================================================================

MIGRATION_SQL = """
CREATE TABLE IF NOT EXISTS ai_credits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id),
    balance INTEGER DEFAULT 0 NOT NULL,
    monthly_free_credits INTEGER DEFAULT 0,
    monthly_credits_used INTEGER DEFAULT 0,
    monthly_reset_date TIMESTAMP,
    total_purchased INTEGER DEFAULT 0,
    total_used INTEGER DEFAULT 0,
    total_spent FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing video_credits → ai_credits
INSERT INTO ai_credits (user_id, balance, monthly_free_credits, monthly_credits_used,
    monthly_reset_date, total_purchased, total_used, total_spent, created_at)
SELECT user_id, balance, monthly_free_credits, monthly_credits_used,
    monthly_reset_date, total_purchased, total_used, total_spent, created_at
FROM video_credits
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_credit_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    feature VARCHAR(50) NOT NULL,
    credits_used INTEGER NOT NULL,
    metadata_json TEXT,
    storage_provider VARCHAR(20),
    storage_url VARCHAR(500),
    storage_size_bytes BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_credit_usage(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_credit_usage(created_at);

CREATE TABLE IF NOT EXISTS credit_pack_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    pack_id VARCHAR(20) NOT NULL,
    pack_name VARCHAR(50),
    credits_amount INTEGER NOT NULL,
    price FLOAT NOT NULL,
    stripe_checkout_session_id VARCHAR(200),
    stripe_payment_intent_id VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
"""


# =============================================================================
# HELPERS
# =============================================================================

def get_or_create_credits(user_id):
    credit = AICredit.query.filter_by(user_id=user_id).first()
    if not credit:
        credit = AICredit(user_id=user_id, balance=0)
        db.session.add(credit)
        db.session.commit()
    return credit


def get_user_tier(user_id):
    sub = Subscription.query.filter_by(user_id=user_id, status='active').first()
    if sub and sub.plan:
        name = sub.plan.name.lower()
        for tier in ['pro', 'creator', 'starter']:
            if tier in name:
                return tier
    return 'free'


def check_and_reset_monthly_credits(credit, user_id):
    now = datetime.utcnow()
    needs_reset = not credit.monthly_reset_date or (now - credit.monthly_reset_date).days >= 30
    if needs_reset:
        tier = get_user_tier(user_id)
        free = TIER_FREE_CREDITS.get(tier, 0)
        if free > 0:
            credit.reset_monthly(free)
            db.session.commit()
    return credit


def check_tier_access(user_id, feature):
    tier = get_user_tier(user_id)
    min_tier = AI_FEATURE_MIN_TIER.get(feature, 'free')
    return TIER_ORDER.get(tier, 0) >= TIER_ORDER.get(min_tier, 0)


def check_daily_limit(user_id, feature):
    limits = DAILY_LIMITS.get(feature)
    if not limits:
        return True, 0, 999

    tier = get_user_tier(user_id)
    limit = limits.get(tier, 0)
    if limit == 0:
        return False, 0, 0

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    used_today = AICreditUsage.query.filter(
        AICreditUsage.user_id == user_id,
        AICreditUsage.feature == feature,
        AICreditUsage.created_at >= today_start,
    ).count()

    return used_today < limit, used_today, limit


def deduct_user_credits(user_id, feature, metadata=None):
    """
    Universal credit deduction.
    Returns: (success, credit, error)
    """
    cost = AI_FEATURE_COSTS.get(feature, 0)

    if cost == 0:
        return True, get_or_create_credits(user_id), None

    credit = get_or_create_credits(user_id)
    credit = check_and_reset_monthly_credits(credit, user_id)

    if not check_tier_access(user_id, feature):
        min_tier = AI_FEATURE_MIN_TIER.get(feature, 'starter')
        return False, credit, f'Upgrade to {min_tier.title()} plan to use this feature'

    within_limit, used, limit = check_daily_limit(user_id, feature)
    if not within_limit:
        return False, credit, f'Daily limit reached ({used}/{limit} for {feature})'

    if not credit.has_credits(cost):
        return False, credit, f'Not enough credits ({credit.balance} available, {cost} needed)'

    if not credit.deduct(cost):
        return False, credit, 'Deduction failed'

    usage = AICreditUsage(
        user_id=user_id, feature=feature, credits_used=cost,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.session.add(usage)
    db.session.commit()

    return True, credit, None


def refund_user_credits(user_id, feature):
    cost = AI_FEATURE_COSTS.get(feature, 0)
    if cost == 0:
        return True
    credit = get_or_create_credits(user_id)
    credit.refund(cost)
    db.session.commit()
    return True


def track_storage(usage_id, provider, url, size_bytes=None):
    """Link R2/Cloudinary storage to a usage record after upload"""
    usage = AICreditUsage.query.get(usage_id)
    if usage:
        usage.storage_provider = provider
        usage.storage_url = url
        usage.storage_size_bytes = size_bytes
        db.session.commit()


# =============================================================================
# STORAGE — Upload AI outputs to R2 (primary) → Cloudinary → local
# =============================================================================

def upload_ai_output(file_bytes, filename, content_type='application/octet-stream'):
    """
    Upload AI-generated content. Tries R2 first, Cloudinary second, local last.
    Returns: (url, provider, size_bytes)
    """
    size_bytes = len(file_bytes) if file_bytes else 0

    # ── R2 (primary — cheapest for StreamPireX) ──────────────────────────
    try:
        from .r2_storage_setup import s3_client, R2_BUCKET_NAME, R2_PUBLIC_URL
        import uuid as _uuid
        from io import BytesIO

        uid = _uuid.uuid4().hex[:12]
        r2_key = f"ai-outputs/{uid}_{filename}"

        s3_client.upload_fileobj(
            BytesIO(file_bytes), R2_BUCKET_NAME, r2_key,
            ExtraArgs={'ContentType': content_type, 'CacheControl': 'public, max-age=2592000'}
        )

        url = f"{R2_PUBLIC_URL.rstrip('/')}/{r2_key}" if R2_PUBLIC_URL else \
              f"https://{R2_BUCKET_NAME}.r2.dev/{r2_key}"
        return url, 'r2', size_bytes

    except Exception as e:
        current_app.logger.warning(f"R2 upload failed for AI output: {e}")

    # ── Cloudinary (fallback) ────────────────────────────────────────────
    try:
        import cloudinary.uploader
        import tempfile

        ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'bin'
        resource_type = 'video' if ext in ('mp4', 'mp3', 'wav', 'webm', 'mov') else 'auto'

        with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        result = cloudinary.uploader.upload(
            tmp_path, resource_type=resource_type,
            folder='ai-outputs', overwrite=True,
        )
        os.unlink(tmp_path)

        url = result.get('secure_url')
        if url:
            return url, 'cloudinary', size_bytes

    except Exception as e:
        current_app.logger.warning(f"Cloudinary upload failed for AI output: {e}")

    # ── Local (last resort) ──────────────────────────────────────────────
    import uuid as _uuid
    local_dir = os.path.join('uploads', 'ai-outputs')
    os.makedirs(local_dir, exist_ok=True)
    uid = _uuid.uuid4().hex[:12]
    local_path = os.path.join(local_dir, f"{uid}_{filename}")
    with open(local_path, 'wb') as f:
        f.write(file_bytes)
    return f"/{local_path}", 'local', size_bytes


# =============================================================================
# API ROUTES
# =============================================================================

@ai_credits_bp.route('/api/ai/credits', methods=['GET'])
@jwt_required()
def get_credit_balance():
    """Get universal AI credit balance + feature map + packs"""
    try:
        user_id = get_jwt_identity()
        credit = get_or_create_credits(user_id)
        credit = check_and_reset_monthly_credits(credit, user_id)
        tier = get_user_tier(user_id)

        features = {}
        for feat, cost in AI_FEATURE_COSTS.items():
            min_tier = AI_FEATURE_MIN_TIER.get(feat, 'free')
            has_access = TIER_ORDER.get(tier, 0) >= TIER_ORDER.get(min_tier, 0)
            daily = DAILY_LIMITS.get(feat, {})

            features[feat] = {
                'cost': cost, 'free': cost == 0,
                'has_access': has_access, 'min_tier': min_tier,
                'daily_limit': daily.get(tier),
            }

        return jsonify({
            'success': True,
            'credits': credit.serialize(),
            'tier': tier,
            'tier_free_credits': TIER_FREE_CREDITS.get(tier, 0),
            'features': features,
            'packs': list(CREDIT_PACKS.values()),
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_credits_bp.route('/api/ai/credits/use', methods=['POST'])
@jwt_required()
def use_credits():
    """
    Universal credit deduction.
    Body: { "feature": "voice_clone_tts", "metadata": { ... } }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}
        feature = data.get('feature')

        if not feature or feature not in AI_FEATURE_COSTS:
            return jsonify({'error': f'Unknown feature: {feature}'}), 400

        cost = AI_FEATURE_COSTS[feature]

        if cost == 0:
            return jsonify({'success': True, 'free': True, 'credits_used': 0}), 200

        success, credit, error = deduct_user_credits(user_id, feature, data.get('metadata'))

        if not success:
            tier = get_user_tier(user_id)
            min_tier = AI_FEATURE_MIN_TIER.get(feature, 'starter')
            needs_upgrade = TIER_ORDER.get(tier, 0) < TIER_ORDER.get(min_tier, 0)

            return jsonify({
                'error': error,
                'credits_needed': cost, 'balance': credit.balance,
                'upgrade_required': needs_upgrade,
                'min_tier': min_tier if needs_upgrade else None,
                'can_purchase': tier != 'free',
                'packs': list(CREDIT_PACKS.values()),
            }), 403 if needs_upgrade else 429

        return jsonify({
            'success': True, 'feature': feature,
            'credits_used': cost, 'balance': credit.balance,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_credits_bp.route('/api/ai/credits/check', methods=['POST'])
@jwt_required()
def check_credits():
    """Check if user CAN use a feature (dry run, no deduction)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}
        feature = data.get('feature')

        if not feature or feature not in AI_FEATURE_COSTS:
            return jsonify({'error': f'Unknown feature: {feature}'}), 400

        cost = AI_FEATURE_COSTS[feature]
        tier = get_user_tier(user_id)

        if cost == 0:
            return jsonify({'can_use': True, 'free': True, 'cost': 0}), 200

        credit = get_or_create_credits(user_id)
        credit = check_and_reset_monthly_credits(credit, user_id)

        has_tier = check_tier_access(user_id, feature)
        within_limit, used, limit = check_daily_limit(user_id, feature)
        has_balance = credit.has_credits(cost)

        return jsonify({
            'can_use': has_tier and within_limit and has_balance,
            'cost': cost, 'balance': credit.balance,
            'has_tier_access': has_tier, 'within_daily_limit': within_limit,
            'daily_used': used, 'daily_limit': limit,
            'has_balance': has_balance,
            'min_tier': AI_FEATURE_MIN_TIER.get(feature, 'free'),
            'current_tier': tier,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_credits_bp.route('/api/ai/credits/refund', methods=['POST'])
@jwt_required()
def refund_credits_route():
    """Refund credits for a failed AI operation"""
    try:
        user_id = get_jwt_identity()
        feature = (request.get_json() or {}).get('feature')
        if not feature or feature not in AI_FEATURE_COSTS:
            return jsonify({'error': f'Unknown feature: {feature}'}), 400

        refund_user_credits(user_id, feature)
        credit = get_or_create_credits(user_id)
        return jsonify({'success': True, 'refunded': AI_FEATURE_COSTS.get(feature, 0), 'balance': credit.balance}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_credits_bp.route('/api/ai/credits/usage', methods=['GET'])
@jwt_required()
def get_usage_history():
    """Usage history with breakdown by feature"""
    try:
        user_id = get_jwt_identity()
        feature = request.args.get('feature')
        days = int(request.args.get('days', 30))
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 50)), 100)

        query = AICreditUsage.query.filter_by(user_id=user_id)
        if feature:
            query = query.filter_by(feature=feature)

        since = datetime.utcnow() - timedelta(days=days)
        query = query.filter(AICreditUsage.created_at >= since)
        total = query.count()

        usages = query.order_by(AICreditUsage.created_at.desc()) \
            .offset((page - 1) * per_page).limit(per_page).all()

        summary = db.session.query(
            AICreditUsage.feature,
            func.sum(AICreditUsage.credits_used),
            func.count(AICreditUsage.id),
        ).filter(
            AICreditUsage.user_id == user_id,
            AICreditUsage.created_at >= since,
        ).group_by(AICreditUsage.feature).all()

        return jsonify({
            'success': True,
            'usage': [u.serialize() for u in usages],
            'summary': {f: {'total_credits': int(c or 0), 'count': int(n or 0)} for f, c, n in summary},
            'total': total, 'page': page, 'per_page': per_page,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_credits_bp.route('/api/ai/credits/storage', methods=['GET'])
@jwt_required()
def get_ai_storage_usage():
    """AI-generated content storage breakdown by provider (R2 vs Cloudinary)"""
    try:
        user_id = get_jwt_identity()

        stats = db.session.query(
            AICreditUsage.storage_provider,
            func.count(AICreditUsage.id),
            func.sum(AICreditUsage.storage_size_bytes),
        ).filter(
            AICreditUsage.user_id == user_id,
            AICreditUsage.storage_provider.isnot(None),
        ).group_by(AICreditUsage.storage_provider).all()

        storage = {}
        total_bytes = 0
        for provider, count, size in stats:
            sz = int(size or 0)
            storage[provider] = {'files': int(count or 0), 'size_bytes': sz, 'size_mb': round(sz / (1024**2), 2)}
            total_bytes += sz

        return jsonify({
            'success': True, 'storage': storage,
            'total_bytes': total_bytes,
            'total_mb': round(total_bytes / (1024**2), 2),
            'total_gb': round(total_bytes / (1024**3), 3),
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# STRIPE PURCHASE
# =============================================================================

@ai_credits_bp.route('/api/ai/credits/purchase', methods=['POST'])
@jwt_required()
def purchase_credits():
    """Create Stripe checkout for credit pack purchase"""
    try:
        user_id = get_jwt_identity()
        pack_id = (request.get_json() or {}).get('pack_id')

        if pack_id not in CREDIT_PACKS:
            return jsonify({'error': f'Unknown pack: {pack_id}'}), 400

        tier = get_user_tier(user_id)
        if tier == 'free':
            return jsonify({'error': 'Upgrade to a paid plan first', 'upgrade_required': True}), 403

        pack = CREDIT_PACKS[pack_id]
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"StreamPireX AI Credits — {pack['name']}",
                        'description': f"{pack['credits']} credits for voice cloning, video gen, content AI & more",
                    },
                    'unit_amount': int(pack['price'] * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            metadata={
                'type': 'ai_credit_purchase',
                'user_id': str(user_id),
                'pack_id': pack_id,
                'credits_amount': str(pack['credits']),
            },
            success_url=f"{frontend_url}/ai-credits/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/ai-credits",
            customer_email=user.email,
        )

        purchase = CreditPackPurchase(
            user_id=user_id, pack_id=pack_id, pack_name=pack['name'],
            credits_amount=pack['credits'], price=pack['price'],
            stripe_checkout_session_id=checkout_session.id, status='pending',
        )
        db.session.add(purchase)
        db.session.commit()

        return jsonify({'success': True, 'checkout_url': checkout_session.url, 'session_id': checkout_session.id}), 200

    except stripe.error.StripeError as e:
        return jsonify({'error': f'Payment error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_credits_bp.route('/api/ai/credits/packs', methods=['GET'])
@jwt_required()
def get_credit_packs():
    """Get available packs"""
    try:
        user_id = get_jwt_identity()
        tier = get_user_tier(user_id)
        return jsonify({'success': True, 'packs': list(CREDIT_PACKS.values()), 'tier': tier, 'can_purchase': tier != 'free'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_credits_bp.route('/api/ai/credits/features', methods=['GET'])
@jwt_required()
def get_feature_costs():
    """Get cost map for frontend"""
    try:
        user_id = get_jwt_identity()
        tier = get_user_tier(user_id)
        features = {}
        for feat, cost in AI_FEATURE_COSTS.items():
            min_tier = AI_FEATURE_MIN_TIER.get(feat, 'free')
            features[feat] = {
                'cost': cost, 'free': cost == 0,
                'has_access': TIER_ORDER.get(tier, 0) >= TIER_ORDER.get(min_tier, 0),
                'min_tier': min_tier,
            }
        return jsonify({'success': True, 'features': features, 'tier': tier}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# STRIPE WEBHOOK HANDLER
# =============================================================================
# Add this to handle_checkout_completed in routes.py:
#
#   elif session.get('metadata', {}).get('type') == 'ai_credit_purchase':
#       from api.ai_credits_routes import handle_ai_credit_purchase
#       handle_ai_credit_purchase(session)
# =============================================================================

def handle_ai_credit_purchase(session):
    """Handle successful AI credit pack payment from Stripe webhook"""
    try:
        metadata = session.get('metadata', {})
        user_id = int(metadata.get('user_id'))
        pack_id = metadata.get('pack_id')
        credits_amount = int(metadata.get('credits_amount'))
        pack = CREDIT_PACKS.get(pack_id, {})

        purchase = CreditPackPurchase.query.filter_by(
            stripe_checkout_session_id=session['id']
        ).first()
        if purchase:
            purchase.status = 'completed'
            purchase.completed_at = datetime.utcnow()
            if session.get('payment_intent'):
                purchase.stripe_payment_intent_id = session['payment_intent']

        credit = get_or_create_credits(user_id)
        credit.add(credits_amount)
        credit.total_spent += pack.get('price', 0)
        db.session.commit()

        current_app.logger.info(f"✅ AI credits: user={user_id} +{credits_amount}, balance={credit.balance}")

    except Exception as e:
        current_app.logger.error(f"❌ AI credit webhook error: {e}")
        db.session.rollback()
        raise


# =============================================================================
# MIGRATION ENDPOINT (admin only)
# =============================================================================

@ai_credits_bp.route('/api/ai/credits/migrate', methods=['POST'])
@jwt_required()
def run_migration():
    """Run migration to create ai_credits tables"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'error': 'Admin only'}), 403

        for statement in MIGRATION_SQL.split(';'):
            stmt = statement.strip()
            if stmt:
                db.session.execute(db.text(stmt))
        db.session.commit()
        return jsonify({'success': True, 'message': 'Migration complete'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
