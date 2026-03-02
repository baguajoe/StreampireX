# =============================================================================
# epk_collab.py — EPK Builder + Collab Marketplace API
# =============================================================================
# Unified system: Artists build EPKs (Electronic Press Kits) which serve as
# their professional identity. The Collab Marketplace uses EPKs for matching
# and pitching. EPKs are publicly shareable at /epk/:username
#
# Backend: Flask Blueprint
# Models: EPK, CollabRequest, CollabApplication
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import json

epk_collab_bp = Blueprint('epk_collab', __name__)

# =============================================================================
# MODELS — Add to models.py
# =============================================================================
# Copy the following model classes into your models.py file:
"""
class EPK(db.Model):
    '''Electronic Press Kit — artist's professional identity card'''
    __tablename__ = 'epk'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    
    # Identity
    artist_name = db.Column(db.String(100))
    tagline = db.Column(db.String(200))  # "Grammy-nominated R&B vocalist from Atlanta"
    bio_short = db.Column(db.Text)  # 2-3 sentence elevator pitch
    bio_full = db.Column(db.Text)   # Full press bio
    genre_primary = db.Column(db.String(50))
    genre_secondary = db.Column(db.String(50))
    location = db.Column(db.String(100))
    
    # Contact & Booking
    booking_email = db.Column(db.String(200))
    management_name = db.Column(db.String(100))
    management_email = db.Column(db.String(200))
    label_name = db.Column(db.String(100))
    website = db.Column(db.String(300))
    
    # Social Links (JSON)
    social_links = db.Column(db.JSON, default=dict)  # {spotify, apple, youtube, instagram, tiktok, twitter, soundcloud}
    
    # Media
    profile_photo = db.Column(db.String(500))
    cover_photo = db.Column(db.String(500))
    press_photos = db.Column(db.JSON, default=list)  # [{url, caption}]
    logo_url = db.Column(db.String(500))
    
    # Achievements & Stats
    achievements = db.Column(db.JSON, default=list)  # [{title, description, date, icon}]
    stats = db.Column(db.JSON, default=dict)  # {monthly_listeners, total_streams, followers, shows_played}
    press_quotes = db.Column(db.JSON, default=list)  # [{quote, source, url, date}]
    
    # Featured Content (pulled from platform)
    featured_tracks = db.Column(db.JSON, default=list)  # [track_id, ...]
    featured_videos = db.Column(db.JSON, default=list)  # [video_id, ...]
    featured_albums = db.Column(db.JSON, default=list)  # [album_id, ...]
    
    # Technical Rider (for live bookings)
    rider = db.Column(db.Text)
    stage_plot_url = db.Column(db.String(500))
    
    # Featured Media (audio demos, music videos, press releases — any file type)
    featured_media = db.Column(db.JSON, default=list)  # [{url, title, description, type, ext}]
    
    # Collab Profile (used for matching)
    skills = db.Column(db.JSON, default=list)  # ["vocalist", "producer", "songwriter", "engineer", "guitarist"]
    collab_open = db.Column(db.Boolean, default=True)  # actively looking for collabs
    collab_rate = db.Column(db.String(100))  # "Negotiable" / "$500/verse" / "Points only"
    preferred_genres = db.Column(db.JSON, default=list)  # genres they want to collab in
    equipment = db.Column(db.JSON, default=list)  # ["Pro Tools", "FL Studio", "Neumann U87"]
    
    # Template & Appearance
    template = db.Column(db.String(20), default='modern')  # modern | minimal | bold | elegant
    accent_color = db.Column(db.String(7), default='#00ffc8')
    
    # Visibility
    is_public = db.Column(db.Boolean, default=True)
    slug = db.Column(db.String(100), unique=True, index=True)  # URL-friendly name
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('epk', uselist=False, lazy=True))
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "artist_name": self.artist_name,
            "tagline": self.tagline,
            "bio_short": self.bio_short,
            "bio_full": self.bio_full,
            "genre_primary": self.genre_primary,
            "genre_secondary": self.genre_secondary,
            "location": self.location,
            "booking_email": self.booking_email,
            "management_name": self.management_name,
            "management_email": self.management_email,
            "label_name": self.label_name,
            "website": self.website,
            "social_links": self.social_links or {},
            "profile_photo": self.profile_photo,
            "cover_photo": self.cover_photo,
            "press_photos": self.press_photos or [],
            "logo_url": self.logo_url,
            "achievements": self.achievements or [],
            "stats": self.stats or {},
            "press_quotes": self.press_quotes or [],
            "featured_tracks": self.featured_tracks or [],
            "featured_videos": self.featured_videos or [],
            "featured_albums": self.featured_albums or [],
            "rider": self.rider,
            "stage_plot_url": self.stage_plot_url,
            "featured_media": self.featured_media or [],
            "skills": self.skills or [],
            "collab_open": self.collab_open,
            "collab_rate": self.collab_rate,
            "preferred_genres": self.preferred_genres or [],
            "equipment": self.equipment or [],
            "template": self.template,
            "accent_color": self.accent_color,
            "is_public": self.is_public,
            "slug": self.slug,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CollabRequest(db.Model):
    '''A collab posting — "I need a vocalist for my R&B track"'''
    __tablename__ = 'collab_request'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    title = db.Column(db.String(200), nullable=False)  # "Need R&B vocalist for upcoming single"
    description = db.Column(db.Text)
    genre = db.Column(db.String(50))
    roles_needed = db.Column(db.JSON, default=list)  # ["vocalist", "mix engineer"]
    budget = db.Column(db.String(100))  # "Negotiable" / "$200-500" / "Points/royalty split"
    deadline = db.Column(db.DateTime)
    
    # Reference material
    reference_track_url = db.Column(db.String(500))
    reference_notes = db.Column(db.Text)
    
    # Visibility & Status
    status = db.Column(db.String(20), default='open')  # open | filled | closed | draft
    is_public = db.Column(db.Boolean, default=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('collab_requests', lazy=True))
    
    def to_dict(self):
        user = self.user
        return {
            "id": self.id,
            "user_id": self.user_id,
            "artist_name": user.artist_name or user.username if user else None,
            "profile_photo": user.profile_picture if user else None,
            "title": self.title,
            "description": self.description,
            "genre": self.genre,
            "roles_needed": self.roles_needed or [],
            "budget": self.budget,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "reference_track_url": self.reference_track_url,
            "reference_notes": self.reference_notes,
            "status": self.status,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "application_count": len(self.applications) if hasattr(self, 'applications') else 0,
        }


class CollabApplication(db.Model):
    '''An application/pitch to a collab request — includes EPK link'''
    __tablename__ = 'collab_application'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('collab_request.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    message = db.Column(db.Text)  # pitch message
    proposed_rate = db.Column(db.String(100))
    sample_url = db.Column(db.String(500))  # link to relevant work sample
    
    status = db.Column(db.String(20), default='pending')  # pending | accepted | declined | withdrawn
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    request = db.relationship('CollabRequest', backref=db.backref('applications', lazy=True))
    user = db.relationship('User', backref=db.backref('collab_applications', lazy=True))
    
    def to_dict(self):
        user = self.user
        epk = user.epk if user else None
        return {
            "id": self.id,
            "request_id": self.request_id,
            "user_id": self.user_id,
            "artist_name": user.artist_name or user.username if user else None,
            "profile_photo": user.profile_picture if user else None,
            "epk_slug": epk.slug if epk else None,
            "skills": epk.skills if epk else [],
            "genre": epk.genre_primary if epk else None,
            "message": self.message,
            "proposed_rate": self.proposed_rate,
            "sample_url": self.sample_url,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
"""

# =============================================================================
# HELPER — Import these in your actual app
# =============================================================================
# from models import db, User, EPK, CollabRequest, CollabApplication

# For standalone development, we'll use lazy imports
def get_models():
    from api.models import db, User
    # Try importing new models, fall back gracefully
    try:
        from api.models import EPK, CollabRequest, CollabApplication
    except ImportError:
        EPK = None
        CollabRequest = None
        CollabApplication = None
    return db, User, EPK, CollabRequest, CollabApplication


# =============================================================================
# EPK ROUTES
# =============================================================================

@epk_collab_bp.route('/api/epk', methods=['GET'])
@jwt_required()
def get_my_epk():
    """Get current user's EPK (or empty template if none exists)"""
    db, User, EPK, _, _ = get_models()
    uid = get_jwt_identity()
    epk = EPK.query.filter_by(user_id=uid).first() if EPK else None
    
    if epk:
        return jsonify(epk.to_dict()), 200
    
    # Return empty template with user's existing data pre-filled
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": None,
        "user_id": uid,
        "artist_name": user.artist_name or user.username,
        "tagline": "",
        "bio_short": (user.artist_bio or user.bio or "")[:200],
        "bio_full": user.artist_bio or user.bio or "",
        "genre_primary": user.artist_genre or "",
        "genre_secondary": "",
        "location": getattr(user, 'artist_location', '') or "",
        "booking_email": user.email or "",
        "management_name": "",
        "management_email": "",
        "label_name": "",
        "website": getattr(user, 'artist_website', '') or "",
        "social_links": user.artist_social_links or user.social_links or {},
        "profile_photo": user.profile_picture or "",
        "cover_photo": user.cover_photo or "",
        "press_photos": [],
        "logo_url": "",
        "achievements": [],
        "stats": {},
        "press_quotes": [],
        "featured_tracks": [],
        "featured_videos": [],
        "featured_albums": [],
        "rider": "",
        "stage_plot_url": "",
        "featured_media": [],
        "skills": [],
        "collab_open": True,
        "collab_rate": "",
        "preferred_genres": [],
        "equipment": [],
        "template": "modern",
        "accent_color": "#00ffc8",
        "is_public": True,
        "slug": (user.artist_name or user.username or "").lower().replace(" ", "-"),
        "created_at": None,
        "updated_at": None,
    }), 200


@epk_collab_bp.route('/api/epk', methods=['POST', 'PUT'])
@jwt_required()
def save_epk():
    """Create or update EPK"""
    db, User, EPK, _, _ = get_models()
    if not EPK:
        return jsonify({"error": "EPK model not available. Run migrations."}), 500
    
    uid = get_jwt_identity()
    data = request.json
    
    epk = EPK.query.filter_by(user_id=uid).first()
    is_new = epk is None
    
    if is_new:
        epk = EPK(user_id=uid)
        db.session.add(epk)
    
    # Update all fields
    fields = [
        'artist_name', 'tagline', 'bio_short', 'bio_full',
        'genre_primary', 'genre_secondary', 'location',
        'booking_email', 'management_name', 'management_email', 'label_name', 'website',
        'social_links', 'profile_photo', 'cover_photo', 'press_photos', 'logo_url',
        'achievements', 'stats', 'press_quotes',
        'featured_tracks', 'featured_videos', 'featured_albums',
        'rider', 'stage_plot_url', 'featured_media',
        'skills', 'collab_open', 'collab_rate', 'preferred_genres', 'equipment',
        'template', 'accent_color', 'is_public', 'slug',
    ]
    for f in fields:
        if f in data:
            setattr(epk, f, data[f])
    
    # Auto-generate slug if empty
    if not epk.slug and epk.artist_name:
        import re
        base = re.sub(r'[^a-z0-9]+', '-', epk.artist_name.lower()).strip('-')
        # Ensure unique
        slug = base
        counter = 1
        while EPK.query.filter(EPK.slug == slug, EPK.id != epk.id).first():
            slug = f"{base}-{counter}"
            counter += 1
        epk.slug = slug
    
    epk.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        "message": "EPK created" if is_new else "EPK updated",
        "epk": epk.to_dict()
    }), 201 if is_new else 200


@epk_collab_bp.route('/api/epk/generate-commercial', methods=['POST'])
@jwt_required()
def generate_epk_commercial():
    """
    Generate an AI promo video/commercial from EPK data.
    Uses the existing AI video generation pipeline (Replicate/Kling).
    Costs 1 credit per generation. Stores result in R2.
    
    Flow:
      1. Reads EPK data (name, genre, tagline, bio, photos)
      2. Builds a cinematic prompt from the EPK
      3. Calls AI video generation (text-to-video or image-to-video if photo provided)
      4. Stores result in R2
      5. Saves URL to EPK as commercial_url
    """
    db, User, EPK, _, _ = get_models()
    uid = get_jwt_identity()
    
    epk = EPK.query.filter_by(user_id=uid).first() if EPK else None
    if not epk:
        return jsonify({"error": "Create your EPK first before generating a commercial"}), 400
    
    data = request.json or {}
    style = data.get('style', 'cinematic')  # cinematic | lyric_video | hype | minimal | documentary
    aspect_ratio = data.get('aspect_ratio', '16:9')
    quality = data.get('quality', 'standard')  # standard | premium
    custom_prompt = data.get('custom_prompt', '')
    use_photo = data.get('use_photo', True)  # Use profile/cover photo for image-to-video
    
    # ── Check credits via existing system ──
    try:
        from api.ai_credits_routes import deduct_user_credits, get_user_tier
    except ImportError:
        try:
            from api.ai_video_credits_routes import get_or_create_credits, get_user_tier
            # Manual deduction fallback
            def deduct_user_credits(user_id, amount):
                credit = get_or_create_credits(user_id)
                if credit.balance < amount:
                    return False, credit, {"error": "Not enough credits", "balance": credit.balance, "required": amount}
                credit.balance -= amount
                db.session.commit()
                return True, credit, None
        except ImportError:
            return jsonify({"error": "Credit system not available"}), 500
    
    tier = get_user_tier(uid)
    if tier == 'free':
        return jsonify({"error": "EPK commercials require a paid subscription", "upgrade_required": True}), 403
    
    credit_cost = 2 if quality == 'premium' else 1
    success, credit, error = deduct_user_credits(uid, credit_cost)
    if not success:
        return jsonify(error), 402
    
    # ── Build the prompt from EPK data ──
    STYLE_TEMPLATES = {
        'cinematic': (
            "Cinematic music promo video, dramatic lighting, slow motion, "
            "professional color grading, lens flares, dark moody atmosphere. "
            "{genre} artist {name}. {tagline}. "
            "Studio quality, 4K, shallow depth of field, smoke effects, neon accents."
        ),
        'lyric_video': (
            "Stylish lyric video background, animated typography, "
            "flowing abstract visuals, {genre} aesthetic. "
            "Artist: {name}. Smooth camera movement, "
            "particle effects, dark background with vibrant color accents."
        ),
        'hype': (
            "High energy music promo, fast cuts, urban landscape, "
            "street style, {genre} vibes. {name} — {tagline}. "
            "Neon lights, bass-heavy atmosphere, concert energy, crowd shots, "
            "dynamic camera angles, film grain."
        ),
        'minimal': (
            "Clean minimalist artist promo, white space, elegant typography, "
            "subtle motion, {genre} artist {name}. {tagline}. "
            "Modern design, soft shadows, professional, gallery-like presentation."
        ),
        'documentary': (
            "Documentary style artist profile, behind the scenes, studio footage, "
            "{genre} musician {name} at work. {tagline}. "
            "Natural lighting, handheld camera feel, intimate close-ups, "
            "authentic moments, warm color palette."
        ),
    }
    
    template = STYLE_TEMPLATES.get(style, STYLE_TEMPLATES['cinematic'])
    prompt = template.format(
        name=epk.artist_name or 'Artist',
        genre=epk.genre_primary or 'music',
        tagline=epk.tagline or epk.bio_short or '',
    )
    
    if custom_prompt:
        prompt = f"{custom_prompt}. {prompt}"
    
    # Truncate to 500 chars (Replicate limit)
    prompt = prompt[:500]
    
    # ── Call existing AI video generation ──
    try:
        import replicate
        import os
        
        # Determine if we do image-to-video (using press photo) or text-to-video
        generation_type = 'text'
        source_image_url = None
        
        if use_photo:
            # Try profile photo, then cover, then first press photo
            source_image_url = (
                epk.profile_photo or
                epk.cover_photo or
                (epk.press_photos[0]['url'] if epk.press_photos else None)
            )
            if source_image_url:
                generation_type = 'image'
        
        # Select model
        MODELS = {
            'text': {
                'standard': 'kwaivgi/kling-v1.6-standard:45d3267b5e8a92e42e5b24218e0e053cafc9a7f1eee7bdf6ea3b8fe72ef7bd63',
                'premium': 'kwaivgi/kling-v1.6-pro:1081e794ddb6e4fd184631fcdab3e26cf9e3b6e79a2528e5a2f15aebd1ad4106',
            },
            'image': {
                'standard': 'kwaivgi/kling-v1.6-standard:45d3267b5e8a92e42e5b24218e0e053cafc9a7f1eee7bdf6ea3b8fe72ef7bd63',
                'premium': 'kwaivgi/kling-v1.6-pro:1081e794ddb6e4fd184631fcdab3e26cf9e3b6e79a2528e5a2f15aebd1ad4106',
            },
        }
        
        model_id = MODELS[generation_type][quality]
        
        input_params = {
            'prompt': prompt,
            'aspect_ratio': aspect_ratio,
            'duration': 5,
        }
        if generation_type == 'image' and source_image_url:
            input_params['image'] = source_image_url
        
        # Create generation record
        from api.models import AIVideoGeneration
        generation = AIVideoGeneration(
            user_id=uid,
            prompt=prompt,
            generation_type=f'epk_commercial_{generation_type}',
            model_name=f'Kling v1.6 {"Pro" if quality == "premium" else "Standard"}',
            aspect_ratio=aspect_ratio,
            quality=quality,
            credits_used=credit_cost,
            status='processing',
        )
        db.session.add(generation)
        db.session.commit()
        gen_id = generation.id
        
        # Run generation (synchronous for now — could be async with celery)
        try:
            output = replicate.run(model_id, input=input_params)
            video_url_replicate = output if isinstance(output, str) else str(output)
            
            # Download and upload to R2
            import requests as req
            from io import BytesIO
            
            video_response = req.get(video_url_replicate, timeout=120)
            if video_response.status_code == 200:
                # Upload to R2
                try:
                    from api.r2_storage_setup import uploadFile as r2Upload
                    from werkzeug.datastructures import FileStorage
                    
                    video_bytes = BytesIO(video_response.content)
                    video_bytes.name = f"epk_commercial_{uid}_{gen_id}.mp4"
                    r2_url = r2Upload(video_bytes, video_bytes.name)
                    final_url = r2_url if isinstance(r2_url, str) else r2_url.get('secure_url', '')
                except Exception as r2_err:
                    print(f"R2 upload failed, using Replicate URL: {r2_err}")
                    final_url = video_url_replicate
                
                # Update generation record
                generation.status = 'completed'
                generation.video_url = final_url
                generation.completed_at = datetime.utcnow()
                
                # Save to EPK
                epk.updated_at = datetime.utcnow()
                # Store commercial in featured_media
                media = epk.featured_media or []
                media.append({
                    "url": final_url,
                    "title": f"EPK Commercial ({style.title()})",
                    "description": f"AI-generated {style} promo • {quality}",
                    "type": "video",
                    "ext": "mp4",
                    "generated": True,
                })
                epk.featured_media = media
                db.session.commit()
                
                return jsonify({
                    "message": "Commercial generated!",
                    "video_url": final_url,
                    "generation_id": gen_id,
                    "credits_used": credit_cost,
                    "credits_remaining": credit.balance,
                    "style": style,
                    "prompt_used": prompt,
                }), 200
            else:
                raise Exception(f"Failed to download video: HTTP {video_response.status_code}")
                
        except Exception as gen_err:
            generation.status = 'failed'
            generation.error = str(gen_err)
            db.session.commit()
            # Refund credits on failure
            try:
                from api.ai_credits_routes import refund_user_credits
                refund_user_credits(uid, credit_cost)
            except ImportError:
                credit.balance += credit_cost
                db.session.commit()
            return jsonify({"error": f"Video generation failed: {str(gen_err)}", "credits_refunded": credit_cost}), 500
            
    except ImportError as imp_err:
        # Refund if replicate not installed
        credit.balance += credit_cost
        db.session.commit()
        return jsonify({"error": f"AI video generation not configured: {str(imp_err)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@epk_collab_bp.route('/api/collab/message', methods=['POST'])
@jwt_required()
def send_collab_message():
    """
    Start or continue a DM conversation with context from a collab request.
    Creates a DirectMessage and a Conversation if one doesn't exist.
    Returns conversation info so frontend can open the chat.
    """
    db, User, _, CollabRequest, CollabApplication = get_models()
    uid = get_jwt_identity()
    data = request.json
    recipient_id = data.get('recipient_id')
    message_text = data.get('message', '')
    context_type = data.get('context_type', '')  # 'collab_request' | 'collab_application' | 'epk_contact'
    context_id = data.get('context_id')  # request or application id
    
    if not recipient_id or not message_text:
        return jsonify({"error": "recipient_id and message are required"}), 400
    if recipient_id == uid:
        return jsonify({"error": "Cannot message yourself"}), 400
    
    recipient = User.query.get(recipient_id)
    if not recipient:
        return jsonify({"error": "Recipient not found"}), 404
    
    try:
        from api.models import Conversation, DirectMessage
        
        # Find or create conversation
        convo = Conversation.query.filter(
            db.or_(
                db.and_(Conversation.user1_id == uid, Conversation.user2_id == recipient_id),
                db.and_(Conversation.user1_id == recipient_id, Conversation.user2_id == uid),
            )
        ).first()
        
        if not convo:
            convo = Conversation(user1_id=uid, user2_id=recipient_id)
            db.session.add(convo)
            db.session.flush()
        
        # Build message with collab context prefix
        prefix = ""
        if context_type == 'collab_request' and context_id and CollabRequest:
            cr = CollabRequest.query.get(context_id)
            if cr:
                prefix = f"[Re: Collab — {cr.title}]\n"
        elif context_type == 'collab_application' and context_id and CollabApplication:
            app = CollabApplication.query.get(context_id)
            if app:
                cr = CollabRequest.query.get(app.request_id) if CollabRequest else None
                prefix = f"[Re: Application for — {cr.title if cr else 'Collab'}]\n"
        elif context_type == 'epk_contact':
            prefix = "[Via EPK]\n"
        
        dm = DirectMessage(
            sender_id=uid,
            recipient_id=recipient_id,
            message=prefix + message_text,
        )
        db.session.add(dm)
        convo.last_message_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "message": "Message sent",
            "conversation_id": convo.id,
            "recipient_id": recipient_id,
            "recipient_name": recipient.artist_name or recipient.username,
        }), 201
        
    except ImportError:
        return jsonify({"error": "Messaging models not available"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@epk_collab_bp.route('/api/epk/auto-populate', methods=['GET'])
@jwt_required()
def auto_populate_epk():
    """
    Fetch user's existing tracks, albums, videos, and stats to auto-populate EPK.
    Called when artist opens EPK builder — pulls everything they already have on the platform.
    """
    db, User, EPK, _, _ = get_models()
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    result = {
        "tracks": [],
        "albums": [],
        "videos": [],
        "stats": {},
        "profile": {},
    }
    
    # Pull profile data
    result["profile"] = {
        "artist_name": user.artist_name or user.username,
        "bio": user.artist_bio or user.bio or "",
        "genre": getattr(user, 'artist_genre', '') or "",
        "location": getattr(user, 'artist_location', '') or "",
        "website": getattr(user, 'artist_website', '') or "",
        "email": user.email or "",
        "profile_photo": user.profile_picture or "",
        "cover_photo": user.cover_photo or "",
        "social_links": user.artist_social_links or user.social_links or {},
    }
    
    # Pull tracks (most played first, limit 20)
    try:
        from api.models import Audio
        tracks = Audio.query.filter_by(user_id=uid, is_public=True).order_by(Audio.plays.desc().nullslast()).limit(20).all()
        total_plays = 0
        total_likes = 0
        for t in tracks:
            total_plays += (t.plays or 0)
            total_likes += (t.likes or 0)
            result["tracks"].append({
                "id": t.id,
                "title": t.title,
                "genre": t.genre,
                "plays": t.plays or 0,
                "likes": t.likes or 0,
                "artwork_url": t.artwork_url,
                "file_url": t.file_url,
                "duration": t.duration,
            })
        result["stats"]["total_streams"] = str(total_plays) if total_plays else ""
        result["stats"]["total_likes"] = str(total_likes) if total_likes else ""
    except Exception as e:
        print(f"EPK auto-populate tracks error: {e}")
    
    # Pull albums
    try:
        from api.models import Album
        albums = Album.query.filter_by(user_id=uid).order_by(Album.release_date.desc()).limit(10).all()
        for a in albums:
            result["albums"].append({
                "id": a.id,
                "title": a.title,
                "genre": a.genre,
                "release_date": a.release_date,
                "cover_art_url": a.cover_art_url,
            })
    except Exception as e:
        print(f"EPK auto-populate albums error: {e}")
    
    # Pull videos
    try:
        from api.models import Video
        videos = Video.query.filter_by(user_id=uid).order_by(Video.uploaded_at.desc()).limit(10).all()
        for v in videos:
            result["videos"].append({
                "id": v.id,
                "title": v.title,
                "thumbnail_url": v.thumbnail_url,
                "file_url": v.file_url,
                "duration": v.duration,
            })
    except Exception as e:
        print(f"EPK auto-populate videos error: {e}")
    
    # Count followers if available
    try:
        from api.models import Follower
        follower_count = Follower.query.filter_by(followed_id=uid).count()
        if follower_count:
            result["stats"]["followers"] = str(follower_count)
    except Exception:
        pass
    
    return jsonify(result), 200


@epk_collab_bp.route('/api/epk/upload', methods=['POST'])
@jwt_required()
def upload_epk_media():
    """
    Upload any media for EPK — images, audio, video, documents.
    Routes through R2 (Cloudflare) first, falls back to Cloudinary.
    
    Fields:
      - profile_photo, cover_photo, logo_url, stage_plot_url → single file, replaces existing
      - press_photos → appends to gallery array
      - audio_demo → audio file (mp3, wav, flac, etc.)
      - video_demo → video file (mp4, mov, webm, etc.)
      - document → PDF, doc, press release, etc.
    """
    db, User, EPK, _, _ = get_models()
    uid = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"error": "Empty file"}), 400
    
    field = request.form.get('field', 'press_photos')
    
    # Allowed extensions by category
    ALLOWED = {
        'image': {'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'},
        'audio': {'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'},
        'video': {'mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv'},
        'document': {'pdf', 'doc', 'docx', 'txt'},
    }
    all_allowed = set()
    for exts in ALLOWED.values():
        all_allowed.update(exts)
    
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in all_allowed:
        return jsonify({"error": f"File type .{ext} not allowed. Supported: images, audio, video, PDF"}), 400
    
    # Determine file category
    file_type = 'other'
    for cat, exts in ALLOWED.items():
        if ext in exts:
            file_type = cat
            break
    
    try:
        # Try R2 first (Cloudflare), fall back to Cloudinary
        url = None
        try:
            from api.r2_storage_setup import uploadFile
            result = uploadFile(file, file.filename)
            # R2 returns a string URL directly
            url = result if isinstance(result, str) else result.get('secure_url', result.get('url', ''))
        except (ImportError, Exception) as r2_err:
            print(f"R2 upload failed, trying Cloudinary: {r2_err}")
            try:
                from api.cloudinary_setup import uploadFile as cloudUpload
                file.seek(0)  # Reset file pointer after R2 attempt
                result = cloudUpload(file, file.filename)
                # Cloudinary returns a dict with secure_url
                url = result.get('secure_url', '') if isinstance(result, dict) else str(result)
            except Exception as cloud_err:
                return jsonify({"error": f"Both R2 and Cloudinary failed. R2: {str(r2_err)}, Cloudinary: {str(cloud_err)}"}), 500
        
        if not url:
            return jsonify({"error": "Upload succeeded but no URL returned"}), 500
        
        # Auto-update EPK if it exists
        epk = EPK.query.filter_by(user_id=uid).first() if EPK else None
        if epk:
            # Single-value fields — replace
            if field in ['profile_photo', 'cover_photo', 'logo_url', 'stage_plot_url']:
                setattr(epk, field, url)
                db.session.commit()
            # Array fields — append
            elif field == 'press_photos':
                photos = epk.press_photos or []
                caption = request.form.get('caption', '')
                photos.append({"url": url, "caption": caption, "type": file_type})
                epk.press_photos = photos
                db.session.commit()
            elif field == 'featured_media':
                # Audio demos, music videos, documents, etc.
                media = epk.featured_media or []
                media.append({
                    "title": request.form.get('title', file.filename),
                    "description": request.form.get('description', ''),
                    "url": url,
                    "type": file_type,
                    "ext": ext,
                })
                epk.featured_media = media
                db.session.commit()
        
        return jsonify({
            "message": "Upload successful",
            "url": url,
            "field": field,
            "file_type": file_type,
            "ext": ext,
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@epk_collab_bp.route('/api/epk/<slug>', methods=['GET'])
def get_public_epk(slug):
    """Public EPK view — no auth required"""
    db, User, EPK, _, _ = get_models()
    if not EPK:
        return jsonify({"error": "EPK not available"}), 500
    
    epk = EPK.query.filter_by(slug=slug, is_public=True).first()
    if not epk:
        return jsonify({"error": "EPK not found"}), 404
    
    result = epk.to_dict()
    # Strip private contact info from public view
    result.pop('management_email', None)
    result.pop('booking_email', None)
    # Add user's track/album data
    user = User.query.get(epk.user_id)
    if user:
        result['username'] = user.username
    
    return jsonify(result), 200


@epk_collab_bp.route('/api/epk/search', methods=['GET'])
def search_epks():
    """Search EPKs for collab matching"""
    db, User, EPK, _, _ = get_models()
    if not EPK:
        return jsonify({"results": []}), 200
    
    genre = request.args.get('genre', '')
    skill = request.args.get('skill', '')
    location = request.args.get('location', '')
    collab_only = request.args.get('collab_open', 'false') == 'true'
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    query = EPK.query.filter_by(is_public=True)
    
    if genre:
        query = query.filter(
            db.or_(EPK.genre_primary.ilike(f'%{genre}%'), EPK.genre_secondary.ilike(f'%{genre}%'))
        )
    if skill:
        query = query.filter(EPK.skills.cast(db.Text).ilike(f'%{skill}%'))
    if location:
        query = query.filter(EPK.location.ilike(f'%{location}%'))
    if collab_only:
        query = query.filter_by(collab_open=True)
    
    results = query.order_by(EPK.updated_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "results": [e.to_dict() for e in results.items],
        "total": results.total,
        "pages": results.pages,
        "page": page,
    }), 200


# =============================================================================
# COLLAB REQUEST ROUTES
# =============================================================================

@epk_collab_bp.route('/api/collab/requests', methods=['GET'])
def get_collab_requests():
    """Browse open collab requests"""
    db, User, _, CollabRequest, _ = get_models()
    if not CollabRequest:
        return jsonify({"requests": []}), 200
    
    genre = request.args.get('genre', '')
    role = request.args.get('role', '')
    status = request.args.get('status', 'open')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    query = CollabRequest.query.filter_by(is_public=True)
    if status:
        query = query.filter_by(status=status)
    if genre:
        query = query.filter(CollabRequest.genre.ilike(f'%{genre}%'))
    if role:
        query = query.filter(CollabRequest.roles_needed.cast(db.Text).ilike(f'%{role}%'))
    
    results = query.order_by(CollabRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "requests": [r.to_dict() for r in results.items],
        "total": results.total,
        "pages": results.pages,
        "page": page,
    }), 200


@epk_collab_bp.route('/api/collab/requests', methods=['POST'])
@jwt_required()
def create_collab_request():
    """Post a new collab request"""
    db, User, _, CollabRequest, _ = get_models()
    if not CollabRequest:
        return jsonify({"error": "CollabRequest model not available"}), 500
    
    uid = get_jwt_identity()
    data = request.json
    
    cr = CollabRequest(
        user_id=uid,
        title=data.get('title', ''),
        description=data.get('description', ''),
        genre=data.get('genre', ''),
        roles_needed=data.get('roles_needed', []),
        budget=data.get('budget', ''),
        deadline=datetime.fromisoformat(data['deadline']) if data.get('deadline') else None,
        reference_track_url=data.get('reference_track_url', ''),
        reference_notes=data.get('reference_notes', ''),
        status='open',
        is_public=True,
    )
    db.session.add(cr)
    db.session.commit()
    
    return jsonify({"message": "Collab request posted", "request": cr.to_dict()}), 201


@epk_collab_bp.route('/api/collab/requests/<int:req_id>', methods=['PUT'])
@jwt_required()
def update_collab_request(req_id):
    """Update a collab request (owner only)"""
    db, User, _, CollabRequest, _ = get_models()
    uid = get_jwt_identity()
    cr = CollabRequest.query.get(req_id)
    if not cr or cr.user_id != uid:
        return jsonify({"error": "Not found or unauthorized"}), 404
    
    data = request.json
    for f in ['title', 'description', 'genre', 'roles_needed', 'budget', 'reference_track_url', 'reference_notes', 'status', 'is_public']:
        if f in data:
            setattr(cr, f, data[f])
    if 'deadline' in data:
        cr.deadline = datetime.fromisoformat(data['deadline']) if data['deadline'] else None
    
    cr.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated", "request": cr.to_dict()}), 200


@epk_collab_bp.route('/api/collab/requests/<int:req_id>', methods=['DELETE'])
@jwt_required()
def delete_collab_request(req_id):
    """Delete a collab request (owner only)"""
    db, User, _, CollabRequest, _ = get_models()
    uid = get_jwt_identity()
    cr = CollabRequest.query.get(req_id)
    if not cr or cr.user_id != uid:
        return jsonify({"error": "Not found or unauthorized"}), 404
    db.session.delete(cr)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


@epk_collab_bp.route('/api/collab/my-requests', methods=['GET'])
@jwt_required()
def get_my_collab_requests():
    """Get current user's collab requests"""
    db, User, _, CollabRequest, _ = get_models()
    uid = get_jwt_identity()
    requests = CollabRequest.query.filter_by(user_id=uid).order_by(CollabRequest.created_at.desc()).all()
    return jsonify({"requests": [r.to_dict() for r in requests]}), 200


# =============================================================================
# COLLAB APPLICATION ROUTES
# =============================================================================

@epk_collab_bp.route('/api/collab/requests/<int:req_id>/apply', methods=['POST'])
@jwt_required()
def apply_to_collab(req_id):
    """Apply to a collab request — EPK auto-attached"""
    db, User, EPK, CollabRequest, CollabApplication = get_models()
    if not CollabApplication:
        return jsonify({"error": "CollabApplication model not available"}), 500
    
    uid = get_jwt_identity()
    cr = CollabRequest.query.get(req_id)
    if not cr:
        return jsonify({"error": "Request not found"}), 404
    if cr.user_id == uid:
        return jsonify({"error": "Cannot apply to your own request"}), 400
    if cr.status != 'open':
        return jsonify({"error": "This request is no longer open"}), 400
    
    # Check for duplicate application
    existing = CollabApplication.query.filter_by(request_id=req_id, user_id=uid).first()
    if existing:
        return jsonify({"error": "You've already applied to this request"}), 400
    
    data = request.json
    app = CollabApplication(
        request_id=req_id,
        user_id=uid,
        message=data.get('message', ''),
        proposed_rate=data.get('proposed_rate', ''),
        sample_url=data.get('sample_url', ''),
        status='pending',
    )
    db.session.add(app)
    db.session.commit()
    
    return jsonify({"message": "Application submitted", "application": app.to_dict()}), 201


@epk_collab_bp.route('/api/collab/requests/<int:req_id>/applications', methods=['GET'])
@jwt_required()
def get_applications(req_id):
    """Get applications for a collab request (owner only)"""
    db, User, _, CollabRequest, CollabApplication = get_models()
    uid = get_jwt_identity()
    cr = CollabRequest.query.get(req_id)
    if not cr or cr.user_id != uid:
        return jsonify({"error": "Not found or unauthorized"}), 404
    
    apps = CollabApplication.query.filter_by(request_id=req_id).order_by(CollabApplication.created_at.desc()).all()
    return jsonify({"applications": [a.to_dict() for a in apps]}), 200


@epk_collab_bp.route('/api/collab/applications/<int:app_id>/respond', methods=['PUT'])
@jwt_required()
def respond_to_application(app_id):
    """Accept or decline an application (request owner only)"""
    db, User, _, CollabRequest, CollabApplication = get_models()
    uid = get_jwt_identity()
    app = CollabApplication.query.get(app_id)
    if not app:
        return jsonify({"error": "Application not found"}), 404
    
    cr = CollabRequest.query.get(app.request_id)
    if not cr or cr.user_id != uid:
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.json
    status = data.get('status')
    if status not in ['accepted', 'declined']:
        return jsonify({"error": "Status must be 'accepted' or 'declined'"}), 400
    
    app.status = status
    db.session.commit()
    
    return jsonify({"message": f"Application {status}", "application": app.to_dict()}), 200


@epk_collab_bp.route('/api/collab/my-applications', methods=['GET'])
@jwt_required()
def get_my_applications():
    """Get current user's sent applications"""
    db, User, _, _, CollabApplication = get_models()
    uid = get_jwt_identity()
    apps = CollabApplication.query.filter_by(user_id=uid).order_by(CollabApplication.created_at.desc()).all()
    return jsonify({"applications": [a.to_dict() for a in apps]}), 200


# =============================================================================
# MIGRATION SQL — Run this to create tables
# =============================================================================
"""
CREATE TABLE IF NOT EXISTS epk (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES "user"(id),
    artist_name VARCHAR(100),
    tagline VARCHAR(200),
    bio_short TEXT,
    bio_full TEXT,
    genre_primary VARCHAR(50),
    genre_secondary VARCHAR(50),
    location VARCHAR(100),
    booking_email VARCHAR(200),
    management_name VARCHAR(100),
    management_email VARCHAR(200),
    label_name VARCHAR(100),
    website VARCHAR(300),
    social_links JSON DEFAULT '{}',
    profile_photo VARCHAR(500),
    cover_photo VARCHAR(500),
    press_photos JSON DEFAULT '[]',
    logo_url VARCHAR(500),
    achievements JSON DEFAULT '[]',
    stats JSON DEFAULT '{}',
    press_quotes JSON DEFAULT '[]',
    featured_tracks JSON DEFAULT '[]',
    featured_videos JSON DEFAULT '[]',
    featured_albums JSON DEFAULT '[]',
    rider TEXT,
    stage_plot_url VARCHAR(500),
    featured_media JSON DEFAULT '[]',
    skills JSON DEFAULT '[]',
    collab_open BOOLEAN DEFAULT TRUE,
    collab_rate VARCHAR(100),
    preferred_genres JSON DEFAULT '[]',
    equipment JSON DEFAULT '[]',
    template VARCHAR(20) DEFAULT 'modern',
    accent_color VARCHAR(7) DEFAULT '#00ffc8',
    is_public BOOLEAN DEFAULT TRUE,
    slug VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collab_request (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    genre VARCHAR(50),
    roles_needed JSON DEFAULT '[]',
    budget VARCHAR(100),
    deadline TIMESTAMP,
    reference_track_url VARCHAR(500),
    reference_notes TEXT,
    status VARCHAR(20) DEFAULT 'open',
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collab_application (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES collab_request(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    message TEXT,
    proposed_rate VARCHAR(100),
    sample_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_epk_slug ON epk(slug);
CREATE INDEX IF NOT EXISTS idx_epk_collab_open ON epk(collab_open) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_collab_request_status ON collab_request(status) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_collab_application_request ON collab_application(request_id);
"""