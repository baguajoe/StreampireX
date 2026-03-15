# =============================================================================
# film_models.py — Film & Series Database Models for StreamPireX
# =============================================================================
# Location: src/api/film_models.py
# Add to app.py:
#   from api.film_models import Film, FilmCredit, Theatre, Screening, FilmReview, FestivalSubmission
# =============================================================================

from api.extensions import db
from datetime import datetime
import json


# =============================================================================
# THEATRE — Each filmmaker's virtual theatre (their brand/home)
# =============================================================================
class Theatre(db.Model):
    __tablename__ = 'theatre'
    __table_args__ = {'extend_existing': True}

    id              = db.Column(db.Integer, primary_key=True)
    creator_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    name            = db.Column(db.String(200), nullable=False)
    tagline         = db.Column(db.String(300), nullable=True)
    bio             = db.Column(db.Text, nullable=True)
    logo_url        = db.Column(db.String(500), nullable=True)
    banner_url      = db.Column(db.String(500), nullable=True)
    trailer_url     = db.Column(db.String(500), nullable=True)  # theatre promo reel
    website         = db.Column(db.String(300), nullable=True)
    instagram       = db.Column(db.String(200), nullable=True)
    twitter         = db.Column(db.String(200), nullable=True)
    imdb_url        = db.Column(db.String(300), nullable=True)
    is_verified     = db.Column(db.Boolean, default=False)      # verified filmmaker badge
    is_sag          = db.Column(db.Boolean, default=False)      # SAG-AFTRA signatory
    follower_count  = db.Column(db.Integer, default=0)
    total_views     = db.Column(db.Integer, default=0)
    awards_json     = db.Column(db.Text, default='[]')          # festival laurels/awards
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    films           = db.relationship('Film', backref='theatre', lazy=True, foreign_keys='Film.theatre_id')
    screenings      = db.relationship('Screening', backref='theatre', lazy=True)

    def serialize(self):
        return {
            'id':            self.id,
            'creator_id':    self.creator_id,
            'name':          self.name,
            'tagline':       self.tagline,
            'bio':           self.bio,
            'logo_url':      self.logo_url,
            'banner_url':    self.banner_url,
            'trailer_url':   self.trailer_url,
            'website':       self.website,
            'instagram':     self.instagram,
            'twitter':       self.twitter,
            'imdb_url':      self.imdb_url,
            'is_verified':   self.is_verified,
            'is_sag':        self.is_sag,
            'follower_count': self.follower_count,
            'total_views':   self.total_views,
            'awards':        json.loads(self.awards_json or '[]'),
            'created_at':    self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# THEATRE FOLLOW — Fans following a theatre
# =============================================================================
class TheatreFollow(db.Model):
    __tablename__ = 'theatre_follow'
    __table_args__ = {'extend_existing': True}

    id          = db.Column(db.Integer, primary_key=True)
    theatre_id  = db.Column(db.Integer, db.ForeignKey('theatre.id'), nullable=False)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            'id':         self.id,
            'theatre_id': self.theatre_id,
            'user_id':    self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# FILM — The core film model
# =============================================================================
class Film(db.Model):
    __tablename__ = 'film'
    __table_args__ = {'extend_existing': True}

    id              = db.Column(db.Integer, primary_key=True)
    creator_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    theatre_id      = db.Column(db.Integer, db.ForeignKey('theatre.id'), nullable=True)

    # Core metadata
    title           = db.Column(db.String(300), nullable=False)
    tagline         = db.Column(db.String(400), nullable=True)
    synopsis        = db.Column(db.Text, nullable=True)

    # Classification
    film_type       = db.Column(db.String(50), default='short')
    # feature | short | documentary | animation | series_episode | student | experimental
    genre           = db.Column(db.String(100), nullable=True)
    # Drama | Horror | Comedy | Thriller | Sci-Fi | Documentary | Animation | Romance | Action | Mystery
    rating          = db.Column(db.String(10), nullable=True)   # G | PG | PG-13 | R | NR
    runtime_minutes = db.Column(db.Integer, nullable=True)
    language        = db.Column(db.String(100), default='English')
    country         = db.Column(db.String(100), nullable=True)
    release_year    = db.Column(db.Integer, nullable=True)
    tags_json       = db.Column(db.Text, default='[]')          # searchable tags

    # Media URLs (R2)
    poster_url      = db.Column(db.String(500), nullable=True)
    banner_url      = db.Column(db.String(500), nullable=True)
    trailer_url     = db.Column(db.String(500), nullable=True)
    film_url        = db.Column(db.String(500), nullable=True)  # full film R2 URL
    subtitle_url    = db.Column(db.String(500), nullable=True)  # .vtt or .srt file

    # Pricing & Access
    pricing_model   = db.Column(db.String(50), default='free')
    # free | rent | buy | fan_membership | screening_only
    rent_price      = db.Column(db.Float, default=0.0)          # 48hr rental price
    buy_price       = db.Column(db.Float, default=0.0)          # permanent purchase
    rent_duration_hours = db.Column(db.Integer, default=48)

    # Industry info
    is_sag          = db.Column(db.Boolean, default=False)      # SAG production
    production_company = db.Column(db.String(300), nullable=True)
    distribution_rights = db.Column(db.String(200), nullable=True)
    laurels_json    = db.Column(db.Text, default='[]')          # festival laurels
    # e.g. [{"festival": "Sundance", "year": 2024, "award": "Jury Prize"}]

    # Status
    is_published    = db.Column(db.Boolean, default=False)
    is_featured     = db.Column(db.Boolean, default=False)      # staff pick
    views           = db.Column(db.Integer, default=0)
    likes           = db.Column(db.Integer, default=0)

    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    credits         = db.relationship('FilmCredit', backref='film', lazy=True, cascade='all, delete-orphan')
    reviews         = db.relationship('FilmReview', backref='film', lazy=True, cascade='all, delete-orphan')
    screenings      = db.relationship('Screening', backref='film', lazy=True)
    purchases       = db.relationship('FilmPurchase', backref='film', lazy=True)

    def serialize(self, include_credits=False):
        data = {
            'id':                  self.id,
            'creator_id':          self.creator_id,
            'theatre_id':          self.theatre_id,
            'title':               self.title,
            'tagline':             self.tagline,
            'synopsis':            self.synopsis,
            'film_type':           self.film_type,
            'genre':               self.genre,
            'rating':              self.rating,
            'runtime_minutes':     self.runtime_minutes,
            'language':            self.language,
            'country':             self.country,
            'release_year':        self.release_year,
            'tags':                json.loads(self.tags_json or '[]'),
            'poster_url':          self.poster_url,
            'banner_url':          self.banner_url,
            'trailer_url':         self.trailer_url,
            'film_url':            self.film_url,
            'subtitle_url':        self.subtitle_url,
            'pricing_model':       self.pricing_model,
            'rent_price':          self.rent_price,
            'buy_price':           self.buy_price,
            'rent_duration_hours': self.rent_duration_hours,
            'is_sag':              self.is_sag,
            'production_company':  self.production_company,
            'distribution_rights': self.distribution_rights,
            'laurels':             json.loads(self.laurels_json or '[]'),
            'is_published':        self.is_published,
            'is_featured':         self.is_featured,
            'views':               self.views,
            'likes':               self.likes,
            'review_count':        len(self.reviews),
            'avg_rating':          round(sum(r.rating for r in self.reviews) / len(self.reviews), 1) if self.reviews else 0,
            'created_at':          self.created_at.isoformat() if self.created_at else None,
        }
        if include_credits:
            data['credits'] = [c.serialize() for c in self.credits]
        return data


# =============================================================================
# FILM CREDIT — Cast & crew credits (IMDB style)
# =============================================================================
class FilmCredit(db.Model):
    __tablename__ = 'film_credit'
    __table_args__ = {'extend_existing': True}

    id              = db.Column(db.Integer, primary_key=True)
    film_id         = db.Column(db.Integer, db.ForeignKey('film.id'), nullable=False)
    role            = db.Column(db.String(100), nullable=False)
    # Director | Writer | Producer | Executive Producer | Actor | Cinematographer
    # Editor | Composer | Production Designer | Costume Designer | VFX | Other
    name            = db.Column(db.String(200), nullable=False)
    character_name  = db.Column(db.String(200), nullable=True)  # for actors
    is_lead         = db.Column(db.Boolean, default=False)       # lead actor/director
    is_sag_member   = db.Column(db.Boolean, default=False)
    headshot_url    = db.Column(db.String(500), nullable=True)
    imdb_url        = db.Column(db.String(300), nullable=True)
    order           = db.Column(db.Integer, default=0)          # display order

    def serialize(self):
        return {
            'id':             self.id,
            'film_id':        self.film_id,
            'role':           self.role,
            'name':           self.name,
            'character_name': self.character_name,
            'is_lead':        self.is_lead,
            'is_sag_member':  self.is_sag_member,
            'headshot_url':   self.headshot_url,
            'imdb_url':       self.imdb_url,
            'order':          self.order,
        }


# =============================================================================
# FILM REVIEW — Fan reviews & star ratings
# =============================================================================
class FilmReview(db.Model):
    __tablename__ = 'film_review'
    __table_args__ = {'extend_existing': True}

    id          = db.Column(db.Integer, primary_key=True)
    film_id     = db.Column(db.Integer, db.ForeignKey('film.id'), nullable=False)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    rating      = db.Column(db.Integer, nullable=False)         # 1-5 stars
    review_text = db.Column(db.Text, nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        from api.models import User
        user = User.query.get(self.user_id)
        return {
            'id':          self.id,
            'film_id':     self.film_id,
            'user_id':     self.user_id,
            'username':    user.username if user else 'Unknown',
            'avatar_url':  user.avatar_url if user else None,
            'rating':      self.rating,
            'review_text': self.review_text,
            'created_at':  self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# SCREENING — Scheduled live screening events (virtual premieres)
# =============================================================================
class Screening(db.Model):
    __tablename__ = 'screening'
    __table_args__ = {'extend_existing': True}

    id              = db.Column(db.Integer, primary_key=True)
    film_id         = db.Column(db.Integer, db.ForeignKey('film.id'), nullable=False)
    theatre_id      = db.Column(db.Integer, db.ForeignKey('theatre.id'), nullable=True)
    creator_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    title           = db.Column(db.String(300), nullable=True)  # e.g. "World Premiere"
    description     = db.Column(db.Text, nullable=True)
    scheduled_at    = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=True)

    # Ticketing
    ticket_price    = db.Column(db.Float, default=0.0)          # 0 = free screening
    capacity        = db.Column(db.Integer, nullable=True)       # None = unlimited
    sold_count      = db.Column(db.Integer, default=0)

    # Stripe
    stripe_price_id = db.Column(db.String(200), nullable=True)

    # Status
    is_live         = db.Column(db.Boolean, default=False)
    is_complete     = db.Column(db.Boolean, default=False)
    recording_url   = db.Column(db.String(500), nullable=True)  # post-screening recording
    has_qa          = db.Column(db.Boolean, default=False)       # Q&A after screening

    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    tickets         = db.relationship('ScreeningTicket', backref='screening', lazy=True)

    def serialize(self):
        return {
            'id':               self.id,
            'film_id':          self.film_id,
            'theatre_id':       self.theatre_id,
            'creator_id':       self.creator_id,
            'title':            self.title,
            'description':      self.description,
            'scheduled_at':     self.scheduled_at.isoformat() if self.scheduled_at else None,
            'duration_minutes': self.duration_minutes,
            'ticket_price':     self.ticket_price,
            'capacity':         self.capacity,
            'sold_count':       self.sold_count,
            'is_free':          self.ticket_price == 0,
            'is_live':          self.is_live,
            'is_complete':      self.is_complete,
            'recording_url':    self.recording_url,
            'has_qa':           self.has_qa,
            'spots_remaining':  (self.capacity - self.sold_count) if self.capacity else None,
            'created_at':       self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# SCREENING TICKET — A fan's ticket to a screening
# =============================================================================
class ScreeningTicket(db.Model):
    __tablename__ = 'screening_ticket'
    __table_args__ = {'extend_existing': True}

    id              = db.Column(db.Integer, primary_key=True)
    screening_id    = db.Column(db.Integer, db.ForeignKey('screening.id'), nullable=False)
    user_id         = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount_paid     = db.Column(db.Float, default=0.0)
    stripe_session_id = db.Column(db.String(300), nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            'id':           self.id,
            'screening_id': self.screening_id,
            'user_id':      self.user_id,
            'amount_paid':  self.amount_paid,
            'created_at':   self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# FILM PURCHASE — Rent or buy a film
# =============================================================================
class FilmPurchase(db.Model):
    __tablename__ = 'film_purchase'
    __table_args__ = {'extend_existing': True}

    id              = db.Column(db.Integer, primary_key=True)
    film_id         = db.Column(db.Integer, db.ForeignKey('film.id'), nullable=False)
    user_id         = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    purchase_type   = db.Column(db.String(20), nullable=False)  # rent | buy
    amount_paid     = db.Column(db.Float, default=0.0)
    stripe_session_id = db.Column(db.String(300), nullable=True)
    expires_at      = db.Column(db.DateTime, nullable=True)     # for rentals only
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            'id':            self.id,
            'film_id':       self.film_id,
            'user_id':       self.user_id,
            'purchase_type': self.purchase_type,
            'amount_paid':   self.amount_paid,
            'expires_at':    self.expires_at.isoformat() if self.expires_at else None,
            'is_active':     self.expires_at is None or self.expires_at > datetime.utcnow(),
            'created_at':    self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# FESTIVAL SUBMISSION — Monthly short film festival
# =============================================================================
class FestivalSubmission(db.Model):
    __tablename__ = 'festival_submission'
    __table_args__ = {'extend_existing': True}

    id              = db.Column(db.Integer, primary_key=True)
    film_id         = db.Column(db.Integer, db.ForeignKey('film.id'), nullable=False)
    creator_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    festival_month  = db.Column(db.String(20), nullable=False)  # e.g. "2026-03"
    category        = db.Column(db.String(100), nullable=False)
    # Best Drama | Best Comedy | Best Documentary | Best Animation | Best Student Film | Best Short
    votes           = db.Column(db.Integer, default=0)
    is_winner       = db.Column(db.Boolean, default=False)
    is_finalist     = db.Column(db.Boolean, default=False)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    votes_list      = db.relationship('FestivalVote', backref='submission', lazy=True)

    def serialize(self):
        return {
            'id':             self.id,
            'film_id':        self.film_id,
            'creator_id':     self.creator_id,
            'festival_month': self.festival_month,
            'category':       self.category,
            'votes':          self.votes,
            'is_winner':      self.is_winner,
            'is_finalist':    self.is_finalist,
            'created_at':     self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# FESTIVAL VOTE — One vote per user per submission
# =============================================================================
class FestivalVote(db.Model):
    __tablename__ = 'festival_vote'
    __table_args__ = {'extend_existing': True}

    id              = db.Column(db.Integer, primary_key=True)
    submission_id   = db.Column(db.Integer, db.ForeignKey('festival_submission.id'), nullable=False)
    user_id         = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            'id':            self.id,
            'submission_id': self.submission_id,
            'user_id':       self.user_id,
            'created_at':    self.created_at.isoformat() if self.created_at else None,
        }
