# =============================================================================
# sound_kit_models.py — Sound Kit Database Models
# =============================================================================
# Location: src/api/sound_kit_models.py
# Add to models.py or import separately
# Models:
#   - SoundKit: Named kit with category, user ownership, sharing
#   - SoundKitSample: Individual sample in a kit (audio file + metadata)
# =============================================================================

from src.api.extensions import db
from datetime import datetime


class SoundKit(db.Model):
    """
    A named collection of audio samples (sound kit / drum kit / sample pack).
    Users can create, save, share, and browse community kits.
    """
    __tablename__ = 'sound_kit'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, default='')
    category = db.Column(db.String(50), default='General')
    # Categories: Drums, Bass, Synth, Vocals, FX, Guitar, Keys, Loops, One Shots, General

    genre = db.Column(db.String(50), default='')
    # Genres: Trap, Boom Bap, Lo-Fi, House, Techno, Pop, R&B, Rock, etc.

    tags = db.Column(db.Text, default='')  # Comma-separated tags
    cover_image_url = db.Column(db.String(500), default='')

    is_public = db.Column(db.Boolean, default=False)
    is_featured = db.Column(db.Boolean, default=False)  # Admin-curated
    download_count = db.Column(db.Integer, default=0)
    like_count = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    samples = db.relationship('SoundKitSample', backref='kit', lazy='dynamic',
                              cascade='all, delete-orphan', order_by='SoundKitSample.pad_number')
    user = db.relationship('User', backref=db.backref('sound_kits', lazy='dynamic'))

    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'genre': self.genre,
            'tags': [t.strip() for t in self.tags.split(',') if t.strip()] if self.tags else [],
            'cover_image_url': self.cover_image_url,
            'is_public': self.is_public,
            'is_featured': self.is_featured,
            'download_count': self.download_count,
            'like_count': self.like_count,
            'sample_count': self.samples.count(),
            'samples': [s.serialize() for s in self.samples.all()],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def serialize_short(self):
        """Compact version for lists/browsing."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'name': self.name,
            'category': self.category,
            'genre': self.genre,
            'tags': [t.strip() for t in self.tags.split(',') if t.strip()] if self.tags else [],
            'cover_image_url': self.cover_image_url,
            'is_public': self.is_public,
            'sample_count': self.samples.count(),
            'download_count': self.download_count,
            'like_count': self.like_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SoundKitSample(db.Model):
    """
    Individual audio sample within a Sound Kit.
    Stores audio file URL, pad assignment, note mapping, and metadata.
    """
    __tablename__ = 'sound_kit_sample'

    id = db.Column(db.Integer, primary_key=True)
    kit_id = db.Column(db.Integer, db.ForeignKey('sound_kit.id'), nullable=False)
    
    # Audio
    audio_url = db.Column(db.String(500), nullable=False)
    cloudinary_public_id = db.Column(db.String(300), default='')
    
    # Metadata
    name = db.Column(db.String(120), nullable=False, default='Sample')
    original_filename = db.Column(db.String(255), default='')
    
    # Pad/slot assignment (0-15 for 16-pad grid, or -1 for unassigned)
    pad_number = db.Column(db.Integer, default=-1)
    
    # MIDI note mapping (for chromatic kits / piano samples)
    midi_note = db.Column(db.Integer, default=-1)  # -1 = not mapped
    root_note = db.Column(db.String(5), default='')  # e.g. "C4", "F#3"
    
    # Audio properties
    duration = db.Column(db.Float, default=0.0)  # seconds
    sample_rate = db.Column(db.Integer, default=44100)
    channels = db.Column(db.Integer, default=1)  # 1=mono, 2=stereo
    file_size = db.Column(db.Integer, default=0)  # bytes
    file_type = db.Column(db.String(10), default='wav')  # wav, mp3, ogg
    
    # Playback settings (saved per-sample)
    volume = db.Column(db.Float, default=1.0)
    pan = db.Column(db.Float, default=0.0)  # -1 to 1
    pitch = db.Column(db.Float, default=0.0)  # semitones offset
    start_time = db.Column(db.Float, default=0.0)  # trim start (seconds)
    end_time = db.Column(db.Float, default=0.0)  # trim end (0 = full)
    is_loop = db.Column(db.Boolean, default=False)
    is_one_shot = db.Column(db.Boolean, default=True)
    
    # Color for pad display
    color = db.Column(db.String(7), default='#FF6600')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            'id': self.id,
            'kit_id': self.kit_id,
            'audio_url': self.audio_url,
            'name': self.name,
            'original_filename': self.original_filename,
            'pad_number': self.pad_number,
            'midi_note': self.midi_note,
            'root_note': self.root_note,
            'duration': self.duration,
            'sample_rate': self.sample_rate,
            'channels': self.channels,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'volume': self.volume,
            'pan': self.pan,
            'pitch': self.pitch,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'is_loop': self.is_loop,
            'is_one_shot': self.is_one_shot,
            'color': self.color,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SoundKitLike(db.Model):
    """Tracks which users liked which kits (prevents double-liking)."""
    __tablename__ = 'sound_kit_like'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    kit_id = db.Column(db.Integer, db.ForeignKey('sound_kit.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'kit_id', name='unique_kit_like'),
    )