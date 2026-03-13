# =============================================================================
# epk_collab.py — EPK Builder + Collab Marketplace API
# =============================================================================
# Models (EPK, CollabRequest, CollabApplication) live in models.py
# =============================================================================

import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

epk_collab_bp = Blueprint('epk_collab', __name__)


# =============================================================================
# HELPER — Model imports
# =============================================================================

def get_models():
    from api.models import db, User
    try:
        from api.models import EPK, CollabRequest, CollabApplication
    except ImportError:
        EPK = None
        CollabRequest = None
        CollabApplication = None
    return db, User, EPK, CollabRequest, CollabApplication


def authHeaders():
    """Return auth headers dict for internal use"""
    token = request.headers.get('Authorization', '')
    return {'Authorization': token, 'Content-Type': 'application/json'}


# =============================================================================
# EPK ROUTES
# =============================================================================

@epk_collab_bp.route('/api/epk', methods=['GET'])
@jwt_required()
def get_my_epk():
    """Get current user's EPKs. Returns list of EPKs or empty template."""
    db, User, EPK, _, _ = get_models()
    uid = get_jwt_identity()
    epk_id = request.args.get('id')

    if EPK:
        if epk_id:
            epk = EPK.query.filter_by(id=epk_id, user_id=uid).first()
            if epk:
                return jsonify(epk.to_dict()), 200
        else:
            epks = EPK.query.filter_by(user_id=uid).order_by(EPK.updated_at.desc()).all()
            if epks:
                result = epks[0].to_dict()
                result['all_epks'] = [{
                    "id": e.id,
                    "epk_name": e.epk_name or e.artist_name,
                    "artist_name": e.artist_name,
                    "slug": e.slug,
                    "updated_at": e.updated_at.isoformat() if e.updated_at else None
                } for e in epks]
                return jsonify(result), 200

    # Return empty template
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": None,
        "user_id": uid,
        "epk_name": "My EPK",
        "all_epks": [],
        "artist_name": user.artist_name or user.username,
        "tagline": "",
        "bio_short": (getattr(user, 'artist_bio', '') or getattr(user, 'bio', '') or "")[:200],
        "bio_full": getattr(user, 'artist_bio', '') or getattr(user, 'bio', '') or "",
        "genre_primary": getattr(user, 'artist_genre', '') or "",
        "genre_secondary": "",
        "location": getattr(user, 'artist_location', '') or "",
        "booking_email": user.email or "",
        "management_name": "",
        "management_email": "",
        "label_name": "",
        "website": getattr(user, 'artist_website', '') or "",
        "social_links": getattr(user, 'artist_social_links', None) or getattr(user, 'social_links', None) or {},
        "profile_photo": user.profile_picture or "",
        "cover_photo": getattr(user, 'cover_photo', '') or "",
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
    """Create or update EPK. Supports multiple EPKs per user."""
    db, User, EPK, _, _ = get_models()
    if not EPK:
        return jsonify({"error": "EPK model not available. Run migrations."}), 500

    uid = get_jwt_identity()
    data = request.json
    epk_id = data.get('id')

    if epk_id:
        epk = EPK.query.filter_by(id=epk_id, user_id=uid).first()
        if not epk:
            return jsonify({"error": "EPK not found"}), 404
        is_new = False
    else:
        epk = EPK(user_id=uid)
        db.session.add(epk)
        is_new = True

    fields = [
        'artist_name', 'epk_name', 'tagline', 'bio_short', 'bio_full',
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

    if not epk.slug and epk.artist_name:
        import re
        base = re.sub(r'[^a-z0-9]+', '-', epk.artist_name.lower()).strip('-')
        slug = base
        counter = 1
        while EPK.query.filter(EPK.slug == slug, EPK.id != epk.id).first():
            slug = f"{base}-{counter}"
            counter += 1
        epk.slug = slug

    if not epk.epk_name:
        epk.epk_name = epk.artist_name or "My EPK"

    epk.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": "EPK created" if is_new else "EPK updated",
        "epk": epk.to_dict()
    }), 201 if is_new else 200


@epk_collab_bp.route('/api/epk/<int:epk_id>', methods=['DELETE'])
@jwt_required()
def delete_epk(epk_id):
    """Delete an EPK (must belong to current user)"""
    db, User, EPK, _, _ = get_models()
    uid = get_jwt_identity()
    epk = EPK.query.filter_by(id=epk_id, user_id=uid).first() if EPK else None
    if not epk:
        return jsonify({"error": "EPK not found"}), 404
    db.session.delete(epk)
    db.session.commit()
    return jsonify({"message": "EPK deleted"}), 200


# =============================================================================
# EPK COMMERCIAL GENERATOR (AI Video)
# =============================================================================

@epk_collab_bp.route('/api/epk/generate-commercial', methods=['POST'])
@jwt_required()
def generate_epk_commercial():
    """Generate an AI promo video from EPK data. Costs credits."""
    db, User, EPK, _, _ = get_models()
    uid = get_jwt_identity()

    epk = EPK.query.filter_by(user_id=uid).first() if EPK else None
    if not epk:
        return jsonify({"error": "Create your EPK first before generating a commercial"}), 400

    data = request.json or {}
    style = data.get('style', 'cinematic')
    aspect_ratio = data.get('aspect_ratio', '16:9')
    quality = data.get('quality', 'standard')
    custom_prompt = data.get('custom_prompt', '')
    use_photo = data.get('use_photo', True)

    try:
        from api.ai_credits_routes import deduct_user_credits, get_user_tier
    except ImportError:
        try:
            from api.ai_video_credits_routes import get_or_create_credits, get_user_tier
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
    prompt = prompt[:500]

    try:
        import replicate

        generation_type = 'text'
        source_image_url = None

        if use_photo:
            source_image_url = (
                epk.profile_photo or
                epk.cover_photo or
                (epk.press_photos[0]['url'] if epk.press_photos else None)
            )
            if source_image_url:
                generation_type = 'image'

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
        input_params = {'prompt': prompt, 'aspect_ratio': aspect_ratio, 'duration': 5}
        if generation_type == 'image' and source_image_url:
            input_params['image'] = source_image_url

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

        try:
            output = replicate.run(model_id, input=input_params)
            video_url_replicate = output if isinstance(output, str) else str(output)

            import requests as req
            from io import BytesIO

            video_response = req.get(video_url_replicate, timeout=120)
            if video_response.status_code == 200:
                try:
                    from api.r2_storage_setup import uploadFile as r2Upload
                    video_bytes = BytesIO(video_response.content)
                    video_bytes.name = f"epk_commercial_{uid}_{gen_id}.mp4"
                    r2_url = r2Upload(video_bytes, video_bytes.name)
                    final_url = r2_url if isinstance(r2_url, str) else r2_url.get('secure_url', '')
                except Exception as r2_err:
                    print(f"R2 upload failed, using Replicate URL: {r2_err}")
                    final_url = video_url_replicate

                generation.status = 'completed'
                generation.video_url = final_url
                generation.completed_at = datetime.utcnow()

                epk.updated_at = datetime.utcnow()
                media = epk.featured_media or []
                media.append({
                    "url": final_url,
                    "title": f"EPK Commercial ({style.title()})",
                    "description": f"AI-generated {style} promo - {quality}",
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
            try:
                from api.ai_credits_routes import refund_user_credits
                refund_user_credits(uid, credit_cost)
            except ImportError:
                credit.balance += credit_cost
                db.session.commit()
            return jsonify({"error": f"Video generation failed: {str(gen_err)}", "credits_refunded": credit_cost}), 500

    except ImportError as imp_err:
        credit.balance += credit_cost
        db.session.commit()
        return jsonify({"error": f"AI video generation not configured: {str(imp_err)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# COLLAB MESSAGING
# =============================================================================

@epk_collab_bp.route('/api/collab/message', methods=['POST'])
@jwt_required()
def send_collab_message():
    """Send a DM with collab context"""
    db, User, _, CollabRequest, _ = get_models()
    uid = get_jwt_identity()
    data = request.json or {}

    recipient_id = data.get('recipient_id')
    message_text = data.get('message', '').strip()
    context_type = data.get('context_type', '')
    context_id = data.get('context_id')

    if not recipient_id or not message_text:
        return jsonify({"error": "Recipient and message required"}), 400

    if str(recipient_id) == str(uid):
        return jsonify({"error": "Cannot message yourself"}), 400

    prefix = ""
    if context_type == 'collab_request' and context_id and CollabRequest:
        cr = CollabRequest.query.get(context_id)
        if cr:
            prefix = f"[Re: Collab -- {cr.title}]\n\n"
    elif context_type == 'collab_application' and context_id and CollabRequest:
        from api.models import CollabApplication as CA
        app = CA.query.get(context_id)
        if app and app.request:
            prefix = f"[Re: Application for -- {app.request.title}]\n\n"
    elif context_type == 'epk_contact':
        prefix = "[Via EPK]\n\n"

    full_message = prefix + message_text

    try:
        from api.models import DirectMessage, Conversation

        conv = Conversation.query.filter(
            ((Conversation.user1_id == uid) & (Conversation.user2_id == recipient_id)) |
            ((Conversation.user1_id == recipient_id) & (Conversation.user2_id == uid))
        ).first()

        if not conv:
            conv = Conversation(user1_id=uid, user2_id=recipient_id)
            db.session.add(conv)
            db.session.flush()

        dm = DirectMessage(
            conversation_id=conv.id,
            sender_id=uid,
            recipient_id=recipient_id,
            content=full_message,
        )
        db.session.add(dm)
        conv.last_message = full_message[:100]
        conv.last_message_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Message sent",
            "conversation_id": conv.id,
        }), 200

    except ImportError:
        return jsonify({"error": "Messaging system not available"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# =============================================================================
# AUTO-POPULATE EPK FROM PLATFORM DATA
# =============================================================================

@epk_collab_bp.route('/api/epk/auto-populate', methods=['GET'])
@jwt_required()
def auto_populate_epk():
    """Fetch user's existing content for EPK auto-fill"""
    db, User, _, _, _ = get_models()
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404

    result = {"tracks": [], "albums": [], "videos": [], "stats": {}, "profile": {}}

    try:
        from api.models import Audio
        tracks = Audio.query.filter_by(user_id=uid).order_by(Audio.plays.desc()).limit(20).all()
        result['tracks'] = [{
            "id": t.id,
            "title": t.title,
            "genre": t.genre,
            "plays": t.plays or 0,
            "artwork_url": getattr(t, 'artwork_url', '') or getattr(t, 'artwork', '') or '',
            "file_url": getattr(t, 'file_url', '') or '',
            "duration": getattr(t, 'duration', None),
        } for t in tracks]
    except Exception as e:
        print(f"EPK auto-populate tracks error: {e}")

    try:
        from api.models import Album
        albums = Album.query.filter_by(user_id=uid).order_by(Album.created_at.desc()).limit(10).all()
        result['albums'] = [{
            "id": a.id,
            "title": a.title,
            "genre": getattr(a, 'genre', ''),
            "cover_art_url": getattr(a, 'cover_art_url', '') or getattr(a, 'cover_art', '') or '',
            "release_date": a.release_date.isoformat() if hasattr(a, 'release_date') and a.release_date else None,
        } for a in albums]
    except Exception as e:
        print(f"EPK auto-populate albums error: {e}")

    try:
        from api.models import Video
        videos = Video.query.filter_by(user_id=uid).order_by(Video.uploaded_at.desc()).limit(10).all()
        result['videos'] = [{
            "id": v.id,
            "title": v.title,
            "thumbnail_url": getattr(v, 'thumbnail_url', '') or getattr(v, 'thumbnail', '') or '',
            "file_url": getattr(v, 'file_url', '') or '',
            "duration": getattr(v, 'duration', None),
        } for v in videos]
    except Exception as e:
        print(f"EPK auto-populate videos error: {e}")

    try:
        from api.models import Audio, Follower
        total_streams = db.session.query(db.func.sum(Audio.plays)).filter(Audio.user_id == uid).scalar() or 0
        total_likes = db.session.query(db.func.sum(Audio.likes)).filter(Audio.user_id == uid).scalar() or 0
        followers = Follower.query.filter_by(followed_id=uid).count()
        result['stats'] = {
            "total_streams": str(total_streams) if total_streams else "",
            "total_likes": str(total_likes) if total_likes else "",
            "followers": str(followers) if followers else "",
        }
    except Exception:
        pass

    result['profile'] = {
        "artist_name": user.artist_name or user.username,
        "bio": getattr(user, 'artist_bio', '') or getattr(user, 'bio', '') or "",
        "genre": getattr(user, 'artist_genre', '') or "",
        "location": getattr(user, 'artist_location', '') or "",
        "website": getattr(user, 'artist_website', '') or "",
        "email": user.email or "",
        "profile_photo": user.profile_picture or "",
        "cover_photo": getattr(user, 'cover_photo', '') or "",
        "social_links": getattr(user, 'artist_social_links', None) or getattr(user, 'social_links', None) or {},
    }

    return jsonify(result), 200


# =============================================================================
# EPK FILE UPLOAD
# =============================================================================

@epk_collab_bp.route('/api/epk/upload', methods=['POST'])
@jwt_required()
def upload_epk_media():
    """Upload media files for EPK (images, audio, video, docs)"""
    db, User, EPK, _, _ = get_models()
    uid = get_jwt_identity()

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    field = request.form.get('field', '')

    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    ALLOWED = {
        'image': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        'audio': ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'],
        'video': ['mp4', 'mov', 'webm', 'mkv', 'avi', 'wmv'],
        'document': ['pdf', 'doc', 'docx', 'txt'],
    }

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    file_type = None
    for ftype, exts in ALLOWED.items():
        if ext in exts:
            file_type = ftype
            break

    if not file_type:
        return jsonify({"error": f"File type .{ext} not supported"}), 400

    try:
        try:
            from api.r2_storage_setup import uploadFile
            result = uploadFile(file, file.filename)
            url = result if isinstance(result, str) else result.get('secure_url', result.get('url', ''))
        except (ImportError, Exception) as r2_err:
            print(f"R2 upload failed, trying Cloudinary: {r2_err}")
            try:
                from api.cloudinary_setup import uploadFile as cloudUpload
                file.seek(0)
                result = cloudUpload(file, file.filename)
                url = result.get('secure_url', '') if isinstance(result, dict) else str(result)
            except Exception as cloud_err:
                return jsonify({"error": f"Both R2 and Cloudinary failed. R2: {str(r2_err)}, Cloudinary: {str(cloud_err)}"}), 500

        if not url:
            return jsonify({"error": "Upload returned empty URL"}), 500

        if field and EPK:
            epk = EPK.query.filter_by(user_id=uid).first()
            if epk:
                if field in ('profile_photo', 'cover_photo', 'logo_url', 'stage_plot_url'):
                    setattr(epk, field, url)
                elif field == 'press_photos':
                    photos = epk.press_photos or []
                    photos.append({"url": url, "caption": ""})
                    epk.press_photos = photos
                elif field == 'featured_media':
                    media = epk.featured_media or []
                    media.append({
                        "url": url,
                        "title": request.form.get('title', file.filename),
                        "description": request.form.get('description', ''),
                        "type": file_type,
                        "ext": ext,
                    })
                    epk.featured_media = media
                db.session.commit()

        return jsonify({
            "message": "Upload successful",
            "url": url,
            "file_type": file_type,
            "ext": ext,
            "filename": file.filename,
        }), 200

    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


# =============================================================================
# PUBLIC EPK ROUTES (no auth)
# IMPORTANT: /api/epk/by-user MUST be registered BEFORE /api/epk/<slug>
# =============================================================================

@epk_collab_bp.route('/api/epk/by-user', methods=['GET'])
def get_epks_by_user():
    """Get all public EPKs for a user (for profile pages)"""
    db, User, EPK, _, _ = get_models()
    if not EPK:
        return jsonify({"epks": []}), 200

    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        epks = EPK.query.filter_by(user_id=user_id, is_public=True).order_by(EPK.updated_at.desc()).all()
        return jsonify({"epks": [e.to_dict() for e in epks]}), 200
    except Exception as e:
        return jsonify({"epks": [], "error": str(e)}), 200


@epk_collab_bp.route('/api/epk/<slug>', methods=['GET'])
def get_public_epk(slug):
    """Public EPK view by slug — no auth required"""
    db, User, EPK, _, _ = get_models()
    if not EPK:
        return jsonify({"error": "EPK not available"}), 500

    epk = EPK.query.filter_by(slug=slug, is_public=True).first()
    if not epk:
        return jsonify({"error": "EPK not found"}), 404

    result = epk.to_dict()
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
    if location:
        query = query.filter(EPK.location.ilike(f'%{location}%'))
    if collab_only:
        query = query.filter_by(collab_open=True)
    if skill:
        query = query.filter(EPK.skills.cast(db.Text).ilike(f'%{skill}%'))

    paginated = query.order_by(EPK.updated_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    results = []
    for epk in paginated.items:
        user = User.query.get(epk.user_id)
        d = epk.to_dict()
        d['username'] = user.username if user else None
        results.append(d)

    return jsonify({
        "results": results,
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
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
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    query = CollabRequest.query.filter_by(status='open', is_public=True)
    if genre:
        query = query.filter(CollabRequest.genre.ilike(f'%{genre}%'))
    if role:
        query = query.filter(CollabRequest.roles_needed.cast(db.Text).ilike(f'%{role}%'))

    paginated = query.order_by(CollabRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "requests": [r.to_dict() for r in paginated.items],
        "total": paginated.total,
        "page": page,
    }), 200


@epk_collab_bp.route('/api/collab/requests', methods=['POST'])
@jwt_required()
def create_collab_request():
    """Post a new collab request"""
    db, User, _, CollabRequest, _ = get_models()
    if not CollabRequest:
        return jsonify({"error": "Collab system not available"}), 500

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
    cr = CollabRequest.query.filter_by(id=req_id, user_id=uid).first() if CollabRequest else None
    if not cr:
        return jsonify({"error": "Request not found"}), 404

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
    cr = CollabRequest.query.filter_by(id=req_id, user_id=uid).first() if CollabRequest else None
    if not cr:
        return jsonify({"error": "Request not found"}), 404
    db.session.delete(cr)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


@epk_collab_bp.route('/api/collab/my-requests', methods=['GET'])
@jwt_required()
def get_my_collab_requests():
    """Get current user's collab requests"""
    db, User, _, CollabRequest, _ = get_models()
    uid = get_jwt_identity()
    if not CollabRequest:
        return jsonify({"requests": []}), 200
    requests_list = CollabRequest.query.filter_by(user_id=uid).order_by(CollabRequest.created_at.desc()).all()
    return jsonify({"requests": [r.to_dict() for r in requests_list]}), 200


# =============================================================================
# COLLAB APPLICATION ROUTES
# =============================================================================

@epk_collab_bp.route('/api/collab/requests/<int:req_id>/apply', methods=['POST'])
@jwt_required()
def apply_to_collab(req_id):
    """Apply to a collab request (attaches EPK automatically)"""
    db, User, _, CollabRequest, CollabApplication = get_models()
    if not CollabApplication:
        return jsonify({"error": "Collab system not available"}), 500

    uid = get_jwt_identity()
    data = request.json

    cr = CollabRequest.query.get(req_id) if CollabRequest else None
    if not cr or cr.status != 'open':
        return jsonify({"error": "Request not found or closed"}), 404

    if str(cr.user_id) == str(uid):
        return jsonify({"error": "Cannot apply to your own request"}), 400

    existing = CollabApplication.query.filter_by(request_id=req_id, user_id=uid).first()
    if existing:
        return jsonify({"error": "Already applied"}), 400

    app = CollabApplication(
        request_id=req_id,
        user_id=uid,
        message=data.get('message', ''),
        proposed_rate=data.get('proposed_rate', ''),
        sample_url=data.get('sample_url', ''),
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
    cr = CollabRequest.query.filter_by(id=req_id, user_id=uid).first() if CollabRequest else None
    if not cr:
        return jsonify({"error": "Request not found"}), 404
    apps = CollabApplication.query.filter_by(request_id=req_id).order_by(CollabApplication.created_at.desc()).all()
    return jsonify({"applications": [a.to_dict() for a in apps]}), 200


@epk_collab_bp.route('/api/collab/applications/<int:app_id>/respond', methods=['PUT'])
@jwt_required()
def respond_to_application(app_id):
    """Accept or decline an application"""
    db, User, _, CollabRequest, CollabApplication = get_models()
    uid = get_jwt_identity()

    app = CollabApplication.query.get(app_id) if CollabApplication else None
    if not app:
        return jsonify({"error": "Application not found"}), 404

    cr = CollabRequest.query.get(app.request_id) if CollabRequest else None
    if not cr or str(cr.user_id) != str(uid):
        return jsonify({"error": "Not authorized"}), 403

    data = request.json
    new_status = data.get('status', '')
    if new_status not in ('accepted', 'declined'):
        return jsonify({"error": "Status must be 'accepted' or 'declined'"}), 400

    app.status = new_status
    db.session.commit()

    return jsonify({"message": f"Application {new_status}", "application": app.to_dict()}), 200


@epk_collab_bp.route('/api/collab/my-applications', methods=['GET'])
@jwt_required()
def get_my_applications():
    """Get current user's collab applications"""
    db, User, _, _, CollabApplication = get_models()
    uid = get_jwt_identity()
    if not CollabApplication:
        return jsonify({"applications": []}), 200
    apps = CollabApplication.query.filter_by(user_id=uid).order_by(CollabApplication.created_at.desc()).all()
    return jsonify({"applications": [a.to_dict() for a in apps]}), 200