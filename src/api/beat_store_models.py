"""
StreamPireX - Beat Store Models
================================
Add to models.py or import into models.py

Models:
- Beat: Individual beat listing with metadata (BPM, key, genre, tags)
- BeatLicense: License tiers per beat (Basic/Premium/Exclusive/Stems)
- BeatPurchase: Purchase records with license agreement tracking
"""

from src.api.models import db
from datetime import datetime


# ============================================================
# BEAT - Core beat listing
# ============================================================

class Beat(db.Model):
    __tablename__ = 'beats'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    producer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Beat Info
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    genre = db.Column(db.String(100), nullable=True)
    sub_genre = db.Column(db.String(100), nullable=True)
    mood = db.Column(db.String(100), nullable=True)  # e.g., "Dark", "Energetic", "Chill"
    tags = db.Column(db.JSON, default=list)  # ["trap", "808", "dark", "drill"]

    # Music Metadata
    bpm = db.Column(db.Integer, nullable=True)
    key = db.Column(db.String(10), nullable=True)  # e.g., "C minor", "F# major"
    duration = db.Column(db.String(10), nullable=True)  # "3:24"
    duration_seconds = db.Column(db.Integer, nullable=True)

    # Files
    preview_url = db.Column(db.String(500), nullable=False)  # Watermarked MP3 (streams for free)
    mp3_url = db.Column(db.String(500), nullable=True)  # Clean MP3 (delivered on Basic+ purchase)
    wav_url = db.Column(db.String(500), nullable=True)  # WAV file (delivered on Premium+ purchase)
    stems_url = db.Column(db.String(500), nullable=True)  # ZIP of stems (delivered on Stems purchase)
    artwork_url = db.Column(db.String(500), nullable=True)  # Beat cover art

    # Pricing (quick access — detailed pricing is in BeatLicense)
    base_price = db.Column(db.Float, default=29.99)  # Starting lease price
    exclusive_price = db.Column(db.Float, nullable=True)  # Exclusive price (null = not for sale exclusively)
    is_sold_exclusive = db.Column(db.Boolean, default=False)  # True = no longer available

    # Stats
    plays = db.Column(db.Integer, default=0)
    downloads = db.Column(db.Integer, default=0)  # Free download count (if enabled)
    total_sales = db.Column(db.Integer, default=0)
    total_revenue = db.Column(db.Float, default=0.0)

    # Settings
    is_active = db.Column(db.Boolean, default=True)
    is_free_download = db.Column(db.Boolean, default=False)  # Allow free MP3 download (email gate optional)
    allow_offers = db.Column(db.Boolean, default=False)

    # Source tracking — was this beat made in StreamPireX?
    source = db.Column(db.String(50), default='upload')  # 'upload', 'beat_maker', 'sampler', 'recorder'
    audio_id = db.Column(db.Integer, db.ForeignKey('audio.id'), nullable=True)  # Link to Audio if made in app

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    producer = db.relationship('User', backref=db.backref('beats', lazy='dynamic'))
    licenses = db.relationship('BeatLicense', backref='beat', lazy='dynamic', cascade='all, delete-orphan')
    purchases = db.relationship('BeatPurchase', backref='beat', lazy='dynamic')
    source_audio = db.relationship('Audio', backref=db.backref('beat_listing', uselist=False))

    def serialize(self):
        producer = self.producer
        licenses = BeatLicense.query.filter_by(beat_id=self.id, is_active=True).order_by(BeatLicense.price.asc()).all()

        return {
            "id": self.id,
            "producer_id": self.producer_id,
            "producer_name": producer.username if producer else "Unknown",
            "producer_avatar": getattr(producer, 'avatar_url', None),
            "title": self.title,
            "description": self.description,
            "genre": self.genre,
            "sub_genre": self.sub_genre,
            "mood": self.mood,
            "tags": self.tags or [],
            "bpm": self.bpm,
            "key": self.key,
            "duration": self.duration,
            "preview_url": self.preview_url,
            "artwork_url": self.artwork_url or "/default-beat-artwork.jpg",
            "base_price": self.base_price,
            "exclusive_price": self.exclusive_price,
            "is_sold_exclusive": self.is_sold_exclusive,
            "is_free_download": self.is_free_download,
            "plays": self.plays or 0,
            "total_sales": self.total_sales or 0,
            "licenses": [l.serialize() for l in licenses],
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def serialize_card(self):
        """Lightweight serialization for browse/search grids."""
        return {
            "id": self.id,
            "title": self.title,
            "producer_name": self.producer.username if self.producer else "Unknown",
            "producer_id": self.producer_id,
            "genre": self.genre,
            "bpm": self.bpm,
            "key": self.key,
            "duration": self.duration,
            "preview_url": self.preview_url,
            "artwork_url": self.artwork_url or "/default-beat-artwork.jpg",
            "base_price": self.base_price,
            "is_free_download": self.is_free_download,
            "is_sold_exclusive": self.is_sold_exclusive,
            "plays": self.plays or 0,
            "tags": (self.tags or [])[:5],
        }


# ============================================================
# BEAT LICENSE - License tiers per beat
# ============================================================

class BeatLicense(db.Model):
    __tablename__ = 'beat_licenses'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    beat_id = db.Column(db.Integer, db.ForeignKey('beats.id'), nullable=False)

    # License Tier
    license_type = db.Column(db.String(50), nullable=False)
    # Types: 'basic', 'premium', 'unlimited', 'exclusive', 'stems'

    name = db.Column(db.String(100), nullable=False)  # Display name, e.g., "Basic Lease"
    price = db.Column(db.Float, nullable=False)

    # What the buyer gets
    file_format = db.Column(db.String(50), nullable=False)  # 'mp3', 'wav', 'wav+stems'
    includes_stems = db.Column(db.Boolean, default=False)

    # Usage rights
    distribution_limit = db.Column(db.Integer, nullable=True)  # Max streams/sales (null = unlimited)
    streaming_limit = db.Column(db.Integer, nullable=True)  # Max streams allowed
    music_video = db.Column(db.Boolean, default=False)  # Can use in music video?
    radio_broadcasting = db.Column(db.Boolean, default=False)  # Radio play rights?
    live_performance = db.Column(db.Boolean, default=True)  # Live performance rights?
    is_exclusive = db.Column(db.Boolean, default=False)  # Exclusive = beat removed from store
    credit_required = db.Column(db.Boolean, default=True)  # Must credit producer?

    # Custom terms (producer can override)
    custom_terms = db.Column(db.Text, nullable=True)

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "beat_id": self.beat_id,
            "license_type": self.license_type,
            "name": self.name,
            "price": self.price,
            "file_format": self.file_format,
            "includes_stems": self.includes_stems,
            "distribution_limit": self.distribution_limit,
            "streaming_limit": self.streaming_limit,
            "music_video": self.music_video,
            "radio_broadcasting": self.radio_broadcasting,
            "live_performance": self.live_performance,
            "is_exclusive": self.is_exclusive,
            "credit_required": self.credit_required,
            "custom_terms": self.custom_terms,
        }


# ============================================================
# Default license templates producers can use
# ============================================================

DEFAULT_LICENSE_TEMPLATES = {
    "basic": {
        "name": "Basic Lease",
        "license_type": "basic",
        "price": 29.99,
        "file_format": "mp3",
        "includes_stems": False,
        "distribution_limit": 2500,
        "streaming_limit": 50000,
        "music_video": False,
        "radio_broadcasting": False,
        "live_performance": True,
        "is_exclusive": False,
        "credit_required": True,
    },
    "premium": {
        "name": "Premium Lease",
        "license_type": "premium",
        "price": 59.99,
        "file_format": "wav",
        "includes_stems": False,
        "distribution_limit": 10000,
        "streaming_limit": 250000,
        "music_video": True,
        "radio_broadcasting": False,
        "live_performance": True,
        "is_exclusive": False,
        "credit_required": True,
    },
    "unlimited": {
        "name": "Unlimited Lease",
        "license_type": "unlimited",
        "price": 149.99,
        "file_format": "wav",
        "includes_stems": False,
        "distribution_limit": None,  # Unlimited
        "streaming_limit": None,  # Unlimited
        "music_video": True,
        "radio_broadcasting": True,
        "live_performance": True,
        "is_exclusive": False,
        "credit_required": True,
    },
    "stems": {
        "name": "Stems / Trackout",
        "license_type": "stems",
        "price": 199.99,
        "file_format": "wav+stems",
        "includes_stems": True,
        "distribution_limit": None,
        "streaming_limit": None,
        "music_video": True,
        "radio_broadcasting": True,
        "live_performance": True,
        "is_exclusive": False,
        "credit_required": True,
    },
    "exclusive": {
        "name": "Exclusive Rights",
        "license_type": "exclusive",
        "price": 499.99,
        "file_format": "wav+stems",
        "includes_stems": True,
        "distribution_limit": None,
        "streaming_limit": None,
        "music_video": True,
        "radio_broadcasting": True,
        "live_performance": True,
        "is_exclusive": True,
        "credit_required": False,  # Buyer owns it
    },
}


# ============================================================
# BEAT PURCHASE - Transaction record + license agreement
# ============================================================

class BeatPurchase(db.Model):
    __tablename__ = 'beat_purchases'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    beat_id = db.Column(db.Integer, db.ForeignKey('beats.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    license_id = db.Column(db.Integer, db.ForeignKey('beat_licenses.id'), nullable=False)

    # Transaction
    amount_paid = db.Column(db.Float, nullable=False)
    platform_cut = db.Column(db.Float, nullable=False)  # 10% StreamPireX
    producer_earnings = db.Column(db.Float, nullable=False)  # 90% to producer
    stripe_payment_id = db.Column(db.String(255), nullable=True)
    stripe_session_id = db.Column(db.String(255), nullable=True)
    payment_status = db.Column(db.String(50), default='pending')  # pending, completed, refunded

    # License snapshot (frozen at purchase time)
    license_type = db.Column(db.String(50), nullable=False)
    license_name = db.Column(db.String(100), nullable=False)
    file_format = db.Column(db.String(50), nullable=False)
    distribution_limit = db.Column(db.Integer, nullable=True)
    streaming_limit = db.Column(db.Integer, nullable=True)
    includes_stems = db.Column(db.Boolean, default=False)
    is_exclusive = db.Column(db.Boolean, default=False)

    # Contract
    contract_url = db.Column(db.String(500), nullable=True)  # Signed license agreement PDF
    contract_signed_at = db.Column(db.DateTime, nullable=True)
    buyer_legal_name = db.Column(db.String(255), nullable=True)
    buyer_artist_name = db.Column(db.String(255), nullable=True)

    # Download tracking
    download_count = db.Column(db.Integer, default=0)
    last_downloaded_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    buyer = db.relationship('User', backref=db.backref('beat_purchases', lazy='dynamic'))
    license = db.relationship('BeatLicense', backref=db.backref('purchases', lazy='dynamic'))

    def serialize(self):
        return {
            "id": self.id,
            "beat_id": self.beat_id,
            "beat_title": self.beat.title if self.beat else None,
            "beat_artwork": self.beat.artwork_url if self.beat else None,
            "buyer_id": self.buyer_id,
            "buyer_name": self.buyer.username if self.buyer else None,
            "license_type": self.license_type,
            "license_name": self.license_name,
            "file_format": self.file_format,
            "amount_paid": self.amount_paid,
            "producer_earnings": self.producer_earnings,
            "payment_status": self.payment_status,
            "contract_url": self.contract_url,
            "includes_stems": self.includes_stems,
            "is_exclusive": self.is_exclusive,
            "distribution_limit": self.distribution_limit,
            "streaming_limit": self.streaming_limit,
            "download_count": self.download_count,
            "purchased_at": self.purchased_at.isoformat() if self.purchased_at else None,
        }